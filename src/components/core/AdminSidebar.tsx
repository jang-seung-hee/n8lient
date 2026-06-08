// 이 파일은 회사 관리자 콘솔의 좌측 네비게이션용 사이드바 컴포넌트입니다.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuthUser } from "@/features/auth/useAuthUser";

export function AdminSidebar() {
  const pathname = usePathname();
  const { userDoc } = useAuthUser();
  const [companyName, setCompanyName] = useState<string>("");

  useEffect(() => {
    if (userDoc && typeof userDoc.clientId === "string") {
      const clientId = userDoc.clientId;
      const fetchCompanyName = async () => {
        try {
          const docRef = doc(db, "clients", clientId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setCompanyName(data.companyName || clientId);
          } else {
            setCompanyName(clientId);
          }
        } catch (err) {
          console.error("[AdminSidebar] 회사 정보 조회 실패:", err);
          setCompanyName(clientId);
        }
      };
      fetchCompanyName();
    }
  }, [userDoc]);

  const menuItems = [
    { label: "대시보드 홈", path: "/company-admin", icon: "📊" },
    { label: "사용자 승인", path: "/company-admin/approvals", icon: "👤" },
    { label: "사용자 목록", path: "/company-admin/users", icon: "👥" },
    { label: "N8N 워크플로우 설정", path: "/company-admin/automations", icon: "⚙️" },
    { label: "실행 결과", path: "/company-admin/results", icon: "📜" },
  ];

  return (
    <aside
      style={{
        width: "240px",
        backgroundColor: "#1f2937", // 짙은 회색 계열 (콘솔 느낌)
        color: "#f3f4f6",
        padding: "20px 12px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div>
        {/* 콘솔명 */}
        <div style={{ padding: "0 8px 20px 8px", borderBottom: "1px solid #374151", marginBottom: "20px" }}>
          <h1 style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {companyName || userDoc?.clientId || "N8Lient Admin"}
          </h1>
          <p style={{ fontSize: "11px", color: "#9ca3af", margin: "4px 0 0 0" }}>
            회사 관리자 콘솔
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
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  textDecoration: "none",
                  color: isActive ? "#ffffff" : "#d1d5db",
                  backgroundColor: isActive ? "#374151" : "transparent",
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
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid #374151", paddingTop: "16px" }}>
        <Link
          href="/"
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
