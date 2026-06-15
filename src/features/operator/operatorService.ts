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
  getCountFromServer,
} from "firebase/firestore";
import type { WorkflowTemplate, ClientContract, ClientDoc, UserDoc, WorkflowTemplateUsageSummary } from "@/types/n8lient";

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

    // contractMode가 이미 존재하는 경우 보존 처리, 신규이거나 없는 경우에만 자동 주입
    let contractMode = contract.contractMode;
    let isTestContract = contract.isTestContract;
    let templateStatusAtContract = contract.templateStatusAtContract;

    if (!contractMode) {
      const templateRef = doc(db, "workflowTemplates", contract.workflowKey);
      const templateSnap = await getDoc(templateRef);
      if (templateSnap.exists()) {
        const templateData = templateSnap.data();
        const status = templateData?.status || "published";
        if (status === "draft") {
          contractMode = "test";
          isTestContract = true;
          templateStatusAtContract = "draft";
        } else {
          contractMode = "production";
          isTestContract = false;
          templateStatusAtContract = "published";
        }
      } else {
        contractMode = "production";
        isTestContract = false;
        templateStatusAtContract = "published";
      }
    }

    await setDoc(docRef, {
      ...contract,
      contractId,
      contractMode,
      isTestContract,
      templateStatusAtContract,
    });
    return { success: true };
  } catch (error: any) {
    console.error("[operatorService] 계약 배정 실패:", error);
    return { success: false, message: error.message || "계약 배정 도중 오류가 발생했습니다." };
  }
}

/**
 * 워크플로우 템플릿의 사용 정보 요약(참조 현황)을 조회합니다.
 * Firestore 단일 색인 조건(workflowKey)으로 가져온 후 메모리 상에서 분류하여 복합 색인 오류를 완벽 차단하고 하위 호환성을 처리합니다.
 * - 한국어 주석 표준을 준수합니다.
 */
export async function getWorkflowTemplateUsageSummary(
  db: Firestore,
  workflowKey: string,
  templateStatus?: string
): Promise<WorkflowTemplateUsageSummary> {
  try {
    // 템플릿 상태 재확인 (하위 호환 및 폴백 기준)
    let status = templateStatus;
    if (!status) {
      const templateSnap = await getDoc(doc(db, "workflowTemplates", workflowKey));
      status = templateSnap.exists() ? (templateSnap.data()?.status || "draft") : "draft";
    }

    const contractsQuery = query(collection(db, "clientContracts"), where("workflowKey", "==", workflowKey));
    const automationsQuery = query(collection(db, "clientAutomations"), where("workflowKey", "==", workflowKey));
    const submissionsQuery = query(collection(db, "submissions"), where("workflowKey", "==", workflowKey));
    const userSettingsQuery = query(collection(db, "userAutomationSettings"), where("workflowKey", "==", workflowKey));

    const [contractsSnap, automationsSnap, submissionsSnap, userSettingsSnap] = await Promise.all([
      getDocs(contractsQuery),
      getDocs(automationsQuery),
      getDocs(submissionsQuery),
      getDocs(userSettingsQuery),
    ]);

    const clientContractCount = contractsSnap.size;
    const clientAutomationCount = automationsSnap.size;
    const submissionCount = submissionsSnap.size;
    const userSettingCount = userSettingsSnap.size;

    // 상세 분류 카운트 초기화
    let productionClientContractCount = 0;
    let testClientContractCount = 0;
    let productionClientAutomationCount = 0;
    let testClientAutomationCount = 0;
    let productionSubmissionCount = 0;
    let testSubmissionCount = 0;
    let productionUserSettingCount = 0;
    let testUserSettingCount = 0;

    // 1. clientContracts 분류
    contractsSnap.forEach((d) => {
      const data = d.data();
      const contractMode = data.contractMode;
      const isTestContract = data.isTestContract;
      const templateStatusAtContract = data.templateStatusAtContract;

      const isTest =
        contractMode === "test" ||
        isTestContract === true ||
        templateStatusAtContract === "draft" ||
        (contractMode === undefined && isTestContract === undefined && templateStatusAtContract === undefined && status === "draft");

      if (isTest) {
        testClientContractCount++;
      } else {
        productionClientContractCount++;
      }
    });

    const hasClientContracts = clientContractCount > 0;

    // 2. clientAutomations 분류
    automationsSnap.forEach((d) => {
      const data = d.data();
      const deploymentMode = data.deploymentMode;
      const templateStatusAtBinding = data.templateStatusAtBinding;

      // 구분 필드가 있는 경우 우선 적용, 없는 경우 하위 호환 (현재 템플릿 상태 기준)
      const isTest =
        deploymentMode === "test" ||
        templateStatusAtBinding === "draft" ||
        (deploymentMode === undefined && templateStatusAtBinding === undefined && status === "draft");

      if (isTest) {
        testClientAutomationCount++;
      } else {
        productionClientAutomationCount++;
      }
    });

    // 3. submissions 분류
    submissionsSnap.forEach((d) => {
      const data = d.data();
      const isTestExecution = data.isTestExecution;
      const templateStatusAtExecution = data.templateStatusAtExecution;

      // 구분 필드가 있는 경우 우선 적용, 없는 경우 하위 호환 (현재 템플릿 상태 기준)
      const isTest =
        isTestExecution === true ||
        templateStatusAtExecution === "draft" ||
        (isTestExecution === undefined && templateStatusAtExecution === undefined && status === "draft");

      if (isTest) {
        testSubmissionCount++;
      } else {
        productionSubmissionCount++;
      }
    });

    // 4. userAutomationSettings 분류
    userSettingsSnap.forEach((d) => {
      const data = d.data();
      const isTestSetting = data.isTestSetting;
      const templateStatusAtSetting = data.templateStatusAtSetting;

      // 구분 필드가 있는 경우 우선 적용, 없는 경우 하위 호환 (현재 템플릿 상태 기준)
      const isTest =
        isTestSetting === true ||
        templateStatusAtSetting === "draft" ||
        (isTestSetting === undefined && templateStatusAtSetting === undefined && status === "draft");

      if (isTest) {
        testUserSettingCount++;
      } else {
        productionUserSettingCount++;
      }
    });

    // 운영 참조 존재 여부 판단 (오직 production 계약 정보만 포함)
    const hasProductionReferences =
      productionClientContractCount > 0 ||
      productionClientAutomationCount > 0 ||
      productionSubmissionCount > 0 ||
      productionUserSettingCount > 0;

    // 테스트 참조 존재 여부 판단
    const hasTestReferences =
      testClientContractCount > 0 ||
      testClientAutomationCount > 0 ||
      testSubmissionCount > 0 ||
      testUserSettingCount > 0;

    // isReferenced는 운영 참조 기준으로만 계산하여 테스트 참조만 있을 시 자유 수정을 허용
    const isReferenced = hasProductionReferences;

    return {
      isReferenced,
      hasProductionReferences,
      hasTestReferences,
      hasClientContracts,
      hasClientAutomations: clientAutomationCount > 0,
      hasSubmissions: submissionCount > 0,
      hasUserSettings: userSettingCount > 0,

      productionClientContractCount,
      testClientContractCount,
      productionClientAutomationCount,
      productionSubmissionCount,
      productionUserSettingCount,

      testClientAutomationCount,
      testSubmissionCount,
      testUserSettingCount,

      clientContractCount,
      clientAutomationCount,
      submissionCount,
      userSettingCount,
    };
  } catch (error) {
    console.error("[operatorService] 워크플로우 사용 요약 조회 실패:", error);
    throw error;
  }
}

/**
 * 기존 자동화 템플릿의 속성을 수정(업데이트)합니다. (운영자 권한 필요)
 * 저장 전 원본 문서를 조회하여 제한 수정 조건(isStructureLocked)인 경우 위험 필드의 변경을 차단합니다.
 */
export async function updateWorkflowTemplate(
  db: Firestore,
  workflowKey: string,
  data: Partial<WorkflowTemplate>
): Promise<{ success: boolean; message?: string }> {
  try {
    // 1. 기존 원본 템플릿 로드
    const docRef = doc(db, "workflowTemplates", workflowKey);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return { success: false, message: "수정하려는 워크플로우 템플릿이 존재하지 않습니다." };
    }
    const original = docSnap.data() as WorkflowTemplate;

    // 2. 사용 요약 정보 조회
    const usageSummary = await getWorkflowTemplateUsageSummary(db, workflowKey);

    // 3. 구조적 잠금(isStructureLocked) 여부 판단 (테스트 참조 제외, 운영 참조 존재 시에만 락)
    const isStructureLocked = original.status === "published" || usageSummary.hasProductionReferences;

    if (isStructureLocked) {
      const errorSuffix = "\n“이 워크플로우 마스터는 이미 회사 매핑 또는 실행 이력이 있어 식별/구조 필드를 수정할 수 없습니다. 구조 변경이 필요하면 복제하여 새 workflowKey로 등록하세요.”";

      // 3.1. 식별/연동 필드 변경 검증
      if (data.workflowKey !== undefined && data.workflowKey !== original.workflowKey) {
        throw new Error(`workflowKey 필드는 수정이 불가능합니다.${errorSuffix}`);
      }
      if (data.webhookSecretId !== undefined && data.webhookSecretId !== original.webhookSecretId) {
        throw new Error(`webhookSecretId 필드는 수정이 불가능합니다.${errorSuffix}`);
      }
      if (data.n8nServerKey !== undefined && data.n8nServerKey !== original.n8nServerKey) {
        throw new Error(`n8nServerKey 필드는 수정이 불가능합니다.${errorSuffix}`);
      }
      if (data.version !== undefined && data.version !== original.version) {
        throw new Error(`version 필드는 수정이 불가능합니다.${errorSuffix}`);
      }

      // 3.2. inputSchema 변경 검증
      if (data.inputSchema !== undefined) {
        const origIn = original.inputSchema || {};
        const newIn = data.inputSchema || {};
        const titleDiff = newIn.titleRequired !== origIn.titleRequired;
        const sizeDiff = newIn.maxFileSizeMB !== origIn.maxFileSizeMB;

        const origTypes = [...(origIn.acceptedInputTypes || [])].sort().join(",");
        const newTypes = [...(newIn.acceptedInputTypes || [])].sort().join(",");
        const typesDiff = origTypes !== newTypes;

        const origExts = [...(origIn.allowedFileTypes || [])].sort().join(",");
        const newExts = [...(newIn.allowedFileTypes || [])].sort().join(",");
        const extsDiff = origExts !== newExts;

        if (titleDiff || sizeDiff || typesDiff || extsDiff) {
          throw new Error(`inputSchema(입력 요구사항) 관련 필드는 수정이 불가능합니다.${errorSuffix}`);
        }
      }

      // 3.3. retention 정책 변경 검증
      if (data.retentionCapabilities !== undefined) {
        const origCap = original.retentionCapabilities || ({} as any);
        const newCap = data.retentionCapabilities || ({} as any);
        if (
          newCap.maxLevel !== origCap.maxLevel ||
          newCap.defaultLevel !== origCap.defaultLevel ||
          JSON.stringify([...(newCap.supportedLevels || [])].sort()) !== JSON.stringify([...(origCap.supportedLevels || [])].sort()) ||
          newCap.supportsProcessorResult !== origCap.supportsProcessorResult ||
          newCap.supportsOriginalFileRefs !== origCap.supportsOriginalFileRefs ||
          newCap.supportsResultRefs !== origCap.supportsResultRefs ||
          newCap.supportsEmailNotification !== origCap.supportsEmailNotification ||
          newCap.supportsResultPolicyRouter !== origCap.supportsResultPolicyRouter
        ) {
          throw new Error(`retentionCapabilities(보관 지원 범위)는 수정이 불가능합니다.${errorSuffix}`);
        }
      }
      if (data.operatorRetentionPolicy !== undefined) {
        const origOp = original.operatorRetentionPolicy || ({} as any);
        const newOp = data.operatorRetentionPolicy || ({} as any);
        if (
          newOp.defaultLevel !== origOp.defaultLevel ||
          JSON.stringify([...(newOp.allowedLevels || [])].sort()) !== JSON.stringify([...(origOp.allowedLevels || [])].sort()) ||
          newOp.allowCompanyOverride !== origOp.allowCompanyOverride ||
          newOp.allowUserOverride !== origOp.allowUserOverride
        ) {
          throw new Error(`operatorRetentionPolicy(오퍼레이터 보관 정책)는 수정이 불가능합니다.${errorSuffix}`);
        }
      }

      // 3.4. configSchema 구조 필드 변경 검증
      if (data.configSchema !== undefined) {
        const origFields = original.configSchema || [];
        const newFields = data.configSchema || [];

        // key 목록 대조 (추가/삭제/key명 변경 금지)
        const origKeys = origFields.map(f => f.key).filter(Boolean);
        const newKeys = newFields.map(f => f.key).filter(Boolean);

        const origKeySet = new Set(origKeys);
        const newKeySet = new Set(newKeys);

        if (origKeys.length !== newKeys.length || origKeySet.size !== newKeySet.size || [...origKeySet].some(k => !newKeySet.has(k))) {
          throw new Error(`configSchema 설정 필드의 추가, 삭제 또는 Key 변경은 허용되지 않습니다.${errorSuffix}`);
        }

        // 개별 필드 속성(type, required, defaultSource, options) 변경 검사
        const origMap = new Map(origFields.map(f => [f.key, f]));
        for (const newField of newFields) {
          const origField = origMap.get(newField.key);
          if (!origField) continue;

          if (newField.type !== origField.type) {
            throw new Error(`configSchema 필드 '${newField.key}'의 인풋 타입(type) 변경은 허용되지 않습니다.${errorSuffix}`);
          }
          if (newField.required !== origField.required) {
            throw new Error(`configSchema 필드 '${newField.key}'의 필수 여부(required) 변경은 허용되지 않습니다.${errorSuffix}`);
          }
          if (newField.defaultValueSource !== origField.defaultValueSource) {
            throw new Error(`configSchema 필드 '${newField.key}'의 기본값 출처(defaultValueSource) 변경은 허용되지 않습니다.${errorSuffix}`);
          }

          const origOpts = (origField.options || []).join(",");
          const newOpts = (newField.options || []).join(",");
          if (origOpts !== newOpts) {
            throw new Error(`configSchema 필드 '${newField.key}'의 선택 항목(options) 변경은 허용되지 않습니다.${errorSuffix}`);
          }
        }
      }
    }

    // 검증 통과 시 업데이트 실행
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
 * draft 상태인 임시 워크플로우 템플릿과 해당 템플릿의 테스트 참조 데이터를 일괄 삭제합니다.
 * 운영 참조가 단 하나라도 존재하면 삭제가 즉각 차단됩니다. (clientContracts는 절대 삭제하지 않음)
 */
export async function deleteDraftWorkflowTemplate(
  db: Firestore,
  workflowKey: string
): Promise<{ success: boolean; message?: string }> {
  try {
    // 1. 원본 템플릿 문서 재조회
    const docRef = doc(db, "workflowTemplates", workflowKey);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return { success: false, message: "삭제하려는 워크플로우 템플릿이 존재하지 않습니다." };
    }
    const template = docSnap.data() as WorkflowTemplate;

    // 2. status === "draft" 검증
    if (template.status !== "draft") {
      return { success: false, message: "배포된(published/disabled) 템플릿은 삭제할 수 없습니다. Draft 상태만 삭제 가능합니다." };
    }

    // 3. 사용 요약 정보(운영 참조 존재 유무) 재조회
    const usageSummary = await getWorkflowTemplateUsageSummary(db, workflowKey, template.status);
    if (usageSummary.hasProductionReferences || usageSummary.productionClientContractCount > 0) {
      return { success: false, message: "운영 참조가 존재하여 이 워크플로우를 삭제할 수 없습니다. (운영 계약 또는 배포/실행 이력이 존재함)" };
    }

    // 4. 테스트 참조 데이터 일괄 수집
    const docsToDelete: any[] = [];

    // 4.0. 테스트 clientContracts 수집 (Cascade Delete 대상)
    const caContractQuery = query(collection(db, "clientContracts"), where("workflowKey", "==", workflowKey));
    const caContractSnap = await getDocs(caContractQuery);
    caContractSnap.forEach((d) => {
      const data = d.data();
      const isProd =
        data.contractMode === "production" ||
        data.templateStatusAtContract === "published";
      if (!isProd) {
        docsToDelete.push(d.ref);
      }
    });

    // 4.1. 테스트 clientAutomations 수집
    const caQuery = query(collection(db, "clientAutomations"), where("workflowKey", "==", workflowKey));
    const caSnap = await getDocs(caQuery);
    caSnap.forEach((d) => {
      const data = d.data();
      const isProd =
        data.deploymentMode === "production" ||
        data.templateStatusAtBinding === "published";
      if (!isProd) {
        docsToDelete.push(d.ref);
      }
    });

    // 4.2. 테스트 userAutomationSettings 수집
    const uasQuery = query(collection(db, "userAutomationSettings"), where("workflowKey", "==", workflowKey));
    const uasSnap = await getDocs(uasQuery);
    uasSnap.forEach((d) => {
      const data = d.data();
      const isProd =
        data.isTestSetting === false ||
        data.templateStatusAtSetting === "published";
      if (!isProd) {
        docsToDelete.push(d.ref);
      }
    });

    // 4.3. 테스트 submissions 수집
    const subQuery = query(collection(db, "submissions"), where("workflowKey", "==", workflowKey));
    const subSnap = await getDocs(subQuery);
    subSnap.forEach((d) => {
      const data = d.data();
      const isProd =
        data.isTestExecution === false ||
        data.templateStatusAtExecution === "published";
      if (!isProd) {
        docsToDelete.push(d.ref);
      }
    });

    // 4.4. 마지막으로 지울 템플릿 본문 추가
    docsToDelete.push(docRef);

    // 5. writeBatch를 이용한 400개 단위 안전 분할 삭제
    const { writeBatch } = await import("firebase/firestore");
    let batch = writeBatch(db);
    let count = 0;

    for (const ref of docsToDelete) {
      batch.delete(ref);
      count++;
      if (count === 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    return { success: true };
  } catch (error: any) {
    console.error("[operatorService] draft 워크플로우 일괄 삭제 실패:", error);
    return { success: false, message: error.message || "삭제 도중 에러가 발생했습니다." };
  }
}

/**
 * 신규 고객사(Client)를 등록합니다. (writeBatch를 통한 원자적 동시 등록)
 * clients/{clientId} 와 companyCodeLookups/{normalizedCode} 중복 여부를 사전 체크합니다.
 */
export async function createClient(
  db: Firestore,
  client: ClientDoc,
  operatorUid?: string
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

    // 2.5 ownerAdminUid 지정 검증
    if (client.ownerAdminUid) {
      const userRef = doc(db, "users", client.ownerAdminUid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return { success: false, message: "지정된 관리자 UID를 가진 사용자가 존재하지 않습니다." };
      }
      const userData = userSnap.data() as UserDoc;
      // 다른 clientId에 이미 승인되어 있는지 확인
      if (userData.clientId && userData.clientId !== client.clientId && userData.approvalStatus === "approved") {
        return {
          success: false,
          message: `해당 사용자는 이미 다른 회사(${userData.clientId})의 승인된 소속입니다.`,
        };
      }
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

    // 지정된 관리자가 있는 경우 users 및 companyJoinRequests 업데이트
    if (client.ownerAdminUid) {
      const userRef = doc(db, "users", client.ownerAdminUid);
      batch.update(userRef, {
        clientId: client.clientId,
        role: "company_admin",
        approvalStatus: "approved",
        updatedAt: new Date().toISOString(),
      });

      const requestId = `${client.ownerAdminUid}_${client.clientId}`;
      const requestRef = doc(db, "companyJoinRequests", requestId);
      const requestSnap = await getDoc(requestRef);
      if (requestSnap.exists() && requestSnap.data().status === "pending") {
        batch.update(requestRef, {
          status: "approved",
          reviewedAt: new Date().toISOString(),
          reviewedBy: operatorUid || "operator",
        });
      }
    }

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
  data: Partial<ClientDoc>,
  operatorUid?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const docRef = doc(db, "clients", clientId);
    const normalizedCode = companyCode.trim().toUpperCase();

    // 1. ownerAdminUid 변경 시 검증
    if (data.ownerAdminUid) {
      const userRef = doc(db, "users", data.ownerAdminUid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return { success: false, message: "지정된 관리자 UID를 가진 사용자가 존재하지 않습니다." };
      }
      const userData = userSnap.data() as UserDoc;
      // 이미 다른 clientId에 approved 상태로 배정되어 있는지 검증 (동일 clientId인 경우는 제외)
      if (userData.clientId && userData.clientId !== clientId && userData.approvalStatus === "approved") {
        return {
          success: false,
          message: `해당 사용자는 이미 다른 회사(${userData.clientId})의 승인된 소속이므로 관리자로 지정할 수 없습니다.`,
        };
      }
    }

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

    // 지정된 관리자가 있으면 users와 companyJoinRequests 문서 일괄 업데이트
    if (data.ownerAdminUid) {
      const userRef = doc(db, "users", data.ownerAdminUid);
      batch.update(userRef, {
        clientId: clientId,
        role: "company_admin",
        approvalStatus: "approved",
        updatedAt: new Date().toISOString(),
      });

      const requestId = `${data.ownerAdminUid}_${clientId}`;
      const requestRef = doc(db, "companyJoinRequests", requestId);
      const requestSnap = await getDoc(requestRef);
      if (requestSnap.exists() && requestSnap.data().status === "pending") {
        batch.update(requestRef, {
          status: "approved",
          reviewedAt: new Date().toISOString(),
          reviewedBy: operatorUid || "operator",
        });
      }
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

