// [ResultDataViewer.tsx]
// 이 파일은 Result Data Viewer의 핵심 본문 영역을 담당하며, 요약문, 태그, 마크다운 본문 렌더링,
// 액션 링크 및 파일 다운로드 단추를 사용자 편의적으로 제공하는 UI 컴포넌트입니다.
// 보안 규정: dangerouslySetInnerHTML를 지양하는 안전한 마크다운Subset 파서를 사용하고, 파일 다운로드 API를 연동합니다.
// 한국어 주석 표준을 준수합니다.

import React, { useState } from "react";
import type { SafeSubmissionViewDTO } from "./ResultDataViewerMeta";
import { downloadSubmissionFile } from "@/features/user/userService";
import { playAppSound } from "@/lib/appSound";
import { auth } from "@/lib/firebase";

interface ResultDataViewerProps {
  data: SafeSubmissionViewDTO;
}

// 안전한 마크다운 렌더러 (dangerouslySetInnerHTML를 지양하고 텍스트 토큰 파싱 기반으로 렌더링)
function SafeMarkdownRenderer({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");

  // 굵은 글씨 (**text**) 토큰 렌더링 유틸
  const renderBoldTokens = (lineText: string) => {
    const parts = lineText.split(/(\*\*.*?\*\*)/g);
    return (
      <>
        {parts.map((part, index) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={index} style={{ fontWeight: 700, color: "#111827" }}>{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
      </>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", lineHeight: 1.6, fontSize: "14px", color: "#374151" }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Headers
        if (trimmed.startsWith("### ")) {
          return <h5 key={idx} style={{ fontSize: "15px", fontWeight: 700, margin: "12px 0 4px 0", color: "#111827" }}>{trimmed.slice(4)}</h5>;
        }
        if (trimmed.startsWith("## ")) {
          return <h4 key={idx} style={{ fontSize: "16px", fontWeight: 700, margin: "16px 0 6px 0", color: "#111827" }}>{trimmed.slice(3)}</h4>;
        }
        if (trimmed.startsWith("# ")) {
          return <h3 key={idx} style={{ fontSize: "18px", fontWeight: 700, margin: "20px 0 8px 0", color: "#111827" }}>{trimmed.slice(2)}</h3>;
        }

        // List items
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={idx} style={{ display: "flex", gap: "6px", paddingLeft: "12px" }}>
              <span>•</span>
              <span>{renderBoldTokens(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Plain line
        return <p key={idx} style={{ margin: 0 }}>{renderBoldTokens(trimmed)}</p>;
      })}
    </div>
  );
}

export function ResultDataViewer({ data }: ResultDataViewerProps) {
  const [downloadingFileIndex, setDownloadingFileIndex] = useState<{ type: "original" | "result"; index: number } | null>(null);

  const handleDownload = async (refType: "original" | "result", index: number, fileName: string) => {
    playAppSound("click");
    setDownloadingFileIndex({ type: refType, index });
    try {
      await downloadSubmissionFile(auth, data.submissionId, refType, index, fileName);
      playAppSound("success");
    } catch (err) {
      console.error("[file-download-error]", err);
      alert("파일을 다운로드하는 도중 오류가 발생했습니다.");
      playAppSound("error");
    } finally {
      setDownloadingFileIndex(null);
    }
  };

  // 본문 콘텐츠 결정 (mdContent -> content -> summary 순서)
  const bodyContent = data.mdContent || data.content || data.summary;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 1. 요약 카드 (Summary) */}
      {data.summary && (
        <div className="ux_card" style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", padding: "16px 20px" }}>
          <h3 className="ux_section_title" style={{ fontSize: "14px", color: "#1e40af", display: "flex", alignItems: "center", gap: "6px", margin: "0 0 8px 0" }}>
            📝 한 줄 요약
          </h3>
          <p className="ux_body_text" style={{ margin: 0, color: "#1e3a8a", fontWeight: 500, lineHeight: 1.5 }}>
            {data.summary}
          </p>
        </div>
      )}

      {/* 2. 본문 영역 */}
      <div className="ux_card" style={{ padding: "24px 20px" }}>
        <h3 className="ux_section_title" style={{ fontSize: "15px", borderBottom: "1px solid #f3f4f6", paddingBottom: "10px", margin: "0 0 16px 0", color: "#111827" }}>
          📄 지식 본문
        </h3>
        
        {bodyContent ? (
          <SafeMarkdownRenderer text={bodyContent} />
        ) : (
          <div style={{ color: "#9ca3af", textAlign: "center", padding: "24px 0" }}>
            조회된 본문 데이터가 없습니다.
          </div>
        )}

        {/* 해시태그 목록 */}
        {data.hashtags && data.hashtags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "24px", borderTop: "1px solid #f3f4f6", paddingTop: "16px" }}>
            {data.hashtags.map((tag, idx) => (
              <span
                key={idx}
                className="ux_badge ux_badge_default"
                style={{
                  fontSize: "12px",
                  color: "#4b5563",
                  backgroundColor: "#f3f4f6",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontWeight: 500,
                  height: "auto",
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 3. 액션 링크 (Action Links) */}
      {data.actionLinks && data.actionLinks.length > 0 && (
        <div className="ux_card" style={{ padding: "16px 20px" }}>
          <h3 className="ux_section_title" style={{ fontSize: "14px", margin: "0 0 12px 0", color: "#111827" }}>
            🔗 관련 참고 링크
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {data.actionLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ux_button ux_button_secondary"
                style={{ textDecoration: "none", fontSize: "12.5px" }}
              >
                🔗 {link.label || "바로가기"}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 4. 첨부 파일 & 결과 리스트 (권한 검증된 다운로드 링크 제공) */}
      {((data.originalFiles && data.originalFiles.length > 0) || (data.resultFiles && data.resultFiles.length > 0)) && (
        <div className="ux_card" style={{ padding: "16px 20px" }}>
          <h3 className="ux_section_title" style={{ fontSize: "14px", margin: "0 0 12px 0", color: "#111827" }}>
            📁 첨부 파일 목록
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* 원본 업로드 파일 목록 */}
            {data.originalFiles && data.originalFiles.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280" }}>📥 입력 원본 파일</span>
                {data.originalFiles.map((file) => {
                  const isDownloading = downloadingFileIndex?.type === "original" && downloadingFileIndex?.index === file.index;
                  return (
                    <div
                      key={`orig-${file.index}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        backgroundColor: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    >
                      <span style={{ fontSize: "13px", color: "#374151", fontWeight: 500 }}>📄 {file.name}</span>
                      <button
                        onClick={() => handleDownload("original", file.index, file.name)}
                        disabled={isDownloading}
                        className="ux_button ux_button_secondary ux_button_compact"
                        style={{ fontSize: "12px" }}
                      >
                        {isDownloading ? "다운로드 중..." : "📥 다운로드"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 결과 생성 파일 목록 */}
            {data.resultFiles && data.resultFiles.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: data.originalFiles?.length ? "1px solid #f3f4f6" : "none", paddingTop: data.originalFiles?.length ? "12px" : "0" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280" }}>📤 가공 결과 파일</span>
                {data.resultFiles.map((file) => {
                  const isDownloading = downloadingFileIndex?.type === "result" && downloadingFileIndex?.index === file.index;
                  return (
                    <div
                      key={`res-${file.index}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        backgroundColor: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    >
                      <span style={{ fontSize: "13px", color: "#374151", fontWeight: 500 }}>📄 {file.name}</span>
                      {file.isDriveUrl && file.url ? (
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ux_button ux_button_secondary ux_button_compact"
                          style={{ textDecoration: "none", fontSize: "12px" }}
                        >
                          🔗 Drive 열기
                        </a>
                      ) : (
                        <button
                          onClick={() => handleDownload("result", file.index, file.name)}
                          disabled={isDownloading}
                          className="ux_button ux_button_secondary ux_button_compact"
                          style={{ fontSize: "12px" }}
                        >
                          {isDownloading ? "다운로드 중..." : "📥 다운로드"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
