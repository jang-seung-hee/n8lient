// 이 파일은 승인된 일반 사용자의 홈 화면을 나타냅니다.
// 회사 정보, 자주 쓰는 자동화 카드, 최근 실행 결과를 조밀하게 표시합니다.

"use client";

import Link from "next/link";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { mockSubmissions, mockWorkflowTemplates } from "@/mocks/mockData";

export default function UserHome() {
  const { userDoc } = useAuthUser();

  // 사용자 관련 Mock 최근 실행결과 (최대 3개)
  const userSubmissions = mockSubmissions.slice(0, 3);

  return (
    <div style={{ padding: "12px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* 회사 및 승인 상태 카드 */}
      <section
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#111111", marginBottom: "2px" }}>
              소속 회사
            </h2>
            <p style={{ fontSize: "13px", color: "#4b5563" }}>
              {userDoc?.clientId === "client_rentaltoktok_001" ? "렌탈톡톡" : userDoc?.clientId}
            </p>
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              backgroundColor: "#d1fae5",
              color: "#065f46",
              padding: "4px 8px",
              borderRadius: "999px",
            }}
          >
            정상 승인됨
          </span>
        </div>
      </section>

      {/* 자주 쓰는 자동화 섹션 */}
      <section>
        <h3
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#4b5563",
            marginBottom: "8px",
          }}
        >
          자주 쓰는 자동화
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {mockWorkflowTemplates.map((template) => (
            <div
              key={template.workflowKey}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#111111", marginBottom: "2px" }}>
                  {template.name} ({template.shortName})
                </h4>
                <p style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.3 }}>
                  {template.description}
                </p>
              </div>
              <Link
                href="/user/execute"
                style={{
                  height: "30px",
                  padding: "0 10px",
                  backgroundColor: "#111111",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 600,
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  textDecoration: "none",
                }}
              >
                실행
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 최근 실행 결과 목록 */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#4b5563" }}>최근 실행 결과 (Mock)</h3>
          <Link href="/user/results" style={{ fontSize: "12px", color: "#4b5563", textDecoration: "none" }}>
            더보기 &gt;
          </Link>
        </div>
        
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {userSubmissions.map((sub, idx) => {
            const isSuccess = sub.status === "success";
            const isProcessing = sub.status === "processing";
            const isFailed = sub.status === "failed";
            
            let badgeBg = "#f3f4f6";
            let badgeColor = "#4b5563";
            let statusText = "대기";
            
            if (isSuccess) {
              badgeBg = "#d1fae5";
              badgeColor = "#065f46";
              statusText = "성공";
            } else if (isProcessing) {
              badgeBg = "#dbeafe";
              badgeColor = "#1e40af";
              statusText = "진행중";
            } else if (isFailed) {
              badgeBg = "#fde8e8";
              badgeColor = "#9b1c1c";
              statusText = "실패";
            }

            return (
              <div
                key={sub.submissionId}
                style={{
                  padding: "10px 12px",
                  borderBottom: idx < userSubmissions.length - 1 ? "1px solid #f3f4f6" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      backgroundColor: badgeBg,
                      color: badgeColor,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      flexShrink: 0,
                    }}
                  >
                    {statusText}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "#111111",
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {sub.input.title}
                    </p>
                    <p style={{ fontSize: "11px", color: "#9ca3af", margin: "2px 0 0 0" }}>
                      {sub.workflowKey === "expense-report" ? "지출결의서" : "통자요"} · {new Date(sub.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                
                {isSuccess && sub.result.resultUrl && (
                  <a
                    href={sub.result.resultUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: "11px",
                      color: "#3b82f6",
                      textDecoration: "none",
                      marginLeft: "8px",
                      flexShrink: 0,
                    }}
                  >
                    결과보기
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
