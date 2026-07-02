// 이 파일은 검증 완료된 표준 Import JSON 명세서 데이터를 폼 컴포넌트(WorkflowForm)가 즉시 소비할 수 있도록 N8Lient의 WorkflowTemplate 최종 데이터 구조로 맵핑 및 가공합니다.
// 한국어 주석 표준을 준수합니다.

import type { WorkflowTemplate } from "@/types/n8lient";
import {
  DEFAULT_RETENTION_CAPABILITIES,
  DEFAULT_OPERATOR_RETENTION_POLICY,
  getDefaultRetentionPolicy
} from "@/types/n8lient";
import type { WorkflowTemplateImportDraft } from "./workflowTemplateImportTypes";

/**
 * 표준 Import 초안(Draft) 데이터에서 N8Lient의 정합성 기준을 만족하는 WorkflowTemplate 최종 모델을 생성합니다.
 * @param draft 표준 Import 초안 데이터
 */
export function mapImportJsonToWorkflowTemplate(
  draft: WorkflowTemplateImportDraft
): WorkflowTemplate {
  const t = draft.workflowTemplate;

  // 1. 보안 가이드라인 준수: 민감 키워드가 포함되거나 구형 드라이브 키는 다시 한 번 정밀하게 격리 차단
  const sensitiveKeywords = [
    "token", "secret", "credential", "credentialid", "accesstoken",
    "refreshtoken", "privatekey", "apikey", "api_key", "password",
    "serviceaccount", "clientsecret", "authorization", "bearer", "cookie", "firebaseadmin"
  ];

  const cleanedConfigSchema = (t.configSchema || [])
    .filter(field => {
      const fKey = (field.key || "").trim().toLowerCase();
      if (fKey === "googledriveexportfolderid") return false; // 구형 키 제외
      return !sensitiveKeywords.some(keyword => fKey.includes(keyword));
    })
    .map(field => {
      // [버그 수정] Import JSON에서 inputType 또는 type 중 하나만 있을 수 있으므로
      // 두 필드를 모두 수용하여 앱 내부 canonical 필드인 'type'으로 정규화합니다.
      // 우선순위: field.type > field.inputType
      const normalizedType = (field as any).type || (field as any).inputType || "";

      // select 타입에 options가 없으면 crash 위험이 있어 안전 기본값 주입
      const fieldData: any = {
        key: field.key,
        label: field.label || "",
        type: normalizedType,
        required: field.required === true,
        placeholder: field.placeholder || "",
        description: field.description || "",
        options: normalizedType === "select" ? (field.options && field.options.length > 0 ? field.options : ["none"]) : undefined,
        defaultValue: field.defaultValue !== undefined ? field.defaultValue : undefined,
        defaultValueSource: field.defaultValueSource !== undefined ? field.defaultValueSource : undefined,
        tempOptionsStr: field.tempOptionsStr !== undefined ? field.tempOptionsStr : undefined
      };

      // conditionalRequired 보존 및 Google Drive 자동 보완 적용
      const gdFolderKeys = ["googleDriveMdFolderName", "googleDriveMdFolderId", "googleDriveAttachmentFolderName", "googleDriveAttachmentFolderId"];
      const isGdFolderKey = gdFolderKeys.includes(field.key);
      const hasOptionalExportProvider = (t.configSchema || []).some(f => f.key === "optionalExportProvider");

      if (field.conditionalRequired) {
        fieldData.conditionalRequired = {
          field: field.conditionalRequired.field,
          equals: field.conditionalRequired.equals
        };
      } else if (isGdFolderKey && hasOptionalExportProvider) {
        fieldData.conditionalRequired = {
          field: "optionalExportProvider",
          equals: "google_drive"
        };
      } else {
        fieldData.conditionalRequired = null;
      }

      // undefined 필드 소거
      Object.keys(fieldData).forEach(key => {
        if (fieldData[key] === undefined) {
          delete fieldData[key];
        }
      });

      return fieldData;
    });

  // 2. inputSchema 조립 및 디폴트 값 바인딩 (v2.3 하위 호환성 확보)
  const sourceInputSchema = t.inputSchema || ({} as any);
  
  const acceptedInputTypes = sourceInputSchema.acceptedInputTypes || ["text"];
  const allowedFileTypes = sourceInputSchema.allowedFileTypes || [];
  const maxFileSizeMB = sourceInputSchema.maxFileSizeMB ?? 20;
  const titleRequired = sourceInputSchema.titleRequired !== false; // 기본값 true (undefined 시 필수 처리)

  // requiredInputMode 기본값 보완: "at_least_one"
  const requiredInputMode = sourceInputSchema.requiredInputMode || "at_least_one";

  // requiredInputTypes 기본값 보완: acceptedInputTypes
  const requiredInputTypes = sourceInputSchema.requiredInputTypes || acceptedInputTypes;

  // maxFiles 기본값 보완: 미디어 존재 시 1, 미존재 시 0
  const hasMedia = acceptedInputTypes.includes("file") || acceptedInputTypes.includes("image") || acceptedInputTypes.includes("audio");
  const defaultMaxFiles = hasMedia ? 1 : 0;
  const maxFiles = sourceInputSchema.maxFiles !== undefined ? sourceInputSchema.maxFiles : defaultMaxFiles;

  const inputSchema = {
    acceptedInputTypes,
    allowedFileTypes,
    maxFileSizeMB,
    titleRequired,
    requiredInputMode,
    requiredInputTypes,
    maxFiles
  };

  // 3. 보관/보존 정책 조립 (누락 필드가 있을 경우 기본값과 안전하게 병합)
  const retentionCapabilities = {
    ...DEFAULT_RETENTION_CAPABILITIES,
    ...(t.retentionCapabilities || {})
  };
  const operatorRetentionPolicy = {
    ...DEFAULT_OPERATOR_RETENTION_POLICY,
    ...(t.operatorRetentionPolicy || {})
  };
  
  // 하위 호환성용 retentionPolicy 매핑
  const defaultOpLevel = operatorRetentionPolicy.defaultLevel || "full_archive";
  const retentionPolicy = t.retentionPolicy || getDefaultRetentionPolicy(defaultOpLevel);

  // 4. 최종 WorkflowTemplate 매핑 객체 조립
  return {
    workflowKey: (t.workflowKey || "").trim(),
    name: (t.name || "").trim(),
    shortName: (t.shortName || "").trim(),
    description: (t.description || "").trim(),
    version: (t.version || "").trim() || "1.0.0",
    status: t.status || "draft",
    webhookSecretId: (t.webhookSecretId || "").trim() || (t.workflowKey || "").trim(),
    n8nServerKey: (t.n8nServerKey || "").trim() || "main",
    configSchemaVersion: t.configSchemaVersion || 1,
    inputSchema,
    configSchema: cleanedConfigSchema,
    retentionPolicy,
    retentionCapabilities,
    operatorRetentionPolicy,
    activeSettingsProfile: t.activeSettingsProfile || null,
    createdAt: t.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
