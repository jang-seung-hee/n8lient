"use client";

import React from "react";
import type { WorkflowTemplateStatus } from "@/types/n8lient";

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
          <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>
            워크플로우 Key * (영문소문자/숫자/-)
          </label>
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
            style={{
              height: "36px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "0 8px",
              fontSize: "13px",
              outline: "none",
              color: "#111111",
              backgroundColor: "#ffffff",
            }}
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
            style={{
              height: "36px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "0 8px",
              fontSize: "13px",
              outline: "none",
              color: "#111111",
              backgroundColor: "#ffffff",
            }}
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
            style={{
              height: "36px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "0 8px",
              fontSize: "13px",
              outline: "none",
              color: "#111111",
              backgroundColor: "#ffffff",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>배포 상태 *</label>
          <select
            value={status}
            onChange={(e: any) => setStatus(e.target.value)}
            style={{
              height: "36px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "0 8px",
              fontSize: "13px",
              outline: "none",
              backgroundColor: "#ffffff",
              color: "#111111",
            }}
          >
            <option value="published">배포완료 (published)</option>
            <option value="draft">작성중 (draft)</option>
            <option value="disabled">비활성 (disabled)</option>
          </select>
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
            style={{
              height: "36px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "0 8px",
              fontSize: "13px",
              outline: "none",
              color: "#111111",
              backgroundColor: "#ffffff",
            }}
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
            style={{
              height: "36px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "0 8px",
              fontSize: "13px",
              outline: "none",
              color: "#111111",
              backgroundColor: "#ffffff",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>설명</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="N8N 워크플로우 명세에 관한 상세 설명을 적으십시오."
          style={{
            minHeight: "40px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            padding: "6px 8px",
            fontSize: "13px",
            outline: "none",
            color: "#111111",
            backgroundColor: "#ffffff",
            resize: "vertical",
          }}
        />
      </div>
    </>
  );
}
