// [workflowTemplateAssembler.ts]
// WorkflowForm의 폼 상태를 WorkflowTemplate 객체로 조립하는 유틸 함수입니다.
// notifyDraftChange(debounce)와 handleSubmitInternal에서 공통 사용합니다.

import type { WorkflowTemplate, ConfigSchemaField } from "@/types/n8lient";

/** RetentionLevel 공통 타입 */
type RetentionLevel = "notify_only" | "processed_result" | "full_archive";

// ────────────────────────────────────────────────────────────────────────────
// Template 조립 파라미터 타입
// ────────────────────────────────────────────────────────────────────────────

export interface AssembleTemplateParams {
  workflowKey: string;
  name: string;
  shortName: string;
  description: string;
  version: string;
  status: "draft" | "published" | "disabled";
  webhookSecretId: string;
  n8nServerKey: string;
  acceptedTypes: string[];
  allowedFileTypesStr: string;
  maxFileSizeMB: number;
  titleRequired: boolean;
  schemaFields: ConfigSchemaField[];
  maxLevel: RetentionLevel;
  supportedLevels: RetentionLevel[];
  capsDefaultLevel: RetentionLevel;
  supportsProcessorResult: boolean;
  supportsOriginalFileRefs: boolean;
  supportsResultRefs: boolean;
  supportsEmailNotification: boolean;
  supportsResultPolicyRouter: boolean;
  opAllowedLevels: RetentionLevel[];
  opDefaultLevel: RetentionLevel;
  allowCompanyOverride: boolean;
  allowUserOverride: boolean;
  requiredInputMode: "none" | "at_least_one" | "all";
  requiredInputTypes: string[];
  maxFiles: number;
  initialData: WorkflowTemplate | null;
  /** [v2.9] getMaybeUndefined 헬퍼: 터치되지 않은 누락 필드는 undefined 반환 */
  getMaybeUndefined: <T>(fieldPath: string, currentVal: T) => T | undefined;
  /** configSchema 정제 여부 (submit 시: true, draft 통보 시: false) */
  cleanSchema?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// select 옵션 파싱 (공용 유틸)
// ────────────────────────────────────────────────────────────────────────────

function parseSchemaFieldOptions(field: ConfigSchemaField): ConfigSchemaField {
  const copy = { ...field } as any;
  if (copy.type === "select") {
    const src =
      copy.tempOptionsStr !== undefined ? copy.tempOptionsStr : copy.options?.join(", ") || "";
    copy.options = src.split(",").map((x: string) => x.trim()).filter(Boolean);
  }
  delete copy.tempOptionsStr;
  return copy;
}

// ────────────────────────────────────────────────────────────────────────────
// WorkflowTemplate 조립 함수
// ────────────────────────────────────────────────────────────────────────────

export function assembleWorkflowTemplate({
  workflowKey, name, shortName, description, version, status,
  webhookSecretId, n8nServerKey,
  acceptedTypes, allowedFileTypesStr, maxFileSizeMB, titleRequired,
  schemaFields,
  maxLevel, supportedLevels, capsDefaultLevel,
  supportsProcessorResult, supportsOriginalFileRefs, supportsResultRefs,
  supportsEmailNotification, supportsResultPolicyRouter,
  opAllowedLevels, opDefaultLevel, allowCompanyOverride, allowUserOverride,
  requiredInputMode, requiredInputTypes, maxFiles,
  initialData,
  getMaybeUndefined,
  cleanSchema = false,
}: AssembleTemplateParams): WorkflowTemplate {
  const { getDefaultRetentionPolicy } = require("@/types/n8lient");

  const allowedFileTypes = allowedFileTypesStr
    .split(",")
    .map((x: string) => x.trim().toLowerCase())
    .filter(Boolean);

  const processedSchemaFields = cleanSchema
    ? schemaFields.map(parseSchemaFieldOptions)
    : schemaFields.map((f) => {
        const copy = { ...f } as any;
        if (copy.type === "select") {
          const src =
            copy.tempOptionsStr !== undefined ? copy.tempOptionsStr : copy.options?.join(", ") || "";
          copy.options = src.split(",").map((x: string) => x.trim()).filter(Boolean);
        }
        delete copy.tempOptionsStr;
        return copy;
      });

  return {
    workflowKey,
    name,
    shortName,
    description: description || undefined,
    version,
    status,
    webhookSecretId: webhookSecretId.trim() || workflowKey,
    n8nServerKey: n8nServerKey.trim() || "main",
    configSchemaVersion: 1,
    inputSchema: {
      acceptedInputTypes: acceptedTypes as Array<"text" | "file" | "audio" | "image">,
      allowedFileTypes,
      maxFileSizeMB,
      titleRequired,
      requiredInputMode,
      requiredInputTypes: requiredInputTypes as Array<"text" | "file" | "audio" | "image">,
      maxFiles,
    },
    configSchema: processedSchemaFields,
    retentionPolicy: getDefaultRetentionPolicy(opDefaultLevel),
    retentionCapabilities: {
      maxLevel: getMaybeUndefined("retentionCapabilities.maxLevel", maxLevel) as any,
      supportedLevels: getMaybeUndefined("retentionCapabilities.supportedLevels", supportedLevels) as any,
      defaultLevel: getMaybeUndefined("retentionCapabilities.defaultLevel", capsDefaultLevel) as any,
      supportsProcessorResult: getMaybeUndefined("retentionCapabilities.supportsProcessorResult", supportsProcessorResult) as any,
      supportsOriginalFileRefs: getMaybeUndefined("retentionCapabilities.supportsOriginalFileRefs", supportsOriginalFileRefs) as any,
      supportsResultRefs: getMaybeUndefined("retentionCapabilities.supportsResultRefs", supportsResultRefs) as any,
      supportsEmailNotification: getMaybeUndefined("retentionCapabilities.supportsEmailNotification", supportsEmailNotification) as any,
      supportsResultPolicyRouter: getMaybeUndefined("retentionCapabilities.supportsResultPolicyRouter", supportsResultPolicyRouter) as any,
    },
    operatorRetentionPolicy: {
      allowedLevels: getMaybeUndefined("operatorRetentionPolicy.allowedLevels", opAllowedLevels) as any,
      defaultLevel: getMaybeUndefined("operatorRetentionPolicy.defaultLevel", opDefaultLevel) as any,
      allowCompanyOverride: getMaybeUndefined("operatorRetentionPolicy.allowCompanyOverride", allowCompanyOverride) as any,
      allowUserOverride: getMaybeUndefined("operatorRetentionPolicy.allowUserOverride", allowUserOverride) as any,
    },
    createdAt: initialData?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
