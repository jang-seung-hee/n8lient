"use client";

/**
 * 텍스트 내 URL이 포함된 경우 고정 텍스트("관련 URL 열기") 형태의 링크 칩 배지로 안전하게 변환해주는 공통 컴포넌트
 * 한국어 주석 표준을 준수합니다.
 */

import React from "react";
import { tokenizeText } from "@/common/utils/linkifyText";

interface LinkifiedTextProps {
  text?: string | null;
  className?: string;
}

export default function LinkifiedText({ text, className = "" }: LinkifiedTextProps) {
  if (!text) return null;

  const tokens = tokenizeText(text);

  return (
    <span className={`ux_linkified_text ${className}`}>
      {tokens.map((token, index) => {
        if (token.type === "link" && token.url) {
          // 표시 텍스트는 고정된 라벨 "관련 URL 열기"를 사용
          const displayLabel = "관련 URL 열기";

          return (
            <a
              key={index}
              href={token.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ux_link_chip"
              title={token.text} // 전체 원본 URL을 툴팁(title)으로 제공
            >
              {displayLabel}
            </a>
          );
        }

        // 일반 텍스트는 그대로 렌더링
        return <React.Fragment key={index}>{token.text}</React.Fragment>;
      })}
    </span>
  );
}
