// 이 스크립트는 기존 clients 컬렉션의 문서를 기준으로, 일반 사용자에게 안전하게 노출 가능한 정보만 clientPublicProfiles 컬렉션에 백필하는 일회성 마이그레이션 스크립트입니다.
// 프로젝트 루트에서 'npx tsx scripts/backfillClientPublicProfiles.ts' 명령어로 구동 가능합니다.

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
  console.log(`🚀 N8Lient Client Public Profiles Backfill Tool`);
  console.log(`Current Firebase Project: ${projectId}`);
  console.log("=========================================\n");

  // CLI 인자 판독
  const args = process.argv.slice(2);
  
  // --confirm 옵션 판독
  const confirmIdx = args.indexOf("--confirm");
  const confirmValue = confirmIdx !== -1 ? args[confirmIdx + 1] : "";
  const isDryRun = confirmValue !== "BACKFILL_CLIENT_PUBLIC_PROFILES";

  // --clientId 옵션 판독 (특정 고객사 단건 지정 처리)
  const clientIdIdx = args.indexOf("--clientId");
  const targetClientId = clientIdIdx !== -1 ? args[clientIdIdx + 1] : null;

  if (args.includes("--confirm") && confirmValue !== "BACKFILL_CLIENT_PUBLIC_PROFILES") {
    console.error("❌ 에러: 확인 문자열이 일치하지 않습니다. ('BACKFILL_CLIENT_PUBLIC_PROFILES'가 입력되어야 실제 실행됩니다.)");
    console.log("👉 안전하게 dry-run으로 실행하려면 옵션 없이 구동하거나 --dry-run을 붙여주십시오.\n");
    process.exit(1);
  }

  // 1. clients 로드
  let query: admin.firestore.Query = db.collection("clients");
  if (targetClientId) {
    console.log(`🎯 대상 clientId 지정 필터링: ${targetClientId}`);
    query = query.where("clientId", "==", targetClientId);
  }

  const clientsSnap = await query.get();
  console.log(`🔍 총 ${clientsSnap.size}개의 clients 문서를 스캔했습니다.`);

  let clientsScanned = 0;
  let profilesToCreate = 0;
  let profilesToUpdate = 0;
  let skipped = 0;
  let warnings = 0;

  const tasks: { clientId: string; type: "create" | "update"; data: any }[] = [];

  // 안전 필드 허용 목록
  const ALLOWED_FIELDS = [
    "clientId",
    "companyName",
    "companyDisplayName",
    "companyCode",
    "contactName",
    "contactPhone",
    "homepageUrl",
    "description",
  ];

  // 절대로 포함하지 말아야 할 민감 필드 목록 (Warning 체크용)
  const FORBIDDEN_FIELDS = [
    "ownerAdminUid",
    "ownerAdminEmail",
    "ownerAdminDisplayName",
    "adminBootstrapStatus",
    "geminiApiKeySecretId",
    "defaultDriveRootFolderId",
    "defaultReportEmail",
    "defaultTimezone",
    "Secret",
    "Token",
    "API Key",
    "Credential",
    "Storage path",
    "n8nServerKey",
    "webhookSecretId",
    "contractRetentionLimit",
    "companyRetentionPolicy",
    "systemResourceSettings",
    "clientContracts",
    "clientAutomations",
  ];

  for (const clientDoc of clientsSnap.docs) {
    clientsScanned++;
    const clientData = clientDoc.data();
    const clientId = clientData.clientId;
    const companyName = clientData.companyName;

    // 필수값 검증 (clientId, companyName)
    if (!clientId || !companyName) {
      console.warn(`⚠️ Warning: 필수값 누락으로 스킵함. Document ID: ${clientDoc.id} (clientId: ${clientId}, companyName: ${companyName})`);
      skipped++;
      continue;
    }

    // 허용된 안전 공개 필드만 추출
    const publicProfileData: any = {};
    for (const key of ALLOWED_FIELDS) {
      if (clientData[key] !== undefined) {
        publicProfileData[key] = clientData[key];
      }
    }

    // updatedAt 필드 추가
    publicProfileData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    // 기존 clientPublicProfiles 확인
    const publicDocRef = db.collection("clientPublicProfiles").doc(clientId);
    const publicDocSnap = await publicDocRef.get();
    
    let type: "create" | "update" = "create";
    if (publicDocSnap.exists) {
      type = "update";
      profilesToUpdate++;

      // 기존 퍼블릭 프로필 문서에 허용되지 않은 민감 필드가 존재하는지 보안 검사
      const existingData = publicDocSnap.data() || {};
      const forbiddenFound = Object.keys(existingData).filter(key => FORBIDDEN_FIELDS.includes(key) || !ALLOWED_FIELDS.concat(["updatedAt"]).includes(key));
      if (forbiddenFound.length > 0) {
        console.warn(`⚠️ Warning [보안]: 기존 public profile [${clientId}] 에 비허용 필드가 감지되었습니다:`, forbiddenFound);
        warnings++;
      }
    } else {
      profilesToCreate++;
    }

    tasks.push({ clientId, type, data: publicProfileData });
  }

  console.log(`\n-----------------------------------------`);
  if (isDryRun) {
    console.log(`[DRY-RUN] clients scanned: ${clientsScanned}`);
    console.log(`[DRY-RUN] profiles to create: ${profilesToCreate}`);
    console.log(`[DRY-RUN] profiles to update: ${profilesToUpdate}`);
    console.log(`[DRY-RUN] skipped: ${skipped}`);
    console.log(`[DRY-RUN] warnings: ${warnings}`);
    console.log(`[DRY-RUN] No writes performed.`);
    console.log(`-----------------------------------------`);
    console.log(`📢 실제 실행을 하려면 아래 명령어를 구동하십시오:`);
    console.log(`npx tsx scripts/backfillClientPublicProfiles.ts --confirm BACKFILL_CLIENT_PUBLIC_PROFILES${targetClientId ? ` --clientId ${targetClientId}` : ""}`);
  } else {
    console.log(`[WRITE] 백필 작성을 시작합니다... (Total tasks: ${tasks.length})`);
    
    const batchSize = 400;
    let batch = db.batch();
    let count = 0;
    let completedCount = 0;

    for (const task of tasks) {
      const docRef = db.collection("clientPublicProfiles").doc(task.clientId);
      // set() with merge option to prevent deleting safe fields if any
      batch.set(docRef, task.data, { merge: true });
      count++;

      if (count === batchSize) {
        await batch.commit();
        completedCount += count;
        console.log(`- 진행률: ${completedCount}/${tasks.length}개 반영 완료...`);
        batch = db.batch();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
      completedCount += count;
    }

    console.log(`\n[WRITE] clients scanned: ${clientsScanned}`);
    console.log(`[WRITE] profiles created: ${profilesToCreate}`);
    console.log(`[WRITE] profiles updated: ${profilesToUpdate}`);
    console.log(`[WRITE] skipped: ${skipped}`);
    console.log(`[WRITE] warnings: ${warnings}`);
    console.log(`[WRITE] complete.`);
    console.log(`-----------------------------------------`);
  }
}

main().catch((err) => {
  console.error("❌ 실행 중 에러가 발생했습니다:", err);
  process.exit(1);
});
