"use client";

import { useEffect, useState } from "react";
import { Firestore } from "firebase/firestore";
import { saveClientAutomation } from "@/features/admin/companyAdminService";
import type { ClientContract, ClientAutomation, WorkflowTemplate } from "@/types/n8lient";

interface CompanyAutomationFormProps {
  db: Firestore;
  uid: string;
  clientId: string;
  contract: ClientContract;
  automation: ClientAutomation | null;
  template: WorkflowTemplate;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CompanyAutomationForm({
  db,
  uid,
  clientId,
  contract,
  automation,
  template,
  onSuccess,
  onCancel,
}: CompanyAutomationFormProps) {
  const [formName, setFormName] = useState("");
  const [formEnabled, setFormEnabled] = useState(true);
  const [formSettings, setFormSettings] = useState<Record<string, string | number | boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const isSecurityField = (key: string, type: string) => {
    if (type === "secret") return true;
    const lowercaseKey = key.toLowerCase();
    const forbiddenKeywords = ["token", "secret", "apikey", "credential", "accesstoken", "refreshtoken"];
    return forbiddenKeywords.some((keyword) => lowercaseKey.includes(keyword));
  };

  useEffect(() => {
    setFormName(automation?.automationName || template.shortName || template.name);
    setFormEnabled(automation ? automation.enabled : true);

    const initialSettings: Record<string, string | number | boolean> = {};
    template.configSchema.forEach((field) => {
      if (isSecurityField(field.key, field.type)) return;

      if (automation && automation.settings[field.key] !== undefined) {
        initialSettings[field.key] = automation.settings[field.key];
      } else if (field.defaultValueSource === "auth.email" && typeof window !== "undefined") {
        initialSettings[field.key] = "";
      } else if (field.defaultValue !== undefined && field.defaultValue !== null) {
        initialSettings[field.key] = field.defaultValue;
      } else {
        initialSettings[field.key] = field.type === "boolean" ? false : "";
      }
    });
    setFormSettings(initialSettings);
  }, [automation, template]);

  const handleFieldChange = (key: string, value: string | number | boolean) => {
    setFormSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const cleanedSettings: Record<string, string | number | boolean> = {};
      for (const [k, v] of Object.entries(formSettings)) {
        const fieldSchema = template.configSchema.find((f) => f.key === k);
        if (fieldSchema && isSecurityField(k, fieldSchema.type)) {
          continue;
        }
        cleanedSettings[k] = v;
      }

      const res = await saveClientAutomation(db, {
        clientId,
        workflowKey: contract.workflowKey,
        automationName: formName,
        enabled: formEnabled,
        settings: cleanedSettings,
        adminUid: uid,
        template,
      });

      if (res.success) {
        alert("N8N 워크플로우 설정이 성공적으로 저장 및 활성화되었습니다.");
        onSuccess();
      } else {
        alert(res.message || "설정 저장 실패");
      }
    } catch (err: any) {
      alert(`저장 중 오류: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const schemaFields = template.configSchema.filter((f) => !isSecurityField(f.key, f.type));

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "20px",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
      }}
    >
      <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111111", margin: "0 0 16px 0", borderBottom: "1px solid #f3f4f6", paddingBottom: "10px" }}>
        ⚙️ [{template.name}] N8N 워크플로우 설정 편집
      </h3>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>N8N 워크플로우명</label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
            style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", color: "#111111", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "4px 0" }}>
          <input
            type="checkbox"
            id="formEnabled"
            checked={formEnabled}
            onChange={(e) => setFormEnabled(e.target.checked)}
            style={{ width: "16px", height: "16px", cursor: "pointer" }}
          />
          <label htmlFor="formEnabled" style={{ fontSize: "13px", fontWeight: 600, color: "#374151", cursor: "pointer" }}>
            사내 사용자들에게 이 N8N 워크플로우 노출 및 활성화
          </label>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "4px 0" }} />

        {schemaFields.length > 0 && (
          <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#374151", margin: "0 0 4px 0" }}>
            필수 맵핑 설정 항목
          </h4>
        )}

        {schemaFields.map((field) => (
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
                style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", backgroundColor: "#ffffff", color: "#111111", width: "100%" }}
              >
                <option value="false">False (비활성)</option>
                <option value="true">True (활성)</option>
              </select>
            ) : field.type === "select" && field.options ? (
              <select
                value={String(formSettings[field.key])}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", backgroundColor: "#ffffff", color: "#111111", width: "100%" }}
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
                style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", color: "#111111", boxSizing: "border-box", width: "100%" }}
              />
            )}
          </div>
        ))}

        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
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
            {submitting ? "저장 중..." : "⚙️ 설정 저장 및 활성화"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              height: "36px",
              backgroundColor: "#f3f4f6",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "0 16px",
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
  );
}
