// 이 파일은 시스템 운영자가 플랫폼 전체에서 발생한 n8n 실행 이력 로그를 조회하는 화면입니다.
// 한국어 주석 표준을 준수합니다.

"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { ExecutionLogSearchBar } from "@/components/results/ExecutionLogSearchBar";
import { ExecutionLogTable } from "@/components/results/ExecutionLogTable";
import { mapSubmissionToRow } from "@/components/results/executionLogViewModel";
import { ExecutionResultDetailModal } from "@/components/results/ExecutionResultDetailModal";
import { useSubmissionActorDisplaySource } from "@/features/submission/useSubmissionActorDisplaySource";
import { useSubmissionActorLabelMap } from "@/features/submission/useSubmissionActorLabelMap";
import { subscribeOperatorSubmissions } from "@/features/submission/submissionQueryService";
import { filterSubmissions } from "@/common/submission/submissionFilters";
import { getClientsList } from "@/features/operator/operatorService";
import type { 
  Submission, 
  SubmissionStatus, 
  ExecutionFailurePhase, 
  ExecutionFailureSource 
} from "@/types/n8lient";

const PAGE_SIZE = 20;

export default function OperatorLogs() {
  // 데이터 상태
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientsMap, setClientsMap] = useState<Map<string, string>>(new Map());

  // 검색 및 필터 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);

  // 상세 모달 상태
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Firestore 구독 (submissions)
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

  // 전체 고객사(clients) 정보 조회 후 clientId -> companyName 맵 생성
  useEffect(() => {
    getClientsList(db)
      .then((list) => {
        const map = new Map<string, string>();
        list.forEach((c) => {
          map.set(c.clientId, c.companyName || c.companyDisplayName || "회사명 없음");
        });
        setClientsMap(map);
      })
      .catch((err) => {
        console.error("[OperatorLogs] clients 로드 실패:", err);
      });
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

  const activeSubmission = selectedSub
    ? submissions.find((s) => s.submissionId === selectedSub.submissionId) || selectedSub
    : null;

  const actorDisplaySource = useSubmissionActorDisplaySource(activeSubmission);

  // 클라이언트 사이드 필터링 적용
  const filteredList = filterSubmissions(submissions, {
    searchQuery,
    status: filters.status as SubmissionStatus | "all",
    errorPhase: filters.errorPhase as ExecutionFailurePhase | "all",
    errorSource: filters.errorSource as ExecutionFailureSource | "all",
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
    return pagedLogs.map((log) => mapSubmissionToRow(log, clientsMap));
  }, [pagedLogs, clientsMap]);

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
          📂 플랫폼 전체 실행 로그 모니터링
        </h2>
        <p className="ux_caption" style={{ margin: 0 }}>
          모든 등록된 회사 고객사들의 n8n 실행 트랜잭션 최근 500건 로그입니다.
        </p>
      </div>

      {/* 공통 검색/필터 바 탑재 */}
      <ExecutionLogSearchBar
        onChange={handleFilterChange}
      />

      {error && (
        <div className="ux_alert ux_alert_danger">
          ⚠️ {error}
        </div>
      )}

      {/* 테이블 리스트 */}
      <div className="ux_card_compact" style={{ padding: 0, overflow: "hidden" }}>
        {loading && submissions.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>
            플랫폼 로그를 불러오는 중...
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
                    className="ux_button_compact ux_button_secondary"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      borderRadius: "6px",
                      backgroundColor: currentPage <= 1 ? "#f3f4f6" : "#ffffff",
                      color: currentPage <= 1 ? "#9ca3af" : "#374151",
                    }}
                  >
                    이전
                  </button>
                  <span style={{ fontSize: "12px", color: "#6b7280", minWidth: "48px", textAlign: "center" }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="ux_button_compact ux_button_secondary"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      borderRadius: "6px",
                      backgroundColor: currentPage >= totalPages ? "#f3f4f6" : "#ffffff",
                      color: currentPage >= totalPages ? "#9ca3af" : "#374151",
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
          viewerRole="operator"
          actorDisplaySource={actorDisplaySource}
        />
      )}
    </div>
  );
}
