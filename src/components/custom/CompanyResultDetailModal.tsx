"use client";

import React, { useState } from "react";
import type { Submission } from "@/types/n8lient";
import { getSubmissionDisplayTitle } from "@/common/submission/getSubmissionDisplayTitle";

interface CompanyResultDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: Submission | null;
}

export function CompanyResultDetailModal({ isOpen, onClose, submission }: CompanyResultDetailModalProps) {
  const [showInputJson, setShowInputJson] = useState(false);
  const [showResultJson, setShowResultJson] = useState(false);

  if (!isOpen || !submission) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return { bg: "#e2fbf0", text: "#0d9488", label: "성공" };
      case "processing":
        return { bg: "#eff6ff", text: "#2563eb", label: "처리중" };
      case "failed":
        return { bg: "#fef2f2", text: "#dc2626", label: "실패" };
      default:
        return { bg: "#f3f4f6", text: "#4b5563", label: "대기" };
    }
  };

  const badge = getStatusBadge(submission.status);

  // 민감 정보 제거/마스킹 헬퍼
  const filterSensitiveKeys = (obj: any): any => {
    if (!obj || typeof obj !== "object") return obj;

    if (Array.isArray(obj)) {
      return obj.map(filterSensitiveKeys);
    }

    const resultObj: any = {};
    const sensitiveRegex = /(secret|token|credential|password|auth|private|accessToken|refreshToken|apiKey|privateKey|secretKey|accessKey)/i;

    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveRegex.test(key)) {
        resultObj[key] = "******** (보안 항목 마스킹됨)";
      } else if (typeof value === "object" && value !== null) {
        resultObj[key] = filterSensitiveKeys(value);
      } else {
        resultObj[key] = value;
      }
    }
    return resultObj;
  };

  const safeInput = filterSensitiveKeys(submission.input);
  const safeResult = filterSensitiveKeys(submission.result);
  const safeError = filterSensitiveKeys(submission.error);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "560px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          overflow: "hidden",
          border: "1px solid #e5e7eb",
          animation: "modalFadeIn 0.2s ease-out",
          display: "flex",
          flexDirection: "column",
          maxHeight: "85vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f3f4f6",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#f9fafb",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#111111", margin: 0 }}>
            📜 N8N 워크플로우 실행 상세 결과
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "18px",
              color: "#9ca3af",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div
          style={{
            padding: "20px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            flex: 1,
          }}
        >
          {/* 주요 상태 정보 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              backgroundColor: "#f9fafb",
              padding: "14px",
              borderRadius: "8px",
              border: "1px solid #f3f4f6",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 500, marginBottom: "2px" }}>실행 ID</div>
              <div style={{ fontSize: "13px", color: "#111111", fontFamily: "monospace", fontWeight: 600 }}>
                {submission.submissionId}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 500, marginBottom: "2px" }}>상태</div>
              <div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    backgroundColor: badge.bg,
                    color: badge.text,
                    padding: "3px 8px",
                    borderRadius: "4px",
                  }}
                >
                  {badge.label}
                </span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 500, marginBottom: "2px" }}>워크플로우 Key</div>
              <div style={{ fontSize: "13px", color: "#374151", fontFamily: "monospace" }}>
                {submission.workflowKey}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 500, marginBottom: "2px" }}>실행 요청 일시</div>
              <div style={{ fontSize: "12.5px", color: "#374151" }}>
                {new Date(submission.createdAt).toLocaleString()}
              </div>
            </div>
          </div>

          {/* 입력 파라미터 요약/접힘 */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
              }}
            >
              <h4 style={{ fontSize: "13.5px", fontWeight: 600, color: "#374151", margin: 0 }}>
                📥 입력 데이터 (Input)
              </h4>
              <button
                type="button"
                onClick={() => setShowInputJson(!showInputJson)}
                style={{
                  fontSize: "11px",
                  color: "#2563eb",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                {showInputJson ? "간단히 보기" : "전체 JSON 보기"}
              </button>
            </div>

            <div
              style={{
                backgroundColor: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                padding: "10px 12px",
                fontSize: "13px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div>
                  <span style={{ color: "#6b7280", marginRight: "6px" }}>제목:</span>
                  <span style={{ fontWeight: 500, color: "#111111" }}>{getSubmissionDisplayTitle(submission)}</span>
                </div>
                {submission.input.text && (
                  <div>
                    <span style={{ color: "#6b7280", marginRight: "6px" }}>설명:</span>
                    <span style={{ color: "#374151" }}>{submission.input.text}</span>
                  </div>
                )}
                {submission.input.fileName && (
                  <div>
                    <span style={{ color: "#6b7280", marginRight: "6px" }}>첨부 파일:</span>
                    <span style={{ color: "#2563eb", fontFamily: "monospace" }}>{submission.input.fileName}</span>
                  </div>
                )}
              </div>

              {showInputJson && (
                <pre
                  style={{
                    marginTop: "10px",
                    padding: "8px",
                    backgroundColor: "#f1f5f9",
                    borderRadius: "4px",
                    fontSize: "11px",
                    color: "#334155",
                    overflowX: "auto",
                    maxHeight: "160px",
                    overflowY: "auto",
                    fontFamily: "monospace",
                    border: "1px solid #cbd5e1",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {JSON.stringify(safeInput, null, 2)}
                </pre>
              )}
            </div>
          </div>

          {/* 출력 결과 요약/접힘 */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
              }}
            >
              <h4 style={{ fontSize: "13.5px", fontWeight: 600, color: "#374151", margin: 0 }}>
                📤 실행 결과 (Result)
              </h4>
              <button
                type="button"
                onClick={() => setShowResultJson(!showResultJson)}
                style={{
                  fontSize: "11px",
                  color: "#2563eb",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                {showResultJson ? "간단히 보기" : "전체 JSON 보기"}
              </button>
            </div>

            <div
              style={{
                backgroundColor: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                padding: "10px 12px",
                fontSize: "13px",
              }}
            >
              {submission.status === "failed" ? (
                <div style={{ color: "#dc2626" }}>
                  <div style={{ fontWeight: 600, marginBottom: "4px" }}>❌ 실행 실패 에러</div>
                  <div style={{ fontSize: "12px", fontFamily: "monospace", backgroundColor: "#fef2f2", padding: "6px", borderRadius: "4px", border: "1px solid #fee2e2" }}>
                    {safeError?.message || "알 수 없는 에러가 발생했습니다."}
                    {safeError?.code && <div style={{ fontSize: "10.5px", color: "#991b1b", marginTop: "3px" }}>에러코드: {safeError.code}</div>}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {submission.result.summary ? (
                    <div>
                      <span style={{ color: "#6b7280", marginRight: "6px" }}>결과 요약:</span>
                      <span style={{ color: "#111111", fontWeight: 500 }}>{submission.result.summary}</span>
                    </div>
                  ) : (
                    <div style={{ color: "#6b7280", fontStyle: "italic" }}>결과 데이터 요약이 없습니다.</div>
                  )}
                  {submission.result.resultUrl && (
                    <div>
                      <span style={{ color: "#6b7280", marginRight: "6px" }}>출력 URL:</span>
                      <a
                        href={submission.result.resultUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#2563eb", textDecoration: "underline", wordBreak: "break-all" }}
                      >
                        {submission.result.resultUrl}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {showResultJson && (
                <pre
                  style={{
                    marginTop: "10px",
                    padding: "8px",
                    backgroundColor: "#f1f5f9",
                    borderRadius: "4px",
                    fontSize: "11px",
                    color: "#334155",
                    overflowX: "auto",
                    maxHeight: "160px",
                    overflowY: "auto",
                    fontFamily: "monospace",
                    border: "1px solid #cbd5e1",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {JSON.stringify(safeResult, null, 2)}
                </pre>
              )}
            </div>
          </div>

          {/* 설정 병합 로그 요약 */}
          {submission.settingsMergeSummary && (
            <div>
              <h4 style={{ fontSize: "13.5px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                ⚙️ 실행 시 병합 요약
              </h4>
              <div
                style={{
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  fontSize: "12px",
                  color: "#1e3a8a",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                  {submission.settingsMergeSummary.hasUserSetting ? "✅ 사용자 개인 설정 우선 적용 완료" : "🏢 회사 기본 설정으로 실행됨"}
                </div>
                {submission.settingsMergeSummary.mergedKeys.length > 0 && (
                  <div style={{ wordBreak: "break-all" }}>
                    <strong>개인값 사용 키:</strong> {submission.settingsMergeSummary.mergedKeys.join(", ")}
                  </div>
                )}
                {submission.settingsMergeSummary.fallbackKeys.length > 0 && (
                  <div style={{ wordBreak: "break-all", marginTop: "2px" }}>
                    <strong>회사 기본값 사용 키:</strong> {submission.settingsMergeSummary.fallbackKeys.join(", ")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #f3f4f6",
            display: "flex",
            justifyContent: "flex-end",
            backgroundColor: "#f9fafb",
          }}
        >
          <button
            onClick={onClose}
            style={{
              height: "36px",
              backgroundColor: "#374151",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              padding: "0 16px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1f2937")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#374151")}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
