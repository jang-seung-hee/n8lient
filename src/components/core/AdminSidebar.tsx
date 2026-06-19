// 이 파일은 회사 관리자 콘솔의 좌측 네비게이션용 사이드바 컴포넌트입니다.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { buildCompanyInviteLink, siteConfig } from "@/config/siteConfig";

interface AdminSidebarProps {
  /** drawer 등 좁은 컨테이너에서 100% 폭 사용 */
  fullWidth?: boolean;
  /** 메뉴 링크 클릭 후 drawer 닫기 등 */
  onNavigate?: () => void;
}

export function AdminSidebar({ fullWidth = false, onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();
  const { userDoc } = useAuthUser();
  const [companyName, setCompanyName] = useState<string>("");
  const [companyCode, setCompanyCode] = useState<string>("");
  const [copyingInvite, setCopyingInvite] = useState(false);

  useEffect(() => {
    if (userDoc && typeof userDoc.clientId === "string") {
      const clientId = userDoc.clientId;
      const fetchCompanyInfo = async () => {
        try {
          const docRef = doc(db, "clients", clientId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setCompanyName(data.companyName || clientId);
            setCompanyCode(data.companyCode || "");
          } else {
            setCompanyName(clientId);
            setCompanyCode("");
          }
        } catch (err) {
          console.error("[AdminSidebar] 회사 정보 조회 실패:", err);
          setCompanyName(clientId);
          setCompanyCode("");
        }
      };
      fetchCompanyInfo();
    }
  }, [userDoc]);

  const handleCopyInviteLink = async () => {
    if (!companyCode) {
      alert("회사코드를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    const inviteLink = buildCompanyInviteLink(companyCode);
    setCopyingInvite(true);

    try {
      await navigator.clipboard.writeText(inviteLink);
      alert(`${siteConfig.messages.inviteLinkCopied}\n${inviteLink}`);
    } catch (err) {
      console.error("[AdminSidebar] 초대링크 복사 실패:", err);
      window.prompt(siteConfig.messages.inviteLinkCopyFailed, inviteLink);
    } finally {
      setCopyingInvite(false);
    }
  };

  const menuItems = [
    { label: "대시보드 홈", path: "/company-admin", icon: "📊" },
    { label: "회사 정보", path: "/company-admin/info", icon: "🏢" },
    { label: "사용자 승인", path: "/company-admin/approvals", icon: "👤" },
    { label: "사용자 목록", path: "/company-admin/users", icon: "👥" },
    { label: "N8N 워크플로우 설정", path: "/company-admin/automations", icon: "⚙️" },
    { label: "실행 결과", path: "/company-admin/results", icon: "📜" },
  ];

  return (
    <aside
      style={{
        width: fullWidth ? "100%" : "var(--ux-admin-sidebar-width)",
        backgroundColor: "#1f2937",
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
        <div style={{ padding: "0 8px 20px 8px", borderBottom: "1px solid #374151", marginBottom: "20px" }}>
          <h1
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#ffffff",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {companyName || userDoc?.clientId || "N8Lient Admin"}
          </h1>
          <p style={{ fontSize: "11px", color: "#9ca3af", margin: "4px 0 0 0" }}>회사 관리자 콘솔</p>
        </div>

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

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          borderTop: "1px solid #374151",
          paddingTop: "16px",
        }}
      >
        <button
          type="button"
          onClick={handleCopyInviteLink}
          disabled={copyingInvite || !companyCode}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            color: copyingInvite || !companyCode ? "#6b7280" : "#e5e7eb",
            background: "none",
            border: "1px solid #374151",
            borderRadius: "4px",
            padding: "8px 10px",
            cursor: copyingInvite || !companyCode ? "not-allowed" : "pointer",
            textAlign: "left",
          }}
          title={companyCode ? "가입 초대링크를 클립보드에 복사합니다." : "회사코드 로딩 중"}
        >
          <span>🔗</span>
          <span>{copyingInvite ? "복사 중..." : "초대링크"}</span>
        </button>

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
