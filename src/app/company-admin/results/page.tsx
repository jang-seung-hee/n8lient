// 이 파일은 회사 관리자가 소속 구성원들의 모든 자동화 실행 결과 로그를 조회하는 화면입니다.

"use client";

import { useState } from "react";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { ListSearchFilterBar, type FilterField } from "@/components/core/ListSearchFilterBar";
import { CompanyResultDetailModal } from "@/components/custom/CompanyResultDetailModal";
import type { Submission } from "@/types/n8lient";

export default function AdminResults() {
  const { userDoc } = useAuthUser();
  
  // 검색 및 필터 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  // 상세 모달 상태
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filterFields: FilterField[] = [
    {
      key: "status",
      label: "상태",
      options: [
        { value: "success", label: "성공" },
        { value: "processing", label: "처리중" },
        { value: "failed", label: "실패" },
      ],
    },
  ];

  const handleFilterChange = (query: string, filterValues: Record<string, string>) => {
    setSearchQuery(query);
    setFilters(filterValues);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
          📜 N8N 워크플로우 실행 로그
        </h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
          소속 직원들의 N8N 워크플로우 실행 요청 및 최종 응답 결과 기록입니다. 로그 행을 클릭하여 실행 상세 내역을 볼 수 있습니다.
        </p>
      </div>

      {/* 검색 및 필터 UI */}
      <ListSearchFilterBar
        searchPlaceholder="실행 ID, 워크플로우 Key, 실행명 검색..."
        filterFields={filterFields}
        onChange={handleFilterChange}
      />

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "40px 16px",
          textAlign: "center",
          color: "#6b7280",
          fontSize: "14px",
        }}
      >
        실행 로그 기록이 없습니다. (실시간 Firestore 연동 준비 중)
      </div>

      {/* 상세 모달 */}
      <CompanyResultDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        submission={selectedSub}
      />
    </div>
  );
}

