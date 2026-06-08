// 이 파일은 시스템 운영자가 등록된 고객사 목록을 관리하고 신규 가입/수정을 처리하는 화면입니다.
// List-Detail-Form 3단계 뷰 구조로 개편하고 실 Firestore DB와 원자적으로 연동하도록 구현했습니다.

"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  getClientsList,
  createClient,
  updateClient,
} from "@/features/operator/operatorService";
import type { ClientDoc } from "@/types/n8lient";

// 하위 컴포넌트 임포트
import { ClientList } from "./ClientList";
import { ClientDetail } from "./ClientDetail";
import { ClientForm } from "./ClientForm";

export default function OperatorClients() {
  const [viewMode, setViewMode] = useState<"list" | "detail" | "form">("list");
  const [selectedClient, setSelectedClient] = useState<ClientDoc | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [clients, setClients] = useState<ClientDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. 고객사 목록 로드
  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await getClientsList(db);
      setClients(list);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "고객사 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  // 2. 이벤트 핸들러 정의
  const handleSelect = (client: ClientDoc) => {
    setSelectedClient(client);
    setViewMode("detail");
  };

  const handleCreateClick = () => {
    setSelectedClient(null);
    setIsEditMode(false);
    setViewMode("form");
  };

  const handleEditClick = () => {
    if (!selectedClient) return;
    setIsEditMode(true);
    setViewMode("form");
  };

  const handleBackToList = () => {
    setSelectedClient(null);
    setViewMode("list");
    loadClients(); // 취소/뒤로가기 시에 최신 상태 동기화
  };

  // 3. 저장 및 수정 처리 (트랜잭션/Batch 비즈니스 연동 완료)
  const handleFormSubmit = async (client: ClientDoc) => {
    try {
      setLoading(true);
      if (isEditMode) {
        // 수정 처리
        const res = await updateClient(db, client.clientId, client.companyCode, client);
        if (res.success) {
          alert(`고객사 [${client.companyName}] 정보가 성공적으로 수정되었습니다.`);
          // 수정 후 목록이 아닌 해당 상세 화면으로 이동
          setSelectedClient(client);
          setViewMode("detail");
          loadClients();
        } else {
          alert(res.message || "수정에 실패했습니다.");
        }
      } else {
        // 신규 등록 처리 (clients 와 companyCodeLookups 배치 등록)
        const res = await createClient(db, client);
        if (res.success) {
          alert(`고객사 [${client.companyName}] 등록이 완료되었습니다.`);
          // 저장 후 목록이 아닌 해당 상세 화면으로 이동
          setSelectedClient(client);
          setViewMode("detail");
          loadClients();
        } else {
          alert(res.message || "등록에 실패했습니다.");
        }
      }
    } catch (err: any) {
      alert("처리 도중 오류가 발생했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 상단 타이틀 바 */}
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
          🏭 고객사 마스터
        </h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
          플랫폼을 구독하는 고객사의 가입코드 발급, 운영 상태 및 공용 타임존 설정을 관리합니다.
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "6px", fontSize: "13px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* 뷰 모드 스위칭 */}
      {viewMode === "list" && (
        <ClientList
          clients={clients}
          loading={loading}
          onSelect={handleSelect}
          onCreateClick={handleCreateClick}
        />
      )}

      {viewMode === "detail" && selectedClient && (
        <ClientDetail
          client={selectedClient}
          onEditClick={handleEditClick}
          onBackClick={handleBackToList}
        />
      )}

      {viewMode === "form" && (
        <ClientForm
          initialData={selectedClient}
          isEditMode={isEditMode}
          onSubmit={handleFormSubmit}
          onCancel={handleBackToList}
          loading={loading}
        />
      )}
    </div>
  );
}
