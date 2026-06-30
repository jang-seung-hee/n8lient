// [CompanyAccessPolicySection.tsx]
// 이 파일은 회사 관리자가 자동화 설정 편집 시 결과 데이터 공개 범위 및 변경 권한 정책(resultAccessPolicy)을
// 직관적으로 조율할 수 있는 독립 폼 컴포넌트입니다.
// 한국어 주석 표준을 준수합니다.

import React from "react";
import type { ResultAccessMode } from "@/types/n8lient";

interface CompanyAccessPolicySectionProps {
  defaultAccessMode: ResultAccessMode;
  ownerCanChangeAccess: boolean;
  adminCanChangeAccess: boolean;
  policySource: "custom" | "inherited" | "default";
  onChangeDefaultAccessMode: (mode: ResultAccessMode) => void;
  onChangeOwnerCanChangeAccess: (allow: boolean) => void;
  onChangeAdminCanChangeAccess: (allow: boolean) => void;
}

export default function CompanyAccessPolicySection({
  defaultAccessMode,
  ownerCanChangeAccess,
  adminCanChangeAccess,
  policySource,
  onChangeDefaultAccessMode,
  onChangeOwnerCanChangeAccess,
  onChangeAdminCanChangeAccess,
}: CompanyAccessPolicySectionProps) {
  
  const getSourceBadgeText = () => {
    switch (policySource) {
      case "custom":
        return "🏢 고객사 지정 정책 적용 중";
      case "inherited":
        return "📂 마스터 워크플로우 템플릿 정책 상속 중";
      case "default":
      default:
        return "🔒 시스템 안전 기본값(Default) 적용 중";
    }
  };

  const getSourceBadgeColor = () => {
    switch (policySource) {
      case "custom":
        return { bg: "#eff6ff", text: "#1d4ed8" };
      case "inherited":
        return { bg: "#ecfdf5", text: "#047857" };
      case "default":
      default:
        return { bg: "#f3f4f6", text: "#4b5563" };
    }
  };

  const badgeStyle = getSourceBadgeColor();

  return (
    <div
      className="ux_card"
      style={{
        padding: "16px",
        backgroundColor: "#fafbfd",
        border: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
        <h4 className="ux_card_title" style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b", margin: 0 }}>
          🔒 결과 데이터 공개 및 변경 권한 정책
        </h4>
        <span
          className="ux_badge"
          style={{
            fontSize: "11px",
            fontWeight: 600,
            backgroundColor: badgeStyle.bg,
            color: badgeStyle.text,
            padding: "2px 8px",
            borderRadius: "4px",
            height: "auto",
          }}
        >
          {getSourceBadgeText()}
        </span>
      </div>

      <p className="ux_caption" style={{ fontSize: "11.5px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
        이 자동화 워크플로우를 실행하여 도출된 결과 데이터의 기본 공유 범위와, 작성자 본인 및 관리자의 권한 수정 규칙을 정의합니다.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginTop: "4px" }}>
        
        {/* 1. 기본 공개범위 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label className="ux_label" style={{ fontSize: "11.5px", fontWeight: 600, color: "#475569" }}>
            결과 최초 저장 시 기본 범위
          </label>
          <select
            className="ux_select_compact"
            value={defaultAccessMode}
            onChange={(e) => onChangeDefaultAccessMode(e.target.value as ResultAccessMode)}
            style={{ fontSize: "12.5px", height: "34px" }}
          >
            <option value="private">🔒 개인 보관 (작성자 본인만 열람)</option>
            <option value="company">🏢 회사 공개 (같은 회사 구성원 열람)</option>
          </select>
        </div>

        {/* 2. 작성자 공개범위 변경 허용 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label className="ux_label" style={{ fontSize: "11.5px", fontWeight: 600, color: "#475569" }}>
            실행 작성자의 공개 전환 허용
          </label>
          <select
            className="ux_select_compact"
            value={String(ownerCanChangeAccess)}
            onChange={(e) => onChangeOwnerCanChangeAccess(e.target.value === "true")}
            style={{ fontSize: "12.5px", height: "34px" }}
          >
            <option value="false">🔒 허용 안 함 (최초 지정값으로 고정)</option>
            <option value="true">🔓 허용 (작성자가 뷰어에서 직접 변경 가능)</option>
          </select>
        </div>

        {/* 3. 관리자 공개철회 허용 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label className="ux_label" style={{ fontSize: "11.5px", fontWeight: 600, color: "#475569" }}>
            관리자(admin)의 공개 철회 허용
          </label>
          <select
            className="ux_select_compact"
            value={String(adminCanChangeAccess)}
            onChange={(e) => onChangeAdminCanChangeAccess(e.target.value === "true")}
            style={{ fontSize: "12.5px", height: "34px" }}
          >
            <option value="true">🔓 허용 (회사 관리자가 임의 철회 가능)</option>
            <option value="false">🔒 허용 안 함</option>
          </select>
        </div>

      </div>
    </div>
  );
}
