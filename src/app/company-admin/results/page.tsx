// 이 파일은 회사 관리자가 소속 구성원들의 모든 자동화 실행 결과 로그를 조회하는 화면입니다.
// 한국어 주석 표준을 준수합니다.

"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { ExecutionLogSearchBar } from "@/components/results/ExecutionLogSearchBar";
import { ExecutionLogTable } from "@/components/results/ExecutionLogTable";
import { mapSubmissionToRow } from "@/components/results/executionLogViewModel";
import { ExecutionResultDetailModal } from "@/components/results/ExecutionResultDetailModal";
import { useSubmissionActorDisplaySource } from "@/features/submission/useSubmissionActorDisplaySource";
import { useSubmissionActorLabelMap } from "@/features/submission/useSubmissionActorLabelMap";
import { subscribeCompanySubmissions } from "@/features/submission/submissionQueryService";
import { filterSubmissions } from "@/common/submission/submissionFilters";
import { doc, getDoc } from "firebase/firestore";
import type { Submission, SubmissionStatus } from "@/types/n8lient";

const PAGE_SIZE = 20;

export default function AdminResults() {
  const { userDoc } = useAuthUser();
  
  // 데이터 상태
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("-");

  // 검색 및 필터 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);

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

  // 소속 회사명 단건 조회
  useEffect(() => {
    const clientId = userDoc?.clientId;
    if (!clientId) return;

    const fetchCompanyName = async () => {
      try {
        const clientRef = doc(db, "clients", clientId);
        const snap = await getDoc(clientRef);
        if (snap.exists()) {
          const data = snap.data();
          setCompanyName(data.companyName || data.companyDisplayName || "회사명 없음");
        }
      } catch (err) {
        console.error("[AdminResults] 회사 정보 로드 실패:", err);
      }
    };

    fetchCompanyName();
  }, [userDoc?.clientId]);

  const handleFilterChange = (query: string, filterValues: Record<string, string>) => {
    setSearchQuery(query);
    setFilters(filterValues);
  };

  const handleRowClick = (sub: Submission) => {
    setSelectedSub(sub);
    setIsModalOpen(true);
  };

  const activeSubmission = selectedSub
    ? submissions.find((s) => s.submissionId === selectedSub.submissionId) || selectedSub
    : null;

  const actorDisplaySource = useSubmissionActorDisplaySource(activeSubmission);

  // 클라이언트 사이드 필터링 적용 (실패 단계 및 실패 위치 필터 추가 반영)
  const filteredList = filterSubmissions(submissions, {
    searchQuery,
    status: filters.status as SubmissionStatus | "all",
    errorPhase: filters.errorPhase as any,
    errorSource: filters.errorSource as any,
  });

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));

  const pagedLogs = useMemo(
    () =>
      filteredList.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
      ),
    [filteredList, currentPage]
  );

  const actorLabelByUid = useSubmissionActorLabelMap(pagedLogs);

  // Submission 객체 리스트를 ExecutionLogRow 리스트로 매핑 변환
  const tableRows = useMemo(() => {
    return pagedLogs.map((log) => mapSubmissionToRow(log, undefined, companyName));
  }, [pagedLogs, companyName]);

  // 필터·검색 변경 시 1페이지로 초기화
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters.status, filters.errorPhase, filters.errorSource]);

  // 결과 건수 감소 시 현재 페이지 보정
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 className="ux_page_title" style={{ fontSize: "18px", margin: "0 0 4px 0" }}>
          📜 N8N 워크플로우 실행 로그
        </h2>
        <p className="ux_caption" style={{ margin: 0 }}>
          소속 직원들의 N8N 워크플로우 실행 요청 및 최종 응답 결과 기록입니다. 로그 행을 클릭하여 실행 상세 내역을 볼 수 있습니다.
        </p>
      </div>

      {/* 검색 및 필터 UI */}
      <ExecutionLogSearchBar
        onChange={handleFilterChange}
      />

      {error && (
        <div className="ux_alert ux_alert_danger">
          ⚠️ {error}
        </div>
      )}

      <div className="ux_card_compact" style={{ padding: 0, overflow: "hidden" }}>
        {loading && submissions.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>
            실행 로그를 불러오는 중...
          </div>
        ) : (
          <>
            <ExecutionLogTable
              rows={tableRows}
              onRowClick={(row) => handleRowClick(row.raw)}
              actorLabelByUid={actorLabelByUid}
            />
            {filteredList.length > 0 && (
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
                  총 {filteredList.length}건 · {currentPage} / {totalPages} 페이지
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
          </>
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
          viewerRole="companyAdmin"
          actorDisplaySource={actorDisplaySource}
        />
      )}
    </div>
  );
}
