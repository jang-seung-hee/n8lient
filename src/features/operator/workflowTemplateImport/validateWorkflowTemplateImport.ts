// 이 파일은 표준 Import JSON에서 전달된 데이터를 N8Lient 워크플로우 템플릿 저장 스키마 규격을 기준으로 충돌 및 정합성 검사를 진행합니다.
// 한국어 주석 표준을 준수합니다.

import type { WorkflowTemplate } from "@/types/n8lient";
import type { WorkflowTemplateImportDraft, WorkflowImportDiagnosticItem, DiagnosticLevel } from "./workflowTemplateImportTypes";

/**
 * 표준 Import 명세서의 데이터 정합성을 검증합니다.
 * @param draft 명세서 초안 객체
 * @param existingTemplates 시스템에 이미 등록된 기존 워크플로우 템플릿 배열
 */
export function validateWorkflowTemplateImport(
  draft: WorkflowTemplateImportDraft,
  existingTemplates: WorkflowTemplate[]
): WorkflowTemplateImportDraft {
  const diagnostics: WorkflowImportDiagnosticItem[] = [];
  const t = draft.workflowTemplate;

  // 진단 등록 헬퍼
  const addDiag = (field: string, level: DiagnosticLevel, message: string) => {
    diagnostics.push({ field, level, message });
  };

  // 1. 기본 정보 검증 (6.2 기준)
  const workflowKey = (t.workflowKey || "").trim();
  if (!workflowKey) {
    addDiag("workflowKey", "error", "워크플로우 Key(workflowKey)가 누락되었습니다.");
  } else {
    const keyRegex = /^[a-z0-9-]+$/;
    if (!keyRegex.test(workflowKey)) {
      addDiag("workflowKey", "error", "워크플로우 Key는 영문 소문자, 숫자, 하이픈(-)만 허용됩니다.");
    } else {
      const isKeyDuplicate = existingTemplates.some(existing => existing.workflowKey === workflowKey);
      if (isKeyDuplicate) {
        addDiag("workflowKey", "error", `이미 동일한 워크플로우 Key(${workflowKey})가 사용 중입니다.`);
      }
    }
  }

  const name = (t.name || "").trim();
  if (!name) {
    addDiag("name", "error", "워크플로우 이름(name)이 누락되었습니다.");
  } else {
    const isNameDuplicate = existingTemplates.some(existing => existing.name === name);
    if (isNameDuplicate) {
      addDiag("name", "error", `이미 동일한 워크플로우 이름(${name})이 존재합니다.`);
    }
  }

  if (!(t.webhookSecretId || "").trim()) {
    addDiag("webhookSecretId", "error", "Webhook Secret 참조 ID(webhookSecretId)가 누락되었습니다.");
  } else {
    const isWebhookSecretDuplicate = existingTemplates.some(existing => existing.webhookSecretId === t.webhookSecretId);
    if (isWebhookSecretDuplicate) {
      addDiag("webhookSecretId", "error", `이미 동일한 Webhook Secret 참조 ID(${t.webhookSecretId})가 사용 중입니다.`);
    }
  }

  if (!(t.n8nServerKey || "").trim()) {
    addDiag("n8nServerKey", "error", "n8n 서버 식별 Key(n8nServerKey)가 누락되었습니다.");
  }

  if (!(t.version || "").trim()) {
    addDiag("version", "error", "버전 정보(version)가 누락되었습니다.");
  }

  if (t.status && !["draft", "published", "disabled"].includes(t.status)) {
    addDiag("status", "error", "배포 상태(status)는 draft, published, disabled 중 하나여야 합니다.");
  }

  if (!(t.shortName || "").trim()) {
    addDiag("shortName", "warning", "줄임말(shortName)이 지정되지 않았습니다. 2~4자 이내의 설정을 권장합니다.");
  }

  const description = (t.description || "").trim();
  if (!description) {
    addDiag("description", "warning", "설명(description)이 비어 있습니다. 운영 목적을 상세히 기재해 주십시오.");
  } else if (description.length < 10) {
    addDiag("description", "warning", "설명글이 너무 짧습니다. 보다 구체적인 설명 입력을 권장합니다.");
  }

  // 2. inputSchema 검증 (6.3 기준)
  const inputSchema = t.inputSchema || ({} as any);
  const acceptedTypes = inputSchema.acceptedInputTypes || [];
  const allowedExtensions = inputSchema.allowedFileTypes || [];

  if (acceptedTypes.length === 0) {
    addDiag("inputSchema.acceptedInputTypes", "error", "허용 입력 형태(acceptedInputTypes)가 비어 있습니다.");
  } else {
    const invalidTypes = acceptedTypes.filter((type: string) => !["text", "file", "image", "audio"].includes(type));
    if (invalidTypes.length > 0) {
      addDiag("inputSchema.acceptedInputTypes", "error", `지원하지 않는 입력 형태(${invalidTypes.join(", ")})가 포함되어 있습니다.`);
    }
  }

  if (inputSchema.titleRequired !== undefined && typeof inputSchema.titleRequired !== "boolean") {
    addDiag("inputSchema.titleRequired", "error", "titleRequired 속성은 boolean 타입이어야 합니다.");
  }

  if (inputSchema.maxFileSizeMB !== undefined && typeof inputSchema.maxFileSizeMB !== "number") {
    addDiag("inputSchema.maxFileSizeMB", "error", "maxFileSizeMB 속성은 숫자 타입이어야 합니다.");
  } else if (inputSchema.maxFileSizeMB && inputSchema.maxFileSizeMB > 200) {
    addDiag("inputSchema.maxFileSizeMB", "warning", "허용 최대 파일 용량(maxFileSizeMB)이 200MB를 초과하여 과도하게 큽니다.");
  }

  const hasMediaInput = acceptedTypes.includes("file") || acceptedTypes.includes("image") || acceptedTypes.includes("audio");
  if (hasMediaInput && allowedExtensions.length === 0) {
    addDiag("inputSchema.allowedFileTypes", "warning", "미디어 입력을 허용했으나 allowedExtensions(allowedFileTypes) 확장자 목록이 비어 있습니다.");
  }

  // 3. configSchema 검증 (6.4 기준)
  const configSchema = t.configSchema;
  if (configSchema !== undefined && !Array.isArray(configSchema)) {
    addDiag("configSchema", "error", "configSchema는 배열 형태여야 합니다.");
  } else if (Array.isArray(configSchema)) {
    const schemaKeys = new Set<string>();
    const keyPattern = /^[a-zA-Z0-9]+$/;
    const allowedFieldTypes = ["text", "textarea", "email", "number", "boolean", "select", "password", "url", "secret"];
    
    // 민감 정보 키워드 정의
    const sensitiveKeywords = [
      "token", "secret", "credential", "credentialid", "accesstoken",
      "refreshtoken", "privatekey", "apikey", "api_key", "password",
      "serviceaccount", "clientsecret", "authorization", "bearer", "cookie", "firebaseadmin"
    ];

    configSchema.forEach((field, index) => {
      const fieldPath = `configSchema[${index}]`;
      const fKey = (field.key || "").trim();
      // [버그 수정] Import JSON은 type 또는 inputType 중 하나만 제공할 수 있으므로
      // 두 필드를 모두 수용하여 canonical 필드인 type 기준으로 검증합니다.
      const fType = (field as any).type || (field as any).inputType || "";

      if (!fKey) {
        addDiag(`${fieldPath}.key`, "error", `${index + 1}번째 설정 필드의 Key가 비어 있습니다.`);
      } else {
        if (!keyPattern.test(fKey)) {
          addDiag(`${fieldPath}.key`, "error", `${index + 1}번째 설정 필드 Key(${fKey})는 영문/숫자 조합만 허용되며 특수문자/공백/한글은 불가합니다.`);
        }
        if (schemaKeys.has(fKey)) {
          addDiag(`${fieldPath}.key`, "error", `설정 필드 Key 중복 오류: '${fKey}' 키가 다수 존재합니다.`);
        }
        schemaKeys.add(fKey);

        // 민감정보 검출 차단
        const isSensitive = sensitiveKeywords.some(keyword => fKey.toLowerCase().includes(keyword));
        if (isSensitive) {
          addDiag(`${fieldPath}.key`, "error", `설정 필드 Key(${fKey})에 민감 보안 키워드가 포함되어 있어 차단되었습니다. 서버 환경변수를 활용하십시오.`);
        }
      }

      // type 누락 검사: type과 inputType 둘 다 없을 때만 오류로 판단합니다.
      if (!fType) {
        addDiag(`${fieldPath}.type`, "error", `${index + 1}번째 설정 필드 '${fKey}'의 인풋 타입이 누락되었습니다. (type 또는 inputType 중 하나를 지정하세요.)`);
      } else if (!allowedFieldTypes.includes(fType)) {
        addDiag(`${fieldPath}.type`, "error", `${index + 1}번째 설정 필드의 타입(${fType})은 지원하지 않는 규격입니다.`);
      } else if (fType === "select") {
        const options = field.options || [];
        if (options.length === 0) {
          addDiag(`${fieldPath}.options`, "error", `셀렉트(select) 타입의 '${fKey}' 필드의 선택 항목(options)이 비어 있습니다.`);
        }
      }

      if (!(field.label || "").trim()) {
        addDiag(`${fieldPath}.label`, "warning", `${index + 1}번째 설정 필드 '${fKey}'의 라벨(label)이 비어 있습니다.`);
      }
      if (!(field.placeholder || "").trim()) {
        addDiag(`${fieldPath}.placeholder`, "warning", `${index + 1}번째 설정 필드 '${fKey}'의 입력 힌트(placeholder)가 비어 있습니다.`);
      }
      if (!(field.description || "").trim()) {
        addDiag(`${fieldPath}.description`, "warning", `${index + 1}번째 설정 필드 '${fKey}'의 가이드 설명(description)이 비어 있습니다.`);
      }

      // 구형 드라이브 키 감지 경고
      if (fKey === "googleDriveExportFolderId") {
        addDiag("configSchema", "warning", "구형 googleDriveExportFolderId 사용이 감지되었습니다. 최신 기준은 마크다운 보관함과 첨부파일 보관함 분리를 권장합니다.");
      }
    });
  }

  // 4. 보관/보존 정책 정합성 검증 (6.5 기준)
  const caps = t.retentionCapabilities;
  const op = t.operatorRetentionPolicy;
  const allowedPolicyLevels = ["notify_only", "processed_result", "full_archive"];

  if (caps && op) {
    const supported = caps.supportedLevels || [];
    const opAllowed = op.allowedLevels || [];

    // 지원 범위 체크
    for (const lvl of opAllowed) {
      if (!allowedPolicyLevels.includes(lvl)) {
        addDiag("operatorRetentionPolicy.allowedLevels", "error", `보관 정책에 허용되지 않는 보존 레벨 값(${lvl})이 포함되어 있습니다.`);
      }
      if (!supported.includes(lvl as any)) {
        addDiag("operatorRetentionPolicy.allowedLevels", "error", `오퍼레이터 계약 허용 레벨(${lvl})은 워크플로우가 지원하는 레벨 범위(${supported.join(", ")}) 이내여야 합니다.`);
      }
    }

    if (op.defaultLevel && !opAllowed.includes(op.defaultLevel)) {
      addDiag("operatorRetentionPolicy.defaultLevel", "error", `오퍼레이터 기본 레벨(${op.defaultLevel})은 계약 허용 목록(${opAllowed.join(", ")})에 포함되어야 합니다.`);
    }

    if (caps.defaultLevel && !supported.includes(caps.defaultLevel)) {
      addDiag("retentionCapabilities.defaultLevel", "error", `기본 지원 레벨(${caps.defaultLevel})이 전체 지원 범위(${supported.join(", ")})에 존재하지 않습니다.`);
    }

    if (caps.maxLevel && !supported.includes(caps.maxLevel)) {
      addDiag("retentionCapabilities.maxLevel", "error", `최대 지원 레벨(${caps.maxLevel})이 전체 지원 범위(${supported.join(", ")})에 존재하지 않습니다.`);
    }
  }

  // 5. 종합 심각도 및 빠른 매핑 객체 구축
  const fieldDiagnostics: Record<string, WorkflowImportDiagnosticItem> = {};
  let maxSeverity: DiagnosticLevel = "ok";

  for (const diag of diagnostics) {
    const existing = fieldDiagnostics[diag.field];
    if (!existing) {
      fieldDiagnostics[diag.field] = diag;
    } else {
      // 우선순위: error > warning > ok
      if (diag.level === "error") {
        fieldDiagnostics[diag.field] = diag;
      } else if (diag.level === "warning" && existing.level !== "error") {
        fieldDiagnostics[diag.field] = diag;
      }
    }

    if (diag.level === "error") {
      maxSeverity = "error";
    } else if (diag.level === "warning" && maxSeverity !== "error") {
      maxSeverity = "warning";
    }
  }

  return {
    ...draft,
    diagnostics: {
      severity: maxSeverity,
      canSave: maxSeverity !== "error",
      requiresWarningConfirmation: maxSeverity === "warning",
      items: diagnostics,
      fieldDiagnostics
    }
  };
}
