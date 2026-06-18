/**
 * 이 파일은 실행 성공/실패 공통 상세 디버그 정보 아코디언 패널 컴포넌트입니다.
 * 한국어 주석 표준을 준수합니다.
 */

"use client";

import React, { useState } from "react";
import type { Submission } from "@/types/n8lient";
import {
  getSanitizedDebugInfo,
  downloadExecutionSnapshotJson,
} from "@/common/debug/sanitizeDebugInfo";
import { formatResultDisplayValue } from "@/components/results/formatResultDisplayValue";

interface SubmissionErrorDetailsPanelProps {
  submission: Submission;
  copyButtonLabel?: string;
  /** 지정 시 failed 기본값 대신 사용 */
  defaultExpanded?: boolean;
  /** true면 외부 아코디언에 임베드 — 헤더 토글 없이 콘텐츠·버튼만 표시 */
  embedded?: boolean;
}

function isFailedStatus(status: string): boolean {
  return status === "failed" || status === "config_error";
}

export function SubmissionErrorDetailsPanel({
  submission,
  copyButtonLabel = "📋 디버그 정보 복사",
  defaultExpanded,
  embedded = false,
}: SubmissionErrorDetailsPanelProps) {
  const { errorDetails } = submission;
  const failed = isFailedStatus(submission.status);

  const [expanded, setExpanded] = useState(
    defaultExpanded !== undefined ? defaultExpanded : failed
  );

  const handleCopy = () => {
    const debugInfo = getSanitizedDebugInfo(submission);
    navigator.clipboard
      .writeText(JSON.stringify(debugInfo, null, 2))
      .then(() => alert("디버그 정보가 클립보드에 복사되었습니다."))
      .catch(() => alert("복사에 실패했습니다."));
  };

  const handleDownload = () => {
    try {
      downloadExecutionSnapshotJson(submission);
    } catch {
      alert("JSON 다운로드에 실패했습니다.");
    }
  };

  const settingsKeyCount = submission.settingsSnapshot
    ? Object.keys(submission.settingsSnapshot).length
    : 0;

  const buttonStyle: React.CSSProperties = {
    fontSize: "10px",
    padding: "2px 6px",
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "4px",
    cursor: "pointer",
    color: "#64748b",
    whiteSpace: "nowrap",
  };

  const showContent = embedded || expanded;

  return (
    <div
      style={{
        backgroundColor: embedded ? "transparent" : "#f8fafc",
        border: embedded ? "none" : "1px solid #e2e8f0",
        padding: embedded ? 0 : "10px",
        borderRadius: embedded ? 0 : "6px",
        marginTop: embedded ? 0 : "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        {!embedded && (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              flex: 1,
              minWidth: 0,
              textAlign: "left",
            }}
          >
            <span style={{ fontSize: "10px", color: "#64748b" }}>{expanded ? "▼" : "▶"}</span>
            <h4 style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569", margin: 0 }}>
              🔍 상세 디버깅 정보
            </h4>
          </button>
        )}

        <div style={{ display: "flex", gap: "4px", flexShrink: 0, marginLeft: embedded ? 0 : undefined }}>
          <button type="button" onClick={handleCopy} style={buttonStyle}>
            {copyButtonLabel}
          </button>
          <button type="button" onClick={handleDownload} style={buttonStyle}>
            📥 실행 설정 JSON 다운로드
          </button>
        </div>
      </div>

      {showContent && (
        <div style={{ marginTop: "8px", fontSize: "11px", color: "#475569" }}>
          {failed ? (
            errorDetails ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                <div>
                  <span style={{ color: "#64748b", marginRight: "6px" }}>실패 단계:</span>
                  <strong>{formatResultDisplayValue(errorDetails.phase)}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", marginRight: "6px" }}>실패 위치:</span>
                  <strong>{formatResultDisplayValue(errorDetails.source)}</strong>
                </div>
                {errorDetails.httpStatus != null && (
                  <div>
                    <span style={{ color: "#64748b", marginRight: "6px" }}>HTTP 상태:</span>
                    {formatResultDisplayValue(errorDetails.httpStatus)}
                  </div>
                )}
                {errorDetails.gatewayTraceId && (
                  <div>
                    <span style={{ color: "#64748b", marginRight: "6px" }}>추적 ID:</span>
                    <span style={{ fontFamily: "monospace" }}>
                      {formatResultDisplayValue(errorDetails.gatewayTraceId)}
                    </span>
                  </div>
                )}
                {errorDetails.n8nExecutionId && (
                  <div>
                    <span style={{ color: "#64748b", marginRight: "6px" }}>n8n 실행 ID:</span>
                    <span style={{ fontFamily: "monospace" }}>
                      {formatResultDisplayValue(errorDetails.n8nExecutionId)}
                    </span>
                  </div>
                )}
                {errorDetails.n8nWebhookPath && (
                  <div>
                    <span style={{ color: "#64748b", marginRight: "6px" }}>Webhook Path:</span>
                    {formatResultDisplayValue(errorDetails.n8nWebhookPath)}
                  </div>
                )}
                <div
                  style={{
                    marginTop: "4px",
                    padding: "6px",
                    backgroundColor: "#f1f5f9",
                    borderRadius: "4px",
                    borderLeft: "3px solid #cbd5e1",
                  }}
                >
                  <strong>💡 확인 힌트:</strong>{" "}
                  {formatResultDisplayValue(errorDetails.hint || "n8n 실행 로그를 확인해 주세요.")}
                </div>
              </div>
            ) : (
              <div style={{ color: "#94a3b8", fontStyle: "italic" }}>
                상세 디버그 정보가 없는 레거시 에러 데이터입니다.
              </div>
            )
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div>
                <span style={{ color: "#64748b", marginRight: "6px" }}>보관 정책:</span>
                {submission.retentionPolicySnapshot?.level || "(스냅샷 없음)"}
              </div>
              <div>
                <span style={{ color: "#64748b", marginRight: "6px" }}>설정 스냅샷:</span>
                {settingsKeyCount > 0
                  ? `${settingsKeyCount}개 키 저장됨`
                  : "settingsSnapshot 없음 (레거시 또는 API Route 경로 실행)"}
              </div>
              {submission.settingsMergeSummary && (
                <div>
                  <span style={{ color: "#64748b", marginRight: "6px" }}>설정 병합:</span>
                  {submission.settingsMergeSummary.hasUserSetting
                    ? `개인 설정 ${submission.settingsMergeSummary.mergedKeys.length}키 적용`
                    : "회사 기본 설정만 사용"}
                </div>
              )}
              <div style={{ color: "#94a3b8", fontStyle: "italic", marginTop: "4px" }}>
                전체 스냅샷은 「실행 설정 JSON 다운로드」로 확인하세요.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
