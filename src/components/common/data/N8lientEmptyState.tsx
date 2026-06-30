// [N8lientEmptyState.tsx]
// 이 파일은 데이터 조회 결과가 비어있을 때 사용되는 N8Lient 표준 빈 화면 표시 컴포넌트입니다.
// 한국어 주석 표준을 준수합니다.

import React from "react";

interface N8lientEmptyStateProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties; // 레이아웃 보완용 예외 허용 style
}

export function N8lientEmptyState({
  title,
  description,
  children,
  className = "",
  style,
}: N8lientEmptyStateProps) {
  return (
    <div className={`ux_empty_state ${className}`} style={style}>
      {title && (
        <h3 className="ux_section_title" style={{ margin: "0 0 6px 0", fontSize: "14px" }}>
          {title}
        </h3>
      )}
      {description && (
        <p className="ux_caption" style={{ margin: 0, color: "var(--ux-text-color-muted)" }}>
          {description}
        </p>
      )}
      {children && <div style={{ marginTop: "12px" }}>{children}</div>}
    </div>
  );
}
