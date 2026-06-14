"use client";

import React, { useState } from "react";
import type { ConfigSchemaField, WorkflowTemplate } from "@/types/n8lient";
import type { WorkflowImportDiagnostics } from "@/features/operator/workflowAnalyzer";
import {
  getDiagnosticStyles,
  getFieldDiagnosticLevel,
  getFieldDiagnosticMessage,
  getDiagnosticMessageStyle,
  getConfigSchemaCardStyles
} from "@/features/operator/workflowAnalyzer";
import { requestAiAssist } from "@/features/aiAssist";
import { playAppSound } from "@/lib/appSound";

interface ConfigSchemaEditorProps {
  schemaFields: ConfigSchemaField[];
  isEditMode: boolean;
  originalStatus: "draft" | "published" | "disabled" | null;
  originalSchemaKeys: Set<string>;
  onAddField: () => void;
  onRemoveField: (index: number) => void;
  onFieldChange: (index: number, keyProp: keyof ConfigSchemaField, val: any) => void;
  onMoveField: (fromIdx: number, toIdx: number) => void;
  onSelectOptionsChange: (index: number, options: string[], tempOptionsStr: string) => void;
  diagnostics?: WorkflowImportDiagnostics | null;
  workflowKey: string;
  workflowName: string;
  workflowDescription: string;
  inputSchema?: WorkflowTemplate["inputSchema"];
}

export default function ConfigSchemaEditor({
  schemaFields,
  isEditMode,
  originalStatus,
  originalSchemaKeys,
  onAddField,
  onRemoveField,
  onFieldChange,
  onMoveField,
  onSelectOptionsChange,
  diagnostics = null,
  workflowKey,
  workflowName,
  workflowDescription,
  inputSchema,
}: ConfigSchemaEditorProps) {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [loadingFieldIdx, setLoadingFieldIdx] = useState<number | null>(null);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== idx) {
      onMoveField(draggedIdx, idx);
      setDraggedIdx(idx);
    }
  };

  const handleAiFieldAssist = async (idx: number, field: ConfigSchemaField) => {
    if (loadingFieldIdx !== null) return;
    setLoadingFieldIdx(idx);
    playAppSound("click");

    try {
      const response = await requestAiAssist({
        purpose: "config_field_copy",
        instruction: "동적 설정 필드의 label, placeholder, description을 이 필드 정보와 전체 자동화 맥락에 어울리게 한글로 적절히 보완 생성해 주십시오.",
        context: {
          key: field.key,
          label: field.label,
          type: field.type,
          required: field.required,
          defaultValueSource: field.defaultValueSource,
          placeholder: field.placeholder,
          description: field.description,
          options: field.options,
          workflow: {
            workflowKey,
            name: workflowName,
            description: workflowDescription,
            inputSchema,
            configSchemaKeys: schemaFields.map((f) => f.key),
          },
        },
        outputFormat: "json",
      });

      if (response.ok && response.result?.json) {
        const aiJson = response.result.json;

        // 덮어쓰기 조건 검사
        const hasExistingLabel = field.label && !field.label.includes("확인 필요") && !field.label.includes("임시") && field.label.trim() !== "";
        const hasExistingPlaceholder = field.placeholder && !field.placeholder.includes("확인 필요") && field.placeholder.trim() !== "";
        const hasExistingDesc = field.description && !field.description.includes("확인 필요") && field.description.trim() !== "";

        if (hasExistingLabel || hasExistingPlaceholder || hasExistingDesc) {
          const proceed = confirm("기존 작성 중이던 설정 문구가 존재합니다. AI 추천 값으로 덮어쓰시겠습니까?");
          if (!proceed) {
            setLoadingFieldIdx(null);
            return;
          }
        }

        if (aiJson.label) onFieldChange(idx, "label", aiJson.label);
        if (aiJson.placeholder) onFieldChange(idx, "placeholder", aiJson.placeholder);
        if (aiJson.description) onFieldChange(idx, "description", aiJson.description);
      } else if (response.locked) {
        alert(
          "AI API 키 값이 등록되어 있지 않아 AI 지원 기능은 잠겨 있습니다.\n현재는 n8n JSON 주석과 기본 분석 규칙을 기준으로 권장값을 제안합니다."
        );
      } else {
        alert("AI 문구 생성에 실패했습니다. 현재 입력값은 변경되지 않았습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("AI 호출 도중 오류가 발생했습니다. 현재 입력값은 변경되지 않았습니다.");
    } finally {
      setLoadingFieldIdx(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h4 style={{ fontSize: "12.5px", fontWeight: 700, color: "#374151", margin: 0 }}>
          ⚙️ configSchema (설정 맵핑 요구사항)
        </h4>
        <button
          type="button"
          onClick={onAddField}
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
            const isExistingField =
              isEditMode && originalStatus === "published" && originalSchemaKeys.has(field.key);
            const cardTitle = field.label
              ? field.label
              : field.key
              ? field.key
              : `설정 필드 ${idx + 1}`;

            return (
              <div
                key={idx}
                draggable
                onDragStart={() => setDraggedIdx(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={() => setDraggedIdx(null)}
                style={{
                  border: "1px solid #d8dee9",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  opacity: draggedIdx === idx ? 0.4 : 1,
                  transition: "all 0.15s ease",
                  ...getConfigSchemaCardStyles(idx, diagnostics),
                }}
              >
                {/* 카드 헤더 영역 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: "#eef6ff",
                    padding: "8px 12px",
                    borderBottom: "1px solid #d8dee9",
                    cursor: "grab",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "14px", color: "#6b7280", userSelect: "none" }}>⠿</span>
                    <strong style={{ fontSize: "13.5px", color: "#111827" }}>{cardTitle}</strong>
                    {field.key && (
                      <span style={{ fontSize: "11px", color: "#6b7280", fontFamily: "monospace" }}>
                        (key: {field.key})
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {field.key && (
                      <button
                        type="button"
                        onClick={() => handleAiFieldAssist(idx, field)}
                        disabled={loadingFieldIdx !== null}
                        style={{
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          border: "1px solid #3b82f6",
                          backgroundColor: "#eff6ff",
                          color: "#1d4ed8",
                          cursor: loadingFieldIdx !== null ? "not-allowed" : "pointer",
                          fontWeight: 600,
                          marginRight: "6px"
                        }}
                      >
                        {loadingFieldIdx === idx ? "생성 중..." : "✨ AI 추천"}
                      </button>
                    )}
                    {/* 순서 조정 보조 버튼 */}
                    <button
                      type="button"
                      onClick={() => onMoveField(idx, idx - 1)}
                      disabled={idx === 0}
                      style={{
                        height: "22px",
                        width: "22px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        backgroundColor: "#ffffff",
                        cursor: idx === 0 ? "not-allowed" : "pointer",
                        opacity: idx === 0 ? 0.4 : 1,
                      }}
                      title="위로 이동"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveField(idx, idx + 1)}
                      disabled={idx === schemaFields.length - 1}
                      style={{
                        height: "22px",
                        width: "22px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        backgroundColor: "#ffffff",
                        cursor: idx === schemaFields.length - 1 ? "not-allowed" : "pointer",
                        opacity: idx === schemaFields.length - 1 ? 0.4 : 1,
                      }}
                      title="아래로 이동"
                    >
                      ▼
                    </button>
                    {!isExistingField && (
                      <button
                        type="button"
                        onClick={() => onRemoveField(idx)}
                        style={{
                          border: "none",
                          background: "none",
                          color: "#ef4444",
                          fontSize: "12px",
                          cursor: "pointer",
                          fontWeight: 600,
                          marginLeft: "6px",
                        }}
                      >
                          제거
                      </button>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    backgroundColor: "#f9fafb",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginRight: "32px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#4b5563" }}>설정 Key * (영문/숫자)</span>
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) => onFieldChange(idx, "key", e.target.value)}
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
                          ...getDiagnosticStyles(`configSchema[${idx}].key`, diagnostics)
                        }}
                      />
                      {getFieldDiagnosticMessage(`configSchema[${idx}].key`, diagnostics) && (
                        <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel(`configSchema[${idx}].key`, diagnostics)!)}>
                          {getFieldDiagnosticMessage(`configSchema[${idx}].key`, diagnostics)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#4b5563" }}>라벨 이름 *</span>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => onFieldChange(idx, "label", e.target.value)}
                        placeholder="예: 구글 드라이브 폴더 ID"
                        required
                        style={{
                          height: "30px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          padding: "0 6px",
                          fontSize: "12px",
                          outline: "none",
                          color: "#111111",
                          ...getDiagnosticStyles(`configSchema[${idx}].label`, diagnostics)
                        }}
                      />
                      {getFieldDiagnosticMessage(`configSchema[${idx}].label`, diagnostics) && (
                        <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel(`configSchema[${idx}].label`, diagnostics)!)}>
                          {getFieldDiagnosticMessage(`configSchema[${idx}].label`, diagnostics)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#4b5563" }}>인풋 타입</span>
                      <select
                        value={field.type}
                        onChange={(e: any) => onFieldChange(idx, "type", e.target.value)}
                        style={{
                          height: "30px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          padding: "0 4px",
                          fontSize: "12px",
                          outline: "none",
                          backgroundColor: "#ffffff",
                          color: "#111111",
                          ...getDiagnosticStyles(`configSchema[${idx}].type`, diagnostics)
                        }}
                      >
                        <option value="text">text</option>
                        <option value="email">email</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                        <option value="select">select</option>
                        <option value="textarea">textarea</option>
                        <option value="secret">secret</option>
                      </select>
                      {getFieldDiagnosticMessage(`configSchema[${idx}].type`, diagnostics) && (
                        <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel(`configSchema[${idx}].type`, diagnostics)!)}>
                          {getFieldDiagnosticMessage(`configSchema[${idx}].type`, diagnostics)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#4b5563" }}>기본값 출처</span>
                      <input
                        type="text"
                        value={field.defaultValueSource || ""}
                        onChange={(e) => onFieldChange(idx, "defaultValueSource", e.target.value)}
                        placeholder="예: auth.email"
                        style={{ height: "30px", border: "1px solid #d1d5db", borderRadius: "4px", padding: "0 6px", fontSize: "12px", outline: "none", color: "#111111" }}
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", height: "100%", marginTop: "16px" }}>
                      <input
                        type="checkbox"
                        id={`required-${idx}`}
                        checked={field.required}
                        onChange={(e) => onFieldChange(idx, "required", e.target.checked)}
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
                        onChange={(e) => onFieldChange(idx, "placeholder", e.target.value)}
                        placeholder="예: 구글 드라이브 폴더 ID 입력"
                        style={{
                          height: "30px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          padding: "0 6px",
                          fontSize: "12px",
                          outline: "none",
                          color: "#111111",
                          ...getDiagnosticStyles(`configSchema[${idx}].placeholder`, diagnostics)
                        }}
                      />
                      {getFieldDiagnosticMessage(`configSchema[${idx}].placeholder`, diagnostics) && (
                        <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel(`configSchema[${idx}].placeholder`, diagnostics)!)}>
                          {getFieldDiagnosticMessage(`configSchema[${idx}].placeholder`, diagnostics)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#4b5563" }}>가이드 설명 (Description)</span>
                      <input
                        type="text"
                        value={field.description || ""}
                        onChange={(e) => onFieldChange(idx, "description", e.target.value)}
                        placeholder="예: 사용자의 개인 드라이브 폴더 ID를 기재합니다."
                        style={{
                          height: "30px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          padding: "0 6px",
                          fontSize: "12px",
                          outline: "none",
                          color: "#111111",
                          ...getDiagnosticStyles(`configSchema[${idx}].description`, diagnostics)
                        }}
                      />
                      {getFieldDiagnosticMessage(`configSchema[${idx}].description`, diagnostics) && (
                        <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel(`configSchema[${idx}].description`, diagnostics)!)}>
                          {getFieldDiagnosticMessage(`configSchema[${idx}].description`, diagnostics)}
                        </span>
                      )}
                    </div>
                  </div>

                  {field.type === "select" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#4b5563" }}>셀렉트 옵션 리스트 (쉼표 구분)</span>
                      <input
                        type="text"
                        value={field.tempOptionsStr !== undefined ? field.tempOptionsStr : (field.options?.join(", ") || "")}
                        onChange={(e) => {
                          const val = e.target.value;
                          onFieldChange(idx, "tempOptionsStr" as any, val);
                        }}
                        onBlur={(e) => {
                          const val = e.target.value;
                          const splitArray = val.split(",").map(x => x.trim()).filter(Boolean);
                          const formattedStr = splitArray.join(", ");
                          onSelectOptionsChange(idx, splitArray, formattedStr);
                        }}
                        placeholder="옵션1, 옵션2, 옵션3"
                        style={{
                          height: "30px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          padding: "0 6px",
                          fontSize: "12px",
                          outline: "none",
                          color: "#111111",
                          ...getDiagnosticStyles(`configSchema[${idx}].options`, diagnostics)
                        }}
                      />
                      {getFieldDiagnosticMessage(`configSchema[${idx}].options`, diagnostics) && (
                        <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel(`configSchema[${idx}].options`, diagnostics)!)}>
                          {getFieldDiagnosticMessage(`configSchema[${idx}].options`, diagnostics)}
                        </span>
                      )}
                    </div>
                  )}

                  {isEditMode && !isExistingField && field.required && (
                    <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fcd34d", color: "#78350f", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>
                      ⚠️ 주의: 배포 완료(published)된 기존 워크플로우에 필수 설정 필드를 신규 추가하면, 이미 이 워크플로우를 배정받아 사용 중인 회사의 자동화 설정값과 충돌하여 작동 오류가 발생할 수 있습니다.
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
