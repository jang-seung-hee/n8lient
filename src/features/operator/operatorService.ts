// 이 파일은 시스템 운영자가 공용 자동화 템플릿 및 회사별 계약을 관리하기 위한 Firestore 서비스를 제공합니다.

import {
  collection,
  query,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  Firestore,
} from "firebase/firestore";
import type { WorkflowTemplate, ClientContract, ClientDoc } from "@/types/n8lient";

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
