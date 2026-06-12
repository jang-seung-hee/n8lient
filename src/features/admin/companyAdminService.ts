// 이 파일은 회사 관리자가 사용자 가입 요청을 승인/거절하고 회사 사용자를 관리하기 위한 Firestore 서비스를 제공합니다.

import {
  doc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  writeBatch,
  Firestore,
} from "firebase/firestore";
import type { CompanyJoinRequest, UserDoc, ClientContract, ClientAutomation, WorkflowTemplate } from "@/types/n8lient";

/**
 * 회사 ID(clientId) 기준 승인 대기(pending) 상태의 가입 요청 목록을 조회합니다.
 */
export async function getPendingJoinRequests(
  db: Firestore,
  clientId: string
): Promise<CompanyJoinRequest[]> {
  try {
    const q = query(
      collection(db, "companyJoinRequests"),
      where("clientId", "==", clientId),
      where("status", "==", "pending")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as CompanyJoinRequest);
  } catch (error) {
    console.error("[companyAdminService] 대기 중인 가입요청 조회 실패:", error);
    throw error;
  }
}

/**
 * 특정 가입요청을 승인(approved) 처리합니다.
 * companyJoinRequests와 users 컬렉션을 writeBatch를 사용해 일괄 업데이트합니다.
 */
export async function approveJoinRequest(
  db: Firestore,
  requestId: string,
  adminUid: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const reqRef = doc(db, "companyJoinRequests", requestId);
    const reqSnap = await getDoc(reqRef);

    if (!reqSnap.exists()) {
      return { success: false, message: "존재하지 않는 가입요청 문서입니다." };
    }

    const reqData = reqSnap.data() as CompanyJoinRequest;
    if (reqData.status !== "pending") {
      return { success: false, message: "이미 처리 완료된 요청입니다." };
    }

    const batch = writeBatch(db);
    
    // 1. 가입요청 문서 상태 변경 및 심사 정보 업데이트
    batch.update(reqRef, {
      status: "approved",
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminUid,
    });

    // 2. 해당 사용자 문서의 승인 상태를 approved로 업데이트
    const userRef = doc(db, "users", reqData.uid);
    batch.update(userRef, {
      approvalStatus: "approved",
      updatedAt: new Date().toISOString(),
    });

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("[companyAdminService] 가입요청 승인 실패:", error);
    return { success: false, message: error.message || "승인 처리 도중 오류가 발생했습니다." };
  }
}

/**
 * 특정 가입요청을 거절(rejected) 처리합니다.
 * companyJoinRequests와 users 컬렉션을 writeBatch를 사용해 일괄 업데이트합니다.
 */
export async function rejectJoinRequest(
  db: Firestore,
  requestId: string,
  adminUid: string,
  rejectReason: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const reqRef = doc(db, "companyJoinRequests", requestId);
    const reqSnap = await getDoc(reqRef);

    if (!reqSnap.exists()) {
      return { success: false, message: "존재하지 않는 가입요청 문서입니다." };
    }

    const reqData = reqSnap.data() as CompanyJoinRequest;
    if (reqData.status !== "pending") {
      return { success: false, message: "이미 처리 완료된 요청입니다." };
    }

    const batch = writeBatch(db);
    
    // 1. 가입요청 문서 상태 거절 및 심사 정보 업데이트
    batch.update(reqRef, {
      status: "rejected",
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminUid,
      rejectReason: rejectReason || "사유 없음",
    });

    // 2. 해당 사용자 문서의 승인 상태를 rejected로 업데이트하고 clientId를 초기화(null)합니다.
    const userRef = doc(db, "users", reqData.uid);
    batch.update(userRef, {
      approvalStatus: "rejected",
      clientId: null,
      updatedAt: new Date().toISOString(),
    });

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("[companyAdminService] 가입요청 거절 실패:", error);
    return { success: false, message: error.message || "거절 처리 도중 오류가 발생했습니다." };
  }
}

/**
 * 회사 ID(clientId) 기준 가입되어 승인 완료된 사용자 목록을 조회합니다.
 */
export async function getCompanyUsers(
  db: Firestore,
  clientId: string
): Promise<UserDoc[]> {
  try {
    const q = query(
      collection(db, "users"),
      where("clientId", "==", clientId),
      where("approvalStatus", "==", "approved")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as UserDoc);
  } catch (error) {
    console.error("[companyAdminService] 회사 사용자 목록 조회 실패:", error);
    throw error;
  }
}

/**
 * 특정 고객사(clientId)가 계약한 자동화 계약 내역(clientContracts) 목록을 조회합니다.
 */
export async function getCompanyContracts(
  db: Firestore,
  clientId: string
): Promise<ClientContract[]> {
  try {
    const q = query(
      collection(db, "clientContracts"),
      where("clientId", "==", clientId),
      where("enabled", "==", true)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ClientContract);
  } catch (error) {
    console.error("[companyAdminService] 회사 계약 목록 조회 실패:", error);
    throw error;
  }
}

/**
 * 특정 고객사(clientId)의 이미 등록된 자동화 설정(clientAutomations) 목록을 조회합니다.
 */
export async function getCompanyAutomations(
  db: Firestore,
  clientId: string
): Promise<ClientAutomation[]> {
  try {
    const q = query(
      collection(db, "clientAutomations"),
      where("clientId", "==", clientId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ClientAutomation);
  } catch (error) {
    console.error("[companyAdminService] 회사 자동화 설정 목록 조회 실패:", error);
    throw error;
  }
}

/**
 * 회사 관리자가 계약한 자동화의 상세 설정값을 저장(등록/수정)합니다.
 * 저장 시 런타임에서 configSchema의 required key들이 누락되지 않았는지 검증합니다.
 */
export async function saveClientAutomation(
  db: Firestore,
  params: {
    clientId: string;
    workflowKey: string;
    automationName: string;
    enabled: boolean;
    settings: Record<string, string | number | boolean>;
    adminUid: string;
    template: WorkflowTemplate;
    retentionPolicy?: any; // [v2.5]
  }): Promise<{ success: boolean; message?: string }> {
  try {
    const { clientId, workflowKey, automationName, enabled, settings, adminUid, template, retentionPolicy } = params;

    // 1. 런타임 필수 설정 키 검증 (configSchema.key 기준)
    for (const field of template.configSchema) {
      if (field.required) {
        const value = settings[field.key];
        if (value === undefined || value === null || String(value).trim() === "") {
          return {
            success: false,
            message: `필수 설정 항목인 [${field.label}](${field.key})이(가) 입력되지 않았습니다.`,
          };
        }
      }
    }

    // 2. configSchema.key 이외의 잘못된 키가 유입되었는지 또는 모든 설정의 key 매핑 검증
    const schemaKeys = new Set(template.configSchema.map((f) => f.key));
    for (const key of Object.keys(settings)) {
      if (!schemaKeys.has(key)) {
        return {
          success: false,
          message: `설정 스키마에 정의되지 않은 잘못된 설정 키(${key})가 포함되어 있습니다.`,
        };
      }
    }

    // 3. automationId 생성 포맷: {clientId}_{workflowKey}
    const automationId = `${clientId}_${workflowKey}`;
    const docRef = doc(db, "clientAutomations", automationId);

    const clientAutomation: ClientAutomation = {
      automationId,
      clientId,
      workflowKey,
      automationName,
      enabled,
      configStatus: "configured", // 설정 완료 상태
      configSchemaVersion: template.configSchemaVersion || 1,
      settings,
      retentionPolicy: retentionPolicy || null,
      createdBy: adminUid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(docRef, clientAutomation);
    return { success: true };
  } catch (error: any) {
    console.error("[companyAdminService] 자동화 설정 저장 실패:", error);
    return { success: false, message: error.message || "설정 저장 도중 오류가 발생했습니다." };
  }
}

