// 이 파일은 회사 관리자가 소속 구성원들의 모든 자동화 실행 결과 로그를 조회하는 화면입니다.
// 한국어 주석 표준을 준수합니다.

"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { ExecutionLogSearchBar } from "@/components/results/ExecutionLogSearchBar";
import { ExecutionResultDetailModal } from "@/components/results/ExecutionResultDetailModal";
import { useSubmissionActorDisplaySource } from "@/features/submission/useSubmissionActorDisplaySource";
import { useSubmissionActorLabelMap } from "@/features/submission/useSubmissionActorLabelMap";
import { subscribeCompanySubmissions } from "@/features/submission/submissionQueryService";
import { filterSubmissions } from "@/common/submission/submissionFilters";
import { doc, getDoc } from "firebase/firestore";
import type { Submission, SubmissionStatus, WorkflowTemplate } from "@/types/n8lient";
import { N8lientLoadingState } from "@/components/common/data/N8lientLoadingState";
import { N8lientEmptyState } from "@/components/common/data/N8lientEmptyState";
import { getCompanyContracts } from "@/features/admin/companyAdminService";
import { fetchWorkflowTemplatesByKeys } from "@/common/workflow/fetchWorkflowTemplatesByKeys";
import { ExecutionLogGrid } from "@/components/common/data/ExecutionLogGrid";

export default function AdminResults() {
  const { userDoc } = useAuthUser();
  
  // 데이터 상태
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("-");
  const [templates, setTemplates] = useState<Record<string, WorkflowTemplate>>({});

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

  // 템플릿(명세서) 데이터 로드 효과 추가
  useEffect(() => {
    const clientId = userDoc?.clientId;
    if (!clientId) return;

    const fetchTemplates = async () => {
      try {
        const contractList = await getCompanyContracts(db, clientId);
        const tempMap = await fetchWorkflowTemplatesByKeys(
          db,
          contractList.map((contract) => contract.workflowKey)
        );
        setTemplates(tempMap);
      } catch (err) {
        console.error("[AdminResults] 템플릿 로드 실패:", err);
      }
    };

    fetchTemplates();
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

  // 클라이언트 사이드 필터링 적용
  const filteredList = useMemo(() => {
    return filterSubmissions(submissions, {
      searchQuery,
      status: filters.status as SubmissionStatus | "all",
      errorPhase: filters.errorPhase as any,
      errorSource: filters.errorSource as any,
    });
  }, [submissions, searchQuery, filters]);

  const actorLabelByUid = useSubmissionActorLabelMap(filteredList);

  return (
    <div className="ux_page_layout" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="ux_page_header">
        <h2 className="ux_page_title" style={{ fontSize: "18px", margin: "0 0 4px 0" }}>
          📜 실행 로그
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

      {loading ? (
        <N8lientLoadingState message="실행 로그를 불러오는 중..." />
      ) : filteredList.length === 0 ? (
        <N8lientEmptyState
          title="조회된 실행 결과가 없습니다."
          description="검색 필터 조건을 조정해 보세요."
        />
      ) : (
        <ExecutionLogGrid
          data={filteredList}
          templates={templates}
          actorLabelByUid={actorLabelByUid}
          onOpenDetail={handleRowClick}
          singleClientName={companyName}
          storageKey="company-admin-results-page-size"
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
          viewerRole="companyAdmin"
          actorDisplaySource={actorDisplaySource}
        />
      )}
    </div>
  );
}


