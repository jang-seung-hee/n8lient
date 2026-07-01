// [ExecutionLogGrid.tsx]
// 이 파일은 회사 관리자 콘솔 및 플랫폼 운영자 콘솔의 실행 로그 화면에서
// 공통으로 사용되는 데이터 그리드 조립 및 컬럼 설정 컴포넌트입니다.
// 한국어 주석 표준을 준수합니다.

import React, { useMemo } from "react";
import type { Submission, WorkflowTemplate } from "@/types/n8lient";
import { N8lientDataGrid } from "./N8lientDataGrid";
import { N8lientStatusBadge } from "./N8lientStatusBadge";
import { ColumnDef } from "@tanstack/react-table";
import { resolveWorkflowDisplayName } from "@/common/workflow/resolveWorkflowDisplayName";
import { truncateText, formatCompactDateTime } from "./executionLogGridHelpers";

interface ExecutionLogGridProps {
  data: Submission[];
  templates: Record<string, WorkflowTemplate>;
  clientsMap?: Map<string, string>;
  actorLabelByUid: Record<string, string>;
  onOpenDetail: (row: Submission) => void;
  singleClientName?: string; // 회사 관리자에서 본인 회사명 고정 출력용
  storageKey: string;
}

export function ExecutionLogGrid({
  data,
  templates,
  clientsMap,
  actorLabelByUid,
  onOpenDetail,
  singleClientName,
  storageKey,
}: ExecutionLogGridProps) {
  
  const gridColumns = useMemo<ColumnDef<Submission>[]>(() => {
    return [
      {
        accessorKey: "createdAt",
        header: "실행시각",
        size: 160,
        meta: { headerAlign: "center", cellAlign: "center" },
        cell: ({ row }) => {
          const formatted = formatCompactDateTime(row.original.createdAt);
          return (
            <span style={{ whiteSpace: "nowrap" }}>
              {formatted}
            </span>
          );
        },
      },
      {
        id: "workflowName",
        header: "워크플로우명",
        size: 230,
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
        size: 150,
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
        size: 170,
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
        size: 360,
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
        size: 90,
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
        size: 80,
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
  }, [templates, clientsMap, actorLabelByUid, onOpenDetail, singleClientName]);

  return (
    <N8lientDataGrid
      data={data}
      columns={gridColumns}
      getRowId={(row) => row.submissionId}
      onRowClick={onOpenDetail}
      storageKey={storageKey}
    />
  );
}
