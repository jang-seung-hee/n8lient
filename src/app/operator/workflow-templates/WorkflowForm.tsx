// 이 파일은 N8N 워크플로우의 등록 및 수정을 위한 폼 컴포넌트입니다.
// 기존 비즈니스 검증 로직을 내포하여 page.tsx를 경량화합니다.

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { WorkflowTemplate, ConfigSchemaField } from "@/types/n8lient";
import type { WorkflowImportDiagnostics } from "@/features/operator/workflowTemplateImport";
import { playAppSound } from "@/lib/appSound";
import ConfigSchemaEditor from "./components/ConfigSchemaEditor";
import WorkflowRetentionPolicyForm from "./components/WorkflowRetentionPolicyForm";
import WorkflowInputSchemaForm from "./components/WorkflowInputSchemaForm";
import WorkflowBasicInfoForm from "./components/WorkflowBasicInfoForm";

interface WorkflowFormProps {
  initialData: WorkflowTemplate | null;
  isEditMode: boolean;
  onSubmit: (template: WorkflowTemplate) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  diagnostics?: WorkflowImportDiagnostics | null;
  /** Import 등록 모드에서만 전달: 현재 폼 상태가 바뀔 때마다 호출되어 부모에서 실시간 재검증을 수행할 수 있습니다. */
  onDraftChange?: (currentTemplate: WorkflowTemplate) => void;
}

export function WorkflowForm({
  initialData,
  isEditMode,
  onSubmit,
  onCancel,
  loading,
  diagnostics = null,
  onDraftChange,
}: WorkflowFormProps) {
  // alert 지연 호출용 타이머 ID 보존 목록
  const timeoutIdsRef = useRef<number[]>([]);
  // 300ms debounce 용 타이머 ID
  const draftDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((id) => clearTimeout(id));
      if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
    };
  }, []);

  const addDelayedAlert = (message: string, delay = 150) => {
    const id = setTimeout(() => {
      alert(message);
    }, delay) as any;
    timeoutIdsRef.current.push(id);
  };

  // 1. 폼 로컬 상태 선언
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
  
  // [v2.6] retentionCapabilities 상태 정의
  const [maxLevel, setMaxLevel] = useState<"notify_only" | "processed_result" | "full_archive">("full_archive");
  const [supportedLevels, setSupportedLevels] = useState<("notify_only" | "processed_result" | "full_archive")[]>([
    "notify_only",
    "processed_result",
    "full_archive",
  ]);
  const [capsDefaultLevel, setCapsDefaultLevel] = useState<"notify_only" | "processed_result" | "full_archive">("full_archive");
  const [supportsProcessorResult, setSupportsProcessorResult] = useState(true);
  const [supportsOriginalFileRefs, setSupportsOriginalFileRefs] = useState(true);
  const [supportsResultRefs, setSupportsResultRefs] = useState(true);
  const [supportsEmailNotification, setSupportsEmailNotification] = useState(false);
  const [supportsResultPolicyRouter, setSupportsResultPolicyRouter] = useState(true);

  // [v2.6] operatorRetentionPolicy 상태 정의
  const [opAllowedLevels, setOpAllowedLevels] = useState<("notify_only" | "processed_result" | "full_archive")[]>([
    "notify_only",
    "processed_result",
    "full_archive",
  ]);
  const [opDefaultLevel, setOpDefaultLevel] = useState<"notify_only" | "processed_result" | "full_archive">("full_archive");
  const [allowCompanyOverride, setAllowCompanyOverride] = useState(true);
  const [allowUserOverride, setAllowUserOverride] = useState(true);

  // 수정/배포 일관성 보호용 원본 정보 보존
  const [originalSchemaKeys, setOriginalSchemaKeys] = useState<Set<string>>(new Set());
  const [originalStatus, setOriginalStatus] = useState<"draft" | "published" | "disabled" | null>(null);

  // 2. 초기 데이터 주입
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

      // capabilities 매핑
      const caps = initialData.retentionCapabilities || {
        maxLevel: "full_archive",
        supportedLevels: ["notify_only", "processed_result", "full_archive"],
        defaultLevel: "full_archive",
        supportsProcessorResult: true,
        supportsOriginalFileRefs: true,
        supportsResultRefs: true,
        supportsEmailNotification: false,
        supportsResultPolicyRouter: true,
      };
      setMaxLevel(caps.maxLevel || "full_archive");
      setSupportedLevels(caps.supportedLevels);
      setCapsDefaultLevel(caps.defaultLevel);
      setSupportsProcessorResult(caps.supportsProcessorResult);
      setSupportsOriginalFileRefs(caps.supportsOriginalFileRefs);
      setSupportsResultRefs(caps.supportsResultRefs);
      setSupportsEmailNotification(caps.supportsEmailNotification);
      setSupportsResultPolicyRouter(caps.supportsResultPolicyRouter);

      // operator policy 매핑
      const op = initialData.operatorRetentionPolicy || {
        allowedLevels: ["notify_only", "processed_result", "full_archive"],
        defaultLevel: "full_archive",
        allowCompanyOverride: true,
        allowUserOverride: true,
      };
      setOpAllowedLevels(op.allowedLevels);
      setOpDefaultLevel(op.defaultLevel);
      setAllowCompanyOverride(op.allowCompanyOverride);
      setAllowUserOverride(op.allowUserOverride);

      if (isEditMode) {
        setOriginalSchemaKeys(new Set(initialData.configSchema.map((f) => f.key)));
        setOriginalStatus(initialData.status);
      } else {
        setOriginalSchemaKeys(new Set());
        setOriginalStatus(null);
      }
    } else {
      // 신규 등록 폼 리셋
      setWorkflowKey("");
      setName("");
      setShortName("");
      setDescription("");
      setVersion("1.0.0");
      setStatus("published");
      setWebhookSecretId("");
      setN8nServerKey("main");
      setAcceptedTypes(["text"]);
      setAllowedFileTypesStr("pdf, jpg, png, xlsx");
      setMaxFileSizeMB(50);
      setSchemaFields([]);
      setTitleRequired(true);
      
      setMaxLevel("full_archive");
      setSupportedLevels(["notify_only", "processed_result", "full_archive"]);
      setCapsDefaultLevel("full_archive");
      setSupportsProcessorResult(true);
      setSupportsOriginalFileRefs(true);
      setSupportsResultRefs(true);
      setSupportsEmailNotification(false);
      setSupportsResultPolicyRouter(true);

      setOpAllowedLevels(["notify_only", "processed_result", "full_archive"]);
      setOpDefaultLevel("full_archive");
      setAllowCompanyOverride(true);
      setAllowUserOverride(true);

      setOriginalSchemaKeys(new Set());
      setOriginalStatus(null);
    }
  }, [initialData, isEditMode]);

  // 3. 실시간 폼 상태 조립 및 부모 통보 (onDraftChange가 있을 때만 실행)
  //    현재 폼의 모든 state를 WorkflowTemplate 형태로 조립한 뒤 300ms debounce 후 전달합니다.
  const notifyDraftChange = useCallback(() => {
    if (!onDraftChange) return;
    if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
    draftDebounceRef.current = setTimeout(() => {
      const { getDefaultRetentionPolicy } = require("@/types/n8lient");
      const allowedFileTypes = allowedFileTypesStr
        .split(",")
        .map((x: string) => x.trim().toLowerCase())
        .filter(Boolean);
      const currentTemplate: WorkflowTemplate = {
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
        },
        configSchema: schemaFields.map((f) => {
          const copy = { ...f } as any;
          if (copy.type === "select") {
            const src = copy.tempOptionsStr !== undefined ? copy.tempOptionsStr : (copy.options?.join(", ") || "");
            copy.options = src.split(",").map((x: string) => x.trim()).filter(Boolean);
          }
          delete copy.tempOptionsStr;
          return copy;
        }),
        retentionPolicy: getDefaultRetentionPolicy(opDefaultLevel),
        retentionCapabilities: {
          maxLevel,
          supportedLevels,
          defaultLevel: capsDefaultLevel,
          supportsProcessorResult,
          supportsOriginalFileRefs,
          supportsResultRefs,
          supportsEmailNotification,
          supportsResultPolicyRouter,
        },
        operatorRetentionPolicy: {
          allowedLevels: opAllowedLevels,
          defaultLevel: opDefaultLevel,
          allowCompanyOverride,
          allowUserOverride,
        },
        createdAt: initialData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onDraftChange(currentTemplate);
    }, 300);
  }, [
    onDraftChange,
    workflowKey, name, shortName, description, version, status,
    webhookSecretId, n8nServerKey,
    acceptedTypes, allowedFileTypesStr, maxFileSizeMB, titleRequired,
    schemaFields,
    maxLevel, supportedLevels, capsDefaultLevel,
    supportsProcessorResult, supportsOriginalFileRefs, supportsResultRefs,
    supportsEmailNotification, supportsResultPolicyRouter,
    opAllowedLevels, opDefaultLevel, allowCompanyOverride, allowUserOverride,
    initialData,
  ]);

  // onDraftChange가 제공된 경우에만 폼 상태가 변경될 때 부모에게 통보합니다.
  // 초기 데이터 주입(initialData 변경) 시에는 호출하지 않도록 별도 마운트 플래그를 사용합니다.
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    notifyDraftChange();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    workflowKey, name, shortName, description, version, status,
    webhookSecretId, n8nServerKey,
    acceptedTypes, allowedFileTypesStr, maxFileSizeMB, titleRequired,
    schemaFields,
    maxLevel, supportedLevels, capsDefaultLevel,
    supportsProcessorResult, supportsOriginalFileRefs, supportsResultRefs,
    supportsEmailNotification, supportsResultPolicyRouter,
    opAllowedLevels, opDefaultLevel, allowCompanyOverride, allowUserOverride,
  ]);

  // initialData가 바뀔 때(Import 적용 직후 포함)마다 isFirstRender를 리셋합니다.
  useEffect(() => {
    isFirstRenderRef.current = true;
  }, [initialData]);

  // 4. 로컬 이벤트 핸들러




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
    next[index] = {
      ...next[index],
      options,
      tempOptionsStr,
    } as any;
    setSchemaFields(next);
  };

  const handleAddField = () => {
    const newField: ConfigSchemaField = {
      key: "",
      label: "",
      type: "text",
      required: true,
      defaultValue: "",
      defaultValueSource: "",
      options: [],
      placeholder: "",
      description: "",
    };
    setSchemaFields([...schemaFields, newField]);
  };

  const handleRemoveField = (index: number) => {
    const targetField = schemaFields[index];
    if (isEditMode && originalStatus === "published" && originalSchemaKeys.has(targetField.key)) {
      playAppSound("notify");
      addDelayedAlert("배포 일관성 보호 정책에 의해, 이미 배포 완료(published)된 N8N 워크플로우의 기존 설정 필드 Key는 삭제할 수 없습니다. 큰 변경은 복제 기능을 사용하십시오.");
      return;
    }
    playAppSound("click");
    const next = [...schemaFields];
    next.splice(index, 1);
    setSchemaFields(next);
  };

  const handleFieldChange = (index: number, keyProp: keyof ConfigSchemaField, val: any) => {
    const targetField = schemaFields[index];
    if (keyProp === "key" && isEditMode && originalStatus === "published" && originalSchemaKeys.has(targetField.key)) {
      playAppSound("notify");
      addDelayedAlert("배포 일관성 보호 정책에 의해, 이미 배포 완료(published)된 N8N 워크플로우의 기존 설정 필드 Key는 수정할 수 없습니다. 큰 변경은 복제 기능을 사용하십시오.");
      return;
    }
    const next = [...schemaFields];
    next[index] = {
      ...next[index],
      [keyProp]: val,
    };
    setSchemaFields(next);
  };

  const handleSubmitInternal = (e: React.FormEvent) => {
    e.preventDefault();
    playAppSound("click");

    // 입력값 검증 (기존 page.tsx 로직 완벽 보존)
    const keyRegex = /^[a-z0-9-]+$/;
    if (!keyRegex.test(workflowKey)) {
      playAppSound("notify");
      addDelayedAlert("N8N 워크플로우 Key는 영문 소문자, 숫자, 하이픈(-)만 허용합니다. (예: expense-report)");
      return;
    }

    const schemaKeys = new Set<string>();
    const keyPattern = /^[a-zA-Z0-9]+$/;

    for (let i = 0; i < schemaFields.length; i++) {
      const field = schemaFields[i];
      const trimmedKey = field.key.trim();

      if (!trimmedKey) {
        playAppSound("notify");
        addDelayedAlert(`${i + 1}번째 설정 필드의 Key가 비어 있습니다. 입력해 주십시오.`);
        return;
      }

      if (!keyPattern.test(trimmedKey)) {
        playAppSound("notify");
        addDelayedAlert(`${i + 1}번째 설정 필드 Key(${trimmedKey})에 허용되지 않는 한글, 공백, 또는 특수문자가 포함되어 있습니다. (영문/숫자만 허용)`);
        return;
      }

      if (schemaKeys.has(trimmedKey)) {
        playAppSound("notify");
        addDelayedAlert(`설정 필드 Key 중복 오류: 중복되는 Key '${trimmedKey}'가 존재합니다.`);
        return;
      }
      schemaKeys.add(trimmedKey);
    }

    const allowedFileTypes = allowedFileTypesStr
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);

    // [v2.6] 검증 규칙: operatorRetentionPolicy.allowedLevels는 retentionCapabilities.supportedLevels 안에 있어야 한다.
    for (const lvl of opAllowedLevels) {
      if (!supportedLevels.includes(lvl)) {
        playAppSound("notify");
        addDelayedAlert(`검증 오류: 오퍼레이터 허용 레벨(${lvl})은 워크플로우 지원 레벨(${supportedLevels.join(", ")})에 포함되어야 합니다.`);
        return;
      }
    }
    // [v2.6] 검증 규칙: operatorRetentionPolicy.defaultLevel은 allowedLevels 안에 있어야 한다.
    if (!opAllowedLevels.includes(opDefaultLevel)) {
      playAppSound("notify");
      addDelayedAlert(`검증 오류: 오퍼레이터 기본 레벨(${opDefaultLevel})은 허용 레벨 목록(${opAllowedLevels.join(", ")})에 포함되어야 합니다.`);
      return;
    }
    // [v2.6] 검증 규칙: retentionCapabilities.defaultLevel은 supportedLevels 안에 있어야 한다.
    if (!supportedLevels.includes(capsDefaultLevel)) {
      playAppSound("notify");
      addDelayedAlert(`검증 오류: 기본 지원 레벨(${capsDefaultLevel})은 지원 레벨 목록(${supportedLevels.join(", ")})에 포함되어야 합니다.`);
      return;
    }

    // [v2.7] 레벨 순서에 따른 maxLevel 범위 내 검증
    const RETENTION_LEVEL_ORDER = {
      notify_only: 1,
      processed_result: 2,
      full_archive: 3,
    };
    const maxVal = RETENTION_LEVEL_ORDER[maxLevel];
    for (const lvl of opAllowedLevels) {
      if (RETENTION_LEVEL_ORDER[lvl] > maxVal) {
        playAppSound("notify");
        addDelayedAlert(`검증 오류: 오퍼레이터 허용 레벨(${lvl})이 워크플로우 최대 보관 지원 단계(${maxLevel})를 초과할 수 없습니다.`);
        return;
      }
    }

    // 최종 제출용 schemaFields 정제 (tempOptionsStr가 있는 경우 최종 파싱 반영 및 UI 임시 필드 제거)
    const cleanedSchemaFields = schemaFields.map(field => {
      const copy = { ...field } as any;
      if (copy.type === "select") {
        const sourceStr = copy.tempOptionsStr !== undefined ? copy.tempOptionsStr : (copy.options?.join(", ") || "");
        copy.options = sourceStr.split(",").map((x: string) => x.trim()).filter(Boolean);
      }
      delete copy.tempOptionsStr;
      return copy;
    });

    // 보관 정책 생성 (getDefaultRetentionPolicy)
    const { getDefaultRetentionPolicy } = require("@/types/n8lient");

    const template: WorkflowTemplate = {
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
      },
      configSchema: cleanedSchemaFields,
      retentionPolicy: getDefaultRetentionPolicy(opDefaultLevel), // 하위 호환
      retentionCapabilities: {
        maxLevel,
        supportedLevels,
        defaultLevel: capsDefaultLevel,
        supportsProcessorResult,
        supportsOriginalFileRefs,
        supportsResultRefs,
        supportsEmailNotification,
        supportsResultPolicyRouter,
      },
      operatorRetentionPolicy: {
        allowedLevels: opAllowedLevels,
        defaultLevel: opDefaultLevel,
        allowCompanyOverride,
        allowUserOverride,
      },
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSubmit(template);
  };

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "20px",
      }}
    >
      <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111111", margin: "0 0 16px 0", borderBottom: "1px solid #f3f4f6", paddingBottom: "10px" }}>
        {isEditMode ? "⚙️ N8N 워크플로우 수정" : "➕ 새 N8N 워크플로우 등록"}
      </h3>
      <form onSubmit={handleSubmitInternal} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
        />

        <WorkflowRetentionPolicyForm
          maxLevel={maxLevel}
          setMaxLevel={setMaxLevel}
          supportedLevels={supportedLevels}
          setSupportedLevels={setSupportedLevels}
          capsDefaultLevel={capsDefaultLevel}
          setCapsDefaultLevel={setCapsDefaultLevel}
          supportsProcessorResult={supportsProcessorResult}
          setSupportsProcessorResult={setSupportsProcessorResult}
          supportsOriginalFileRefs={supportsOriginalFileRefs}
          setSupportsOriginalFileRefs={setSupportsOriginalFileRefs}
          supportsResultRefs={supportsResultRefs}
          setSupportsResultRefs={setSupportsResultRefs}
          supportsResultPolicyRouter={supportsResultPolicyRouter}
          setSupportsResultPolicyRouter={setSupportsResultPolicyRouter}
          opAllowedLevels={opAllowedLevels}
          setOpAllowedLevels={setOpAllowedLevels}
          opDefaultLevel={opDefaultLevel}
          setOpDefaultLevel={setOpDefaultLevel}
          allowCompanyOverride={allowCompanyOverride}
          setAllowCompanyOverride={setAllowCompanyOverride}
          allowUserOverride={allowUserOverride}
          setAllowUserOverride={setAllowUserOverride}
          diagnostics={diagnostics}
        />

        <WorkflowInputSchemaForm
          titleRequired={titleRequired}
          setTitleRequired={setTitleRequired}
          acceptedTypes={acceptedTypes}
          setAcceptedTypes={setAcceptedTypes}
          allowedFileTypesStr={allowedFileTypesStr}
          setAllowedFileTypesStr={setAllowedFileTypesStr}
          maxFileSizeMB={maxFileSizeMB}
          setMaxFileSizeMB={setMaxFileSizeMB}
          diagnostics={diagnostics}
        />

        <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "4px 0" }} />
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
        />

        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              height: "38px",
              backgroundColor: loading ? "#4b5563" : "#111111",
              color: "#ffffff",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "저장 중..." : isEditMode ? "⚙️ N8N 워크플로우 수정 저장" : "🚀 N8N 워크플로우 등록"}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            style={{
              height: "38px",
              backgroundColor: "#f3f4f6",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "0 14px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
