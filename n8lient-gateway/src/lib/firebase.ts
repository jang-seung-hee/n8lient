import admin from "firebase-admin";

let adminApp: admin.app.App | null = null;

/**
 * Firebase Admin SDK 앱 인스턴스를 반환합니다.
 */
export function getAdminApp(): admin.app.App {
  if (adminApp) return adminApp;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "[firebaseAdmin] 서버 환경변수가 누락되었습니다. FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY를 확인하세요."
    );
  }

  if (admin.apps.length > 0) {
    adminApp = admin.apps[0]!;
    return adminApp;
  }

  adminApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
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
