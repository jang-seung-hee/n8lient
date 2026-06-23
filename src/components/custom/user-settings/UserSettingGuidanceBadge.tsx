"use client";

import React from "react";

interface UserSettingGuidanceBadgeProps {
  badgeType: "required" | "recommended" | "success" | "none";
}

/**
 * 개인설정 필수/권고/완료 상태에 대한 배지를 렌더링하는 컴포넌트입니다.
 */
export default function UserSettingGuidanceBadge({
  badgeType,
}: UserSettingGuidanceBadgeProps) {
  if (badgeType === "required") {
    return <span className="ux_guidance_badge_required">개인 설정 필수</span>;
  }
  if (badgeType === "recommended") {
    return <span className="ux_guidance_badge_recommended">개인 설정 권장</span>;
  }
  if (badgeType === "success") {
    return <span className="ux_guidance_badge_success">개인 설정 완료</span>;
  }
  if (badgeType === "none") {
    return <span style={{ fontSize: "10px", color: "#9ca3af" }}>개인 맞춤용</span>;
  }
  return null;
}
