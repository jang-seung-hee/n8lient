// 이 파일은 회사 관리자(company_admin) 전용 콘솔의 레이아웃을 제공합니다.
// 좌측 사이드바 구조를 지니며, 모바일 환경에서도 가로 크기에 맞춰 유연하게 대처합니다.

"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { AdminSidebar } from "@/components/core/AdminSidebar";
import { LogoutButton } from "@/features/auth/LogoutButton";
import { siteConfig } from "@/config/siteConfig";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function CompanyAdminLayout({ children }: AdminLayoutProps) {
  const { user, userDoc, loading } = useAuthUser();
  const router = useRouter();

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
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      {/* 좌측 관리자 사이드바 */}
      <div style={{ height: "100vh", position: "sticky", top: 0 }}>
        <AdminSidebar />
      </div>

      {/* 본문 영역 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* 상단바 */}
        <header
          style={{
            height: "52px",
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", backgroundColor: "#3b82f6", color: "#ffffff", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
              {userDoc.clientId === "client_rentaltoktok_001" ? "렌탈톡톡" : userDoc.clientId}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "12px", color: "#4b5563", fontWeight: 500 }}>
              {userDoc.displayName} (관리자)
            </span>
            <LogoutButton />
          </div>
        </header>

        {/* 페이지 본문 */}
        <main style={{ flex: 1, padding: "24px", boxSizing: "border-box", overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
