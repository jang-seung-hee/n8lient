/**
 * 이 파일은 실행 로그(Submission)의 공통 리스트 테이블 컴포넌트를 제공합니다.
 * 한국어 주석 표준을 준수합니다.
 */

"use client";

import React from "react";
import { SubmissionStatusBadge } from "@/components/core/submission/SubmissionStatusBadge";
import {
  truncateText,
  formatCompactDateTime,
  type ExecutionLogRow,
} from "./executionLogViewModel";

interface ExecutionLogTableProps {
  rows: ExecutionLogRow[];
  onRowClick: (row: ExecutionLogRow) => void;
  actorLabelByUid?: Record<string, string>;
}

export function ExecutionLogTable({
  rows,
  onRowClick,
  actorLabelByUid,
}: ExecutionLogTableProps) {
  if (rows.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>
        표시할 실행 로그가 없습니다.
      </div>
    );
  }

  return (
    <div className="ux_scroll_area">
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", textAlign: "left" }}>
        <thead>
          <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb", color: "#4b5563", fontWeight: 600 }}>
            <th style={{ padding: "10px 12px" }}>실행 일시</th>
            <th style={{ padding: "10px 12px" }}>워크플로우명</th>
            <th style={{ padding: "10px 12px" }}>고객사명</th>
            <th style={{ padding: "10px 12px" }}>사용자 메일</th>
            <th style={{ padding: "10px 12px" }}>실행명</th>
            <th style={{ padding: "10px 12px", textAlign: "center" }}>상태</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            // 사용자 메일 매핑 우선순위 및 fallback 처리
            let displayEmail = row.userEmail && row.userEmail !== "-" ? row.userEmail : "-";
            if (displayEmail === "-" && actorLabelByUid && row.raw.uid) {
              displayEmail = actorLabelByUid[row.raw.uid] || "-";
            }

            // "이름 / 이메일" 형태에서 메일 주소만 추출
            if (displayEmail.includes("/")) {
              displayEmail = displayEmail.split("/").pop()?.trim() || "-";
            }

            // 워크플로우 명칭 결정
            const displayWorkflow = row.workflowName && row.workflowName !== "-"
              ? row.workflowName
              : row.workflowKey || "-";

            return (
              <tr
                key={row.id}
                onClick={() => onRowClick(row)}
                style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                {/* 1. 실행 일시 */}
                <td style={{ padding: "10px 12px", whiteSpace: "nowrap", fontFamily: "monospace" }}>
                  {formatCompactDateTime(row.createdAt)}
                </td>
                
                {/* 2. 워크플로우명 */}
                <td style={{ padding: "10px 12px" }} title={displayWorkflow}>
                  <div style={{ fontWeight: 600, color: "#111111" }}>
                    {truncateText(displayWorkflow, 20)}
                  </div>
                </td>

                {/* 3. 고객사명 */}
                <td style={{ padding: "10px 12px" }} title={row.clientName || "-"}>
                  {truncateText(row.clientName || "-", 20)}
                </td>

                {/* 4. 사용자 메일 */}
                <td style={{ padding: "10px 12px" }}>
                  {displayEmail}
                </td>

                {/* 5. 실행명 */}
                <td style={{ padding: "10px 12px" }} title={row.title || "-"}>
                  {truncateText(row.title || "-", 15)}
                </td>

                {/* 6. 상태 */}
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  <SubmissionStatusBadge status={row.status || ""} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
