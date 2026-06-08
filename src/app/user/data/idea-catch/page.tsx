// 이 파일은 수집된 비즈니스 아이디어 히스토리를 확인하는 화면입니다. (Mock)

"use client";

import { useState } from "react";

export default function IdeaCatchData() {
  const [search, setSearch] = useState("");

  const mockIdeas = [
    { id: 1, title: "n8n 기반 B2B 메신저 연동 자동화", tags: "n8n, 메신저", desc: "고객사의 업무 메신저(슬랙, 잔디)에 n8n 에이전트를 연동하여 실행 상태를 브리핑하는 모듈 개발 아이디어.", date: "2026-06-04" },
    { id: 2, title: "소상공인용 매출 레포트 자동화", tags: "매출, 구글시트", desc: "매출 원장을 드라이브에 올리면 Gemini가 표 분석 후 한 줄 뉴스레터 형태로 자동 요약하는 서비스.", date: "2026-06-01" },
  ];

  const filtered = mockIdeas.filter(
    (i) => i.title.includes(search) || i.desc.includes(search) || i.tags.includes(search)
  );

  return (
    <div style={{ padding: "12px", boxSizing: "border-box" }}>
      <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#111111", marginBottom: "12px" }}>
        💡 아이디어 캐치 아카이브 (Mock)
      </h2>

      <input
        type="text"
        placeholder="제목, 내용 또는 태그 검색"
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
        {filtered.map((idea) => (
          <div
            key={idea.id}
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "10px 12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#111111" }}>
                {idea.title}
              </span>
              <span style={{ fontSize: "11px", color: "#9ca3af" }}>{idea.date}</span>
            </div>
            <p style={{ fontSize: "12px", color: "#4b5563", margin: "0 0 6px 0", lineHeight: 1.4 }}>
              {idea.desc}
            </p>
            <span
              style={{
                fontSize: "10px",
                backgroundColor: "#eff6ff",
                color: "#1d4ed8",
                padding: "2px 6px",
                borderRadius: "4px",
                fontWeight: 500,
              }}
            >
              🏷️ {idea.tags}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
