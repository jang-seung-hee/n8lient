// [N8lientResultCard.tsx]
// 이 파일은 사용자 자료검색 화면에서 사용되는 결과 정보 카드 컴포넌트입니다.
// 제목, 요약/설명, 메타 정보, 공개 상태 배지, 태그/키워드 매핑 및 액션 영역을 지원합니다.
// 한국어 주석 표준을 준수합니다.

import React from "react";

interface N8lientResultCardProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  badges?: React.ReactNode;
  meta?: React.ReactNode;
  tags?: string[];
  onTagClick?: (e: React.MouseEvent, tag: string) => void;
  onClick?: () => void;
}

export function N8lientResultCard({
  title,
  description,
  badges,
  meta,
  tags = [],
  onTagClick,
  onClick,
}: N8lientResultCardProps) {
  return (
    <div
      onClick={onClick}
      className={`ux_result_card ${onClick ? "ux_result_card_clickable" : ""}`}
    >
      {/* 카드 헤더 영역 (분류 배지 및 공개 상태 표시) */}
      {(badges) && (
        <div className="ux_result_card_header">
          {badges}
        </div>
      )}

      {/* 카드 타이틀 */}
      <h4 className="ux_result_card_title">
        {title}
      </h4>

      {/* 요약 본문 */}
      {description && (
        <div className="ux_result_card_desc">
          {description}
        </div>
      )}

      {/* 태그 목록 */}
      {tags.length > 0 && (
        <div className="ux_result_card_tags">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              onClick={(e) => {
                if (onTagClick) {
                  onTagClick(e, tag);
                }
              }}
              className="ux_result_card_tag"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 메타 정보 */}
      {meta && (
        <div className="ux_result_card_meta">
          {meta}
        </div>
      )}
    </div>
  );
}
