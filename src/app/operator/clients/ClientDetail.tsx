// 이 파일은 선택된 고객사의 상세 정보 및 메타데이터 설정을 확인하는 상세 조회 컴포넌트입니다.
// 소유자 Admin UID를 기반으로 users 컬렉션에서 관리자 이메일 및 이름을 비동기 조회하여 표시합니다.

"use client";

import { useEffect, useState } from "react";
import type { ClientDoc } from "@/types/n8lient";
import { db } from "@/lib/firebase";
import { collection, query, where, limit, getDocs } from "firebase/firestore";

import type { Firestore } from "firebase/firestore";
import { ClientAdminPanel } from "./components/ClientAdminPanel";

interface ClientDetailProps {
  client: ClientDoc;
  db: Firestore;
  operatorUid: string;
  onRefresh: () => void;
  onEditClick: () => void;
  onBackClick: () => void;
}

interface AdminInfo {
  displayName: string;
  email: string;
}

export function ClientDetail({
  client,
  db,
  operatorUid,
  onRefresh,
  onEditClick,
  onBackClick,
}: ClientDetailProps) {
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);

  // ownerAdminUid가 있으면 users 컬렉션에서 관리자 정보 조회
  useEffect(() => {
    if (!client.ownerAdminUid) {
      setAdminInfo(null);
      return;
    }

    const fetchAdminInfo = async () => {
      setAdminLoading(true);
      try {
        // UID로 직접 users/{uid} 문서 조회
        const { getDoc, doc } = await import("firebase/firestore");
        const userRef = doc(db, "users", client.ownerAdminUid as string);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setAdminInfo({ displayName: data.displayName, email: data.email });
        } else {
          setAdminInfo(null);
        }
      } catch {
        setAdminInfo(null);
      } finally {
        setAdminLoading(false);
      }
    };

    fetchAdminInfo();
  }, [client.ownerAdminUid]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 상단 뒤로가기 및 액션 바 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={onBackClick}
            style={{
              background: "none",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "4px",
            }}
            title="목록으로 이동"
          >
            ⬅️
          </button>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#111111", margin: 0 }}>
              {client.companyName} 상세 정보
            </h2>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0 0" }}>
              고객사 ID: {client.clientId} · 가입코드: {client.companyCode}
            </p>
          </div>
        </div>

        <button
          onClick={onEditClick}
          style={{
            backgroundColor: "#111111",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            fontSize: "12.5px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "background-color 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#242424")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#111111")}
        >
          ⚙️ 정보 수정
        </button>
      </div>

      {/* 정보 영역 레이아웃 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* 왼쪽: 회사 마스터 정보 */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#111111", margin: 0, borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
            🏢 기본 정보
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>고객사명</span>
              <span style={{ fontWeight: 600, color: "#111111" }}>{client.companyName}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>고객사 식별 ID</span>
              <span style={{ fontWeight: 600, color: "#111111", fontFamily: "monospace" }}>{client.clientId}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>가입용 회사코드</span>
              <span style={{ fontWeight: 600, color: "#1d4ed8", fontFamily: "monospace" }}>{client.companyCode}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#6b7280" }}>운영 상태</span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  backgroundColor: client.status === "active" ? "#d1fae5" : "#fee2e2",
                  color: client.status === "active" ? "#065f46" : "#991b1b",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                {client.status === "active" ? "정상 가동 (active)" : "가동 정지 (suspended)"}
              </span>
            </div>
          </div>
        </div>

        {/* 오른쪽: 시스템 설정 & 폴더 구성 */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#111111", margin: 0, borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
            ⚙️ 시스템 및 자원 설정
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
            {/* 소유자 관리자 정보 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ color: "#6b7280" }}>소유자 관리자</span>
              {client.ownerAdminUid ? (
                adminLoading ? (
                  <span style={{ color: "#9ca3af", fontSize: "12px" }}>조회 중...</span>
                ) : adminInfo ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontWeight: 600, color: "#111111" }}>
                      {adminInfo.displayName}
                    </span>
                    <span style={{ color: "#4b5563", fontSize: "12px" }}>{adminInfo.email}</span>
                    <span style={{ color: "#9ca3af", fontFamily: "monospace", fontSize: "11px" }}>
                      UID: {client.ownerAdminUid.slice(0, 12)}...
                    </span>
                  </div>
                ) : (
                  <div>
                    <span style={{ color: "#9ca3af", fontFamily: "monospace", fontSize: "12px" }}>
                      {client.ownerAdminUid.slice(0, 12)}... (이름 조회 불가)
                    </span>
                  </div>
                )
              ) : (
                <span style={{ color: "#9ca3af" }}>미지정</span>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>기본 타임존</span>
              <span style={{ fontWeight: 600, color: "#111111" }}>{client.defaultTimezone}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>기본 보고서 수신메일</span>
              <span style={{ fontWeight: 600, color: "#111111" }}>{client.defaultReportEmail}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
              <span style={{ color: "#6b7280" }}>공용 구글 드라이브 루트 폴더 ID</span>
              <p style={{ margin: 0, padding: "8px 10px", backgroundColor: "#f9fafb", borderRadius: "6px", color: "#374151", fontFamily: "monospace", fontSize: "12px", wordBreak: "break-all" }}>
                {client.defaultDriveRootFolderId || "폴더 ID가 설정되지 않았습니다."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 회사 관리자 최초 등록 승인 및 제거 관리 패널 */}
      <ClientAdminPanel
        client={client}
        db={db}
        operatorUid={operatorUid}
        onRefresh={onRefresh}
      />
    </div>
  );
}
