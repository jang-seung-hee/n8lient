"use client";

// 사용자 실행 화면에서 회사 자동화 사용방법 안내(noticeText)을 표시하는 컴팩트 안내 박스입니다.

import { useEffect, useState, useRef } from "react";
import LinkifiedText from "@/components/core/LinkifiedText";


interface AutomationNoticeBoxProps {
  noticeText: string;
  workflowKey: string;
  userId?: string;
  updatedAt?: string;
}

export default function AutomationNoticeBox({
  noticeText,
  workflowKey,
  userId,
  updatedAt,
}: AutomationNoticeBoxProps) {
  const [showModal, setShowModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const trimmed = noticeText.trim();

  const noticeVersion = updatedAt || "default";
  const noticeDismissKey = `n8lient.notice.dismissed.${userId || "anonymous"}.${workflowKey}.${noticeVersion}`;

  // 동일한 워크플로우에 대해 사용자가 모달을 명시적으로 닫은 세션 내역을 추적하여
  // 렌더링 등으로 인해 모달이 무한 반복해서 자동 열림을 방지하는 Ref
  const autoOpenedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!trimmed || !workflowKey) return;

    // 이미 이번 세션에서 자동 오픈되었거나 닫은 경우 스킵
    if (autoOpenedRef.current[workflowKey]) return;

    const isDismissed = localStorage.getItem(noticeDismissKey) === "true";
    if (!isDismissed) {
      setShowModal(true);
      autoOpenedRef.current[workflowKey] = true;
    }
  }, [workflowKey, trimmed, noticeDismissKey]);

  // localStorage 상태 동기화
  useEffect(() => {
    if (showModal) {
      const isDismissed = localStorage.getItem(noticeDismissKey) === "true";
      setDontShowAgain(isDismissed);
    }
  }, [showModal, noticeDismissKey]);

  if (!trimmed) return null;

  const handleCloseModal = () => {
    if (dontShowAgain) {
      localStorage.setItem(noticeDismissKey, "true");
    } else {
      localStorage.removeItem(noticeDismissKey);
    }
    setShowModal(false);
  };

  const handleManualOpen = () => {
    setShowModal(true);
  };

  return (
    <>
      <div
        className="ux_alert ux_alert_warning"
        style={{
          padding: "10px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <span className="ux_card_title" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", margin: 0 }}>
          📢 사용방법 안내
        </span>
        <button
          type="button"
          onClick={handleManualOpen}
          className="ux_button_compact ux_button_secondary"
          style={{
            height: "28px",
            padding: "0 10px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          사용방법 안내 보기
        </button>
      </div>

      {showModal && (
        <div className="ux_modal_overlay" onClick={handleCloseModal} style={{ backdropFilter: "blur(4px)" }}>
          <div
            className="ux_modal_panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#ffffff",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              border: "1px solid #e5e7eb",
              overflow: "hidden",
              padding: 0,
            }}
          >
            <div
              className="ux_alert ux_alert_warning"
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #f3f4f6",
                borderRadius: 0,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>사용방법 안내</h3>
              <button
                type="button"
                onClick={handleCloseModal}
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
              <LinkifiedText text={trimmed} />

            </div>
            <div
              style={{
                padding: "12px 20px 16px",
                borderTop: "1px solid #f3f4f6",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", color: "#4b5563" }}>
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                다시 뜨지 않음
              </label>
              <button
                type="button"
                className="ux_button ux_button_primary"
                onClick={handleCloseModal}
                style={{ borderRadius: "6px", border: "none" }}
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

