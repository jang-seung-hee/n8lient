"use client";

import React from "react";
import type { UserDoc } from "@/types/n8lient";

interface CompanyUserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserDoc | null;
}

export function CompanyUserDetailModal({ isOpen, onClose, user }: CompanyUserDetailModalProps) {
  if (!isOpen || !user) return null;

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "company_admin":
        return "회사 관리자";
      case "operator":
        return "운영자";
      case "user":
        return "일반 사용자";
      default:
        return role;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return { bg: "#e0f2fe", text: "#0369a1", label: "승인 완료" };
      case "pending":
        return { bg: "#fef3c7", text: "#b45309", label: "승인 대기" };
      case "rejected":
        return { bg: "#fee2e2", text: "#b91c1c", label: "승인 거절" };
      default:
        return { bg: "#f3f4f6", text: "#4b5563", label: status };
    }
  };

  const statusBadge = getStatusBadge(user.approvalStatus);

  return (
    <div className="ux_modal_overlay" onClick={onClose} style={{ backdropFilter: "blur(4px)" }}>
      <div
        className="ux_modal_panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "var(--ux-modal-radius)",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          overflow: "hidden",
          border: "1px solid #e5e7eb",
          animation: "modalFadeIn 0.2s ease-out",
          padding: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f3f4f6",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#f9fafb",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#111111", margin: 0 }}>
            👤 사내 사용자 상세 정보
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "18px",
              color: "#9ca3af",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* 주요 프로필 */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px dashed #e5e7eb", paddingBottom: "16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                fontWeight: 700,
              }}
            >
              {(user.displayName || "U")[0]}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px", fontWeight: 600, color: "#111111" }}>
                  {user.displayName || "이름 없음"}
                </span>
                <span
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 600,
                    backgroundColor: statusBadge.bg,
                    color: statusBadge.text,
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  {statusBadge.label}
                </span>
              </div>
              <span style={{ fontSize: "13px", color: "#6b7280" }}>{user.email}</span>
            </div>
          </div>

          {/* 세부 정보 그리드 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 10px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 500, marginBottom: "3px" }}>역할 (Role)</div>
              <div style={{ fontSize: "13px", color: "#374151", fontWeight: 500 }}>
                {getRoleLabel(user.role)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 500, marginBottom: "3px" }}>소속 회사 코드</div>
              <div style={{ fontSize: "13px", color: "#374151", fontFamily: "monospace" }}>
                {user.clientId || "-"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 500, marginBottom: "3px" }}>부서</div>
              <div style={{ fontSize: "13px", color: "#374151" }}>{user.department || "-"}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 500, marginBottom: "3px" }}>직급</div>
              <div style={{ fontSize: "13px", color: "#374151" }}>{user.position || "-"}</div>
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 500, marginBottom: "3px" }}>연락처</div>
              <div style={{ fontSize: "13px", color: "#374151" }}>{user.phone || "-"}</div>
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 500, marginBottom: "3px" }}>UID (고유식별값)</div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#4b5563",
                  fontFamily: "monospace",
                  backgroundColor: "#f3f4f6",
                  padding: "6px 8px",
                  borderRadius: "4px",
                  wordBreak: "break-all",
                }}
              >
                {user.uid}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 500, marginBottom: "3px" }}>등록 일자</div>
              <div style={{ fontSize: "12.5px", color: "#4b5563" }}>
                {user.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 500, marginBottom: "3px" }}>최근 로그인</div>
              <div style={{ fontSize: "12.5px", color: "#4b5563" }}>
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "-"}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #f3f4f6",
            display: "flex",
            justifyContent: "flex-end",
            backgroundColor: "#f9fafb",
          }}
        >
          <button
            onClick={onClose}
            style={{
              height: "36px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              padding: "0 16px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1d4ed8")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2563eb")}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
