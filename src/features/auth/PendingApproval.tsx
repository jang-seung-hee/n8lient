// 이 파일은 회사 가입 승인 요청 후 승인 대기 상태(pending)일 때 사용자에게 안내 화면을 보여주는 컴포넌트입니다.

"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { LogoutButton } from "@/features/auth/LogoutButton";
import { siteConfig } from "@/config/siteConfig";

export function PendingApproval() {
  const { user, userDoc, cancelJoinRequest } = useAuthUser();
  const [requestedRole, setRequestedRole] = useState<"company_admin" | "user" | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (user && userDoc?.clientId) {
      const requestId = `${user.uid}_${userDoc.clientId}`;
      const requestRef = doc(db, "companyJoinRequests", requestId);
      getDoc(requestRef)
        .then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setRequestedRole(data.requestedRole || "user");
            setCompanyName(data.companyName || null);
          }
        })
        .catch((err) => {
          console.error("[PendingApproval] 가입 요청 조회 실패:", err);
        });
    }
  }, [user, userDoc]);

  const handleCancel = async () => {
    if (!userDoc?.clientId) return;
    const confirmCancel = window.confirm(
      "승인 요청을 취소하면 회사코드를 다시 입력하여 새 요청을 보낼 수 있습니다.\n정말 취소하시겠습니까?"
    );
    if (!confirmCancel) return;

    setCancelling(true);
    try {
      const res = await cancelJoinRequest(userDoc.clientId);
      if (res.success) {
        alert("승인 요청이 취소되었습니다. 회사코드를 다시 입력해 주세요.");
      } else {
        alert(res.message || "취소 처리에 실패했습니다.");
      }
    } catch (err: any) {
      console.error("취소 처리 중 에러:", err);
      alert("취소 도중 오류가 발생했습니다.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "360px",
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "20px 16px",
        textAlign: "center",
        boxShadow: "none",
      }}
    >
      {/* 승인 대기 아이콘 또는 배지 */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          backgroundColor: "#fef3c7",
          color: "#d97706",
          fontSize: "20px",
          marginBottom: "16px",
        }}
        aria-hidden="true"
      >
        ⌛
      </div>

      <h2
        style={{
          fontSize: "16px",
          fontWeight: 600,
          color: "#111111",
          marginBottom: "8px",
        }}
      >
        승인 대기 중
      </h2>

      {companyName && (
        <div
          style={{
            fontSize: "13.5px",
            fontWeight: 700,
            color: "#1d4ed8",
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "6px",
            padding: "8px 10px",
            marginBottom: "16px",
          }}
        >
          🏢 고객사명: {companyName}
        </div>
      )}
      
      <p
        style={{
          fontSize: "13px",
          color: "#374151",
          lineHeight: 1.45,
          marginBottom: "16px",
        }}
      >
        {requestedRole === "company_admin"
          ? "이 고객사에는 등록된 회사 관리자가 없습니다. 최초 회사 관리자 권한으로 가입 승인을 총괄운영자에게 요청했습니다. 승인이 완료될 때까지 기다려 주십시오."
          : "고객사 가입 승인 요청을 제출했습니다. 해당 회사의 관리자(company_admin)가 승인할 때까지 기다려 주십시오."}
      </p>

      {/* 보조 정보 표시 */}
      {userDoc && userDoc.clientId && (
        <div
          style={{
            backgroundColor: "#f9fafb",
            borderRadius: "6px",
            padding: "10px",
            fontSize: "12px",
            color: "#6b7280",
            textAlign: "left",
            border: "1px solid #f3f4f6",
            marginBottom: "20px",
            lineHeight: 1.4,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span>요청 회사 ID:</span>
            <span style={{ fontWeight: 500, color: "#111111" }}>{userDoc.clientId}</span>
          </div>
          {requestedRole && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span>가입 유형:</span>
              <span style={{ fontWeight: 500, color: "#111111" }}>
                {requestedRole === "company_admin" ? "최초 회사 관리자 (company_admin)" : "일반 사용자 (user)"}
              </span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>요청 상태:</span>
            <span style={{ fontWeight: 500, color: "#d97706" }}>승인 대기 (Pending)</span>
          </div>
        </div>
      )}

      {/* 승인 요청 취소 버튼 */}
      {userDoc && userDoc.clientId && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
          <button
            onClick={handleCancel}
            disabled={cancelling}
            style={{
              height: "36px",
              backgroundColor: cancelling ? "#9ca3af" : "#ef4444",
              color: "#ffffff",
              borderRadius: "6px",
              fontSize: "12.5px",
              fontWeight: 600,
              border: "none",
              cursor: cancelling ? "not-allowed" : "pointer",
              padding: "0 16px",
              width: "100%",
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!cancelling) e.currentTarget.style.backgroundColor = "#dc2626";
            }}
            onMouseLeave={(e) => {
              if (!cancelling) e.currentTarget.style.backgroundColor = "#ef4444";
            }}
          >
            {cancelling ? "취소 처리 중..." : "❌ 승인 요청 취소"}
          </button>
        </div>
      )}

      {/* 구분선 */}
      <div
        style={{
          width: "100%",
          height: "1px",
          backgroundColor: "#f3f4f6",
          marginBottom: "16px",
        }}
      />

      {/* 로그아웃 버튼 */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <LogoutButton />
      </div>
    </div>
  );
}
