// 이 파일은 시스템 총괄 운영자 콘솔의 좌측 네비게이션용 사이드바 컴포넌트입니다.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface OperatorSidebarProps {
  fullWidth?: boolean;
  onNavigate?: () => void;
}

export function OperatorSidebar({ fullWidth = false, onNavigate }: OperatorSidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    { label: "고객사 마스터", path: "/operator/clients", icon: "🏭" },
    { label: "N8N 워크플로우 마스터", path: "/operator/workflow-templates", icon: "📋" },
    { label: "N8N 워크플로우 매핑", path: "/operator/contracts", icon: "🤝" },
    { label: "시스템 로그", path: "/operator/logs", icon: "📂" },
    { label: "콘솔 홈", path: "/operator", icon: "🏢" },
  ];

  return (
    <aside
      style={{
        width: fullWidth ? "100%" : "var(--ux-admin-sidebar-width)",
        backgroundColor: "#111827",
        color: "#f3f4f6",
        padding: "20px 12px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        minHeight: fullWidth ? "100%" : undefined,
        boxSizing: "border-box",
      }}
    >
      <div>
        {/* 콘솔명 */}
        <div style={{ padding: "0 8px 20px 8px", borderBottom: "1px solid #1f2937", marginBottom: "20px" }}>
          <h1 style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff", margin: 0 }}>
            N8Lient Operator
          </h1>
          <p style={{ fontSize: "11px", color: "#9ca3af", margin: "4px 0 0 0" }}>
            시스템 총괄 마스터 콘솔
          </p>
        </div>

        {/* 메뉴 리스트 */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => onNavigate?.()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  textDecoration: "none",
                  color: isActive ? "#ffffff" : "#d1d5db",
                  backgroundColor: isActive ? "#1f2937" : "transparent",
                  fontWeight: isActive ? 600 : 400,
                  transition: "all 0.15s ease",
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 하단 유틸리티 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid #1f2937", paddingTop: "16px" }}>
        <Link
          href="/"
          onClick={() => onNavigate?.()}
          style={{
            fontSize: "12px",
            color: "#9ca3af",
            textDecoration: "none",
            padding: "6px 8px",
            borderRadius: "4px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>⬅️</span>
          <span>사용자 화면 이동</span>
        </Link>
      </div>
    </aside>
  );
}
