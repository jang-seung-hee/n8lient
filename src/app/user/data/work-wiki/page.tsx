// 이 파일은 회사 내부 업무위키 가이드를 보여주는 화면입니다. (Mock)

"use client";

import { useState } from "react";

export default function WorkWikiData() {
  const [search, setSearch] = useState("");

  const mockWikis = [
    { id: 1, category: "인사", title: "휴가 신청 가이드라인", content: "휴가 신청은 최소 3일 전 사내 인트라넷에 입력 후 슬랙으로 팀장 승인을 받아야 효력이 발생합니다.", lastUpdated: "2026-05-20" },
    { id: 2, category: "재무", title: "법인카드 정산 기준", content: "식대는 인당 최대 15,000원 제한이며, 5만원 이상 결제 시 영수증과 결의서 사본이 필수적으로 요구됩니다.", lastUpdated: "2026-06-02" },
  ];

  const filtered = mockWikis.filter(
    (w) => w.title.includes(search) || w.content.includes(search) || w.category.includes(search)
  );

  return (
    <div style={{ boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 }}>
      <h2 className="ux_section_title" style={{ fontSize: "15px" }}>
        📖 사내 업무위키 정보 (Mock)
      </h2>

      <input
        type="text"
        className="ux_input_compact"
        placeholder="카테고리, 제목 또는 위키 내용 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
        {filtered.map((wiki) => (
          <div
            key={wiki.id}
            className="ux_card_compact"
            style={{ padding: "10px 12px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", alignItems: "center", gap: "8px", minWidth: 0, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, flex: "1 1 auto" }}>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 600,
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    padding: "2px 4px",
                    borderRadius: "4px",
                  }}
                >
                  {wiki.category}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#111111", wordBreak: "break-word" }}>
                  {wiki.title}
                </span>
              </div>
              <span style={{ fontSize: "11px", color: "#9ca3af" }}>{wiki.lastUpdated}</span>
            </div>
            <p style={{ fontSize: "12px", color: "#4b5563", margin: 0, lineHeight: 1.4, wordBreak: "break-word" }}>
              {wiki.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
