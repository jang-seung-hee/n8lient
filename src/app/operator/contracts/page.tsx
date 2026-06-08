// 이 파일은 시스템 운영자가 각 고객사별로 N8N 워크플로우를 배정(매핑)하고 계약 상태를 관리하는 화면입니다.
// 기존의 비즈니스 검증, 중복 체크 및 활성 상태 토글 로직을 완벽히 보존한 채 List-Detail-Form 3단계 뷰 컴포넌트로 개편했습니다.

"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  getClientContracts,
  getClientsList,
  getWorkflowTemplates,
  createClientContract,
} from "@/features/operator/operatorService";
import type { ClientContract, ClientDoc, WorkflowTemplate } from "@/types/n8lient";
import { doc, updateDoc } from "firebase/firestore";
import { useAuthUser } from "@/features/auth/useAuthUser";

// 하위 컴포넌트 임포트
import { ContractMappingList } from "./ContractMappingList";
import { ContractMappingDetail } from "./ContractMappingDetail";
import { ContractMappingForm } from "./ContractMappingForm";

export default function OperatorContracts() {
  const [viewMode, setViewMode] = useState<"list" | "detail" | "form">("list");
  const [selectedContract, setSelectedContract] = useState<ClientContract | null>(null);

  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [clients, setClients] = useState<ClientDoc[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuthUser();

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const contractList = await getClientContracts(db);
      const clientList = await getClientsList(db);
      const templateList = await getWorkflowTemplates(db);

      setContracts(contractList);
      setClients(clientList);
      setTemplates(templateList);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 1. 이벤트 뷰 전환 핸들러
  const handleSelect = (contract: ClientContract) => {
    setSelectedContract(contract);
    setViewMode("detail");
  };

  const handleCreateClick = () => {
    setSelectedContract(null);
    setViewMode("form");
  };

  const handleBackToList = () => {
    setSelectedContract(null);
    setViewMode("list");
    loadData(); // 목록 최신화 동기화
  };

  // 2. 계약 활성화/비활성화 상태 토글 수정 허용 (상세 화면에서만 수행하도록 구조 변경)
  const handleToggleEnabled = async (contract: ClientContract) => {
    try {
      setLoading(true);
      const docRef = doc(db, "clientContracts", contract.contractId);
      const nextEnabled = !contract.enabled;
      
      const updatePayload = {
        enabled: nextEnabled,
        contractStatus: nextEnabled ? ("active" as const) : ("paused" as const),
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(docRef, updatePayload);

      alert(`배정 상태가 [${nextEnabled ? "활성" : "비활성"}]으로 수정되었습니다.`);
      
      // 상세 뷰 정보 즉시 업데이트 동기화
      const updatedContract: ClientContract = {
        ...contract,
        ...updatePayload,
      };
      setSelectedContract(updatedContract);
      
      await loadData();
    } catch (err: any) {
      alert("상태 수정 실패: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. 신규 매핑 배정 제출 (중복 방지 가드레일 완벽 보존)
  const handleFormSubmit = async (formData: {
    clientId: string;
    workflowKey: string;
    enabled: boolean;
    contractStatus: "active" | "paused" | "ended";
  }) => {
    if (!user) {
      alert("인증 정보가 확인되지 않습니다.");
      return;
    }

    const contractId = `${formData.clientId}_${formData.workflowKey}`;

    const newContract: ClientContract = {
      contractId,
      clientId: formData.clientId,
      workflowKey: formData.workflowKey,
      enabled: formData.enabled,
      contractStatus: formData.contractStatus,
      startedAt: new Date().toISOString(),
      endedAt: null,
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      setLoading(true);
      const res = await createClientContract(db, newContract);
      if (res.success) {
        alert("성공적으로 N8N 워크플로우 매핑 배정이 완료되었습니다.");
        
        // 저장 성공 시 방금 생성한 매핑의 상세(Detail) 화면으로 이동
        setSelectedContract(newContract);
        setViewMode("detail");
        await loadData();
      } else {
        alert(res.message || "매핑 배정 실패");
      }
    } catch (err: any) {
      alert(`에러 발생: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 4. 개발자용 테스트 샘플 계약 배정
  const handleRegisterSampleContract = async () => {
    if (!user) return;
    const clientId = "client_rentaltoktok_001";
    const workflowKey = "expense-report";
    const contractId = `${clientId}_${workflowKey}`;

    const sampleContract: ClientContract = {
      contractId,
      clientId,
      workflowKey,
      enabled: true,
      contractStatus: "active",
      startedAt: new Date().toISOString(),
      endedAt: null,
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      setLoading(true);
      const res = await createClientContract(db, sampleContract);
      if (res.success) {
        alert("샘플 매핑(렌탈톡톡 - 지결자)이 성공적으로 등록되었습니다.");
        await loadData();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(`매핑 등록 실패: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 상단 타이틀 영역 */}
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
          🤝 N8N 워크플로우 매핑
        </h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
          고객사에 사용할 N8N 워크플로우를 배정하고 계약 상태를 관리하는 화면입니다.
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "6px", fontSize: "13px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* 뷰 모드 렌더링 스위칭 */}
      {viewMode === "list" && (
        <ContractMappingList
          contracts={contracts}
          clients={clients}
          templates={templates}
          loading={loading}
          onSelect={handleSelect}
          onCreateClick={handleCreateClick}
          onRegisterSampleContract={handleRegisterSampleContract}
        />
      )}

      {viewMode === "detail" && selectedContract && (
        <ContractMappingDetail
          contract={selectedContract}
          clients={clients}
          templates={templates}
          loading={loading}
          onToggleEnabled={handleToggleEnabled}
          onBackClick={handleBackToList}
        />
      )}

      {viewMode === "form" && (
        <ContractMappingForm
          clients={clients}
          templates={templates}
          onSubmit={handleFormSubmit}
          onCancel={handleBackToList}
          loading={loading}
        />
      )}
    </div>
  );
}
