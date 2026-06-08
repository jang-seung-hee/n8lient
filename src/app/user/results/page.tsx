// 이 파일은 사용자가 요청한 자동화 실행 내역(submissions)을 Firestore로부터 실시간 구독하여 처리 결과 상태를 모니터링하는 결과 화면입니다.

"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { subscribeMySubmissions } from "@/features/user/userService";
import type { Submission } from "@/types/n8lient";
import { siteConfig } from "@/config/siteConfig";

export default function UserResults() {
  const { user } = useAuthUser();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setError(null);

    // 실시간 submissions 구독 및 바인딩
    const unsubscribe = subscribeMySubmissions(
      db,
      user.uid,
      (list) => {
        setSubmissions(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("실행 이력을 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 필터 적용
  const filteredSubmissions = filterStatus === "all"
    ? submissions
    : submissions.filter((s) => s.status === filterStatus);

  // 6가지 상태 배지 컬러 및 텍스트 매핑
  const getBadgeStyles = (status: string) => {
    switch (status) {
      case "success":
        return { bg: "#d1fae5", text: "#065f46", label: "성공" };
      case "processing":
        return { bg: "#dbeafe", text: "#1e40af", label: "진행중" };
      case "failed":
        return { bg: "#fde8e8", text: "#9b1c1c", label: "실패" };
      case "skipped":
        return { bg: "#e5e7eb", text: "#4b5563", label: "제외됨" };
      case "config_error":
        return { bg: "#fee2e2", text: "#991b1b", label: "설정오류" };
      case "queued":
      default:
        return { bg: "#f3f4f6", text: "#6b7280", label: "대기중" };
    }
  };

  if (loading && submissions.length === 0) {
    return <p style={{ fontSize: "13px", color: "#6b7280", textAlign: "center", padding: "24px" }}>{siteConfig.messages.loading}</p>;
  }

  return (
    <div style={{ padding: "12px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#111111", margin: 0 }}>
          📊 실행 결과 내역 (실시간 동기화)
        </h2>
        
        {/* 필터 셀렉트 */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            height: "30px",
            borderRadius: "6px",
            border: "1px solid #e5e7eb",
            padding: "0 6px",
            fontSize: "12px",
            backgroundColor: "#ffffff",
            color: "#111111",
            outline: "none",
          }}
        >
          <option value="all">전체 상태</option>
          <option value="queued">대기중</option>
          <option value="processing">진행중</option>
          <option value="success">성공</option>
          <option value="failed">실패</option>
          <option value="skipped">제외됨</option>
          <option value="config_error">설정오류</option>
        </select>
      </div>

      {error && (
        <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "6px", fontSize: "13px", marginBottom: "16px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* 리스트 출력 */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        {filteredSubmissions.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
            조회된 대기/실행 내역이 없습니다.
          </div>
        ) : (
          filteredSubmissions.map((sub, idx) => {
            const badge = getBadgeStyles(sub.status);
            return (
              <div
                key={sub.submissionId}
                style={{
                  padding: "10px 12px",
                  borderBottom: idx < filteredSubmissions.length - 1 ? "1px solid #f3f4f6" : "none",
                  display: "flex",
                  alignItems: "flex-start",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        backgroundColor: badge.bg,
                        color: badge.text,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        flexShrink: 0,
                      }}
                    >
                      {badge.label}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#111111",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        flex: 1,
                      }}
                    >
                      {sub.input.title}
                    </span>
                  </div>
                  <span style={{ fontSize: "11px", color: "#9ca3af", flexShrink: 0, marginLeft: "8px" }}>
                    {new Date(sub.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    width: "100%",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "11px",
                    color: "#6b7280",
                    paddingLeft: "4px",
                  }}
                >
                  <span>
                    자동화 Key: {sub.workflowKey} · ID: {sub.submissionId}
                  </span>
                  
                  {sub.status === "success" && sub.result.resultUrl ? (
                    <a
                      href={sub.result.resultUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#3b82f6", textDecoration: "none", fontWeight: 600 }}
                    >
                      결과 링크 ↗
                    </a>
                  ) : (sub.status === "failed" || sub.status === "config_error") && sub.error.message ? (
                    <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: 500 }}>
                      ⚠️ {sub.error.message}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
