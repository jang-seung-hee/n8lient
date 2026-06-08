// 이 파일은 회사 관리자가 소속 신청을 보낸 대기 중인 사용자를 승인하거나 거절하는 가입 승인 화면입니다.

"use client";

import { useEffect, useState } from "react";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { db } from "@/lib/firebase";
import {
  getPendingJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
} from "@/features/admin/companyAdminService";
import type { CompanyJoinRequest } from "@/types/n8lient";
import { ListSearchFilterBar } from "@/components/core/ListSearchFilterBar";

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
  const filteredRequests = requests.filter((req) => {
    const name = req.displayName || "이름 없음";
    const email = req.email || "";
    const code = req.requestedCompanyCode || "";
    const date = req.requestedAt ? new Date(req.requestedAt).toLocaleString() : "";

    const matchSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      date.toLowerCase().includes(searchQuery.toLowerCase());

    return matchSearch;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
          👤 가입 승인 대기 목록
        </h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
          회사코드를 입력해 가입 승인을 대기 중인 사용자를 승인하거나 거절 처리합니다.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
          가입 요청 목록을 불러오는 중...
        </div>
      ) : requests.length === 0 ? (
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            padding: "40px 16px",
            textAlign: "center",
            color: "#6b7280",
            fontSize: "13.5px",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
          }}
        >
          현재 승인 대기 중인 가입요청이 없습니다.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <ListSearchFilterBar
            searchPlaceholder="이름, 이메일, 요청 코드 검색..."
            filterFields={[]}
            onChange={(query) => setSearchQuery(query)}
          />

          {filteredRequests.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#9ca3af", backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "6px" }}>
              검색 조건과 일치하는 승인 대기자가 없습니다.
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                overflow: "hidden",
                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
              }}
            >
              {/* 테이블 헤더 */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 2fr 1.2fr 1.8fr 1fr",
                  padding: "10px 16px",
                  backgroundColor: "#f9fafb",
                  borderBottom: "1px solid #e5e7eb",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                <span>신청인</span>
                <span>이메일</span>
                <span>입력 코드</span>
                <span>신청 일시</span>
                <span style={{ textAlign: "right" }}>작업</span>
              </div>

              {/* 목록 */}
              {filteredRequests.map((req, idx) => (
                <div
                  key={req.requestId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.5fr 2fr 1.2fr 1.8fr 1fr",
                    padding: "12px 16px",
                    borderBottom: idx < filteredRequests.length - 1 ? "1px solid #f3f4f6" : "none",
                    fontSize: "13px",
                    color: "#111111",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "#111827" }}>{req.displayName || "이름 없음"}</span>
                  <span style={{ color: "#4b5563" }}>{req.email}</span>
                  <span style={{ fontFamily: "monospace", color: "#374151" }}>{req.requestedCompanyCode}</span>
                  <span style={{ color: "#6b7280" }}>
                    {new Date(req.requestedAt).toLocaleString()}
                  </span>
                  <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => handleApprove(req.requestId)}
                      disabled={actionLoading !== null}
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
