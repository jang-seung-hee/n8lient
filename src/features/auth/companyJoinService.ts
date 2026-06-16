// 이 파일은 회사코드 조회(companyCodeLookups) 및 회사 가입 승인 요청(companyJoinRequests)을 처리하는 서비스를 제공합니다.

import { doc, getDoc, writeBatch, Firestore, query, collection, where, getDocs } from "firebase/firestore";
import type { CompanyJoinRequest, ClientId, SubmitCompanyJoinRequestPayload } from "@/types/n8lient";
import type { User } from "firebase/auth";

interface SubmitResult {
  success: boolean;
  message?: string;
  requestedRole?: "company_admin" | "user";
  clientId?: string;
  companyCode?: string;
  companyName?: string;
}

/**
 * 회사코드를 검증하고, companyJoinRequests 승인 요청을 결정형 ID로 생성 및 users 테이블을 일괄 업데이트합니다.
 * 초대링크·직접 입력 모두 status는 pending으로만 생성되며 자동 승인되지 않습니다.
 */
export async function submitCompanyJoinRequest(
  db: Firestore,
  firebaseUser: User,
  payload: SubmitCompanyJoinRequestPayload
): Promise<SubmitResult> {
  const normalizedCode = payload.companyCode.trim().toUpperCase();
  const requestedDisplayName = payload.requestedDisplayName.trim();

  if (!normalizedCode) {
    return { success: false, message: "회사코드를 입력해 주십시오." };
  }
  if (!requestedDisplayName) {
    return { success: false, message: "성명을 입력해 주십시오." };
  }

  // 1단계: companyCodeLookups/{normalizedCode} 문서 조회
  let lookupSnap;
  try {
    const lookupRef = doc(db, "companyCodeLookups", normalizedCode);
    lookupSnap = await getDoc(lookupRef);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[디버그] 1단계: companyCodeLookups 조회 실패", err);
    return {
      success: false,
      message: `회사코드 조회 권한이 없습니다. (1단계 에러: ${message})`,
    };
  }

  if (!lookupSnap.exists()) {
    return { success: false, message: "유효하지 않은 회사 코드입니다. 회사 코드를 다시 확인해 주세요." };
  }

  const lookupData = lookupSnap.data();
  const { clientId, status, hasOwnerAdmin, companyName } = lookupData;

  if (status !== "active") {
    return { success: false, message: "유효하지 않은 회사 코드입니다. 회사 코드를 다시 확인해 주세요." };
  }

  // hasOwnerAdmin 존재 여부로 가입 신청 역할 분기
  const requestedRole: "company_admin" | "user" = !hasOwnerAdmin ? "company_admin" : "user";

  // 만약 company_admin 신청인 경우, 다른 pending 상태인 company_admin 요청이 있는지 조회하여 중복 방지
  if (requestedRole === "company_admin") {
    try {
      const q = query(
        collection(db, "companyJoinRequests"),
        where("clientId", "==", clientId),
        where("requestedRole", "==", "company_admin"),
        where("status", "==", "pending")
      );
      const pendingAdminSnaps = await getDocs(q);

      const otherPending = pendingAdminSnaps.docs.filter((docSnap) => docSnap.data().uid !== firebaseUser.uid);
      if (otherPending.length > 0) {
        return {
          success: false,
          message: "이미 이 회사에 대한 회사 관리자 승인 요청이 대기 중입니다. 완료될 때까지 기다려 주십시오.",
        };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[디버그] 중복 관리자 요청 조회 실패", err);
      return {
        success: false,
        message: `중복 가입요청 검사 중 오류가 발생했습니다. (에러: ${message})`,
      };
    }
  }

  // 2단계: 결정형 문서 ID 생성 및 중복 확인 조회
  const requestId = `${firebaseUser.uid}_${clientId}`;
  const requestRef = doc(db, "companyJoinRequests", requestId);
  let requestSnap;
  try {
    requestSnap = await getDoc(requestRef);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[디버그] 2단계: companyJoinRequests 중복 검사 조회 실패", err);
    return {
      success: false,
      message: `가입 요청 중복 확인 권한이 없습니다. (2단계 에러: ${message})`,
    };
  }

  if (requestSnap.exists() && requestSnap.data().status === "pending") {
    return {
      success: false,
      message:
        requestSnap.data().requestedRole === "company_admin"
          ? "이미 이 회사로의 회사 관리자 승인요청이 대기 중입니다."
          : "이미 이 회사로의 승인요청이 대기 중입니다.",
    };
  }

  const googleDisplayName = firebaseUser.displayName || "";
  const googleEmail = firebaseUser.email || "";

  // 3단계: 승인 요청 데이터 모델 정의
  const newRequest: CompanyJoinRequest = {
    requestId,
    uid: firebaseUser.uid,
    email: googleEmail,
    displayName: googleDisplayName,
    googleDisplayName,
    googleEmail,
    requestedDisplayName,
    source: payload.source,
    requestedCompanyCode: normalizedCode,
    clientId: clientId as ClientId,
    status: "pending",
    requestedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    rejectReason: null,
    requestedRole,
    companyCode: normalizedCode,
    companyName: companyName || "",
  };

  // 4단계: batch 처리를 통한 원자적(atomic) 쓰기 수행
  try {
    const userRef = doc(db, "users", firebaseUser.uid);
    const batch = writeBatch(db);

    batch.set(requestRef, newRequest);
    batch.update(userRef, {
      approvalStatus: "pending",
      clientId: clientId,
      role: "user",
      updatedAt: new Date().toISOString(),
    });

    await batch.commit();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[디버그] 4단계: batch commit(신청서 생성 및 user 업데이트) 실패", err);
    return {
      success: false,
      message: `승인 요청 제출 권한이 없습니다. (4단계 에러: ${message})`,
    };
  }

  return {
    success: true,
    requestedRole,
    clientId,
    companyCode: normalizedCode,
    companyName: companyName || "",
  };
}

/**
 * 대기 중인(pending) 가입 요청을 취소하고 유저 프로필 상태를 롤백합니다. (운영자 계정 방어 포함)
 */
export async function cancelCompanyJoinRequest(
  db: Firestore,
  uid: string,
  clientId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return { success: false, message: "사용자 정보를 찾을 수 없습니다." };
    }
    const userData = userSnap.data();
    if (userData.role === "operator") {
      return { success: false, message: "운영자 계정의 승인 상태는 취소할 수 없습니다." };
    }

    const requestId = `${uid}_${clientId}`;
    const requestRef = doc(db, "companyJoinRequests", requestId);
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists()) {
      return { success: false, message: "가입 요청을 찾을 수 없습니다." };
    }
    const requestData = requestSnap.data() as CompanyJoinRequest;
    if (requestData.status !== "pending") {
      return { success: false, message: "대기 중(pending) 상태의 가입 요청만 취소할 수 있습니다." };
    }

    const batch = writeBatch(db);
    batch.update(requestRef, {
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      cancelledBy: uid,
    });

    batch.update(userRef, {
      approvalStatus: "no_company",
      clientId: null,
      updatedAt: new Date().toISOString(),
    });

    await batch.commit();
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[companyJoinService] 가입 요청 취소 실패:", err);
    return { success: false, message: message || "가입 요청 취소 도중 에러가 발생했습니다." };
  }
}
