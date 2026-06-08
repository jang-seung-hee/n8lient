// 이 파일은 N8Lient 앱의 메인 진입 화면입니다.
// 로그인 상태 및 Firestore 사용자 문서의 approvalStatus 상태에 따라
// 회사코드 입력(no_company), 승인 대기(pending), 승인 완료(approved), 정지/거절 등의 화면을 분기하며
// 승인 완료된 사용자는 해당 역할(role) 전용 라우트로 리다이렉트합니다.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { LoginButton } from "@/features/auth/LoginButton";
import { LogoutButton } from "@/features/auth/LogoutButton";
import { CompanyCodeForm } from "@/features/auth/CompanyCodeForm";
import { PendingApproval } from "@/features/auth/PendingApproval";
import { siteConfig } from "@/config/siteConfig";

export default function Home() {
  const { user, userDoc, loading } = useAuthUser();
  const router = useRouter();

  // 4. 승인 완료 상태 (approved) 리다이렉트 감지
  useEffect(() => {
    if (!loading && user && userDoc?.approvalStatus === "approved") {
      if (userDoc.role === "operator") {
        router.replace("/operator");
      } else if (userDoc.role === "company_admin") {
        router.replace("/company-admin");
      } else {
        router.replace("/user");
      }
    }
  }, [user, userDoc, loading, router]);

  // Auth 및 Firestore 프로필 초기 로딩 중
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

  // ─── 미로그인 상태: 로그인 화면 ───────────────────────────────────────────

  if (!user) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#ffffff",
          padding: "24px 12px",
        }}
      >
        <main
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
            width: "100%",
            maxWidth: "360px",
          }}
        >
          {/* 서비스명 */}
          <div style={{ textAlign: "center" }}>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "#111111",
                letterSpacing: "-0.5px",
                marginBottom: "6px",
              }}
            >
              {siteConfig.name}
            </h1>
            <p style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.4 }}>
              {siteConfig.description}
            </p>
          </div>

          {/* 구분선 */}
          <div
            style={{
              width: "100%",
              height: "1px",
              backgroundColor: "#e5e7eb",
            }}
          />

          {/* Google 로그인 버튼 */}
          <div style={{ width: "100%" }}>
            <LoginButton />
          </div>

          <p style={{ fontSize: "11px", color: "#9ca3af", textAlign: "center" }}>
            로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의하는 것으로 간주됩니다.
          </p>
        </main>
      </div>
    );
  }

  // ─── 로그인 상태: 사용자 승인 상태에 따른 화면 렌더링 ─────────────────────

  // 1. 승인대기 상태 (pending)
  if (userDoc?.approvalStatus === "pending") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#f8f9fa",
          padding: "24px 12px",
        }}
      >
        <PendingApproval />
      </div>
    );
  }

  // 2. 회사코드 미입력 상태 (no_company) 또는 승인 거절 상태 (rejected)
  if (
    userDoc?.approvalStatus === "no_company" ||
    userDoc?.approvalStatus === "rejected"
  ) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#f8f9fa",
          padding: "24px 12px",
          gap: "16px",
        }}
      >
        {userDoc.approvalStatus === "rejected" && (
          <div
            style={{
              width: "100%",
              maxWidth: "360px",
              backgroundColor: "#fde8e8",
              border: "1px solid #f8b4b4",
              borderRadius: "6px",
              padding: "10px 12px",
              fontSize: "12px",
              color: "#9b1c1c",
              boxSizing: "border-box",
              lineHeight: 1.4,
            }}
          >
            ⚠️ 이전 회사 가입 요청이 거절되었습니다. 코드를 다시 확인 후 제출해 주십시오.
          </div>
        )}
        
        <CompanyCodeForm />
        
        {/* 임시 사용자 정보 요약 및 로그아웃 버튼 */}
        <div
          style={{
            width: "100%",
            maxWidth: "360px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12px",
            color: "#6b7280",
            padding: "0 4px",
            boxSizing: "border-box",
          }}
        >
          <span>{user.email}</span>
          <LogoutButton />
        </div>
      </div>
    );
  }

  // 3. 계정 정지 상태 (suspended)
  if (userDoc?.approvalStatus === "suspended") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#f8f9fa",
          padding: "24px 12px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "360px",
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "20px 16px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>🚫</div>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#111111", marginBottom: "8px" }}>
            계정 사용 정지
          </h2>
          <p style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.45, marginBottom: "20px" }}>
            관리자에 의해 계정 사용이 정지되었습니다. 자세한 사항은 시스템 담당자에게 문의해 주십시오.
          </p>
          <LogoutButton />
        </div>
      </div>
    );
  }

  // 4. 승인 완료된 경우: 각 라우트로 이동되는 도중 리다이렉트용 로딩 노출
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
      <p style={{ color: "#6b7280", fontSize: "14px" }}>로그인 성공! 화면 이동 중...</p>
    </div>
  );
}
