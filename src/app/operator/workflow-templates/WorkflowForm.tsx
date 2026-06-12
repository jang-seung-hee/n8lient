// 이 파일은 N8N 워크플로우의 등록 및 수정을 위한 폼 컴포넌트입니다.
// 기존 비즈니스 검증 로직을 내포하여 page.tsx를 경량화합니다.

"use client";

import { useEffect, useState } from "react";
import type { WorkflowTemplate, ConfigSchemaField } from "@/types/n8lient";

interface WorkflowFormProps {
  initialData: WorkflowTemplate | null;
  isEditMode: boolean;
  onSubmit: (template: WorkflowTemplate) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export function WorkflowForm({
  initialData,
  isEditMode,
  onSubmit,
  onCancel,
  loading,
}: WorkflowFormProps) {
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

  // 3. 로컬 이벤트 핸들러
  const handleWorkflowKeyChange = (val: string) => {
    setWorkflowKey(val);
    if (!isEditMode) {
      setWebhookSecretId(val);
    }
  };

  const handleCheckboxChange = (type: string, checked: boolean) => {
    if (checked) {
      setAcceptedTypes([...acceptedTypes, type]);
    } else {
      setAcceptedTypes(acceptedTypes.filter((t) => t !== type));
    }
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
      alert("배포 일관성 보호 정책에 의해, 이미 배포 완료(published)된 N8N 워크플로우의 기존 설정 필드 Key는 삭제할 수 없습니다. 큰 변경은 복제 기능을 사용하십시오.");
      return;
    }
    const next = [...schemaFields];
    next.splice(index, 1);
    setSchemaFields(next);
  };

  const handleFieldChange = (index: number, keyProp: keyof ConfigSchemaField, val: any) => {
    const targetField = schemaFields[index];
    if (keyProp === "key" && isEditMode && originalStatus === "published" && originalSchemaKeys.has(targetField.key)) {
      alert("배포 일관성 보호 정책에 의해, 이미 배포 완료(published)된 N8N 워크플로우의 기존 설정 필드 Key는 수정할 수 없습니다. 큰 변경은 복제 기능을 사용하십시오.");
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

    // 입력값 검증 (기존 page.tsx 로직 완벽 보존)
    const keyRegex = /^[a-z0-9-]+$/;
    if (!keyRegex.test(workflowKey)) {
      alert("N8N 워크플로우 Key는 영문 소문자, 숫자, 하이픈(-)만 허용합니다. (예: expense-report)");
      return;
    }

    const schemaKeys = new Set<string>();
    const keyPattern = /^[a-zA-Z0-9]+$/;

    for (let i = 0; i < schemaFields.length; i++) {
      const field = schemaFields[i];
      const trimmedKey = field.key.trim();

      if (!trimmedKey) {
        alert(`${i + 1}번째 설정 필드의 Key가 비어 있습니다. 입력해 주십시오.`);
        return;
      }

      if (!keyPattern.test(trimmedKey)) {
        alert(`${i + 1}번째 설정 필드 Key(${trimmedKey})에 허용되지 않는 한글, 공백, 또는 특수문자가 포함되어 있습니다. (영문/숫자만 허용)`);
        return;
      }

      if (schemaKeys.has(trimmedKey)) {
        alert(`설정 필드 Key 중복 오류: 중복되는 Key '${trimmedKey}'가 존재합니다.`);
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
        alert(`검증 오류: 오퍼레이터 허용 레벨(${lvl})은 워크플로우 지원 레벨(${supportedLevels.join(", ")})에 포함되어야 합니다.`);
        return;
      }
    }
    // [v2.6] 검증 규칙: operatorRetentionPolicy.defaultLevel은 allowedLevels 안에 있어야 한다.
    if (!opAllowedLevels.includes(opDefaultLevel)) {
      alert(`검증 오류: 오퍼레이터 기본 레벨(${opDefaultLevel})은 허용 레벨 목록(${opAllowedLevels.join(", ")})에 포함되어야 합니다.`);
      return;
    }
    // [v2.6] 검증 규칙: retentionCapabilities.defaultLevel은 supportedLevels 안에 있어야 한다.
    if (!supportedLevels.includes(capsDefaultLevel)) {
      alert(`검증 오류: 기본 지원 레벨(${capsDefaultLevel})은 지원 레벨 목록(${supportedLevels.join(", ")})에 포함되어야 합니다.`);
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
        alert(`검증 오류: 오퍼레이터 허용 레벨(${lvl})이 워크플로우 최대 보관 지원 단계(${maxLevel})를 초과할 수 없습니다.`);
        return;
      }
    }

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
      },
      configSchema: schemaFields,
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
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>워크플로우 Key * (영문소문자/숫자/-)</label>
            <input
              type="text"
              value={workflowKey}
              onChange={(e) => handleWorkflowKeyChange(e.target.value)}
              placeholder="예: expense-report"
              required
              disabled={isEditMode}
              style={{
                height: "36px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                padding: "0 8px",
                fontSize: "13px",
                outline: "none",
                color: isEditMode ? "#9ca3af" : "#111111",
                backgroundColor: isEditMode ? "#f3f4f6" : "#ffffff",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>워크플로우 이름 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 지출결의서 자동 정리"
              required
              style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", color: "#111111" }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>줄임말 *</label>
            <input
              type="text"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="예: 지결자"
              required
              style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", color: "#111111" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>버전 *</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.0"
              required
              style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", color: "#111111" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>배포 상태 *</label>
            <select
              value={status}
              onChange={(e: any) => setStatus(e.target.value)}
              style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", backgroundColor: "#ffffff", color: "#111111" }}
            >
              <option value="published">배포완료 (published)</option>
              <option value="draft">작성중 (draft)</option>
              <option value="disabled">비활성 (disabled)</option>
            </select>
          </div>
        </div>

        {/* [v2.6] retentionCapabilities (워크플로우 보관 지원 범위) */}
        <div style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#111111", margin: 0 }}>⚙️ 워크플로우 보관 지원 범위 (Capabilities)</h4>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>워크플로우 최대 보관 지원 단계 (maxLevel) *</label>
              <select
                value={maxLevel}
                onChange={(e: any) => setMaxLevel(e.target.value)}
                style={{ height: "32px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 6px", fontSize: "12px", outline: "none", backgroundColor: "#ffffff" }}
              >
                <option value="notify_only">1단계: 알림/로그형 (notify_only)</option>
                <option value="processed_result">2단계: 가공지식 저장형 (processed_result)</option>
                <option value="full_archive">3단계: 원본 포함 지식보관형 (full_archive)</option>
              </select>
              <span style={{ fontSize: "10.5px", color: "#6b7280" }}>
                💡 이 워크플로우가 기술적으로 지원 가능한 최대 보관 수준입니다. 고객사 계약 또는 회사 설정은 이 범위를 초과할 수 없습니다.
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>기본 지원 레벨</label>
              <select
                value={capsDefaultLevel}
                onChange={(e: any) => setCapsDefaultLevel(e.target.value)}
                style={{ height: "32px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 6px", fontSize: "12px", outline: "none", backgroundColor: "#ffffff" }}
              >
                {supportedLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>기술적 지원 레벨 (다중 선택)</span>
            <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
              {["notify_only", "processed_result", "full_archive"].map((lvl) => (
                <label key={lvl} style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={supportedLevels.includes(lvl as any)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSupportedLevels([...supportedLevels, lvl as any]);
                      } else {
                        setSupportedLevels(supportedLevels.filter((l) => l !== lvl));
                      }
                    }}
                  />
                  {lvl === "notify_only" && "알림/로그형"}
                  {lvl === "processed_result" && "가공지식 저장형"}
                  {lvl === "full_archive" && "원본 포함 지식보관형"}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px", marginTop: "4px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
              <input type="checkbox" checked={supportsProcessorResult} onChange={(e) => setSupportsProcessorResult(e.target.checked)} />
              processorResult 생성 지원
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
              <input type="checkbox" checked={supportsOriginalFileRefs} onChange={(e) => setSupportsOriginalFileRefs(e.target.checked)} />
              originalFileRefs 지원
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
              <input type="checkbox" checked={supportsResultRefs} onChange={(e) => setSupportsResultRefs(e.target.checked)} />
              resultRefs 지원
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
              <input type="checkbox" checked={supportsResultPolicyRouter} onChange={(e) => setSupportsResultPolicyRouter(e.target.checked)} />
              Result Policy Router 지원
            </label>
          </div>
        </div>

        {/* [v2.6] operatorRetentionPolicy (오퍼레이터 허용 보관 정책) */}
        <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#166534", margin: 0 }}>🛡️ 오퍼레이터 허용 보관 정책 (Operator Policy)</h4>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#14532d" }}>고객사에 허용할 레벨 (다중 선택)</span>
            <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
              {supportedLevels.map((lvl) => (
                <label key={lvl} style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", color: "#14532d" }}>
                  <input
                    type="checkbox"
                    checked={opAllowedLevels.includes(lvl)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setOpAllowedLevels([...opAllowedLevels, lvl]);
                      } else {
                        setOpAllowedLevels(opAllowedLevels.filter((l) => l !== lvl));
                      }
                    }}
                  />
                  {lvl === "notify_only" && "알림/로그형"}
                  {lvl === "processed_result" && "가공지식 저장형"}
                  {lvl === "full_archive" && "원본 포함 지식보관형"}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#14532d" }}>오퍼레이터 기본 지정 레벨</label>
              <select
                value={opDefaultLevel}
                onChange={(e: any) => setOpDefaultLevel(e.target.value)}
                style={{ height: "32px", border: "1px solid #bbf7d0", borderRadius: "6px", padding: "0 6px", fontSize: "12px", outline: "none", backgroundColor: "#ffffff" }}
              >
                {opAllowedLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#14532d", marginTop: "4px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
              <input type="checkbox" checked={allowCompanyOverride} onChange={(e) => setAllowCompanyOverride(e.target.checked)} />
              회사 관리자의 정책 수정 허용
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
              <input type="checkbox" checked={allowUserOverride} onChange={(e) => setAllowUserOverride(e.target.checked)} />
              일반 사용자의 개인 보관 선호 수정 허용
            </label>
          </div>
        </div>


        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>Webhook Secret 참조 ID *</label>
            <input
              type="text"
              value={webhookSecretId}
              onChange={(e) => setWebhookSecretId(e.target.value)}
              placeholder="예: expense-report"
              required
              style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", color: "#111111" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>n8n 서버 식별 Key *</label>
            <input
              type="text"
              value={n8nServerKey}
              onChange={(e) => setN8nServerKey(e.target.value)}
              placeholder="main"
              required
              style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", color: "#111111" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="N8N 워크플로우 명세에 관한 상세 설명을 적으십시오."
            style={{ minHeight: "40px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "6px 8px", fontSize: "13px", outline: "none", color: "#111111", resize: "vertical" }}
          />
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "4px 0" }} />
        <h4 style={{ fontSize: "12.5px", fontWeight: 700, color: "#374151", margin: 0 }}>⚙️ inputSchema (입력 정보 요구사항)</h4>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>허용 입력 형태 (다중 선택 가능)</span>
          <div style={{ display: "flex", gap: "16px", fontSize: "13px" }}>
            {["text", "file", "audio", "image"].map((type) => (
              <label key={type} style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", color: "#111111" }}>
                <input
                  type="checkbox"
                  checked={acceptedTypes.includes(type)}
                  onChange={(e) => handleCheckboxChange(type, e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>허용 파일 확장자 (쉼표 구분)</label>
            <input
              type="text"
              value={allowedFileTypesStr}
              onChange={(e) => setAllowedFileTypesStr(e.target.value)}
              placeholder="pdf, jpg, png, xlsx"
              style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", color: "#111111" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>최대 파일 크기 (MB)</label>
            <input
              type="number"
              value={maxFileSizeMB}
              onChange={(e) => setMaxFileSizeMB(Number(e.target.value))}
              required
              style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", color: "#111111" }}
            />
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "4px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h4 style={{ fontSize: "12.5px", fontWeight: 700, color: "#374151", margin: 0 }}>⚙️ configSchema (설정 맵핑 요구사항)</h4>
          <button
            type="button"
            onClick={handleAddField}
            style={{ fontSize: "11px", fontWeight: 600, color: "#2563eb", background: "none", border: "none", cursor: "pointer" }}
          >
            ＋ 설정 필드 추가
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {schemaFields.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#9ca3af", textAlign: "center", margin: "8px 0" }}>
              지정된 설정 요구사항이 없습니다. 필드를 추가해 주십시오.
            </p>
          ) : (
            schemaFields.map((field, idx) => {
              const isExistingField = isEditMode && originalStatus === "published" && originalSchemaKeys.has(field.key);

              return (
                <div
                  key={idx}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    padding: "10px",
                    backgroundColor: "#f9fafb",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {!isExistingField && (
                    <button
                      type="button"
                      onClick={() => handleRemoveField(idx)}
                      style={{
                        position: "absolute",
                        top: "6px",
                        right: "8px",
                        border: "none",
                        background: "none",
                        color: "#ef4444",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      제거
                    </button>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginRight: "32px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#4b5563" }}>설정 Key * (영문/숫자)</span>
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) => handleFieldChange(idx, "key", e.target.value)}
                        placeholder="예: googleDriveFolderId"
                        required
                        disabled={isExistingField}
                        style={{
                          height: "30px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          padding: "0 6px",
                          fontSize: "12px",
                          outline: "none",
                          color: isExistingField ? "#9ca3af" : "#111111",
                          backgroundColor: isExistingField ? "#f3f4f6" : "#ffffff",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#4b5563" }}>라벨 이름 *</span>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => handleFieldChange(idx, "label", e.target.value)}
                        placeholder="예: 구글 드라이브 폴더 ID"
                        required
                        style={{ height: "30px", border: "1px solid #d1d5db", borderRadius: "4px", padding: "0 6px", fontSize: "12px", outline: "none", color: "#111111" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#4b5563" }}>인풋 타입</span>
                      <select
                        value={field.type}
                        onChange={(e: any) => handleFieldChange(idx, "type", e.target.value)}
                        style={{ height: "30px", border: "1px solid #d1d5db", borderRadius: "4px", padding: "0 4px", fontSize: "12px", outline: "none", backgroundColor: "#ffffff", color: "#111111" }}
                      >
                        <option value="text">text</option>
                        <option value="email">email</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                        <option value="select">select</option>
                        <option value="textarea">textarea</option>
                        <option value="secret">secret</option>
                      </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#4b5563" }}>기본값 출처</span>
                      <input
                        type="text"
                        value={field.defaultValueSource || ""}
                        onChange={(e) => handleFieldChange(idx, "defaultValueSource", e.target.value)}
                        placeholder="예: auth.email"
                        style={{ height: "30px", border: "1px solid #d1d5db", borderRadius: "4px", padding: "0 6px", fontSize: "12px", outline: "none", color: "#111111" }}
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", height: "100%", marginTop: "16px" }}>
                      <input
                        type="checkbox"
                        id={`required-${idx}`}
                        checked={field.required}
                        onChange={(e) => handleFieldChange(idx, "required", e.target.checked)}
                        style={{ cursor: "pointer" }}
                      />
                      <label htmlFor={`required-${idx}`} style={{ fontSize: "11px", fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                        필수 입력 항목
                      </label>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#4b5563" }}>입력 힌트 (Placeholder)</span>
                      <input
                        type="text"
                        value={field.placeholder || ""}
                        onChange={(e) => handleFieldChange(idx, "placeholder", e.target.value)}
                        placeholder="예: 구글 드라이브 폴더 ID 입력"
                        style={{ height: "30px", border: "1px solid #d1d5db", borderRadius: "4px", padding: "0 6px", fontSize: "12px", outline: "none", color: "#111111" }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#4b5563" }}>가이드 설명 (Description)</span>
                      <input
                        type="text"
                        value={field.description || ""}
                        onChange={(e) => handleFieldChange(idx, "description", e.target.value)}
                        placeholder="예: 사용자의 개인 드라이브 폴더 ID를 기재합니다."
                        style={{ height: "30px", border: "1px solid #d1d5db", borderRadius: "4px", padding: "0 6px", fontSize: "12px", outline: "none", color: "#111111" }}
                      />
                    </div>
                  </div>

                  {field.type === "select" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#4b5563" }}>셀렉트 옵션 리스트 (쉼표 구분)</span>
                      <input
                        type="text"
                        value={field.options?.join(", ") || ""}
                        onChange={(e) => handleFieldChange(idx, "options", e.target.value.split(",").map(x => x.trim()).filter(Boolean))}
                        placeholder="옵션1, 옵션2, 옵션3"
                        style={{ height: "30px", border: "1px solid #d1d5db", borderRadius: "4px", padding: "0 6px", fontSize: "12px", outline: "none", color: "#111111" }}
                      />
                    </div>
                  )}

                  {isEditMode && !isExistingField && field.required && (
                    <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fcd34d", color: "#78350f", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>
                      ⚠️ 주의: 배포 완료(published)된 기존 워크플로우에 필수 설정 필드를 신규 추가하면, 이미 이 워크플로우를 배정받아 사용 중인 회사의 자동화 설정값과 충돌하여 작동 오류가 발생할 수 있습니다.
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

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
