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
    <div style={{ padding: "12px", boxSizing: "border-box" }}>
      <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#111111", marginBottom: "12px" }}>
        📝 회의록 요약 내역 (Mock)
      </h2>

      <input
        type="text"
        placeholder="회의 제목 또는 내용 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          height: "36px",
          borderRadius: "6px",
          border: "1px solid #e5e7eb",
          padding: "0 10px",
          fontSize: "13px",
          marginBottom: "12px",
          outline: "none",
          boxSizing: "border-box",
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filtered.map((note) => (
          <div
            key={note.id}
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "10px 12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#111111" }}>
                {note.title}
              </span>
              <span style={{ fontSize: "11px", color: "#9ca3af" }}>{note.date} ({note.duration})</span>
            </div>
            <p style={{ fontSize: "12px", color: "#4b5563", margin: 0, lineHeight: 1.4 }}>
              {note.summary}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
