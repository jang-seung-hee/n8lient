// 이 파일은 회사 관리자가 소속 신청을 보낸 대기 중인 사용자를 승인하거나 거절하는 가입 승인 화면입니다.
// 한국어 주석 표준을 준수합니다.

"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { db } from "@/lib/firebase";
import {
  getPendingJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
} from "@/features/admin/companyAdminService";
import type { CompanyJoinRequest, JoinRequestSource } from "@/types/n8lient";
import { ListSearchFilterBar } from "@/components/core/ListSearchFilterBar";
import { N8lientDataGrid } from "@/components/common/data/N8lientDataGrid";
import { N8lientLoadingState } from "@/components/common/data/N8lientLoadingState";
import { N8lientEmptyState } from "@/components/common/data/N8lientEmptyState";
import { ColumnDef } from "@tanstack/react-table";

function getRequestedDisplayName(req: CompanyJoinRequest): string {
  return req.requestedDisplayName || req.displayName || req.googleDisplayName || "이름 없음";
}

function getGoogleDisplayName(req: CompanyJoinRequest): string {
  return req.googleDisplayName || req.displayName || "—";
}

function getGoogleEmail(req: CompanyJoinRequest): string {
  return req.googleEmail || req.email || "—";
}

function getJoinSourceLabel(source?: JoinRequestSource): string {
  if (source === "invite_link") return "초대링크";
  if (source === "manual_code") return "직접 회사코드 입력";
  return "—";
}

export default function AdminApprovals() {
  const { user, userDoc } = useAuthUser();
  const [requests, setRequests] = useState<CompanyJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 검색 상태
  const [searchQuery, setSearchQuery] = useState("");

  const loadRequests = async () => {
    if (!userDoc?.clientId) return;
    setLoading(true);
    try {
      const data = await getPendingJoinRequests(db, userDoc.clientId);
      setRequests(data);
    } catch (error) {
      console.error("가입요청 데이터 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [userDoc]);

  const handleApprove = async (requestId: string) => {
    if (!user) return;
    if (!confirm("해당 사용자의 가입을 승인하시겠습니까?")) return;
    
    setActionLoading(requestId);
    try {
      const res = await approveJoinRequest(db, requestId, user.uid);
      if (res.success) {
        alert("성공적으로 승인 처리되었습니다.");
        loadRequests();
      } else {
        alert(`승인 실패: ${res.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("승인 처리 중 에러가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!user) return;
    if (!confirm("해당 사용자의 가입을 거절하시겠습니까?")) return;
    
    const reason = prompt("거절 사유를 입력해 주십시오:", "회사 코드 불일치");
    if (reason === null) return; // 취소 누른 경우

    setActionLoading(requestId);
    try {
      const res = await rejectJoinRequest(db, requestId, user.uid, reason);
      if (res.success) {
        alert("가입 요청이 거절 처리되었습니다.");
        loadRequests();
      } else {
        alert(`거절 실패: ${res.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("거절 처리 중 에러가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  };

  // 프론트엔드 필터링 적용
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const requestedName = getRequestedDisplayName(req);
      const googleName = getGoogleDisplayName(req);
      const email = getGoogleEmail(req);
      const code = req.requestedCompanyCode || "";
      const sourceLabel = getJoinSourceLabel(req.source);
      const date = req.requestedAt ? new Date(req.requestedAt).toLocaleString() : "";
      const q = searchQuery.toLowerCase();

      return (
        requestedName.toLowerCase().includes(q) ||
        googleName.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        sourceLabel.toLowerCase().includes(q) ||
        date.toLowerCase().includes(q)
      );
    });
  }, [requests, searchQuery]);

  // TanStack Table 용 ColumnDef 설계
  const gridColumns = useMemo<ColumnDef<CompanyJoinRequest>[]>(() => {
    return [
      {
        accessorFn: getRequestedDisplayName,
        header: "신청 성명",
        cell: ({ row }) => (
          <span style={{ fontWeight: 600, color: "#111827" }}>
            {getRequestedDisplayName(row.original)}
          </span>
        ),
      },
      {
        accessorFn: getGoogleDisplayName,
        header: "Google 이름",
      },
      {
        accessorFn: getGoogleEmail,
        header: "Google 이메일",
        cell: ({ row }) => (
          <span style={{ wordBreak: "break-all" }}>
            {getGoogleEmail(row.original)}
          </span>
        ),
      },
      {
        accessorFn: (row) => getJoinSourceLabel(row.source),
        header: "신청 경로",
        cell: ({ row }) => (
          <span style={{ color: "#6b7280", fontSize: "12px" }}>
            {getJoinSourceLabel(row.original.source)}
          </span>
        ),
      },
      {
        accessorKey: "requestedCompanyCode",
        header: "코드",
        cell: ({ row }) => (
          <span style={{ fontFamily: "monospace", color: "#374151" }}>
            {row.original.requestedCompanyCode}
          </span>
        ),
      },
      {
        accessorKey: "requestedAt",
        header: "신청 일시",
        cell: ({ row }) => {
          const reqAt = row.original.requestedAt;
          return (
            <span style={{ color: "#6b7280", fontSize: "12px" }}>
              {reqAt ? new Date(reqAt).toLocaleString() : "-"}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "작업",
        cell: ({ row }) => {
          const req = row.original;
          return (
            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
              <button
                onClick={() => handleApprove(req.requestId)}
                disabled={actionLoading !== null}
                className="ux_button_compact"
                style={{
                  backgroundColor: "#10b981",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "5px 10px",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontWeight: 600,
                  boxShadow: "0 1px 2px 0 rgba(16, 185, 129, 0.2)",
                }}
              >
                {actionLoading === req.requestId ? "처리중" : "승인"}
              </button>
              <button
                onClick={() => handleReject(req.requestId)}
                disabled={actionLoading !== null}
                className="ux_button_compact"
                style={{
                  backgroundColor: "#ef4444",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "5px 10px",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontWeight: 600,
                  boxShadow: "0 1px 2px 0 rgba(239, 68, 68, 0.2)",
                }}
              >
                {actionLoading === req.requestId ? "처리중" : "거절"}
              </button>
            </div>
          );
        },
      },
    ];
  }, [actionLoading]);

  return (
    <div className="ux_page_layout" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="ux_page_header">
        <h2 className="ux_page_title" style={{ fontSize: "18px", margin: "0 0 4px 0" }}>
          👤 가입 승인 대기 목록
        </h2>
        <p className="ux_caption" style={{ margin: 0 }}>
          회사코드를 입력해 가입 승인을 대기 중인 사용자를 승인하거나 거절 처리합니다.
        </p>
      </div>

      {loading ? (
        <N8lientLoadingState message="가입 요청 목록을 불러오는 중..." />
      ) : requests.length === 0 ? (
        <N8lientEmptyState
          title="현재 승인 대기 중인 가입요청이 없습니다."
          description="임시 신청 내역이나 신규 가입 대기 발생을 기다려 주세요."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <ListSearchFilterBar
            searchPlaceholder="신청 성명, Google 이름, 이메일, 코드, 경로 검색..."
            filterFields={[]}
            onChange={(query) => setSearchQuery(query)}
          />

          <N8lientDataGrid
            data={filteredRequests}
            columns={gridColumns}
            getRowId={(row) => row.requestId}
            loading={loading}
            emptyTitle="검색 조건과 일치하는 승인 대기자가 없습니다."
            emptyDescription="검색어 철자 또는 필터 조건 값을 확인해 주세요."
            storageKey="company-admin-approvals-page-size"
          />
        </div>
      )}
    </div>
  );
}
