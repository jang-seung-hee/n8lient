// [ResultDataViewerMeta.tsx]
// 이 파일은 Result Data Viewer의 상단 메타데이터(제목, 워크플로우 분류, 공개범위, 생성일 등) 및
// 하단 접힘(Collapsible) 형태의 최소 운영 정보 영역을 제공하는 UI 컴포넌트입니다.
// 보안 규정: canChangeAccessMode 가 true일 때만 작성자 본인에게 공개범위 전환 버튼을 노출합니다.
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
  canChangeAccessMode?: boolean; // 추가: 서버 검증 기반 변경 권한 여부
  canAdminRevokeCompanyAccess?: boolean; // [v3.3A] 추가: 관리자 공개 철회 권한 여부
}

interface ResultDataViewerMetaProps {
  data: SafeSubmissionViewDTO;
  onOpenReport?: () => void;
  onUpdateAccessMode?: (newMode: "private" | "company") => Promise<void>; // 추가: 공개범위 변경 콜백
  onAdminRevokeAccessMode?: () => Promise<void>; // [v3.3A] 추가: 관리자 공개철회 콜백
}

export function ResultDataViewerMeta({ data, onOpenReport, onUpdateAccessMode, onAdminRevokeAccessMode }: ResultDataViewerMetaProps) {
  const [showDebug, setShowDebug] = useState(false);
  const [updating, setUpdating] = useState(false);

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

  const handleToggleAccessMode = async (newMode: "private" | "company") => {
    if (!onUpdateAccessMode || updating) return;

    playAppSound("click");
    const confirmMessage = newMode === "company"
      ? "이 자료를 회사 구성원이 볼 수 있도록 공개하시겠습니까?"
      : "이 자료를 다시 본인만 볼 수 있도록 변경하시겠습니까?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setUpdating(true);
    try {
      await onUpdateAccessMode(newMode);
    } finally {
      setUpdating(false);
    }
  };

  const handleAdminRevoke = async () => {
    if (!onAdminRevokeAccessMode || updating) return;

    playAppSound("click");
    if (!window.confirm("이 자료를 회사 공개자료에서 제외하고 작성자 개인 보관으로 되돌리시겠습니까?")) {
      return;
    }

    setUpdating(true);
    try {
      await onAdminRevokeAccessMode();
    } finally {
      setUpdating(false);
    }
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
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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

              {/* canChangeAccessMode 가 true일 때만 변경 단추 노출 */}
              {data.canChangeAccessMode && onUpdateAccessMode && (
                <button
                  onClick={() => handleToggleAccessMode(isCompany ? "private" : "company")}
                  disabled={updating}
                  className="ux_viewer_action_btn"
                  title="본인 자료의 공개범위를 변경합니다."
                  style={{ cursor: updating ? "not-allowed" : "pointer" }}
                >
                  {updating ? "변경 중..." : isCompany ? "개인 보관으로 되돌리기" : "회사 공개로 전환"}
                </button>
              )}

              {/* [v3.3A] canAdminRevokeCompanyAccess 가 true일 때 회사 관리자 철회 단추 노출 */}
              {data.canAdminRevokeCompanyAccess && onAdminRevokeAccessMode && (
                <button
                  onClick={handleAdminRevoke}
                  disabled={updating}
                  className="ux_button ux_button_danger ux_button_compact"
                  title="회사 관리자 권한으로 본 자료의 회사 공유를 강제 철회합니다."
                  style={{ cursor: updating ? "not-allowed" : "pointer", fontSize: "11px", height: "24px", padding: "0 8px" }}
                >
                  {updating ? "철회 중..." : "⚠️ 회사 공개 철회"}
                </button>
              )}
            </div>
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
