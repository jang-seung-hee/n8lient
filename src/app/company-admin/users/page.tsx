// 이 파일은 회사 관리자가 소속 승인 완료된 사용자 목록을 조회하는 화면입니다.

"use client";

import { useEffect, useState } from "react";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { db } from "@/lib/firebase";
import { getCompanyUsers } from "@/features/admin/companyAdminService";
import type { UserDoc } from "@/types/n8lient";

export default function AdminUsers() {
  const { userDoc } = useAuthUser();
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
          👥 사내 승인 완료 사용자 목록
        </h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
          회사코드 인증에 성공하여 업무 자동화 시스템 권한이 부여된 사용자 목록입니다.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
          사용자 목록을 불러오는 중...
        </div>
      ) : users.length === 0 ? (
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
          가입된 사내 사용자가 없습니다.
        </div>
      ) : (
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {/* 테이블 헤더 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 2fr 1.5fr 1.5fr",
              padding: "10px 16px",
              backgroundColor: "#f9fafb",
              borderBottom: "1px solid #e5e7eb",
              fontSize: "12px",
              fontWeight: 600,
              color: "#374151",
            }}
          >
            <span>이름</span>
            <span>이메일</span>
            <span>역할 (Role)</span>
            <span>승인일자 / 가입일자</span>
          </div>

          {/* 목록 */}
          {users.map((u, idx) => (
            <div
              key={u.uid}
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 2fr 1.5fr 1.5fr",
                padding: "12px 16px",
                borderBottom: idx < users.length - 1 ? "1px solid #f3f4f6" : "none",
                fontSize: "13px",
                color: "#111111",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 500 }}>{u.displayName || "이름 없음"}</span>
              <span style={{ color: "#4b5563" }}>{u.email}</span>
              <span
                style={{
                  color: u.role === "company_admin" ? "#2563eb" : "#4b5563",
                  fontWeight: u.role === "company_admin" ? 600 : 400,
                }}
              >
                {u.role === "company_admin" ? "관리자" : "일반 사용자"}
              </span>
              <span style={{ color: "#6b7280" }}>
                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
