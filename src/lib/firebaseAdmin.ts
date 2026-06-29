// 이 파일은 서버 전용(Next.js Route Handler) Firebase Admin SDK 초기화를 담당합니다.
// 절대로 클라이언트 컴포넌트에서 import 하지 마십시오.
// 환경변수: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY

import admin from "firebase-admin";
import type { App } from "firebase-admin/app";

// 싱글톤 패턴: 서버 재시작 없이 여러 요청에서 중복 초기화를 방지합니다.
let adminApp: App | null = null;

/**
 * Firebase Admin SDK 앱 인스턴스를 반환합니다.
 * 최초 호출 시에만 초기화되며, 이후에는 기존 인스턴스를 재사용합니다.
 */
export function getAdminApp(): App {
  if (adminApp) return adminApp;

  // 필수 환경변수 누락 체크
  let projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  let clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    // [v1.0] 로컬 개발 환경 보완: adminsdk env 파일 수동 파싱 및 환경변수 병합
    if (process.env.NODE_ENV === "development") {
      try {
        const fs = require("fs");
        const path = require("path");
        const rootDir = process.cwd();
        const files = fs.readdirSync(rootDir);
        const adminsdkEnv = files.find((f: string) => f.includes("adminsdk") && (f.endsWith(".env") || f.includes(".env")));
        if (adminsdkEnv) {
          const envPath = path.join(rootDir, adminsdkEnv);
          const envContent = fs.readFileSync(envPath, "utf-8").trim();
          if (envContent.startsWith("{")) {
            const serviceAccount = JSON.parse(envContent);
            process.env.FIREBASE_ADMIN_PROJECT_ID = serviceAccount.project_id;
            process.env.FIREBASE_ADMIN_CLIENT_EMAIL = serviceAccount.client_email;
            process.env.FIREBASE_ADMIN_PRIVATE_KEY = serviceAccount.private_key;
          } else {
            envContent.split(/\r?\n/).forEach((line: string) => {
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
          projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
          clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
          privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
        }
      } catch (err: any) {
        console.warn("⚠️ [firebaseAdmin] adminsdk.env 로딩 중 에러 발생:", err.message);
      }
    }
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "[firebaseAdmin] 서버 환경변수가 누락되었습니다. FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY를 확인하세요."
    );
  }

  // 이미 초기화된 앱이 있으면 재사용 (핫리로드 방지)
  if (admin.apps.length > 0) {
    adminApp = admin.apps[0] as App;
    return adminApp;
  }

  adminApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      // 환경변수의 개행 문자 이스케이프 처리 (\n → 실제 개행)
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });

  return adminApp;
}

/**
 * Firebase Admin Firestore 인스턴스를 반환합니다.
 */
export function getAdminFirestore() {
  const app = getAdminApp();
  return admin.firestore(app);
}

/**
 * Firebase Admin Auth 인스턴스를 반환합니다.
 */
export function getAdminAuth() {
  const app = getAdminApp();
  return admin.auth(app);
}
