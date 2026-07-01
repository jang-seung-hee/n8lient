// [N8lientResultList.tsx]
// 이 파일은 사용자 자료검색 화면에서 카드형 결과를 바인딩하는 공통 리스트 컴포넌트입니다.
// 로딩 및 빈 상태 처리를 일관되게 지원합니다.
// 한국어 주석 표준을 준수합니다.

import React from "react";
import { N8lientLoadingState } from "./N8lientLoadingState";
import { N8lientEmptyState } from "./N8lientEmptyState";

interface N8lientResultListProps<T> {
  items: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
}

export function N8lientResultList<T>({
  items,
  loading = false,
  emptyTitle = "조회된 자료 결과가 없습니다.",
  emptyDescription = "검색 조건을 조정해 보세요.",
  renderItem,
}: N8lientResultListProps<T>) {
  if (loading) {
    return <N8lientLoadingState message="검색 결과를 탐색하고 있습니다. 잠시만 기다려주세요..." />;
  }

  if (items.length === 0) {
    return (
      <N8lientEmptyState
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="ux_result_list">
      {items.map((item, index) => renderItem(item, index))}
    </div>
  );
}
