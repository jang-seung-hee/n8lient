"use client";

import { useEffect, useState } from "react";
import { Firestore } from "firebase/firestore";
import { getUserAutomationSettings, saveUserAutomationSettings } from "@/features/user/userService";
import type { ClientAutomation, WorkflowTemplate, UserAutomationSettings, UserRetentionPreference } from "@/types/n8lient";
import { isGoogleDriveFolderIdConfigKey, normalizeSettingsDriveFolderIds } from "@/common/googleDrive/googleDriveFolderIdField";
import { GoogleDriveFolderIdInput } from "@/components/core/GoogleDriveFolderIdInput";
import { resolveWorkflowDisplayName } from "@/common/workflow/resolveWorkflowDisplayName";

interface UserPersonalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: Firestore;
  uid: string;
  clientId: string;
  currentAuto: ClientAutomation;
  currentTemplate: WorkflowTemplate;
}

export default function UserPersonalSettingsModal({
  isOpen,
  onClose,
  db,
  uid,
  clientId,
  currentAuto,
  currentTemplate,
}: UserPersonalSettingsModalProps) {
  const [personalSettings, setPersonalSettings] = useState<Record<string, any>>({});
  const [existingUserSetting, setExistingUserSetting] = useState<UserAutomationSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [userPreferredLevel, setUserPreferredLevel] = useState<string>("");

  // 개인 설정 데이터 로드
  const loadUserSettings = async () => {
    if (!uid || !currentAuto.automationId) return;
    try {
      setLoading(true);
      const settingsData = await getUserAutomationSettings(db, uid, currentAuto.automationId);
      setExistingUserSetting(settingsData);
      if (settingsData) {
        if (settingsData.settings) {
          setPersonalSettings(settingsData.settings);
        } else {
          setPersonalSettings({});
        }
        if (settingsData.userRetentionPreference?.preferredLevel) {
          setUserPreferredLevel(settingsData.userRetentionPreference.preferredLevel);
        } else {
          setUserPreferredLevel("");
        }
      } else {
        setPersonalSettings({});
        setUserPreferredLevel("");
      }
    } catch (err) {
      console.error("[UserPersonalSettingsModal] 개인 설정 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentAuto.automationId) {
      loadUserSettings();
    }
  }, [isOpen, currentAuto.automationId]);

  const isSecurityField = (key: string, type: string) => {
    if (type === "secret") return true;
    const lowercaseKey = key.toLowerCase();
    const forbiddenKeywords = ["token", "secret", "apikey", "credential", "accesstoken", "refreshtoken"];
    return forbiddenKeywords.some((keyword) => lowercaseKey.includes(keyword));
  };

  const handleSave = async () => {
    if (!uid || !clientId || !currentAuto) return;
    try {
      setSaving(true);

      const configFields = (currentTemplate.configSchema || []).filter(
        (field) => !isSecurityField(field.key, field.type)
      );
      const driveFolderNorm = normalizeSettingsDriveFolderIds(personalSettings, configFields, {
        allowEmptyForOptional: true,
      });
      if (driveFolderNorm.error) {
        alert(driveFolderNorm.error);
        return;
      }

      const settingId = `${uid}_${currentAuto.automationId}`;
      const saveData: UserAutomationSettings = {
        settingId,
        uid,
        clientId,
        automationId: currentAuto.automationId,
        workflowKey: currentAuto.workflowKey,
        settings: driveFolderNorm.settings,
        ...(userPreferredLevel
          ? {
              userRetentionPreference: {
                preferredLevel: userPreferredLevel as UserRetentionPreference["preferredLevel"],
              },
            }
          : {}),
        templateStatusAtSetting: currentTemplate.status === "draft" ? "draft" : "published",
        isTestSetting: currentTemplate.status === "draft",
        createdAt: existingUserSetting?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveUserAutomationSettings(db, saveData);
      setExistingUserSetting(saveData);
      alert("개인 자동화 설정이 성공적으로 저장되었습니다.");
      onClose();
    } catch (err: any) {
      alert(`설정 저장 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ux_modal_overlay">
      <div
        className="ux_modal_panel"
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          padding: 0,
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid #f3f4f6",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#111111", margin: 0 }}>
            🛠️ {resolveWorkflowDisplayName({
              template: currentTemplate,
              automation: currentAuto,
              workflowKey: currentAuto.workflowKey,
            })} 개인 설정
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "16px",
              color: "#9ca3af",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* 본문 */}
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", minHeight: 0, flex: 1 }}>
          {/* 안내 문구 */}
          <div
            style={{
              backgroundColor: "#f9fafb",
              border: "1px solid #f3f4f6",
              borderRadius: "6px",
              padding: "10px",
              fontSize: "11px",
              color: "#4b5563",
              lineHeight: "1.5",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "4px", color: "#111111" }}>💡 안내 사항</div>
            • 값을 비워두면 회사 공용 기본값을 사용합니다.<br />
            • 개인 Google Drive 폴더나 Google Sheet를 사용하려면 n8n 공용 Google 계정에 쓰기 권한으로 공유해야 합니다.<br />
            • API Key, Token, Credential ID는 개인 설정에 저장하지 않습니다.
          </div>

          {loading ? (
            <p style={{ fontSize: "12px", color: "#6b7280", textAlign: "center", padding: "12px" }}>
              설정을 불러오는 중...
            </p>
          ) : (
            currentTemplate.configSchema &&
            currentTemplate.configSchema
              .filter((field) => !isSecurityField(field.key, field.type))
              .map((field) => {
                const companyDefaultVal = currentAuto.settings?.[field.key];
                const helpText = companyDefaultVal
                  ? `회사 기본값: ${companyDefaultVal}`
                  : "회사 기본값 없음";

                return (
                  <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>
                        {field.label}
                      </label>
                      <span style={{ fontSize: "10px", color: "#9ca3af" }}>개인 맞춤용</span>
                    </div>

                    {field.type === "textarea" ? (
                      <textarea
                        value={personalSettings[field.key] ?? ""}
                        onChange={(e) =>
                          setPersonalSettings((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        placeholder={`${helpText} (비워두면 기본값 사용)`}
                        style={{
                          minHeight: "60px",
                          borderRadius: "6px",
                          border: "1px solid #d1d5db",
                          padding: "8px 10px",
                          fontSize: "13px",
                          color: "#111111",
                          outline: "none",
                          resize: "vertical",
                          boxSizing: "border-box",
                        }}
                      />
                    ) : field.type === "select" ? (
                      <select
                        value={personalSettings[field.key] ?? ""}
                        onChange={(e) =>
                          setPersonalSettings((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        style={{
                          height: "36px",
                          borderRadius: "6px",
                          border: "1px solid #d1d5db",
                          padding: "0 8px",
                          fontSize: "13px",
                          backgroundColor: "#ffffff",
                          color: "#111111",
                          outline: "none",
                        }}
                      >
                        <option value="">{`회사 기본값 사용 (${companyDefaultVal || "없음"})`}</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "boolean" ? (
                      <select
                        value={
                          personalSettings[field.key] === undefined || personalSettings[field.key] === null
                            ? ""
                            : String(personalSettings[field.key])
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          setPersonalSettings((prev) => ({
                            ...prev,
                            [field.key]: val === "" ? "" : val === "true",
                          }));
                        }}
                        style={{
                          height: "36px",
                          borderRadius: "6px",
                          border: "1px solid #d1d5db",
                          padding: "0 8px",
                          fontSize: "13px",
                          backgroundColor: "#ffffff",
                          color: "#111111",
                          outline: "none",
                        }}
                      >
                        <option value="">{`회사 기본값 사용 (${
                          companyDefaultVal !== undefined ? String(companyDefaultVal) : "없음"
                        })`}</option>
                        <option value="true">True (사용)</option>
                        <option value="false">False (미사용)</option>
                      </select>
                    ) : isGoogleDriveFolderIdConfigKey(field.key) ? (
                      <GoogleDriveFolderIdInput
                        value={String(personalSettings[field.key] ?? "")}
                        onChange={(v) =>
                          setPersonalSettings((prev) => ({ ...prev, [field.key]: v }))
                        }
                        placeholder={`${helpText} (폴더 ID 또는 링크, 비워두면 기본값 사용)`}
                        allowEmpty
                      />
                    ) : (
                      <input
                        type={field.type === "number" ? "number" : "text"}
                        value={personalSettings[field.key] ?? ""}
                        onChange={(e) =>
                          setPersonalSettings((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        placeholder={`${helpText} (비워두면 기본값 사용)`}
                        style={{
                          height: "36px",
                          borderRadius: "6px",
                          border: "1px solid #d1d5db",
                          padding: "8px 10px",
                          fontSize: "13px",
                          color: "#111111",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    )}

                    {field.description && (
                      <span style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
                        ℹ️ {field.description}
                      </span>
                    )}
                  </div>
                );
              })
          )}

          {/* [v2.7] 개인 보관 정책 선호도 선택 UI (회사 및 오퍼레이터가 사용자 변경을 허용한 경우에만 노출) */}
          {(() => {
            const opPolicy = currentTemplate.operatorRetentionPolicy || {
              allowedLevels: ["notify_only", "processed_result", "full_archive"],
              defaultLevel: "full_archive",
              allowCompanyOverride: true,
              allowUserOverride: true,
            };
            // 회사별 계약 한도 획득 (currentAuto의 contractRetentionLimit 우선, 없으면 operatorRetentionPolicy에서 추출)
            const contractRetentionLimit = currentAuto.contractRetentionLimit || {
              maxLevel: opPolicy.defaultLevel || "full_archive",
              allowedLevels: opPolicy.allowedLevels || ["notify_only", "processed_result", "full_archive"]
            };

            const coPolicy = currentAuto.companyRetentionPolicy || {
              recommendedLevel: contractRetentionLimit.maxLevel || opPolicy.defaultLevel || "full_archive",
              allowedUserLevels: contractRetentionLimit.allowedLevels || ["notify_only", "processed_result", "full_archive"],
              allowUserOverride: opPolicy.allowUserOverride,
            };

            const capabilities = currentTemplate.retentionCapabilities || {
              supportedLevels: ["notify_only", "processed_result", "full_archive"],
              defaultLevel: "full_archive",
            };

            // 사용자 선택 가능 범위 교집합 계산
            // workflowTemplates.retentionCapabilities.supportedLevels ∩ contractRetentionLimit.allowedLevels
            const selectableLevels = capabilities.supportedLevels.filter(lvl => 
              contractRetentionLimit.allowedLevels.includes(lvl)
            );

            // 두 군데 모두에서 오버라이드를 켜준 경우에만 셀렉터 활성화
            const isUserOverrideAllowed = opPolicy.allowUserOverride && coPolicy.allowUserOverride;

            if (!isUserOverrideAllowed || selectableLevels.length === 0) {
              return null;
            }

            const companyRecommendedText = coPolicy.recommendedLevel || (coPolicy as any).defaultLevel || "full_archive";
            let recommendedLabel: string = companyRecommendedText;
            if (companyRecommendedText === "notify_only") recommendedLabel = "알림/로그형 (notify_only)";
            else if (companyRecommendedText === "processed_result") recommendedLabel = "가공지식 저장형 (processed_result)";
            else if (companyRecommendedText === "full_archive") recommendedLabel = "원본 포함 지식보관형 (full_archive)";

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "12px", borderTop: "1px solid #f3f4f6", paddingTop: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>
                    내 보관 단계
                  </label>
                  <span style={{ fontSize: "10px", color: "#10b981", fontWeight: 600 }}>개인 설정 우선</span>
                </div>
                <select
                  value={userPreferredLevel}
                  onChange={(e) => setUserPreferredLevel(e.target.value)}
                  style={{
                    height: "36px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    padding: "0 8px",
                    fontSize: "13px",
                    backgroundColor: "#ffffff",
                    color: "#111111",
                    outline: "none",
                  }}
                >
                  <option value="">{`회사 권장 단계 사용 (${recommendedLabel})`}</option>
                  {selectableLevels.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl === "notify_only" && "1단계: 알림/로그형 (notify_only)"}
                      {lvl === "processed_result" && "2단계: 가공지식 저장형 (processed_result)"}
                      {lvl === "full_archive" && "3단계: 원본 포함 지식보관형 (full_archive)"}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: "11px", color: "#6b7280" }}>
                  회사 계약 한도 내에서 개인 보관 단계를 선택할 수 있습니다. 선택하지 않으면 회사 권장 보관 단계가 적용됩니다.
                </span>
              </div>
            );
          })()}
        </div>

        {/* 푸터 */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #f3f4f6",
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            backgroundColor: "#f9fafb",
            borderBottomLeftRadius: "8px",
            borderBottomRightRadius: "8px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: "34px",
              padding: "0 12px",
              backgroundColor: "#ffffff",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              height: "34px",
              padding: "0 16px",
              backgroundColor: "#111111",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: saving || loading ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "저장 중..." : "설정 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
