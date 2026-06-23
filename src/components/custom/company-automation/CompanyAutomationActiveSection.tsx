"use client";

import React from "react";

interface CompanyAutomationActiveSectionProps {
  enabled: boolean;
  onChangeEnabled: (enabled: boolean) => void;
}

/**
 * 회사 관리자 설정에서 해당 N8N 워크플로우를 사내 사용자들에게 
 * 노출할 것인지에 대한 활성화(Enabled) 유무를 제어하는 체크박스 컴포넌트입니다.
 */
export default function CompanyAutomationActiveSection({
  enabled,
  onChangeEnabled,
}: CompanyAutomationActiveSectionProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "4px 0" }}>
      <input
        type="checkbox"
        id="formEnabled"
        checked={enabled}
        onChange={(e) => onChangeEnabled(e.target.checked)}
        style={{ width: "16px", height: "16px", cursor: "pointer" }}
      />
      <label
        htmlFor="formEnabled"
        style={{ fontSize: "13px", fontWeight: 600, color: "#374151", cursor: "pointer" }}
      >
        사내 사용자들에게 이 N8N 워크플로우 노출 및 활성화
      </label>
    </div>
  );
}
