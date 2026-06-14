"use client";

import React from "react";
import type { WorkflowImportDiagnostics } from "@/features/operator/workflowAnalyzer";
import {
  getDiagnosticStyles,
  getFieldDiagnosticLevel,
  getFieldDiagnosticMessage,
  getDiagnosticMessageStyle
} from "@/features/operator/workflowAnalyzer";

export interface WorkflowInputSchemaFormProps {
  titleRequired: boolean;
  setTitleRequired: (val: boolean) => void;
  acceptedTypes: string[];
  setAcceptedTypes: (val: string[]) => void;
  allowedFileTypesStr: string;
  setAllowedFileTypesStr: (val: string) => void;
  maxFileSizeMB: number;
  setMaxFileSizeMB: (val: number) => void;
  diagnostics?: WorkflowImportDiagnostics | null;
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
  diagnostics = null,
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
        <span style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>
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
                style={{ cursor: "pointer" }}
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
          <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>
            허용 파일 확장자 (쉼표 구분)
          </label>
          <input
            type="text"
            value={allowedFileTypesStr}
            onChange={(e) => setAllowedFileTypesStr(e.target.value)}
            placeholder="pdf, jpg, png, xlsx"
            style={{
              height: "36px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "0 8px",
              fontSize: "13px",
              outline: "none",
              color: "#111111",
              backgroundColor: "#ffffff",
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
          <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>최대 파일 크기 (MB)</label>
          <input
            type="number"
            value={maxFileSizeMB}
            onChange={(e) => setMaxFileSizeMB(Number(e.target.value))}
            required
            style={{
              height: "36px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "0 8px",
              fontSize: "13px",
              outline: "none",
              color: "#111111",
              backgroundColor: "#ffffff",
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
              style={{ cursor: "pointer" }}
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
    </>
  );
}
