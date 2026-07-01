// 이 파일은 N8N 워크플로우 목록(List)을 표 형식으로 보여주고 상세 조회/신규 등록/샘플 생성을 트리거하는 서브 컴포넌트입니다.
// N8lientDataGrid 표준 v1을 적용했습니다.

"use client";

import React, { useState, useEffect } from "react";
import type { WorkflowTemplate } from "@/types/n8lient";
import { ListSearchFilterBar, type FilterField } from "@/components/core/ListSearchFilterBar";
import { N8lientDataGrid } from "@/components/common/data/N8lientDataGrid";
import { N8lientStatusBadge } from "@/components/common/data/N8lientStatusBadge";
import type { ColumnDef } from "@tanstack/react-table";

interface WorkflowListProps {
  templates: WorkflowTemplate[];
  loading: boolean;
  onSelect: (template: WorkflowTemplate) => void;
  onCreateClick: () => void;
}

const statusFilterFields: FilterField[] = [
  {
    key: "status",
    label: "배포 상태",
    options: [
      { value: "published", label: "배포 완료" },
      { value: "draft", label: "작성 중" },
      { value: "disabled", label: "비활성" },
    ],
  },
];

export function WorkflowList({
  templates,
  loading,
  onSelect,
  onCreateClick,
}: WorkflowListProps) {
  const [filteredTemplates, setFilteredTemplates] = useState<WorkflowTemplate[]>([]);

  // 부모 데이터가 갱신되거나 변경되었을 때 로컬 필터 리스트 동기화
  useEffect(() => {
    setFilteredTemplates(templates);
  }, [templates]);

  // 검색 및 필터 변경 이벤트 핸들러
  const handleFilterChange = (query: string, filters: Record<string, string>) => {
    const searchVal = query.trim().toLowerCase();
    const statusFilter = filters.status || "";

    const filtered = templates.filter((template) => {
      // 1. 배포 상태 필터 검사
      if (statusFilter && template.status !== statusFilter) {
        return false;
      }

      // 2. 검색어 필터 검사 (명세서명, workflowKey, shortName, webhookSecretId, n8nServerKey)
      if (searchVal) {
        const nameMatch = template.name?.toLowerCase().includes(searchVal);
        const keyMatch = template.workflowKey?.toLowerCase().includes(searchVal);
        const shortNameMatch = template.shortName?.toLowerCase().includes(searchVal);
        const secretIdMatch = template.webhookSecretId?.toLowerCase().includes(searchVal);
        const serverKeyMatch = template.n8nServerKey?.toLowerCase().includes(searchVal);

        return nameMatch || keyMatch || shortNameMatch || secretIdMatch || serverKeyMatch;
      }

      return true;
    });

    setFilteredTemplates(filtered);
  };

  // N8lientDataGrid 컬럼 정의
  const columns = React.useMemo<ColumnDef<WorkflowTemplate, any>[]>(() => [
    {
      accessorKey: "name",
      header: "이름 (줄임말)",
      size: 260,
      meta: {
        headerAlign: "center",
        cellAlign: "left",
      },
      cell: ({ row }) => {
        const name = row.original.name || "";
        const shortName = row.original.shortName ? ` (${row.original.shortName})` : "";
        const fullName = `${name}${shortName}`;
        const displayName = fullName.length > 25 ? `${fullName.slice(0, 25)}...` : fullName;
        return (
          <div className="ux_table_text_ellipsis" title={fullName} style={{ fontWeight: 600, color: "#111111" }}>
            {name}
            {row.original.shortName && (
              <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: "12px", marginLeft: "4px" }}>
                ({row.original.shortName})
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "workflowKey",
      header: "워크플로우 식별 Key",
      size: 240,
      meta: {
        headerAlign: "center",
        cellAlign: "left",
      },
      cell: ({ row }) => {
        const val = row.original.workflowKey || "";
        const displayName = val.length > 25 ? `${val.slice(0, 25)}...` : val;
        return (
          <div className="ux_table_text_ellipsis" title={val} style={{ fontFamily: "monospace", color: "#4b5563" }}>
            {displayName}
          </div>
        );
      },
    },
    {
      accessorKey: "version",
      header: "버전",
      size: 100,
      meta: {
        headerAlign: "center",
        cellAlign: "center",
      },
      cell: ({ row }) => {
        return <span>v{row.original.version || "1.0.0"}</span>;
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
        let badgeType: "success" | "pending" | "default" | "error" = "default";
        let statusLabel = "작성 중";

        if (status === "published") {
          badgeType = "success";
          statusLabel = "배포 완료";
        } else if (status === "disabled") {
          badgeType = "default";
          statusLabel = "비활성";
        } else if (status === "draft") {
          badgeType = "pending";
          statusLabel = "작성 중";
        }

        return (
          <N8lientStatusBadge type={badgeType}>
            {statusLabel}
          </N8lientStatusBadge>
        );
      },
    },
    {
      accessorKey: "configSchema",
      header: "설정 키 개수",
      size: 120,
      meta: {
        headerAlign: "center",
        cellAlign: "center",
      },
      cell: ({ row }) => {
        const count = row.original.configSchema?.length || 0;
        return <span>{count}개</span>;
      },
    },
  ], []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 타이틀 및 등록 버튼 액션 바 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
            📂 등록된 N8N 워크플로우 명세 목록
          </h2>
          <p style={{ fontSize: "12.5px", color: "#6b7280", margin: 0 }}>
            플랫폼 전체에서 제공되는 자동화 명세 목록입니다. 각 항목을 클릭하여 상세 스키마 조회가 가능합니다.
          </p>
        </div>
        <button
          className="ux_button ux_button_primary"
          onClick={onCreateClick}
          style={{
            borderRadius: "6px",
            padding: "8px 16px",
            border: "none",
            transition: "background-color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#242424")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#111111")}
        >
          ➕ 새 워크플로우 등록
        </button>
      </div>

      {/* 공통 검색/필터 바 탑재 */}
      <ListSearchFilterBar
        searchPlaceholder="워크플로우명, Key, shortName, 비밀키 ID 등 검색..."
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
          data={filteredTemplates}
          columns={columns}
          getRowId={(row) => row.workflowKey}
          loading={loading}
          emptyTitle="등록된 N8N 워크플로우가 없습니다."
          emptyDescription="우측 상단 버튼을 통해 새 명세를 등록해 주십시오."
          onRowClick={onSelect}
        />
      </div>
    </div>
  );
}

