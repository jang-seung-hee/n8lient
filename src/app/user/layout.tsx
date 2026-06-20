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
    <div className="ux_user_shell">
      {/* PC 전용 좌측 패널 프레임 */}
      <aside className="ux_user_sidebar_frame">
        <DataPanel className="ux_user_sidebar" />
      </aside>

      {/* 우측 본문 프레임 */}
      <section className="ux_user_right_frame">
        {/* 상단바 */}
        <header className="ux_user_topbar">
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

        {/* 본문 영역 */}
        <main className="ux_user_content_frame ux_page_shell">
          <div className="ux_content_body">{children}</div>
        </main>
      </section>

      {/* 모바일/PC 공통 하단 내비게이션 바 (CSS를 통해 PC에서는 숨겨집니다) */}
      <BottomNav />
    </div>
  );
}
