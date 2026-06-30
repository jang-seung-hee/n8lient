// [N8lientStatusBadge.tsx]
// 이 파일은 N8Lient 전체 데이터 목록에서 사용하는 지식 공개 상태 및 프로세스 성공 여부 공통 배지 컴포넌트입니다.
// 한국어 주석 표준을 준수합니다.

import React from "react";

export type BadgeType = "company" | "private" | "success" | "error" | "pending" | "default";

interface N8lientStatusBadgeProps {
  type: BadgeType;
  children?: React.ReactNode;
  className?: string;
}

export function N8lientStatusBadge({ type, children, className = "" }: N8lientStatusBadgeProps) {
  let badgeClass = "ux_status_badge";

  switch (type) {
    case "company":
      badgeClass += " ux_status_badge_company";
      break;
    case "private":
      badgeClass += " ux_status_badge_private";
      break;
    case "success":
      badgeClass += " ux_status_badge_success";
      break;
    case "error":
      badgeClass += " ux_status_badge_error";
      break;
    case "pending":
      badgeClass += " ux_status_badge_pending";
      break;
    default:
      badgeClass += " ux_badge_default"; // 기존 폴백용
      break;
  }

  return (
    <span className={`${badgeClass} ${className}`}>
      {children}
    </span>
  );
}
