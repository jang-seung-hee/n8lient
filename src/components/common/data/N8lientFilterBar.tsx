// [N8lientFilterBar.tsx]
// 이 파일은 데이터 조회 목록 상단에서 필터 입력 필드들을 반응형으로 정렬해 주는 공통 필터 영역 컴포넌트입니다.
// 한국어 주석 표준을 준수합니다.

import React from "react";

interface N8lientFilterBarProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function N8lientFilterBar({ children, className = "", style }: N8lientFilterBarProps) {
  return (
    <div className={`ux_filter_bar ${className}`} style={style}>
      {children}
    </div>
  );
}
