// 이 파일은 회사 관리자가 계약한 자동화 목록을 조회하고, 템플릿 스키마(configSchema)를 분석하여 설정 폼을 동적으로 생성/저장하는 화면입니다.

"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { useAuthUser } from "@/features/auth/useAuthUser";
import {
  getCompanyContracts,
  getCompanyAutomations,
  saveClientAutomation,
} from "@/features/admin/companyAdminService";
import { doc, getDoc } from "firebase/firestore";
import type { ClientContract, ClientAutomation, WorkflowTemplate } from "@/types/n8lient";
import { siteConfig } from "@/config/siteConfig";

export default function AdminAutomations() {
  const { user, userDoc } = useAuthUser();
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [automations, setAutomations] = useState<ClientAutomation[]>([]);
  const [templates, setTemplates] = useState<Record<string, WorkflowTemplate>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 현재 편집 중인 자동화 정보
  const [editingContract, setEditingContract] = useState<ClientContract | null>(null);
  const [formName, setFormName] = useState("");
  const [formEnabled, setFormEnabled] = useState(true);
  const [formSettings, setFormSettings] = useState<Record<string, string | number | boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (!userDoc?.clientId) return;
    try {
      setLoading(true);
      setError(null);

      // 1. 계약 및 기존 설정 목록 로드
      const contractList = await getCompanyContracts(db, userDoc.clientId);
      const automationList = await getCompanyAutomations(db, userDoc.clientId);

      setContracts(contractList);
      setAutomations(automationList);

      // 2. 계약된 자동화의 템플릿(명세서) 데이터 로드
      const tempMap: Record<string, WorkflowTemplate> = {};
      for (const contract of contractList) {
        if (!tempMap[contract.workflowKey]) {
          const tempRef = doc(db, "workflowTemplates", contract.workflowKey);
          const tempSnap = await getDoc(tempRef);
          if (tempSnap.exists()) {
            tempMap[contract.workflowKey] = tempSnap.data() as WorkflowTemplate;
          }
        }
      }
      setTemplates(tempMap);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "데이터를 로드하는 도중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userDoc?.clientId) {
      loadData();
    }
  }, [userDoc]);

  // 설정 편집 시작
  const handleStartEdit = (contract: ClientContract) => {
    const template = templates[contract.workflowKey];
    if (!template) {
      alert("해당 자동화의 스펙 템플릿 정보를 찾을 수 없습니다.");
      return;
    }

    // 기존에 등록된 설정이 있는지 탐색
    const existing = automations.find((a) => a.workflowKey === contract.workflowKey);

    setEditingContract(contract);
    setFormName(existing?.automationName || template.shortName);
    setFormEnabled(existing !== undefined ? existing.enabled : true);

    // 기본 설정값 빌드
    const initialSettings: Record<string, string | number | boolean> = {};
    template.configSchema.forEach((field) => {
      // 1순위: 기존 저장값
      if (existing && existing.settings[field.key] !== undefined) {
        initialSettings[field.key] = existing.settings[field.key];
      }
      // 2순위: defaultValueSource가 auth.email 인 경우 현재 유저 이메일
      else if (field.defaultValueSource === "auth.email" && user?.email) {
        initialSettings[field.key] = user.email;
      }
      // 3순위: 스키마 기본값
      else if (field.defaultValue !== undefined && field.defaultValue !== null) {
        initialSettings[field.key] = field.defaultValue;
      }
      // 4순위: 빈 값 초기화
      else {
        initialSettings[field.key] = field.type === "boolean" ? false : "";
      }
    });
    setFormSettings(initialSettings);
  };

  // 설정 저장
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContract || !userDoc?.clientId || !user) return;
    const template = templates[editingContract.workflowKey];
    if (!template) return;

    try {
      setSubmitting(true);
      const res = await saveClientAutomation(db, {
        clientId: userDoc.clientId,
        workflowKey: editingContract.workflowKey,
        automationName: formName,
        enabled: formEnabled,
        settings: formSettings,
        adminUid: user.uid,
        template,
      });

      if (res.success) {
        alert("자동화 설정이 성공적으로 저장 및 활성화되었습니다.");
        setEditingContract(null);
        loadData();
      } else {
        alert(res.message || "설정 저장 실패");
      }
    } catch (err: any) {
      alert(`저장 중 오류: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFieldChange = (key: string, value: string | number | boolean) => {
    setFormSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (loading && contracts.length === 0) {
    return <p style={{ fontSize: "13px", color: "#6b7280" }}>{siteConfig.messages.loading}</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
          ⚙️ 계약 자동화 설정 관리
        </h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
          회사별 계약된 n8n 자동화 워크플로우의 Google Drive 폴더 ID, 시트 ID 등의 설정을 관리합니다.
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "6px", fontSize: "13px" }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: editingContract ? "1.2fr 1fr" : "1fr", gap: "20px", alignItems: "flex-start" }}>
        
        {/* 계약된 자동화 목록 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {contracts.length === 0 ? (
            <div style={{ padding: "32px", border: "1px dashed #e5e7eb", borderRadius: "8px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
              체결된 자동화 계약이 없습니다. 시스템 운영자에게 계약 권한 부여를 요청해 주십시오.
            </div>
          ) : (
            contracts.map((contract) => {
              const template = templates[contract.workflowKey];
              const auto = automations.find((a) => a.workflowKey === contract.workflowKey);
              
              return (
                <div
                  key={contract.contractId}
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: "1px solid #f3f4f6",
                      paddingBottom: "10px",
                      marginBottom: "12px",
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#111111", margin: 0 }}>
                        {auto?.automationName || template?.name || contract.workflowKey}
                      </h3>
                      <p style={{ fontSize: "11px", color: "#9ca3af", margin: "2px 0 0 0" }}>
                        Key: {contract.workflowKey} · {auto ? `설정 완료 (v${auto.configSchemaVersion})` : "⚠️ 설정 미완료"}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          backgroundColor: auto?.enabled ? "#d1fae5" : "#fee2e2",
                          color: auto?.enabled ? "#065f46" : "#991b1b",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {auto?.enabled ? "활성화" : "비활성화"}
                      </span>
                      <button
                        onClick={() => handleStartEdit(contract)}
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          backgroundColor: "#f3f4f6",
                          border: "1px solid #d1d5db",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          color: "#374151",
                        }}
                      >
                        ⚙️ 설정 편집
                      </button>
                    </div>
                  </div>

                  {/* 현재 저장되어 있는 맵핑 설정 요약 */}
                  {auto && (
                    <div style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <span style={{ fontWeight: 600, color: "#4b5563" }}>적용된 세팅값</span>
                      <div style={{ backgroundColor: "#f9fafb", borderRadius: "6px", padding: "8px 12px", border: "1px solid #f3f4f6" }}>
                        {Object.entries(auto.settings).map(([k, v]) => (
                          <div key={k} style={{ display: "flex", justifyContent: "space-between", margin: "3px 0" }}>
                            <span style={{ fontFamily: "monospace", color: "#6b7280" }}>{k}</span>
                            <span style={{ color: "#111111", fontWeight: 500 }}>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 동적 설정 편집 창 */}
        {editingContract && templates[editingContract.workflowKey] && (
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "16px",
              position: "sticky",
              top: "70px",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111111", margin: "0 0 12px 0", borderBottom: "1px solid #f3f4f6", paddingBottom: "10px" }}>
              ⚙️ [{templates[editingContract.workflowKey].name}] 설정 편집
            </h3>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>자동화 이름</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", color: "#111111" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  id="formEnabled"
                  checked={formEnabled}
                  onChange={(e) => setFormEnabled(e.target.checked)}
                  style={{ width: "16px", height: "16px" }}
                />
                <label htmlFor="formEnabled" style={{ fontSize: "13px", fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                  이 자동화를 사내 사용자들에게 노출 및 활성화
                </label>
              </div>

              <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "4px 0" }} />

              <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#374151", margin: 0 }}>
                필수 맵핑 설정 항목
              </h4>

              {/* 스키마를 읽어 폼 필드를 동적으로 생성 */}
              {templates[editingContract.workflowKey].configSchema.map((field) => (
                <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>
                    {field.label} {field.required && <span style={{ color: "#ef4444" }}>*</span>}
                  </label>
                  {field.description && (
                    <span style={{ fontSize: "11px", color: "#6b7280", marginTop: "-2px", marginBottom: "2px" }}>
                      💡 {field.description}
                    </span>
                  )}
                  
                  {field.type === "boolean" ? (
                    <select
                      value={String(formSettings[field.key])}
                      onChange={(e) => handleFieldChange(field.key, e.target.value === "true")}
                      style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", backgroundColor: "#ffffff", color: "#111111" }}
                    >
                      <option value="false">False</option>
                      <option value="true">True</option>
                    </select>
                  ) : field.type === "select" && field.options ? (
                    <select
                      value={String(formSettings[field.key])}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", backgroundColor: "#ffffff", color: "#111111" }}
                    >
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === "email" ? "email" : field.type === "number" ? "number" : "text"}
                      value={String(formSettings[field.key] ?? "")}
                      onChange={(e) => handleFieldChange(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)}
                      placeholder={field.placeholder || `${field.label} 입력`}
                      required={field.required}
                      style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", color: "#111111" }}
                    />
                  )}
                </div>
              ))}

              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    height: "36px",
                    backgroundColor: "#111111",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: submitting ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? "저장 중..." : "⚙️ 설정 저장 및 배포"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingContract(null)}
                  style={{
                    height: "36px",
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    padding: "0 12px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
