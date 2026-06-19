// 이 파일은 N8N 워크플로우의 등록 및 수정을 위한 폼 UI 컴포넌트입니다.
// 상태 관리 및 비즈니스 로직은 hooks/useWorkflowForm.ts에 위임합니다.

"use client";

import type { WorkflowTemplate, WorkflowTemplateUsageSummary } from "@/types/n8lient";
import type { WorkflowImportDiagnostics } from "@/features/operator/workflowTemplateImport";
import { useWorkflowForm } from "./hooks/useWorkflowForm";
import ConfigSchemaEditor from "./components/ConfigSchemaEditor";
import WorkflowRetentionPolicyForm from "./components/WorkflowRetentionPolicyForm";
import WorkflowInputSchemaForm from "./components/WorkflowInputSchemaForm";
import WorkflowBasicInfoForm from "./components/WorkflowBasicInfoForm";

// ────────────────────────────────────────────────────────────────────────────
// Props 타입 정의
// ────────────────────────────────────────────────────────────────────────────

interface WorkflowFormProps {
  initialData: WorkflowTemplate | null;
  isEditMode: boolean;
  onSubmit: (template: WorkflowTemplate) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  diagnostics?: WorkflowImportDiagnostics | null;
  /** Import 등록 모드에서만 전달: 현재 폼 상태가 바뀔 때마다 호출되어 부모에서 실시간 재검증을 수행할 수 있습니다. */
  onDraftChange?: (currentTemplate: WorkflowTemplate) => void;
  usageSummary?: WorkflowTemplateUsageSummary;
  isStructureLocked?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// WorkflowForm 컴포넌트 (UI 조립 전용)
// ────────────────────────────────────────────────────────────────────────────

export function WorkflowForm({
  initialData,
  isEditMode,
  onSubmit,
  onCancel,
  loading,
  diagnostics = null,
  onDraftChange,
  usageSummary,
  isStructureLocked = false,
}: WorkflowFormProps) {
  // 모든 상태 및 핸들러를 훅에서 가져옵니다.
  const {
    workflowKey, setWorkflowKey,
    name, setName,
    shortName, setShortName,
    description, setDescription,
    version, setVersion,
    status, setStatus,
    webhookSecretId, setWebhookSecretId,
    n8nServerKey, setN8nServerKey,
    acceptedTypes, setAcceptedTypes,
    allowedFileTypesStr, setAllowedFileTypesStr,
    maxFileSizeMB, setMaxFileSizeMB,
    titleRequired, setTitleRequired,
    schemaFields,
    maxLevel, setMaxLevel,
    supportedLevels, setSupportedLevels,
    capsDefaultLevel, setCapsDefaultLevel,
    supportsProcessorResult, setSupportsProcessorResult,
    supportsOriginalFileRefs, setSupportsOriginalFileRefs,
    supportsResultRefs, setSupportsResultRefs,
    supportsEmailNotification, setSupportsEmailNotification,
    supportsResultPolicyRouter, setSupportsResultPolicyRouter,
    opAllowedLevels, setOpAllowedLevels,
    opDefaultLevel, setOpDefaultLevel,
    allowCompanyOverride, setAllowCompanyOverride,
    allowUserOverride, setAllowUserOverride,
    requiredInputMode, setRequiredInputMode,
    requiredInputTypes, setRequiredInputTypes,
    maxFiles, setMaxFiles,
    originalSchemaKeys,
    originalStatus,
    markTouched,
    handleMoveField,
    handleSelectOptionsChange,
    handleAddField,
    handleRemoveField,
    handleFieldChange,
    handleSubmitInternal,
  } = useWorkflowForm({
    initialData,
    isEditMode,
    onSubmit,
    diagnostics,
    onDraftChange,
    isStructureLocked,
  });

  // ── UI 렌더링 ────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "20px",
      }}
    >
      <h3
        style={{
          fontSize: "15px",
          fontWeight: 700,
          color: "#111111",
          margin: "0 0 16px 0",
          borderBottom: "1px solid #f3f4f6",
          paddingBottom: "10px",
        }}
      >
        {isEditMode ? "⚙️ N8N 워크플로우 수정" : "➕ 새 N8N 워크플로우 등록"}
      </h3>

      <form onSubmit={handleSubmitInternal} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* 기본 정보 섹션 */}
        <WorkflowBasicInfoForm
          workflowKey={workflowKey}
          setWorkflowKey={setWorkflowKey}
          name={name}
          setName={setName}
          shortName={shortName}
          setShortName={setShortName}
          version={version}
          setVersion={setVersion}
          status={status}
          setStatus={setStatus}
          webhookSecretId={webhookSecretId}
          setWebhookSecretId={setWebhookSecretId}
          n8nServerKey={n8nServerKey}
          setN8nServerKey={setN8nServerKey}
          description={description}
          setDescription={setDescription}
          isEditMode={isEditMode}
          diagnostics={diagnostics}
          isStructureLocked={isStructureLocked}
        />

        {/* 보관 정책 섹션 - 변경 시 touchedImportFields에 마크 */}
        <WorkflowRetentionPolicyForm
          maxLevel={maxLevel}
          setMaxLevel={(val) => { setMaxLevel(val); markTouched("retentionCapabilities.maxLevel"); }}
          supportedLevels={supportedLevels}
          setSupportedLevels={(val) => { setSupportedLevels(val); markTouched("retentionCapabilities.supportedLevels"); }}
          capsDefaultLevel={capsDefaultLevel}
          setCapsDefaultLevel={(val) => { setCapsDefaultLevel(val); markTouched("retentionCapabilities.defaultLevel"); }}
          supportsProcessorResult={supportsProcessorResult}
          setSupportsProcessorResult={(val) => { setSupportsProcessorResult(val); markTouched("retentionCapabilities.supportsProcessorResult"); }}
          supportsOriginalFileRefs={supportsOriginalFileRefs}
          setSupportsOriginalFileRefs={(val) => { setSupportsOriginalFileRefs(val); markTouched("retentionCapabilities.supportsOriginalFileRefs"); }}
          supportsResultRefs={supportsResultRefs}
          setSupportsResultRefs={(val) => { setSupportsResultRefs(val); markTouched("retentionCapabilities.supportsResultRefs"); }}
          supportsResultPolicyRouter={supportsResultPolicyRouter}
          setSupportsResultPolicyRouter={(val) => { setSupportsResultPolicyRouter(val); markTouched("retentionCapabilities.supportsResultPolicyRouter"); }}
          supportsEmailNotification={supportsEmailNotification}
          setSupportsEmailNotification={(val) => { setSupportsEmailNotification(val); markTouched("retentionCapabilities.supportsEmailNotification"); }}
          opAllowedLevels={opAllowedLevels}
          setOpAllowedLevels={(val) => { setOpAllowedLevels(val); markTouched("operatorRetentionPolicy.allowedLevels"); }}
          opDefaultLevel={opDefaultLevel}
          setOpDefaultLevel={(val) => { setOpDefaultLevel(val); markTouched("operatorRetentionPolicy.defaultLevel"); }}
          allowCompanyOverride={allowCompanyOverride}
          setAllowCompanyOverride={(val) => { setAllowCompanyOverride(val); markTouched("operatorRetentionPolicy.allowCompanyOverride"); }}
          allowUserOverride={allowUserOverride}
          setAllowUserOverride={(val) => { setAllowUserOverride(val); markTouched("operatorRetentionPolicy.allowUserOverride"); }}
          diagnostics={diagnostics}
          isStructureLocked={isStructureLocked}
        />

        {/* 입력 스키마 섹션 */}
        <WorkflowInputSchemaForm
          titleRequired={titleRequired}
          setTitleRequired={setTitleRequired}
          acceptedTypes={acceptedTypes}
          setAcceptedTypes={setAcceptedTypes}
          allowedFileTypesStr={allowedFileTypesStr}
          setAllowedFileTypesStr={setAllowedFileTypesStr}
          maxFileSizeMB={maxFileSizeMB}
          setMaxFileSizeMB={setMaxFileSizeMB}
          requiredInputMode={requiredInputMode}
          setRequiredInputMode={setRequiredInputMode}
          requiredInputTypes={requiredInputTypes}
          setRequiredInputTypes={setRequiredInputTypes}
          maxFiles={maxFiles}
          setMaxFiles={setMaxFiles}
          diagnostics={diagnostics}
          isStructureLocked={isStructureLocked}
        />

        <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "4px 0" }} />

        {/* 설정 스키마 에디터 */}
        <ConfigSchemaEditor
          schemaFields={schemaFields}
          isEditMode={isEditMode}
          originalStatus={originalStatus}
          originalSchemaKeys={originalSchemaKeys}
          onAddField={handleAddField}
          onRemoveField={handleRemoveField}
          onFieldChange={handleFieldChange}
          onMoveField={handleMoveField}
          onSelectOptionsChange={handleSelectOptionsChange}
          diagnostics={diagnostics}
          isStructureLocked={isStructureLocked}
        />

        {/* 저장 / 취소 버튼 */}
        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          <button
            type="submit"
            className="ux_button ux_button_primary"
            disabled={loading}
            style={{
              flex: 1,
              height: "38px",
              borderRadius: "6px",
              backgroundColor: loading ? "#4b5563" : undefined,
              border: loading ? "none" : undefined,
            }}
          >
            {loading
              ? "저장 중..."
              : isEditMode
              ? "⚙️ N8N 워크플로우 수정 저장"
              : "🚀 N8N 워크플로우 등록"}
          </button>

          <button
            type="button"
            className="ux_button ux_button_secondary"
            onClick={onCancel}
            style={{
              height: "38px",
              backgroundColor: "#f3f4f6",
              borderRadius: "6px",
              padding: "0 14px",
            }}
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
