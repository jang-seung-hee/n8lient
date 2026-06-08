// 이 파일은 시스템 운영자가 공용 자동화 템플릿 및 회사별 계약을 관리하기 위한 Firestore 서비스를 제공합니다.

import {
  collection,
  query,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  where,
  limit,
  Firestore,
} from "firebase/firestore";
import type { WorkflowTemplate, ClientContract, ClientDoc, UserDoc } from "@/types/n8lient";

/**
 * 시스템 전체에 등록된 공용 자동화 템플릿 목록을 조회합니다.
 */
export async function getWorkflowTemplates(db: Firestore): Promise<WorkflowTemplate[]> {
  try {
    const q = query(collection(db, "workflowTemplates"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as WorkflowTemplate);
  } catch (error) {
    console.error("[operatorService] 자동화 템플릿 목록 조회 실패:", error);
    throw error;
  }
}

/**
 * 신규 자동화 템플릿을 등록(저장)합니다. (운영자 권한 필요)
 * 1번 조건 검증: workflowKey 포맷 및 Firestore 중복 체크
 */
export async function createWorkflowTemplate(
  db: Firestore,
  template: WorkflowTemplate
): Promise<{ success: boolean; message?: string }> {
  try {
    const { workflowKey } = template;
    
    // 1. workflowKey 정규식 검증: 영문 소문자, 숫자, 하이픈만 허용
    const keyRegex = /^[a-z0-9-]+$/;
    if (!keyRegex.test(workflowKey)) {
      return {
        success: false,
        message: "자동화 Key는 영문 소문자, 숫자, 하이픈(-)만 포함할 수 있습니다.",
      };
    }

    // 2. 이미 존재하는 중복 키 체크
    const docRef = doc(db, "workflowTemplates", workflowKey);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        success: false,
        message: `이미 존재하거나 등록된 자동화 Key(${workflowKey})입니다. 중복 등록할 수 없습니다.`,
      };
    }

    await setDoc(docRef, template);
    return { success: true };
  } catch (error: any) {
    console.error("[operatorService] 자동화 템플릿 생성 실패:", error);
    return { success: false, message: error.message || "템플릿 등록 중 오류가 발생했습니다." };
  }
}

/**
 * 전체 고객사의 계약 자동화 목록을 조회합니다.
 */
export async function getClientContracts(db: Firestore): Promise<ClientContract[]> {
  try {
    const q = query(collection(db, "clientContracts"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ClientContract);
  } catch (error) {
    console.error("[operatorService] 계약 목록 조회 실패:", error);
    throw error;
  }
}

/**
 * 시스템에 등록된 전체 회사(clients) 목록을 조회합니다. (운영자 전용)
 */
export async function getClientsList(db: Firestore): Promise<ClientDoc[]> {
  try {
    const q = query(collection(db, "clients"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ClientDoc);
  } catch (error) {
    console.error("[operatorService] 회사 목록 조회 실패:", error);
    throw error;
  }
}

/**
 * 특정 회사에 자동화 계약을 직접 배정합니다.
 * 3번 조건 검증: {clientId}_{workflowKey} 포맷 중복 가이드
 */
export async function createClientContract(
  db: Firestore,
  contract: ClientContract
): Promise<{ success: boolean; message?: string }> {
  try {
    const contractId = `${contract.clientId}_${contract.workflowKey}`;
    
    // 중복 배정 확인
    const docRef = doc(db, "clientContracts", contractId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        success: false,
        message: `이미 해당 회사(${contract.clientId})에 해당 자동화(${contract.workflowKey}) 계약이 배정되어 있습니다. 중복 배정할 수 없습니다.`,
      };
    }

    await setDoc(docRef, {
      ...contract,
      contractId,
    });
    return { success: true };
  } catch (error: any) {
    console.error("[operatorService] 계약 배정 실패:", error);
    return { success: false, message: error.message || "계약 배정 도중 오류가 발생했습니다." };
  }
}

/**
 * 기존 자동화 템플릿의 속성을 수정(업데이트)합니다. (운영자 권한 필요)
 */
export async function updateWorkflowTemplate(
  db: Firestore,
  workflowKey: string,
  data: Partial<WorkflowTemplate>
): Promise<{ success: boolean; message?: string }> {
  try {
    const docRef = doc(db, "workflowTemplates", workflowKey);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error: any) {
    console.error("[operatorService] 자동화 템플릿 수정 실패:", error);
    return { success: false, message: error.message || "템플릿 수정 중 오류가 발생했습니다." };
  }
}

/**
 * 신규 고객사(Client)를 등록합니다. (writeBatch를 통한 원자적 동시 등록)
 * clients/{clientId} 와 companyCodeLookups/{normalizedCode} 중복 여부를 사전 체크합니다.
 */
export async function createClient(
  db: Firestore,
  client: ClientDoc
): Promise<{ success: boolean; message?: string }> {
  try {
    const normalizedCode = client.companyCode.trim().toUpperCase();
    if (!normalizedCode) {
      return { success: false, message: "회사코드가 유효하지 않습니다." };
    }

    // 1. clients/{clientId} 중복 검사
    const clientRef = doc(db, "clients", client.clientId);
    const clientSnap = await getDoc(clientRef);
    if (clientSnap.exists()) {
      return {
        success: false,
        message: `이미 존재하는 고객사 ID(${client.clientId})입니다.`,
      };
    }

    // 2. companyCodeLookups/{companyCode} 중복 검사
    const lookupRef = doc(db, "companyCodeLookups", normalizedCode);
    const lookupSnap = await getDoc(lookupRef);
    if (lookupSnap.exists()) {
      return {
        success: false,
        message: `이미 사용 중인 회사코드(${normalizedCode})입니다. 다른 코드를 사용해 주십시오.`,
      };
    }

    // 3. batch를 통한 원자적 생성
    const { writeBatch } = await import("firebase/firestore");
    const batch = writeBatch(db);

    const clientData: ClientDoc = {
      ...client,
      companyCode: normalizedCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    batch.set(clientRef, clientData);

    // companyJoinService 규격에 맞춰 status 필드 포함
    batch.set(lookupRef, {
      clientId: client.clientId,
      status: client.status === "active" ? "active" : "disabled", // active 일 때만 가입 신청이 가능함
    });

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("[operatorService] 고객사 등록 실패:", error);
    return { success: false, message: error.message || "고객사 등록 중 오류가 발생했습니다." };
  }
}

/**
 * 기존 고객사(Client) 정보를 수정합니다. (허용된 필드만 수정하도록 강력 제한)
 */
export async function updateClient(
  db: Firestore,
  clientId: string,
  companyCode: string,
  data: Partial<ClientDoc>
): Promise<{ success: boolean; message?: string }> {
  try {
    const docRef = doc(db, "clients", clientId);
    const normalizedCode = companyCode.trim().toUpperCase();

    // 수정 가능한 필드만 엄격히 격리 (clientId, companyCode 수정 차단)
    const allowedData = {
      companyName: data.companyName,
      status: data.status,
      ownerAdminUid: data.ownerAdminUid,
      defaultTimezone: data.defaultTimezone,
      defaultReportEmail: data.defaultReportEmail,
      defaultDriveRootFolderId: data.defaultDriveRootFolderId,
      updatedAt: new Date().toISOString(),
    };

    // batch를 통한 clients와 companyCodeLookups 동시 수정
    const { writeBatch } = await import("firebase/firestore");
    const batch = writeBatch(db);

    batch.update(docRef, allowedData);

    if (normalizedCode) {
      const lookupRef = doc(db, "companyCodeLookups", normalizedCode);
      // 문서가 아직 존재하지 않는 경우 batch.update는 Missing or insufficient permissions 에러를 유발합니다.
      // 따라서 안전하게 set(merge: true)을 활용해 문서의 신규 생성/부분 업데이트를 모두 지원합니다.
      batch.set(
        lookupRef,
        {
          clientId: clientId,
          status: data.status === "active" ? "active" : "disabled",
        },
        { merge: true }
      );
    }

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("[operatorService] 고객사 정보 수정 실패:", error);
    return { success: false, message: error.message || "고객사 정보 수정 중 오류가 발생했습니다." };
  }
}

/**
 * 이메일 주소로 users 컬렉션에서 사용자를 조회합니다.
 * 이메일은 소문자 정규화 기준으로 비교하며, 운영자 전용 기능입니다.
 * @returns 조회 성공 시 uid, displayName, email 반환. 없으면 null.
 */
export async function findUserByEmail(
  db: Firestore,
  email: string
): Promise<Pick<UserDoc, "uid" | "displayName" | "email"> | null> {
  try {
    // 이메일 소문자 정규화: 대소문자 불일치로 인한 조회 실패 방지
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return null;

    const q = query(
      collection(db, "users"),
      where("email", "==", normalizedEmail),
      limit(1)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      return null;
    }

    const data = snap.docs[0].data() as UserDoc;
    return {
      uid: data.uid,
      displayName: data.displayName,
      email: data.email,
    };
  } catch (error: any) {
    console.error("[operatorService] 이메일로 사용자 조회 실패:", error);
    throw error;
  }
}

