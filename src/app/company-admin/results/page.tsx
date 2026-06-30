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
import { N8lientDataGrid } from "@/components/common/data/N8lientDataGrid";
import { N8lientStatusBadge } from "@/components/common/data/N8lientStatusBadge";
import { N8lientLoadingState } from "@/components/common/data/N8lientLoadingState";
import { N8lientEmptyState } from "@/components/common/data/N8lientEmptyState";
import { ColumnDef } from "@tanstack/react-table";
import { resolveWorkflowDisplayName } from "@/common/workflow/resolveWorkflowDisplayName";
import { getCompanyContracts } from "@/features/admin/companyAdminService";
import { fetchWorkflowTemplatesByKeys } from "@/common/workflow/fetchWorkflowTemplatesByKeys";

// 텍스트 축약 헬퍼 함수
const truncateText = (value: string, maxLength = 25) => {
  if (!value) return "-";
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
};

// 날짜 안전 변환 헬퍼 함수 (Firestore Timestamp, Date, string, number 대응)
const toDateSafe = (value: unknown): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "object" && value !== null && "toDate" in value) {
    const maybeDate = (value as { toDate?: () => Date }).toDate?.();
    return maybeDate && !Number.isNaN(maybeDate.getTime()) ? maybeDate : null;
  }

  if (typeof value === "object" && value !== null && "seconds" in value) {
    const seconds = (value as { seconds?: number }).seconds;
    if (typeof seconds === "number") {
      const date = new Date(seconds * 1000);
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

// YY.MM.DD HH:mm 24시간제 변환 헬퍼 함수
const formatCompactDateTime = (value: unknown, fallback = "-") => {
  const date = toDateSafe(value);
  if (!date) return fallback;

  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");

  return `${yy}.${mm}.${dd} ${hh}:${mi}`;
};

// 소요 시간 포맷 변환 헬퍼
const formatDuration = (row: Submission) => {
  const explicitMs = (row as any).executionTimeMs;
  if (typeof explicitMs === "number" && explicitMs >= 0) {
    return `${(explicitMs / 1000).toFixed(1)}초`;
  }

  const created = toDateSafe(row.createdAt);
  const completed = toDateSafe((row as any).completedAt);
  if (created && completed) {
    const diffMs = completed.getTime() - created.getTime();
    if (diffMs >= 0) return `${(diffMs / 1000).toFixed(1)}초`;
  }

  return "미측정";
};

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

  // workflowKey 기준 표시명 map 생성
  const workflowLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    Object.entries(templates).forEach(([key, template]) => {
      const displayName = template.name?.trim();
      if (displayName) {
        map.set(key, displayName);
      }
    });
    return map;
  }, [templates]);

  // TanStack Table 용 ColumnDef 설계
  const gridColumns = useMemo<ColumnDef<Submission>[]>(() => {
    return [
      {
        id: "workflowName",
        header: "N8N 워크플로우명",
        size: 280,
        meta: { headerAlign: "center", cellAlign: "left" },
        accessorFn: (row) => {
          const key = row.workflowKey;
          const mappedName = workflowLabelByKey.get(key);
          const resolved = resolveWorkflowDisplayName({ template: templates[key] || null, workflowKey: key });
          return mappedName || (resolved !== key && resolved) || row.input?.title || key || "-";
        },
        cell: ({ row }) => {
          const key = row.original.workflowKey;
          const mappedName = workflowLabelByKey.get(key);
          const resolved = resolveWorkflowDisplayName({ template: templates[key] || null, workflowKey: key });
          const workflowLabel = mappedName || (resolved !== key && resolved) || row.original.input?.title || key || "-";
          return (
            <span className="ux_table_text_ellipsis" style={{ fontWeight: 600, color: "#111827" }} title={key}>
              {truncateText(workflowLabel, 25)}
            </span>
          );
        },
      },
      {
        accessorKey: "userEmail",
        header: "요청자",
        size: 240,
        meta: { headerAlign: "center", cellAlign: "left" },
        cell: ({ row }) => {
          const uid = row.original.uid;
          const emailFallback = (row.original as any).googleEmail || (row.original as any).userEmail || "알 수 없음";
          const displayLabel = actorLabelByUid[uid] || emailFallback;
          return <span title={emailFallback}>{displayLabel}</span>;
        },
      },
      {
        accessorKey: "createdAt",
        header: "요청 시각",
        size: 140,
        meta: { headerAlign: "center", cellAlign: "center" },
        cell: ({ row }) => formatCompactDateTime(row.original.createdAt),
      },
      {
        id: "executionTime",
        header: "소요 시간",
        size: 100,
        meta: { headerAlign: "center", cellAlign: "center" },
        cell: ({ row }) => formatDuration(row.original),
      },
      {
        accessorKey: "status",
        header: "상태",
        size: 90,
        meta: { headerAlign: "center", cellAlign: "center" },
        cell: ({ row }) => {
          const status = row.original.status;
          let badgeType: "success" | "error" | "pending" | "default" = "default";
          let label = status as string;

          if (status === "success") {
            badgeType = "success";
            label = "완료";
          } else if (status === "failed" || status === "config_error") {
            badgeType = "error";
            label = status === "config_error" ? "설정 오류" : "실패";
          } else if (status === "processing" || status === "queued") {
            badgeType = "pending";
            label = "실행 중";
          } else if (status === "skipped") {
            badgeType = "default";
            label = "제외됨";
          }

          return (
            <N8lientStatusBadge type={badgeType}>
              {label}
            </N8lientStatusBadge>
          );
        },
      },
      {
        id: "actions",
        header: "작업",
        size: 100,
        meta: { headerAlign: "center", cellAlign: "center" },
        cell: ({ row }) => (
          <div>
            <button
              className="ux_button_compact ux_button_secondary"
              onClick={(e) => {
                e.stopPropagation(); // 행 클릭 버블링 방지
                handleRowClick(row.original);
              }}
              style={{
                fontSize: "11px",
                padding: "4px 8px",
                borderRadius: "4px",
                boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
              }}
            >
              상세
            </button>
          </div>
        ),
      },
    ];
  }, [actorLabelByUid]);

  return (
    <div className="ux_page_layout" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="ux_page_header">
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

      {loading ? (
        <N8lientLoadingState message="실행 로그를 불러오는 중..." />
      ) : filteredList.length === 0 ? (
        <N8lientEmptyState
          title="조회된 실행 결과가 없습니다."
          description="검색 필터 조건을 조정해 보세요."
        />
      ) : (
        <N8lientDataGrid
          data={filteredList}
          columns={gridColumns}
          getRowId={(row) => row.submissionId}
          onRowClick={handleRowClick}
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
