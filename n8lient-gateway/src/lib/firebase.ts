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

  // Firebase Storage 버킷 결정 로직 (v2 보정 조건 준수)
  // 1순위: 환경변수 FIREBASE_STORAGE_BUCKET 사용
  // 2순위: 1차 Fallback으로 `${projectId}.firebasestorage.app` 사용
  // 3순위 (주석 참고): legacy 프로젝트는 `${projectId}.appspot.com` 일 수도 있으나 복잡한 자동 추측을 피하기 위해 주석으로만 기록함.
  // 💡 운영 배포 전에는 env.yaml에 FIREBASE_STORAGE_BUCKET을 명시하여 명확하게 고정하는 것을 적극 권장합니다.
  let storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  if (!storageBucket) {
    storageBucket = `${projectId}.firebasestorage.app`;
    console.warn(
      `[firebaseAdmin] FIREBASE_STORAGE_BUCKET 환경변수가 정의되어 있지 않아 1차 Fallback 버킷('${storageBucket}')을 강제 지정하여 초기화합니다. 정상 업로드 실패 시 env.yaml에 적절한 버킷명을 설정하십시오.`
    );
  }

  // 🔑 프라이빗 키 줄바꿈 복원 견고화 (Base64 인코딩 감지 시 디코딩 처리)
  let formattedPrivateKey = privateKey;
  if (!privateKey.startsWith("-----BEGIN")) {
    console.log("[firebaseAdmin] Base64로 인코딩된 Private Key를 감지하여 디코딩을 수행합니다.");
    formattedPrivateKey = Buffer.from(privateKey, "base64").toString("utf8");
  } else {
    formattedPrivateKey = formattedPrivateKey
      .replace(/_NL_/g, "\n")
      .replace(/\[NEWLINE\]/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\r/g, "");
  }

  adminApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: formattedPrivateKey,
    }),
    storageBucket: storageBucket,
  });

  console.log("[firebaseAdmin] Firebase Admin 초기화 완료");

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

/**
 * Firebase Admin Storage 인스턴스를 반환합니다.
 */
export function getAdminStorage() {
  const app = getAdminApp();
  return admin.storage(app);
}
