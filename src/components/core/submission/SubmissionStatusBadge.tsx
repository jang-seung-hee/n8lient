/**
 * 이 파일은 자동화 실행 상태를 표시하는 공통 배지 컴포넌트입니다.
 * 한국어 주석 표준을 준수합니다.
 */

import React from "react";
import { getStatusUiInfo } from "@/common/submission/submissionStatusUi";
import type { SubmissionStatus } from "@/types/n8lient";

interface SubmissionStatusBadgeProps {
  status: SubmissionStatus | string;
  style?: React.CSSProperties;
  className?: string;
}

function getStatusBadgeClassName(status: SubmissionStatus | string): string {
  switch (status) {
    case "success":
      return "ux_badge ux_badge_success";
    case "failed":
    case "config_error":
      return "ux_badge ux_badge_danger";
    case "processing":
      return "ux_badge ux_badge_info";
    case "skipped":
    case "queued":
      return "ux_badge ux_badge_default";
    default:
      return "ux_badge ux_badge_default";
  }
}

export function SubmissionStatusBadge({ status, style, className }: SubmissionStatusBadgeProps) {
  const info = getStatusUiInfo(status);
  const badgeClass = getStatusBadgeClassName(status);

  return (
    <span
      className={className ? `${badgeClass} ${className}` : badgeClass}
      style={{
        fontSize: "10px",
        padding: "2px 6px",
        borderRadius: "4px",
        ...style,
      }}
    >
      {info.label}
    </span>
  );
}
