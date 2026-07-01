// [ExecutionLogFilterBar.tsx]
// 이 파일은 실행 로그 화면에서 사용되는 검색 및 다중 필터 UI 바 공통 컴포넌트입니다.
// 검색 버튼과 초기화 액션 뱃지 기능이 탑재되어 있습니다.
// 한국어 주석 표준을 준수합니다.

"use client";

import React, { useState, useMemo } from "react";
import { WorkflowTemplate } from "@/types/n8lient";
import { WorkflowMultiSelectFilter, type WorkflowFilterOption } from "./WorkflowMultiSelectFilter";

export type ExecutionLogFilters = {
  status: string;
  errorPhase: string;
  errorSource: string;
  workflowKeys: string[];
};

export interface ExecutionLogFilterBarProps {
  searchPlaceholder?: string;
  templates: Record<string, WorkflowTemplate>;
  onChange: (query: string, filters: ExecutionLogFilters) => void;
}

const statusOptions = [
  { value: "success", label: "성공" },
  { value: "processing", label: "처리중" },
  { value: "failed", label: "실패" },
  { value: "queued", label: "대기" },
  { value: "skipped", label: "처리 제외" },
  { value: "config_error", label: "설정 오류" },
];

const errorPhaseOptions = [
  { value: "APP_VALIDATE", label: "APP_VALIDATE" },
  { value: "API_ROUTE_VALIDATE", label: "API_ROUTE_VALIDATE" },
  { value: "API_ROUTE_GATEWAY_CALL", label: "API_ROUTE_GATEWAY_CALL" },
  { value: "GATEWAY_VALIDATE", label: "GATEWAY_VALIDATE" },
  { value: "GATEWAY_STORAGE", label: "GATEWAY_STORAGE" },
  { value: "GATEWAY_N8N_CALL", label: "GATEWAY_N8N_CALL" },
  { value: "N8N_WORKFLOW", label: "N8N_WORKFLOW" },
  { value: "N8N_EMAIL", label: "N8N_EMAIL" },
  { value: "N8N_CALLBACK", label: "N8N_CALLBACK" },
  { value: "GATEWAY_CALLBACK", label: "GATEWAY_CALLBACK" },
  { value: "FIRESTORE_UPDATE", label: "FIRESTORE_UPDATE" },
];

const errorSourceOptions = [
  { value: "app", label: "app" },
  { value: "api_route", label: "api_route" },
  { value: "gateway", label: "gateway" },
  { value: "n8n", label: "n8n" },
  { value: "callback", label: "callback" },
  { value: "firestore", label: "firestore" },
];

export function ExecutionLogFilterBar({
  searchPlaceholder = "실행 ID, Key, UID, 이메일, 에러코드 검색...",
  templates,
  onChange,
}: ExecutionLogFilterBarProps) {
  // 로컬 draft 필터 상태 관리
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState("");
  const [errorPhase, setErrorPhase] = useState("");
  const [errorSource, setErrorSource] = useState("");
  const [workflowKeys, setWorkflowKeys] = useState<string[]>([]);

  // 템플릿 정보를 바탕으로 다중 선택 옵션 빌드 및 정렬
  const workflowOptions = useMemo<WorkflowFilterOption[]>(() => {
    const list = Object.values(templates).map((t) => {
      const label = t.name?.trim() || (t as any).automationName?.trim() || (t as any).workflowLabel || (t as any).workflowName || t.workflowKey || "";
      const value = t.workflowKey || (t as any).id || "";
      return {
        value,
        label: label || value || "알 수 없는 워크플로우",
      };
    });

    // 중복 제거 및 정렬
    const uniqueMap = new Map<string, WorkflowFilterOption>();
    list.forEach((item) => {
      if (item.value) {
        uniqueMap.set(item.value, item);
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) => a.label.localeCompare(b.label, "ko"));
  }, [templates]);

  // 검색 조건 유효성 평가
  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    status !== "" ||
    errorPhase !== "" ||
    errorSource !== "" ||
    workflowKeys.length > 0;

  // 검색 버튼 클릭 또는 엔터 키 입력 시 상위 컴포넌트로 전달 (지연 적용)
  const handleSearch = () => {
    onChange(searchQuery, {
      status,
      errorPhase,
      errorSource,
      workflowKeys,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // 초기화 처리 (즉시 적용)
  const handleClear = () => {
    setSearchQuery("");
    setStatus("");
    setErrorPhase("");
    setErrorSource("");
    setWorkflowKeys([]);
    onChange("", {
      status: "",
      errorPhase: "",
      errorSource: "",
      workflowKeys: [],
    });
  };

  return (
    <div
      className="ux_info_box"
      style={{
        display: "flex",
        gap: "10px",
        alignItems: "center",
        padding: "8px 12px",
        marginBottom: "16px",
        borderRadius: "6px",
        flexWrap: "wrap",
      }}
    >
      {/* 1. 텍스트 검색창 */}
      <div style={{ flex: 1, minWidth: "200px" }}>
        <input
          type="text"
          className="ux_input_compact"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={searchPlaceholder}
        />
      </div>

      {/* 2. 워크플로우 다중 선택 필터 */}
      <div style={{ minWidth: "180px" }}>
        <WorkflowMultiSelectFilter
          options={workflowOptions}
          selectedValues={workflowKeys}
          onChange={setWorkflowKeys}
          placeholder="전체 워크플로우"
        />
      </div>

      {/* 3. 실행 상태 필터 */}
      <div style={{ minWidth: "120px" }}>
        <select
          className="ux_select_compact"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ cursor: "pointer" }}
        >
          <option value="">전체 (실행 상태)</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 4. 실패 단계 필터 */}
      <div style={{ minWidth: "120px" }}>
        <select
          className="ux_select_compact"
          value={errorPhase}
          onChange={(e) => setErrorPhase(e.target.value)}
          style={{ cursor: "pointer" }}
        >
          <option value="">전체 (실패 단계)</option>
          {errorPhaseOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 5. 실패 위치 필터 */}
      <div style={{ minWidth: "120px" }}>
        <select
          className="ux_select_compact"
          value={errorSource}
          onChange={(e) => setErrorSource(e.target.value)}
          style={{ cursor: "pointer" }}
        >
          <option value="">전체 (실패 위치)</option>
          {errorSourceOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 6. 검색 실행 버튼 */}
      <div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={!hasActiveFilters}
          className="ux_button_compact ux_button_primary"
          style={{
            height: "34px",
            fontSize: "12.5px",
            padding: "0 16px",
          }}
        >
          검색
        </button>
      </div>

      {/* 7. 초기화 액션 뱃지 */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleClear}
          className="ux_reset_badge"
        >
          ↺ 초기화
        </button>
      )}
    </div>
  );
}
