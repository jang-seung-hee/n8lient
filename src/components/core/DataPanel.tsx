// 이 파일은 PC 사용자용 화면의 좌측에 노출되는 데이터 분석활용 진입용 사이드 패널 컴포넌트입니다.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DataPanel() {
  const pathname = usePathname();

  const dataItems = [
    { label: "통자요", path: "/user/data/tongjayo", icon: "📞" },
    { label: "회의록", path: "/user/data/meeting-note", icon: "📝" },
    { label: "아이디어 캐치", path: "/user/data/idea-catch", icon: "💡" },
    { label: "업무위키", path: "/user/data/work-wiki", icon: "📖" },
  ];

  return (
    <aside
      style={{
        width: "240px",
        backgroundColor: "#ffffff",
        borderRight: "1px solid #e5e7eb",
        padding: "16px 12px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        boxSizing: "border-box",
        height: "100%",
      }}
    >
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
    </aside>
  );
}
