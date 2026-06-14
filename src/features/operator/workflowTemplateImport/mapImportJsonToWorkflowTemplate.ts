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
      // select 타입에 options가 없으면 crash 위험이 있어 안전 기본값 주입
      if (field.type === "select" && (!field.options || field.options.length === 0)) {
        return {
          ...field,
          options: ["none"]
        };
      }
      return field;
    });

  // 2. inputSchema 조립 및 디폴트 값 바인딩
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
    titleRequired: sourceInputSchema.titleRequired !== false // 기본값 true
  };

  // 3. 보관/보존 정책 조립
  const retentionCapabilities = t.retentionCapabilities || { ...DEFAULT_RETENTION_CAPABILITIES };
  const operatorRetentionPolicy = t.operatorRetentionPolicy || { ...DEFAULT_OPERATOR_RETENTION_POLICY };
  
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
    createdAt: t.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
