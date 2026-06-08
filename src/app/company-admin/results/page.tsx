// 이 파일은 회사 관리자가 소속 구성원들의 모든 자동화 실행 결과 로그를 조회하는 화면입니다. (Mock)

"use client";

import { mockSubmissions } from "@/mocks/mockData";

export default function AdminResults() {
  const getBadgeStyles = (status: string) => {
    switch (status) {
      case "success":
        return { bg: "#d1fae5", text: "#065f46", label: "성공" };
      case "processing":
        return { bg: "#dbeafe", text: "#1e40af", label: "처리중" };
      case "failed":
        return { bg: "#fde8e8", text: "#9b1c1c", label: "실패" };
      default:
        return { bg: "#f3f4f6", text: "#4b5563", label: "대기" };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
          📜 회사 자동화 실행 로그
        </h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
          소속 직원들의 n8n 자동화 실행 요청 및 최종 응답 결과 기록입니다.
        </p>
      </div>

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        {/* 테이블 헤더 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr 2fr 1fr 1fr",
            padding: "10px 16px",
            backgroundColor: "#f9fafb",
            borderBottom: "1px solid #e5e7eb",
            fontSize: "12px",
            fontWeight: 600,
            color: "#374151",
          }}
        >
          <span>실행 ID</span>
          <span>요청자 UID</span>
          <span>실행명 (입력 정보)</span>
          <span>상태</span>
          <span style={{ textAlign: "right" }}>일시</span>
        </div>

        {/* 목록 */}
        {mockSubmissions.map((sub, idx) => {
          const badge = getBadgeStyles(sub.status);
          return (
            <div
              key={sub.submissionId}
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr 2fr 1fr 1fr",
                padding: "12px 16px",
                borderBottom: idx < mockSubmissions.length - 1 ? "1px solid #f3f4f6" : "none",
                fontSize: "13px",
                color: "#111111",
                alignItems: "center",
              }}
            >
              <span style={{ fontFamily: "monospace" }}>{sub.submissionId}</span>
              <span style={{ color: "#6b7280", fontSize: "12px" }}>{sub.uid.slice(0, 10)}...</span>
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {sub.input.title}
                </span>
                <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                  자동화: {sub.workflowKey}
                </span>
              </div>
              <div>
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
              <span style={{ color: "#6b7280", fontSize: "12px", textAlign: "right" }}>
                {new Date(sub.createdAt).toLocaleDateString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
