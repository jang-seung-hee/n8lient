// 이 파일은 등록된 고객사(Client) 목록을 표 형식으로 보여주고 상세 조회 및 신규 등록을 트리거하는 컴포넌트입니다.

"use client";

import { useState, useEffect } from "react";
import type { ClientDoc } from "@/types/n8lient";
import { ListSearchFilterBar, type FilterField } from "@/components/core/ListSearchFilterBar";

interface ClientListProps {
  clients: ClientDoc[];
  loading: boolean;
  onSelect: (client: ClientDoc) => void;
  onCreateClick: () => void;
}

const statusFilterFields: FilterField[] = [
  {
    key: "status",
    label: "상태",
    options: [
      { value: "active", label: "운영중" },
      { value: "pending_setup", label: "설정대기" },
      { value: "suspended", label: "정지됨" },
      { value: "terminated", label: "계약종료" },
    ],
  },
];

export function ClientList({
  clients,
  loading,
  onSelect,
  onCreateClick,
}: ClientListProps) {
  const [filteredClients, setFilteredClients] = useState<ClientDoc[]>([]);

  // 부모 데이터가 갱신되거나 변경되었을 때 로컬 필터 리스트 동기화
  useEffect(() => {
    setFilteredClients(clients);
  }, [clients]);

  // 검색 및 필터 변경 이벤트 핸들러
  const handleFilterChange = (query: string, filters: Record<string, string>) => {
    const searchVal = query.trim().toLowerCase();
    const statusFilter = filters.status || "";

    const filtered = clients.filter((client) => {
      // 1. 상태 필터 검사
      if (statusFilter && client.status !== statusFilter) {
        return false;
      }

      // 2. 검색어 필터 검사
      if (searchVal) {
        const companyNameMatch = client.companyName?.toLowerCase().includes(searchVal);
        const clientIdMatch = client.clientId?.toLowerCase().includes(searchVal);
        const companyCodeMatch = client.companyCode?.toLowerCase().includes(searchVal);
        const emailMatch = client.defaultReportEmail?.toLowerCase().includes(searchVal);

        return companyNameMatch || clientIdMatch || companyCodeMatch || emailMatch;
      }

      return true;
    });

    setFilteredClients(filtered);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 타이틀 및 등록 버튼 액션 바 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
            📂 등록된 고객사 목록
          </h2>
          <p style={{ fontSize: "12.5px", color: "#6b7280", margin: 0 }}>
            플랫폼을 이용 중인 고객사 계정과 발급 코드 상태를 관리합니다. 클릭 시 상세 설정 조회가 가능합니다.
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
          ➕ 새 고객사 등록
        </button>
      </div>

      {/* 공통 검색/필터 바 탑재 */}
      <ListSearchFilterBar
        searchPlaceholder="고객사명, ID, 회사코드, 보고이메일 검색..."
        filterFields={statusFilterFields}
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
            <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>고객사명</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>고객사 ID</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>발급 회사코드</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>기본 타임존</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>상태</th>
            </tr>
          </thead>
          <tbody>
            {loading && clients.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "#6b7280" }}>
                  불러오는 중...
                </td>
              </tr>
            ) : filteredClients.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#6b7280" }}>
                  {clients.length === 0 ? "등록된 고객사가 없습니다. 우측 상단 버튼을 통해 새 고객사를 등록해 주십시오." : "검색 결과가 없습니다."}
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => (
                <tr
                  key={client.clientId}
                  onClick={() => onSelect(client)}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    cursor: "pointer",
                    transition: "background-color 0.1s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <td style={{ padding: "14px 16px", fontWeight: 600, color: "#111111" }}>
                    {client.companyName}
                  </td>
                  <td style={{ padding: "14px 16px", fontFamily: "monospace", color: "#4b5563" }}>
                    {client.clientId}
                  </td>
                  <td style={{ padding: "14px 16px", fontFamily: "monospace", fontWeight: 600, color: "#1d4ed8" }}>
                    {client.companyCode}
                  </td>
                  <td style={{ padding: "14px 16px", color: "#4b5563" }}>
                    {client.defaultTimezone}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        backgroundColor: client.status === "active" ? "#d1fae5" : client.status === "suspended" ? "#fee2e2" : "#f3f4f6",
                        color: client.status === "active" ? "#065f46" : client.status === "suspended" ? "#991b1b" : "#374151",
                        padding: "2px 6px",
                        borderRadius: "999px",
                      }}
                    >
                      {client.status === "active" ? "운영중" : client.status === "suspended" ? "정지됨" : "설정대기"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

