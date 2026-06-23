"use client";

import React from "react";
import type { WorkflowTemplate } from "@/types/n8lient";

interface ExecutionTitleFieldProps {
  title: string;
  onChangeTitle: (title: string) => void;
  currentTemplate: WorkflowTemplate | null;
}

/**
 * N8N 자동화 실행 요청 화면에서 실행 제목을 입력하고 
 * 템플릿의 필수 설정 여부에 따라 플레이스홀더를 제공하는 입력 폼 컴포넌트입니다.
 */
export default function ExecutionTitleField({
  title,
  onChangeTitle,
  currentTemplate,
}: ExecutionTitleFieldProps) {
  const isTitleRequired = currentTemplate?.inputSchema?.titleRequired !== false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>
        제목{isTitleRequired ? " *" : ""}
      </label>
      <input
        type="text"
        className="ux_input"
        value={title}
        onChange={(e) => onChangeTitle(e.target.value)}
        placeholder={isTitleRequired ? "예: 5월 카드 지출 내역 정리 요청" : "입력하지 않으면 자동 생성됩니다."}
        required={isTitleRequired}
      />
    </div>
  );
}
