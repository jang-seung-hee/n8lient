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
}

export function SubmissionStatusBadge({ status, style }: SubmissionStatusBadgeProps) {
  const info = getStatusUiInfo(status);
  
  return (
    <span
      style={{
        fontSize: "10px",
        fontWeight: 600,
        backgroundColor: info.bg,
        color: info.text,
        padding: "2px 6px",
        borderRadius: "4px",
        display: "inline-block",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {info.label}
    </span>
  );
}
