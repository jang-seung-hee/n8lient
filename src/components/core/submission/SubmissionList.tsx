/**
 * 이 파일은 자동화 실행 이력 목록을 표시하는 공통 컴포넌트입니다.
 * 사용자, 회사 관리자, 운영자 모드에 따라 최적화된 레이아웃을 제공합니다.
 * 한국어 주석 표준을 준수합니다.
 */

import React from "react";
import type { Submission } from "@/types/n8lient";
import { getSubmissionDisplayTitle } from "@/common/submission/getSubmissionDisplayTitle";
import {
  formatUserListActorLabel,
  resolveSubmissionActorDisplaySource,
} from "@/common/user/formatUserDisplayName";
import {
  formatCompactDateTime,
  resolveSubmissionExecutionDateTime,
} from "@/common/date/formatCompactDateTime";
import { SubmissionStatusBadge } from "./SubmissionStatusBadge";

interface SubmissionListProps {
  submissions: Submission[];
  onRowClick: (submission: Submission) => void;
  viewMode: "user" | "company_admin" | "operator";
  /** operator·company_admin 목록: uid → 이름 / 구글이메일 라벨 (users 조회 결과) */
  actorLabelByUid?: Record<string, string>;
}

export function SubmissionList({ submissions, onRowClick, viewMode, actorLabelByUid }: SubmissionListProps) {
  if (submissions.length === 0) {
    return (
      <div style={{ padding: "32px 16px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
        조회된 N8N 워크플로우 실행 로그가 없습니다.
      </div>
    );
  }

  // 1. 사용자 뷰 (카드형)
  if (viewMode === "user") {
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        {submissions.map((sub, idx) => (
          <div
            key={sub.submissionId}
            onClick={() => onRowClick(sub)}
            style={{
              padding: "10px 12px",
              borderBottom: idx < submissions.length - 1 ? "1px solid #f3f4f6" : "none",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              cursor: "pointer",
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f9fafb"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                <SubmissionStatusBadge status={sub.status} />
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#111111",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    flex: 1,
                  }}
                >
                  {getSubmissionDisplayTitle(sub)}
                </span>
              </div>
              <span style={{ fontSize: "11px", color: "#9ca3af", flexShrink: 0, marginLeft: "8px", whiteSpace: "nowrap" }}>
                {formatCompactDateTime(resolveSubmissionExecutionDateTime(sub))}
              </span>
            </div>
            <div style={{ display: "flex", width: "100%", justifyContent: "space-between", fontSize: "11px", color: "#6b7280", paddingLeft: "4px" }}>
              <span>Key: {sub.workflowKey} · ID: {sub.submissionId}</span>
              <span style={{ color: "#3b82f6", fontWeight: 600 }}>상세 보기 &rarr;</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 2. 관리자/운영자 뷰 (테이블형)
  const operatorGridColumns = "1.2fr 0.75fr 1fr 1.5fr 2fr 0.8fr";
  const adminGridColumns = "1.2fr 0.75fr 1.5fr 2fr 0.8fr";
  const usesActorLabel = viewMode === "operator" || viewMode === "company_admin";
  const gridColumns = viewMode === "operator" ? operatorGridColumns : adminGridColumns;
  const tableMinWidth = viewMode === "operator" ? "820px" : "760px";

  return (
    <div className="ux_scroll_area">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: gridColumns,
          padding: "10px 16px",
          backgroundColor: "#f9fafb",
          borderBottom: "1px solid #e5e7eb",
          fontSize: "12px",
          fontWeight: 600,
          color: "#374151",
          minWidth: tableMinWidth,
        }}
      >
        <span>실행 ID</span>
        {usesActorLabel && <span>실행일시</span>}
        {viewMode === "operator" && <span>고객사 ID</span>}
        <span>{usesActorLabel ? "이름 / 구글이메일" : "요청자 UID/이메일"}</span>
        <span>실행명 (워크플로우)</span>
        <span style={{ textAlign: "right" }}>상태</span>
      </div>
      {submissions.map((sub) => {
        const actorLabel =
          usesActorLabel && actorLabelByUid?.[sub.uid]
            ? actorLabelByUid[sub.uid]
            : usesActorLabel
              ? formatUserListActorLabel(resolveSubmissionActorDisplaySource(sub))
              : sub.uid;

        return (
        <div
          key={sub.submissionId}
          onClick={() => onRowClick(sub)}
          style={{
            display: "grid",
            gridTemplateColumns: gridColumns,
            padding: "12px 16px",
            borderBottom: "1px solid #f3f4f6",
            fontSize: "13px",
            color: "#111111",
            cursor: "pointer",
            alignItems: "center",
            minWidth: tableMinWidth,
            transition: "background-color 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f9fafb"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#64748b" }}>{sub.submissionId}</span>
          {usesActorLabel && (
            <span style={{ whiteSpace: "nowrap", fontSize: "11px", color: "#64748b" }}>
              {formatCompactDateTime(resolveSubmissionExecutionDateTime(sub))}
            </span>
          )}
          {viewMode === "operator" && <span style={{ fontSize: "11px", color: "#64748b" }}>{sub.clientId}</span>}
          <span
            style={{
              maxWidth: usesActorLabel ? "180px" : undefined,
              fontSize: "12px",
              color: "#374151",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {actorLabel}
          </span>
          <span style={{ fontWeight: 500 }}>{getSubmissionDisplayTitle(sub)} <small style={{ fontWeight: 400, color: "#94a3b8" }}>({sub.workflowKey})</small></span>
          <div style={{ textAlign: "right" }}>
            <SubmissionStatusBadge status={sub.status} />
          </div>
        </div>
        );
      })}
    </div>
  );
}
