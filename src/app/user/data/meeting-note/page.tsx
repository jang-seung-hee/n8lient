// 이 파일은 회의록 자동 정리의 히스토리를 확인하는 화면입니다. (Mock)

"use client";

import { useState } from "react";

export default function MeetingNoteData() {
  const [search, setSearch] = useState("");

  const mockNotes = [
    { id: 1, title: "6월 1주차 주간 회의", date: "2026-06-05", summary: "MVP 알파 버전 마일스톤 점검. 1B 완료 후 1C 기능 및 데이터 검증 진행 중.", duration: "45분" },
    { id: 2, title: "마케팅 전략 수립 회의", date: "2026-06-03", summary: "B2B 타겟형 광고 집행 계획 수립. 랜딩 페이지 트래픽 모니터링 툴 도입 확정.", duration: "1시간" },
  ];

  const filtered = mockNotes.filter(
    (n) => n.title.includes(search) || n.summary.includes(search)
  );

  return (
    <div style={{ boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 }}>
      <h2 className="ux_section_title" style={{ fontSize: "15px" }}>
        📝 회의록 요약 내역 (Mock)
      </h2>

      <input
        type="text"
        className="ux_input_compact"
        placeholder="회의 제목 또는 내용 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
        {filtered.map((note) => (
          <div
            key={note.id}
            className="ux_card_compact"
            style={{ padding: "10px 12px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", gap: "8px", minWidth: 0, flexWrap: "wrap" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#111111", minWidth: 0, wordBreak: "break-word" }}>
                {note.title}
              </span>
              <span style={{ fontSize: "11px", color: "#9ca3af" }}>{note.date} ({note.duration})</span>
            </div>
            <p style={{ fontSize: "12px", color: "#4b5563", margin: 0, lineHeight: 1.4, wordBreak: "break-word" }}>
              {note.summary}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
