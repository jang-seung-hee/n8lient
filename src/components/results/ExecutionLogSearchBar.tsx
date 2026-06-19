/**
 * 이 파일은 오퍼레이터 및 회사관리자가 실행 로그를 편리하게 필터링할 수 있는 공통 검색바 컴포넌트를 제공합니다.
 * 한국어 주석 표준을 준수합니다.
 */

"use client";

import React from "react";
import { ListSearchFilterBar, type FilterField } from "@/components/core/ListSearchFilterBar";

interface ExecutionLogSearchBarProps {
  searchPlaceholder?: string;
  onChange: (query: string, filterValues: Record<string, string>) => void;
}

const filterFields: FilterField[] = [
  {
    key: "status",
    label: "실행 상태",
    options: [
      { value: "success", label: "성공" },
      { value: "processing", label: "처리중" },
      { value: "failed", label: "실패" },
      { value: "queued", label: "대기" },
      { value: "skipped", label: "처리 제외" },
      { value: "config_error", label: "설정 오류" },
    ],
  },
  {
    key: "errorPhase",
    label: "실패 단계",
    options: [
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
    ],
  },
  {
    key: "errorSource",
    label: "실패 위치",
    options: [
      { value: "app", label: "app" },
      { value: "api_route", label: "api_route" },
      { value: "gateway", label: "gateway" },
      { value: "n8n", label: "n8n" },
      { value: "callback", label: "callback" },
      { value: "firestore", label: "firestore" },
    ],
  },
];

export function ExecutionLogSearchBar({
  searchPlaceholder = "실행 ID, Key, UID, 이메일, 에러코드 검색...",
  onChange,
}: ExecutionLogSearchBarProps) {
  return (
    <ListSearchFilterBar
      searchPlaceholder={searchPlaceholder}
      filterFields={filterFields}
      onChange={onChange}
    />
  );
}
