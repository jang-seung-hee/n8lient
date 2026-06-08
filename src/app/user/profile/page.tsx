// 이 파일은 사용자의 프로필 정보 및 권한 상태 등을 보여주는 내 정보 페이지입니다.

"use client";

import Image from "next/image";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { LogoutButton } from "@/features/auth/LogoutButton";
import { siteConfig } from "@/config/siteConfig";

export default function UserProfile() {
  const { user, userDoc } = useAuthUser();

  if (!user || !userDoc) return null;

  return (
    <div style={{ padding: "12px", boxSizing: "border-box", maxWidth: "480px", margin: "0 auto" }}>
      <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#111111", marginBottom: "16px" }}>
        👤 내 정보
      </h2>

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          alignItems: "center",
        }}
      >
        {/* 아바타 */}
        {user.photoURL ? (
          <Image
            src={user.photoURL}
            alt={user.displayName ?? "프로필 이미지"}
            width={64}
            height={64}
            style={{ borderRadius: "50%", border: "1px solid #e5e7eb" }}
          />
        ) : (
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "#e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              color: "#6b7280",
            }}
          >
            {user.displayName?.charAt(0) ?? "?"}
          </div>
        )}

        {/* 기본 이름 및 이메일 */}
        <div style={{ textAlign: "center" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#111111", margin: "0 0 4px 0" }}>
            {user.displayName || "이름 없음"}
          </h3>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>{user.email}</p>
        </div>

        {/* 구분선 */}
        <div style={{ width: "100%", height: "1px", backgroundColor: "#f3f4f6" }} />

        {/* 세부 메타데이터 리스트 */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#6b7280" }}>소속 회사 ID</span>
            <span style={{ fontWeight: 500, color: "#111111" }}>{userDoc.clientId || "없음"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#6b7280" }}>시스템 역할 (Role)</span>
            <span style={{ fontWeight: 500, color: "#111111" }}>
              {userDoc.role === "operator"
                ? "운영자 (Operator)"
                : userDoc.role === "company_admin"
                ? "회사 관리자 (Admin)"
                : "일반 사용자 (User)"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#6b7280" }}>가입 승인 상태</span>
            <span
              style={{
                fontWeight: 600,
                color: userDoc.approvalStatus === "approved" ? "#10b981" : "#d97706",
              }}
            >
              {userDoc.approvalStatus === "approved" ? "승인 완료" : userDoc.approvalStatus}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#6b7280" }}>계정 생성 일시</span>
            <span style={{ color: "#4b5563" }}>
              {userDoc.createdAt ? new Date(userDoc.createdAt).toLocaleDateString() : "-"}
            </span>
          </div>
        </div>

        {/* 구분선 */}
        <div style={{ width: "100%", height: "1px", backgroundColor: "#f3f4f6" }} />

        {/* 로그아웃 */}
        <LogoutButton />
      </div>
    </div>
  );
}
