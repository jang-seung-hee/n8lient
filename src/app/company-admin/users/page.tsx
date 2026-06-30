// 이 파일은 회사 관리자가 소속 승인 완료된 사용자 목록을 조회하는 화면입니다.
// 한국어 주석 표준을 준수합니다.

"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { db } from "@/lib/firebase";
import { getCompanyUsers } from "@/features/admin/companyAdminService";
import type { UserDoc } from "@/types/n8lient";
import { ListSearchFilterBar, type FilterField } from "@/components/core/ListSearchFilterBar";
import { CompanyUserDetailModal } from "@/components/custom/CompanyUserDetailModal";
import { N8lientDataGrid } from "@/components/common/data/N8lientDataGrid";
import { N8lientStatusBadge } from "@/components/common/data/N8lientStatusBadge";
import { N8lientLoadingState } from "@/components/common/data/N8lientLoadingState";
import { N8lientEmptyState } from "@/components/common/data/N8lientEmptyState";
import { ColumnDef } from "@tanstack/react-table";

export default function AdminUsers() {
  const { userDoc } = useAuthUser();
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // 검색 및 필터 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  // 상세 모달 상태
  const [selectedUser, setSelectedUser] = useState<UserDoc | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      if (!userDoc?.clientId) return;
      setLoading(true);
      try {
        const data = await getCompanyUsers(db, userDoc.clientId);
        setUsers(data);
      } catch (error) {
        console.error("회사 사용자 목록 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, [userDoc]);

  // 필터 설정 정의
  const filterFields: FilterField[] = [
    {
      key: "role",
      label: "역할",
      options: [
        { value: "company_admin", label: "관리자" },
        { value: "user", label: "일반 사용자" },
      ],
    },
  ];

  const handleFilterChange = (query: string, filterValues: Record<string, string>) => {
    setSearchQuery(query);
    setFilters(filterValues);
  };

  // 클라이언트 측 검색/필터 적용
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const searchLower = searchQuery.toLowerCase();
      const nameMatch = (u.displayName || "").toLowerCase().includes(searchLower);
      const emailMatch = (u.email || "").toLowerCase().includes(searchLower);
      const uidMatch = (u.uid || "").toLowerCase().includes(searchLower);
      const queryMatch = nameMatch || emailMatch || uidMatch;

      const roleFilter = filters.role;
      const roleMatch = !roleFilter || u.role === roleFilter;

      return queryMatch && roleMatch;
    });
  }, [users, searchQuery, filters]);

  const handleRowClick = (user: UserDoc) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  // TanStack Table 용 ColumnDef 스키마 정의
  const gridColumns = useMemo<ColumnDef<UserDoc>[]>(() => {
    return [
      {
        accessorKey: "displayName",
        header: "이름",
        cell: ({ row }) => (
          <span style={{ fontWeight: 500 }}>
            {row.original.displayName || "이름 없음"}
          </span>
        ),
      },
      {
        accessorKey: "email",
        header: "이메일",
      },
      {
        accessorKey: "role",
        header: "역할 (Role)",
        cell: ({ row }) => {
          const role = row.original.role;
          return (
            <N8lientStatusBadge type={role === "company_admin" ? "company" : "private"}>
              {role === "company_admin" ? "관리자" : "일반 사용자"}
            </N8lientStatusBadge>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "가입일자",
        cell: ({ row }) => {
          const created = row.original.createdAt;
          return created ? new Date(created).toLocaleDateString("ko-KR") : "-";
        },
      },
    ];
  }, []);

  return (
    <div className="ux_page_layout" style={{ gap: "20px", display: "flex", flexDirection: "column" }}>
      <div className="ux_page_header">
        <h2 className="ux_page_title" style={{ fontSize: "18px", margin: "0 0 4px 0" }}>
          👥 사내 승인 완료 사용자 목록
        </h2>
        <p className="ux_caption" style={{ margin: 0 }}>
          회사코드 인증에 성공하여 업무 자동화 시스템 권한이 부여된 사용자 목록입니다. 목록을 클릭하여 상세 정보를 볼 수 있습니다.
        </p>
      </div>

      {/* 검색 및 필터 바 */}
      <ListSearchFilterBar
        searchPlaceholder="이름, 이메일, UID로 검색..."
        filterFields={filterFields}
        onChange={handleFilterChange}
      />

      {/* 목록 테이블 데이터 그리드 적용 */}
      {loading ? (
        <N8lientLoadingState message="사용자 목록을 불러오는 중..." />
      ) : filteredUsers.length === 0 ? (
        <N8lientEmptyState
          title={users.length === 0 ? "가입된 사내 사용자가 없습니다." : "검색 조건에 일치하는 사용자가 없습니다."}
          description="필터링 검색어 조건을 확인해 주세요."
        />
      ) : (
        <N8lientDataGrid
          data={filteredUsers}
          columns={gridColumns}
          getRowId={(row) => row.uid}
          loading={loading}
          onRowClick={handleRowClick}
        />
      )}

      {/* 상세 모달 */}
      <CompanyUserDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
      />
    </div>
  );
}

