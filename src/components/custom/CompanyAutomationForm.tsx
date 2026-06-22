"use client";

import { useEffect, useState, useRef, type ChangeEvent } from "react";
import { Firestore } from "firebase/firestore";
import { saveClientAutomation } from "@/features/admin/companyAdminService";
import type { ClientContract, ClientAutomation, WorkflowTemplate } from "@/types/n8lient";
import { playAppSound } from "@/lib/appSound";
import { isGoogleDriveFolderIdConfigKey, normalizeSettingsDriveFolderIds } from "@/common/googleDrive/googleDriveFolderIdField";
import { GoogleDriveFolderIdInput } from "@/components/core/GoogleDriveFolderIdInput";
import { resolveWorkflowDisplayName } from "@/common/workflow/resolveWorkflowDisplayName";
import { useAuthUser } from "@/features/auth/useAuthUser";

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
  const { user, userDoc, userDocLoading } = useAuthUser();
  // alert 지연 호출용 타이머 ID 보존 목록
  const timeoutIdsRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((id) => clearTimeout(id));
    };
  }, []);

  const addDelayedAlert = (message: string, delay = 150) => {
    const id = setTimeout(() => {
      alert(message);
    }, delay) as any;
    timeoutIdsRef.current.push(id);
  };
  const [formName, setFormName] = useState("");
  const [formEnabled, setFormEnabled] = useState(true);
  const [formNoticeText, setFormNoticeText] = useState("");
  const [formSettings, setFormSettings] = useState<Record<string, string | number | boolean>>({});

  // [v2.6] 회사 보관 정책 관련 상태 선언
  const [companyDefaultLevel, setCompanyDefaultLevel] = useState<"notify_only" | "processed_result" | "full_archive">("full_archive");
  const [coAllowedUserLevels, setCoAllowedUserLevels] = useState<("notify_only" | "processed_result" | "full_archive")[]>([
    "notify_only",
    "processed_result",
    "full_archive",
  ]);
  const [coAllowUserOverride, setCoAllowUserOverride] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  // 실시간 권한 여부 체크: 로그인 유저가 존재하고, role이 company_admin/operator이며, clientId가 매칭되는지 검사
  const hasWritePermission =
    user &&
    userDoc &&
    userDoc.uid === user.uid &&
    (userDoc.role === "operator" || (userDoc.role === "company_admin" && userDoc.clientId === clientId));

  const isSecurityField = (key: string, type: string) => {
    if (type === "secret") return true;
    const lowercaseKey = key.toLowerCase();
    const forbiddenKeywords = ["token", "secret", "apikey", "credential", "accesstoken", "refreshtoken"];
    return forbiddenKeywords.some((keyword) => lowercaseKey.includes(keyword));
  };

  useEffect(() => {
    setFormName(automation?.automationName || template.shortName || template.name);
    setFormEnabled(automation ? automation.enabled : true);
    setFormNoticeText(automation?.noticeText ?? "");

    // [v2.7] 회사 보관 정책 초기화
    const opPolicy = template.operatorRetentionPolicy || {
      allowedLevels: ["notify_only", "processed_result", "full_archive"],
      defaultLevel: "full_archive",
      allowCompanyOverride: true,
      allowUserOverride: true,
    };

    const contractRetentionLimit = contract.contractRetentionLimit || automation?.contractRetentionLimit || {
      maxLevel: opPolicy.defaultLevel || "full_archive",
      allowedLevels: opPolicy.allowedLevels || ["notify_only", "processed_result", "full_archive"]
    };

    const coPolicy = automation?.companyRetentionPolicy || {
      recommendedLevel: contractRetentionLimit.maxLevel || "full_archive",
      allowedUserLevels: contractRetentionLimit.allowedLevels || ["notify_only", "processed_result", "full_archive"],
      allowUserOverride: opPolicy.allowUserOverride,
    };

    setCompanyDefaultLevel(coPolicy.recommendedLevel || (coPolicy as any).defaultLevel || "full_archive");
    setCoAllowedUserLevels(coPolicy.allowedUserLevels);
    setCoAllowUserOverride(coPolicy.allowUserOverride);

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
  }, [automation, template, contract]);

  const handleFieldChange = (key: string, value: string | number | boolean) => {
    setFormSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    playAppSound("click");
    try {
      setSubmitting(true);

      const opPolicy = template.operatorRetentionPolicy || {
        allowedLevels: ["notify_only", "processed_result", "full_archive"],
        defaultLevel: "full_archive",
        allowCompanyOverride: true,
        allowUserOverride: true,
      };

      // [v2.7] 회사별 계약 한도 획득
      const contractRetentionLimit = contract.contractRetentionLimit || automation?.contractRetentionLimit || {
        maxLevel: opPolicy.defaultLevel || "full_archive",
        allowedLevels: opPolicy.allowedLevels || ["notify_only", "processed_result", "full_archive"]
      };

      // 검증 규칙: companyRetentionPolicy.recommendedLevel은 contractRetentionLimit.allowedLevels 안에 있어야 한다.
      if (!contractRetentionLimit.allowedLevels.includes(companyDefaultLevel)) {
        playAppSound("notify");
        addDelayedAlert(`검증 오류: 회사의 권장 보관 레벨(${companyDefaultLevel})은 계약상 허용된 범위(${contractRetentionLimit.allowedLevels.join(", ")})에 포함되어야 합니다.`);
        return;
      }

      // 검증 규칙: companyRetentionPolicy.allowedUserLevels도 contractRetentionLimit.allowedLevels 안에 있어야 한다.
      for (const lvl of coAllowedUserLevels) {
        if (!contractRetentionLimit.allowedLevels.includes(lvl)) {
          playAppSound("notify");
          addDelayedAlert(`검증 오류: 사용자 허용 레벨(${lvl})은 계약상 허용된 범위(${contractRetentionLimit.allowedLevels.join(", ")})에 포함되어야 합니다.`);
          return;
        }
      }

      // 검증 규칙: operatorRetentionPolicy.allowCompanyOverride가 false이면 회사관리자는 보관 레벨을 수정할 수 없다. (초기 설정된 template.operatorRetentionPolicy.defaultLevel 강제 고정)
      let finalRecommendedLevel = companyDefaultLevel;
      if (opPolicy.allowCompanyOverride === false) {
        finalRecommendedLevel = opPolicy.defaultLevel || "full_archive";
      }

      // 검증 규칙: operatorRetentionPolicy.allowUserOverride가 false이면 개인사용자 변경 허용을 켤 수 없다.
      let finalAllowUserOverride = coAllowUserOverride;
      if (opPolicy.allowUserOverride === false) {
        finalAllowUserOverride = false;
      }

      const cleanedSettings: Record<string, string | number | boolean> = {};
      for (const [k, v] of Object.entries(formSettings)) {
        const fieldSchema = template.configSchema.find((f) => f.key === k);
        if (fieldSchema && isSecurityField(k, fieldSchema.type)) {
          continue;
        }
        cleanedSettings[k] = v;
      }

      const driveFolderNorm = normalizeSettingsDriveFolderIds(cleanedSettings, schemaFields);
      if (driveFolderNorm.error) {
        playAppSound("notify");
        addDelayedAlert(driveFolderNorm.error);
        return;
      }
      const settingsToSave = driveFolderNorm.settings;

      const { getDefaultRetentionPolicy } = require("@/types/n8lient");

      const res = await saveClientAutomation(db, {
        clientId,
        workflowKey: contract.workflowKey,
        automationName: formName,
        enabled: formEnabled,
        settings: settingsToSave,
        adminUid: uid,
        template,
        retentionPolicy: getDefaultRetentionPolicy(finalRecommendedLevel),
        noticeText: formNoticeText,
        contractRetentionLimit,
        companyRetentionPolicy: {
          recommendedLevel: finalRecommendedLevel,
          allowedUserLevels: coAllowedUserLevels,
          allowUserOverride: finalAllowUserOverride,
        },
        isNew: !automation,
      });

      if (res.success) {
        playAppSound("success");
        addDelayedAlert("N8N 워크플로우 설정이 성공적으로 저장 및 활성화되었습니다.");
        onSuccess();
      } else {
        playAppSound("error");
        addDelayedAlert(res.message || "설정 저장 실패");
      }
    } catch (err: any) {
      playAppSound("error");
      addDelayedAlert(`저장 중 오류: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const schemaFields = template.configSchema.filter((f) => !isSecurityField(f.key, f.type));
  const displayName = resolveWorkflowDisplayName({
    template,
    automation,
    workflowKey: contract.workflowKey,
  });

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
        ⚙️ [{displayName}] N8N 워크플로우 설정 편집
      </h3>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label className="ux_label" style={{ fontSize: "12px", color: "#4b5563" }}>N8N 워크플로우명</label>
          <input
            type="text"
            className="ux_input_compact"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label className="ux_label" style={{ fontSize: "12px", color: "#4b5563" }}>사용방법 안내</label>
          <span style={{ fontSize: "11px", color: "#6b7280", marginTop: "-2px", marginBottom: "2px" }}>
            사용자가 이 워크플로우를 실행하기 전에 확인할 안내 문구입니다. 비워두면 사용자 화면에 표시되지 않습니다.
          </span>
          <textarea
            className="ux_textarea"
            value={formNoticeText}
            onChange={(e) => setFormNoticeText(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="예: 음성 파일은 20MB 이하로 업로드해 주세요. 결과는 이메일과 실행 결과 화면에서 확인할 수 있습니다."
          />
          <span style={{ fontSize: "11px", color: "#9ca3af", textAlign: "right" }}>
            {formNoticeText.length}/2000
          </span>
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

        {/* [v2.7] 회사 보관 정책 설정 UI (오퍼레이터가 계약한 허용 범위에서만 제어 가능) */}
        {(() => {
          const opPolicy = template.operatorRetentionPolicy || {
            allowedLevels: ["notify_only", "processed_result", "full_archive"],
            defaultLevel: "full_archive",
            allowCompanyOverride: true,
            allowUserOverride: true,
          };

          const contractRetentionLimit = contract.contractRetentionLimit || automation?.contractRetentionLimit || {
            maxLevel: opPolicy.defaultLevel || "full_archive",
            allowedLevels: opPolicy.allowedLevels || ["notify_only", "processed_result", "full_archive"]
          };

          return (
            <div style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#111111", margin: 0 }}>🛡️ 회사 보관 정책 (Company Policy)</h4>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label className="ux_label" style={{ fontSize: "12px", color: "#4b5563" }}>회사 기본 보관 레벨</label>
                <select
                  className="ux_select_compact"
                  value={companyDefaultLevel}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setCompanyDefaultLevel(e.target.value as "notify_only" | "processed_result" | "full_archive")
                  }
                  disabled={!opPolicy.allowCompanyOverride}
                  style={{
                    backgroundColor: opPolicy.allowCompanyOverride ? "#ffffff" : "#f3f4f6",
                    color: opPolicy.allowCompanyOverride ? "#111111" : "#9ca3af",
                  }}
                >
                  {contractRetentionLimit.allowedLevels.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl === "notify_only" && "알림/로그형 (notify_only)"}
                      {lvl === "processed_result" && "가공지식 저장형 (processed_result)"}
                      {lvl === "full_archive" && "원본 포함 지식보관형 (full_archive)"}
                    </option>
                  ))}
                </select>
                {!opPolicy.allowCompanyOverride && (
                  <span style={{ fontSize: "11px", color: "#ef4444" }}>
                    ⚠️ 오퍼레이터 정책에 의해 회사 관리자의 보관 레벨 강제 재정의(Override)가 금지되어 있어 변경할 수 없습니다.
                  </span>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: opPolicy.allowUserOverride ? "#374151" : "#9ca3af", cursor: opPolicy.allowUserOverride ? "pointer" : "not-allowed" }}>
                  <input
                    type="checkbox"
                    checked={coAllowUserOverride}
                    disabled={!opPolicy.allowUserOverride}
                    onChange={(e) => setCoAllowUserOverride(e.target.checked)}
                    style={{ cursor: opPolicy.allowUserOverride ? "pointer" : "not-allowed" }}
                  />
                  사내 일반 사용자의 개인 보관 선호 선택 허용
                </label>
                {!opPolicy.allowUserOverride && (
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>
                    ℹ️ 오퍼레이터 정책상 일반 사용자 변경이 금지되어 있어 활성화할 수 없습니다.
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "4px 0" }} />

        {schemaFields.length > 0 && (
          <h4 className="ux_card_title" style={{ fontSize: "12px", margin: "0 0 4px 0" }}>
            필수 맵핑 설정 항목
          </h4>
        )}

        <div className="ux_form_grid">
          {schemaFields.map((field) => (
            <div
              key={field.key}
              className={field.type === "textarea" ? "ux_form_grid_full" : undefined}
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <label className="ux_label" style={{ fontSize: "12px", color: "#4b5563" }}>
                {field.label} {field.required && <span style={{ color: "#ef4444" }}>*</span>}
              </label>
              {field.description && (
                <span style={{ fontSize: "11px", color: "#6b7280", marginTop: "-2px", marginBottom: "2px" }}>
                  💡 {field.description}
                </span>
              )}

              {field.type === "boolean" ? (
                <select
                  className="ux_select_compact"
                  value={String(formSettings[field.key])}
                  onChange={(e) => handleFieldChange(field.key, e.target.value === "true")}
                >
                  <option value="false">False (비활성)</option>
                  <option value="true">True (활성)</option>
                </select>
              ) : field.type === "select" && field.options ? (
                <select
                  className="ux_select_compact"
                  value={String(formSettings[field.key])}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                >
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : isGoogleDriveFolderIdConfigKey(field.key) ? (
                <GoogleDriveFolderIdInput
                  value={String(formSettings[field.key] ?? "")}
                  onChange={(v) => handleFieldChange(field.key, v)}
                  placeholder={field.placeholder || `${field.label} ID 또는 Google Drive 폴더 링크`}
                  required={field.required}
                />
              ) : (
                <input
                  type={field.type === "email" ? "email" : field.type === "number" ? "number" : "text"}
                  className="ux_input_compact"
                  value={String(formSettings[field.key] ?? "")}
                  onChange={(e) => handleFieldChange(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)}
                  placeholder={field.placeholder || `${field.label} 입력`}
                  required={field.required}
                />
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
          <button
            type="submit"
            className="ux_button ux_button_primary"
            disabled={submitting || !hasWritePermission}
            style={{
              flex: 1,
              border: "none",
              borderRadius: "6px",
              opacity: (submitting || !hasWritePermission) ? 0.6 : 1,
              cursor: (submitting || !hasWritePermission) ? "not-allowed" : "pointer"
            }}
          >
            {submitting ? "저장 중..." : "⚙️ 설정 저장 및 활성화"}
          </button>
          <button
            type="button"
            className="ux_button ux_button_secondary"
            onClick={() => {
              playAppSound("click");
              onCancel();
            }}
            style={{
              backgroundColor: "#f3f4f6",
              borderRadius: "6px",
              padding: "0 16px",
            }}
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
