"use client";

import React from "react";

interface UserPersonalSettingsFooterProps {
  saving: boolean;
  loading: boolean;
  onSave: () => void;
  onClose: () => void;
}

/**
 * 사용자 개인 설정 모달 하단의 닫기/취소 및 저장/적용 버튼 영역을 격리한 푸터 컴포넌트입니다.
 */
export default function UserPersonalSettingsFooter({
  saving,
  loading,
  onSave,
  onClose,
}: UserPersonalSettingsFooterProps) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderTop: "1px solid #f3f4f6",
        display: "flex",
        justifyContent: "flex-end",
        gap: "8px",
        backgroundColor: "#f9fafb",
        borderBottomLeftRadius: "8px",
        borderBottomRightRadius: "8px",
      }}
    >
      <button
        type="button"
        className="ux_button_compact ux_button_secondary"
        onClick={onClose}
        style={{
          height: "34px",
          padding: "0 12px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: 500,
        }}
      >
        취소
      </button>
      <button
        type="button"
        className="ux_button_compact ux_button_primary"
        onClick={onSave}
        disabled={saving || loading}
        style={{
          height: "34px",
          padding: "0 16px",
          borderRadius: "6px",
          fontSize: "12px",
          border: "none",
        }}
      >
        {saving ? "저장 중..." : "설정 저장"}
      </button>
    </div>
  );
}
