// 이 파일은 Firestore의 users 컬렉션에 대한 조회, 생성 및 실시간 변경 사항을 구독하는 서비스를 제공합니다.

import { doc, getDoc, setDoc, onSnapshot, Firestore } from "firebase/firestore";
import type { UserDoc } from "@/types/n8lient";
import type { User } from "firebase/auth";

/**
 * uid를 기준으로 users 문서를 조회합니다.
 */
export async function getUserDoc(db: Firestore, uid: string): Promise<UserDoc | null> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data() as UserDoc;
  }
  return null;
}

/**
 * 신규 사용자를 위한 기본 users 문서를 생성합니다.
 */
export async function createDefaultUserDoc(
  db: Firestore,
  firebaseUser: User
): Promise<UserDoc> {
  const userRef = doc(db, "users", firebaseUser.uid);
  const newUserDoc: UserDoc = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || "",
    displayName: firebaseUser.displayName || "",
    photoURL: firebaseUser.photoURL || undefined,
    role: "user",
    approvalStatus: "no_company",
    clientId: null, // 초기값 null 설정
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(userRef, newUserDoc);
  return newUserDoc;
}

/**
 * 사용자 정보의 실시간 업데이트를 감지(구독)합니다.
 */
export function subscribeUserDoc(
  db: Firestore,
  uid: string,
  onUpdate: (userDoc: UserDoc | null) => void,
  onError?: (error: Error) => void
): () => void {
  const userRef = doc(db, "users", uid);
  return onSnapshot(
    userRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate(null);
      } else {
        onUpdate(snapshot.data() as UserDoc);
      }
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.error(`[authUserService] 사용자 문서 구독 중 에러:`, error);
      }
    }
  );
}
