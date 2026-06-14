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
  // 기존의 diagnostics를 복사하거나 새로 정의하여 검사를 누적합니다.
  const diagnostics: WorkflowImportDiagnosticItem[] = [...draft.diagnostics.items];

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

  // 중복 경고/오류 등록 방지를 위해 헬퍼 함수 정의
  const addDiag = (field: string, level: DiagnosticLevel, message: string) => {
    // 이미 동일한 필드와 등급을 가진 진단이 있다면 생략
    const exists = diagnostics.some(d => d.field === field && d.level === level && d.message === message);
    if (!exists) {
      diagnostics.push({ field, level, message });
    }
  };

  // 1. [Error] 필수 필드 유효성 검사
  if (!workflowKey) {
    addDiag("workflowKey", "error", "자동화 Key가 비어 있습니다.");
  } else {
    const keyRegex = /^[a-z0-9-]+$/;
    if (!keyRegex.test(workflowKey)) {
      addDiag("workflowKey", "error", "자동화 Key는 영문 소문자, 숫자, 하이픈(-)만 허용됩니다.");
    }
  }

  if (!name) {
    addDiag("name", "error", "워크플로우 이름이 누락되었습니다.");
  }

  if (!webhookSecretId) {
    addDiag("webhookSecretId", "error", "Webhook Secret 참조 ID(webhookSecretId)가 누락되었습니다.");
  }

  if (!n8nServerKey) {
    addDiag("n8nServerKey", "error", "n8n 서버 식별 Key(n8nServerKey)가 누락되었습니다.");
  }

  // 2. [Error] 중복 충돌 검사 (기존 템플릿과 대조)
  if (existingTemplates && Array.isArray(existingTemplates)) {
    for (const existing of existingTemplates) {
      if (workflowKey && existing.workflowKey === workflowKey) {
        addDiag("workflowKey", "error", `이미 등록된 자동화 Key(${workflowKey})가 존재합니다. 다른 Key를 사용해야 합니다.`);
      }

      if (name && existing.name === name) {
        addDiag("name", "error", `이미 동일한 워크플로우 이름(${name})이 존재합니다.`);
      }

      if (webhookSecretId && existing.webhookSecretId === webhookSecretId) {
        addDiag("webhookSecretId", "error", `이미 다른 워크플로우에서 동일한 Webhook Secret ID(${webhookSecretId})를 선점하고 있습니다.`);
      }

      // [Warning] 유사 키/이름 검사
      if (workflowKey && existing.workflowKey !== workflowKey) {
        const isSimilarKey = existing.workflowKey.includes(workflowKey) || 
                             workflowKey.includes(existing.workflowKey) ||
                             calculateLevenshtein(existing.workflowKey, workflowKey) <= 2;
        if (isSimilarKey) {
          addDiag("workflowKey", "warning", `기존 등록된 자동화 Key(${existing.workflowKey})와 매우 유사합니다. 오타 또는 중복 등록 시도인지 확인하십시오.`);
        }
      }

      if (name && existing.name !== name) {
        const isSimilarName = existing.name.includes(name) || name.includes(existing.name);
        if (isSimilarName) {
          addDiag("name", "warning", `기존 워크플로우 이름(${existing.name})과 이름이 유사합니다.`);
        }
      }
    }
  }

  // 3. [Error/Warning] inputSchema 정합성 검사
  const acceptedTypes = inputSchema.acceptedInputTypes || [];
  if (acceptedTypes.length === 0) {
    addDiag("inputSchema.acceptedInputTypes", "error", "허용 입력 형태(acceptedInputTypes)가 지정되지 않았습니다. 최소 한 가지 형식을 활성화하십시오.");
  }

  if (acceptedTypes.includes("file") || acceptedTypes.includes("audio") || acceptedTypes.includes("image")) {
    const allowedExtensions = inputSchema.allowedFileTypes || [];
    if (allowedExtensions.length === 0) {
      addDiag("inputSchema.allowedFileTypes", "warning", "파일, 오디오 또는 이미지 입력이 허용되었으나 구체적인 허용 확장자(allowedFileTypes)가 없습니다.");
    }
  }

  // 4. [Error/Warning] configSchema 검사
  const schemaKeys = new Set<string>();
  const keyPattern = /^[a-zA-Z0-9]+$/;
  const allowedFieldTypes = ["text", "email", "number", "boolean", "select", "textarea", "secret"];
  const sensitiveKeywords = ["token", "secret", "credential", "privatekey", "apikey", "password"];

  configSchema.forEach((field, index) => {
    const fieldPrefix = `configSchema[${index}]`;
    const fKey = field.key?.trim() || "";
    const fLabel = field.label?.trim() || "";
    const fType = field.type || "";

    if (!fKey) {
      addDiag(`${fieldPrefix}.key`, "error", `${index + 1}번째 설정 필드의 Key가 비어 있습니다.`);
    } else {
      if (!keyPattern.test(fKey)) {
        addDiag(`${fieldPrefix}.key`, "error", `${index + 1}번째 설정 필드 Key(${fKey})는 영문/숫자 조합만 가능하며, 한글/공백/특수문자는 허용되지 않습니다.`);
      }

      if (schemaKeys.has(fKey)) {
        addDiag(`${fieldPrefix}.key`, "error", `설정 필드 Key 중복 오류: 중복되는 Key '${fKey}'가 존재합니다.`);
      }
      schemaKeys.add(fKey);

      // 민감 필드 검출
      const isSensitiveKey = sensitiveKeywords.some(kw => fKey.toLowerCase().includes(kw));
      if (isSensitiveKey) {
        addDiag(`${fieldPrefix}.key`, "error", `설정 필드 Key에 민감 키워드가 검출되었습니다. 자격증명/보안 정보는 DB configSchema 대신 서버 환경변수 매핑을 이용해야 합니다.`);
      }
    }

    if (!fLabel) {
      addDiag(`${fieldPrefix}.label`, "warning", `${index + 1}번째 설정 필드(${fKey || index})의 라벨명(label)이 비어 있습니다.`);
    }

    if (!fType || !allowedFieldTypes.includes(fType)) {
      addDiag(`${fieldPrefix}.type`, "error", `${index + 1}번째 설정 필드(${fKey || index})의 입력 타입(${fType || "없음"})은 앱이 지원하지 않는 규격입니다.`);
    }

    if (fType === "select") {
      const options = field.options || [];
      if (options.length === 0) {
        addDiag(`${fieldPrefix}.options`, "error", `선택(select) 타입 필드 '${fKey}'의 선택지 옵션(options)이 정의되지 않았습니다.`);
      }
    }

    // 가이드 설명 부족
    if (!field.description) {
      addDiag(`${fieldPrefix}.description`, "warning", `${index + 1}번째 설정 필드 '${fKey}'의 사용자 가이드 설명이 비어 있어 수정이 권장됩니다.`);
    }
  }	);

  // 5. [Error] 보관 정책 및 기술 지원 레벨 비교 검증
  if (capabilities && opPolicy) {
    const supported = capabilities.supportedLevels || [];
    const opAllowed = opPolicy.allowedLevels || [];
    const opDefault = opPolicy.defaultLevel;

    // operator policy의 허용 레벨이 capabilities의 지원 범위에 속하는지
    for (const lvl of opAllowed) {
      if (!supported.includes(lvl)) {
        addDiag("operatorRetentionPolicy.allowedLevels", "error", `오퍼레이터 계약 허용 레벨(${lvl})이 워크플로우 기술적 지원 범위(${supported.join(", ")})를 초과합니다.`);
      }
    }

    // operator policy의 기본 레벨이 허용 레벨 내에 있는지
    if (opDefault && !opAllowed.includes(opDefault)) {
      addDiag("operatorRetentionPolicy.defaultLevel", "error", `계약 기본 레벨(${opDefault})은 계약 허용 레벨 목록(${opAllowed.join(", ")})에 포함되어야 합니다.`);
    }

    // capabilities의 기본 레벨 검증
    if (capabilities.defaultLevel && !supported.includes(capabilities.defaultLevel)) {
      addDiag("retentionCapabilities.defaultLevel", "error", `기본 지원 레벨(${capabilities.defaultLevel})이 지원 레벨 목록(${supported.join(", ")})에 없습니다.`);
    }
  }

  // 6. [Warning] 자동 추정 및 기본값 경고 확인
  if (shortName === "자동화") {
    addDiag("shortName", "warning", "줄임말(shortName)이 기본값인 '자동화'로 자동 설정되어 있어 상세 정제가 요구됩니다.");
  }

  if (description.includes("가져온 워크플로우") || description.includes("n8n에서 가져온")) {
    addDiag("description", "warning", "설명글(description)이 단순 분석 추정값입니다. 운영 상황을 상세히 기술해야 합니다.");
  }

  // 7. diagnostics 전체 요약 결과 빌드
  const fieldDiagnostics: Record<string, WorkflowImportDiagnosticItem> = {};
  let maxSeverity: DiagnosticLevel = "ok";

  for (const diag of diagnostics) {
    fieldDiagnostics[diag.field] = diag;
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
      canSave: !hasError,                       // error가 하나도 없어야 저장 승인
      requiresWarningConfirmation: hasWarning, // warning만 존재할 경우 확인 동의 요구
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
