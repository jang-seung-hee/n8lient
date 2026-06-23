"use client";

import React from "react";
import type { UserSettingGuidanceLevel, UserSettingVisibilityLevel } from "@/types/n8lient";

interface ConfigFieldPolicyControlProps {
  fieldKey: string;
  visibility: UserSettingVisibilityLevel | undefined;
  guidance: UserSettingGuidanceLevel | undefined;
  onChangeVisibility: (key: string, value: UserSettingVisibilityLevel | undefined) => void;
  onChangeGuidance: (key: string, value: UserSettingGuidanceLevel | undefined) => void;
  description?: string;
}

/**
 * 회사 관리자 자동화 편집 폼에서 개별 설정 필드의 
 * 조건부 숨김(Visibility) 및 개인 설정 안내 등급(Guidance)을 조절하는 UI 제어 컴포넌트입니다.
 */
export default function ConfigFieldPolicyControl({
  fieldKey,
  visibility,
  guidance,
  onChangeVisibility,
  onChangeGuidance,
  description,
}: ConfigFieldPolicyControlProps) {
  const isHidden = visibility === "hide_when_empty";

  const handleVisibilityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    const newVisibility = checked ? "hide_when_empty" : undefined;
    onChangeVisibility(fieldKey, newVisibility);

    // 숨김 상태가 활성화되면 안내 등급은 자동으로 초기화(undefined)시킵니다.
    if (checked) {
      onChangeGuidance(fieldKey, undefined);
    }
  };

  const handleGuidanceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as UserSettingGuidanceLevel || undefined;
    onChangeGuidance(fieldKey, val);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "12px" }}>
        {/* 사용자 설정창 숨김 토글 */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <label
            className="ux_toggle_switch"
            title="개인값이 없는 사용자에게만 숨겨지며, 사용자가 이미 개인 설정값을 저장한 경우에는 숨기지 않고 표시됩니다."
          >
            <span className={`ux_toggle_switch_state ${!isHidden ? "ux_toggle_switch_state_visible" : ""}`}>
              보이기
            </span>
            <input
              type="checkbox"
              className="ux_toggle_switch_input"
              checked={isHidden}
              onChange={handleVisibilityChange}
            />
            <span className="ux_toggle_switch_track">
              <span className="ux_toggle_switch_thumb"></span>
            </span>
            <span className={`ux_toggle_switch_state ${isHidden ? "ux_toggle_switch_state_hidden" : ""}`}>
              숨김
            </span>
          </label>
        </div>

        {/* 개인설정 안내 등급 선택 */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "11px", color: "#6b7280" }}>안내:</span>
          <select
            className={`ux_select_compact ${
              guidance === "required_override"
                ? "ux_guidance_select_required"
                : guidance === "recommended_override"
                ? "ux_guidance_select_recommended"
                : ""
            }`}
            value={guidance || ""}
            disabled={isHidden}
            onChange={handleGuidanceChange}
            style={{
              width: "80px",
              height: "26px",
              fontSize: "11px",
              padding: "0 4px",
              cursor: isHidden ? "not-allowed" : "default",
            }}
            title={isHidden ? "숨김을 켜면 사용자 직접 설정 필수/권고 안내보다 숨김 처리가 우선됩니다." : ""}
          >
            <option value="">없음</option>
            <option value="required_override">필수</option>
            <option value="recommended_override">권고</option>
          </select>
        </div>
      </div>

      {/* 설명 자리: 숨김 ON이면 🔒 안내, 아니면 💡 설명 — 항상 1줄 자리 고정 */}
      {(isHidden || description) && (
        <span
          style={{
            fontSize: "11px",
            color: isHidden ? "#ea580c" : "#6b7280",
            marginTop: "-2px",
            marginBottom: "2px",
            display: "block",
            textAlign: "right",
          }}
        >
          {isHidden
            ? "🔒 숨김: 사용자에게 숨김 처리됨 (단, 개인값 있는 경우 예외)"
            : description
            ? `💡 ${description}`
            : null}
        </span>
      )}
    </div>
  );
}
