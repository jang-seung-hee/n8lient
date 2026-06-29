// [dry-run-knowledge-search-index-backfill.ts]
// 이 스크립트는 기존 완료(success)된 submissions 데이터 중 인덱싱 대상을 선정하여
// knowledgeSearchIndex 컬렉션에 등록될 예상 도큐먼트 샘플과 통계를 조회하는 dry-run 도구입니다.
// 보안 규정: 실제 Firestore DB의 setDoc/updateDoc/deleteDoc/batch.commit/BulkWriter 쓰기 작업은 일절 배제됩니다.
// 실행 방법: npx tsx scripts/dry-run-knowledge-search-index-backfill.ts --clientId [CLIENT_ID] [추가 옵션]

import { loadEnvConfig } from "@next/env";
import fs from "fs";
import path from "path";

// 1. Next.js 환경변수 (.env.local 등) 로드
loadEnvConfig(process.cwd());

// 2. 로컬 Firebase Admin SDK 전용 .env 파일 자동 로드
const rootDir = process.cwd();
const files = fs.readdirSync(rootDir);
const adminsdkEnv = files.find(f => f.includes("adminsdk") && (f.endsWith(".env") || f.includes(".env")));

if (adminsdkEnv) {
  try {
    const envPath = path.join(rootDir, adminsdkEnv);
    const envContent = fs.readFileSync(envPath, "utf-8").trim();
    
    if (envContent.startsWith("{")) {
      const serviceAccount = JSON.parse(envContent);
      process.env.FIREBASE_ADMIN_PROJECT_ID = serviceAccount.project_id;
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL = serviceAccount.client_email;
      process.env.FIREBASE_ADMIN_PRIVATE_KEY = serviceAccount.private_key;
    } else {
      envContent.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let val = match[2].trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          process.env[key] = val;
        }
      });
    }
  } catch (err) {
    console.warn("⚠️ 경고: 로컬 adminsdk env 파일 수동 파싱 중 오류 발생:", err);
  }
}

import { getAdminFirestore } from "../src/lib/firebaseAdmin";
import { shouldIndexSubmission, buildKnowledgeSearchIndexDocRaw } from "../src/common/knowledge/knowledgeSearchIndex";

async function main() {
  const db = getAdminFirestore();
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || "(알 수 없음)";

  console.log("=========================================");
  console.log(`🔍 N8Lient Search Index Backfill Dry-Run Tool`);
  console.log(`Current Firebase Project: ${projectId}`);
  console.log("=========================================\n");

  // CLI 인자 파싱
  const args = process.argv.slice(2);

  const getArgValue = (flag: string): string => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : "";
  };

  const clientId = getArgValue("--clientId");
  const workflowKey = getArgValue("--workflowKey");
  const automationId = getArgValue("--automationId");
  const startDateStr = getArgValue("--startDate");
  const endDateStr = getArgValue("--endDate");
  const limitStr = getArgValue("--limit");

  // 필수 조건 검증
  if (!clientId) {
    console.error("❌ 에러: 필수 인자인 '--clientId' 값이 지정되지 않았습니다.");
    console.log("사용 예시: npx tsx scripts/dry-run-knowledge-search-index-backfill.ts --clientId [CLIENT_ID] [--workflowKey WORKFLOW_KEY]\n");
    process.exit(1);
  }

  const limit = limitStr ? parseInt(limitStr, 10) : undefined;
  const startDate = startDateStr ? new Date(startDateStr) : null;
  const endDate = endDateStr ? new Date(endDateStr) : null;

  console.log(`📋 [조회 조건 요약]`);
  console.log(`- 대상 clientId: ${clientId}`);
  if (workflowKey) console.log(`- workflowKey 필터: ${workflowKey}`);
  if (automationId) console.log(`- automationId 필터: ${automationId}`);
  if (startDateStr) console.log(`- 시작일(createdAt >=): ${startDateStr}`);
  if (endDateStr) console.log(`- 종료일(createdAt <=): ${endDateStr}`);
  if (limit) console.log(`- limit 제한: ${limit}개`);
  console.log("-----------------------------------------\n");

  // 캐싱을 통해 템플릿과 사용자 이름 lookup 준비
  console.log("🔍 [1/3] templates & users 정보 캐싱 중...");
  const templatesSnap = await db.collection("workflowTemplates").get();
  const templateNameMap: Record<string, string> = {};
  templatesSnap.forEach((doc) => {
    const data = doc.data();
    templateNameMap[doc.id] = data.name || doc.id;
  });

  const usersSnap = await db.collection("users").get();
  const userNameMap: Record<string, string> = {};
  const userEmailMap: Record<string, string> = {};
  usersSnap.forEach((doc) => {
    const data = doc.data();
    userNameMap[doc.id] = data.displayName || "";
    userEmailMap[doc.id] = data.email || "";
  });

  console.log(`💡 캐시 완료: ${Object.keys(templateNameMap).length}개 워크플로우 명세, ${Object.keys(userNameMap).length}명 사용자 프로필`);

  // submissions 스캔
  console.log("\n🔍 [2/3] submissions 컬렉션 스캔 중...");
  const submissionsSnap = await db.collection("submissions")
    .where("clientId", "==", clientId)
    .get();

  console.log(`💡 해당 회사(clientId: ${clientId})의 submissions 총 문서 수: ${submissionsSnap.size}개`);

  const candidates: any[] = [];
  const excludeCounts = {
    not_success: 0,
    no_result: 0,
    notify_only_level: 0,
    no_workflow_key: 0,
    filter_mismatch: 0,
  };

  submissionsSnap.forEach((doc) => {
    const data = doc.data();

    // 1. 기본 인덱싱 적합성 판정
    const status = data.status || "";
    const hasProcessorResult = data.processorResult !== undefined && data.processorResult !== null;
    const policy = data.retentionPolicySnapshot || data.retentionPolicy || {};
    const level = policy.level || "full_archive";

    if (!data.workflowKey) {
      excludeCounts.no_workflow_key++;
      return;
    }
    if (status !== "success") {
      excludeCounts.not_success++;
      return;
    }
    if (!hasProcessorResult) {
      excludeCounts.no_result++;
      return;
    }
    if (level === "notify_only") {
      excludeCounts.notify_only_level++;
      return;
    }

    // 2. 추가 필터 조건 판정
    if (workflowKey && data.workflowKey !== workflowKey) {
      excludeCounts.filter_mismatch++;
      return;
    }
    if (automationId && data.automationId !== automationId) {
      excludeCounts.filter_mismatch++;
      return;
    }

    if (data.createdAt) {
      const createdTime = new Date(data.createdAt);
      if (startDate && createdTime < startDate) {
        excludeCounts.filter_mismatch++;
        return;
      }
      if (endDate && createdTime > endDate) {
        excludeCounts.filter_mismatch++;
        return;
      }
    }

    candidates.push({
      docId: doc.id,
      data: data,
    });
  });

  const totalExcluded = Object.values(excludeCounts).reduce((a, b) => a + b, 0);

  console.log(`\n=========================================`);
  console.log(`📊 [DRY-RUN RESULTS]`);
  console.log(`- 전체 스캔 문서: ${submissionsSnap.size}개`);
  console.log(`- 마이그레이션 가능 후보 문서 수: ${candidates.length}개`);
  console.log(`- 조건 미충족 제외 문서 수: ${totalExcluded}개`);
  console.log(`  └─ 성공 상태 아님: ${excludeCounts.not_success}개`);
  console.log(`  └─ 결과 본문(processorResult) 없음: ${excludeCounts.no_result}개`);
  console.log(`  └─ 보관 레벨 notify_only 제외: ${excludeCounts.notify_only_level}개`);
  console.log(`  └─ 워크플로우 키 없음: ${excludeCounts.no_workflow_key}개`);
  console.log(`  └─ 추가 필터( workflowKey / 기간 ) 불일치: ${excludeCounts.filter_mismatch}개`);
  console.log(`=========================================`);

  // limit 설정 적용
  const finalCandidates = limit ? candidates.slice(0, limit) : candidates;

  if (finalCandidates.length > 0) {
    console.log(`\n📋 [샘플 submissionId 목록 (최대 10개)]`);
    finalCandidates.slice(0, 10).forEach((c, idx) => {
      console.log(`  ${idx + 1}. [${c.docId}] workflowKey: ${c.data.workflowKey} | status: ${c.data.status} | createdAt: ${c.data.createdAt}`);
    });

    console.log(`\n✨ [생성될 KnowledgeSearchIndexDoc 샘플 (최대 2개)]`);
    const sampleCount = Math.min(finalCandidates.length, 2);
    for (let i = 0; i < sampleCount; i++) {
      const target = finalCandidates[i];
      const ownerName = userNameMap[target.data.uid] || "";
      const ownerEmail = userEmailMap[target.data.uid] || "";
      const workflowName = templateNameMap[target.data.workflowKey] || target.data.workflowKey;

      const rawIndex = buildKnowledgeSearchIndexDocRaw(
        target.data,
        ownerName,
        ownerEmail,
        workflowName
      );

      // 예상 출력 데이터 포맷
      console.log(`\n--- [샘플 #${i + 1} - ${target.docId}] ---`);
      console.log(JSON.stringify({
        ...rawIndex,
        createdAt: {
          _type: "Firestore.Timestamp",
          seconds: Math.floor(new Date(rawIndex.createdAt).getTime() / 1000),
          nanoseconds: 0
        },
        completedAt: rawIndex.completedAt ? {
          _type: "Firestore.Timestamp",
          seconds: Math.floor(new Date(rawIndex.completedAt).getTime() / 1000),
          nanoseconds: 0
        } : null,
        updatedAt: {
          _type: "Firestore.Timestamp",
          seconds: Math.floor(new Date(rawIndex.updatedAt).getTime() / 1000),
          nanoseconds: 0
        }
      }, null, 2));
    }
  } else {
    console.log("\n💡 마이그레이션 대상 문서가 존재하지 않습니다.");
  }

  console.log(`\n-----------------------------------------`);
  console.log(`💡 status: DRY-RUN ONLY. 실제 Firestore DB는 업데이트되지 않았습니다.`);
  console.log(`-----------------------------------------`);
}

main().catch((err) => {
  console.error("❌ 실행 도중 에러가 발생했습니다:", err);
  process.exit(1);
});
