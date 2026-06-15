// 이 파일은 회사 관리자(company_admin) 최초 승인 및 제거를 처리하는 서비스를 제공합니다.
// 한국어 주석 표준을 준수합니다.

import {
  doc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
  Firestore,
} from "firebase/firestore";
import type { CompanyJoinRequest, ClientDoc, UserDoc } from "@/types/n8lient";

interface ServiceResult {
  success: boolean;
  message?: string;
}

/**
 * 특정 회사의 pending 상태인 회사 관리자 가입 요청 목록을 조회합니다.
 */
export async function getPendingAdminJoinRequests(
  db: Firestore,
  clientId: string
): Promise<CompanyJoinRequest[]> {
  try {
    const q = query(
      collection(db, "companyJoinRequests"),
      where("clientId", "==", clientId),
      where("requestedRole", "==", "company_admin"),
      where("status", "==", "pending")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as CompanyJoinRequest);
  } catch (error) {
    console.error("[adminBootstrapService] 회사 관리자 가입 요청 목록 조회 실패:", error);
    throw error;
  }
}

/**
 * 회사 관리자(company_admin) 요청을 승인합니다. (transaction 적용)
 * 승인 직전에 clients.ownerAdminUid가 여전히 null인지 확인하여 1회사 1관리자 정책을 강제합니다.
 */
export async function approveCompanyAdminRequest(
  db: Firestore,
  requestId: string,
  operatorUid: string
): Promise<ServiceResult> {
  try {
    const result = await runTransaction(db, async (transaction) => {
      // 1. 가입 요청 문서 읽기
      const requestRef = doc(db, "companyJoinRequests", requestId);
      const requestSnap = await transaction.get(requestRef);
      if (!requestSnap.exists()) {
        throw new Error("존재하지 않는 가입 요청입니다.");
      }

      const requestData = requestSnap.data() as CompanyJoinRequest;
      if (requestData.status !== "pending") {
        throw new Error(`이미 처리된 요청입니다. (현재 상태: ${requestData.status})`);
      }
      if (requestData.requestedRole !== "company_admin") {
        throw new Error("회사 관리자 가입 요청이 아닙니다.");
      }

      const { clientId, uid: userUid, email, displayName } = requestData;

      // 2. 회사 문서 읽기 및 ownerAdminUid null 재확인 (핵심 안전장치)
      const clientRef = doc(db, "clients", clientId);
      const clientSnap = await transaction.get(clientRef);
      if (!clientSnap.exists()) {
        throw new Error("존재하지 않는 고객사입니다.");
      }

      const clientData = clientSnap.data() as ClientDoc;
      if (clientData.ownerAdminUid) {
        throw new Error("이 회사에는 이미 등록된 회사 관리자가 존재합니다. (1회사 1관리자 제한)");
      }

      // 3. 사용자 문서 읽기
      const userRef = doc(db, "users", userUid);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) {
        throw new Error("사용자 정보를 찾을 수 없습니다.");
      }

      const userData = userSnap.data() as UserDoc;
      // 이미 다른 회사의 approved 소속인지 확인
      if (userData.clientId && userData.clientId !== clientId && userData.approvalStatus === "approved") {
        throw new Error(`사용자가 이미 다른 회사(${userData.clientId})의 승인된 소속입니다.`);
      }

      // 4. 트랜잭션 내 일괄 업데이트 실행
      const now = new Date().toISOString();

      // clients 업데이트
      transaction.update(clientRef, {
        ownerAdminUid: userUid,
        ownerAdminEmail: email || "",
        ownerAdminDisplayName: displayName || "",
        adminBootstrapStatus: "completed",
        updatedAt: now,
      });

      // users 업데이트
      transaction.update(userRef, {
        role: "company_admin",
        clientId: clientId,
        approvalStatus: "approved",
        updatedAt: now,
      });

      // companyJoinRequests 업데이트
      transaction.update(requestRef, {
        status: "approved",
        reviewedAt: now,
        reviewedBy: operatorUid,
      });

      // companyCodeLookups 업데이트
      const targetCompanyCode = requestData.companyCode || requestData.requestedCompanyCode || clientData.companyCode;
      if (targetCompanyCode) {
        const lookupRef = doc(db, "companyCodeLookups", targetCompanyCode.trim().toUpperCase());
        transaction.update(lookupRef, {
          hasOwnerAdmin: true,
          adminBootstrapStatus: "completed",
        });
      }

      return { success: true };
    });

    return result;
  } catch (error: any) {
    console.error("[adminBootstrapService] 회사 관리자 승인 실패:", error);
    return { success: false, message: error.message || "회사 관리자 승인 처리 중 오류가 발생했습니다." };
  }
}

/**
 * 등록된 회사 관리자(company_admin)를 제거합니다. (transaction 적용)
 * 제거된 회사 관리자는 일반 사용자(user)로 역할이 강등됩니다.
 */
export async function removeCompanyAdmin(
  db: Firestore,
  clientId: string,
  operatorUid: string
): Promise<ServiceResult> {
  try {
    const result = await runTransaction(db, async (transaction) => {
      // 1. 회사 문서 읽기
      const clientRef = doc(db, "clients", clientId);
      const clientSnap = await transaction.get(clientRef);
      if (!clientSnap.exists()) {
        throw new Error("존재하지 않는 고객사입니다.");
      }

      const clientData = clientSnap.data() as ClientDoc;
      const ownerAdminUid = clientData.ownerAdminUid;

      if (!ownerAdminUid) {
        throw new Error("이 회사에는 제거할 회사 관리자가 등록되어 있지 않습니다.");
      }

      // 2. 사용자 문서 읽기
      const userRef = doc(db, "users", ownerAdminUid);
      const userSnap = await transaction.get(userRef);
      const userExists = userSnap.exists();

      // 3. 트랜잭션 내 일괄 업데이트 실행
      const now = new Date().toISOString();

      // clients 관리자 정보 제거
      transaction.update(clientRef, {
        ownerAdminUid: null,
        ownerAdminEmail: "",
        ownerAdminDisplayName: "",
        adminBootstrapStatus: "pending",
        updatedAt: now,
      });

      // 사용자 문서가 존재하는 경우 역할 강등 (역할을 user로 변경하고 소속 및 승인 상태는 유지)
      if (userExists) {
        transaction.update(userRef, {
          role: "user",
          updatedAt: now,
        });
      }

      // companyCodeLookups 업데이트
      if (clientData.companyCode) {
        const lookupRef = doc(db, "companyCodeLookups", clientData.companyCode.trim().toUpperCase());
        transaction.update(lookupRef, {
          hasOwnerAdmin: false,
          adminBootstrapStatus: "pending",
        });
      }

      return { success: true };
    });

    return result;
  } catch (error: any) {
    console.error("[adminBootstrapService] 회사 관리자 제거 실패:", error);
    return { success: false, message: error.message || "회사 관리자 제거 처리 중 오류가 발생했습니다." };
  }
}
