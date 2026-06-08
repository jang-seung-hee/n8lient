// 이 파일은 시스템 운영자가 각 고객사별로 계약 자동화를 수동으로 배정 및 관리하는 화면입니다.

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
import { siteConfig } from "@/config/siteConfig";

export default function OperatorContracts() {
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [clients, setClients] = useState<ClientDoc[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 수동 배정 폼 상태
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedWorkflowKey, setSelectedWorkflowKey] = useState("");
  const [formEnabled, setFormEnabled] = useState(true);
  const [formContractStatus, setFormContractStatus] = useState<"active" | "paused" | "ended">("active");
  const [submitting, setSubmitting] = useState(false);

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

      if (clientList.length > 0) setSelectedClientId(clientList[0].clientId);
      if (templateList.length > 0) setSelectedWorkflowKey(templateList[0].workflowKey);
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

  // 수동 계약 배정 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedClientId || !selectedWorkflowKey) return;

    const contractId = `${selectedClientId}_${selectedWorkflowKey}`;

    const newContract: ClientContract = {
      contractId,
      clientId: selectedClientId,
      workflowKey: selectedWorkflowKey,
      enabled: formEnabled,
      contractStatus: formContractStatus,
      startedAt: new Date().toISOString(),
      endedAt: null,
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      setSubmitting(true);
      const res = await createClientContract(db, newContract);
      if (res.success) {
        alert("성공적으로 회사 계약 자동화 배정이 완료되었습니다.");
        loadData();
      } else {
        alert(res.message || "계약 배정 실패");
      }
    } catch (err: any) {
      alert(`에러 발생: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 계약 활성화/비활성화 상태 토글 수정 허용 (3번 조건)
  const handleToggleEnabled = async (contract: ClientContract) => {
    try {
      setLoading(true);
      const docRef = doc(db, "clientContracts", contract.contractId);
      const nextEnabled = !contract.enabled;
      
      await updateDoc(docRef, {
        enabled: nextEnabled,
        contractStatus: nextEnabled ? "active" : "paused",
        updatedAt: new Date().toISOString(),
      });

      alert(`계약 상태가 [${nextEnabled ? "활성화" : "비활성화"}]로 수정되었습니다.`);
      loadData();
    } catch (err: any) {
      alert("상태 수정 실패: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 개발자용 테스트 샘플 계약 배정
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
        alert("샘플 계약(렌탈톡톡 - 지결자)이 성공적으로 등록되었습니다.");
        loadData();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(`계약 등록 실패: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
          🤝 계약 자동화(Contracts) 관리
        </h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
          각 고객사가 어떤 자동화 템플릿의 라이선스를 계약하고 활성화 중인지 관리합니다.
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "6px", fontSize: "13px" }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px", alignItems: "flex-start" }}>
        
        {/* 수동 계약 배정 폼 */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "20px",
          }}
        >
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111111", margin: "0 0 16px 0", borderBottom: "1px solid #f3f4f6", paddingBottom: "10px" }}>
            ➕ 회사별 자동화 라이선스 배정
          </h3>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>배정 대상 회사 *</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", backgroundColor: "#ffffff", color: "#111111" }}
              >
                {clients.length === 0 ? (
                  <option value="">등록된 회사가 없습니다.</option>
                ) : (
                  clients.map((c) => (
                    <option key={c.clientId} value={c.clientId}>
                      {c.companyName} ({c.clientId})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>배정할 자동화 템플릿 *</label>
              <select
                value={selectedWorkflowKey}
                onChange={(e) => setSelectedWorkflowKey(e.target.value)}
                style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", backgroundColor: "#ffffff", color: "#111111" }}
              >
                {templates.length === 0 ? (
                  <option value="">등록된 자동화가 없습니다.</option>
                ) : (
                  templates.map((t) => (
                    <option key={t.workflowKey} value={t.workflowKey}>
                      {t.name} ({t.workflowKey})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>계약 최초 활성화</label>
                <select
                  value={String(formEnabled)}
                  onChange={(e) => setFormEnabled(e.target.value === "true")}
                  style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", backgroundColor: "#ffffff", color: "#111111" }}
                >
                  <option value="true">활성화 (enabled = true)</option>
                  <option value="false">비활성화 (enabled = false)</option>
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>계약 상태</label>
                <select
                  value={formContractStatus}
                  onChange={(e: any) => setFormContractStatus(e.target.value)}
                  style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", backgroundColor: "#ffffff", color: "#111111" }}
                >
                  <option value="active">유효함 (active)</option>
                  <option value="paused">일시정지 (paused)</option>
                  <option value="ended">계약종료 (ended)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || clients.length === 0 || templates.length === 0}
              style={{
                height: "38px",
                backgroundColor: submitting ? "#4b5563" : "#111111",
                color: "#ffffff",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                border: "none",
                cursor: (submitting || clients.length === 0 || templates.length === 0) ? "not-allowed" : "pointer",
                marginTop: "6px",
              }}
            >
              {submitting ? "계약 등록 중..." : "🤝 회사 라이선스 계약 배정"}
            </button>
          </form>
        </div>

        {/* 계약 목록 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
            📋 등록된 라이선스 계약 목록
          </h3>

          {loading && contracts.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#6b7280" }}>{siteConfig.messages.loading}</p>
          ) : (
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
                  padding: "10px 12px",
                  backgroundColor: "#f9fafb",
                  borderBottom: "1px solid #e5e7eb",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                <span>회사 ID</span>
                <span>자동화 Key</span>
                <span style={{ textAlign: "center" }}>라이선스</span>
                <span style={{ textAlign: "right" }}>계약 상태</span>
              </div>

              {contracts.length === 0 ? (
                <div style={{ padding: "32px 12px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                  배정된 계약 자동화 정보가 없습니다. 좌측 폼으로 배정을 완료해 주십시오.
                </div>
              ) : (
                contracts.map((contract) => (
                  <div
                    key={contract.contractId}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
                      padding: "12px",
                      borderBottom: "1px solid #f3f4f6",
                      fontSize: "12.5px",
                      color: "#111111",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: 500, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {contract.clientId}
                    </span>
                    <span style={{ color: "#4b5563" }}>{contract.workflowKey}</span>
                    <div style={{ textAlign: "center" }}>
                      <button
                        onClick={() => handleToggleEnabled(contract)}
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          backgroundColor: contract.enabled ? "#d1fae5" : "#fee2e2",
                          color: contract.enabled ? "#065f46" : "#991b1b",
                          border: "none",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                        title="클릭 시 계약 활성화 상태 토글"
                      >
                        {contract.enabled ? "활성화" : "비활성화"}
                      </button>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          color: contract.contractStatus === "active" ? "#047857" : "#b91c1c",
                        }}
                      >
                        {contract.contractStatus === "active" ? "유효(active)" : "일시정지(paused)"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>

      {/* 개발자용 테스트 샘플 데이터 격리 패널 */}
      <div
        style={{
          backgroundColor: "#f9fafb",
          border: "1px dashed #d1d5db",
          borderRadius: "8px",
          padding: "16px",
          marginTop: "12px",
        }}
      >
        <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#4b5563", margin: "0 0 8px 0" }}>
          🛠️ 개발자용 테스트 샘플 계약 배정 (격리 패널)
        </h3>
        <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 12px 0", lineHeight: 1.4 }}>
          렌탈톡톡 고객사(`client_rentaltoktok_001`)에 지결자 자동화 계약을 원터치로 빠르게 배정하는 도구입니다.
        </p>
        <button
          onClick={handleRegisterSampleContract}
          disabled={loading}
          style={{
            backgroundColor: "#e5e7eb",
            color: "#374151",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            padding: "8px 14px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "처리 중..." : "🤝 테스트 샘플 계약(렌탈톡톡 - 지결자) 즉시 배정"}
        </button>
      </div>
    </div>
  );
}
