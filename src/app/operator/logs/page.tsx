// 이 파일은 시스템 운영자가 플랫폼 전체에서 발생한 n8n 실행 이력 로그를 조회하는 화면입니다.

"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { ListSearchFilterBar, type FilterField } from "@/components/core/ListSearchFilterBar";
import { SubmissionList } from "@/components/core/submission/SubmissionList";
import { CompanyResultDetailModal } from "@/components/custom/CompanyResultDetailModal";
import { subscribeOperatorSubmissions } from "@/features/submission/submissionQueryService";
import { filterSubmissions } from "@/common/submission/submissionFilters";
import type { 
  Submission, 
  SubmissionStatus, 
  ExecutionFailurePhase, 
  ExecutionFailureSource 
} from "@/types/n8lient";

const filterFields: FilterField[] = [
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
  {
    key: "errorPhase",
    label: "실패 단계",
    options: [
      { value: "APP_VALIDATE", label: "APP_VALIDATE" },
      { value: "API_ROUTE_VALIDATE", label: "API_ROUTE_VALIDATE" },
      { value: "API_ROUTE_GATEWAY_CALL", label: "API_ROUTE_GATEWAY_CALL" },
      { value: "GATEWAY_VALIDATE", label: "GATEWAY_VALIDATE" },
      { value: "GATEWAY_STORAGE", label: "GATEWAY_STORAGE" },
      { value: "GATEWAY_N8N_CALL", label: "GATEWAY_N8N_CALL" },
      { value: "N8N_WORKFLOW", label: "N8N_WORKFLOW" },
      { value: "N8N_EMAIL", label: "N8N_EMAIL" },
      { value: "N8N_CALLBACK", label: "N8N_CALLBACK" },
      { value: "GATEWAY_CALLBACK", label: "GATEWAY_CALLBACK" },
      { value: "FIRESTORE_UPDATE", label: "FIRESTORE_UPDATE" },
    ],
  },
  {
    key: "errorSource",
    label: "실패 위치",
    options: [
      { value: "app", label: "app" },
      { value: "api_route", label: "api_route" },
      { value: "gateway", label: "gateway" },
      { value: "n8n", label: "n8n" },
      { value: "callback", label: "callback" },
      { value: "firestore", label: "firestore" },
    ],
  },
];

export default function OperatorLogs() {
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
    setLoading(true);
    const unsubscribe = subscribeOperatorSubmissions(
      db,
      (list) => {
        setSubmissions(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("전체 실행 로그를 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
      },
      500 // 최근 500건 제한
    );

    return () => unsubscribe();
  }, []);

  // 검색 및 필터 변경 이벤트 핸들러
  const handleFilterChange = (q: string, f: Record<string, string>) => {
    setSearchQuery(q);
    setFilters(f);
  };

  const handleRowClick = (sub: Submission) => {
    setSelectedSub(sub);
    setIsModalOpen(true);
  };

  // 클라이언트 사이드 필터링 적용
  const filteredList = filterSubmissions(submissions, {
    searchQuery,
    status: filters.status as SubmissionStatus | "all",
    errorPhase: filters.errorPhase as ExecutionFailurePhase | "all",
    errorSource: filters.errorSource as ExecutionFailureSource | "all",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
          📂 플랫폼 전체 실행 로그 모니터링
        </h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
          모든 등록된 회사 고객사들의 n8n 실행 트랜잭션 최근 500건 로그입니다.
        </p>
      </div>

      {/* 공통 검색/필터 바 탑재 */}
      <ListSearchFilterBar
        searchPlaceholder="실행 ID, Key, UID, 고객사 ID, 이메일, 에러코드 검색..."
        filterFields={filterFields}
        onChange={handleFilterChange}
      />

      {error && (
        <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "6px", fontSize: "13px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* 테이블 리스트 */}
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
            플랫폼 로그를 불러오는 중...
          </div>
        ) : (
          <SubmissionList 
            submissions={filteredList} 
            onRowClick={handleRowClick} 
            viewMode="operator" 
          />
        )}
      </div>

      {/* 상세 모달 (운영자도 마스킹된 JSON 뷰를 기본으로 사용) */}
      <CompanyResultDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        submission={selectedSub}
      />
    </div>
  );
}
