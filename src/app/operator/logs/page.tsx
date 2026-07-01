// 이 파일은 시스템 운영자가 플랫폼 전체에서 발생한 n8n 실행 이력 로그를 조회하는 화면입니다.
// 한국어 주석 표준을 준수합니다.

"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { ExecutionLogSearchBar } from "@/components/results/ExecutionLogSearchBar";
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
import { N8lientDataGrid } from "@/components/common/data/N8lientDataGrid";
import { N8lientStatusBadge } from "@/components/common/data/N8lientStatusBadge";
import { N8lientLoadingState } from "@/components/common/data/N8lientLoadingState";
import { N8lientEmptyState } from "@/components/common/data/N8lientEmptyState";
import { ColumnDef } from "@tanstack/react-table";

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

export default function OperatorLogs() {
  // 데이터 상태
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientsMap, setClientsMap] = useState<Map<string, string>>(new Map());

  // 검색 및 필터 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

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
  const filteredList = useMemo(() => {
    return filterSubmissions(submissions, {
      searchQuery,
      status: filters.status as SubmissionStatus | "all",
      errorPhase: filters.errorPhase as ExecutionFailurePhase | "all",
      errorSource: filters.errorSource as ExecutionFailureSource | "all",
    });
  }, [submissions, searchQuery, filters]);

  const actorLabelByUid = useSubmissionActorLabelMap(filteredList);

  // TanStack Table 용 ColumnDef 설계
  const gridColumns = useMemo<ColumnDef<Submission>[]>(() => {
    return [
      {
        accessorKey: "createdAt",
        header: "실행 시각",
        size: 140,
        meta: { headerAlign: "center", cellAlign: "center" },
        cell: ({ row }) => formatCompactDateTime(row.original.createdAt),
      },
      {
        id: "workflowName",
        header: "워크플로우",
        size: 260,
        meta: { headerAlign: "center", cellAlign: "left" },
        accessorFn: (row) => row.input?.title || row.workflowKey || "-",
        cell: ({ row }) => {
          const key = row.original.workflowKey;
          const label = row.original.input?.title || key || "-";
          return (
            <span className="ux_table_text_ellipsis" style={{ fontWeight: 600, color: "#111827" }} title={key}>
              {truncateText(label, 20)}
            </span>
          );
        },
      },
      {
        id: "clientName",
        header: "고객사",
        size: 200,
        meta: { headerAlign: "center", cellAlign: "left" },
        accessorFn: (row) => clientsMap.get(row.clientId || "") || "-",
        cell: ({ row }) => {
          const clientName = clientsMap.get(row.original.clientId || "") || "-";
          return (
            <span className="ux_table_text_ellipsis" title={clientName}>
              {truncateText(clientName, 20)}
            </span>
          );
        },
      },
      {
        accessorKey: "userEmail",
        header: "사용자",
        size: 240,
        meta: { headerAlign: "center", cellAlign: "left" },
        cell: ({ row }) => {
          const uid = row.original.uid;
          const emailFallback = (row.original as any).googleEmail || (row.original as any).userEmail || "알 수 없음";
          let displayLabel = actorLabelByUid[uid] || emailFallback;
          if (displayLabel.includes("/")) {
            displayLabel = displayLabel.split("/").pop()?.trim() || displayLabel;
          }
          return (
            <span className="ux_table_text_ellipsis" title={emailFallback}>
              {truncateText(displayLabel, 25)}
            </span>
          );
        },
      },
      {
        id: "title",
        header: "실행명",
        size: 320,
        meta: { headerAlign: "center", cellAlign: "left" },
        accessorFn: (row) => row.displayTitle || row.input?.title || row.input?.submissionTitle || "-",
        cell: ({ row }) => {
          const title = row.original.displayTitle || row.original.input?.title || row.original.input?.submissionTitle || "-";
          return (
            <span className="ux_table_text_ellipsis" title={title}>
              {truncateText(title, 25)}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "상태",
        size: 100,
        meta: { headerAlign: "center", cellAlign: "center" },
        cell: ({ row }) => {
          const status = row.original.status as string;
          let badgeType: "success" | "error" | "pending" | "default" = "default";
          let label = status;

          if (status === "success") {
            badgeType = "success";
            label = "완료";
          } else if (status === "failed" || status === "config_error") {
            badgeType = "error";
            label = status === "config_error" ? "설정 오류" : "실패";
          } else if (status === "processing" || status === "queued" || status === "running") {
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
        header: "상세",
        size: 100,
        meta: { headerAlign: "center", cellAlign: "center" },
        cell: ({ row }) => (
          <div>
            <button
              className="ux_button_compact ux_button_secondary"
              onClick={(e) => {
                e.stopPropagation();
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
  }, [clientsMap, actorLabelByUid]);

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
      {loading && submissions.length === 0 ? (
        <N8lientLoadingState message="플랫폼 로그를 불러오는 중..." />
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
          viewerRole="operator"
          actorDisplaySource={actorDisplaySource}
        />
      )}
    </div>
  );
}

