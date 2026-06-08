// 이 파일은 사용자 화면 하단에 상시 고정되는 4버튼 바텀 내비게이션 바 컴포넌트입니다.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();

  const menuItems = [
    { label: "홈", path: "/user", icon: "🏠" },
    { label: "실행", path: "/user/execute", icon: "🚀" },
    { label: "결과", path: "/user/results", icon: "📊" },
    { label: "내정보", path: "/user/profile", icon: "👤" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "56px",
        backgroundColor: "#ffffff",
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        zIndex: 100,
        boxSizing: "border-box",
      }}
    >
      {menuItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link
            key={item.path}
            href={item.path}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              height: "100%",
              textDecoration: "none",
              color: isActive ? "#111111" : "#6b7280",
              gap: "2px",
            }}
          >
            <span style={{ fontSize: "18px" }}>{item.icon}</span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
