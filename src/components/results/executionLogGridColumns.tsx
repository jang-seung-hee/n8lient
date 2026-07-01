// [executionLogGridColumns.tsx]
// 이 파일은 회사 관리자 및 플랫폼 운영자 실행 로그 화면에서 공통으로 사용되는
// 데이터 그리드 컬럼 설정 및 렌더링 도우미 유틸 함수들을 제공합니다.
// 한국어 주석 표준을 준수합니다.

import React from "react";
import type { Submission, WorkflowTemplate } from "@/types/n8lient";
import { N8lientStatusBadge } from "@/components/common/data/N8lientStatusBadge";
import { resolveWorkflowDisplayName } from "@/common/workflow/resolveWorkflowDisplayName";
import { ColumnDef } from "@tanstack/react-table";

// 텍스트 축약 헬퍼 함수
export const truncateText = (value: string, maxLength = 25) => {
  if (!value) return "-";
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
};

// 날짜 안전 변환 헬퍼 함수
export const toDateSafe = (value: unknown): Date | null => {
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
export const formatCompactDateTime = (value: unknown, fallback = "-") => {
  const date = toDateSafe(value);
  if (!date) return fallback;

  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");

  return `${yy}.${mm}.${dd} ${hh}:${mi}`;
};

interface ColumnHelperConfig {
  templates: Record<string, WorkflowTemplate>;
  clientsMap?: Map<string, string>;
  actorLabelByUid: Record<string, string>;
  onOpenDetail: (row: Submission) => void;
  singleClientName?: string; // 회사 관리자 화면에서 단건 회사명 노출 시 사용
}

export function buildExecutionLogGridColumns({
  templates,
  clientsMap,
  actorLabelByUid,
  onOpenDetail,
  singleClientName,
}: ColumnHelperConfig): ColumnDef<Submission>[] {
  return [
    {
      accessorKey: "createdAt",
      header: "실행시각",
      size: 130,
      meta: { headerAlign: "center", cellAlign: "center" },
      cell: ({ row }) => formatCompactDateTime(row.original.createdAt),
    },
    {
      id: "workflowName",
      header: "워크플로우명",
      size: 240,
      meta: { headerAlign: "center", cellAlign: "left" },
      accessorFn: (row) => {
        const key = row.workflowKey;
        const resolved = resolveWorkflowDisplayName({ template: templates[key] || null, workflowKey: key });
        return resolved || row.input?.title || key || "-";
      },
      cell: ({ row }) => {
        const key = row.original.workflowKey;
        const resolved = resolveWorkflowDisplayName({ template: templates[key] || null, workflowKey: key });
        const label = resolved || row.original.input?.title || key || "-";
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
      accessorFn: (row) => {
        if (singleClientName) return singleClientName;
        return clientsMap?.get(row.clientId || "") || "-";
      },
      cell: ({ row }) => {
        const clientName = singleClientName || clientsMap?.get(row.original.clientId || "") || "-";
        return (
          <span className="ux_table_text_ellipsis" title={clientName}>
            {truncateText(clientName, 20)}
          </span>
        );
      },
    },
    {
      id: "userName",
      header: "사용자",
      size: 240,
      meta: { headerAlign: "center", cellAlign: "left" },
      accessorFn: (row) => {
        const uid = row.uid;
        const emailFallback = (row as any).googleEmail || (row as any).userEmail || "알 수 없음";
        return actorLabelByUid[uid] || emailFallback;
      },
      cell: ({ row }) => {
        const uid = row.original.uid;
        const emailFallback = (row.original as any).googleEmail || (row.original as any).userEmail || "알 수 없음";
        const label = actorLabelByUid[uid];
        
        let displayLabel = emailFallback;
        if (label) {
          // "성명(아이디)" 형식으로 조립
          const emailPart = emailFallback.includes("/") 
            ? emailFallback.split("/").pop()?.trim() 
            : emailFallback;
          
          if (label !== emailPart) {
            displayLabel = `${label}(${emailPart})`;
          } else {
            displayLabel = label;
          }
        }
        
        return (
          <span className="ux_table_text_ellipsis" title={emailFallback}>
            {truncateText(displayLabel, 15)}
          </span>
        );
      },
    },
    {
      id: "title",
      header: "제목",
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
      header: "보기",
      size: 100,
      meta: { headerAlign: "center", cellAlign: "center" },
      cell: ({ row }) => (
        <div>
          <button
            className="ux_button_compact ux_button_secondary"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(row.original);
            }}
            style={{
              fontSize: "11px",
              padding: "4px 8px",
              borderRadius: "4px",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            }}
          >
            보기
          </button>
        </div>
      ),
    },
  ];
}
