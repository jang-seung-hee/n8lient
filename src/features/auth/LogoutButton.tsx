// 이 파일은 현재 로그인한 사용자를 로그아웃하는 버튼 컴포넌트입니다.

"use client";

import { useAuthUser } from "@/features/auth/useAuthUser";

/**
 * 로그아웃 버튼
 * UI 디자인 가이드 기준: Secondary Button 스타일 적용
 */
export function LogoutButton({ className }: { className?: string }) {
  const { signOut } = useAuthUser();

  return (
    <button
      id="btn-logout"
      onClick={signOut}
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        height: "36px",
        padding: "0 16px",
        backgroundColor: "#ffffff",
        color: "#111111",
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "background-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#f8f9fa";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "#ffffff";
      }}
      aria-label="로그아웃"
    >
      로그아웃
    </button>
  );
}
