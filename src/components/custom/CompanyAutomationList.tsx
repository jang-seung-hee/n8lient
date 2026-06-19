"use client";

import { useState } from "react";
import { ListSearchFilterBar, FilterField } from "@/components/core/ListSearchFilterBar";
import type { ClientContract, ClientAutomation, WorkflowTemplate } from "@/types/n8lient";
import { resolveWorkflowDisplayName } from "@/common/workflow/resolveWorkflowDisplayName";

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
  const filteredContracts = contracts.filter((contract) => {
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <ListSearchFilterBar
        searchPlaceholder="N8N 워크플로우명 또는 Key 검색..."
        filterFields={filterFields}
        onChange={handleFilterChange}
      />

      {filteredContracts.length === 0 ? (
        <div
          style={{
            padding: "40px 16px",
            border: "1px dashed #e5e7eb",
            borderRadius: "8px",
            textAlign: "center",
            color: "#6b7280",
            fontSize: "13px",
            backgroundColor: "#ffffff",
          }}
        >
          계약된 N8N 워크플로우가 없거나 검색 결과가 없습니다.
        </div>
      ) : (
        <div
          className="ux_card"
          style={{
            padding: 0,
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
          }}
        >
          <div className="ux_scroll_area">
            <div style={{ minWidth: "760px" }}>
          {/* 테이블 헤더 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.8fr 1.2fr 1fr 1fr 1fr 0.8fr 0.8fr",
              padding: "10px 16px",
              backgroundColor: "#f9fafb",
              borderBottom: "1px solid #e5e7eb",
              fontSize: "12px",
              fontWeight: 600,
              color: "#374151",
            }}
          >
            <span>N8N 워크플로우명</span>
            <span>workflowKey</span>
            <span>설정 상태</span>
            <span>활성 여부</span>
            <span>직원 사용</span>
            <span>설정 항목 수</span>
            <span style={{ textAlign: "right" }}>액션</span>
          </div>

          {/* 목록 바디 */}
          {filteredContracts.map((contract, idx) => {
            const template = templates[contract.workflowKey];
            const auto = automations.find((a) => a.workflowKey === contract.workflowKey);
            const settingCount = auto?.settings ? Object.keys(auto.settings).length : 0;

            return (
              <div
                key={contract.contractId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.8fr 1.2fr 1fr 1fr 1fr 0.8fr 0.8fr",
                  padding: "12px 16px",
                  borderBottom: idx < filteredContracts.length - 1 ? "1px solid #f3f4f6" : "none",
                  fontSize: "13px",
                  color: "#111111",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 600, color: "#111827" }}>
                  {resolveWorkflowDisplayName({
                    template,
                    automation: auto ?? null,
                    workflowKey: contract.workflowKey,
                  })}
                </span>
                <span style={{ fontFamily: "monospace", color: "#6b7280", fontSize: "12px" }}>
                  {contract.workflowKey}
                </span>
                <span>
                  {auto ? (
                    <span style={{ color: "#059669", fontWeight: 500 }}>설정 완료</span>
                  ) : (
                    <span style={{ color: "#dc2626", fontWeight: 500 }}>⚠️ 설정 미완료</span>
                  )}
                </span>
                <span>
                  <span
                    className={auto?.enabled ? "ux_badge ux_badge_success" : "ux_badge ux_badge_danger"}
                    style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "4px" }}
                  >
                    {auto?.enabled ? "활성화" : "비활성화"}
                  </span>
                </span>
                <span>
                  {!auto ? (
                    <span style={{ fontSize: "11px", color: "#9ca3af" }}>-</span>
                  ) : auto.companyDisabled === true ? (
                    <span
                      className="ux_badge ux_badge_warning"
                      style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "4px" }}
                    >
                      사용 안함
                    </span>
                  ) : (
                    <span
                      className="ux_badge ux_badge_info"
                      style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "4px" }}
                    >
                      사용함
                    </span>
                  )}
                </span>
                <span style={{ fontWeight: 500, color: "#4b5563", paddingLeft: "8px" }}>
                  {settingCount}개
                </span>
                <div style={{ textAlign: "right" }}>
                  <button
                    className="ux_button_compact ux_button_secondary"
                    onClick={() => onSelectContract(contract)}
                    style={{
                      fontSize: "11px",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
                  >
                    🔍 상세 보기
                  </button>
                </div>
              </div>
            );
          })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
