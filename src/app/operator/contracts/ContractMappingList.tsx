// 이 파일은 고객사별 N8N 워크플로우 매핑 목록을 표 형식으로 보여주는 컴포넌트입니다.
// 기존 계약 토글 등의 제어 액션을 배제하고 오직 조회 및 상세 선택, 신규 매핑 등록 트리거만 처리합니다.

"use client";

import { useState, useEffect } from "react";
import type { ClientContract, ClientDoc, WorkflowTemplate } from "@/types/n8lient";
import { ListSearchFilterBar, type FilterField } from "@/components/core/ListSearchFilterBar";

interface ContractMappingListProps {
  contracts: ClientContract[];
  clients: ClientDoc[];
  templates: WorkflowTemplate[];
  loading: boolean;
  onSelect: (contract: ClientContract) => void;
  onCreateClick: () => void;
  onRegisterSampleContract: () => void;
}

const mappingFilterFields: FilterField[] = [
  {
    key: "enabled",
    label: "활성 여부",
    options: [
      { value: "true", label: "활성" },
      { value: "false", label: "비활성" },
    ],
  },
  {
    key: "contractStatus",
    label: "계약 상태",
    options: [
      { value: "active", label: "유효(active)" },
      { value: "paused", label: "일시정지(paused)" },
      { value: "ended", label: "종료(ended)" },
    ],
  },
];

export function ContractMappingList({
  contracts,
  clients,
  templates,
  loading,
  onSelect,
  onCreateClick,
  onRegisterSampleContract,
}: ContractMappingListProps) {
  const [filteredContracts, setFilteredContracts] = useState<ClientContract[]>([]);

  // 고객사 ID로 고객사명을 찾는 헬퍼 함수
  const getClientName = (clientId: string) => {
    const found = clients.find((c) => c.clientId === clientId);
    return found ? found.companyName : clientId;
  };

  // 워크플로우 Key로 워크플로우명을 찾는 헬퍼 함수
  const getWorkflowName = (workflowKey: string) => {
    const found = templates.find((t) => t.workflowKey === workflowKey);
    return found ? found.name : workflowKey;
  };

  // 부모 데이터가 갱신되거나 변경되었을 때 로컬 필터 리스트 동기화
  useEffect(() => {
    setFilteredContracts(contracts);
  }, [contracts]);

  // 검색 및 필터 변경 이벤트 핸들러
  const handleFilterChange = (query: string, filters: Record<string, string>) => {
    const searchVal = query.trim().toLowerCase();
    const enabledFilter = filters.enabled || "";
    const statusFilter = filters.contractStatus || "";

    const filtered = contracts.filter((contract) => {
      // 1. 활성 여부 필터 검사
      if (enabledFilter) {
        const isEnabled = enabledFilter === "true";
        if (contract.enabled !== isEnabled) {
          return false;
        }
      }

      // 2. 계약 상태 필터 검사
      if (statusFilter && contract.contractStatus !== statusFilter) {
        return false;
      }

      // 3. 검색어 필터 검사 (고객사명, clientId, N8N 워크플로우명, workflowKey)
      if (searchVal) {
        const clientName = getClientName(contract.clientId).toLowerCase();
        const clientId = contract.clientId.toLowerCase();
        const workflowName = getWorkflowName(contract.workflowKey).toLowerCase();
        const workflowKey = contract.workflowKey.toLowerCase();

        const clientNameMatch = clientName.includes(searchVal);
        const clientIdMatch = clientId.includes(searchVal);
        const workflowNameMatch = workflowName.includes(searchVal);
        const workflowKeyMatch = workflowKey.includes(searchVal);

        return clientNameMatch || clientIdMatch || workflowNameMatch || workflowKeyMatch;
      }

      return true;
    });

    setFilteredContracts(filtered);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 타이틀 및 매핑 등록 버튼 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
            📂 등록된 워크플로우 매핑 목록
          </h2>
          <p style={{ fontSize: "12.5px", color: "#6b7280", margin: 0 }}>
            고객사에 배정된 N8N 워크플로우 목록입니다. 행을 클릭하여 세부 매핑 정보를 보거나 계약 상태를 관리할 수 있습니다.
          </p>
        </div>
        <button
          onClick={onCreateClick}
          style={{
            backgroundColor: "#111111",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "background-color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#242424")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#111111")}
        >
          ➕ 새 워크플로우 매핑
        </button>
      </div>

      {/* 공통 검색/필터 바 탑재 */}
      <ListSearchFilterBar
        searchPlaceholder="고객사명, 고객사 ID, 워크플로우명, Key 검색..."
        filterFields={mappingFilterFields}
        onChange={handleFilterChange}
      />

      {/* 테이블 리스트 */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>고객사명 (ID)</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>N8N 워크플로우명 (Key)</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151", textAlign: "center" }}>활성 여부</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151", textAlign: "center" }}>계약 상태</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>시작일</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151", textAlign: "right" }}>상세</th>
            </tr>
          </thead>
          <tbody>
            {loading && contracts.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "#6b7280" }}>
                  불러오는 중...
                </td>
              </tr>
            ) : filteredContracts.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#6b7280" }}>
                  {contracts.length === 0 ? "배정된 워크플로우 매핑 정보가 없습니다. 우측 상단 버튼을 통해 새로운 매핑을 추가해 주십시오." : "검색 결과가 없습니다."}
                </td>
              </tr>
            ) : (
              filteredContracts.map((contract) => (
                <tr
                  key={contract.contractId}
                  onClick={() => onSelect(contract)}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    cursor: "pointer",
                    transition: "background-color 0.1s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <td style={{ padding: "14px 16px", fontWeight: 600, color: "#111111" }}>
                    <div>{getClientName(contract.clientId)}</div>
                    <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 400, marginTop: "2px", fontFamily: "monospace" }}>
                      {contract.clientId}
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px", color: "#374151" }}>
                    <div style={{ fontWeight: 600 }}>{getWorkflowName(contract.workflowKey)}</div>
                    <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 400, marginTop: "2px", fontFamily: "monospace" }}>
                      {contract.workflowKey}
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "center" }}>
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
                      {contract.enabled ? "활성" : "비활성"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "center" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: contract.contractStatus === "active" ? "#047857" : contract.contractStatus === "paused" ? "#d97706" : "#b91c1c",
                      }}
                    >
                      {contract.contractStatus === "active" ? "유효(active)" : contract.contractStatus === "paused" ? "일시정지(paused)" : "종료(ended)"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", color: "#6b7280", fontSize: "12px" }}>
                    {contract.startedAt ? new Date(contract.startedAt).toLocaleDateString() : "없음"}
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right", color: "#2563eb", fontWeight: 600 }}>
                    보기 ➡️
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 개발자용 테스트 샘플 계약 배정 패널 (details/summary 접이식 영역 격리) */}
      <details
        style={{
          border: "1px dashed #d1d5db",
          borderRadius: "8px",
          padding: "12px 16px",
          backgroundColor: "#f9fafb",
          marginTop: "12px",
          cursor: "pointer",
        }}
      >
        <summary style={{ fontSize: "12px", fontWeight: 700, color: "#4b5563", outline: "none" }}>
          🛠️ 개발자용 테스트 도구 (격리 패널)
        </summary>
        <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "default" }}>
          <p style={{ fontSize: "11.5px", color: "#6b7280", margin: 0, lineHeight: 1.4 }}>
            렌탈톡톡 고객사(`client_rentaltoktok_001`)에 지출결의서 자동화 계약을 원터치로 빠르게 배정하여 가동을 도우는 테스트 도구입니다.
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRegisterSampleContract();
            }}
            disabled={loading}
            style={{
              backgroundColor: "#ffffff",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "11px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
          >
            {loading ? "처리 중..." : "🤝 샘플 매핑 즉시 배정"}
          </button>
        </div>
      </details>
    </div>
  );
}
