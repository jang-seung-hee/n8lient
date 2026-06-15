// 이 파일은 시스템 운영자가 고객사의 최초 회사 관리자(company_admin) 승인 요청을 검토하고 승인/제거하는 관리 패널 컴포넌트입니다.
// 한국어 주석 표준을 준수합니다.

"use client";

import { useEffect, useState } from "react";
import type { Firestore } from "firebase/firestore";
import type { ClientDoc, CompanyJoinRequest } from "@/types/n8lient";
import {
  getPendingAdminJoinRequests,
  approveCompanyAdminRequest,
  removeCompanyAdmin,
} from "@/features/operator/adminBootstrapService";

interface ClientAdminPanelProps {
  client: ClientDoc;
  db: Firestore;
  operatorUid: string;
  onRefresh: () => void;
}

export function ClientAdminPanel({
  client,
  db,
  operatorUid,
  onRefresh,
}: ClientAdminPanelProps) {
  const [requests, setRequests] = useState<CompanyJoinRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 대기 중인 관리자 승인 요청 조회
  const loadRequests = async () => {
    setLoadingRequests(true);
    setErrorMessage(null);
    try {
      const data = await getPendingAdminJoinRequests(db, client.clientId);
      setRequests(data);
    } catch (err: any) {
      console.error("[ClientAdminPanel] 요청 로드 실패:", err);
      setErrorMessage("가입 승인 요청 목록을 불러오지 못했습니다.");
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [client.clientId]);

  // 관리자 승인 처리
  const handleApprove = async (requestId: string) => {
    if (!window.confirm("해당 사용자를 이 고객사의 최초 회사 관리자(company_admin)로 승인하시겠습니까?\n승인 시 해당 사용자의 역할이 회사 관리자로 승격됩니다.")) {
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await approveCompanyAdminRequest(db, requestId, operatorUid);
      if (res.success) {
        alert("성공적으로 회사 관리자로 승인되었습니다.");
        onRefresh();
        loadRequests();
      } else {
        setErrorMessage(res.message || "승인 처리 중 오류가 발생했습니다.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "승인 처리 중 오류가 발생했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  // 관리자 제거 처리
  const handleRemove = async () => {
    if (!client.ownerAdminUid) return;
    if (!window.confirm("정말로 등록된 회사 관리자를 제거하시겠습니까?\n제거 시 기존 관리자는 일반 사용자(user)로 역할이 변경됩니다.")) {
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await removeCompanyAdmin(db, client.clientId, operatorUid);
      if (res.success) {
        alert("회사 관리자가 제거되었습니다. 이제 새로운 최초 관리자 승인이 가능합니다.");
        onRefresh();
        loadRequests();
      } else {
        setErrorMessage(res.message || "관리자 제거 처리 중 오류가 발생했습니다.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "관리자 제거 처리 중 오류가 발생했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "20px",
        marginTop: "12px",
      }}
    >
      <h3
        style={{
          fontSize: "14px",
          fontWeight: 700,
          color: "#111111",
          margin: "0 0 16px 0",
          borderBottom: "1px solid #f3f4f6",
          paddingBottom: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>🔑 회사 관리자 승인 및 제거 정책 관리</span>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            padding: "2px 6px",
            borderRadius: "4px",
            backgroundColor: client.ownerAdminUid ? "#d1fae5" : "#fef3c7",
            color: client.ownerAdminUid ? "#065f46" : "#d97706",
          }}
        >
          {client.ownerAdminUid ? "활성화됨 (Completed)" : "관리자 없음 (Pending Setup)"}
        </span>
      </h3>

      {errorMessage && (
        <div
          style={{
            backgroundColor: "#fee2e2",
            border: "1px solid #fca5a5",
            borderRadius: "6px",
            padding: "10px 12px",
            fontSize: "12.5px",
            color: "#b91c1c",
            marginBottom: "16px",
            lineHeight: 1.4,
          }}
        >
          ⚠️ {errorMessage}
        </div>
      )}

      {/* 1. 현재 관리자가 지정되어 있는 경우 */}
      {client.ownerAdminUid ? (
        <div
          style={{
            backgroundColor: "#f9fafb",
            borderRadius: "6px",
            padding: "16px",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: 600, color: "#374151" }}>
                현재 등록된 회사 관리자 정보
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12.5px", color: "#4b5563" }}>
                <div>
                  <strong>이름:</strong> {client.ownerAdminDisplayName || "미지정"}
                </div>
                <div>
                  <strong>이메일:</strong> {client.ownerAdminEmail || "미지정"}
                </div>
                <div>
                  <strong>UID:</strong> <span style={{ fontFamily: "monospace" }}>{client.ownerAdminUid}</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleRemove}
              disabled={actionLoading}
              style={{
                backgroundColor: "#ef4444",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                padding: "8px 14px",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: actionLoading ? "not-allowed" : "pointer",
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!actionLoading) e.currentTarget.style.backgroundColor = "#dc2626";
              }}
              onMouseLeave={(e) => {
                if (!actionLoading) e.currentTarget.style.backgroundColor = "#ef4444";
              }}
            >
              {actionLoading ? "제거 중..." : "🚨 회사 관리자 제거 (강등)"}
            </button>
          </div>
          <p style={{ margin: "12px 0 0 0", fontSize: "11.5px", color: "#6b7280", lineHeight: 1.4 }}>
            * 회사 관리자를 제거(강등)하면 해당 사용자는 일반 사용자(user)로 역할이 강등되며, 이 회사는 다시 최초 관리자 신청을 받을 수 있는 상태(pending)로 초기화됩니다. (1회사 1관리자 정책 준수)
          </p>
        </div>
      ) : (
        /* 2. 관리자가 지정되지 않은 경우 (가입 승인 대기 리스트 조회) */
        <div>
          <p style={{ fontSize: "13px", color: "#4b5563", marginBottom: "12px", lineHeight: 1.45 }}>
            현재 이 회사에는 등록된 회사 관리자가 없습니다. 사용자가 가입코드를 입력해 요청한 <strong>최초 회사 관리자(company_admin) 승인 요청</strong> 목록이 아래에 표시됩니다.
          </p>

          {loadingRequests ? (
            <div style={{ textAlign: "center", padding: "24px 0", fontSize: "13px", color: "#9ca3af" }}>
              🔄 가입 요청 목록 조회 중...
            </div>
          ) : requests.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "32px 0",
                backgroundColor: "#f9fafb",
                border: "1px dashed #d1d5db",
                borderRadius: "6px",
                fontSize: "13px",
                color: "#6b7280",
              }}
            >
              📭 현재 대기 중인 최초 회사 관리자 승인 요청이 없습니다.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {requests.map((req) => (
                <div
                  key={req.requestId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    backgroundColor: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "13.5px", fontWeight: 600, color: "#111111" }}>
                      {req.displayName}
                    </span>
                    <span style={{ fontSize: "12px", color: "#4b5563" }}>{req.email}</span>
                    <span style={{ fontSize: "11px", color: "#9ca3af", fontFamily: "monospace" }}>
                      UID: {req.uid} · 신청일시: {new Date(req.requestedAt).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleApprove(req.requestId)}
                    disabled={actionLoading}
                    style={{
                      backgroundColor: "#10b981",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "8px 14px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      cursor: actionLoading ? "not-allowed" : "pointer",
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!actionLoading) e.currentTarget.style.backgroundColor = "#059669";
                    }}
                    onMouseLeave={(e) => {
                      if (!actionLoading) e.currentTarget.style.backgroundColor = "#10b981";
                    }}
                  >
                    {actionLoading ? "승인 중..." : "✅ 관리자로 승인"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
