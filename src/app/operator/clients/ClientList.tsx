// 이 파일은 등록된 고객사(Client) 목록을 표 형식으로 보여주고 상세 조회 및 신규 등록을 트리거하는 컴포넌트입니다.
// N8lientDataGrid 표준 v1을 적용했습니다.

"use client";

import React, { useState, useEffect } from "react";
import type { ClientDoc } from "@/types/n8lient";
import { ListSearchFilterBar, type FilterField } from "@/components/core/ListSearchFilterBar";
import { N8lientDataGrid } from "@/components/common/data/N8lientDataGrid";
import { N8lientStatusBadge } from "@/components/common/data/N8lientStatusBadge";
import type { ColumnDef } from "@tanstack/react-table";

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

  // N8lientDataGrid 컬럼 정의
  const columns = React.useMemo<ColumnDef<ClientDoc, any>[]>(() => [
    {
      accessorKey: "companyName",
      header: "고객사명",
      size: 260,
      meta: {
        headerAlign: "center",
        cellAlign: "left",
      },
      cell: ({ row }) => {
        const val = row.original.companyName || "";
        const displayVal = val.length > 25 ? `${val.slice(0, 25)}...` : val;
        return (
          <div className="ux_table_text_ellipsis" title={val} style={{ fontWeight: 600, color: "#111111" }}>
            {displayVal}
          </div>
        );
      },
    },
    {
      accessorKey: "clientId",
      header: "고객사 ID",
      size: 200,
      meta: {
        headerAlign: "center",
        cellAlign: "left",
      },
      cell: ({ row }) => {
        const val = row.original.clientId || "";
        const displayVal = val.length > 25 ? `${val.slice(0, 25)}...` : val;
        return (
          <div className="ux_table_text_ellipsis" title={val} style={{ fontFamily: "monospace", color: "#4b5563" }}>
            {displayVal}
          </div>
        );
      },
    },
    {
      accessorKey: "companyCode",
      header: "발급 회사코드",
      size: 170,
      meta: {
        headerAlign: "center",
        cellAlign: "center",
      },
      cell: ({ row }) => {
        const val = row.original.companyCode || "";
        return (
          <div title={val} style={{ fontFamily: "monospace", fontWeight: 600, color: "#1d4ed8" }}>
            {val}
          </div>
        );
      },
    },
    {
      accessorKey: "defaultTimezone",
      header: "기본 타임존",
      size: 150,
      meta: {
        headerAlign: "center",
        cellAlign: "center",
      },
      cell: ({ row }) => {
        return <span>{row.original.defaultTimezone || "-"}</span>;
      },
    },
    {
      accessorKey: "status",
      header: "상태",
      size: 110,
      meta: {
        headerAlign: "center",
        cellAlign: "center",
      },
      cell: ({ row }) => {
        const status = row.original.status;
        let badgeType: "success" | "error" | "pending" | "default" = "default";
        let statusLabel = "설정대기";

        if (status === "active") {
          badgeType = "success";
          statusLabel = "운영중";
        } else if (status === "suspended" || status === "terminated") {
          badgeType = "error";
          statusLabel = status === "suspended" ? "정지됨" : "계약종료";
        } else if (status === "pending_setup") {
          badgeType = "pending";
          statusLabel = "설정대기";
        }

        return (
          <N8lientStatusBadge type={badgeType}>
            {statusLabel}
          </N8lientStatusBadge>
        );
      },
    },
  ], []);

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
        <N8lientDataGrid
          data={filteredClients}
          columns={columns}
          getRowId={(row) => row.clientId}
          loading={loading}
          emptyTitle="등록된 고객사가 없습니다."
          emptyDescription="우측 상단 버튼을 통해 새 고객사를 등록해 주십시오."
          onRowClick={onSelect}
        />
      </div>
    </div>
  );
}


