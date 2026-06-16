// 이 파일은 초대링크(/join?companyCode=...) 또는 직접 접속을 통한 회사 가입 승인 요청 화면입니다.

"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { LoginButton } from "@/features/auth/LoginButton";
import { LogoutButton } from "@/features/auth/LogoutButton";
import { JoinRequestForm } from "@/features/auth/JoinRequestForm";
import { PendingApproval } from "@/features/auth/PendingApproval";
import { siteConfig } from "@/config/siteConfig";

function JoinPageContent() {
  const { user, userDoc, loading } = useAuthUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyCodeFromQuery = searchParams.get("companyCode")?.trim() || "";
  const hasInviteCode = companyCodeFromQuery.length > 0;

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
          gap: "20px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "360px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#111111", marginBottom: "8px" }}>
            {siteConfig.name} 가입
          </h1>
          <p style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.5 }}>
            Google 로그인 후 가입 승인 요청을 완료해 주십시오.
            {hasInviteCode && (
              <>
                <br />
                회사코드는 로그인 후 자동으로 입력됩니다.
              </>
            )}
          </p>
        </div>
        <div style={{ width: "100%", maxWidth: "360px" }}>
          <LoginButton />
        </div>
      </div>
    );
  }

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

  if (userDoc?.approvalStatus === "suspended") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#f8f9fa",
          padding: "24px 12px",
        }}
      >
        <p style={{ fontSize: "14px", color: "#6b7280" }}>계정 사용이 정지되었습니다.</p>
      </div>
    );
  }

  if (userDoc?.approvalStatus === "approved") {
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
        <p style={{ color: "#6b7280", fontSize: "14px" }}>화면 이동 중...</p>
      </div>
    );
  }

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
      {userDoc?.approvalStatus === "rejected" && (
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
          ⚠️ 이전 회사 가입 요청이 거절되었습니다. 정보를 확인 후 다시 제출해 주십시오.
        </div>
      )}

      <JoinRequestForm
        initialCompanyCode={companyCodeFromQuery}
        companyCodeReadOnly={hasInviteCode}
        source={hasInviteCode ? "invite_link" : "manual_code"}
        showInviteHint={hasInviteCode}
      />

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

export default function JoinPage() {
  return (
    <Suspense
      fallback={
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
      }
    >
      <JoinPageContent />
    </Suspense>
  );
}
