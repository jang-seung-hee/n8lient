// 이 파일은 시스템 운영자가 등록된 고객사 목록을 관리하는 화면입니다. (Mock)

"use client";

import { mockClients } from "@/mocks/mockData";

export default function OperatorClients() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
          🏭 고객사(Clients) 관리
        </h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
          플랫폼을 구독하는 고객사의 코드 발급 및 활성화 상태를 관리합니다.
        </p>
      </div>

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 1fr 1.5fr 1fr",
            padding: "10px 16px",
            backgroundColor: "#f9fafb",
            borderBottom: "1px solid #e5e7eb",
            fontSize: "12px",
            fontWeight: 600,
            color: "#374151",
          }}
        >
          <span>회사명</span>
          <span>회사코드</span>
          <span>회사 ID</span>
          <span>기본 타임존</span>
          <span style={{ textAlign: "right" }}>상태</span>
        </div>

        {mockClients.map((client, idx) => (
          <div
            key={client.clientId}
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr 1fr 1.5fr 1fr",
              padding: "12px 16px",
              borderBottom: idx < mockClients.length - 1 ? "1px solid #f3f4f6" : "none",
              fontSize: "13px",
              color: "#111111",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: 500 }}>{client.companyName}</span>
            <span style={{ fontFamily: "monospace" }}>{client.companyCode}</span>
            <span style={{ fontSize: "11px", color: "#6b7280" }}>{client.clientId}</span>
            <span>{client.defaultTimezone}</span>
            <div style={{ textAlign: "right" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  backgroundColor: client.status === "active" ? "#d1fae5" : "#fee2e2",
                  color: client.status === "active" ? "#065f46" : "#991b1b",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                {client.status === "active" ? "운영중" : "정지"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
