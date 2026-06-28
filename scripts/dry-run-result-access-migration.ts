// [dry-run-result-access-migration.ts]
// 이 스크립트는 기존 submissions 데이터 중 accessMode가 누락된 완료(success) 데이터를
// company 권한으로 마이그레이션하기 위한 대상 선정 및 예상 변경값 조회 dry-run 도구입니다.
// 보안 규정: 이 스크립트는 오직 대상 조회(dry-run)만을 수행하며 실제 Firestore 쓰기를 수행하지 않습니다.
// 실행 방법: npx tsx scripts/dry-run-result-access-migration.ts --clientId [CLIENT_ID] [추가 옵션]

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

async function main() {
  const db = getAdminFirestore();
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || "(알 수 없음)";

  console.log("=========================================");
  console.log(`🔍 N8Lient Result Access Migration Dry-Run Tool`);
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
    console.log("사용 예시: npx tsx scripts/dry-run-result-access-migration.ts --clientId [CLIENT_ID] [--workflowKey WORKFLOW_KEY] [--limit 50]\n");
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

  console.log("🔍 submissions 컬렉션을 스캔하는 중...");
  // Firestore는 메모리 성능 제약을 고려하여 clientId 필터 기반으로만 기본 쿼리를 날리고 메모리 상에서 세부 필터를 적용합니다.
  const submissionsSnap = await db.collection("submissions")
    .where("clientId", "==", clientId)
    .get();

  console.log(`💡 해당 clientId(${clientId})를 가지는 총 submissions 문서 수: ${submissionsSnap.size}개`);

  const candidates: any[] = [];
  let excludedCount = 0;
  let excludedByFilterCount = 0;

  submissionsSnap.forEach((doc) => {
    const data = doc.data();
    const subId = doc.id;

    // 1. 기본 마이그레이션 후보군 적합성 검증
    const status = data.status || "";
    const hasProcessorResult = data.processorResult !== undefined && data.processorResult !== null;
    const hasAccessMode = data.accessMode !== undefined && data.accessMode !== null;

    // retentionPolicy 레벨 판별 (retentionPolicySnapshot 우선)
    const policy = data.retentionPolicySnapshot || data.retentionPolicy || {};
    const level = policy.level || "full_archive"; // 기본값 full_archive

    const isSuccess = status === "success";
    const isNotifyOnly = level === "notify_only";

    // 제외 사유 체크
    if (!isSuccess || !hasProcessorResult || hasAccessMode || isNotifyOnly) {
      excludedCount++;
      return;
    }

    // 2. 추가 CLI 필터 제약 적용
    if (workflowKey && data.workflowKey !== workflowKey) {
      excludedByFilterCount++;
      return;
    }
    if (automationId && data.automationId !== automationId) {
      excludedByFilterCount++;
      return;
    }

    if (data.createdAt) {
      const createdTime = new Date(data.createdAt);
      if (startDate && createdTime < startDate) {
        excludedByFilterCount++;
        return;
      }
      if (endDate && createdTime > endDate) {
        excludedByFilterCount++;
        return;
      }
    }

    candidates.push({
      submissionId: subId,
      workflowKey: data.workflowKey || "",
      automationId: data.automationId || "",
      status: status,
      level: level,
      createdAt: data.createdAt || "(시간 없음)",
    });
  });

  console.log(`\n=========================================`);
  console.log(`📊 [DRY-RUN RESULTS]`);
  console.log(`- 전체 스캔 문서: ${submissionsSnap.size}개`);
  console.log(`- 부적합 제외 문서 (성공 아님/결과 없음/이미 accessMode 존재/notify_only): ${excludedCount}개`);
  console.log(`- 추가 필터 제약 제외 문서 (workflowKey/date 등 불일치): ${excludedByFilterCount}개`);
  console.log(`- 마이그레이션 가능 후보 문서 수: ${candidates.length}개`);
  console.log(`=========================================`);

  // limit 슬라이스 적용
  const finalCandidates = limit ? candidates.slice(0, limit) : candidates;

  if (finalCandidates.length > 0) {
    console.log(`\n📋 [샘플 submissionId 목록 (최대 10개)]`);
    finalCandidates.slice(0, 10).forEach((c, idx) => {
      console.log(`  ${idx + 1}. [${c.submissionId}] workflowKey: ${c.workflowKey} | automationId: ${c.automationId} | createdAt: ${c.createdAt}`);
    });
  } else {
    console.log("\n💡 마이그레이션 대상 문서가 존재하지 않습니다.");
  }

  console.log(`\n✨ [예상 변경값 구조]`);
  console.log(JSON.stringify({
    accessMode: "company",
    accessChangedBy: "system:migration",
    accessChangedAt: "serverTimestamp()",
    accessChangeReason: "initial_company_migration"
  }, null, 2));

  console.log(`\n-----------------------------------------`);
  console.log(`💡 status: DRY-RUN ONLY. 실제 Firestore DB는 업데이트되지 않았습니다.`);
  console.log(`-----------------------------------------`);
}

main().catch((err) => {
  console.error("❌ 실행 도중 에러가 발생했습니다:", err);
  process.exit(1);
});
