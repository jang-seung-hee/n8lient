// 이 파일은 회사 관리자 콘솔의 대시보드 홈 화면입니다. (알파 버전 Mock 통계)

"use client";

import Link from "next/link";
import { useAuthUser } from "@/features/auth/useAuthUser";

export default function CompanyAdminHome() {
  const { userDoc } = useAuthUser();

  const stats = [
    { title: "총 소속 사용자", value: "3명", link: "/company-admin/users", btnText: "목록 보기" },
    { title: "승인 대기 요청", value: "1건", link: "/company-admin/approvals", btnText: "승인 처리" },
    { title: "계약 자동화 개수", value: "1개", link: "/company-admin/automations", btnText: "설정 관리" },
    { title: "최근 24시간 실행 결과", value: "4건", link: "/company-admin/results", btnText: "로그 보기" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
          회사 대시보드 요약
        </h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
          {userDoc?.clientId === "client_rentaltoktok_001" ? "렌탈톡톡" : userDoc?.clientId} 회사의 업무 자동화 운영 요약 정보입니다.
        </p>
      </div>

      {/* 통계 카드 그리드 */}
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
              {stat.btnText} &rarr;
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
