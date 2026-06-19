// 이 파일은 사용자의 프로필 정보 및 권한 상태 등을 보여주는 내 정보 페이지입니다.

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { LogoutButton } from "@/features/auth/LogoutButton";
import { siteConfig } from "@/config/siteConfig";
import { db } from "@/lib/firebase";
import { getMyCompanyPublicProfile } from "@/features/user/companyProfileService";
import { CompanyInfoModal } from "@/components/custom/CompanyInfoModal";
import type { ClientPublicProfile } from "@/types/n8lient";

export default function UserProfile() {
  const { user, userDoc } = useAuthUser();
  const [profile, setProfile] = useState<ClientPublicProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [errorProfile, setErrorProfile] = useState<string | null>(null);

  useEffect(() => {
    const clientId = userDoc?.clientId;
    if (!clientId) return;
    const fetchProfile = async () => {
      setLoadingProfile(true);
      setErrorProfile(null);
      try {
        const data = await getMyCompanyPublicProfile(db, clientId);
        setProfile(data);
      } catch (err: any) {
        console.error(err);
        setErrorProfile("회사 정보를 불러오지 못했습니다.");
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [userDoc?.clientId]);

  if (!user || !userDoc) return null;

  return (
    <div style={{ boxSizing: "border-box", minWidth: 0 }}>
      <h2 className="ux_section_title" style={{ marginBottom: "16px" }}>
        👤 내 정보
      </h2>

      <div
        className="ux_card"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          alignItems: "center",
        }}
      >
        {/* 아바타 */}
        {user.photoURL ? (
          <Image
            src={user.photoURL}
            alt={user.displayName ?? "프로필 이미지"}
            width={64}
            height={64}
            style={{ borderRadius: "50%", border: "1px solid #e5e7eb" }}
          />
        ) : (
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "#e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              color: "#6b7280",
            }}
          >
            {user.displayName?.charAt(0) ?? "?"}
          </div>
        )}

        {/* 기본 이름 및 이메일 */}
        <div style={{ textAlign: "center" }}>
          <h3 className="ux_section_title" style={{ margin: "0 0 4px 0" }}>
            {user.displayName || "이름 없음"}
          </h3>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>{user.email}</p>
        </div>

        {/* 구분선 */}
        <div style={{ width: "100%", height: "1px", backgroundColor: "#f3f4f6" }} />

        {/* 세부 메타데이터 리스트 */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#6b7280" }}>소속 회사</span>
            <button
              onClick={() => setModalOpen(true)}
              style={{
                background: "none",
                border: "none",
                color: "#2563eb",
                textDecoration: "underline",
                cursor: "pointer",
                fontWeight: 600,
                padding: 0,
                fontSize: "13px",
              }}
            >
              {profile ? (profile.companyDisplayName || profile.companyName) : (loadingProfile ? "조회 중..." : "정보 등록 대기")}
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#6b7280" }}>시스템 역할 (Role)</span>
            <span style={{ fontWeight: 500, color: "#111111" }}>
              {userDoc.role === "operator"
                ? "운영자 (Operator)"
                : userDoc.role === "company_admin"
                ? "회사 관리자 (Admin)"
                : "일반 사용자 (User)"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#6b7280" }}>가입 승인 상태</span>
            <span
              style={{
                fontWeight: 600,
                color: userDoc.approvalStatus === "approved" ? "#10b981" : "#d97706",
              }}
            >
              {userDoc.approvalStatus === "approved" ? "승인 완료" : userDoc.approvalStatus}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#6b7280" }}>계정 생성 일시</span>
            <span style={{ color: "#4b5563" }}>
              {userDoc.createdAt ? new Date(userDoc.createdAt).toLocaleDateString() : "-"}
            </span>
          </div>
        </div>

        {/* 구분선 */}
        <div style={{ width: "100%", height: "1px", backgroundColor: "#f3f4f6" }} />

        {/* 로그아웃 */}
        <LogoutButton />
      </div>

      {/* 회사 정보 상세 모달 */}
      <CompanyInfoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        profile={profile}
        department={userDoc.department}
        loading={loadingProfile}
        error={errorProfile}
      />
    </div>
  );
}
