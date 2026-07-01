// 이 파일은 시스템 운영자가 플랫폼 전체에서 발생한 n8n 실행 이력 로그를 조회하는 화면입니다.
// 한국어 주석 표준을 준수합니다.

"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { ExecutionLogFilterBar, type ExecutionLogFilters } from "@/components/common/data/ExecutionLogFilterBar";
import { ExecutionResultDetailModal } from "@/components/results/ExecutionResultDetailModal";
import { useSubmissionActorDisplaySource } from "@/features/submission/useSubmissionActorDisplaySource";
import { useSubmissionActorLabelMap } from "@/features/submission/useSubmissionActorLabelMap";
import { subscribeOperatorSubmissions } from "@/features/submission/submissionQueryService";
import { filterSubmissions } from "@/common/submission/submissionFilters";
import { getClientsList, getWorkflowTemplates } from "@/features/operator/operatorService";
import type { 
  Submission, 
  SubmissionStatus, 
  ExecutionFailurePhase, 
  ExecutionFailureSource,
  WorkflowTemplate
} from "@/types/n8lient";
import { ExecutionLogGrid } from "@/components/common/data/ExecutionLogGrid";
import { N8lientLoadingState } from "@/components/common/data/N8lientLoadingState";
import { N8lientEmptyState } from "@/components/common/data/N8lientEmptyState";

export default function OperatorLogs() {
  // 데이터 상태
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientsMap, setClientsMap] = useState<Map<string, string>>(new Map());
  const [templates, setTemplates] = useState<Record<string, WorkflowTemplate>>({});

  // 검색 및 필터 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ExecutionLogFilters>({
    status: "",
    errorPhase: "",
    errorSource: "",
    workflowKeys: [],
  });

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

  // 전체 워크플로우 템플릿(workflowTemplates) 정보 조회 후 workflowKey -> Template 맵 생성
  useEffect(() => {
    getWorkflowTemplates(db)
      .then((list) => {
        const map: Record<string, WorkflowTemplate> = {};
        list.forEach((t) => {
          map[t.workflowKey] = t;
        });
        setTemplates(map);
      })
      .catch((err) => {
        console.error("[OperatorLogs] templates 로드 실패:", err);
      });
  }, []);

  // 검색 및 필터 변경 이벤트 핸들러
  const handleFilterChange = (q: string, f: ExecutionLogFilters) => {
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
  const filteredList = useMemo(() => {
    return filterSubmissions(submissions, {
      searchQuery,
      status: (filters.status || "all") as SubmissionStatus | "all",
      errorPhase: (filters.errorPhase || "all") as ExecutionFailurePhase | "all",
      errorSource: (filters.errorSource || "all") as ExecutionFailureSource | "all",
      workflowKeys: filters.workflowKeys,
    });
  }, [submissions, searchQuery, filters]);

  const actorLabelByUid = useSubmissionActorLabelMap(filteredList);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 className="ux_page_title" style={{ fontSize: "18px", margin: "0 0 4px 0" }}>
          📜 실행 로그
        </h2>
        <p className="ux_caption" style={{ margin: 0 }}>
          모든 등록된 회사 고객사들의 n8n 실행 트랜잭션 최근 500건 로그입니다.
        </p>
      </div>

      {/* 공통 검색/필터 바 탑재 */}
      <ExecutionLogFilterBar
        templates={templates}
        onChange={handleFilterChange}
      />

      {error && (
        <div className="ux_alert ux_alert_danger">
          ⚠️ {error}
        </div>
      )}

      {/* 테이블 리스트 */}
      {loading && submissions.length === 0 ? (
        <N8lientLoadingState message="플랫폼 로그를 불러오는 중..." />
      ) : filteredList.length === 0 ? (
        <N8lientEmptyState
          title="조회된 실행 결과가 없습니다."
          description="검색 필터 조건을 조정해 보세요."
        />
      ) : (
        <ExecutionLogGrid
          data={filteredList}
          templates={templates}
          clientsMap={clientsMap}
          actorLabelByUid={actorLabelByUid}
          onOpenDetail={handleRowClick}
          storageKey="operator-logs-page-size"
        />
      )}

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



