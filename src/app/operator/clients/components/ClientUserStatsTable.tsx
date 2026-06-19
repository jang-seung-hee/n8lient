// 이 파일은 고객사에 소속된 사용자의 실행 통계를 표(Table) 형태로 렌더링하는 서브 컴포넌트입니다.
// 한국어 주석 표준을 준수합니다.

"use client";

import React from "react";

export interface UserStatsItem {
  uid: string;
  maskedName: string;
  maskedEmail: string;
  role: string;
  approvalStatus: string;
  stats?: {
    totalCount: number;
    successCount: number;
    failedCount: number;
    latestExecutedAt: string | null;
  };
}

interface ClientUserStatsTableProps {
  usersList: UserStatsItem[];
}

function formatCompactDateTime(value: unknown): string {
  let date: Date | null = null;

  if (value instanceof Date) {
    date = value;
  } else if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    date = value.toDate();
  } else if (typeof value === "string" || typeof value === "number") {
    date = new Date(value);
  }

  if (!date || Number.isNaN(date.getTime())) return "-";

  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");

  return `${yy}${mm}${dd} ${hh}:${mi}`;
}

export function ClientUserStatsTable({ usersList }: ClientUserStatsTableProps) {
  if (usersList.length === 0) {
    return (
      <div style={{ padding: "20px 0", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
        소속 사용자가 없습니다.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#111111", margin: 0, borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
        👥 소속 사용자 실행 통계
      </h3>
      <div className="ux_scroll_area" style={{ border: "1px solid #e5e7eb", borderRadius: "8px", backgroundColor: "#ffffff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", textAlign: "left" }}>
          <thead>
            <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb", color: "#4b5563", fontWeight: 600 }}>
              <th style={{ padding: "10px 12px" }}>사용자</th>
              <th style={{ padding: "10px 12px" }}>역할</th>
              <th style={{ padding: "10px 12px", textAlign: "right" }}>실행</th>
              <th style={{ padding: "10px 12px", textAlign: "right", color: "#10b981" }}>성공</th>
              <th style={{ padding: "10px 12px", textAlign: "right", color: "#ef4444" }}>실패</th>
              <th style={{ padding: "10px 12px" }}>최근 실행날짜</th>
            </tr>
          </thead>
          <tbody>
            {usersList.map((user) => {
              const stats = user.stats || { totalCount: 0, successCount: 0, failedCount: 0, latestExecutedAt: null };
              return (
                <tr key={user.uid} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 600, color: "#111111" }}>{user.maskedName}</div>
                    <div style={{ fontSize: "11px", color: "#6b7280" }}>{user.maskedEmail}</div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      className="ux_badge"
                      style={{
                        fontSize: "10px",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        backgroundColor: user.role === "company_admin" ? "#dbeafe" : "#f3f4f6",
                        color: user.role === "company_admin" ? "#1e40af" : "#4b5563",
                      }}
                    >
                      {user.role === "company_admin" ? "관리자" : "일반"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{stats.totalCount}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#10b981", fontWeight: 600 }}>{stats.successCount}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#ef4444", fontWeight: 600 }}>{stats.failedCount}</td>
                  <td style={{ padding: "10px 12px", color: "#374151", fontFamily: "monospace" }}>
                    {formatCompactDateTime(stats.latestExecutedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="ux_caption" style={{ margin: "2px 0 0 0", color: "#9ca3af" }}>
        * 실행 통계는 최근 300건 기준입니다.
      </p>
    </div>
  );
}
