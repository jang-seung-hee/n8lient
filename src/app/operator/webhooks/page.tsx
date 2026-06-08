// 이 파일은 시스템 운영자가 n8n 워크플로우 Webhook 연결 정보를 확인하고 관리하는 화면입니다. (Mock)

"use client";

export default function OperatorWebhooks() {
  const mockWebhooks = [
    { id: "webhook_001", name: "지출결의서 자동 정리 Webhook", key: "expense-report", endpoint: "https://n8n.example.com/webhook/expense-report", active: true },
    { id: "webhook_002", name: "통화 자동 요약 Webhook", key: "tongjayo", endpoint: "https://n8n.example.com/webhook/tongjayo", active: true },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
          🔗 n8n Webhook 관리
        </h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
          각 자동화 종류에 맵핑된 n8n 웹훅 엔드포인트 수신 URL 정보를 매핑 및 관리합니다.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {mockWebhooks.map((webhook) => (
          <div
            key={webhook.id}
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #f3f4f6",
                paddingBottom: "10px",
                marginBottom: "12px",
              }}
            >
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#111111", margin: 0 }}>
                  {webhook.name}
                </h3>
                <p style={{ fontSize: "11px", color: "#9ca3af", margin: "2px 0 0 0" }}>
                  Key: {webhook.key} · ID: {webhook.id}
                </p>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  backgroundColor: webhook.active ? "#d1fae5" : "#fee2e2",
                  color: webhook.active ? "#065f46" : "#991b1b",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                {webhook.active ? "연결 활성" : "연결 유실"}
              </span>
            </div>

            <div style={{ fontSize: "12px", color: "#4b5563" }}>
              <p style={{ margin: "0 0 4px 0", fontWeight: 600 }}>엔드포인트 URL (마스킹)</p>
              <code
                style={{
                  display: "block",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #f3f4f6",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontFamily: "monospace",
                  color: "#2563eb",
                  wordBreak: "break-all",
                }}
              >
                {webhook.endpoint.slice(0, 26)}********************
              </code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
