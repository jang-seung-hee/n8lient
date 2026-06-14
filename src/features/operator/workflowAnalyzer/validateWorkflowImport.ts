// 이 파일은 가져온 워크플로우 템플릿 초안(Draft)을 기존에 등록된 워크플로우 템플릿들과 비교하여 충돌 및 정합성을 검증하는 기능을 제공합니다.
// 한국어 주석 표준을 준수합니다.

import type { WorkflowTemplate } from "@/types/n8lient";
import type { WorkflowTemplateImportDraft, WorkflowImportDiagnosticItem, DiagnosticLevel } from "./workflowImportTypes";

/**
 * 분석 초안(Draft)과 기존 워크플로우 템플릿 목록을 대조하여 충돌, 정합성 위배 사항을 진단합니다.
 * @param draft 워크플로우 템플릿 초안 DTO
 * @param existingTemplates 기존에 등록된 워크플로우 템플릿 배열
 */
export function validateWorkflowImport(
  draft: WorkflowTemplateImportDraft,
  existingTemplates: WorkflowTemplate[]
): WorkflowTemplateImportDraft {
  // 매번 초기화하여 누적 오류 해소 및 정확한 진단 재계산
  const diagnostics: WorkflowImportDiagnosticItem[] = [];

  const template = draft.workflowTemplate;
  const workflowKey = template.workflowKey || "";
  const name = template.name || "";
  const shortName = template.shortName || "";
  const description = template.description || "";
  const webhookSecretId = template.webhookSecretId || "";
  const n8nServerKey = template.n8nServerKey || "";
  const inputSchema = template.inputSchema || { acceptedInputTypes: [], allowedFileTypes: [], maxFileSizeMB: 10, titleRequired: true };
  const configSchema = template.configSchema || [];
  const capabilities = template.retentionCapabilities;
  const opPolicy = template.operatorRetentionPolicy;

  // 진단 등록 헬퍼
  const addDiag = (field: string, level: DiagnosticLevel, message: string) => {
    const exists = diagnostics.some(d => d.field === field && d.level === level && d.message === message);
    if (!exists) {
      diagnostics.push({ field, level, message });
    }
  };

  // 임시 진단 수집용 구조
  let workflowKeyStatus: DiagnosticLevel = "ok";
  let nameStatus: DiagnosticLevel = "ok";
  let webhookSecretIdStatus: DiagnosticLevel = "ok";
  let n8nServerKeyStatus: DiagnosticLevel = "ok";
  let shortNameStatus: DiagnosticLevel = "ok";
  let descriptionStatus: DiagnosticLevel = "ok";

  // 1. workflowKey 검증
  if (!workflowKey) {
    addDiag("workflowKey", "error", "자동화 Key가 비어 있습니다.");
    workflowKeyStatus = "error";
  } else {
    const keyRegex = /^[a-z0-9-]+$/;
    if (!keyRegex.test(workflowKey)) {
      addDiag("workflowKey", "error", "자동화 Key는 영문 소문자, 숫자, 하이픈(-)만 허용됩니다.");
      workflowKeyStatus = "error";
    } else {
      // 중복 및 유사도 검사
      let isDuplicate = false;
      let isSimilar = false;
      let similarKeyName = "";

      if (existingTemplates && Array.isArray(existingTemplates)) {
        for (const existing of existingTemplates) {
          if (existing.workflowKey === workflowKey) {
            isDuplicate = true;
            break;
          }
          const dist = calculateLevenshtein(existing.workflowKey, workflowKey);
          if (existing.workflowKey.includes(workflowKey) || workflowKey.includes(existing.workflowKey) || dist <= 2) {
            isSimilar = true;
            similarKeyName = existing.workflowKey;
          }
        }
      }

      if (isDuplicate) {
        addDiag("workflowKey", "error", `이미 등록된 자동화 Key(${workflowKey})가 존재합니다. 다른 Key를 사용해야 합니다.`);
        workflowKeyStatus = "error";
      } else if (isSimilar) {
        addDiag("workflowKey", "warning", `기존 등록된 자동화 Key(${similarKeyName})와 매우 유사합니다. 오타 또는 중복 등록 시도인지 확인하십시오.`);
        workflowKeyStatus = "warning";
      }
    }
  }
  if (workflowKeyStatus === "ok") {
    addDiag("workflowKey", "ok", "자동화 Key 형식이 올바르고 중복이 없습니다.");
  }

  // 2. name 검증
  if (!name) {
    addDiag("name", "error", "워크플로우 이름이 누락되었습니다.");
    nameStatus = "error";
  } else {
    let isDuplicate = false;
    let isSimilar = false;
    let similarName = "";

    if (existingTemplates && Array.isArray(existingTemplates)) {
      for (const existing of existingTemplates) {
        if (existing.name === name) {
          isDuplicate = true;
          break;
        }
        if (existing.name.includes(name) || name.includes(existing.name)) {
          isSimilar = true;
          similarName = existing.name;
        }
      }
    }

    if (isDuplicate) {
      addDiag("name", "error", `이미 동일한 워크플로우 이름(${name})이 존재합니다.`);
      nameStatus = "error";
    } else if (isSimilar) {
      addDiag("name", "warning", `기존 워크플로우 이름(${similarName})과 이름이 유사합니다.`);
      nameStatus = "warning";
    }
  }
  if (nameStatus === "ok") {
    addDiag("name", "ok", "워크플로우 이름이 정상적으로 확인되었습니다.");
  }

  // 3. webhookSecretId 검증
  if (!webhookSecretId) {
    addDiag("webhookSecretId", "error", "Webhook Secret 참조 ID(webhookSecretId)가 누락되었습니다.");
    webhookSecretIdStatus = "error";
  } else {
    let isDuplicate = false;
    if (existingTemplates && Array.isArray(existingTemplates)) {
      for (const existing of existingTemplates) {
        if (existing.webhookSecretId === webhookSecretId) {
          isDuplicate = true;
          break;
        }
      }
    }
    if (isDuplicate) {
      addDiag("webhookSecretId", "error", `이미 다른 워크플로우에서 동일한 Webhook Secret ID(${webhookSecretId})를 선점하고 있습니다.`);
      webhookSecretIdStatus = "error";
    }
  }
  if (webhookSecretIdStatus === "ok") {
    addDiag("webhookSecretId", "ok", "Webhook Secret 참조 ID가 정상적으로 확인되었습니다.");
  }

  // 4. n8nServerKey 검증
  if (!n8nServerKey) {
    addDiag("n8nServerKey", "error", "n8n 서버 식별 Key(n8nServerKey)가 누락되었습니다.");
    n8nServerKeyStatus = "error";
  }
  if (n8nServerKeyStatus === "ok") {
    addDiag("n8nServerKey", "ok", "n8n 서버 식별 Key가 정상적으로 설정되었습니다.");
  }

  // 5. shortName 검증
  if (!shortName || shortName === "자동화" || (name && name.replace(/[^ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z0-9]/g, "").startsWith(shortName) && shortName.length <= 4)) {
    addDiag("shortName", "warning", "줄임말(shortName)이 분석 추정값입니다. 실제 운영에 맞게 수정 및 확인이 권장됩니다.");
    shortNameStatus = "warning";
  }
  if (shortNameStatus === "ok") {
    addDiag("shortName", "ok", "줄임말이 올바르게 작성되었습니다.");
  }

  // 6. description 검증
  if (!description || description.includes("워크플로우입니다.") || description.includes("가져온 워크플로우명세") || description.includes("n8n에서 가져온")) {
    addDiag("description", "warning", "설명글(description)이 단순 분석 추정값 또는 공백입니다. 운영 상황을 상세히 기술해야 합니다.");
    descriptionStatus = "warning";
  }
  if (descriptionStatus === "ok") {
    addDiag("description", "ok", "설명이 상세하게 정상적으로 작성되었습니다.");
  }

  // 7. inputSchema.acceptedInputTypes 검증
  const acceptedTypes = inputSchema.acceptedInputTypes || [];
  if (acceptedTypes.length === 0) {
    addDiag("inputSchema.acceptedInputTypes", "error", "허용 입력 형태(acceptedInputTypes)가 지정되지 않았습니다. 최소 한 가지 형식을 활성화하십시오.");
  } else {
    addDiag("inputSchema.acceptedInputTypes", "ok", "허용 입력 형태가 정상 설정되었습니다.");
  }

  // 8. inputSchema.allowedFileTypes 검증
  const allowedExtensions = inputSchema.allowedFileTypes || [];
  const isMediaInput = acceptedTypes.includes("file") || acceptedTypes.includes("audio") || acceptedTypes.includes("image");
  if (isMediaInput) {
    if (allowedExtensions.length === 0) {
      addDiag("inputSchema.allowedFileTypes", "warning", "파일, 오디오 또는 이미지 입력이 허용되었으나 구체적인 허용 확장자(allowedFileTypes)가 없습니다.");
    } else if (allowedExtensions.length === 11 && allowedExtensions.includes("pdf")) {
      addDiag("inputSchema.allowedFileTypes", "warning", "허용 확장자(allowedFileTypes)가 기본 fallback 리스트 상태입니다. 실제 허용할 확장자를 정밀 점검하십시오.");
    } else {
      addDiag("inputSchema.allowedFileTypes", "ok", "허용 확장자가 정상적으로 지정되었습니다.");
    }
  } else {
    addDiag("inputSchema.allowedFileTypes", "ok", "텍스트 단독 입력 워크플로우이므로 허용 확장자가 비어 있어도 무방합니다.");
  }

  // 9. inputSchema.maxFileSizeMB 검증
  if (inputSchema.maxFileSizeMB === 50 || inputSchema.maxFileSizeMB === 10) {
    addDiag("inputSchema.maxFileSizeMB", "warning", "허용 최대 파일 용량(maxFileSizeMB)이 추정 기본값(50MB/10MB)입니다. 실제 운영 요구사항에 맞는지 점검하십시오.");
  } else {
    addDiag("inputSchema.maxFileSizeMB", "ok", "허용 최대 파일 용량이 정상 설정되었습니다.");
  }

  // 10. inputSchema.titleRequired 검증 (자동 추정됨 경고)
  // titleRequired의 추정 경고 기준: inputSchema 내에 titleRequired가 명시되어 있지만 검토 대상이므로 warning 노출
  addDiag("inputSchema.titleRequired", "warning", "입력 제목 필수 여부(titleRequired)가 분석 자동 설정되었습니다. 사용 환경에 맞게 검토하십시오.");

  // 11. retentionCapabilities 및 operatorRetentionPolicy 비교 검증
  let retentionPolicyStatus: DiagnosticLevel = "ok";
  if (capabilities && opPolicy) {
    const supported = capabilities.supportedLevels || [];
    const opAllowed = opPolicy.allowedLevels || [];
    const opDefault = opPolicy.defaultLevel;

    // operator policy의 허용 레벨이 capabilities의 지원 범위에 속하는지
    for (const lvl of opAllowed) {
      if (!supported.includes(lvl)) {
        addDiag("operatorRetentionPolicy.allowedLevels", "error", `오퍼레이터 계약 허용 레벨(${lvl})이 워크플로우 기술적 지원 범위(${supported.join(", ")})를 초과합니다.`);
        retentionPolicyStatus = "error";
      }
    }

    // operator policy의 기본 레벨이 허용 레벨 내에 있는지
    if (opDefault && !opAllowed.includes(opDefault)) {
      addDiag("operatorRetentionPolicy.defaultLevel", "error", `계약 기본 레벨(${opDefault})은 계약 허용 레벨 목록(${opAllowed.join(", ")})에 포함되어야 합니다.`);
      retentionPolicyStatus = "error";
    }

    // capabilities의 기본 레벨 검증
    if (capabilities.defaultLevel && !supported.includes(capabilities.defaultLevel)) {
      addDiag("retentionCapabilities.defaultLevel", "error", `기본 지원 레벨(${capabilities.defaultLevel})이 지원 레벨 목록(${supported.join(", ")})에 없습니다.`);
      retentionPolicyStatus = "error";
    }

    // [Warning] processorResult 지원 여부 불명확
    if (capabilities.supportsProcessorResult !== undefined) {
      addDiag("retentionCapabilities.supportsProcessorResult", "warning", "supportsProcessorResult 지원 여부가 불명확합니다. 자동화 노드 구성과 일치하는지 확인하십시오.");
    }
    // [Warning] Result Policy Router 감지 불명확
    if (capabilities.supportsResultPolicyRouter !== undefined) {
      addDiag("retentionCapabilities.supportsResultPolicyRouter", "warning", "Result Policy Router 감지 여부가 불명확합니다. 워크플로우에 라우터 노드가 포함되어 있는지 확인하십시오.");
    }
  }

  if (retentionPolicyStatus === "ok") {
    addDiag("operatorRetentionPolicy.allowedLevels", "ok", "보관 정책 레벨 구성이 정상적이며 검증을 통과했습니다.");
    addDiag("operatorRetentionPolicy.defaultLevel", "ok", "보관 정책 기본 레벨 구성이 정상적입니다.");
  }

  // 12. configSchema 검증
  const schemaKeys = new Set<string>();
  const keyPattern = /^[a-zA-Z0-9]+$/;
  const allowedFieldTypes = ["text", "email", "number", "boolean", "select", "textarea", "secret"];
  const sensitiveKeywords = ["token", "secret", "credential", "privatekey", "apikey", "password"];

  configSchema.forEach((field, index) => {
    const fieldPrefix = `configSchema[${index}]`;
    const fKey = field.key?.trim() || "";
    const fLabel = field.label?.trim() || "";
    const fType = field.type || "";

    let fieldKeyStatus: DiagnosticLevel = "ok";
    let fieldLabelStatus: DiagnosticLevel = "ok";
    let fieldTypeStatus: DiagnosticLevel = "ok";

    if (!fKey) {
      addDiag(`${fieldPrefix}.key`, "error", `${index + 1}번째 설정 필드의 Key가 비어 있습니다.`);
      fieldKeyStatus = "error";
    } else {
      if (!keyPattern.test(fKey)) {
        addDiag(`${fieldPrefix}.key`, "error", `${index + 1}번째 설정 필드 Key(${fKey})는 영문/숫자 조합만 가능하며, 한글/공백/특수문자는 허용되지 않습니다.`);
        fieldKeyStatus = "error";
      }

      if (schemaKeys.has(fKey)) {
        addDiag(`${fieldPrefix}.key`, "error", `설정 필드 Key 중복 오류: 중복되는 Key '${fKey}'가 존재합니다.`);
        fieldKeyStatus = "error";
      }
      schemaKeys.add(fKey);

      // 민감 필드 검출 시 에러 처리 (3.1 조항 반영)
      const isSensitiveKey = sensitiveKeywords.some(kw => fKey.toLowerCase().includes(kw));
      if (isSensitiveKey) {
        addDiag(`${fieldPrefix}.key`, "error", `설정 필드 Key에 민감 키워드가 검출되었습니다. 자격증명/보안 정보는 DB configSchema 대신 서버 환경변수 매핑을 이용해야 합니다.`);
        fieldKeyStatus = "error";
      }
    }

    if (fieldKeyStatus === "ok") {
      addDiag(`${fieldPrefix}.key`, "ok", "정상 설정 키입니다.");
    }

    if (!fLabel) {
      addDiag(`${fieldPrefix}.label`, "warning", `${index + 1}번째 설정 필드의 라벨명(label)이 비어 있습니다.`);
      fieldLabelStatus = "warning";
    } else {
      addDiag(`${fieldPrefix}.label`, "ok", "라벨명이 지정되었습니다.");
    }

    if (!fType || !allowedFieldTypes.includes(fType)) {
      addDiag(`${fieldPrefix}.type`, "error", `${index + 1}번째 설정 필드의 입력 타입(${fType || "없음"})은 앱이 지원하지 않는 규격입니다.`);
      fieldTypeStatus = "error";
    } else if (fType === "select") {
      const options = field.options || [];
      if (options.length === 0) {
        addDiag(`${fieldPrefix}.options`, "error", `선택(select) 타입 필드 '${fKey}'의 선택지 옵션(options)이 정의되지 않았습니다.`);
      } else {
        addDiag(`${fieldPrefix}.options`, "ok", "셀렉트 옵션 리스트가 정상 정의되었습니다.");
      }
    }

    if (fieldTypeStatus === "ok" && fType !== "select") {
      addDiag(`${fieldPrefix}.type`, "ok", "지원되는 정상 입력 타입입니다.");
    }

    // 가이드 및 힌트 warning
    if (!field.description) {
      addDiag(`${fieldPrefix}.description`, "warning", `${index + 1}번째 설정 필드 '${fKey}'의 사용자 가이드 설명이 비어 있어 수정이 권장됩니다.`);
    } else {
      addDiag(`${fieldPrefix}.description`, "ok", "사용자 가이드 설명이 존재합니다.");
    }

    if (!field.placeholder) {
      addDiag(`${fieldPrefix}.placeholder`, "warning", `${index + 1}번째 설정 필드 '${fKey}'의 입력 힌트(placeholder)가 비어 있어 수정이 권장됩니다.`);
    } else {
      addDiag(`${fieldPrefix}.placeholder`, "ok", "입력 힌트가 존재합니다.");
    }

    // 구형 구글드라이브 폴더 ID 감지 경고 추가
    if (fKey === "googleDriveExportFolderId") {
      addDiag(`${fieldPrefix}.key`, "warning", "구형 googleDriveExportFolderId가 감지되었습니다. 최신 기준은 MD 폴더와 첨부파일 폴더를 분리합니다.");
    }
  });

  // 13. diagnostics 전체 요약 결과 빌드
  const fieldDiagnostics: Record<string, WorkflowImportDiagnosticItem> = {};
  let maxSeverity: DiagnosticLevel = "ok";

  for (const diag of diagnostics) {
    // 필드별 대표 진단 지정 (우선순위: error > warning > ok)
    const existingDiag = fieldDiagnostics[diag.field];
    if (!existingDiag) {
      fieldDiagnostics[diag.field] = diag;
    } else {
      if (diag.level === "error") {
        fieldDiagnostics[diag.field] = diag;
      } else if (diag.level === "warning" && existingDiag.level !== "error") {
        fieldDiagnostics[diag.field] = diag;
      } else if (diag.level === "ok" && existingDiag.level === "ok") {
        // 동일 수준이면 덮어쓰거나 누적 가능, 여기서는 유지
      }
    }

    if (diag.level === "error") {
      maxSeverity = "error";
    } else if (diag.level === "warning" && maxSeverity !== "error") {
      maxSeverity = "warning";
    }
  }

  const hasError = maxSeverity === "error";
  const hasWarning = maxSeverity === "warning";

  return {
    ...draft,
    diagnostics: {
      severity: maxSeverity,
      canSave: !hasError,
      requiresWarningConfirmation: hasWarning,
      items: diagnostics,
      fieldDiagnostics
    }
  };
}

/**
 * 레벤슈타인 거리 계산 헬퍼 (유사도 측정용)
 */
function calculateLevenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // 삭제
          matrix[i][j - 1] + 1, // 삽입
          matrix[i - 1][j - 1] + 1 // 대체
        );
      }
    }
  }
  return matrix[a.length][b.length];
}
