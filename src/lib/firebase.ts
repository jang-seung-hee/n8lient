// 이 파일은 Firebase SDK를 초기화하고 환경 변수 누락을 방지하는 방어 로직을 관리하는 파일입니다.

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 필수 환경 변수 누락 여부 정적 확인 (Next.js의 클라이언트 번들링 환경변수 치환 스펙을 적용하기 위해 정적 조회를 사용합니다.)
const missingEnv: string[] = [];
if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) missingEnv.push("NEXT_PUBLIC_FIREBASE_API_KEY");
if (!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) missingEnv.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) missingEnv.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
if (!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) missingEnv.push("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
if (!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) missingEnv.push("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
if (!process.env.NEXT_PUBLIC_FIREBASE_APP_ID) missingEnv.push("NEXT_PUBLIC_FIREBASE_APP_ID");

if (missingEnv.length > 0) {
  console.warn(
    `[Firebase 초기화 경고] 다음 필수 환경 변수가 누락되었습니다: ${missingEnv.join(", ")}. 로컬 환경변수 파일(.env.local)을 확인해 주십시오.`
  );
}

// Firebase 설정 객체 정의 (실제 키는 .env.local에 보관, 코드에 하드코딩 금지)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dummy-auth-domain",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dummy-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "dummy-storage-bucket",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "dummy-sender-id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "dummy-app-id",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// 중복 초기화 방지를 적용한 Firebase App 싱글톤 인스턴스 생성
let app: FirebaseApp;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (error) {
  console.error("[Firebase 초기화 오류] Firebase 앱 초기화 중 에러가 발생했습니다.", error);
  // 에러 헬퍼용 더미 앱 초기화 시도
  app = initializeApp(firebaseConfig);
}

// Firebase Auth 인스턴스 (Google 로그인에 사용)
const auth: Auth = getAuth(app);

// Google OAuth 2.0 Provider
const googleProvider = new GoogleAuthProvider();
// 매번 계정 선택 팝업이 표시되도록 강제 (재로그인 시에도 계정 선택 가능)
googleProvider.setCustomParameters({ prompt: "select_account" });

// Firestore 데이터베이스 인스턴스
const db = getFirestore(app);

export { app, auth, googleProvider, db };

