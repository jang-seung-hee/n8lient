"use client";

// 실행 결과 상세 화면 공통 섹션 아코디언 컴포넌트

import React, { useState } from "react";
import type { ResultSectionKey } from "./resultDetailTypes";
import { RESULT_SECTION_LABELS, RESULT_SECTION_NUMBERS } from "./resultDetailTypes";

interface ResultSectionAccordionProps {
  sectionKey: ResultSectionKey;
  defaultOpen: boolean;
  children: React.ReactNode;
  /** 섹션 제목 오버라이드 (미지정 시 표준 제목 사용) */
  title?: string;
}

export function ResultSectionAccordion({
  sectionKey,
  defaultOpen,
  children,
  title,
}: ResultSectionAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const label = title ?? RESULT_SECTION_LABELS[sectionKey];
  const number = RESULT_SECTION_NUMBERS[sectionKey];

  return (
    <div className="rounded-md border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50"
      >
        <span className="shrink-0 text-[10px] font-semibold text-gray-400">[{number}]</span>
        <span className="min-w-0 flex-1 text-xs font-bold text-gray-700">{label}</span>
        <span className="shrink-0 text-[10px] text-gray-400">{open ? "▼" : "▶"}</span>
      </button>
      {open && <div className="border-t border-gray-100 px-3 py-2.5">{children}</div>}
    </div>
  );
}
