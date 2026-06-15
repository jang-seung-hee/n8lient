// 이 파일은 회사 관리자 콘솔의 대시보드 홈 화면입니다. (실 Firestore 통계 반영)

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { db } from "@/lib/firebase";
import {
  getCompanyUsers,
  getPendingJoinRequests,
  getCompanyContracts,
  getCompanyRecentSubmissionsCount,
} from "@/features/admin/companyAdminService";

interface StatsData {
  usersCount: number;
  pendingCount: number;
  contractsCount: number;
  submissionsCount: number;
  isSubmissionsFallback: boolean;
}

export default function CompanyAdminHome() {
  const { userDoc, loading: authLoading } = useAuthUser();
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    const clientId = userDoc?.clientId;
    if (!clientId) {
      setLoadingStats(false);
      return;
    }

    const fetchStats = async () => {
      setLoadingStats(true);
      setErrorStats(null);
      try {
        const [users, pendingRequests, contracts, subResult] = await Promise.all([
          getCompanyUsers(db, clientId),
          getPendingJoinRequests(db, clientId),
          getCompanyContracts(db, clientId),
          getCompanyRecentSubmissionsCount(db, clientId, 24),
        ]);

        setStatsData({
          usersCount: users.length,
          pendingCount: pendingRequests.length,
          contractsCount: contracts.length,
          submissionsCount: subResult.count,
          isSubmissionsFallback: subResult.isFallback,
        });
      } catch (err: any) {
        console.error("[CompanyAdminHome] 대시보드 통계 로딩 실패:", err);
        setErrorStats("통계 정보를 불러오지 못했습니다.");
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [userDoc?.clientId, authLoading]);

  // 로딩 상태에 따른 표시값 결정
  const getValue = (key: keyof StatsData | "submissionsCount") => {
    if (loadingStats) return "로딩 중...";
    if (errorStats || !statsData) return "-";
    
    if (key === "usersCount") return `${statsData.usersCount}명`;
    if (key === "pendingCount") return `${statsData.pendingCount}건`;
    if (key === "contractsCount") return `${statsData.contractsCount}개`;
    if (key === "submissionsCount") return `${statsData.submissionsCount}건`;
    return "-";
  };

  const stats = [
    { title: "총 소속 사용자", value: getValue("usersCount"), link: "/company-admin/users", btnText: "목록 보기" },
    { title: "승인 대기 요청", value: getValue("pendingCount"), link: "/company-admin/approvals", btnText: "승인 처리" },
    { title: "계약 자동화 개수", value: getValue("contractsCount"), link: "/company-admin/automations", btnText: "설정 관리" },
    { title: "최근 24시간 실행 결과", value: getValue("submissionsCount"), link: "/company-admin/results", btnText: "로그 보기" },
  ];

  if (!authLoading && !userDoc?.clientId) {
    return (
      <div style={{ padding: "24px", color: "#ef4444", fontWeight: 600 }}>
        ⚠️ 회사 대시보드 권한이 없거나 소속 회사(clientId)가 확인되지 않습니다.
      </div>
    );
  }

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

      {errorStats && (
        <div style={{ backgroundColor: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c", padding: "12px", borderRadius: "6px", fontSize: "13px" }}>
          ⚠️ {errorStats}
        </div>
      )}

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

      {/* Fallback 조회 캡션 */}
      {statsData?.isSubmissionsFallback && (
        <div style={{ fontSize: "11px", color: "#9ca3af", textAlign: "right", marginTop: "-8px" }}>
          ℹ️ 최근 24시간 통계는 정렬 색인 미생성으로 인한 제한 조회 기준입니다.
        </div>
      )}
    </div>
  );
}
