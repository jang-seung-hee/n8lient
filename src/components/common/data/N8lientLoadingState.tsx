// [N8lientLoadingState.tsx]
// 이 파일은 데이터 목록 로딩 시 사용하는 N8Lient 표준 로딩 상태 컴포넌트입니다.
// 한국어 주석 표준을 준수합니다.

import React from "react";

interface N8lientLoadingStateProps {
  message?: string;
  children?: React.ReactNode;
  className?: string;
}

export function N8lientLoadingState({
  message = "데이터를 불러오는 중입니다...",
  children,
  className = "",
}: N8lientLoadingStateProps) {
  return (
    <div className={`ux_loading_state ${className}`}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
        <span>{message}</span>
        {children}
      </div>
    </div>
  );
}
