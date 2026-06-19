"use client";

import React from "react";
import type { WorkflowImportDiagnostics } from "@/features/operator/workflowTemplateImport";
import {
  getDiagnosticStyles,
  getFieldDiagnosticLevel,
  getFieldDiagnosticMessage,
  getDiagnosticMessageStyle
} from "@/features/operator/workflowTemplateImport";

export interface WorkflowInputSchemaFormProps {
  titleRequired: boolean;
  setTitleRequired: (val: boolean) => void;
  acceptedTypes: string[];
  setAcceptedTypes: (val: string[]) => void;
  allowedFileTypesStr: string;
  setAllowedFileTypesStr: (val: string) => void;
  maxFileSizeMB: number;
  setMaxFileSizeMB: (val: number) => void;
  requiredInputMode: "none" | "at_least_one" | "all";
  setRequiredInputMode: (val: "none" | "at_least_one" | "all") => void;
  requiredInputTypes: string[];
  setRequiredInputTypes: (val: string[]) => void;
  maxFiles: number;
  setMaxFiles: (val: number) => void;
  diagnostics?: WorkflowImportDiagnostics | null;
  isStructureLocked?: boolean;
}

export default function WorkflowInputSchemaForm({
  titleRequired,
  setTitleRequired,
  acceptedTypes,
  setAcceptedTypes,
  allowedFileTypesStr,
  setAllowedFileTypesStr,
  maxFileSizeMB,
  setMaxFileSizeMB,
  requiredInputMode,
  setRequiredInputMode,
  requiredInputTypes,
  setRequiredInputTypes,
  maxFiles,
  setMaxFiles,
  diagnostics = null,
  isStructureLocked = false,
}: WorkflowInputSchemaFormProps) {
  
  const handleCheckboxChange = (type: string, checked: boolean) => {
    if (checked) {
      setAcceptedTypes([...acceptedTypes, type]);
    } else {
      setAcceptedTypes(acceptedTypes.filter((t) => t !== type));
    }
  };

  return (
    <>
      <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "4px 0" }} />
      <h4 style={{ fontSize: "12.5px", fontWeight: 700, color: "#374151", margin: 0 }}>
        ⚙️ inputSchema (입력 정보 요구사항)
      </h4>

      <div 
        style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: "8px",
          padding: "6px",
          borderRadius: "6px",
          ...getDiagnosticStyles("inputSchema.acceptedInputTypes", diagnostics)
        }}
      >
        <span className="ux_label" style={{ fontSize: "12px", color: "#4b5563" }}>
          허용 입력 형태 (다중 선택 가능)
        </span>
        <div style={{ display: "flex", gap: "16px", fontSize: "13px" }}>
          {["text", "file", "audio", "image"].map((type) => (
            <label
              key={type}
              style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", color: "#111111" }}
            >
              <input
                type="checkbox"
                checked={acceptedTypes.includes(type)}
                onChange={(e) => handleCheckboxChange(type, e.target.checked)}
                disabled={isStructureLocked}
                style={{ cursor: isStructureLocked ? "not-allowed" : "pointer" }}
              />
              {type}
            </label>
          ))}
        </div>
        {getFieldDiagnosticMessage("inputSchema.acceptedInputTypes", diagnostics) && (
          <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel("inputSchema.acceptedInputTypes", diagnostics)!)}>
            {getFieldDiagnosticMessage("inputSchema.acceptedInputTypes", diagnostics)}
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label className="ux_label" style={{ fontSize: "12px", color: "#4b5563" }}>
            허용 파일 확장자 (쉼표 구분)
          </label>
          <input
            type="text"
            className="ux_input_compact"
            value={allowedFileTypesStr}
            onChange={(e) => setAllowedFileTypesStr(e.target.value)}
            placeholder="pdf, jpg, png, xlsx"
            disabled={isStructureLocked}
            style={{
              color: isStructureLocked ? "#9ca3af" : "#111111",
              backgroundColor: isStructureLocked ? "#f3f4f6" : "#ffffff",
              ...getDiagnosticStyles("inputSchema.allowedFileTypes", diagnostics)
            }}
          />
          {getFieldDiagnosticMessage("inputSchema.allowedFileTypes", diagnostics) && (
            <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel("inputSchema.allowedFileTypes", diagnostics)!)}>
              {getFieldDiagnosticMessage("inputSchema.allowedFileTypes", diagnostics)}
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label className="ux_label" style={{ fontSize: "12px", color: "#4b5563" }}>최대 파일 크기 (MB)</label>
          <input
            type="number"
            className="ux_input_compact"
            value={maxFileSizeMB}
            onChange={(e) => setMaxFileSizeMB(Number(e.target.value))}
            required
            disabled={isStructureLocked}
            style={{
              color: isStructureLocked ? "#9ca3af" : "#111111",
              backgroundColor: isStructureLocked ? "#f3f4f6" : "#ffffff",
              ...getDiagnosticStyles("inputSchema.maxFileSizeMB", diagnostics)
            }}
          />
          {getFieldDiagnosticMessage("inputSchema.maxFileSizeMB", diagnostics) && (
            <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel("inputSchema.maxFileSizeMB", diagnostics)!)}>
              {getFieldDiagnosticMessage("inputSchema.maxFileSizeMB", diagnostics)}
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "14px", padding: "4px", borderRadius: "4px", ...getDiagnosticStyles("inputSchema.titleRequired", diagnostics) }}>
            <input
              type="checkbox"
              id="title-required-checkbox"
              checked={titleRequired}
              onChange={(e) => setTitleRequired(e.target.checked)}
              disabled={isStructureLocked}
              style={{ cursor: isStructureLocked ? "not-allowed" : "pointer" }}
            />
            <label
              htmlFor="title-required-checkbox"
              style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563", cursor: "pointer" }}
            >
              실행 제목 필수 여부
            </label>
          </div>
          {getFieldDiagnosticMessage("inputSchema.titleRequired", diagnostics) && (
            <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel("inputSchema.titleRequired", diagnostics)!)}>
              {getFieldDiagnosticMessage("inputSchema.titleRequired", diagnostics)}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "4px" }}>
        {/* requiredInputMode select */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label className="ux_label" style={{ fontSize: "12px", color: "#4b5563" }}>
            필수 입력 조건 방식 (requiredInputMode)
          </label>
          <select
            className="ux_select_compact"
            value={requiredInputMode}
            onChange={(e) => setRequiredInputMode(e.target.value as "none" | "at_least_one" | "all")}
            disabled={isStructureLocked}
            style={{
              color: isStructureLocked ? "#9ca3af" : "#111111",
              backgroundColor: isStructureLocked ? "#f3f4f6" : "#ffffff",
              ...getDiagnosticStyles("inputSchema.requiredInputMode", diagnostics)
            }}
          >
            <option value="none">none (선택 사항)</option>
            <option value="at_least_one">at_least_one (최소 하나 이상)</option>
            <option value="all">all (모두 필수)</option>
          </select>
          {getFieldDiagnosticMessage("inputSchema.requiredInputMode", diagnostics) && (
            <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel("inputSchema.requiredInputMode", diagnostics)!)}>
              {getFieldDiagnosticMessage("inputSchema.requiredInputMode", diagnostics)}
            </span>
          )}
        </div>

        {/* maxFiles input */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label className="ux_label" style={{ fontSize: "12px", color: "#4b5563" }}>
            최대 업로드 파일 수 (maxFiles)
          </label>
          <input
            type="number"
            className="ux_input_compact"
            value={maxFiles}
            onChange={(e) => setMaxFiles(Number(e.target.value))}
            min={0}
            required
            disabled={isStructureLocked}
            style={{
              color: isStructureLocked ? "#9ca3af" : "#111111",
              backgroundColor: isStructureLocked ? "#f3f4f6" : "#ffffff",
              ...getDiagnosticStyles("inputSchema.maxFiles", diagnostics)
            }}
          />
          {getFieldDiagnosticMessage("inputSchema.maxFiles", diagnostics) && (
            <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel("inputSchema.maxFiles", diagnostics)!)}>
              {getFieldDiagnosticMessage("inputSchema.maxFiles", diagnostics)}
            </span>
          )}
        </div>

        {/* dummy space / alignment helper */}
        <div></div>
      </div>

      {/* requiredInputTypes checkboxes */}
      <div 
        style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: "8px",
          padding: "6px",
          borderRadius: "6px",
          marginTop: "4px",
          ...getDiagnosticStyles("inputSchema.requiredInputTypes", diagnostics)
        }}
      >
        <span className="ux_label" style={{ fontSize: "12px", color: "#4b5563" }}>
          필수 입력 타입 목록 (requiredInputTypes)
        </span>
        <div style={{ display: "flex", gap: "16px", fontSize: "13px" }}>
          {["text", "file", "audio", "image"].map((type) => (
            <label
              key={type}
              style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", color: "#111111" }}
            >
              <input
                type="checkbox"
                checked={requiredInputTypes.includes(type)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setRequiredInputTypes([...requiredInputTypes, type]);
                  } else {
                    setRequiredInputTypes(requiredInputTypes.filter((t) => t !== type));
                  }
                }}
                disabled={isStructureLocked}
                style={{ cursor: isStructureLocked ? "not-allowed" : "pointer" }}
              />
              {type}
            </label>
          ))}
        </div>
        {getFieldDiagnosticMessage("inputSchema.requiredInputTypes", diagnostics) && (
          <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel("inputSchema.requiredInputTypes", diagnostics)!)}>
            {getFieldDiagnosticMessage("inputSchema.requiredInputTypes", diagnostics)}
          </span>
        )}
      </div>
    </>
  );
}
