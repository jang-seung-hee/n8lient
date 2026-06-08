// 이 파일은 회사 가입 승인 요청 후 승인 대기 상태(pending)일 때 사용자에게 안내 화면을 보여주는 컴포넌트입니다.

"use client";

import { useAuthUser } from "@/features/auth/useAuthUser";
import { LogoutButton } from "@/features/auth/LogoutButton";
import { siteConfig } from "@/config/siteConfig";

export function PendingApproval() {
  const { userDoc } = useAuthUser();

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "360px",
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "20px 16px",
        textAlign: "center",
        boxShadow: "none",
      }}
    >
      {/* 승인 대기 아이콘 또는 배지 */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          backgroundColor: "#fef3c7",
          color: "#d97706",
          fontSize: "20px",
          marginBottom: "16px",
        }}
        aria-hidden="true"
      >
        ⌛
      </div>

      <h2
        style={{
          fontSize: "16px",
          fontWeight: 600,
          color: "#111111",
          marginBottom: "8px",
        }}
      >
        승인 대기 중
      </h2>
      
      <p
        style={{
          fontSize: "13px",
          color: "#374151",
          lineHeight: 1.45,
          marginBottom: "16px",
        }}
      >
        {siteConfig.messages.pendingApproval}
      </p>

      {/* 보조 정보 표시 */}
      {userDoc && userDoc.clientId && (
        <div
          style={{
            backgroundColor: "#f9fafb",
            borderRadius: "6px",
            padding: "10px",
            fontSize: "12px",
            color: "#6b7280",
            textAlign: "left",
            border: "1px solid #f3f4f6",
            marginBottom: "20px",
            lineHeight: 1.4,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span>요청 회사 ID:</span>
            <span style={{ fontWeight: 500, color: "#111111" }}>{userDoc.clientId}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>요청 상태:</span>
            <span style={{ fontWeight: 500, color: "#d97706" }}>승인 대기 (Pending)</span>
          </div>
        </div>
      )}

      {/* 구분선 */}
      <div
        style={{
          width: "100%",
          height: "1px",
          backgroundColor: "#f3f4f6",
          marginBottom: "16px",
        }}
      />

      {/* 로그아웃 버튼 */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <LogoutButton />
      </div>
    </div>
  );
}
