// 이 파일은 시스템 운영자가 플랫폼 전체에서 발생한 n8n 실행 이력 로그를 조회하는 화면입니다. (Mock)

"use client";

import { useState, useEffect } from "react";
import {
  mockSubmissions,
  mockApprovedUser,
  mockPendingUser,
  mockCompanyAdmin,
  mockOperator,
} from "@/mocks/mockData";
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

const mockUsers = [mockApprovedUser, mockPendingUser, mockCompanyAdmin, mockOperator];
const getUserEmail = (uid: string) => {
  const user = mockUsers.find((u) => u.uid === uid);
  return user ? user.email : "";
};

export default function OperatorLogs() {
  const [filteredSubmissions, setFilteredSubmissions] = useState(mockSubmissions);

  const getBadgeStyles = (status: string) => {
    switch (status) {
      case "success":
        return { bg: "#d1fae5", text: "#065f46", label: "성공" };
      case "processing":
        return { bg: "#dbeafe", text: "#1e40af", label: "처리중" };
      case "failed":
        return { bg: "#fde8e8", text: "#9b1c1c", label: "실패" };
      case "skipped":
        return { bg: "#f3f4f6", text: "#374151", label: "제외됨" };
      case "config_error":
        return { bg: "#fee2e2", text: "#991b1b", label: "설정오류" };
      default:
        return { bg: "#f3f4f6", text: "#4b5563", label: "대기" };
    }
  };

  // 검색 및 필터 변경 이벤트 핸들러
  const handleFilterChange = (query: string, filters: Record<string, string>) => {
    const searchVal = query.trim().toLowerCase();
    const statusFilter = filters.status || "";

    const filtered = mockSubmissions.filter((sub) => {
      // 1. 실행 상태 필터 검사
      if (statusFilter && sub.status !== statusFilter) {
        return false;
      }

      // 2. 검색어 필터 검사 (submissionId, workflowKey, uid, clientId, 사용자 이메일, 에러코드)
      if (searchVal) {
        const submissionIdMatch = sub.submissionId?.toLowerCase().includes(searchVal);
        const workflowKeyMatch = sub.workflowKey?.toLowerCase().includes(searchVal);
        const uidMatch = sub.uid?.toLowerCase().includes(searchVal);
        const clientIdMatch = sub.clientId?.toLowerCase().includes(searchVal);
        const emailMatch = getUserEmail(sub.uid)?.toLowerCase().includes(searchVal);
        const errorCodeMatch = sub.error?.code?.toLowerCase().includes(searchVal);

        return (
          submissionIdMatch ||
          workflowKeyMatch ||
          uidMatch ||
          clientIdMatch ||
          emailMatch ||
          errorCodeMatch
        );
      }

      return true;
    });

    setFilteredSubmissions(filtered);
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

        {filteredSubmissions.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
            검색 결과가 없습니다.
          </div>
        ) : (
          filteredSubmissions.map((sub, idx) => {
            const badge = getBadgeStyles(sub.status);
            const email = getUserEmail(sub.uid);
            return (
              <div
                key={sub.submissionId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1.2fr 1.2fr 2fr 1fr",
                  padding: "12px 16px",
                  borderBottom: idx < filteredSubmissions.length - 1 ? "1px solid #f3f4f6" : "none",
                  fontSize: "13px",
                  color: "#111111",
                  alignItems: "center",
                }}
              >
                <span style={{ fontFamily: "monospace" }}>{sub.submissionId}</span>
                <span style={{ fontSize: "12px", color: "#4b5563" }}>{sub.clientId.slice(0, 18)}...</span>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ color: "#6b7280", fontSize: "12px" }}>{sub.uid.slice(0, 10)}...</span>
                  {email && <span style={{ color: "#9ca3af", fontSize: "11px" }}>{email}</span>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {sub.input.title}
                  </span>
                  <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                    {sub.workflowKey}
                  </span>
                  {sub.error?.code && (
                    <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: 500, marginTop: "2px" }}>
                      ⚠️ {sub.error.code}
                    </span>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      backgroundColor: badge.bg,
                      color: badge.text,
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    {badge.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
