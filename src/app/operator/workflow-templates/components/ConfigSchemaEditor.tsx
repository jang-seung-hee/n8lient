"use client";

import React, { useState } from "react";
import type { ConfigSchemaField } from "@/types/n8lient";
import type { WorkflowImportDiagnostics } from "@/features/operator/workflowAnalyzer";
import {
  getDiagnosticStyles,
  getFieldDiagnosticLevel,
  getFieldDiagnosticMessage,
  getDiagnosticMessageStyle,
  getConfigSchemaCardStyles
} from "@/features/operator/workflowAnalyzer";
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
}: ConfigSchemaEditorProps) {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== idx) {
      onMoveField(draggedIdx, idx);
      setDraggedIdx(idx);
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
