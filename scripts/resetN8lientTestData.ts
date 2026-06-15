// 이 스크립트는 N8Lient 테스트 데이터를 안전하게 초기화하기 위한 로컬 운영자 전용 스크립트입니다.
// 프로젝트 루트에서 'npx tsx scripts/resetN8lientTestData.ts' 명령어로 구동 가능합니다.

import { loadEnvConfig } from "@next/env";
import fs from "fs";
import path from "path";

// 1. Next.js 환경변수 (.env.local 등) 로드
loadEnvConfig(process.cwd());

// 2. 로컬 Firebase Admin SDK 전용 .env 파일 자동 로드 (자체 수동 파서 구현으로 외부 dotenv 패키지 의존성 완벽 배제)
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
import { getAdminFirestore, getAdminApp } from "../src/lib/firebaseAdmin";

async function main() {
  const db = getAdminFirestore();
  const app = getAdminApp();
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || "(알 수 없음)";

  console.log("=========================================");
  console.log(`🚀 N8Lient Test Data Reset Tool`);
  console.log(`Current Firebase Project: ${projectId}`);
  console.log("=========================================\n");

  // 1. CLI 인자 판독
  const args = process.argv.slice(2);
  const hasConfirmOpt = args.includes("--confirm");
  const confirmIdx = args.indexOf("--confirm");
  const confirmValue = confirmIdx !== -1 ? args[confirmIdx + 1] : "";

  // --confirm RESET_N8LIENT_TEST_DATA 가 정확하게 들어온 경우에만 실제 삭제 진행
  const isDryRun = !hasConfirmOpt || confirmValue !== "RESET_N8LIENT_TEST_DATA";

  // --include-storage 옵션 판독
  const hasIncludeStorage = args.includes("--include-storage");

  // Storage bucket 초기화
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;
  const bucket = admin.storage(app).bucket(bucketName);

  if (hasConfirmOpt && confirmValue !== "RESET_N8LIENT_TEST_DATA") {
    console.error("❌ 에러: 확인 문자열이 일치하지 않습니다. ('RESET_N8LIENT_TEST_DATA'가 입력되어야 실제 실행됩니다.)");
    console.log("👉 안전하게 dry-run으로 실행하려면 옵션 없이 구동하거나 --dry-run을 붙여주십시오.\n");
    process.exit(1);
  }

  // --protect-email 옵션 파싱 (다중 지정 가능하도록 구현)
  const protectEmails: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--protect-email" && args[i + 1]) {
      protectEmails.push(args[i + 1].trim());
    }
  }

  // 2. 오퍼레이터 계정 보호 검증을 위해 users 컬렉션 로딩
  const usersSnap = await db.collection("users").get();
  const operatorUsers: any[] = [];
  const protectEmailUsers: any[] = [];
  const testUsers: any[] = [];

  usersSnap.forEach((docSnap) => {
    const data = docSnap.data();
    
    const hasOperatorRole = data.role === "operator";
    const isProtectedByEmail = data.email && protectEmails.includes(data.email);

    if (hasOperatorRole) {
      operatorUsers.push({ id: docSnap.id, email: data.email, role: data.role });
    } else if (isProtectedByEmail) {
      protectEmailUsers.push({ id: docSnap.id, email: data.email, role: data.role });
    } else {
      testUsers.push({ id: docSnap.id, ref: docSnap.ref });
    }
  });

  // 보호 대상 오퍼레이터가 최소 1개 이상 확인되는지 체크
  if (operatorUsers.length === 0) {
    if (protectEmailUsers.length > 0) {
      console.error("❌ 에러: --protect-email로 보호된 사용자는 있으나 role === 'operator' 사용자가 없습니다.");
      console.error("리셋 후 운영자 접근이 불가능할 수 있으므로 작업을 중단합니다.");
    } else {
      console.error("❌ 에러: role === 'operator'인 사용자가 최소 1개 이상 존재해야 합니다. 리셋을 중단합니다.");
    }
    process.exit(1);
  }

  // 3. 삭제 대상 데이터 수집 (지정된 복구 시나리오 참조 관계에 맞춤)
  const listToDelete: { name: string; refs: any[]; sampleIds: string[] }[] = [];

  const collectionsToReset = [
    "submissions",
    "userAutomationSettings",
    "clientAutomations",
    "clientContracts",
    "companyJoinRequests",
    "workflowTemplates",
    "clients",
  ];

  const storagePaths: string[] = [];

  for (const colName of collectionsToReset) {
    const snap = await db.collection(colName).get();
    const refs: any[] = [];
    const sampleIds: string[] = [];
    snap.forEach((docSnap) => {
      refs.push(docSnap.ref);
      if (sampleIds.length < 3) {
        sampleIds.push(docSnap.id);
      }

      // --include-storage 옵션이 있는 경우 submissions 문서에서 storagePath 추출
      if (colName === "submissions" && hasIncludeStorage) {
        const data = docSnap.data();
        if (Array.isArray(data.originalFileRefs)) {
          data.originalFileRefs.forEach((ref: any) => {
            if (ref && typeof ref.storagePath === "string") {
              storagePaths.push(ref.storagePath.trim());
            }
          });
        }
        if (Array.isArray(data.resultRefs)) {
          data.resultRefs.forEach((ref: any) => {
            if (ref && typeof ref.storagePath === "string") {
              storagePaths.push(ref.storagePath.trim());
            }
          });
        }
      }
    });
    listToDelete.push({ name: colName, refs, sampleIds });
  }

  // 중복 제거 및 엄격한 보안 검증 필터링
  // - clients/로 시작하고 submissions/가 포함되어야 함 (그 외 파일 삭제 방지)
  const validStoragePaths = Array.from(new Set(storagePaths)).filter((p) => {
    const isClientsStart = p.startsWith("clients/");
    const hasSubmissions = p.includes("submissions/");
    return isClientsStart && hasSubmissions;
  });

  // 3.1. users 중 non-operator(테스트 사용자) 추가 (role이 없거나 비어있는 경우 등 방어 판독으로 테스트 계정만 안전 수집)
  const nonOperatorSampleIds: string[] = [];
  const nonOperatorRefs: any[] = [];
  testUsers.forEach((u) => {
    nonOperatorRefs.push(u.ref);
    if (nonOperatorSampleIds.length < 3) {
      nonOperatorSampleIds.push(u.id);
    }
  });
  listToDelete.push({ name: "users(non-operator)", refs: nonOperatorRefs, sampleIds: nonOperatorSampleIds });

  // 4. 모드별 동작 수행
  if (isDryRun) {
    console.log("[N8Lient Reset Dry Run]\n");
    console.log(`Project: ${projectId}\n`);
    
    console.log("Collections (삭제 대상 개수 및 샘플):");
    listToDelete.forEach((col) => {
      const sampleStr = col.sampleIds.length > 0 ? ` (예: ${col.sampleIds.join(", ")})` : "";
      console.log(`- ${col.name}: ${col.refs.length} docs${sampleStr}`);
    });
    console.log("");

    if (hasIncludeStorage) {
      console.log("Storage (삭제 대상 파일 개수 및 샘플):");
      console.log(`- Firebase Storage files: ${validStoragePaths.length} files`);
      if (validStoragePaths.length > 0) {
        const sampleFiles = validStoragePaths.slice(0, 3);
        console.log(`  (예: ${sampleFiles.join(", ")})`);
      }
      console.log("");
    }

    console.log("Protected users (role: operator):");
    if (operatorUsers.length > 0) {
      operatorUsers.forEach((op) => {
        console.log(`- ${op.email || "(이메일 없음)"} / role: ${op.role || "operator"} / uid: ${op.id}`);
      });
    } else {
      console.log("- (없음)");
    }
    console.log("");

    console.log("Protected by option:");
    if (protectEmailUsers.length > 0) {
      protectEmailUsers.forEach((op) => {
        console.log(`- ${op.email} / role: ${op.role || "(역할 없음)"} / uid: ${op.id}`);
      });
    } else {
      console.log("- (없음)");
    }
    console.log("");

    console.log("💡 [안내] 기본 보호 기준은 role === \"operator\"입니다.");
    console.log("💡 [안내] 특정 이메일 보호가 필요하면 --protect-email 옵션을 사용하세요.");
    console.log("");

    console.log("⚠️  No data was deleted.");
    console.log("📢 실제 삭제를 구동하려면 아래와 같이 확인 문자열을 인자로 전달하여 실행하십시오:");
    console.log("npx tsx scripts/resetN8lientTestData.ts --confirm RESET_N8LIENT_TEST_DATA" + (hasIncludeStorage ? " --include-storage" : ""));
    console.log("-----------------------------------------\n");
    if (!hasIncludeStorage) {
      console.log("💡 [안내] Firebase Storage 파일 정리는 본 실행에서 제외되었습니다. 포함하려면 --include-storage 옵션을 추가하세요.");
    } else {
      console.log("💡 [안내] Firebase Storage 파일 정리 옵션(--include-storage)이 활성화되었습니다. 실제 삭제 시 대상 파일도 함께 정리됩니다.");
    }
  } else {
    console.log("[N8Lient Reset Execute]\n");

    // 3.2. Storage 파일 삭제 실행 (Firestore 문서 삭제 이전 선행)
    if (hasIncludeStorage && validStoragePaths.length > 0) {
      console.log("📂 Storage 파일 삭제를 먼저 수행합니다...");
      const failedPaths: string[] = [];

      for (const storagePath of validStoragePaths) {
        try {
          const file = bucket.file(storagePath);
          const [exists] = await file.exists();
          if (exists) {
            await file.delete();
            console.log(`- Storage 파일 삭제 완료: ${storagePath}`);
          } else {
            console.warn(`⚠️ 경고: 존재하지 않는 파일입니다. 스킵: ${storagePath}`);
          }
        } catch (err: any) {
          console.error(`❌ Storage 파일 삭제 실패: ${storagePath} (이유: ${err.message || err})`);
          failedPaths.push(storagePath);
        }
      }

      if (failedPaths.length > 0) {
        console.error("\n❌ 에러: 일부 Storage 파일 삭제를 실패했습니다.");
        console.error("실패 목록:");
        failedPaths.forEach((fp) => console.error(`- ${fp}`));
        console.error("\n⚠️ 안전을 위해 Firestore 문서 삭제는 진행하지 않고 중단합니다. Storage 상태를 다시 점검해 주십시오.");
        process.exit(1);
      }
      console.log("🎉 모든 Storage 파일 삭제가 정상 완료되었습니다. Firestore 삭제를 계속합니다.\n");
    }

    console.log("🚨 테스트 데이터를 완전히 삭제합니다...");

    const allRefsToDelete: any[] = [];
    listToDelete.forEach((col) => {
      allRefsToDelete.push(...col.refs);
    });

    const totalToDelete = allRefsToDelete.length;
    console.log(`총 삭제 대상 문서 수: ${totalToDelete}개`);

    // 400개 단위로 batch commit
    const batchSize = 400;
    let batch = db.batch();
    let count = 0;
    let deletedCount = 0;

    for (const ref of allRefsToDelete) {
      batch.delete(ref);
      count++;
      if (count === batchSize) {
        await batch.commit();
        deletedCount += count;
        console.log(`- 진행률: ${deletedCount}/${totalToDelete}개 완료...`);
        batch = db.batch();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
      deletedCount += count;
    }

    console.log("\nDeleted:");
    listToDelete.forEach((col) => {
      console.log(`- ${col.name}: ${col.refs.length} docs`);
    });
    console.log("");

    console.log("Protected:");
    console.log(`- operator users: ${operatorUsers.length} docs`);
    console.log(`- protected by option users: ${protectEmailUsers.length} docs`);
    console.log("\n🎉 Reset completed successfully.");
  }
}

main().catch((err) => {
  console.error("❌ 실행 에러 발생:", err);
  process.exit(1);
});
