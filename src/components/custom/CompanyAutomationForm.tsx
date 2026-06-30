"use client";

import { useEffect, useState, useRef, type ChangeEvent } from "react";
import { Firestore } from "firebase/firestore";
import { saveClientAutomation } from "@/features/admin/companyAdminService";
import type { ClientContract, ClientAutomation, WorkflowTemplate, UserSettingGuidanceLevel, UserSettingVisibilityLevel } from "@/types/n8lient";
import { playAppSound } from "@/lib/appSound";
import { isGoogleDriveFolderIdConfigKey, normalizeSettingsDriveFolderIds } from "@/common/googleDrive/googleDriveFolderIdField";
import { GoogleDriveFolderIdInput } from "@/components/core/GoogleDriveFolderIdInput";
import { resolveWorkflowDisplayName } from "@/common/workflow/resolveWorkflowDisplayName";
import { useAuthUser } from "@/features/auth/useAuthUser";
import ConfigFieldPolicyControl from "@/components/custom/company-automation/ConfigFieldPolicyControl";
import CompanyRetentionPolicySection from "@/components/custom/company-automation/CompanyRetentionPolicySection";
import CompanyAutomationNoticeSection from "@/components/custom/company-automation/CompanyAutomationNoticeSection";
import CompanyAutomationActiveSection from "@/components/custom/company-automation/CompanyAutomationActiveSection";
import CompanyAccessPolicySection from "@/components/custom/company-automation/CompanyAccessPolicySection";
import type { ResultAccessMode } from "@/types/n8lient";

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
  const [formGuidance, setFormGuidance] = useState<Record<string, UserSettingGuidanceLevel>>({});
  const [formVisibility, setFormVisibility] = useState<Record<string, UserSettingVisibilityLevel>>({});
 
  // [v2.6] 회사 보관 정책 관련 상태 선언
  const [companyDefaultLevel, setCompanyDefaultLevel] = useState<"notify_only" | "processed_result" | "full_archive">("full_archive");
  const [coAllowedUserLevels, setCoAllowedUserLevels] = useState<("notify_only" | "processed_result" | "full_archive")[]>([
    "notify_only",
    "processed_result",
    "full_archive",
  ]);
  const [coAllowUserOverride, setCoAllowUserOverride] = useState(true);

  // [v3.2] 결과 공개 정책 관련 상태 선언
  const [defaultAccessMode, setDefaultAccessMode] = useState<ResultAccessMode>("private");
  const [ownerCanChangeAccess, setOwnerCanChangeAccess] = useState(false);
  const [adminCanChangeAccess, setAdminCanChangeAccess] = useState(true);
  const [policySource, setPolicySource] = useState<"custom" | "inherited" | "default">("default");

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

  // 버전 접두사를 분리하는 보수적 헬퍼 함수
  const getWorkflowKeyBase = (key: string): string => {
    const match = key.match(/^(.+?)(-\d+)+$/);
    return match ? match[1] : key;
  };

  useEffect(() => {
    setFormName(automation?.automationName || template.shortName || template.name);
    setFormEnabled(automation ? automation.enabled : true);
    setFormNoticeText(automation?.noticeText ?? "");
    setFormGuidance(automation?.userSettingGuidance ?? {});
    setFormVisibility(automation?.userSettingVisibility ?? {});

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

    // [v3.2] 결과 공개 정책 초기화 (우선순위 상속 적용)
    const initAccessPolicy = async () => {
      // 1. 기존 설정이 명시적으로 존재하는 경우
      if (automation?.resultAccessPolicy) {
        setDefaultAccessMode(automation.resultAccessPolicy.defaultAccessMode || "private");
        setOwnerCanChangeAccess(Boolean(automation.resultAccessPolicy.ownerCanChangeAccess));
        setAdminCanChangeAccess(automation.resultAccessPolicy.adminCanChangeAccess !== false);
        setPolicySource("custom");
        return;
      }

      // 2. 신규인 경우: 동일 clientId 하위 계열(workflowKeyBase 일치) 기존 정책 탐색
      if (!automation && clientId) {
        const { getCompanyAutomations } = require("@/features/admin/companyAdminService");
        try {
          const currentBase = getWorkflowKeyBase(contract.workflowKey);
          const allAutos = await getCompanyAutomations(db, clientId);
          
          // 동일 계열(workflowKeyBase가 일치하고 resultAccessPolicy가 있는) 자동화 중 가장 최신화된 것 탐색
          const siblingAutos = allAutos.filter((a: ClientAutomation) => 
            a.workflowKey !== contract.workflowKey && 
            getWorkflowKeyBase(a.workflowKey) === currentBase && 
            a.resultAccessPolicy !== undefined
          );

          if (siblingAutos.length > 0) {
            // updatedAt 기준 내림차순 정렬하여 가장 최근 정책 획득
            siblingAutos.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            const matchedPolicy = siblingAutos[0].resultAccessPolicy!;
            setDefaultAccessMode(matchedPolicy.defaultAccessMode || "private");
            setOwnerCanChangeAccess(Boolean(matchedPolicy.ownerCanChangeAccess));
            setAdminCanChangeAccess(matchedPolicy.adminCanChangeAccess !== false);
            setPolicySource("inherited");
            console.log(`[resultAccessPolicy] 동일 계열 자동화(${siblingAutos[0].workflowKey}) 정책 복사 완료.`);
            return;
          }
        } catch (e) {
          console.warn("[resultAccessPolicy] 계열 자동화 상속 탐색 중 경고:", e);
        }
      }

      // 3. 템플릿 상속
      if (template.resultAccessPolicy) {
        setDefaultAccessMode(template.resultAccessPolicy.defaultAccessMode || "private");
        setOwnerCanChangeAccess(Boolean(template.resultAccessPolicy.ownerCanChangeAccess));
        setAdminCanChangeAccess(template.resultAccessPolicy.adminCanChangeAccess !== false);
        setPolicySource("inherited");
        return;
      }

      // 4. 안전 기본값
      setDefaultAccessMode("private");
      setOwnerCanChangeAccess(false);
      setAdminCanChangeAccess(true);
      setPolicySource("default");
    };

    initAccessPolicy();

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
  }, [automation, template, contract, clientId]);

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
        resultAccessPolicy: {
          defaultAccessMode,
          ownerCanChangeAccess,
          adminCanChangeAccess,
        },
        userSettingGuidance: formGuidance,
        userSettingVisibility: formVisibility,
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

        <CompanyAutomationNoticeSection
          noticeText={formNoticeText}
          onChangeNoticeText={(text) => setFormNoticeText(text)}
        />

        <CompanyAutomationActiveSection
          enabled={formEnabled}
          onChangeEnabled={(enabled) => setFormEnabled(enabled)}
        />

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
            <>
              <CompanyRetentionPolicySection
                companyDefaultLevel={companyDefaultLevel}
                coAllowedUserLevels={coAllowedUserLevels}
                coAllowUserOverride={coAllowUserOverride}
                opPolicy={opPolicy}
                contractRetentionLimit={contractRetentionLimit}
                onChangeCompanyDefaultLevel={(lvl) => setCompanyDefaultLevel(lvl)}
                onChangeCoAllowUserOverride={(override) => setCoAllowUserOverride(override)}
              />
              
              <div style={{ marginTop: "12px" }}>
                <CompanyAccessPolicySection
                  defaultAccessMode={defaultAccessMode}
                  ownerCanChangeAccess={ownerCanChangeAccess}
                  adminCanChangeAccess={adminCanChangeAccess}
                  policySource={policySource}
                  onChangeDefaultAccessMode={(mode) => setDefaultAccessMode(mode)}
                  onChangeOwnerCanChangeAccess={(allow) => setOwnerCanChangeAccess(allow)}
                  onChangeAdminCanChangeAccess={(allow) => setAdminCanChangeAccess(allow)}
                />
              </div>
            </>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <label className="ux_label" style={{ fontSize: "12px", color: "#4b5563", marginTop: "2px" }}>
                  {field.label} {field.required && <span style={{ color: "#ef4444" }}>*</span>}
                </label>
                
                <ConfigFieldPolicyControl
                  fieldKey={field.key}
                  visibility={formVisibility[field.key]}
                  guidance={formGuidance[field.key]}
                  onChangeVisibility={(key, val) => {
                    setFormVisibility((prev) => {
                      const copy = { ...prev };
                      if (val) {
                        copy[key] = val;
                      } else {
                        delete copy[key];
                      }
                      return copy;
                    });
                  }}
                  onChangeGuidance={(key, val) => {
                    setFormGuidance((prev) => {
                      const copy = { ...prev };
                      if (val) {
                        copy[key] = val;
                      } else {
                        delete copy[key];
                      }
                      return copy;
                    });
                  }}
                  description={field.description}
                />
              </div>

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
