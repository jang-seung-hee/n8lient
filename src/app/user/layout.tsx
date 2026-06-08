// 이 파일은 승인 완료된 사용자(user) 전용 화면의 반응형 레이아웃을 제공합니다.
// 모바일에서는 바텀 네비게이션이, PC에서는 좌측 데이터 분석 패널과 하단 메뉴가 동시에 표시됩니다.

"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { BottomNav } from "@/components/core/BottomNav";
import { DataPanel } from "@/components/core/DataPanel";
import { LogoutButton } from "@/features/auth/LogoutButton";
import { siteConfig } from "@/config/siteConfig";

interface UserLayoutProps {
  children: ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const { user, userDoc, loading } = useAuthUser();
  const router = useRouter();

  // 로그인 상태 및 승인 상태 체크 (미승인자 차단)
  useEffect(() => {
    if (!loading) {
      if (!user || userDoc?.approvalStatus !== "approved") {
        router.replace("/");
      }
    }
  }, [user, userDoc, loading, router]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#f8f9fa",
        }}
      >
        <p style={{ color: "#6b7280", fontSize: "14px" }}>{siteConfig.messages.loading}</p>
      </div>
    );
  }

  // 승인된 사용자만 렌더링
  if (!user || userDoc?.approvalStatus !== "approved") {
    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* 상단바 */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          height: "52px",
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
          position: "sticky",
          top: 0,
          zIndex: 90,
          boxSizing: "border-box",
        }}
      >
        <span style={{ fontSize: "16px", fontWeight: 700, color: "#111111" }}>
          {siteConfig.name}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>
            {userDoc.displayName} ({userDoc.department || "소속 없음"})
          </span>
          <LogoutButton />
        </div>
      </header>

      {/* 반응형 본문 레이아웃 */}
      <div className="user-layout-container">
        {/* PC 전용 좌측 패널 */}
        <div className="user-aside-panel">
          <DataPanel />
        </div>

        {/* 본문 영역 */}
        <main className="user-main-content">{children}</main>
      </div>

      {/* 모바일/PC 공통 하단 내비게이션 바 */}
      <BottomNav />
    </div>
  );
}
