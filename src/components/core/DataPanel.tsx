// 이 파일은 PC 사용자용 화면의 좌측에 노출되는 데이터 분석활용 진입용 사이드 패널 컴포넌트입니다.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface DataPanelProps {
  className?: string;
}

type UserSidebarTab = "navigation" | "data";

export function DataPanel({ className = "" }: DataPanelProps) {
  const pathname = usePathname();

  const dataItems = [
    { label: "통자요", path: "/user/data/tongjayo", icon: "📞" },
    { label: "회의록", path: "/user/data/meeting-note", icon: "📝" },
    { label: "아이디어 캐치", path: "/user/data/idea-catch", icon: "💡" },
    { label: "업무위키", path: "/user/data/work-wiki", icon: "📖" },
  ];

  // ux_user_sidebar 클래스가 적용된 경우, 다크 테마이므로 개별 inline style을 타지 않거나 최소화합니다.
  const isDarkSidebar = className.includes("ux_user_sidebar");

  const mainItems = [
    { label: "홈", path: "/user", icon: "🏠" },
    { label: "실행", path: "/user/execute", icon: "🚀" },
    { label: "결과", path: "/user/results", icon: "📊" },
    { label: "내정보", path: "/user/profile", icon: "👤" },
  ];

  const knowledgeItems = [
    { label: "통합 자료검색", path: "/user/data/search", icon: "🔍", enabled: true },
    { label: "AI 지식검색", path: "/user/data/ai-search", icon: "🧠", enabled: true },
    { label: "AI 업무비서", path: "#", icon: "🤖 (준비중)", enabled: false },
  ];

  // 초기 탭 판정 로직: 현재 pathname이 dataItems 중 하나의 path로 시작하면 "data" 탭을 기본값으로 활성화
  const isDataPath = dataItems.some((item) => pathname.startsWith(item.path));
  const [activeTab, setActiveTab] = useState<UserSidebarTab>(isDataPath ? "data" : "navigation");

  // 페이지 이동 시 pathname 변화에 맞춰 탭 상태를 자동 동기화
  useEffect(() => {
    if (isDarkSidebar) {
      if (isDataPath) {
        setActiveTab("data");
      } else {
        setActiveTab("navigation");
      }
    }
  }, [pathname, isDataPath, isDarkSidebar]);

  return (
    <aside
      className={`ux_data_panel ${className}`.trim()}
      style={
        isDarkSidebar
          ? undefined
          : {
              width: "240px",
              backgroundColor: "#ffffff",
              borderRight: "1px solid #e5e7eb",
              padding: "16px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              boxSizing: "border-box",
              height: "100%",
            }
      }
    >
      <div>
        {/* 다크 사이드바 오퍼레이터 스타일 로고 영역 */}
        {isDarkSidebar && (
          <div style={{ padding: "0 8px 20px 8px", borderBottom: "1px solid var(--ux-user-sidebar-border)", marginBottom: "20px" }}>
            <h1 style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff", margin: 0 }}>
              N8Lient Client
            </h1>
            <p style={{ fontSize: "11px", color: "var(--ux-user-sidebar-muted)", margin: "4px 0 0 0" }}>
              일반 사용자 대시보드
            </p>
          </div>
        )}

        {/* 다크 사이드바 전용 탭 전환 버튼 UI */}
        {isDarkSidebar && (
          <div className="ux_user_sidebar_tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "navigation"}
              className={activeTab === "navigation" ? "ux_user_sidebar_tab_active" : "ux_user_sidebar_tab"}
              onClick={() => setActiveTab("navigation")}
            >
              네비게이션
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "data"}
              className={activeTab === "data" ? "ux_user_sidebar_tab_active" : "ux_user_sidebar_tab"}
              onClick={() => setActiveTab("data")}
            >
              데이터 분석활용
            </button>
          </div>
        )}

        {/* 탭 상태에 맞춰 각 메뉴 그룹을 조건부(배타적) 렌더링 */}
        {isDarkSidebar ? (
          <div>
            {activeTab === "navigation" && (
              <nav className="ux_user_sidebar_menu" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  {mainItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={`ux_user_sidebar_link ${isActive ? "ux_user_sidebar_link_active" : ""}`}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>

                <div style={{ borderTop: "1px solid var(--ux-user-sidebar-border)", paddingTop: "12px" }}>
                  <h3 style={{ fontSize: "11px", fontWeight: 600, color: "var(--ux-user-sidebar-muted)", paddingLeft: "8px", marginBottom: "8px", textTransform: "uppercase" }}>
                    지식 활용
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    {knowledgeItems.map((item) => {
                      const isActive = pathname === item.path;
                      if (!item.enabled) {
                        return (
                          <div
                            key={item.label}
                            className="ux_user_sidebar_link"
                            style={{ opacity: 0.4, cursor: "not-allowed", display: "flex", gap: "8px", alignItems: "center" }}
                          >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                          </div>
                        );
                      }
                      return (
                        <Link
                          key={item.path}
                          href={item.path}
                          className={`ux_user_sidebar_link ${isActive ? "ux_user_sidebar_link_active" : ""}`}
                        >
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </nav>
            )}

            {activeTab === "data" && (
              <nav className="ux_user_sidebar_menu">
                {dataItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`ux_user_sidebar_link ${isActive ? "ux_user_sidebar_link_active" : ""}`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
        ) : (
          /* 공용 UI 기본 레이아웃 및 폼 (기존 일반 사이드바 구조 무영향 보존) */
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <h2
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "8px",
                  paddingLeft: "4px",
                }}
              >
                지식 활용
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {knowledgeItems.map((item) => {
                  const isActive = pathname === item.path;
                  if (!item.enabled) {
                    return (
                      <div
                        key={item.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 10px",
                          fontSize: "13px",
                          color: "#9ca3af",
                          cursor: "not-allowed",
                        }}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        fontSize: "13px",
                        textDecoration: "none",
                        color: isActive ? "#111111" : "#4b5563",
                        backgroundColor: isActive ? "#f3f4f6" : "transparent",
                        fontWeight: isActive ? 600 : 400,
                        transition: "background-color 0.15s ease",
                      }}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div>
              <h2
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "8px",
                  paddingLeft: "4px",
                }}
              >
                데이터 분석활용
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {dataItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        fontSize: "13px",
                        textDecoration: "none",
                        color: isActive ? "#111111" : "#4b5563",
                        backgroundColor: isActive ? "#f3f4f6" : "transparent",
                        fontWeight: isActive ? 600 : 400,
                        transition: "background-color 0.15s ease",
                      }}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
