// 이 파일은 Firestore의 users 컬렉션에 대한 조회, 생성 및 실시간 변경 사항을 구독하는 서비스를 제공합니다.

import { doc, getDoc, setDoc, onSnapshot, updateDoc, Firestore } from "firebase/firestore";
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

/**
 * 사용자가 본인의 기본 프로필 정보(표시이름, 부서, 직책, 휴대폰번호)를 수정하는 서비스 함수
 */
export async function updateMyUserProfile(
  db: Firestore,
  uid: string,
  payload: {
    displayName: string;
    department?: string;
    position?: string;
    phone?: string;
  }
): Promise<{ success: boolean; message?: string }> {
  try {
    const userRef = doc(db, "users", uid);
    
    // 허용된 필드만 추출하여 전달함으로써 권한 오염(role, approvalStatus, clientId 등 변경) 원천 차단
    const updateData = {
      displayName: payload.displayName.trim(),
      department: payload.department?.trim() || "",
      position: payload.position?.trim() || "",
      phone: payload.phone?.trim() || "",
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(userRef, updateData);
    return { success: true };
  } catch (error: any) {
    console.error("[authUserService] 프로필 정보 업데이트 실패:", error);
    return { success: false, message: error.message || "프로필 정보 저장 중 오류가 발생했습니다." };
  }
}
