"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { LogoutButton } from "@/features/auth/LogoutButton";
import { siteConfig } from "@/config/siteConfig";
import { db } from "@/lib/firebase";
import { getMyCompanyPublicProfile } from "@/features/user/companyProfileService";
import { CompanyInfoModal } from "@/components/custom/CompanyInfoModal";
import { updateMyUserProfile } from "@/features/auth/authUserService";
import type { ClientPublicProfile } from "@/types/n8lient";

export default function UserProfile() {
  const { user, userDoc } = useAuthUser();
  const [profile, setProfile] = useState<ClientPublicProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [errorProfile, setErrorProfile] = useState<string | null>(null);

  // 편집 모드 상태 및 폼 상태
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    department: "",
    position: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

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

  // 편집 모드 시작 시 현재 데이터 세팅
  const handleStartEdit = () => {
    if (!userDoc) return;
    setForm({
      displayName: userDoc.displayName || "",
      department: userDoc.department || "",
      position: userDoc.position || "",
      phone: userDoc.phone || "",
    });
    setValidationError(null);
    setIsEditing(true);
  };

  // 프로필 저장 로직 및 입력값 유효성 검증
  const handleSave = async () => {
    if (!userDoc) return;
    setValidationError(null);

    const displayName = form.displayName.trim();
    const department = form.department.trim();
    const position = form.position.trim();
    const phone = form.phone.trim();

    // 1. 표시 이름 검증
    if (!displayName) {
      setValidationError("표시 이름을 입력해 주십시오.");
      return;
    }
    if (displayName.length < 2 || displayName.length > 30) {
      setValidationError("표시 이름은 2자 이상 30자 이하로 입력해 주십시오.");
      return;
    }

    // 2. 부서 검증
    if (department.length > 50) {
      setValidationError("부서는 50자 이내로 입력해 주십시오.");
      return;
    }

    // 3. 직책 검증
    if (position.length > 50) {
      setValidationError("직책은 50자 이내로 입력해 주십시오.");
      return;
    }

    // 4. 휴대폰 번호 검증
    if (phone) {
      // 숫자, 하이픈, 공백만 허용
      const phoneRegex = /^[0-9\-\s]+$/;
      if (!phoneRegex.test(phone)) {
        setValidationError("휴대폰 번호는 숫자, 하이픈(-), 공백만 입력할 수 있습니다.");
        return;
      }
      if (phone.length > 20) {
        setValidationError("휴대폰 번호가 지나치게 깁니다. (20자 이내)");
        return;
      }
    }

    setSaving(true);
    try {
      const result = await updateMyUserProfile(db, userDoc.uid, {
        displayName,
        department,
        position,
        phone,
      });

      if (result.success) {
        setIsEditing(false);
      } else {
        setValidationError(result.message || "프로필 저장에 실패했습니다.");
      }
    } catch (err: any) {
      console.error(err);
      setValidationError("서버와 통신하는 도중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

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
            alt={userDoc.displayName ?? "프로필 이미지"}
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
            {(userDoc.displayName || user.displayName || "?").charAt(0)}
          </div>
        )}

        {/* 기본 이름 및 이메일 */}
        <div style={{ textAlign: "center" }}>
          <h3 className="ux_section_title" style={{ margin: "0 0 4px 0" }}>
            {userDoc.displayName || "이름 없음"}
          </h3>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>{userDoc.email}</p>
        </div>

        {/* 구분선 */}
        <div style={{ width: "100%", height: "1px", backgroundColor: "#f3f4f6" }} />

        {/* 에러 메시지 표시 */}
        {validationError && (
          <div
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fee2e2",
              color: "#dc2626",
              borderRadius: "6px",
              fontSize: "12px",
              boxSizing: "border-box",
            }}
          >
            ⚠️ {validationError}
          </div>
        )}

        {/* 프로필 정보 렌더링 / 수정 양식 */}
        {isEditing ? (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>표시 이름 (필수)</label>
              <input
                type="text"
                className="ux_input"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="홍길동"
                disabled={saving}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>부서</label>
              <input
                type="text"
                className="ux_input"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="경영지원팀"
                disabled={saving}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>직책</label>
              <input
                type="text"
                className="ux_input"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="팀장"
                disabled={saving}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>휴대폰 번호</label>
              <input
                type="text"
                className="ux_input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="010-1234-5678"
                disabled={saving}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button
                onClick={handleSave}
                disabled={saving}
                className="ux_button ux_button_primary"
                style={{ flex: 1, height: "36px", cursor: "pointer" }}
              >
                {saving ? "저장 중..." : "저장"}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="ux_button"
                style={{
                  flex: 1,
                  height: "36px",
                  backgroundColor: "#ffffff",
                  color: "#374151",
                  border: "1px solid #d1d5db",
                  cursor: "pointer",
                }}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
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
              <span style={{ color: "#6b7280" }}>부서</span>
              <span style={{ fontWeight: 500, color: "#111111" }}>{userDoc.department || "-"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>직책</span>
              <span style={{ fontWeight: 500, color: "#111111" }}>{userDoc.position || "-"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>휴대폰 번호</span>
              <span style={{ fontWeight: 500, color: "#111111" }}>{userDoc.phone || "-"}</span>
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

            <button
              onClick={handleStartEdit}
              className="ux_button"
              style={{
                width: "100%",
                height: "36px",
                marginTop: "8px",
                backgroundColor: "#ffffff",
                color: "#111111",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              📝 기본 정보 수정하기
            </button>
          </div>
        )}

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
