// 이 파일은 N8N 워크플로우 목록(List)을 표 형식으로 보여주고 상세 조회/신규 등록/샘플 생성을 트리거하는 서브 컴포넌트입니다.

"use client";

import { useState, useEffect } from "react";
import type { WorkflowTemplate } from "@/types/n8lient";
import { ListSearchFilterBar, type FilterField } from "@/components/core/ListSearchFilterBar";

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
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>이름 (줄임말)</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>워크플로우 식별 Key</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>버전</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>상태</th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#374151" }}>설정 키 개수</th>
            </tr>
          </thead>
          <tbody>
            {loading && templates.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "#6b7280" }}>
                  불러오는 중...
                </td>
              </tr>
            ) : filteredTemplates.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#6b7280" }}>
                  {templates.length === 0 ? "등록된 N8N 워크플로우가 없습니다. 우측 상단 버튼을 통해 새 명세를 등록해 주십시오." : "검색 결과가 없습니다."}
                </td>
              </tr>
            ) : (
              filteredTemplates.map((template) => (
                <tr
                  key={template.workflowKey}
                  onClick={() => onSelect(template)}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    cursor: "pointer",
                    transition: "background-color 0.1s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <td style={{ padding: "14px 16px", fontWeight: 600, color: "#111111" }}>
                    {template.name} <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: "12px" }}>({template.shortName})</span>
                  </td>
                  <td style={{ padding: "14px 16px", fontFamily: "monospace", color: "#4b5563" }}>
                    {template.workflowKey}
                  </td>
                  <td style={{ padding: "14px 16px", color: "#4b5563" }}>v{template.version}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        backgroundColor: template.status === "published" ? "#d1fae5" : template.status === "disabled" ? "#fee2e2" : "#f3f4f6",
                        color: template.status === "published" ? "#065f46" : template.status === "disabled" ? "#991b1b" : "#374151",
                        padding: "2px 6px",
                        borderRadius: "999px",
                      }}
                    >
                      {template.status === "published" ? "배포 완료" : template.status === "disabled" ? "비활성" : "작성 중"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", color: "#6b7280" }}>
                    {template.configSchema?.length || 0}개
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
