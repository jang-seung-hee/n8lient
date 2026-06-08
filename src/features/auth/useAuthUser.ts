// 이 파일은 Firebase Auth의 로그인 상태를 감지하고 로그인/로그아웃 함수를 제공하는 커스텀 훅입니다.
// Phase 1C에서 Firestore users 컬렉션 연동 시 이 훅 내부만 확장합니다.

"use client";

import { useContext } from "react";
import { AuthContext } from "@/features/auth/AuthProvider";

/**
 * Auth 컨텍스트를 소비하는 훅
 * AuthProvider 하위 컴포넌트에서만 사용해야 합니다.
 */
export function useAuthUser() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthUser는 AuthProvider 하위 컴포넌트에서만 사용할 수 있습니다.");
  }
  return context;
}
