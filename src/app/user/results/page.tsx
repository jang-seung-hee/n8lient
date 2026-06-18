// 이 파일은 사용자가 요청한 N8N 워크플로우 실행 내역(submissions)을 Firestore로부터 실시간 구독하여 처리 결과 상태를 모니터링하는 결과 화면입니다.

"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { subscribeMySubmissions } from "@/features/submission/submissionQueryService";
import { filterSubmissions } from "@/common/submission/submissionFilters";
import { SubmissionList } from "@/components/core/submission/SubmissionList";
import SubmissionDetailModal from "@/components/custom/SubmissionDetailModal";
import type { Submission, SubmissionStatus } from "@/types/n8lient";
import { siteConfig } from "@/config/siteConfig";

export default function UserResults() {
  const { user } = useAuthUser();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
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
    ? (submissions.find((s) => s.submissionId === selectedSub.submissionId) || selectedSub)
    : null;

  // 필터 적용 (공통 필터 유틸 사용)
  const filteredSubmissions = filterSubmissions(submissions, {
    status: filterStatus as SubmissionStatus | "all",
  });

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
          submissions={filteredSubmissions} 
          onRowClick={handleRowClick} 
          viewMode="user" 
        />
      </div>

      {isModalOpen && activeSubmission && (
        <SubmissionDetailModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSub(null);
          }}
          submission={activeSubmission}
        />
      )}
    </div>
  );
}
