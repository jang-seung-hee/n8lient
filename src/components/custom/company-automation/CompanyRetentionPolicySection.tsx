"use client";

import React, { type ChangeEvent } from "react";

interface CompanyRetentionPolicySectionProps {
  companyDefaultLevel: "notify_only" | "processed_result" | "full_archive";
  coAllowedUserLevels: ("notify_only" | "processed_result" | "full_archive")[];
  coAllowUserOverride: boolean;
  opPolicy: {
    allowedLevels: string[];
    defaultLevel: string;
    allowCompanyOverride: boolean;
    allowUserOverride: boolean;
  };
  contractRetentionLimit: {
    maxLevel: "notify_only" | "processed_result" | "full_archive" | string;
    allowedLevels: string[];
  };
  onChangeCompanyDefaultLevel: (level: "notify_only" | "processed_result" | "full_archive") => void;
  onChangeCoAllowUserOverride: (override: boolean) => void;
}

/**
 * 회사 관리자 설정에서 회사 전체 결과 보관 단계(Retention Policy) 및 
 * 사용자 권한 허용 여부를 제어하는 UI 컴포넌트입니다.
 */
export default function CompanyRetentionPolicySection({
  companyDefaultLevel,
  coAllowedUserLevels,
  coAllowUserOverride,
  opPolicy,
  contractRetentionLimit,
  onChangeCompanyDefaultLevel,
  onChangeCoAllowUserOverride,
}: CompanyRetentionPolicySectionProps) {
  return (
    <div
      style={{
        backgroundColor: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#111111", margin: 0 }}>
        🛡️ 회사 보관 정책 (Company Policy)
      </h4>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <label className="ux_label" style={{ fontSize: "12px", color: "#4b5563" }}>
          회사 기본 보관 레벨
        </label>
        <select
          className="ux_select_compact"
          value={companyDefaultLevel}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            onChangeCompanyDefaultLevel(e.target.value as "notify_only" | "processed_result" | "full_archive")
          }
          disabled={!opPolicy.allowCompanyOverride}
          style={{
            backgroundColor: opPolicy.allowCompanyOverride ? "#ffffff" : "#f3f4f6",
            color: opPolicy.allowCompanyOverride ? "#111111" : "#9ca3af",
          }}
        >
          {contractRetentionLimit.allowedLevels.map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl === "notify_only" && "알림/로그형 (notify_only)"}
              {lvl === "processed_result" && "가공지식 저장형 (processed_result)"}
              {lvl === "full_archive" && "원본 포함 지식보관형 (full_archive)"}
            </option>
          ))}
        </select>
        {!opPolicy.allowCompanyOverride && (
          <span style={{ fontSize: "11px", color: "#ef4444" }}>
            ⚠️ 오퍼레이터 정책에 의해 회사 관리자의 보관 레벨 강제 재정의(Override)가 금지되어 있어 변경할 수 없습니다.
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            color: opPolicy.allowUserOverride ? "#374151" : "#9ca3af",
            cursor: opPolicy.allowUserOverride ? "pointer" : "not-allowed",
          }}
        >
          <input
            type="checkbox"
            checked={coAllowUserOverride}
            disabled={!opPolicy.allowUserOverride}
            onChange={(e) => onChangeCoAllowUserOverride(e.target.checked)}
            style={{ cursor: opPolicy.allowUserOverride ? "pointer" : "not-allowed" }}
          />
          사내 일반 사용자의 개인 보관 선호 선택 허용
        </label>
        {!opPolicy.allowUserOverride && (
          <span style={{ fontSize: "11px", color: "#6b7280" }}>
            ℹ️ 오퍼레이터 정책상 일반 사용자 변경이 금지되어 있어 활성화할 수 없습니다.
          </span>
        )}
      </div>
    </div>
  );
}
