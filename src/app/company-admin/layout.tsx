// 이 파일은 회사 관리자(company_admin) 전용 콘솔의 레이아웃을 제공합니다.
// PC에서는 좌측 sidebar 고정, 1024px 미만에서는 drawer로 전환합니다.

"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { AdminSidebar } from "@/components/core/AdminSidebar";
import { SidebarDrawer } from "@/components/core/layout/SidebarDrawer";
import { LogoutButton } from "@/features/auth/LogoutButton";
import { siteConfig } from "@/config/siteConfig";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function CompanyAdminLayout({ children }: AdminLayoutProps) {
  const { user, userDoc, loading } = useAuthUser();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  // 회사 관리자(또는 시스템 운영자) 권한 체크 및 접근 제한
  useEffect(() => {
    if (!loading) {
      if (
        !user ||
        userDoc?.approvalStatus !== "approved" ||
        (userDoc?.role !== "company_admin" && userDoc?.role !== "operator")
      ) {
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

  if (
    !user ||
    userDoc?.approvalStatus !== "approved" ||
    (userDoc?.role !== "company_admin" && userDoc?.role !== "operator")
  ) {
    return null;
  }

  return (
    <div className="ux_admin_app_shell">
      {/* PC 전용 sidebar */}
      <aside className="ux_admin_sidebar_frame">
        <AdminSidebar />
      </aside>

      {/* 본문 영역 */}
      <main className="ux_admin_main_scroll">
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
                backgroundColor: "#3b82f6",
                color: "#ffffff",
                padding: "2px 6px",
                borderRadius: "4px",
                fontWeight: 600,
              }}
            >
              {userDoc.clientId === "client_rentaltoktok_001" ? "렌탈톡톡" : userDoc.clientId}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
            <span style={{ fontSize: "12px", color: "#4b5563", fontWeight: 500 }}>
              {userDoc.displayName} (관리자)
            </span>
            <LogoutButton />
          </div>
        </header>

        <SidebarDrawer isOpen={isSidebarOpen} onClose={closeSidebar}>
          <AdminSidebar fullWidth onNavigate={closeSidebar} />
        </SidebarDrawer>

        <div className="ux_page_shell">
          <div className="ux_content_body">{children}</div>
        </div>
      </main>
    </div>
  );
}
