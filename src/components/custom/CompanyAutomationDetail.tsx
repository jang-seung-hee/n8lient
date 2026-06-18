"use client";

import type { ClientContract, ClientAutomation, WorkflowTemplate } from "@/types/n8lient";
import AutomationNoticeBox from "@/components/core/automation/AutomationNoticeBox";

interface CompanyAutomationDetailProps {
  contract: ClientContract;
  automation: ClientAutomation | null;
  template: WorkflowTemplate | null;
  onBack: () => void;
  onEdit: () => void;
}

export default function CompanyAutomationDetail({
  contract,
  automation,
  template,
  onBack,
  onEdit,
}: CompanyAutomationDetailProps) {
  const isSecurityKey = (key: string) => {
    const lowercaseKey = key.toLowerCase();
    const forbiddenKeywords = ["token", "secret", "apikey", "credential", "accesstoken", "refreshtoken"];
    return forbiddenKeywords.some((keyword) => lowercaseKey.includes(keyword));
  };

  const noticeText = automation?.noticeText?.trim() ?? "";

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "20px",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f3f4f6", paddingBottom: "12px" }}>
        <div>
          <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>N8N 워크플로우 상세 정보</span>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#111827", margin: "2px 0 0 0" }}>
            {automation?.automationName || template?.name || contract.workflowKey}
          </h3>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onBack}
            style={{
              height: "34px",
              padding: "0 12px",
              backgroundColor: "#ffffff",
              color: "#4b5563",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ⬅️ 목록으로
          </button>
          <button
            onClick={onEdit}
            style={{
              height: "34px",
              padding: "0 12px",
              backgroundColor: "#111111",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ⚙️ 설정 편집
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div>
          <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>workflowKey</span>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#111111", margin: "4px 0 0 0", fontFamily: "monospace" }}>
            {contract.workflowKey}
          </p>
        </div>
        <div>
          <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>설정 상태</span>
          <p style={{ fontSize: "14px", fontWeight: 600, color: automation ? "#059669" : "#dc2626", margin: "4px 0 0 0" }}>
            {automation ? "설정 완료" : "⚠️ 설정 미완료"}
          </p>
        </div>
        <div>
          <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>사용자 활성 상태</span>
          <p style={{ fontSize: "14px", fontWeight: 600, color: automation?.enabled ? "#059669" : "#dc2626", margin: "4px 0 0 0" }}>
            {automation?.enabled ? "노출 및 활성화됨" : "비활성화됨"}
          </p>
        </div>
        <div>
          <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>최종 수정 일시</span>
          <p style={{ fontSize: "14px", fontWeight: 500, color: "#111111", margin: "4px 0 0 0" }}>
            {automation?.updatedAt ? new Date(automation.updatedAt).toLocaleString() : "-"}
          </p>
        </div>
      </div>

      {noticeText && <AutomationNoticeBox noticeText={noticeText} />}

      {template?.description && (
        <div style={{ backgroundColor: "#f9fafb", borderRadius: "6px", padding: "12px", border: "1px solid #f3f4f6" }}>
          <span style={{ fontSize: "12px", color: "#4b5563", fontWeight: 600 }}>N8N 워크플로우 설명</span>
          <p style={{ fontSize: "13px", color: "#4b5563", margin: "4px 0 0 0", lineHeight: 1.5 }}>
            {template.description}
          </p>
        </div>
      )}

      <div
        style={{
          backgroundColor: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: "6px",
          padding: "12px",
          fontSize: "12.5px",
          color: "#1e3a8a",
          lineHeight: 1.5,
        }}
      >
        ℹ️ <strong>개인 설정 우선 적용 안내</strong><br />
        이 값은 회사 공용 기본값입니다. 사용자가 개인 설정을 저장하면 개인 설정이 우선 적용되고, 비어 있는 값은 회사 기본값을 사용합니다.
      </div>

      <div>
        <h4 style={{ fontSize: "13px", fontWeight: 600, color: "#374151", margin: "0 0 8px 0" }}>
          📁 회사 공용 기본 설정값
        </h4>
        {!automation || !automation.settings || Object.keys(automation.settings).length === 0 ? (
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0, padding: "16px 0", textAlign: "center", border: "1px dashed #e5e7eb", borderRadius: "6px" }}>
            등록된 공용 설정값이 없습니다. 설정 편집을 통해 채워주십시오.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {/* 1. 템플릿의 configSchema 배열 순서대로 매핑하여 렌더링 */}
            {template?.configSchema && template.configSchema.length > 0 && (
              <div
                style={{
                  backgroundColor: "#f9fafb",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  border: "1px solid #e5e7eb",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {template.configSchema
                  .filter((field) => !isSecurityKey(field.key))
                  .map((field) => {
                    const val = automation.settings[field.key];
                    const displayVal = val !== undefined && val !== null ? String(val) : "-";
                    return (
                      <div
                        key={field.key}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "13px",
                          borderBottom: "1px solid #f3f4f6",
                          paddingBottom: "6px",
                          paddingTop: "4px",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{field.label}</span>
                          <span style={{ fontFamily: "monospace", color: "#6b7280", fontSize: "11px" }}>{field.key}</span>
                        </div>
                        <span style={{ color: "#111827", fontWeight: 600, alignSelf: "center" }}>{displayVal}</span>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* 2. settings에는 존재하지만 template.configSchema에 없는 legacy/unknown key 표시 */}
            {(() => {
              const schemaKeys = new Set(template?.configSchema?.map((f) => f.key) || []);
              const extraSettings = Object.entries(automation.settings).filter(
                ([key]) => !schemaKeys.has(key) && !isSecurityKey(key)
              );

              if (extraSettings.length === 0) return null;

              return (
                <div style={{ marginTop: "8px" }}>
                  <h5 style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563", margin: "0 0 6px 0" }}>
                    ⚙️ 기타 설정값 (이전 스키마 또는 임시 데이터)
                  </h5>
                  <div
                    style={{
                      backgroundColor: "#f9fafb",
                      borderRadius: "6px",
                      padding: "8px 16px",
                      border: "1px dashed #d1d5db",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {extraSettings.map(([key, val]) => (
                      <div
                        key={key}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "13px",
                          borderBottom: "1px solid #f3f4f6",
                          paddingBottom: "6px",
                          paddingTop: "4px",
                        }}
                      >
                        <span style={{ fontFamily: "monospace", color: "#ef4444", fontWeight: 500 }}>
                          {key} (정의되지 않음)
                        </span>
                        <span style={{ color: "#4b5563", fontWeight: 600 }}>{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
