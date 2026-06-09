// 이 파일은 시스템 총괄 운영자의 대시보드 홈 화면입니다. (실 Firestore 통계 반영)

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import {
  getClientsList,
  getWorkflowTemplates,
  getClientContracts,
} from "@/features/operator/operatorService";
import { collection, getDocs } from "firebase/firestore";

export default function OperatorHome() {
  const [clientsCount, setClientsCount] = useState<number | null>(null);
  const [templatesCount, setTemplatesCount] = useState<number | null>(null);
  const [contractsCount, setContractsCount] = useState<number | null>(null);
  const [webhooksCount, setWebhooksCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        // 병렬로 데이터 호출하여 로딩 지연 최소화
        const [clients, templates, contracts, automationsSnap] = await Promise.all([
          getClientsList(db),
          getWorkflowTemplates(db),
          getClientContracts(db),
          getDocs(collection(db, "clientAutomations")),
        ]);

        setClientsCount(clients.length);
        setTemplatesCount(templates.length);
        setContractsCount(contracts.length);
        setWebhooksCount(automationsSnap.size);
      } catch (error) {
        console.error("대시보드 통계 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  const stats = [
    { 
      title: "등록된 고객사 (clients)", 
      value: loading ? "로드 중..." : `${clientsCount ?? 0}개`, 
      link: "/operator/clients" 
    },
    { 
      title: "자동화 템플릿 (templates)", 
      value: loading ? "로드 중..." : `${templatesCount ?? 0}개`, 
      link: "/operator/workflow-templates" 
    },
    { 
      title: "체결된 계약 자동화", 
      value: loading ? "로드 중..." : `${contractsCount ?? 0}건`, 
      link: "/operator/contracts" 
    },
    { 
      title: "연결된 Webhook 수", 
      value: loading ? "로드 중..." : `${webhooksCount ?? 0}개`, 
      link: "/operator/webhooks" 
    },
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
