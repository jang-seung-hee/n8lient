// [N8lientBulkActionBar.tsx]
// 이 파일은 여러 자료를 선택했을 때 상단에 표시되는 일괄 처리 및 개수 확인용 공통 컴포넌트입니다.
// 한국어 주석 표준을 준수합니다.

import React from "react";

interface N8lientBulkActionBarProps {
  selectedCount: number;
  totalCount?: number;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function N8lientBulkActionBar({
  selectedCount,
  totalCount,
  actions,
  children,
  className = "",
  style,
}: N8lientBulkActionBarProps) {
  return (
    <div className={`ux_bulk_bar ${className}`} style={style}>
      {children ? (
        children
      ) : (
        <>
          <span className="ux_caption" style={{ fontSize: "13px" }}>
            선택한 항목: <strong>{selectedCount}</strong>개
            {totalCount !== undefined && ` / 필터된 결과: ${totalCount}건`}
          </span>
          {actions && <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>{actions}</div>}
        </>
      )}
    </div>
  );
}
