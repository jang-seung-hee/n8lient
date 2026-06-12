"use client";

import React, { useState } from "react";
import type { Submission } from "@/types/n8lient";
import { downloadSubmissionFile } from "@/features/user/userService";
import { auth } from "@/lib/firebase";

interface SubmissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: Submission;
}

export default function SubmissionDetailModal({
  isOpen,
  onClose,
  submission,
}: SubmissionDetailModalProps) {
  const [downloadingIndex, setDownloadingIndex] = useState<{ type: string; idx: number } | null>(null);

  if (!isOpen) return null;

  const handleDownload = async (refType: "original" | "result", index: number, fileName: string) => {
    try {
      setDownloadingIndex({ type: refType, idx: index });
      await downloadSubmissionFile(auth, submission.submissionId, refType, index, fileName);
    } catch (err: any) {
      alert(`다운로드 실패: ${err.message}`);
    } finally {
      setDownloadingIndex(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <span style={{ fontSize: "11px", fontWeight: 600, backgroundColor: "#e2fbf0", color: "#0d9488", padding: "2px 8px", borderRadius: "4px" }}>성공</span>;
      case "processing":
        return <span style={{ fontSize: "11px", fontWeight: 600, backgroundColor: "#eff6ff", color: "#2563eb", padding: "2px 8px", borderRadius: "4px" }}>진행중</span>;
      case "failed":
        return <span style={{ fontSize: "11px", fontWeight: 600, backgroundColor: "#fef2f2", color: "#dc2626", padding: "2px 8px", borderRadius: "4px" }}>실패</span>;
      case "skipped":
        return <span style={{ fontSize: "11px", fontWeight: 600, backgroundColor: "#f3f4f6", color: "#4b5563", padding: "2px 8px", borderRadius: "4px" }}>제외됨</span>;
      case "config_error":
        return <span style={{ fontSize: "11px", fontWeight: 600, backgroundColor: "#fef2f2", color: "#b91c1c", padding: "2px 8px", borderRadius: "4px" }}>설정오류</span>;
      case "queued":
      default:
        return <span style={{ fontSize: "11px", fontWeight: 600, backgroundColor: "#f9fafb", color: "#6b7280", padding: "2px 8px", borderRadius: "4px" }}>대기중</span>;
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "480px",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "20px",
          boxSizing: "border-box",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #f3f4f6", paddingBottom: "10px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              {getStatusBadge(submission.status)}
              <span style={{ fontSize: "11px", color: "#9ca3af" }}>{submission.submissionId}</span>
            </div>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111111", margin: 0 }}>
              {submission.input.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "none", fontSize: "18px", color: "#9ca3af", cursor: "pointer", padding: "4px" }}
          >
            ✕
          </button>
        </div>

        {/* 상세 메타 정보 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11.5px", color: "#4b5563", backgroundColor: "#f9fafb", padding: "10px", borderRadius: "6px" }}>
          <div><strong>워크플로우 Key:</strong> {submission.workflowKey}</div>
          <div><strong>자동화 ID:</strong> {submission.automationId.slice(0, 18)}...</div>
          <div><strong>요청 시각:</strong> {new Date(submission.createdAt).toLocaleString()}</div>
          <div><strong>완료 시각:</strong> {submission.completedAt ? new Date(submission.completedAt).toLocaleString() : "-"}</div>
          <div style={{ gridColumn: "span 2", borderTop: "1px solid #e5e7eb", paddingTop: "6px", marginTop: "2px" }}>
            <strong>보관 정책:</strong> {" "}
            {(() => {
              const lvl = submission.retentionPolicySnapshot?.level || "full_archive";
              if (lvl === "notify_only") return <span style={{ color: "#d97706", fontWeight: 600 }}>알림/로그형 (notify_only)</span>;
              if (lvl === "processed_result") return <span style={{ color: "#2563eb", fontWeight: 600 }}>가공지식 저장형 (processed_result)</span>;
              return <span style={{ color: "#0d9488", fontWeight: 600 }}>원본 포함 지식보관형 (full_archive)</span>;
            })()}
          </div>
        </div>

        {/* 1. 에러 내역 (실패 시) */}
        {(submission.status === "failed" || submission.status === "config_error") && submission.error && (
          <div style={{ backgroundColor: "#fef2f2", borderLeft: "4px solid #ef4444", padding: "10px", borderRadius: "4px" }}>
            <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#991b1b", margin: "0 0 4px 0" }}>
              ⚠️ 에러 발생 상세 ({submission.error.code || "UNKNOWN_ERROR"})
            </h4>
            <p style={{ fontSize: "11.5px", color: "#b91c1c", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
              {submission.error.message || "상세 에러 내용이 없습니다."}
            </p>
          </div>
        )}

        {/* 2. 첨부파일 목록 (originalFileRefs) */}
        {submission.originalFileRefs && submission.originalFileRefs.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#374151", margin: 0 }}>📎 첨부한 원본 파일</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {submission.originalFileRefs.map((ref, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 10px",
                    backgroundColor: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                >
                  <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", color: "#111111", flex: 1, marginRight: "8px" }}>
                    {ref.fileName}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDownload("original", idx, ref.fileName)}
                    disabled={downloadingIndex !== null}
                    style={{
                      height: "26px",
                      padding: "0 8px",
                      fontSize: "11px",
                      backgroundColor: "#ffffff",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      cursor: downloadingIndex !== null ? "not-allowed" : "pointer",
                      color: "#374151",
                      fontWeight: 600,
                    }}
                  >
                    {downloadingIndex?.type === "original" && downloadingIndex?.idx === idx ? "다운 중..." : "📥 다운로드"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. 분석 결과 요약 (processorResult) */}
        {submission.status === "success" && submission.processorResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: 0 }} />
            
            {/* 제목 및 요약 */}
            <div>
              <h4 style={{ fontSize: "12.5px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
                📝 {submission.processorResult.title || "분석 완료"}
              </h4>
              {submission.processorResult.summary && (
                <p style={{ fontSize: "12px", color: "#4b5563", margin: 0, lineHeight: 1.4 }}>
                  {submission.processorResult.summary}
                </p>
              )}
            </div>

            {/* 마크다운 본문 */}
            {submission.processorResult.mdContent && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280" }}>상세 리포트 본문:</span>
                <div
                  style={{
                    backgroundColor: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    padding: "10px",
                    fontSize: "12px",
                    color: "#1f2937",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    maxHeight: "180px",
                    overflowY: "auto",
                    fontFamily: "monospace",
                  }}
                >
                  {submission.processorResult.mdContent}
                </div>
              </div>
            )}

            {/* 구조화 데이터 */}
            {submission.processorResult.structuredData && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280" }}>추출 구조화 데이터:</span>
                <pre
                  style={{
                    backgroundColor: "#f3f4f6",
                    borderRadius: "6px",
                    padding: "8px",
                    fontSize: "11px",
                    color: "#111827",
                    margin: 0,
                    maxHeight: "120px",
                    overflowY: "auto",
                    fontFamily: "monospace",
                  }}
                >
                  {JSON.stringify(submission.processorResult.structuredData, null, 2)}
                </pre>
              </div>
            )}

            {/* 키워드 */}
            {submission.processorResult.keywords && submission.processorResult.keywords.length > 0 && (
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", marginRight: "4px" }}>키워드:</span>
                {submission.processorResult.keywords.map((kw, i) => (
                  <span key={i} style={{ fontSize: "10.5px", backgroundColor: "#f3f4f6", color: "#374151", padding: "1px 6px", borderRadius: "4px" }}>
                    #{kw}
                  </span>
                ))}
              </div>
            )}

            {/* 경고 사항 */}
            {submission.processorResult.warnings && submission.processorResult.warnings.length > 0 && (
              <div style={{ backgroundColor: "#fffbeb", borderLeft: "4px solid #f59e0b", padding: "8px 10px", borderRadius: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#b45309", display: "block", marginBottom: "2px" }}>⚠️ 분석 경고 사항:</span>
                <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11px", color: "#78350f", lineHeight: 1.4 }}>
                  {submission.processorResult.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 4. 결과 파일 목록 (resultRefs) */}
        {submission.resultRefs && submission.resultRefs.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#374151", margin: 0 }}>📂 생성된 결과 파일</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {submission.resultRefs.map((ref, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 10px",
                    backgroundColor: "#e6fffa",
                    border: "1px solid #b2f5ea",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                >
                  <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", color: "#006d5b", flex: 1, marginRight: "8px" }}>
                    {ref.fileName}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDownload("result", idx, ref.fileName)}
                    disabled={downloadingIndex !== null}
                    style={{
                      height: "26px",
                      padding: "0 8px",
                      fontSize: "11px",
                      backgroundColor: "#ffffff",
                      border: "1px solid #81e6d9",
                      borderRadius: "4px",
                      cursor: downloadingIndex !== null ? "not-allowed" : "pointer",
                      color: "#006d5b",
                      fontWeight: 600,
                    }}
                  >
                    {downloadingIndex?.type === "result" && downloadingIndex?.idx === idx ? "다운 중..." : "📥 결과 다운"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 하단 닫기 */}
        <button
          type="button"
          onClick={onClose}
          style={{
            height: "36px",
            backgroundColor: "#f3f4f6",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "12.5px",
            fontWeight: 600,
            color: "#374151",
            cursor: "pointer",
            marginTop: "4px",
          }}
        >
          창 닫기
        </button>
      </div>
    </div>
  );
}
