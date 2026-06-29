// [backfill-knowledge-search-index.ts]
// 이 스크립트는 기존 완료(success)된 submissions 데이터를 기반으로 지식검색용
// knowledgeSearchIndex 컬렉션 데이터를 생성/갱신하는 마이그레이션 백필 도구입니다.
// 보안 및 안전장치: --clientId 필수 지정이 필요하며, --dryRun false 및
// --confirm BACKFILL_KNOWLEDGE_SEARCH_INDEX 두 스위치가 모두 충족될 때만 실제 Firestore DB에 반영됩니다.
// 기본값은 dry-run 모드이며, 이미 인덱스가 존재하면 기본적으로 skip(overwrite 옵션 시만 덮어쓰기)합니다.
// 한국어 주석 표준을 준수합니다.

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
          process.env[match[1].trim()] = match[2].trim();
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
  console.log(`🚀 N8Lient Search Index Backfill Tool`);
  console.log(`Current Firebase Project: ${projectId}`);
  console.log("=========================================\n");

  // CLI 인자 파싱
  const args = process.argv.slice(2);

  const getArgValue = (flag: string): string => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : "";
  };

  const hasFlag = (flag: string): boolean => {
    return args.includes(flag);
  };

  const clientId = getArgValue("--clientId");
  const workflowKey = getArgValue("--workflowKey");
  const automationId = getArgValue("--automationId");
  const startDateStr = getArgValue("--startDate");
  const endDateStr = getArgValue("--endDate");
  const limitStr = getArgValue("--limit");
  const confirmVal = getArgValue("--confirm");

  // overwrite 플래그
  const overwrite = hasFlag("--overwrite");

  // dryRun 기본값: true (명시적으로 --dryRun false가 주어져야만 write 모드 진입)
  const dryRunInput = getArgValue("--dryRun");
  const dryRun = dryRunInput === "false" ? false : true;

  // 필수 조건 검증
  if (!clientId) {
    console.error("❌ 에러: 필수 인자인 '--clientId' 값이 지정되지 않았습니다.");
    console.log("사용 예시: npx tsx scripts/backfill-knowledge-search-index.ts --clientId [CLIENT_ID] [--workflowKey WORKFLOW_KEY] [--dryRun false] [--confirm BACKFILL_KNOWLEDGE_SEARCH_INDEX]\n");
    process.exit(1);
  }

  // 실제 write 실행 조건 검증
  const isWriteMode = !dryRun && confirmVal === "BACKFILL_KNOWLEDGE_SEARCH_INDEX";

  console.log(`📋 [실행 설정 요약]`);
  console.log(`- 실행 모드: ${isWriteMode ? "🔥 WRITE (실제 Firestore 반영)" : "🔍 DRY-RUN (시뮬레이션)"}`);
  console.log(`- 대상 clientId: ${clientId}`);
  console.log(`- overwrite 여부: ${overwrite ? "Yes (덮어쓰기 허용)" : "No (기존 존재 시 skip)"}`);
  if (workflowKey) console.log(`- workflowKey 필터: ${workflowKey}`);
  if (automationId) console.log(`- automationId 필터: ${automationId}`);
  if (startDateStr) console.log(`- 시작일(createdAt >=): ${startDateStr}`);
  if (endDateStr) console.log(`- 종료일(createdAt <=): ${endDateStr}`);
  if (limitStr) console.log(`- limit 제한: ${limitStr}개`);
  console.log("-----------------------------------------\n");

  if (!dryRun && confirmVal !== "BACKFILL_KNOWLEDGE_SEARCH_INDEX") {
    console.warn("⚠️ 경고: --dryRun false로 선언했으나 --confirm BACKFILL_KNOWLEDGE_SEARCH_INDEX 값이 입력되지 않았습니다.");
    console.warn("➡️ 강제로 DRY-RUN 모드로 전환하여 시뮬레이션을 진행합니다.\n");
  }

  const limit = limitStr ? parseInt(limitStr, 10) : undefined;
  const startDate = startDateStr ? new Date(startDateStr) : null;
  const endDate = endDateStr ? new Date(endDateStr) : null;

  // 1. templates & users 캐싱 로드
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

  // 2. submissions 컬렉션 스캔
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

    // 기본 적합성 판정
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

    // 추가 필터 판정
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

  // limit 필터 적용
  const filteredCandidates = limit ? candidates.slice(0, limit) : candidates;

  console.log(`\n🔍 [3/3] 기존 knowledgeSearchIndex 중복 스캔 중...`);
  // 기존 인덱스가 존재하는지 submissionId 목록으로 검증
  const existingIds = new Set<string>();
  if (filteredCandidates.length > 0) {
    const chunks: string[][] = [];
    for (let i = 0; i < filteredCandidates.length; i += 30) {
      chunks.push(filteredCandidates.slice(i, i + 30).map(c => c.docId));
    }

    await Promise.all(
      chunks.map(async (chunk) => {
        const snap = await db.collection("knowledgeSearchIndex")
          .where("submissionId", "in", chunk)
          .get();
        snap.forEach((doc) => {
          existingIds.add(doc.id);
        });
      })
    );
  }

  const toProcessList: any[] = [];
  let skipCount = 0;

  filteredCandidates.forEach((c) => {
    if (existingIds.has(c.docId) && !overwrite) {
      skipCount++;
    } else {
      toProcessList.push(c);
    }
  });

  console.log(`\n=========================================`);
  console.log(`📊 [BACKFILL STATISTICS]`);
  console.log(`- 전체 스캔 문서: ${submissionsSnap.size}개`);
  console.log(`- 마이그레이션 가능 후보 문서 수: ${candidates.length}개`);
  console.log(`- 제외 수: ${totalExcluded}개`);
  console.log(`  └─ 성공 상태 아님: ${excludeCounts.not_success}개`);
  console.log(`  └─ 결과 본문(processorResult) 없음: ${excludeCounts.no_result}개`);
  console.log(`  └─ 보관 레벨 notify_only 제외: ${excludeCounts.notify_only_level}개`);
  console.log(`  └─ 워크플로우 키 없음: ${excludeCounts.no_workflow_key}개`);
  console.log(`  └─ 추가 필터( workflowKey / 기간 ) 불일치: ${excludeCounts.filter_mismatch}개`);
  console.log(`- 기존 인덱스 존재로 skip 수: ${skipCount}개`);
  console.log(`- 처리 대상 인덱스 수 (write 예정/완료): ${toProcessList.length}개`);
  console.log(`=========================================`);

  if (toProcessList.length === 0) {
    console.log("\n💡 새로 인덱싱을 수행할 후보 문서가 없습니다. (전부 skip 되었거나 대상 없음)");
    process.exit(0);
  }

  // 샘플 출력 5~10개 표시
  console.log(`\n📋 [처리 대상 submissionId 샘플 목록 (최대 10개)]`);
  toProcessList.slice(0, 10).forEach((c, idx) => {
    const statusText = existingIds.has(c.docId) ? "overwrite" : "new-index";
    console.log(`  ${idx + 1}. [${c.docId}] key: ${c.data.workflowKey} | (${statusText})`);
  });

  // KnowledgeSearchIndexDoc 샘플 JSON 출력
  console.log(`\n✨ [생성 예정인 KnowledgeSearchIndexDoc 샘플 (최대 1개)]`);
  const sampleTarget = toProcessList[0];
  const ownerName = userNameMap[sampleTarget.data.uid] || "";
  const ownerEmail = userEmailMap[sampleTarget.data.uid] || "";
  const workflowName = templateNameMap[sampleTarget.data.workflowKey] || sampleTarget.data.workflowKey;

  const rawIndex = buildKnowledgeSearchIndexDocRaw(
    sampleTarget.data,
    ownerName,
    ownerEmail,
    workflowName
  );

  console.log(JSON.stringify({
    ...rawIndex,
    createdAt: { _type: "Firestore.Timestamp", seconds: Math.floor(new Date(rawIndex.createdAt).getTime() / 1000), nanoseconds: 0 },
    completedAt: rawIndex.completedAt ? { _type: "Firestore.Timestamp", seconds: Math.floor(new Date(rawIndex.completedAt).getTime() / 1000), nanoseconds: 0 } : null,
    updatedAt: { _type: "Firestore.Timestamp", seconds: Math.floor(new Date(rawIndex.updatedAt).getTime() / 1000), nanoseconds: 0 }
  }, null, 2));

  // 3. 실제 Firestore write 수행
  if (isWriteMode) {
    console.log(`\n🔥 [작업 실행] Firestore에 실제 백필 쓰기(write)를 개시합니다... (400개 단위 청킹)`);
    const admin = require("firebase-admin");

    // 400개씩 chunking 처리
    const batchSize = 400;
    let successCount = 0;

    for (let i = 0; i < toProcessList.length; i += batchSize) {
      const chunk = toProcessList.slice(i, i + batchSize);
      const batch = db.batch();

      for (const target of chunk) {
        const oName = userNameMap[target.data.uid] || "";
        const oEmail = userEmailMap[target.data.uid] || "";
        const wName = templateNameMap[target.data.workflowKey] || target.data.workflowKey;

        const rawDoc = buildKnowledgeSearchIndexDocRaw(
          target.data,
          oName,
          oEmail,
          wName
        );

        // 시간 데이터 Timestamp 로 래핑
        const indexDoc = {
          ...rawDoc,
          createdAt: admin.firestore.Timestamp.fromDate(new Date(rawDoc.createdAt)),
          completedAt: rawDoc.completedAt ? admin.firestore.Timestamp.fromDate(new Date(rawDoc.completedAt)) : null,
          updatedAt: admin.firestore.Timestamp.fromDate(new Date(rawDoc.updatedAt)),
        };

        const docRef = db.collection("knowledgeSearchIndex").doc(target.docId);
        batch.set(docRef, indexDoc);
      }

      try {
        await batch.commit();
        successCount += chunk.length;
        console.log(`✅ [batch-commit] 성공: ${successCount} / ${toProcessList.length} 완료`);
      } catch (err: any) {
        console.error(`❌ [batch-commit] 오류 발생! 해당 청크의 첫 submissionId: ${chunk[0]?.docId}`);
        console.error("오류 원인:", err.message);
        process.exit(1);
      }
    }

    console.log(`\n🎉 [완료] 성공적으로 ${successCount}개의 인덱스를 등록 완료하였습니다.`);
  } else {
    console.log(`\n-----------------------------------------`);
    console.log(`💡 status: DRY-RUN ONLY. 실제 Firestore DB는 업데이트되지 않았습니다.`);
    console.log(`실행하려면 다음 명령을 사용하세요:`);
    console.log(`npx tsx scripts/backfill-knowledge-search-index.ts --clientId ${clientId} --dryRun false --confirm BACKFILL_KNOWLEDGE_SEARCH_INDEX`);
    console.log(`-----------------------------------------`);
  }
}

main().catch((err) => {
  console.error("❌ 실행 오류:", err);
  process.exit(1);
});
