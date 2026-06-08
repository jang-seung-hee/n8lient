// 이 파일은 고객사에 N8N 워크플로우를 신규 매핑하여 배정하기 위한 등록 폼 컴포넌트입니다.

"use client";

import { useEffect, useState } from "react";
import type { ClientDoc, WorkflowTemplate } from "@/types/n8lient";

interface ContractMappingFormProps {
  clients: ClientDoc[];
  templates: WorkflowTemplate[];
  onSubmit: (formData: {
    clientId: string;
    workflowKey: string;
    enabled: boolean;
    contractStatus: "active" | "paused" | "ended";
  }) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export function ContractMappingForm({
  clients,
  templates,
  onSubmit,
  onCancel,
  loading,
}: ContractMappingFormProps) {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedWorkflowKey, setSelectedWorkflowKey] = useState("");
  const [formEnabled, setFormEnabled] = useState(true);
  const [formContractStatus, setFormContractStatus] = useState<"active" | "paused" | "ended">("active");

  // 초기 select 선택 값 매핑
  useEffect(() => {
    if (clients.length > 0) {
      setSelectedClientId(clients[0].clientId);
    }
    if (templates.length > 0) {
      setSelectedWorkflowKey(templates[0].workflowKey);
    }
  }, [clients, templates]);

  const handleSubmitInternal = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId) {
      alert("배정할 고객사를 선택해 주십시오.");
      return;
    }
    if (!selectedWorkflowKey) {
      alert("배정할 N8N 워크플로우를 선택해 주십시오.");
      return;
    }

    onSubmit({
      clientId: selectedClientId,
      workflowKey: selectedWorkflowKey,
      enabled: formEnabled,
      contractStatus: formContractStatus,
    });
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
        ➕ 고객사별 N8N 워크플로우 배정
      </h3>
      <form onSubmit={handleSubmitInternal} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        
        {/* 고객사 선택 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>배정 대상 고객사 *</label>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", backgroundColor: "#ffffff", color: "#111111" }}
          >
            {clients.length === 0 ? (
              <option value="">등록된 고객사가 없습니다.</option>
            ) : (
              clients.map((c) => (
                <option key={c.clientId} value={c.clientId}>
                  {c.companyName} ({c.clientId})
                </option>
              ))
            )}
          </select>
        </div>

        {/* N8N 워크플로우 선택 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>배정할 N8N 워크플로우 *</label>
          <select
            value={selectedWorkflowKey}
            onChange={(e) => setSelectedWorkflowKey(e.target.value)}
            style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", backgroundColor: "#ffffff", color: "#111111" }}
          >
            {templates.length === 0 ? (
              <option value="">등록된 N8N 워크플로우가 없습니다.</option>
            ) : (
              templates.map((t) => (
                <option key={t.workflowKey} value={t.workflowKey}>
                  {t.name} ({t.workflowKey})
                </option>
              ))
            )}
          </select>
        </div>

        {/* 상태 및 약정 설정 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>배정 활성 상태</label>
            <select
              value={String(formEnabled)}
              onChange={(e) => setFormEnabled(e.target.value === "true")}
              style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", backgroundColor: "#ffffff", color: "#111111" }}
            >
              <option value="true">활성 (enabled = true)</option>
              <option value="false">비활성 (enabled = false)</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>계약 세부 상태</label>
            <select
              value={formContractStatus}
              onChange={(e: any) => setFormContractStatus(e.target.value)}
              style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", backgroundColor: "#ffffff", color: "#111111" }}
            >
              <option value="active">유효함 (active)</option>
              <option value="paused">일시정지 (paused)</option>
              <option value="ended">계약종료 (ended)</option>
            </select>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          <button
            type="submit"
            disabled={loading || clients.length === 0 || templates.length === 0}
            style={{
              flex: 1,
              height: "38px",
              backgroundColor: loading ? "#4b5563" : "#111111",
              color: "#ffffff",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              border: "none",
              cursor: (loading || clients.length === 0 || templates.length === 0) ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "배정 등록 중..." : "🤝 워크플로우 매핑 배정 완료"}
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
