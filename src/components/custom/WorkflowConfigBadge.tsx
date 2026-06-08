// 이 파일은 N8N 워크플로우 실행 시 적용되는 개인 설정 우선순위 및 회사 fallback 설정을 반영하여
// 워크플로우의 구동 가능 상태를 나타내주는 배지 컴포넌트입니다.

"use client";

import React from "react";
import type { ClientAutomation, WorkflowTemplate, UserAutomationSettings } from "@/types/n8lient";

interface WorkflowConfigBadgeProps {
  automation: ClientAutomation | null;
  template: WorkflowTemplate | null;
  userSettings: UserAutomationSettings | null;
}

export default function WorkflowConfigBadge({
  automation,
  template,
  userSettings,
}: WorkflowConfigBadgeProps) {
  const isSecurityField = (key: string) => {
    const lowercaseKey = key.toLowerCase();
    const forbiddenKeywords = ["token", "secret", "apikey", "credential", "accesstoken", "refreshtoken"];
    return forbiddenKeywords.some((keyword) => lowercaseKey.includes(keyword));
  };

  // 1. 회사 설정 위에 개인 설정을 우선 덮어쓰기하여 임시 병합 설정 객체 반환
  const getMergedSettings = (): Record<string, any> => {
    const companySettings = automation?.settings || {};
    const merged = { ...companySettings };

    if (userSettings && userSettings.settings) {
      for (const [key, val] of Object.entries(userSettings.settings)) {
        // 빈 문자열, 공백 문자열, null, undefined는 무시하여 회사 기본값이 fallback되게 함
        const isInvalid =
          val === null ||
          val === undefined ||
          (typeof val === "string" && val.trim() === "");

        if (!isInvalid) {
          merged[key] = val;
        }
      }
    }
    return merged;
  };

  const mergedSettings = getMergedSettings();

  // 2. 최종 병합된 설정을 기준으로 필수 설정 누락 여부 판단
  const isRequiredSettingMissing = () => {
    if (!template) return false;

    return template.configSchema.some((field) => {
      if (!field.required) return false;

      const val = mergedSettings[field.key];
      if (val === null || val === undefined) return true;
      if (typeof val === "string" && val.trim() === "") return true;

      return false;
    });
  };

  // 3. 유효한 개인 설정이 1개 이상 존재하여 덮어쓰기되었는지 확인
  const hasValidPersonalSetting = () => {
    if (!userSettings || !userSettings.settings) return false;

    return Object.entries(userSettings.settings).some(([key, val]) => {
      // 보안성 민감 필드는 판단 제외
      if (isSecurityField(key)) return false;

      // 빈 문자열, 공백 문자열, null, undefined는 무시
      if (val === null || val === undefined) return false;
      if (typeof val === "string" && val.trim() === "") return false;

      // false, 0 등은 유효한 개인 설정 값으로 처리
      return true;
    });
  };

  const getBadgeStyle = () => {
    if (isRequiredSettingMissing()) {
      return {
        label: "설정 확인 필요",
        bg: "#fee2e2",
        text: "#b91c1c",
        border: "1px solid #fecaca",
      };
    }

    if (hasValidPersonalSetting()) {
      return {
        label: "개인 설정 적용 중",
        bg: "#e2fbf0",
        text: "#0d9488",
        border: "1px solid #a7f3d0",
      };
    }

    return {
      label: "회사 기본값 사용 중",
      bg: "#eff6ff",
      text: "#2563eb",
      border: "1px solid #bfdbfe",
    };
  };

  const badge = getBadgeStyle();

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: 600,
        backgroundColor: badge.bg,
        color: badge.text,
        border: badge.border,
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
      }}
    >
      {badge.label}
    </span>
  );
}

