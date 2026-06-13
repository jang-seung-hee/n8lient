"use client";

import React from "react";

interface OwnerAdminMappingFormProps {
  adminEmail: string;
  onChangeAdminEmail: (email: string) => void;
  adminLookupStatus: "idle" | "loading" | "found" | "notfound" | "error";
  ownerAdminUid: string;
  adminDisplayName: string;
  handleAdminLookup: () => Promise<void>;
  handleAdminClear: () => void;
  isEditMode: boolean;
}

export function OwnerAdminMappingForm({
  adminEmail,
  onChangeAdminEmail,
  adminLookupStatus,
  ownerAdminUid,
  adminDisplayName,
  handleAdminLookup,
  handleAdminClear,
  isEditMode,
}: OwnerAdminMappingFormProps) {
  // 관리자 매핑 안내 메시지 렌더링
  const renderAdminLookupFeedback = () => {
    if (adminLookupStatus === "loading") {
      return (
        <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0 0" }}>
          🔍 사용자를 조회 중...
        </p>
      );
    }
    if (adminLookupStatus === "found") {
      return (
        <p style={{ fontSize: "12px", color: "#065f46", margin: "4px 0 0 0", fontWeight: 600 }}>
          ✅ 관리자 매핑 완료: {adminDisplayName} ({ownerAdminUid.slice(0, 8)}...)
        </p>
      );
    }
    if (adminLookupStatus === "notfound") {
      return (
        <p style={{ fontSize: "12px", color: "#b91c1c", margin: "4px 0 0 0" }}>
          ⚠️ 아직 가입되지 않은 사용자입니다. 먼저 Google 로그인 후 다시 등록해 주세요.
        </p>
      );
    }
    if (adminLookupStatus === "error") {
      return (
        <p style={{ fontSize: "12px", color: "#b91c1c", margin: "4px 0 0 0" }}>
          ⚠️ 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      );
    }
    return null;
  };

  return (
    <>
      {/* 관리자 이메일 조회 섹션 */}
      <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "4px 0" }} />
      <h4 style={{ fontSize: "12.5px", fontWeight: 700, color: "#374151", margin: 0 }}>👤 소유자 관리자 매핑</h4>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>관리자 이메일 (이메일로 자동 조회)</label>
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
          <input
            type="email"
            value={adminEmail}
            onChange={(e) => onChangeAdminEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdminLookup();
              }
            }}
            placeholder="관리자 이메일 입력 후 조회 버튼 클릭"
            style={{
              flex: 1,
              height: "36px",
              border: `1px solid ${
                adminLookupStatus === "found"
                  ? "#6ee7b7"
                  : adminLookupStatus === "notfound" || adminLookupStatus === "error"
                  ? "#fca5a5"
                  : "#d1d5db"
              }`,
              borderRadius: "6px",
              padding: "0 8px",
              fontSize: "13px",
              outline: "none",
              color: "#111111",
            }}
          />
          <button
            type="button"
            onClick={handleAdminLookup}
            disabled={!adminEmail.trim() || adminLookupStatus === "loading"}
            style={{
              height: "36px",
              backgroundColor: adminLookupStatus === "loading" ? "#6b7280" : "#1d4ed8",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              padding: "0 14px",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: !adminEmail.trim() || adminLookupStatus === "loading" ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {adminLookupStatus === "loading" ? "조회 중..." : "🔍 조회"}
          </button>
          {(adminLookupStatus === "found" || ownerAdminUid) && (
            <button
              type="button"
              onClick={handleAdminClear}
              style={{
                height: "36px",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                padding: "0 10px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              초기화
            </button>
          )}
        </div>
        {renderAdminLookupFeedback()}
        {isEditMode && !adminLookupStatus.startsWith("found") && ownerAdminUid && (
          <p style={{ fontSize: "11.5px", color: "#6b7280", margin: "2px 0 0 0" }}>
            💡 현재 등록된 관리자 UID: <span style={{ fontFamily: "monospace" }}>{ownerAdminUid.slice(0, 12)}...</span> (변경하려면 이메일 조회 후 적용)
          </p>
        )}
      </div>
    </>
  );
}
