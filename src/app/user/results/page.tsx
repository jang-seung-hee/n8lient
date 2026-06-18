// 이 파일은 사용자가 요청한 N8N 워크플로우 실행 내역(submissions)을 Firestore로부터 실시간 구독하여 처리 결과 상태를 모니터링하는 결과 화면입니다.

"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { subscribeMySubmissions } from "@/features/submission/submissionQueryService";
import { filterSubmissions } from "@/common/submission/submissionFilters";
import { SubmissionList } from "@/components/core/submission/SubmissionList";
import { ExecutionResultDetailModal } from "@/components/results/ExecutionResultDetailModal";
import type { Submission, SubmissionStatus } from "@/types/n8lient";
import { siteConfig } from "@/config/siteConfig";

const PAGE_SIZE = 20;

export default function UserResults() {
  const { user } = useAuthUser();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // 모달 제어용 상태
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        setError("실행 로그를 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 상세 모달이 열려 있을 때 submissions 배열에서 실시간 상태를 동적 조회하여 동기화
  const activeSubmission = selectedSub
    ? submissions.find((s) => s.submissionId === selectedSub.submissionId) || selectedSub
    : null;

  // 필터 적용 (공통 필터 유틸 사용)
  const filteredSubmissions = filterSubmissions(submissions, {
    status: filterStatus as SubmissionStatus | "all",
  });

  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / PAGE_SIZE));

  const pagedResults = useMemo(
    () =>
      filteredSubmissions.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
      ),
    [filteredSubmissions, currentPage]
  );

  // 필터 변경 시 1페이지로 초기화
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  // 결과 건수 감소 시 현재 페이지 보정
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleRowClick = (sub: Submission) => {
    setSelectedSub(sub);
    setIsModalOpen(true);
  };

  if (loading && submissions.length === 0) {
    return <p style={{ fontSize: "13px", color: "#6b7280", textAlign: "center", padding: "24px" }}>{siteConfig.messages.loading}</p>;
  }

  return (
    <div style={{ padding: "12px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#111111", margin: 0 }}>
          📊 N8N 워크플로우 실행 로그 (실시간 동기화)
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

      {/* 공통 리스트 컴포넌트 사용 */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <SubmissionList
          submissions={pagedResults}
          onRowClick={handleRowClick}
          viewMode="user"
        />
        {filteredSubmissions.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderTop: "1px solid #e5e7eb",
              backgroundColor: "#f9fafb",
              fontSize: "13px",
              color: "#374151",
            }}
          >
            <span style={{ color: "#6b7280" }}>
              총 {filteredSubmissions.length}건 · {currentPage} / {totalPages} 페이지
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  backgroundColor: currentPage <= 1 ? "#f3f4f6" : "#ffffff",
                  color: currentPage <= 1 ? "#9ca3af" : "#374151",
                  cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                }}
              >
                이전
              </button>
              <span style={{ fontSize: "12px", color: "#6b7280", minWidth: "48px", textAlign: "center" }}>
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  backgroundColor: currentPage >= totalPages ? "#f3f4f6" : "#ffffff",
                  color: currentPage >= totalPages ? "#9ca3af" : "#374151",
                  cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                }}
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && activeSubmission && (
        <ExecutionResultDetailModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSub(null);
          }}
          submission={activeSubmission}
          viewerRole="user"
        />
      )}
    </div>
  );
}
