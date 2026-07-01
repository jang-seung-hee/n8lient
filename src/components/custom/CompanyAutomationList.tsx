"use client";

// 한국어 주석 표준을 준수합니다.
import { useState, useMemo } from "react";
import { ListSearchFilterBar, FilterField } from "@/components/core/ListSearchFilterBar";
import type { ClientContract, ClientAutomation, WorkflowTemplate } from "@/types/n8lient";
import { resolveWorkflowDisplayName } from "@/common/workflow/resolveWorkflowDisplayName";
import { N8lientDataGrid } from "@/components/common/data/N8lientDataGrid";
import { N8lientStatusBadge } from "@/components/common/data/N8lientStatusBadge";
import { N8lientEmptyState } from "@/components/common/data/N8lientEmptyState";
import { ColumnDef } from "@tanstack/react-table";

interface CompanyAutomationListProps {
  contracts: ClientContract[];
  automations: ClientAutomation[];
  templates: Record<string, WorkflowTemplate>;
  onSelectContract: (contract: ClientContract) => void;
}

export default function CompanyAutomationList({
  contracts,
  automations,
  templates,
  onSelectContract,
}: CompanyAutomationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const filterFields: FilterField[] = [
    {
      key: "configStatus",
      label: "설정 상태",
      options: [
        { value: "configured", label: "설정 완료" },
        { value: "draft", label: "설정 미완료" },
      ],
    },
    {
      key: "enabled",
      label: "활성 여부",
      options: [
        { value: "true", label: "활성화" },
        { value: "false", label: "비활성화" },
      ],
    },
  ];

  const handleFilterChange = (query: string, nextFilters: Record<string, string>) => {
    setSearchQuery(query);
    setFilters(nextFilters);
  };

  // 필터링 적용
  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const template = templates[contract.workflowKey];
      const auto = automations.find((a) => a.workflowKey === contract.workflowKey);

      // 1. 검색어 필터링
      const name = resolveWorkflowDisplayName({
        template,
        automation: auto ?? null,
        workflowKey: contract.workflowKey,
      });
      const key = contract.workflowKey;
      const matchSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        key.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      // 2. 설정 상태 필터링
      const configStatus = filters["configStatus"];
      if (configStatus) {
        const isConfigured = !!auto;
        if (configStatus === "configured" && !isConfigured) return false;
        if (configStatus === "draft" && isConfigured) return false;
      }

      // 3. 활성 여부 필터링
      const enabledFilter = filters["enabled"];
      if (enabledFilter) {
        const isEnabled = auto?.enabled ?? false;
        if (enabledFilter === "true" && !isEnabled) return false;
        if (enabledFilter === "false" && (isEnabled || !auto)) return false;
      }

      return true;
    });
  }, [contracts, automations, templates, searchQuery, filters]);

  // 텍스트 축약 헬퍼 함수
  const truncateText = (value: string, maxLength = 25) => {
    if (!value) return "-";
    return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
  };

  // TanStack Table용 컬럼 정의
  const gridColumns = useMemo<ColumnDef<ClientContract>[]>(() => {
    return [
      {
        id: "workflowName",
        header: "N8N 워크플로우명",
        size: 240, // 기존 대비 약 30% 확장 유지
        meta: { headerAlign: "center" }, // 헤더는 가운데 정렬, 셀은 기본 좌측 정렬
        accessorFn: (row) => {
          const template = templates[row.workflowKey];
          const auto = automations.find((a) => a.workflowKey === row.workflowKey);
          return resolveWorkflowDisplayName({
            template,
            automation: auto ?? null,
            workflowKey: row.workflowKey,
          });
        },
        cell: ({ row }) => {
          const template = templates[row.original.workflowKey];
          const auto = automations.find((a) => a.workflowKey === row.original.workflowKey);
          const fullText = resolveWorkflowDisplayName({
            template,
            automation: auto ?? null,
            workflowKey: row.original.workflowKey,
          });
          return (
            <span style={{ fontWeight: 600, color: "#111827" }} title={fullText}>
              {truncateText(fullText, 25)}
            </span>
          );
        },
      },
      {
        accessorKey: "workflowKey",
        header: "workflowKey",
        size: 200, // 기존 대비 약 30% 확장 유지
        meta: { headerAlign: "center" }, // 헤더는 가운데 정렬, 셀은 기본 좌측 정렬
        cell: ({ row }) => {
          const key = row.original.workflowKey;
          return (
            <span
              style={{ fontFamily: "monospace", color: "#6b7280", fontSize: "12px" }}
              title={key}
            >
              {truncateText(key, 25)}
            </span>
          );
        },
      },
      {
        id: "configStatus",
        header: "설정 상태",
        size: 90, // 폭 약 10% 축소 유지
        meta: { headerAlign: "center", cellAlign: "center" }, // 둘 다 가운데 정렬
        accessorFn: (row) => {
          const auto = automations.find((a) => a.workflowKey === row.workflowKey);
          return auto ? "configured" : "draft";
        },
        cell: ({ row }) => {
          const auto = automations.find((a) => a.workflowKey === row.original.workflowKey);
          return (
            <N8lientStatusBadge type={auto ? "success" : "error"}>
              {auto ? "설정 완료" : "설정 미완료"}
            </N8lientStatusBadge>
          );
        },
      },
      {
        id: "enabled",
        header: "활성 여부",
        size: 90, // 폭 약 10% 축소 유지
        meta: { headerAlign: "center", cellAlign: "center" }, // 둘 다 가운데 정렬
        accessorFn: (row) => {
          const auto = automations.find((a) => a.workflowKey === row.workflowKey);
          return auto?.enabled ? "true" : "false";
        },
        cell: ({ row }) => {
          const auto = automations.find((a) => a.workflowKey === row.original.workflowKey);
          return (
            <N8lientStatusBadge type={auto?.enabled ? "success" : "error"}>
              {auto?.enabled ? "활성화" : "비활성화"}
            </N8lientStatusBadge>
          );
        },
      },
      {
        id: "employeeAccess",
        header: "직원 사용",
        size: 90, // 폭 약 10% 축소 유지
        meta: { headerAlign: "center", cellAlign: "center" }, // 둘 다 가운데 정렬
        cell: ({ row }) => {
          const auto = automations.find((a) => a.workflowKey === row.original.workflowKey);
          if (!auto) {
            return <span style={{ fontSize: "11px", color: "#9ca3af" }}>-</span>;
          }
          const isEmployeeDisabled = auto.companyDisabled === true;
          return (
            <N8lientStatusBadge type={isEmployeeDisabled ? "pending" : "success"}>
              {isEmployeeDisabled ? "사용 안함" : "사용함"}
            </N8lientStatusBadge>
          );
        },
      },
      {
        id: "settingCount",
        header: "설정 항목 수",
        size: 100, // 폭 약 10% 축소 유지
        meta: { headerAlign: "center", cellAlign: "center" }, // 둘 다 가운데 정렬
        cell: ({ row }) => {
          const auto = automations.find((a) => a.workflowKey === row.original.workflowKey);
          const settingCount = auto?.settings ? Object.keys(auto.settings).length : 0;
          return (
            <span style={{ fontWeight: 500, color: "#4b5563" }}>
              {settingCount}개
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "액션",
        meta: { headerAlign: "center", cellAlign: "center" }, // 둘 다 가운데 정렬
        cell: ({ row }) => (
          <div>
            <button
              className="ux_button_compact ux_button_secondary"
              onClick={() => onSelectContract(row.original)}
              style={{
                fontSize: "11px",
                padding: "4px 8px",
                borderRadius: "4px",
                boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
              }}
            >
              🔍 상세 보기
            </button>
          </div>
        ),
      },
    ];
  }, [automations, templates, onSelectContract]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <ListSearchFilterBar
        searchPlaceholder="N8N 워크플로우명 또는 Key 검색..."
        filterFields={filterFields}
        onChange={handleFilterChange}
      />

      {filteredContracts.length === 0 ? (
        <N8lientEmptyState
          title="계약된 N8N 워크플로우가 없거나 검색 결과가 없습니다."
          description="검색 필터 조건을 조정해 보세요."
        />
      ) : (
        <N8lientDataGrid
          data={filteredContracts}
          columns={gridColumns}
          getRowId={(row) => row.contractId}
          storageKey="company-admin-automations-page-size"
        />
      )}
    </div>
  );
}
