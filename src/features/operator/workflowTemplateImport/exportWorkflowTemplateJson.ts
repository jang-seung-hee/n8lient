// 이 파일은 기등록된 WorkflowTemplate을 N8Lient 표준 Import JSON으로 내보내기 위한 헬퍼 유틸 함수를 제공합니다.
// 한국어 주석 표준을 준수합니다.

import type { WorkflowTemplate } from "@/types/n8lient";

/**
 * N8Lient 표준 Import JSON 구조 상수
 * 이 스키마 버전이 적용된 JSON만 WorkflowImportPanel에서 업로드 가능합니다.
 */
export const N8LIENT_IMPORT_SCHEMA_VERSION = "n8lient.workflowTemplateImport.v1" as const;

/**
 * WorkflowTemplate → N8Lient 표준 Import JSON 페이로드로 변환합니다.
 * - diagnostics, UI 임시 상태값은 포함되지 않습니다.
 * - webhookSecretId는 실제 Secret이 아닌 참조 ID이므로 포함됩니다.
 *
 * @param template Firestore에서 조회된 WorkflowTemplate 객체
 * @returns 표준 Import JSON 페이로드 (파일 저장 가능)
 */
export function buildWorkflowTemplateImportJson(template: WorkflowTemplate): object {
  // inputSchema에서 undefined 필드 안전하게 필터링
  const cleanInputSchema = {
    titleRequired: template.inputSchema.titleRequired === true,
    acceptedInputTypes: template.inputSchema.acceptedInputTypes || [],
    allowedFileTypes: template.inputSchema.allowedFileTypes || [],
    maxFileSizeMB: template.inputSchema.maxFileSizeMB !== undefined ? template.inputSchema.maxFileSizeMB : 20,
    requiredInputMode: template.inputSchema.requiredInputMode || "at_least_one",
    requiredInputTypes: template.inputSchema.requiredInputTypes || template.inputSchema.acceptedInputTypes || [],
    maxFiles: template.inputSchema.maxFiles !== undefined ? template.inputSchema.maxFiles : (template.inputSchema.acceptedInputTypes?.some((t: string) => ["file", "image", "audio"].includes(t)) ? 1 : 0)
  };

  // configSchema에서 undefined 소거 및 conditionalRequired 보존
  const cleanConfigSchema = (template.configSchema || []).map(field => {
    const cleanField: any = {
      key: field.key,
      label: field.label || "",
      type: field.type,
      required: field.required === true,
      placeholder: field.placeholder || "",
      description: field.description || "",
    };

    if (field.options && field.options.length > 0) {
      cleanField.options = field.options;
    }
    if (field.defaultValue !== undefined) {
      cleanField.defaultValue = field.defaultValue;
    }
    if (field.defaultValueSource !== undefined) {
      cleanField.defaultValueSource = field.defaultValueSource;
    }
    if (field.conditionalRequired !== undefined && field.conditionalRequired !== null) {
      cleanField.conditionalRequired = {
        field: field.conditionalRequired.field,
        equals: field.conditionalRequired.equals
      };
    } else {
      cleanField.conditionalRequired = null;
    }

    return cleanField;
  });

  // UI 전용 임시 필드 및 민감값을 제외한 안전한 데이터만 추출합니다.
  const safeTemplate: any = {
    workflowKey: template.workflowKey,
    name: template.name,
    shortName: template.shortName,
    description: template.description || "",
    version: template.version || "1.0.0",
    status: template.status || "draft",
    webhookSecretId: template.webhookSecretId,  // 실제 Secret이 아닌 참조 ID
    n8nServerKey: template.n8nServerKey || "main",
    configSchemaVersion: template.configSchemaVersion || 1,
    inputSchema: cleanInputSchema,
    configSchema: cleanConfigSchema,
    retentionPolicy: template.retentionPolicy || null,
    retentionCapabilities: template.retentionCapabilities || null,
    operatorRetentionPolicy: template.operatorRetentionPolicy || null,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };

  // undefined 필드 최종 소거
  Object.keys(safeTemplate).forEach(key => {
    if (safeTemplate[key] === undefined) {
      delete safeTemplate[key];
    }
  });

  return {
    schemaVersion: N8LIENT_IMPORT_SCHEMA_VERSION,
    workflowTemplate: safeTemplate,
  };
}

/**
 * 다운로드 파일명을 생성합니다.
 * 규칙: {워크플로우명}_{버전}_{최종수정날짜YYYYMMDD}.json
 *
 * - 파일명 불가 문자( \ / : * ? " < > | 공백)는 _ 로 치환합니다.
 * - 날짜 우선순위: updatedAt > modifiedAt > createdAt > 현재날짜
 * - Firestore Timestamp, Date 객체, ISO string 모두 안전하게 처리합니다.
 *
 * @param template WorkflowTemplate 객체
 * @returns 생성된 파일명 문자열 (예: 아이디어_캐처_1.0.0_20260614.json)
 */
export function buildWorkflowTemplateExportFileName(template: WorkflowTemplate): string {
  // 1. 워크플로우명 - 파일명 불가 문자를 _ 로 치환
  const safeName = (template.name || "workflow")
    .replace(/[\\/:*?"<>|]/g, "_")  // 파일명 금지 특수문자 치환
    .replace(/\s+/g, "_")           // 연속 공백을 _ 로 치환
    .replace(/_+/g, "_")            // 연속 _ 를 하나로 압축
    .replace(/^_|_$/g, "");         // 앞뒤 _ 제거

  // 2. 버전
  const version = (template.version || "1.0.0").trim();

  // 3. 날짜 추출 (updatedAt > modifiedAt > createdAt > 오늘)
  const rawDate =
    (template as any).updatedAt ||
    (template as any).modifiedAt ||
    (template as any).createdAt ||
    null;

  const dateStr = extractDateString(rawDate);

  return `${safeName}_${version}_${dateStr}.json`;
}

/**
 * 다양한 날짜 형식에서 YYYYMMDD 문자열을 추출합니다.
 * - Firestore Timestamp (seconds 필드 포함) 처리
 * - Date 객체 처리
 * - ISO string (예: "2026-06-14T00:00:00.000Z") 처리
 * - 변환 불가 시 오늘 날짜 사용
 *
 * @param rawDate 날짜 원본 값 (어떤 형식이든 허용)
 * @returns "YYYYMMDD" 형식 문자열
 */
function extractDateString(rawDate: any): string {
  try {
    let date: Date | null = null;

    if (!rawDate) {
      date = new Date();
    } else if (rawDate instanceof Date) {
      date = rawDate;
    } else if (typeof rawDate === "object" && typeof rawDate.seconds === "number") {
      // Firestore Timestamp 형식
      date = new Date(rawDate.seconds * 1000);
    } else if (typeof rawDate === "object" && typeof rawDate.toDate === "function") {
      // Firestore Timestamp 인스턴스 (toDate() 메서드 존재)
      date = rawDate.toDate();
    } else if (typeof rawDate === "string") {
      date = new Date(rawDate);
    } else if (typeof rawDate === "number") {
      date = new Date(rawDate);
    } else {
      date = new Date();
    }

    if (!date || isNaN(date.getTime())) {
      date = new Date();
    }

    const yyyy = date.getFullYear().toString();
    const mm = (date.getMonth() + 1).toString().padStart(2, "0");
    const dd = date.getDate().toString().padStart(2, "0");

    return `${yyyy}${mm}${dd}`;
  } catch {
    // 변환 실패 시 오늘 날짜로 fallback
    const now = new Date();
    const yyyy = now.getFullYear().toString();
    const mm = (now.getMonth() + 1).toString().padStart(2, "0");
    const dd = now.getDate().toString().padStart(2, "0");
    return `${yyyy}${mm}${dd}`;
  }
}

/**
 * Blob 다운로드를 실행합니다.
 * 서버 API 없이 클라이언트에서 직접 JSON 파일을 다운로드합니다.
 *
 * @param payload 다운로드할 JSON 객체
 * @param fileName 저장할 파일명
 */
export function downloadJsonAsFile(payload: object, fileName: string): void {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // 메모리 누수 방지를 위해 Object URL을 즉시 해제합니다.
  URL.revokeObjectURL(url);
}
