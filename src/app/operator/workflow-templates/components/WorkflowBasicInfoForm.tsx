"use client";

import React from "react";
import type { WorkflowTemplateStatus } from "@/types/n8lient";
import type { WorkflowImportDiagnostics } from "@/features/operator/workflowTemplateImport";
import {
  getDiagnosticStyles,
  getFieldDiagnosticLevel,
  getFieldDiagnosticMessage,
  getDiagnosticMessageStyle
} from "@/features/operator/workflowTemplateImport";

export interface WorkflowBasicInfoFormProps {
  workflowKey: string;
  setWorkflowKey: (val: string) => void;
  name: string;
  setName: (val: string) => void;
  shortName: string;
  setShortName: (val: string) => void;
  version: string;
  setVersion: (val: string) => void;
  status: WorkflowTemplateStatus;
  setStatus: (val: WorkflowTemplateStatus) => void;
  webhookSecretId: string;
  setWebhookSecretId: (val: string) => void;
  n8nServerKey: string;
  setN8nServerKey: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  isEditMode: boolean;
  diagnostics?: WorkflowImportDiagnostics | null;
  isStructureLocked?: boolean;
}

export default function WorkflowBasicInfoForm({
  workflowKey,
  setWorkflowKey,
  name,
  setName,
  shortName,
  setShortName,
  version,
  setVersion,
  status,
  setStatus,
  webhookSecretId,
  setWebhookSecretId,
  n8nServerKey,
  setN8nServerKey,
  description,
  setDescription,
  isEditMode,
  diagnostics = null,
  isStructureLocked = false,
}: WorkflowBasicInfoFormProps) {
  const handleWorkflowKeyChange = (val: string) => {
    setWorkflowKey(val);
    if (!isEditMode) {
      setWebhookSecretId(val);
    }
  };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label className="ux_label" style={{ fontSize: "12px", color: "#4b5563" }}>
            워크플로우 Key * (영문소문자/숫자/-)
          </label>
          <input
            type="text"
            className="ux_input_compact"
            value={workflowKey}
            onChange={(e) => handleWorkflowKeyChange(e.target.value)}
            placeholder="예: expense-report"
            required
            disabled={isEditMode}
            style={{
              color: isEditMode ? "#9ca3af" : "#111111",
              backgroundColor: isEditMode ? "#f3f4f6" : "#ffffff",
              ...getDiagnosticStyles("workflowKey", diagnostics)
            }}
          />
          {getFieldDiagnosticMessage("workflowKey", diagnostics) && (
            <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel("workflowKey", diagnostics)!)}>
              {getFieldDiagnosticMessage("workflowKey", diagnostics)}
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label className="ux_label" style={{ fontSize: "12px", color: "#4b5563" }}>워크플로우 이름 *</label>
          <input
            type="text"
            className="ux_input_compact"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 지출결의서 자동 정리"
            required
            style={{
              color: "#111111",
              backgroundColor: "#ffffff",
              ...getDiagnosticStyles("name", diagnostics)
            }}
          />
          {getFieldDiagnosticMessage("name", diagnostics) && (
            <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel("name", diagnostics)!)}>
              {getFieldDiagnosticMessage("name", diagnostics)}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr 1fr", gap: "12px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className="ux_label" style={{ fontSize: "12px", color: "#4b5563" }}>줄임말 *</label>
          </div>
          <input
            type="text"
            className="ux_input_compact"
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            placeholder="예: 지결자"
            required
            style={{
              color: "#111111",
              backgroundColor: "#ffffff",
              ...getDiagnosticStyles("shortName", diagnostics)
            }}
          />
          {getFieldDiagnosticMessage("shortName", diagnostics) && (
            <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel("shortName", diagnostics)!)}>
              {getFieldDiagnosticMessage("shortName", diagnostics)}
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label className="ux_label" style={{ fontSize: "12px", color: "#4b5563" }}>버전 *</label>
          <input
            type="text"
            className="ux_input_compact"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0.0"
            required
            disabled={isStructureLocked}
            style={{
              color: isStructureLocked ? "#9ca3af" : "#111111",
              backgroundColor: isStructureLocked ? "#f3f4f6" : "#ffffff",
              ...getDiagnosticStyles("version", diagnostics)
            }}
          />
          {getFieldDiagnosticMessage("version", diagnostics) && (
            <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel("version", diagnostics)!)}>
              {getFieldDiagnosticMessage("version", diagnostics)}
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label className="ux_label" style={{ fontSize: "12px", color: "#4b5563" }}>배포 상태 *</label>
          <select
            className="ux_select_compact"
            value={status}
            onChange={(e) => setStatus(e.target.value as WorkflowTemplateStatus)}
            style={{
              backgroundColor: "#ffffff",
              color: "#111111",
              ...getDiagnosticStyles("status", diagnostics)
            }}
          >
            <option value="published">배포완료 (published)</option>
            <option value="draft">작성중 (draft)</option>
            <option value="disabled">비활성 (disabled)</option>
          </select>
          {getFieldDiagnosticMessage("status", diagnostics) && (
            <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel("status", diagnostics)!)}>
              {getFieldDiagnosticMessage("status", diagnostics)}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label className="ux_label" style={{ fontSize: "12px", color: "#4b5563" }}>Webhook Secret 참조 ID *</label>
          <input
            type="text"
            className="ux_input_compact"
            value={webhookSecretId}
            onChange={(e) => setWebhookSecretId(e.target.value)}
            placeholder="예: expense-report"
            required
            disabled={isStructureLocked}
            style={{
              color: isStructureLocked ? "#9ca3af" : "#111111",
              backgroundColor: isStructureLocked ? "#f3f4f6" : "#ffffff",
              ...getDiagnosticStyles("webhookSecretId", diagnostics)
            }}
          />
          {getFieldDiagnosticMessage("webhookSecretId", diagnostics) && (
            <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel("webhookSecretId", diagnostics)!)}>
              {getFieldDiagnosticMessage("webhookSecretId", diagnostics)}
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label className="ux_label" style={{ fontSize: "12px", color: "#4b5563" }}>n8n 서버 식별 Key *</label>
          <input
            type="text"
            className="ux_input_compact"
            value={n8nServerKey}
            onChange={(e) => setN8nServerKey(e.target.value)}
            placeholder="main"
            required
            disabled={isStructureLocked}
            style={{
              color: isStructureLocked ? "#9ca3af" : "#111111",
              backgroundColor: isStructureLocked ? "#f3f4f6" : "#ffffff",
              ...getDiagnosticStyles("n8nServerKey", diagnostics)
            }}
          />
          {getFieldDiagnosticMessage("n8nServerKey", diagnostics) && (
            <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel("n8nServerKey", diagnostics)!)}>
              {getFieldDiagnosticMessage("n8nServerKey", diagnostics)}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label className="ux_label" style={{ fontSize: "12px", color: "#4b5563" }}>설명</label>
        </div>
        <textarea
          className="ux_textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="N8N 워크플로우 명세에 관한 상세 설명을 적으십시오."
          style={{
            minHeight: "40px",
            padding: "6px 8px",
            ...getDiagnosticStyles("description", diagnostics)
          }}
        />
        {getFieldDiagnosticMessage("description", diagnostics) && (
          <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel("description", diagnostics)!)}>
            {getFieldDiagnosticMessage("description", diagnostics)}
          </span>
        )}
      </div>
    </>
  );
}

