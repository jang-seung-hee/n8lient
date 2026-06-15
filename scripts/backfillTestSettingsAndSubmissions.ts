// [운영 안내] 이 스크립트는 2026-06-15 기준 레거시 테스트 데이터 백필(isTestExecution 및 isTestSetting 필드 보완)을 위해 제작 및 사용 완료된 일회성 마이그레이션 운영 스크립트입니다.
// 프로젝트 루트에서 'npx tsx scripts/backfillTestSettingsAndSubmissions.ts' 명령어로 구동 가능합니다.
// 기본은 dry-run 모드로 실행되며, 실제 반영을 위해서는 '--confirm BACKFILL_TEST_DATA' 인자를 전달해야 합니다.

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

import admin from "firebase-admin";
import { getAdminFirestore } from "../src/lib/firebaseAdmin";

async function main() {
  const db = getAdminFirestore();
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || "(알 수 없음)";

  console.log("=========================================");
  console.log(`🚀 N8Lient Test/Prod Field Backfill Tool`);
  console.log(`Current Firebase Project: ${projectId}`);
  console.log("=========================================\n");

  // CLI 인자 판독
  const args = process.argv.slice(2);
  const confirmIdx = args.indexOf("--confirm");
  const confirmValue = confirmIdx !== -1 ? args[confirmIdx + 1] : "";
  const isDryRun = confirmValue !== "BACKFILL_TEST_DATA";

  if (args.includes("--confirm") && confirmValue !== "BACKFILL_TEST_DATA") {
    console.error("❌ 에러: 확인 문자열이 일치하지 않습니다. ('BACKFILL_TEST_DATA'가 입력되어야 실제 실행됩니다.)");
    console.log("👉 안전하게 dry-run으로 실행하려면 옵션 없이 구동해 주십시오.\n");
    process.exit(1);
  }

  // 1. 전체 workflowTemplates 정보 캐싱 (메모리 상에서 조회 속도 최적화 및 쿼리 제한 극복)
  console.log("🔍 [1/3] workflowTemplates 컬렉션 로딩 중...");
  const templatesSnap = await db.collection("workflowTemplates").get();
  const templateStatusMap: Record<string, string> = {};
  templatesSnap.forEach((doc) => {
    const data = doc.data();
    templateStatusMap[doc.id] = data.status || "published";
  });
  console.log(`💡 캐시 완료: ${Object.keys(templateStatusMap).length}개의 템플릿 상태를 로드했습니다.`);

  // 2. submissions 컬렉션 전체 로딩 후 필터링
  console.log("\n🔍 [2/3] submissions 컬렉션 스캔 중...");
  const submissionsSnap = await db.collection("submissions").get();
  console.log(`💡 submissions 총 문서 수: ${submissionsSnap.size}`);

  const subsToBackfill: { ref: admin.firestore.DocumentReference; workflowKey: string; docId: string; classify: boolean }[] = [];
  let subProdCount = 0;
  let subTestCount = 0;

  submissionsSnap.forEach((doc) => {
    const data = doc.data();
    // isTestExecution 필드가 undefined이거나 누락된 경우 대상
    if (data.isTestExecution === undefined) {
      const workflowKey = data.workflowKey || "";
      const status = templateStatusMap[workflowKey];
      // 연결된 템플릿이 존재하고 status가 draft이면 테스트 데이터, 그 외는 운영 데이터로 분류
      const classifyAsTest = status === "draft";
      
      subsToBackfill.push({
        ref: doc.ref,
        workflowKey,
        docId: doc.id,
        classify: classifyAsTest
      });

      if (classifyAsTest) {
        subTestCount++;
      } else {
        subProdCount++;
      }
    }
  });
  console.log(`💡 백필 필요한 submissions 대상: ${subsToBackfill.length}개 (Test: ${subTestCount}개, Prod: ${subProdCount}개)`);

  // 3. userAutomationSettings 컬렉션 전체 로딩 후 필터링
  console.log("\n🔍 [3/3] userAutomationSettings 컬렉션 스캔 중...");
  const settingsSnap = await db.collection("userAutomationSettings").get();
  console.log(`💡 userAutomationSettings 총 문서 수: ${settingsSnap.size}`);

  const settingsToBackfill: { ref: admin.firestore.DocumentReference; workflowKey: string; docId: string; classify: boolean }[] = [];
  let settingProdCount = 0;
  let settingTestCount = 0;

  settingsSnap.forEach((doc) => {
    const data = doc.data();
    // isTestSetting 필드가 undefined이거나 누락된 경우 대상
    if (data.isTestSetting === undefined) {
      const workflowKey = data.workflowKey || "";
      const status = templateStatusMap[workflowKey];
      const classifyAsTest = status === "draft";

      settingsToBackfill.push({
        ref: doc.ref,
        workflowKey,
        docId: doc.id,
        classify: classifyAsTest
      });

      if (classifyAsTest) {
        settingTestCount++;
      } else {
        settingProdCount++;
      }
    }
  });
  console.log(`💡 백필 필요한 userAutomationSettings 대상: ${settingsToBackfill.length}개 (Test: ${settingTestCount}개, Prod: ${settingProdCount}개)`);

  console.log(`\n-----------------------------------------`);
  if (isDryRun) {
    console.log(`[DRY-RUN RESULTS]`);
    console.log(`- Submissions 스캔: ${submissionsSnap.size}개`);
    console.log(`  └─ 필드 누락 (백필 대상): ${subsToBackfill.length}개`);
    console.log(`     ├─ 테스트 데이터 분류 (isTestExecution: true): ${subTestCount}개`);
    console.log(`     └─ 운영 데이터 분류 (isTestExecution: false): ${subProdCount}개`);
    console.log(`- UserAutomationSettings 스캔: ${settingsSnap.size}개`);
    console.log(`  └─ 필드 누락 (백필 대상): ${settingsToBackfill.length}개`);
    console.log(`     ├─ 테스트 데이터 분류 (isTestSetting: true): ${settingTestCount}개`);
    console.log(`     └─ 운영 데이터 분류 (isTestSetting: false): ${settingProdCount}개`);
    console.log(`- status: DRY-RUN (데이터가 물리적으로 쓰이지 않았습니다)`);
    console.log(`-----------------------------------------`);
    console.log(`📢 실제 DB에 마이그레이션을 적용하려면 아래 명령어를 구동하십시오:`);
    console.log(`npx tsx scripts/backfillTestSettingsAndSubmissions.ts --confirm BACKFILL_TEST_DATA`);
  } else {
    const totalTasks = subsToBackfill.length + settingsToBackfill.length;
    console.log(`[WRITE] 백필 업데이트를 시작합니다... (총 대상 문서 수: ${totalTasks})`);

    const batchSize = 400;
    let batch = db.batch();
    let count = 0;
    let completedCount = 0;

    // 1. submissions 업데이트 반영
    for (const task of subsToBackfill) {
      batch.update(task.ref, {
        isTestExecution: task.classify,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      count++;

      if (count === batchSize) {
        await batch.commit();
        completedCount += count;
        console.log(`- 진행률: ${completedCount}/${totalTasks}개 업데이트 완료...`);
        batch = db.batch();
        count = 0;
      }
    }

    // 2. userAutomationSettings 업데이트 반영
    for (const task of settingsToBackfill) {
      batch.update(task.ref, {
        isTestSetting: task.classify,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      count++;

      if (count === batchSize) {
        await batch.commit();
        completedCount += count;
        console.log(`- 진행률: ${completedCount}/${totalTasks}개 업데이트 완료...`);
        batch = db.batch();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
      completedCount += count;
    }

    console.log(`\n[WRITE] 완료: 총 ${completedCount}개의 문서에 백필 처리가 성공적으로 완료되었습니다.`);
    console.log(`-----------------------------------------`);
  }
}

main().catch((err) => {
  console.error("❌ 백필 도중 에러가 발생했습니다:", err);
  process.exit(1);
});
