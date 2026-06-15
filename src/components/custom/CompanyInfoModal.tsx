/**
 * 이 파일은 일반 사용자가 본인의 소속 회사에 대한 공개 프로필을 확인하는 공용 모달 컴포넌트입니다.
 * 보안 규칙에 의거해 노출이 허용된 공개 데이터만 렌더링합니다.
 * 한국어 주석 표준을 준수합니다.
 */

"use client";

import type { ClientPublicProfile } from "@/types/n8lient";

interface CompanyInfoModalProps {
  open: boolean;
  onClose: () => void;
  profile: ClientPublicProfile | null;
  department?: string | null;
  loading?: boolean;
  error?: string | null;
}

export function CompanyInfoModal({
  open,
  onClose,
  profile,
  department,
  loading = false,
  error = null,
}: CompanyInfoModalProps) {
  if (!open) return null;

  // 홈페이지 링크 체크 도우미
  const renderHomepageLink = (url?: string) => {
    if (!url) return <span style={{ color: "#9ca3af" }}>등록되지 않음</span>;
    const isLinkable = /^https?:\/\//.test(url);
    if (isLinkable) {
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#2563eb", textDecoration: "underline", fontWeight: 600 }}
        >
          {url}
        </a>
      );
    }
    return <span style={{ fontWeight: 500, color: "#111111" }}>{url}</span>;
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      {/* 모달 윈도우 바디 */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "400px",
          padding: "20px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f3f4f6", paddingBottom: "10px" }}>
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111111", margin: 0 }}>
              🏢 회사 정보
            </h3>
            <p style={{ fontSize: "11.5px", color: "#6b7280", margin: "2px 0 0 0" }}>
              내 계정에 연결된 소속회사 정보입니다.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px",
              color: "#9ca3af",
            }}
            title="닫기"
          >
            ✕
          </button>
        </div>

        {/* 바디 (상태별 제어) */}
        {loading ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
            🔄 회사 정보를 불러오는 중입니다...
          </div>
        ) : error ? (
          <div style={{ padding: "16px 0", textAlign: "center", color: "#ef4444", fontSize: "13px", fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        ) : !profile ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: "#9ca3af", fontSize: "13px", lineHeight: 1.4 }}>
            표시 가능한 회사 정보가 아직 등록되지 않았습니다.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
            
            {/* 회사명 */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>회사명</span>
              <span style={{ fontWeight: 600, color: "#111111" }}>{profile.companyName}</span>
            </div>

            {/* 회사 표시명 */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>회사 표시명</span>
              <span style={{ fontWeight: 600, color: "#111111" }}>{profile.companyDisplayName || "-"}</span>
            </div>

            {/* 사원 가입용 코드 */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>사내 가입코드</span>
              <span style={{ fontWeight: 600, color: "#111111", fontFamily: "monospace" }}>{profile.companyCode || "-"}</span>
            </div>

            {/* 내 소속 부서 */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>내 소속 부서</span>
              <span style={{ fontWeight: 600, color: "#4b5563" }}>{department || "소속 없음"}</span>
            </div>

            <div style={{ width: "100%", height: "1px", backgroundColor: "#f3f4f6", margin: "4px 0" }} />

            {/* 대표 담당자 */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>대표 담당자</span>
              <span style={{ fontWeight: 600, color: "#111111" }}>{profile.contactName || "-"}</span>
            </div>

            {/* 담당자 연락처 */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>담당자 연락처</span>
              <span style={{ fontWeight: 600, color: "#111111" }}>{profile.contactPhone || "-"}</span>
            </div>

            {/* 홈페이지 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ color: "#6b7280", flexShrink: 0 }}>홈페이지</span>
              <div style={{ textAlign: "right", wordBreak: "break-all", paddingLeft: "12px" }}>
                {renderHomepageLink(profile.homepageUrl)}
              </div>
            </div>

            {/* 회사 소개글 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
              <span style={{ color: "#6b7280" }}>회사 소개 및 가이드</span>
              <p
                style={{
                  margin: 0,
                  padding: "8px 10px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "6px",
                  color: "#4b5563",
                  fontSize: "12px",
                  lineHeight: 1.45,
                  maxHeight: "100px",
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {profile.description || "등록된 소개 글이 없습니다."}
              </p>
            </div>

          </div>
        )}

        {/* 하단 닫기 버튼 */}
        <button
          onClick={onClose}
          style={{
            height: "36px",
            backgroundColor: "#111827",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            marginTop: "4px",
          }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}
