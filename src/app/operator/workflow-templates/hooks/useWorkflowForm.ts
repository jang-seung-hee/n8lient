// [useWorkflowForm.ts]
// WorkflowForm의 모든 상태 관리, 초기 데이터 바인딩, Import diagnostics 추적,
// debounce onDraftChange, handleSubmitInternal 로직을 담당하는 커스텀 훅입니다.
// WorkflowForm.tsx는 이 훅을 사용하여 UI 조립만 담당합니다.

import { useEffect, useState, useRef, useCallback } from "react";
import type { WorkflowTemplate, ConfigSchemaField, ResultAccessMode } from "@/types/n8lient";
import type { WorkflowImportDiagnostics } from "@/features/operator/workflowTemplateImport";
import { playAppSound } from "@/lib/appSound";
import { validateWorkflowFormBeforeSubmit } from "./workflowFormSubmitValidator";
import { assembleWorkflowTemplate } from "./workflowTemplateAssembler";

// ────────────────────────────────────────────────────────────────────────────
// 타입 정의
// ────────────────────────────────────────────────────────────────────────────

/** useWorkflowForm 훅 입력 파라미터 */
export interface UseWorkflowFormParams {
  initialData: WorkflowTemplate | null;
  isEditMode: boolean;
  onSubmit: (template: WorkflowTemplate) => Promise<void>;
  diagnostics?: WorkflowImportDiagnostics | null;
  onDraftChange?: (currentTemplate: WorkflowTemplate) => void;
  isStructureLocked?: boolean;
}

/** RetentionLevel 공통 타입 */
type RetentionLevel = "notify_only" | "processed_result" | "full_archive";

// ────────────────────────────────────────────────────────────────────────────
// 훅 본체
// ────────────────────────────────────────────────────────────────────────────

export function useWorkflowForm({
  initialData,
  isEditMode,
  onSubmit,
  diagnostics = null,
  onDraftChange,
  isStructureLocked = false,
}: UseWorkflowFormParams) {
  // ── 타이머 관리 ──────────────────────────────────────────────────────────
  const timeoutIdsRef = useRef<number[]>([]);
  const draftDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((id) => clearTimeout(id));
      if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
    };
  }, []);

  // ── 폼 기본 필드 상태 ─────────────────────────────────────────────────────
  const [workflowKey, setWorkflowKey] = useState("");
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [status, setStatus] = useState<"draft" | "published" | "disabled">("published");
  const [webhookSecretId, setWebhookSecretId] = useState("");
  const [n8nServerKey, setN8nServerKey] = useState("main");
  const [acceptedTypes, setAcceptedTypes] = useState<string[]>(["text"]);
  const [allowedFileTypesStr, setAllowedFileTypesStr] = useState("pdf, jpg, png, xlsx");
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(50);
  const [schemaFields, setSchemaFields] = useState<ConfigSchemaField[]>([]);
  const [titleRequired, setTitleRequired] = useState(true);

  // v2.4 신규 inputSchema 필드 상태 추가
  const [requiredInputMode, setRequiredInputMode] = useState<"none" | "at_least_one" | "all">("at_least_one");
  const [requiredInputTypes, setRequiredInputTypes] = useState<string[]>(["text"]);
  const [maxFiles, setMaxFiles] = useState<number>(1);

  // ── [v2.6] retentionCapabilities 상태 ────────────────────────────────────
  const [maxLevel, setMaxLevel] = useState<RetentionLevel>("full_archive");
  const [supportedLevels, setSupportedLevels] = useState<RetentionLevel[]>([
    "notify_only", "processed_result", "full_archive",
  ]);
  const [capsDefaultLevel, setCapsDefaultLevel] = useState<RetentionLevel>("full_archive");
  const [supportsProcessorResult, setSupportsProcessorResult] = useState(true);
  const [supportsOriginalFileRefs, setSupportsOriginalFileRefs] = useState(true);
  const [supportsResultRefs, setSupportsResultRefs] = useState(true);
  const [supportsEmailNotification, setSupportsEmailNotification] = useState(false);
  const [supportsResultPolicyRouter, setSupportsResultPolicyRouter] = useState(true);

  // ── [v2.6] operatorRetentionPolicy 상태 ──────────────────────────────────
  const [opAllowedLevels, setOpAllowedLevels] = useState<RetentionLevel[]>([
    "notify_only", "processed_result", "full_archive",
  ]);
  const [opDefaultLevel, setOpDefaultLevel] = useState<RetentionLevel>("full_archive");
  const [allowCompanyOverride, setAllowCompanyOverride] = useState(true);
  const [allowUserOverride, setAllowUserOverride] = useState(true);

  // ── [v2.9] Import 누락 필드 추적 상태 ────────────────────────────────────
  const [missingImportFields, setMissingImportFields] = useState<Set<string>>(new Set());
  const [touchedImportFields, setTouchedImportFields] = useState<Set<string>>(new Set());

  // ── [v1.0] resultAccessPolicy 상태 ──────────────────────────────────────
  const [defaultAccessMode, setDefaultAccessMode] = useState<ResultAccessMode>("private");

  // ── 수정/배포 일관성 보호 상태 ─────────────────────────────────────────────
  const [originalSchemaKeys, setOriginalSchemaKeys] = useState<Set<string>>(new Set());
  const [originalStatus, setOriginalStatus] = useState<"draft" | "published" | "disabled" | null>(null);

  // ────────────────────────────────────────────────────────────────────────────
  // [v2.9] 누락 필드 기반 undefined 복구 헬퍼
  // 터치되지 않은 누락 필드는 undefined를 반환하여 검증 에러를 유지합니다.
  // ────────────────────────────────────────────────────────────────────────────
  function getMaybeUndefined<T>(fieldPath: string, currentVal: T): T | undefined {
    if (missingImportFields.has(fieldPath) && !touchedImportFields.has(fieldPath)) {
      return undefined;
    }
    return currentVal;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // useEffect: Import diagnostics 기반 누락 필드 초기화
  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initialData && diagnostics && !isEditMode) {
      const missing = new Set<string>();
      diagnostics.items.forEach((item) => {
        if (
          item.level === "error" &&
          (item.field.startsWith("retentionCapabilities.") ||
            item.field.startsWith("operatorRetentionPolicy."))
        ) {
          missing.add(item.field);
        }
      });
      setMissingImportFields(missing);
      setTouchedImportFields(new Set());
    } else if (!initialData) {
      setMissingImportFields(new Set());
      setTouchedImportFields(new Set());
    }
  }, [initialData, diagnostics, isEditMode]);

  // ────────────────────────────────────────────────────────────────────────────
  // useEffect: 초기 데이터 주입
  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initialData) {
      setWorkflowKey(initialData.workflowKey);
      setName(initialData.name);
      setShortName(initialData.shortName);
      setDescription(initialData.description || "");
      setVersion(initialData.version);
      setStatus(initialData.status);
      setWebhookSecretId(initialData.webhookSecretId);
      setN8nServerKey(initialData.n8nServerKey || "main");
      setAcceptedTypes(initialData.inputSchema.acceptedInputTypes);
      setAllowedFileTypesStr(initialData.inputSchema.allowedFileTypes?.join(", ") || "");
      setMaxFileSizeMB(initialData.inputSchema.maxFileSizeMB || 50);
      setTitleRequired(initialData.inputSchema.titleRequired !== false);
      setSchemaFields(initialData.configSchema || []);

      // v2.4 신규 필드 데이터 주입
      setRequiredInputMode(initialData.inputSchema.requiredInputMode || "at_least_one");
      setRequiredInputTypes(initialData.inputSchema.requiredInputTypes || initialData.inputSchema.acceptedInputTypes || ["text"]);
      setMaxFiles(initialData.inputSchema.maxFiles !== undefined ? initialData.inputSchema.maxFiles : (initialData.inputSchema.acceptedInputTypes.some(t => ["file", "audio", "image"].includes(t)) ? 1 : 0));

      const caps = initialData.retentionCapabilities || {
        maxLevel: "full_archive" as RetentionLevel,
        supportedLevels: ["notify_only", "processed_result", "full_archive"] as RetentionLevel[],
        defaultLevel: "full_archive" as RetentionLevel,
        supportsProcessorResult: true, supportsOriginalFileRefs: true,
        supportsResultRefs: true, supportsEmailNotification: false, supportsResultPolicyRouter: true,
      };
      setMaxLevel(caps.maxLevel || "full_archive");
      setSupportedLevels(caps.supportedLevels);
      setCapsDefaultLevel(caps.defaultLevel);
      setSupportsProcessorResult(caps.supportsProcessorResult);
      setSupportsOriginalFileRefs(caps.supportsOriginalFileRefs);
      setSupportsResultRefs(caps.supportsResultRefs);
      setSupportsEmailNotification(caps.supportsEmailNotification);
      setSupportsResultPolicyRouter(caps.supportsResultPolicyRouter);

      const op = initialData.operatorRetentionPolicy || {
        allowedLevels: ["notify_only", "processed_result", "full_archive"] as RetentionLevel[],
        defaultLevel: "full_archive" as RetentionLevel,
        allowCompanyOverride: true, allowUserOverride: true,
      };
      setOpAllowedLevels(op.allowedLevels);
      setOpDefaultLevel(op.defaultLevel);
      setAllowCompanyOverride(op.allowCompanyOverride);
      setAllowUserOverride(op.allowUserOverride);

      const accessPolicy = initialData.resultAccessPolicy || { defaultAccessMode: "private" };
      setDefaultAccessMode(accessPolicy.defaultAccessMode || "private");

      if (isEditMode) {
        setOriginalSchemaKeys(new Set(initialData.configSchema.map((f) => f.key)));
        setOriginalStatus(initialData.status);
      } else {
        setOriginalSchemaKeys(new Set());
        setOriginalStatus(null);
      }
    } else {
      // 신규 등록 폼 전체 리셋
      setWorkflowKey(""); setName(""); setShortName(""); setDescription("");
      setVersion("1.0.0"); setStatus("published"); setWebhookSecretId(""); setN8nServerKey("main");
      setAcceptedTypes(["text"]); setAllowedFileTypesStr("pdf, jpg, png, xlsx");
      setMaxFileSizeMB(50); setSchemaFields([]); setTitleRequired(true);
      setRequiredInputMode("at_least_one");
      setRequiredInputTypes(["text"]);
      setMaxFiles(1);
      setMaxLevel("full_archive");
      setSupportedLevels(["notify_only", "processed_result", "full_archive"]);
      setCapsDefaultLevel("full_archive");
      setSupportsProcessorResult(true); setSupportsOriginalFileRefs(true);
      setSupportsResultRefs(true); setSupportsEmailNotification(false); setSupportsResultPolicyRouter(true);
      setOpAllowedLevels(["notify_only", "processed_result", "full_archive"]);
      setOpDefaultLevel("full_archive"); setAllowCompanyOverride(true); setAllowUserOverride(true);
      setDefaultAccessMode("private");
      setOriginalSchemaKeys(new Set()); setOriginalStatus(null);
    }
  }, [initialData, isEditMode]);

  // ────────────────────────────────────────────────────────────────────────────
  // 상태 스냅샷 헬퍼 (assembleWorkflowTemplate에 전달할 공통 파라미터 객체 생성)
  // ────────────────────────────────────────────────────────────────────────────
  const buildAssembleParams = () => ({
    workflowKey, name, shortName, description, version, status,
    webhookSecretId, n8nServerKey, acceptedTypes, allowedFileTypesStr,
    maxFileSizeMB, titleRequired, schemaFields,
    maxLevel, supportedLevels, capsDefaultLevel,
    supportsProcessorResult, supportsOriginalFileRefs, supportsResultRefs,
    supportsEmailNotification, supportsResultPolicyRouter,
    opAllowedLevels, opDefaultLevel, allowCompanyOverride, allowUserOverride,
    requiredInputMode, requiredInputTypes, maxFiles,
    defaultAccessMode,
    initialData, getMaybeUndefined,
  });

  // ────────────────────────────────────────────────────────────────────────────
  // notifyDraftChange: 300ms debounce 후 조립된 template을 부모에게 전달
  // ────────────────────────────────────────────────────────────────────────────
  const notifyDraftChange = useCallback(() => {
    if (!onDraftChange) return;
    if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
    draftDebounceRef.current = setTimeout(() => {
      const currentTemplate = assembleWorkflowTemplate({ ...buildAssembleParams(), cleanSchema: false });
      onDraftChange(currentTemplate);
    }, 300);
  }, [
    onDraftChange,
    workflowKey, name, shortName, description, version, status,
    webhookSecretId, n8nServerKey, acceptedTypes, allowedFileTypesStr,
    maxFileSizeMB, titleRequired, schemaFields,
    maxLevel, supportedLevels, capsDefaultLevel,
    supportsProcessorResult, supportsOriginalFileRefs, supportsResultRefs,
    supportsEmailNotification, supportsResultPolicyRouter,
    opAllowedLevels, opDefaultLevel, allowCompanyOverride, allowUserOverride,
    requiredInputMode, requiredInputTypes, maxFiles,
    defaultAccessMode,
    initialData, missingImportFields, touchedImportFields,
  ]);

  // ── 폼 상태 변경 시 debounce 통보 (초기 주입 직후 제외) ──────────────────
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) { isFirstRenderRef.current = false; return; }
    notifyDraftChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    workflowKey, name, shortName, description, version, status,
    webhookSecretId, n8nServerKey, acceptedTypes, allowedFileTypesStr,
    maxFileSizeMB, titleRequired, schemaFields,
    maxLevel, supportedLevels, capsDefaultLevel,
    supportsProcessorResult, supportsOriginalFileRefs, supportsResultRefs,
    supportsEmailNotification, supportsResultPolicyRouter,
    opAllowedLevels, opDefaultLevel, allowCompanyOverride, allowUserOverride,
    requiredInputMode, requiredInputTypes, maxFiles,
    defaultAccessMode,
  ]);

  // initialData가 바뀔 때마다 isFirstRender를 리셋합니다.
  useEffect(() => { isFirstRenderRef.current = true; }, [initialData]);

  // ────────────────────────────────────────────────────────────────────────────
  // ConfigSchema 핸들러
  // ────────────────────────────────────────────────────────────────────────────

  const handleMoveField = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= schemaFields.length) return;
    playAppSound("click");
    const next = [...schemaFields];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setSchemaFields(next);
  };

  const handleSelectOptionsChange = (index: number, options: string[], tempOptionsStr: string) => {
    const next = [...schemaFields];
    next[index] = { ...next[index], options, tempOptionsStr } as any;
    setSchemaFields(next);
  };

  const handleAddField = () => {
    setSchemaFields([...schemaFields, {
      key: "", label: "", type: "text", required: true,
      defaultValue: "", defaultValueSource: "", options: [], placeholder: "", description: "",
    }]);
  };

  const handleRemoveField = (index: number) => {
    const target = schemaFields[index];
    if (isEditMode && originalStatus === "published" && originalSchemaKeys.has(target.key)) {
      playAppSound("notify");
      const id = setTimeout(() => alert(
        "배포 일관성 보호 정책에 의해, 이미 배포 완료(published)된 N8N 워크플로우의 기존 설정 필드 Key는 삭제할 수 없습니다. 큰 변경은 복제 기능을 사용하십시오."
      ), 150) as any;
      timeoutIdsRef.current.push(id);
      return;
    }
    playAppSound("click");
    const next = [...schemaFields];
    next.splice(index, 1);
    setSchemaFields(next);
  };

  const handleFieldChange = (index: number, keyProp: keyof ConfigSchemaField, val: any) => {
    const target = schemaFields[index];
    if (keyProp === "key" && isEditMode && originalStatus === "published" && originalSchemaKeys.has(target.key)) {
      playAppSound("notify");
      const id = setTimeout(() => alert(
        "배포 일관성 보호 정책에 의해, 이미 배포 완료(published)된 N8N 워크플로우의 기존 설정 필드 Key는 수정할 수 없습니다. 큰 변경은 복제 기능을 사용하십시오."
      ), 150) as any;
      timeoutIdsRef.current.push(id);
      return;
    }
    const next = [...schemaFields];
    next[index] = { ...next[index], [keyProp]: val };
    setSchemaFields(next);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // handleSubmitInternal: 검증 → payload 조립 → onSubmit 호출
  // ────────────────────────────────────────────────────────────────────────────
  const handleSubmitInternal = (e: React.FormEvent) => {
    e.preventDefault();
    playAppSound("click");

    const isValid = validateWorkflowFormBeforeSubmit({
      timeoutIdsRef, workflowKey, schemaFields,
      opAllowedLevels, supportedLevels, opDefaultLevel, capsDefaultLevel, maxLevel,
    });
    if (!isValid) return;

    const template = assembleWorkflowTemplate({ ...buildAssembleParams(), cleanSchema: true });
    onSubmit(template);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // 터치 마크 헬퍼
  // ────────────────────────────────────────────────────────────────────────────
  const markTouched = (fieldPath: string) => {
    setTouchedImportFields((prev) => {
      const next = new Set(prev);
      next.add(fieldPath);
      return next;
    });
  };

  // ────────────────────────────────────────────────────────────────────────────
  // 훅 반환값
  // ────────────────────────────────────────────────────────────────────────────
  return {
    workflowKey, setWorkflowKey, name, setName, shortName, setShortName,
    description, setDescription, version, setVersion, status, setStatus,
    webhookSecretId, setWebhookSecretId, n8nServerKey, setN8nServerKey,
    acceptedTypes, setAcceptedTypes, allowedFileTypesStr, setAllowedFileTypesStr,
    maxFileSizeMB, setMaxFileSizeMB, schemaFields, setSchemaFields,
    titleRequired, setTitleRequired,
    maxLevel, setMaxLevel, supportedLevels, setSupportedLevels,
    capsDefaultLevel, setCapsDefaultLevel,
    supportsProcessorResult, setSupportsProcessorResult,
    supportsOriginalFileRefs, setSupportsOriginalFileRefs,
    supportsResultRefs, setSupportsResultRefs,
    supportsEmailNotification, setSupportsEmailNotification,
    supportsResultPolicyRouter, setSupportsResultPolicyRouter,
    opAllowedLevels, setOpAllowedLevels, opDefaultLevel, setOpDefaultLevel,
    allowCompanyOverride, setAllowCompanyOverride,
    allowUserOverride, setAllowUserOverride,
    requiredInputMode, setRequiredInputMode,
    requiredInputTypes, setRequiredInputTypes,
    maxFiles, setMaxFiles,
    defaultAccessMode, setDefaultAccessMode,
    originalSchemaKeys, originalStatus,
    missingImportFields, touchedImportFields, markTouched,
    handleMoveField, handleSelectOptionsChange, handleAddField,
    handleRemoveField, handleFieldChange, handleSubmitInternal,
  };
}
