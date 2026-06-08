// 이 파일은 시스템 운영자가 플랫폼 전체에서 발생한 n8n 실행 이력 로그를 조회하는 화면입니다.

"use client";

import { useState } from "react";
import { ListSearchFilterBar, type FilterField } from "@/components/core/ListSearchFilterBar";

const statusFilterFields: FilterField[] = [
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
];

export default function OperatorLogs() {
  const [query, setQuery] = useState("");

  // 검색 및 필터 변경 이벤트 핸들러
  const handleFilterChange = (q: string, filters: Record<string, string>) => {
    setQuery(q);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
          📂 플랫폼 전체 실행 로그 모니터링
        </h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
          모든 등록된 회사 고객사들의 n8n 실행 트랜잭션 전체 로그입니다.
        </p>
      </div>

      {/* 공통 검색/필터 바 탑재 */}
      <ListSearchFilterBar
        searchPlaceholder="실행 ID, Key, UID, 고객사 ID, 이메일, 에러코드 검색..."
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1.2fr 1.2fr 2fr 1fr",
            padding: "10px 16px",
            backgroundColor: "#f9fafb",
            borderBottom: "1px solid #e5e7eb",
            fontSize: "12px",
            fontWeight: 600,
            color: "#374151",
          }}
        >
          <span>실행 ID</span>
          <span>고객사 ID</span>
          <span>요청자 UID / 이메일</span>
          <span>실행명 (종류)</span>
          <span style={{ textAlign: "right" }}>상태</span>
        </div>

        <div style={{ padding: "32px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
          조회된 N8N 워크플로우 실행 로그가 없습니다. (실시간 Firestore 연동 준비 중)
        </div>
      </div>
    </div>
  );
}
