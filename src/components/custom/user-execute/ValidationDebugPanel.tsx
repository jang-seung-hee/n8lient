"use client";

import React from "react";

interface ValidationDebugPanelProps {
  isDebugMode: boolean;
  validationDebug: {
    missingFields?: string[];
    issues?: { field: string; code: string; message: string }[];
    received?: {
      hasAutomationId?: boolean;
      hasTitle?: boolean;
      hasText?: boolean;
      fileCount?: number;
      providedInputTypes?: string[];
    };
    hasAutomationId?: boolean;
    hasTitle?: boolean;
    inputType?: string;
    hasFile?: boolean;
    source?: string;
    requestId?: string;
  } | null;
}

/**
 * N8N 실행 요청의 누락 필드, 입력 스키마 매핑 매칭, 에러 단계 등의 
 * 개발자 디버그 정보를 렌더링하는 토글 패널 컴포넌트입니다.
 */
export default function ValidationDebugPanel({
  isDebugMode,
  validationDebug,
}: ValidationDebugPanelProps) {
  if (!isDebugMode || !validationDebug) {
    return null;
  }

  const issues = validationDebug.issues || [];
  const received = validationDebug.received;

  return (
    <div
      className="ux_info_box"
      style={{
        marginTop: "16px",
        padding: "10px",
        borderRadius: "6px",
        fontSize: "12px",
        color: "#374151",
        backgroundColor: "#f3f4f6",
      }}
    >
      <details>
        <summary style={{ cursor: "pointer", fontWeight: 600, outline: "none" }}>
          🔍 개발자 디버그 정보 (클릭하여 열기)
        </summary>
        <div
          style={{
            marginTop: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            fontFamily: "monospace",
          }}
        >
          <div>누락 필드: {validationDebug.missingFields?.join(", ") || "(없음)"}</div>
          {issues.length > 0 && (
            <div style={{ marginTop: "4px" }}>
              <div style={{ fontWeight: 600, marginBottom: "2px" }}>검증 이슈:</div>
              {issues.map((issue, idx) => (
                <div key={idx} style={{ marginLeft: "8px" }}>
                  [{issue.code}] {issue.field}: {issue.message}
                </div>
              ))}
            </div>
          )}
          {received ? (
            <>
              <div>자동화 ID 존재 여부: {String(received.hasAutomationId ?? "")}</div>
              <div>제목 존재 여부: {String(received.hasTitle ?? "")}</div>
              <div>본문 존재 여부: {String(received.hasText ?? "")}</div>
              <div>첨부 파일 개수: {received.fileCount ?? 0}</div>
              <div>인식된 입력 타입: {received.providedInputTypes?.join(", ") || "없음"}</div>
            </>
          ) : (
            <>
              <div>자동화 ID 존재 여부: {String(validationDebug.hasAutomationId ?? "")}</div>
              <div>제목 존재 여부: {String(validationDebug.hasTitle ?? "")}</div>
              <div>입력 유형: {validationDebug.inputType || ""}</div>
              <div>파일 첨부 여부: {validationDebug.hasFile ? "있음" : "없음"}</div>
            </>
          )}
          {validationDebug.source && <div>요청 단계: {validationDebug.source}</div>}
          {validationDebug.requestId && <div>요청 ID: {validationDebug.requestId}</div>}
        </div>
      </details>
    </div>
  );
}
