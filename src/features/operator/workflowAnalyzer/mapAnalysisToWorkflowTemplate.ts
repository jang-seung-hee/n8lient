// 이 파일은 가져온 워크플로우 템플릿 분석 초안(Draft) 데이터를 N8Lient의 기존 WorkflowForm 컴포넌트가 initialData로 바로 활용할 수 있는 타입 구조로 변환 및 매핑하는 기능을 제공합니다.
// 한국어 주석 표준을 준수합니다.

import type { WorkflowTemplate } from "@/types/n8lient";
import {
  DEFAULT_RETENTION_CAPABILITIES,
  DEFAULT_OPERATOR_RETENTION_POLICY,
  getDefaultRetentionPolicy
} from "@/types/n8lient";
import type { WorkflowTemplateImportDraft } from "./workflowImportTypes";

/**
 * 분석 초안(Draft) 내의 워크플로우 템플릿 Partial 데이터를 WorkflowForm initialData 규격에 맞춰
 * 안전한 정합성이 보장된 WorkflowTemplate 최종 객체로 매핑합니다.
 * @param draft 워크플로우 가져오기 초안 데이터
 */
export function mapAnalysisToWorkflowTemplate(
  draft: WorkflowTemplateImportDraft
): WorkflowTemplate {
  const t = draft.workflowTemplate;

  // 1. configSchema 내 잔존할 수 있는 민감 필드를 다시 한 번 정밀 정제하여 완전 격리
  const sensitiveKeywords = ["token", "secret", "credential", "privatekey", "apikey", "password"];
  const cleanedConfigSchema = (t.configSchema || [])
    .filter(field => {
      const fKey = (field.key || "").toLowerCase();
      // googleDriveExportFolderId(구형) 제거 및 민감단어 포함 필드 완전 제거
      if (fKey === "googledriveexportfolderid") return false;
      return !sensitiveKeywords.some(keyword => fKey.includes(keyword));
    })
    .map(field => {
      // select 타입에 options가 없으면 폼 크래시가 유발되므로 안전 기본값 부여
      if (field.type === "select" && (!field.options || field.options.length === 0)) {
        return {
          ...field,
          options: ["none"]
        };
      }
      return field;
    });

  // 2. inputSchema 조립 및 안전 기본값 매핑
  const sourceInputSchema = t.inputSchema || {
    acceptedInputTypes: ["text"],
    allowedFileTypes: [],
    maxFileSizeMB: 10,
    titleRequired: true
  };

  const inputSchema = {
    acceptedInputTypes: sourceInputSchema.acceptedInputTypes || ["text"],
    allowedFileTypes: sourceInputSchema.allowedFileTypes || [],
    maxFileSizeMB: sourceInputSchema.maxFileSizeMB ?? 10,
    titleRequired: sourceInputSchema.titleRequired !== false // 명시적 false가 아니면 true
  };

  // 3. 보관 정책 디폴트 처리
  const retentionCapabilities = t.retentionCapabilities || { ...DEFAULT_RETENTION_CAPABILITIES };
  const operatorRetentionPolicy = t.operatorRetentionPolicy || { ...DEFAULT_OPERATOR_RETENTION_POLICY };
  
  // 하위 호환성용 retentionPolicy 적용
  const defaultOpLevel = operatorRetentionPolicy.defaultLevel || "full_archive";
  const retentionPolicy = t.retentionPolicy || getDefaultRetentionPolicy(defaultOpLevel);

  // 4. 최종 정합성이 보장된 WorkflowTemplate 조립
  const mappedTemplate: WorkflowTemplate = {
    workflowKey: t.workflowKey || "",
    name: t.name || "",
    shortName: t.shortName || "",
    description: t.description || "",
    version: t.version || "1.0.0",
    status: t.status || "draft",
    webhookSecretId: t.webhookSecretId || t.workflowKey || "",
    n8nServerKey: t.n8nServerKey || "main",
    configSchemaVersion: t.configSchemaVersion || 1,
    inputSchema,
    configSchema: cleanedConfigSchema,
    retentionPolicy,
    retentionCapabilities,
    operatorRetentionPolicy,
    createdAt: t.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return mappedTemplate;
}
