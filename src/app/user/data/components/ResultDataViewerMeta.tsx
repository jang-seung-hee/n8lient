// [ResultDataViewerMeta.tsx]
// 이 파일은 Result Data Viewer의 상단 메타데이터(제목, 워크플로우 분류, 공개범위, 생성일 등) 및
// 하단 접힘(Collapsible) 형태의 최소 운영 정보 영역을 제공하는 UI 컴포넌트입니다.
// 보안 규정: Firebase Storage 내부 path 등 민감정보 노출 방지 및 UI 중앙 스타일 적용을 준수합니다.
// 한국어 주석 표준을 준수합니다.

import React, { useState } from "react";
import { playAppSound } from "@/lib/appSound";

export interface SafeSubmissionViewDTO {
  submissionId: string;
  workflowKey: string;
  workflowName: string;
  accessMode: "private" | "company";
  createdAt: any;
  ownerName: string;
  ownerEmail: string;
  title: string;
  summary: string;
  content: string;
  mdContent: string;
  hashtags: string[];
  actionLinks: Array<{ label: string; url: string }>;
  originalFiles: Array<{ name: string; size?: number; mimeType?: string; index: number }>;
  resultFiles: Array<{ name: string; size?: number; mimeType?: string; index: number; isDriveUrl?: boolean; url?: string }>;
  durationText?: string | null;
}

interface ResultDataViewerMetaProps {
  data: SafeSubmissionViewDTO;
  onOpenReport?: () => void;
}

export function ResultDataViewerMeta({ data, onOpenReport }: ResultDataViewerMetaProps) {
  const [showDebug, setShowDebug] = useState(false);

  const formatDisplayDate = (createdAt: any) => {
    if (!createdAt) return "";
    let date: Date;
    if (createdAt.seconds !== undefined) {
      date = new Date(createdAt.seconds * 1000);
    } else {
      date = new Date(createdAt);
    }
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isCompany = data.accessMode === "company";

  const handleToggleDebug = () => {
    playAppSound("click");
    setShowDebug((prev) => !prev);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
      {/* 상단 메타 헤더 카드 */}
      <div className="ux_card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {/* 워크플로우 분류 */}
            <span
              className="ux_badge"
              style={{
                fontSize: "11px",
                fontWeight: 700,
                backgroundColor: "#f3f4f6",
                color: "#4b5563",
                padding: "2px 8px",
                borderRadius: "4px",
                height: "auto",
              }}
            >
              📂 {data.workflowName || data.workflowKey}
            </span>
            {/* 공개범위 배지 */}
            <span
              className={`ux_badge ${isCompany ? "ux_badge_success" : "ux_badge_info"}`}
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "4px",
                height: "auto",
              }}
            >
              {isCompany ? "🏢 회사 공개" : "🔒 개인 보관"}
            </span>
          </div>

          <div style={{ fontSize: "12.5px", color: "#6b7280" }}>
            ⏱️ {formatDisplayDate(data.createdAt)}
          </div>
        </div>

        {/* 대제목 */}
        <h1 className="ux_page_title" style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 12px 0", lineHeight: 1.4 }}>
          {data.title || "제목 없는 데이터"}
        </h1>

        {/* 작성자 정보 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#6b7280", borderTop: "1px solid #f3f4f6", paddingTop: "10px" }}>
          <div>
            👤 <strong>{data.ownerName || "작성자"}</strong> ({data.ownerEmail || "이메일 없음"})
          </div>
          {data.durationText && (
            <div style={{ color: "#374151", fontWeight: 500 }}>
              ⏱️ {data.durationText}
            </div>
          )}
        </div>
      </div>

      {/* 운영 및 디버그 정보 접힘(Collapsible) 영역 */}
      <div className="ux_card" style={{ borderStyle: "dashed", backgroundColor: "#f9fafb", padding: "12px 16px" }}>
        <div
          onClick={handleToggleDebug}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#4b5563" }}>
            🔧 운영 및 디버그 정보 {showDebug ? "접기 ▲" : "펼치기 ▼"}
          </span>
          {onOpenReport && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                playAppSound("click");
                onOpenReport();
              }}
              className="ux_button ux_button_secondary ux_button_compact"
              style={{ fontSize: "11.5px", height: "26px", padding: "0 10px" }}
            >
              📊 실행 리포트 보기
            </button>
          )}
        </div>

        {showDebug && (
          <div
            style={{
              marginTop: "12px",
              paddingTop: "12px",
              borderTop: "1px dashed #e5e7eb",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "12px",
              color: "#4b5563",
              lineHeight: 1.6,
            }}
          >
            <div>
              <strong>실행 ID (Submission ID):</strong> <code style={{ backgroundColor: "#eaeaea", padding: "2px 4px", borderRadius: "3px" }}>{data.submissionId}</code>
            </div>
            <div>
              <strong>워크플로우 키 (Workflow Key):</strong> <code style={{ backgroundColor: "#eaeaea", padding: "2px 4px", borderRadius: "3px" }}>{data.workflowKey}</code>
            </div>
            <div style={{ fontSize: "11px", color: "#9ca3af" }}>
              * 본 디버그 정보는 관리용도 및 문제 해결을 위한 식별자 값이며, 외부 보안 토큰이나 Storage의 물리적인 전체 경로는 원천 비공개 처리됩니다.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
