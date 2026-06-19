// 이 파일은 통화 자동 요약(통자요)의 분석 및 히스토리를 확인하는 화면입니다. (Mock)

"use client";

import { useState } from "react";

export default function TongjayoData() {
  const [search, setSearch] = useState("");

  const mockCalls = [
    { id: 1, phone: "010-1234-5678", name: "김민수 고객", summary: "대출 연장 한도 및 이율 문의. 금일 오후 3시 재통화 예정.", time: "10분 전" },
    { id: 2, phone: "010-8765-4321", name: "이영희 고객", summary: "앱 로그인 오류 해결 및 회원 탈퇴 철회 방법 안내 완료.", time: "1시간 전" },
    { id: 3, phone: "010-1111-2222", name: "박철수 고객", summary: "신규 서비스 요금제 출시 정보 문의. 이메일로 제안서 발송함.", time: "어제" },
  ];

  const filtered = mockCalls.filter(
    (c) => c.name.includes(search) || c.summary.includes(search) || c.phone.includes(search)
  );

  return (
    <div style={{ boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 }}>
      <h2 className="ux_section_title" style={{ fontSize: "15px" }}>
        📞 통자요 통화 요약 기록 (Mock)
      </h2>

      {/* 검색 바 */}
      <input
        type="text"
        className="ux_input_compact"
        placeholder="이름, 연락처 또는 요약 내용 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* 목록 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
        {filtered.map((call) => (
          <div
            key={call.id}
            className="ux_card_compact"
            style={{ padding: "10px 12px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", gap: "8px", minWidth: 0, flexWrap: "wrap" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#111111", minWidth: 0, wordBreak: "break-word" }}>
                {call.name} ({call.phone})
              </span>
              <span style={{ fontSize: "11px", color: "#9ca3af" }}>{call.time}</span>
            </div>
            <p style={{ fontSize: "12px", color: "#4b5563", margin: 0, lineHeight: 1.4, wordBreak: "break-word" }}>
              {call.summary}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
