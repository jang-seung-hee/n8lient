// 이 파일은 Firebase Auth 상태를 앱 전체에 공급하는 컨텍스트 Provider입니다.
// signInWithPopup(Google), signOut, onAuthStateChanged를 이 파일에서 관리하며,
// Firestore users 컬렉션 연동을 통해 실시간 사용자 문서를 관리합니다.

"use client";

import {
  createContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  User,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider, db } from "@/lib/firebase";
import { subscribeUserDoc, createDefaultUserDoc } from "./authUserService";
import { submitCompanyJoinRequest } from "./companyJoinService";
import type { UserDoc } from "@/types/n8lient";

// ─────────────────────────────────────────────────────────────────────────────
// 컨텍스트 타입 정의
// ─────────────────────────────────────────────────────────────────────────────

interface AuthContextType {
  /** 현재 로그인한 Firebase User (로그아웃 상태이면 null) */
  user: User | null;
  /** Firestore에서 동기화 중인 실시간 사용자 프로필 문서 (미로그인 시 null) */
  userDoc: UserDoc | null;
  /** Auth 및 Firestore 프로필 로딩 여부 */
  loading: boolean;
  /** Google 팝업으로 로그인 */
  signInWithGoogle: () => Promise<void>;
  /** 로그아웃 */
  signOut: () => Promise<void>;
  /** 회사 가입 승인 요청 */
  submitCompanyCode: (companyCode: string) => Promise<{ success: boolean; message?: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context 생성 (초기값 undefined — AuthProvider 외부에서 사용 시 훅에서 에러 throw)
// ─────────────────────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────────────────────────
// AuthProvider 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  // Firebase Auth 및 Firestore 실시간 동기화 감지
  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;
    let isMounted = true;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // 기존 Firestore 문서 구독 해제
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (firebaseUser) {
        if (isMounted) {
          setUser(firebaseUser);
        }

        // Firestore의 users/{uid} 문서 구독 시작
        unsubscribeDoc = subscribeUserDoc(
          db,
          firebaseUser.uid,
          async (docData) => {
            if (!isMounted) return;

            if (docData === null) {
              // 문서가 없으면 기본 문서 생성
              try {
                const newDoc = await createDefaultUserDoc(db, firebaseUser);
                if (isMounted) {
                  setUserDoc(newDoc);
                  setLoading(false);
                }
              } catch (error) {
                console.error("[AuthProvider] 기본 사용자 문서 자동 생성 중 오류:", error);
                if (isMounted) {
                  setLoading(false);
                }
              }
            } else {
              // 문서가 있으면 상태 업데이트 및 로딩 종료
              if (isMounted) {
                setUserDoc(docData);
                setLoading(false);
              }
            }
          },
          (error) => {
            console.error("[AuthProvider] 사용자 문서 구독 오류:", error);
            if (isMounted) {
              setLoading(false);
            }
          }
        );
      } else {
        // 로그아웃 상태 처리
        if (isMounted) {
          setUser(null);
          setUserDoc(null);
          setLoading(false);
        }
      }
    });

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      isMounted = false;
      unsubscribeAuth();
      if (unsubscribeDoc) {
        unsubscribeDoc();
      }
    };
  }, []);

  /**
   * Google 팝업 로그인
   */
  const signInWithGoogle = useCallback(async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("[Auth] Google 로그인 중 오류가 발생했습니다.", error);
      setLoading(false);
    }
  }, []);

  /**
   * 로그아웃
   */
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("[Auth] 로그아웃 중 오류가 발생했습니다.", error);
      setLoading(false);
    }
  }, []);

  /**
   * 회사코드 가입 승인 요청 전달 함수
   */
  const submitCompanyCode = useCallback(async (companyCode: string) => {
    if (!user) {
      return { success: false, message: "로그인이 필요합니다." };
    }
    return submitCompanyJoinRequest(db, user, companyCode);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userDoc,
        loading,
        signInWithGoogle,
        signOut,
        submitCompanyCode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
