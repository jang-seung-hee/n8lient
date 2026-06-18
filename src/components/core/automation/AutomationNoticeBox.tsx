"use client";

// 사용자 실행 화면에서 회사 자동화 공지사항(noticeText)을 표시하는 컴팩트 안내 박스입니다.

import { useMemo, useState } from "react";

interface AutomationNoticeBoxProps {
  noticeText: string;
}

export default function AutomationNoticeBox({ noticeText }: AutomationNoticeBoxProps) {
  const [showModal, setShowModal] = useState(false);
  const trimmed = noticeText.trim();

  const needsFullView = useMemo(() => {
    if (!trimmed) return false;
    const lineCount = trimmed.split(/\r?\n/).length;
    return trimmed.length > 120 || lineCount > 3;
  }, [trimmed]);

  if (!trimmed) return null;

  return (
    <>
      <div
        role={needsFullView ? "button" : undefined}
        tabIndex={needsFullView ? 0 : undefined}
        onClick={needsFullView ? () => setShowModal(true) : undefined}
        onKeyDown={
          needsFullView
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setShowModal(true);
                }
              }
            : undefined
        }
        style={{
          backgroundColor: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: "8px",
          padding: "10px 12px",
          cursor: needsFullView ? "pointer" : "default",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#92400e" }}>📢 공지사항</span>
          {needsFullView && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(true);
              }}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                fontSize: "11px",
                fontWeight: 600,
                color: "#b45309",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              전체 보기
            </button>
          )}
        </div>
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            lineHeight: 1.55,
            color: "#78350f",
            whiteSpace: "pre-wrap",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {trimmed}
        </p>
      </div>

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
            boxSizing: "border-box",
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              border: "1px solid #e5e7eb",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #f3f4f6",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#fffbeb",
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#92400e", margin: 0 }}>공지사항</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  color: "#9ca3af",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
                aria-label="닫기"
              >
                ×
              </button>
            </div>
            <div
              style={{
                padding: "16px 20px",
                fontSize: "14px",
                lineHeight: 1.7,
                color: "#374151",
                whiteSpace: "pre-wrap",
                maxHeight: "60vh",
                overflowY: "auto",
              }}
            >
              {trimmed}
            </div>
            <div style={{ padding: "12px 20px 16px", borderTop: "1px solid #f3f4f6", textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  height: "36px",
                  padding: "0 16px",
                  backgroundColor: "#111111",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
