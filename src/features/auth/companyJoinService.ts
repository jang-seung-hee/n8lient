// 이 파일은 회사코드 조회(companyCodeLookups) 및 회사 가입 승인 요청(companyJoinRequests)을 처리하는 서비스를 제공합니다.

import { doc, getDoc, writeBatch, Firestore } from "firebase/firestore";
import type { CompanyJoinRequest, ClientId } from "@/types/n8lient";
import type { User } from "firebase/auth";

interface SubmitResult {
  success: boolean;
  message?: string;
}

/**
 * 회사코드를 검증하고, companyJoinRequests 승인 요청을 결정형 ID로 생성 및 users 테이블을 일괄 업데이트합니다.
 */
export async function submitCompanyJoinRequest(
  db: Firestore,
  firebaseUser: User,
  companyCode: string
): Promise<SubmitResult> {
  const normalizedCode = companyCode.trim().toUpperCase();
  if (!normalizedCode) {
    return { success: false, message: "회사코드를 입력해 주십시오." };
  }

  // 1단계: companyCodeLookups/{normalizedCode} 문서 조회
  let lookupSnap;
  try {
    const lookupRef = doc(db, "companyCodeLookups", normalizedCode);
    lookupSnap = await getDoc(lookupRef);
  } catch (err: any) {
    console.error("[디버그] 1단계: companyCodeLookups 조회 실패", err);
    return { 
      success: false, 
      message: `회사코드 조회 권한이 없습니다. (1단계 에러: ${err.message || err})` 
    };
  }

  if (!lookupSnap.exists()) {
    return { success: false, message: "존재하지 않거나 활성화되지 않은 회사코드입니다." };
  }

  const lookupData = lookupSnap.data();
  const { clientId, status } = lookupData;

  if (status !== "active") {
    return { success: false, message: "존재하지 않거나 활성화되지 않은 회사코드입니다." };
  }

  // 2단계: 결정형 문서 ID 생성 및 중복 확인 조회
  const requestId = `${firebaseUser.uid}_${clientId}`;
  const requestRef = doc(db, "companyJoinRequests", requestId);
  let requestSnap;
  try {
    requestSnap = await getDoc(requestRef);
  } catch (err: any) {
    console.error("[디버그] 2단계: companyJoinRequests 중복 검사 조회 실패", err);
    return { 
      success: false, 
      message: `가입 요청 중복 확인 권한이 없습니다. (2단계 에러: ${err.message || err})` 
    };
  }

  // 이미 요청이 존재하는 경우 중복 처리 방지
  if (requestSnap.exists() && requestSnap.data().status === "pending") {
    return { success: false, message: "이미 이 회사로의 승인요청이 대기 중입니다." };
  }

  // 3단계: 승인 요청 데이터 모델 정의
  const newRequest: CompanyJoinRequest = {
    requestId,
    uid: firebaseUser.uid,
    email: firebaseUser.email || "",
    displayName: firebaseUser.displayName || "",
    requestedCompanyCode: normalizedCode,
    clientId: clientId as ClientId,
    status: "pending",
    requestedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    rejectReason: null,
  };

  // 4단계: batch 처리를 통한 원자적(atomic) 쓰기 수행
  try {
    const userRef = doc(db, "users", firebaseUser.uid);
    const batch = writeBatch(db);

    batch.set(requestRef, newRequest);
    batch.update(userRef, {
      approvalStatus: "pending",
      clientId: clientId,
      updatedAt: new Date().toISOString(),
    });

    await batch.commit();
  } catch (err: any) {
    console.error("[디버그] 4단계: batch commit(신청서 생성 및 user 업데이트) 실패", err);
    return { 
      success: false, 
      message: `승인 요청 제출 권한이 없습니다. (4단계 에러: ${err.message || err})` 
    };
  }

  return { success: true };
}
