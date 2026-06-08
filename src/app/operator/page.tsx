// 이 파일은 시스템 총괄 운영자의 대시보드 홈 화면입니다. (알파 버전 Mock)

"use client";

import Link from "next/link";

export default function OperatorHome() {
  const stats = [
    { title: "등록된 고객사 (clients)", value: "1개", link: "/operator/clients" },
    { title: "자동화 템플릿 (templates)", value: "2개", link: "/operator/workflow-templates" },
    { title: "체결된 계약 자동화", value: "1건", link: "/operator/contracts" },
    { title: "연결된 Webhook 수", value: "2개", link: "/operator/webhooks" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
          🔧 시스템 운영 대시보드
        </h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
          엔팔라이언트 플랫폼 전체 고객사 및 자동화 템플릿 계약 상태 관리용 콘솔입니다.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        {stats.map((stat, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "20px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", margin: "0 0 6px 0" }}>
                {stat.title}
              </p>
              <h3 style={{ fontSize: "28px", fontWeight: 700, color: "#111111", margin: 0 }}>
                {stat.value}
              </h3>
            </div>
            <Link
              href={stat.link}
              style={{
                fontSize: "12px",
                color: "#2563eb",
                textDecoration: "none",
                fontWeight: 600,
                alignSelf: "flex-start",
              }}
            >
              상세 보기 &rarr;
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
