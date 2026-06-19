// 이 파일은 시스템 마스터 운영자(operator) 전용 콘솔의 레이아웃을 제공합니다.
// PC에서는 좌측 sidebar 고정, 1024px 미만에서는 drawer로 전환합니다.

"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { OperatorSidebar } from "@/components/core/OperatorSidebar";
import { SidebarDrawer } from "@/components/core/layout/SidebarDrawer";
import { LogoutButton } from "@/features/auth/LogoutButton";
import { siteConfig } from "@/config/siteConfig";

interface OperatorLayoutProps {
  children: ReactNode;
}

export default function OperatorLayout({ children }: OperatorLayoutProps) {
  const { user, userDoc, loading } = useAuthUser();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  // 운영자 권한 체크 및 접근 제한
  useEffect(() => {
    if (!loading) {
      if (!user || userDoc?.approvalStatus !== "approved" || userDoc?.role !== "operator") {
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

  if (!user || userDoc?.approvalStatus !== "approved" || userDoc?.role !== "operator") {
    return null;
  }

  return (
    <div className="ux_responsive_admin_shell" style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      {/* PC 전용 sidebar */}
      <div className="ux_sidebar_desktop">
        <OperatorSidebar />
      </div>

      {/* 본문 영역 */}
      <div className="ux_admin_main_column">
        <header className="ux_admin_console_header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            <button
              type="button"
              className="ux_admin_menu_button"
              aria-label="메뉴 열기"
              onClick={() => setIsSidebarOpen(true)}
            >
              ☰
            </button>
            <span
              style={{
                fontSize: "12px",
                backgroundColor: "#111827",
                color: "#ffffff",
                padding: "2px 6px",
                borderRadius: "4px",
                fontWeight: 600,
              }}
            >
              Master Console
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
            <span style={{ fontSize: "12px", color: "#4b5563", fontWeight: 500 }}>
              {userDoc.displayName} (총괄운영자)
            </span>
            <LogoutButton />
          </div>
        </header>

        <SidebarDrawer isOpen={isSidebarOpen} onClose={closeSidebar}>
          <OperatorSidebar fullWidth onNavigate={closeSidebar} />
        </SidebarDrawer>

        <main
          className="ux_page_shell"
          style={{ flex: 1, boxSizing: "border-box", overflowY: "auto", minWidth: 0 }}
        >
          <div className="ux_content_body">{children}</div>
        </main>
      </div>
    </div>
  );
}
