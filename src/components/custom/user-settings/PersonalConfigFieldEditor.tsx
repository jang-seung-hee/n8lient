"use client";

import React from "react";
import { isGoogleDriveFolderIdConfigKey } from "@/common/googleDrive/googleDriveFolderIdField";
import { GoogleDriveFolderIdInput } from "@/components/core/GoogleDriveFolderIdInput";
import { hasPersonalSettingValue, resolveFieldGuidanceState } from "@/features/user/settings/resolvePersonalSettingFieldState";
import UserSettingGuidanceBadge from "./UserSettingGuidanceBadge";

interface PersonalConfigFieldEditorProps {
  field: {
    key: string;
    label: string;
    type: string;
    description?: string;
    options?: string[];
    placeholder?: string;
  };
  companyDefaultVal: any;
  personalValue: any;
  guidance: any;
  visibility: any;
  onChange: (value: any) => void;
}

/**
 * 사용자 개인 설정 모달 내에서 개별 설정 필드의 입력 렌더링과 
 * 안내 배지 및 숨김 안내 문구 노출을 담당하는 컴포넌트입니다.
 */
export default function PersonalConfigFieldEditor({
  field,
  companyDefaultVal,
  personalValue,
  guidance,
  visibility,
  onChange,
}: PersonalConfigFieldEditorProps) {
  const hasPersonalValue = hasPersonalSettingValue(personalValue);
  const shouldHideWhenEmpty = visibility === "hide_when_empty";

  // 조건부 숨김 판정: 회사관리자가 숨김을 켰고 개인값이 비어있는 경우
  if (shouldHideWhenEmpty && !hasPersonalValue) {
    return null;
  }

  const helpText = companyDefaultVal
    ? `회사 기본값: ${companyDefaultVal}`
    : "회사 기본값 없음";

  const { badgeType, guidanceText, inputBorderColor } = resolveFieldGuidanceState(
    guidance,
    hasPersonalValue
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label className="ux_label" style={{ fontSize: "12px" }}>
          {field.label}
        </label>
        <UserSettingGuidanceBadge badgeType={badgeType} />
      </div>

      {field.type === "textarea" ? (
        <textarea
          className="ux_textarea"
          value={personalValue ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${helpText} (비워두면 기본값 사용)`}
          style={{ minHeight: "60px", borderColor: inputBorderColor }}
        />
      ) : field.type === "select" ? (
        <select
          className="ux_select_compact"
          value={personalValue ?? ""}
          onChange={(e) => onChange(e.target.value)}
          style={{ borderColor: inputBorderColor }}
        >
          <option value="">{`회사 기본값 사용 (${companyDefaultVal || "없음"})`}</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : field.type === "boolean" ? (
        <select
          className="ux_select_compact"
          value={
            personalValue === undefined || personalValue === null
              ? ""
              : String(personalValue)
          }
          onChange={(e) => {
            const val = e.target.value;
            onChange(val === "" ? "" : val === "true");
          }}
          style={{ borderColor: inputBorderColor }}
        >
          <option value="">{`회사 기본값 사용 (${
            companyDefaultVal !== undefined ? String(companyDefaultVal) : "없음"
          })`}</option>
          <option value="true">True (사용)</option>
          <option value="false">False (미사용)</option>
        </select>
      ) : isGoogleDriveFolderIdConfigKey(field.key) ? (
        <div style={{ borderColor: inputBorderColor }}>
          <GoogleDriveFolderIdInput
            value={String(personalValue ?? "")}
            onChange={(v) => onChange(v)}
            placeholder={`${helpText} (폴더 ID 또는 링크, 비워두면 기본값 사용)`}
            allowEmpty
          />
        </div>
      ) : (
        <input
          type={field.type === "number" ? "number" : "text"}
          className="ux_input_compact"
          value={personalValue ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${helpText} (비워두면 기본값 사용)`}
          style={{ borderColor: inputBorderColor }}
        />
      )}

      {shouldHideWhenEmpty && hasPersonalValue && (
        <span
          className="ux_guidance_badge_recommended"
          style={{ fontSize: "11px", fontWeight: "600", marginTop: "2px", display: "inline-flex", alignSelf: "flex-start", padding: "2px 8px" }}
        >
          ℹ️ 기존 개인 설정값이 있어 표시 중입니다. 값을 비우면 회사 기본값으로 처리됩니다.
        </span>
      )}

      {guidanceText && (
        <span
          style={{ fontSize: "11px", fontWeight: "600", color: guidance === "required_override" ? "#dc2626" : "#d97706", marginTop: "2px" }}
        >
          ⚠️ {guidanceText}
        </span>
      )}

      {field.description && (
        <span style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
          ℹ️ {field.description}
        </span>
      )}
    </div>
  );
}
