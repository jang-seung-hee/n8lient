// 이 파일은 회사 관리자가 소속 구성원들의 모든 자동화 실행 결과 로그를 조회하는 화면입니다.

"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { ListSearchFilterBar, type FilterField } from "@/components/core/ListSearchFilterBar";
import { CompanyResultDetailModal } from "@/components/custom/CompanyResultDetailModal";
import { SubmissionList } from "@/components/core/submission/SubmissionList";
import { subscribeCompanySubmissions } from "@/features/submission/submissionQueryService";
import { filterSubmissions } from "@/common/submission/submissionFilters";
import type { Submission, SubmissionStatus } from "@/types/n8lient";

export default function AdminResults() {
  const { userDoc } = useAuthUser();
  
  // 데이터 상태
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 검색 및 필터 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  // 상세 모달 상태
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Firestore 구독
  useEffect(() => {
    if (!userDoc?.clientId) return;

    setLoading(true);
    const unsubscribe = subscribeCompanySubmissions(
      db,
      userDoc.clientId,
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
  }, [userDoc?.clientId]);

  const filterFields: FilterField[] = [
    {
      key: "status",
      label: "상태",
      options: [
        { value: "success", label: "성공" },
        { value: "processing", label: "처리중" },
        { value: "failed", label: "실패" },
        { value: "queued", label: "대기" },
        { value: "skipped", label: "제외됨" },
        { value: "config_error", label: "설정오류" },
      ],
    },
  ];

  const handleFilterChange = (query: string, filterValues: Record<string, string>) => {
    setSearchQuery(query);
    setFilters(filterValues);
  };

  const handleRowClick = (sub: Submission) => {
    setSelectedSub(sub);
    setIsModalOpen(true);
  };

  // 클라이언트 사이드 필터링 적용
  const filteredList = filterSubmissions(submissions, {
    searchQuery,
    status: filters.status as SubmissionStatus | "all",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
          📜 N8N 워크플로우 실행 로그
        </h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
          소속 직원들의 N8N 워크플로우 실행 요청 및 최종 응답 결과 기록입니다. 로그 행을 클릭하여 실행 상세 내역을 볼 수 있습니다.
        </p>
      </div>

      {/* 검색 및 필터 UI */}
      <ListSearchFilterBar
        searchPlaceholder="실행 ID, 워크플로우 Key, 실행명 검색..."
        filterFields={filterFields}
        onChange={handleFilterChange}
      />

      {error && (
        <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "6px", fontSize: "13px" }}>
          ⚠️ {error}
        </div>
      )}

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        {loading && submissions.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>
            실행 로그를 불러오는 중...
          </div>
        ) : (
          <SubmissionList 
            submissions={filteredList} 
            onRowClick={handleRowClick} 
            viewMode="company_admin" 
          />
        )}
      </div>

      {/* 상세 모달 */}
      <CompanyResultDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        submission={selectedSub}
      />
    </div>
  );
}
