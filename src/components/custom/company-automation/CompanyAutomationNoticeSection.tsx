"use client";

import React from "react";

interface CompanyAutomationNoticeSectionProps {
  noticeText: string;
  onChangeNoticeText: (text: string) => void;
}

/**
 * 회사 관리자 워크플로우 설정 화면에서 
 * 사내 일반 사용자들에게 보여줄 사용 방법 안내문을 편집 및 설정하는 영역 컴포넌트입니다.
 */
export default function CompanyAutomationNoticeSection({
  noticeText,
  onChangeNoticeText,
}: CompanyAutomationNoticeSectionProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label className="ux_label" style={{ fontSize: "12px", color: "#4b5563" }}>
        사용방법 안내
      </label>
      <span style={{ fontSize: "11px", color: "#6b7280", marginTop: "-2px", marginBottom: "2px" }}>
        사용자가 이 워크플로우를 실행하기 전에 확인할 안내 문구입니다. 비워두면 사용자 화면에 표시되지 않습니다.
      </span>
      <textarea
        className="ux_textarea"
        value={noticeText}
        onChange={(e) => onChangeNoticeText(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="예: 음성 파일은 20MB 이하로 업로드해 주세요. 결과는 이메일과 실행 결과 화면에서 확인할 수 있습니다."
      />
      <span style={{ fontSize: "11px", color: "#9ca3af", textAlign: "right" }}>
        {noticeText.length}/2000
      </span>
    </div>
  );
}
