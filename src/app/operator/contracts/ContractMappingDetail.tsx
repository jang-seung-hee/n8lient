// 이 파일은 N8N 워크플로우 매핑의 상세 계약 명세를 확인하고, 활성 상태를 직접 토글 관리하는 상세 조회 컴포넌트입니다.

"use client";

import type { ClientContract, ClientDoc, WorkflowTemplate } from "@/types/n8lient";

interface ContractMappingDetailProps {
  contract: ClientContract;
  clients: ClientDoc[];
  templates: WorkflowTemplate[];
  loading: boolean;
  onToggleEnabled: (contract: ClientContract) => Promise<void>;
  onBackClick: () => void;
}

export function ContractMappingDetail({
  contract,
  clients,
  templates,
  loading,
  onToggleEnabled,
  onBackClick,
}: ContractMappingDetailProps) {
  // 고객사 정보를 찾는 헬퍼 함수
  const getClientInfo = (clientId: string) => {
    const found = clients.find((c) => c.clientId === clientId);
    return found ? `${found.companyName} (${found.companyCode})` : clientId;
  };

  // N8N 워크플로우 정보를 찾는 헬퍼 함수
  const getWorkflowInfo = (workflowKey: string) => {
    const found = templates.find((t) => t.workflowKey === workflowKey);
    return found ? `${found.name} (v${found.version})` : workflowKey;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 상단 액션 바 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={onBackClick}
            style={{
              background: "none",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "4px",
            }}
            title="목록으로 이동"
          >
            ⬅️
          </button>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#111111", margin: 0 }}>
              워크플로우 매핑 상세 정보
            </h2>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0 0" }}>
              매핑 ID: {contract.contractId}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => onToggleEnabled(contract)}
            disabled={loading}
            style={{
              backgroundColor: contract.enabled ? "#fee2e2" : "#eff6ff",
              color: contract.enabled ? "#b91c1c" : "#1d4ed8",
              border: "1px solid",
              borderColor: contract.enabled ? "#fca5a5" : "#bfdbfe",
              borderRadius: "6px",
              padding: "8px 16px",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {loading ? "처리 중..." : contract.enabled ? "🚫 매핑 비활성화" : "⚙️ 매핑 활성화"}
          </button>
          <button
            onClick={onBackClick}
            style={{
              backgroundColor: "#f3f4f6",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "8px 16px",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            목록으로
          </button>
        </div>
      </div>

      {/* 정보 배치 레이아웃 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* 왼쪽: 연동 및 주체 정보 */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#111111", margin: 0, borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
            🤝 대상 지정 및 릴레이션
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ color: "#6b7280" }}>배정 대상 고객사</span>
              <span style={{ fontWeight: 600, color: "#111111" }}>{getClientInfo(contract.clientId)}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ color: "#6b7280" }}>배정 N8N 워크플로우</span>
              <span style={{ fontWeight: 600, color: "#111111" }}>{getWorkflowInfo(contract.workflowKey)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>고객사 ID</span>
              <span style={{ fontWeight: 600, color: "#111111", fontFamily: "monospace" }}>{contract.clientId}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>워크플로우 식별 Key</span>
              <span style={{ fontWeight: 600, color: "#111111", fontFamily: "monospace" }}>{contract.workflowKey}</span>
            </div>
          </div>
        </div>

        {/* 오른쪽: 배정 계약 상태 및 메타데이터 */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#111111", margin: 0, borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
            ⚙️ 배정 상태 및 메타데이터
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#6b7280" }}>매핑 활성 여부</span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  backgroundColor: contract.enabled ? "#d1fae5" : "#fee2e2",
                  color: contract.enabled ? "#065f46" : "#991b1b",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                {contract.enabled ? "활성 (enabled = true)" : "비활성 (enabled = false)"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#6b7280" }}>계약 상세 상태</span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: contract.contractStatus === "active" ? "#047857" : contract.contractStatus === "paused" ? "#d97706" : "#b91c1c",
                }}
              >
                {contract.contractStatus === "active" ? "유효함 (active)" : contract.contractStatus === "paused" ? "일시정지 (paused)" : "종료됨 (ended)"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>시작 일시</span>
              <span style={{ fontWeight: 600, color: "#111111" }}>
                {contract.startedAt ? new Date(contract.startedAt).toLocaleString() : "없음"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>종료 일시</span>
              <span style={{ fontWeight: 600, color: "#111111" }}>
                {contract.endedAt ? new Date(contract.endedAt).toLocaleString() : "진행 중(null)"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>최초 배정 운영자 UID</span>
              <span style={{ fontWeight: 600, color: "#111111", fontFamily: "monospace" }}>{contract.createdBy || "시스템"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
