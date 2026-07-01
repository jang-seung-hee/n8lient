// 이 파일은 고객사별 N8N 워크플로우 매핑 목록을 표 형식으로 보여주는 컴포넌트입니다.
// 기존 계약 토글 등의 제어 액션을 배제하고 오직 조회 및 상세 선택, 신규 매핑 등록 트리거만 처리합니다.
// N8lientDataGrid 표준 v1을 적용했습니다.

"use client";

import React, { useState, useEffect } from "react";
import type { ClientContract, ClientDoc, WorkflowTemplate } from "@/types/n8lient";
import { ListSearchFilterBar, type FilterField } from "@/components/core/ListSearchFilterBar";
import { N8lientDataGrid } from "@/components/common/data/N8lientDataGrid";
import { N8lientStatusBadge } from "@/components/common/data/N8lientStatusBadge";
import type { ColumnDef } from "@tanstack/react-table";

interface ContractMappingListProps {
  contracts: ClientContract[];
  clients: ClientDoc[];
  templates: WorkflowTemplate[];
  loading: boolean;
  onSelect: (contract: ClientContract) => void;
  onCreateClick: () => void;
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

// YY.MM.DD HH:mm 날짜 포맷팅 헬퍼
function formatCompactDateTime(dateVal: any): string {
  if (!dateVal) return "없음";
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return "없음";

  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return `${yy}.${mm}.${dd} ${hh}:${min}`;
}

export function ContractMappingList({
  contracts,
  clients,
  templates,
  loading,
  onSelect,
  onCreateClick,
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

  // N8lientDataGrid 컬럼 정의
  const columns = React.useMemo<ColumnDef<ClientContract, any>[]>(() => [
    {
      accessorKey: "clientId",
      header: "고객사명 (ID)",
      size: 240,
      meta: {
        headerAlign: "center",
        cellAlign: "left",
      },
      cell: ({ row }) => {
        const clientId = row.original.clientId || "";
        const clientName = getClientName(clientId);
        const displayName = clientName.length > 25 ? `${clientName.slice(0, 25)}...` : clientName;
        return (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div className="ux_table_text_ellipsis" title={clientName} style={{ fontWeight: 600, color: "#111111" }}>
              {displayName}
            </div>
            <div className="ux_table_text_ellipsis" title={clientId} style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 400, marginTop: "2px", fontFamily: "monospace" }}>
              {clientId}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "workflowKey",
      header: "N8N 워크플로우명 (Key)",
      size: 260,
      meta: {
        headerAlign: "center",
        cellAlign: "left",
      },
      cell: ({ row }) => {
        const key = row.original.workflowKey || "";
        const workflowName = getWorkflowName(key);
        const displayWorkflowName = workflowName.length > 25 ? `${workflowName.slice(0, 25)}...` : workflowName;
        return (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div className="ux_table_text_ellipsis" title={workflowName} style={{ fontWeight: 600, color: "#374151" }}>
              {displayWorkflowName}
            </div>
            <div className="ux_table_text_ellipsis" title={key} style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 400, marginTop: "2px", fontFamily: "monospace" }}>
              {key}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "enabled",
      header: "활성 여부",
      size: 110,
      meta: {
        headerAlign: "center",
        cellAlign: "center",
      },
      cell: ({ row }) => {
        const isEnabled = row.original.enabled;
        return (
          <N8lientStatusBadge type={isEnabled ? "success" : "default"}>
            {isEnabled ? "활성" : "비활성"}
          </N8lientStatusBadge>
        );
      },
    },
    {
      accessorKey: "contractStatus",
      header: "계약 상태",
      size: 120,
      meta: {
        headerAlign: "center",
        cellAlign: "center",
      },
      cell: ({ row }) => {
        const status = row.original.contractStatus;
        let badgeType: "success" | "pending" | "error" | "default" = "default";
        let statusLabel = "종료(ended)";

        if (status === "active") {
          badgeType = "success";
          statusLabel = "유효(active)";
        } else if (status === "paused") {
          badgeType = "pending";
          statusLabel = "일시정지(paused)";
        } else if (status === "ended") {
          badgeType = "error";
          statusLabel = "종료(ended)";
        }

        return (
          <N8lientStatusBadge type={badgeType}>
            {statusLabel}
          </N8lientStatusBadge>
        );
      },
    },
    {
      accessorKey: "startedAt",
      header: "시작일",
      size: 140,
      meta: {
        headerAlign: "center",
        cellAlign: "center",
      },
      cell: ({ row }) => {
        return (
          <span style={{ fontSize: "12px", color: "#6b7280" }}>
            {formatCompactDateTime(row.original.startedAt)}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "상세",
      size: 100,
      meta: {
        headerAlign: "center",
        cellAlign: "center",
      },
      cell: () => {
        return (
          <span style={{ color: "#2563eb", fontWeight: 600 }}>
            보기 ➡️
          </span>
        );
      },
    },
  ], [clients, templates]);

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
        <N8lientDataGrid
          data={filteredContracts}
          columns={columns}
          getRowId={(row) => row.contractId}
          loading={loading}
          emptyTitle="배정된 워크플로우 매핑 정보가 없습니다."
          emptyDescription="우측 상단 버튼을 통해 새로운 매핑을 추가해 주십시오."
          onRowClick={onSelect}
          storageKey="operator-contracts-page-size"
        />
      </div>
    </div>
  );
}

