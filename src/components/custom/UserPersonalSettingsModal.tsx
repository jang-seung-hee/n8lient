"use client";

import { useEffect, useState } from "react";
import { Firestore } from "firebase/firestore";
import { getUserAutomationSettings, saveUserAutomationSettings } from "@/features/user/userService";
import type { ClientAutomation, WorkflowTemplate, UserAutomationSettings, UserRetentionPreference } from "@/types/n8lient";
import { isGoogleDriveFolderIdConfigKey, normalizeSettingsDriveFolderIds } from "@/common/googleDrive/googleDriveFolderIdField";
import { GoogleDriveFolderIdInput } from "@/components/core/GoogleDriveFolderIdInput";
import { resolveWorkflowDisplayName } from "@/common/workflow/resolveWorkflowDisplayName";
import { hasPersonalSettingValue, resolveFieldGuidanceState } from "@/features/user/settings/resolvePersonalSettingFieldState";
import UserSettingGuidanceBadge from "@/components/custom/user-settings/UserSettingGuidanceBadge";

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

      // [진단] Firestore userAutomationSettings 원본값 전수 출력
      if (process.env.NODE_ENV === "development") {
        const emailRelatedFields = (currentTemplate.configSchema || []).filter(
          (f: any) => f.type === "email" || (typeof f.label === "string" && f.label.includes("이메일"))
        );
        console.debug("[UserPersonalSettingsModal-load-diagnosis]", {
          uid,
          clientId,
          automationId: currentAuto.automationId,
          workflowKey: currentAuto.workflowKey,
          docId: `${uid}_${currentAuto.automationId}`,
          firestoreRawSettings: settingsData?.settings ?? null,
          personalSettingsAfterLoad: settingsData?.settings ?? {},
          emailFieldsInConfigSchema: emailRelatedFields.map((f: any) => ({
            key: f.key,
            type: f.type,
            label: f.label,
            valueFromFirestore: settingsData?.settings?.[f.key],
          })),
        });

        console.debug("[execute-final-settings-email-value]", {
          userId: uid,
          clientId,
          workflowKey: currentAuto.workflowKey,
          finalSettingsReportEmailTo: settingsData?.settings?.reportEmailTo,
          finalSettingsResultEmailTo: settingsData?.settings?.resultEmailTo,
          finalSettingsEmailTo: settingsData?.settings?.emailTo,
          finalSettingsReportEmail: settingsData?.settings?.reportEmail,
          finalSettingsEmail: settingsData?.settings?.email,
          finalSettingsAccountantEmail: settingsData?.settings?.accountantEmail,
          finalSettingsEmailEnabled: settingsData?.settings?.emailEnabled,
          finalSettingsKeys: Object.keys(settingsData?.settings ?? {}),
          hasUserSetting: !!settingsData,
        });
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

  // Google Drive/Sheet 관련 필드가 설정에 존재하는지 판별하는 헬퍼 함수
  const hasGoogleDriveOrSheetFields = (): boolean => {
    if (!currentTemplate.configSchema) return false;
    
    return currentTemplate.configSchema.some((field) => {
      // 1. field.type 검사 (google_drive_folder_id 등)
      if (field.type === "google_drive_folder_id" || field.type === "google_sheet_id") {
        return true;
      }
      
      // 2. field.key 검사
      const keyLower = (field.key || "").toLowerCase();
      if (
        keyLower.includes("googledrive") ||
        keyLower.includes("googlesheet") ||
        keyLower.includes("drivefolder") ||
        keyLower.includes("sheetid")
      ) {
        return true;
      }

      // 3. field.label 검사
      const labelLower = (field.label || "").toLowerCase();
      if (
        labelLower.includes("구글 드라이브") ||
        labelLower.includes("구글 시트") ||
        labelLower.includes("google drive") ||
        labelLower.includes("google sheet")
      ) {
        return true;
      }

      return false;
    });
  };

  const isGoogleDriveOrSheetEnabled = hasGoogleDriveOrSheetFields();

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
          <h3 className="ux_card_title" style={{ margin: 0 }}>
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
            className="ux_info_box"
            style={{
              fontSize: "11px",
              color: "#4b5563",
              lineHeight: "1.5",
            }}
          >
            <div className="ux_card_title" style={{ marginBottom: "4px" }}>💡 안내 사항</div>
            {isGoogleDriveOrSheetEnabled ? (
              <>
                • 값을 비워두면 회사 공용 기본값을 사용합니다.<br />
                • 개인 Google Drive 폴더나 Google Sheet를 사용하려면 n8n 공용 Google 계정에 쓰기 권한으로 공유해야 합니다.<br />
                • API Key, Token, Credential ID는 개인 설정에 저장하지 않습니다.
              </>
            ) : (
              <>
                • 이 워크플로우에서 사용할 개인 설정을 입력한 뒤 저장하세요.<br />
                • 값을 비워두면 회사 공용 기본값을 사용합니다.<br />
                • API Key, Token, Credential ID는 개인 설정에 저장하지 않습니다.
              </>
            )}
          </div>
 
          {loading ? (
            <p className="ux_caption" style={{ textAlign: "center", padding: "12px" }}>
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

                const guidance = currentAuto.userSettingGuidance?.[field.key];
                const rawVal = personalSettings[field.key];
                const hasPersonalValue = hasPersonalSettingValue(rawVal);

                const visibility = currentAuto.userSettingVisibility?.[field.key];
                const shouldHideWhenEmpty = visibility === "hide_when_empty";

                // 조건부 숨김 판정: 회사관리자가 숨김을 켰고 개인값이 비어있는 경우
                if (shouldHideWhenEmpty && !hasPersonalValue) {
                  return null;
                }

                const { badgeType, guidanceText, inputBorderColor } = resolveFieldGuidanceState(
                  guidance,
                  hasPersonalValue
                );

                return (
                  <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label className="ux_label" style={{ fontSize: "12px" }}>
                        {field.label}
                      </label>
                      <UserSettingGuidanceBadge badgeType={badgeType} />
                    </div>

                    {field.type === "textarea" ? (
                      <textarea
                        className="ux_textarea"
                        value={personalSettings[field.key] ?? ""}
                        onChange={(e) =>
                          setPersonalSettings((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        placeholder={`${helpText} (비워두면 기본값 사용)`}
                        style={{ minHeight: "60px", borderColor: inputBorderColor }}
                      />
                    ) : field.type === "select" ? (
                      <select
                        className="ux_select_compact"
                        value={personalSettings[field.key] ?? ""}
                        onChange={(e) =>
                          setPersonalSettings((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        style={{ borderColor: inputBorderColor }}
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
                        className="ux_select_compact"
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
                        style={{ borderColor: inputBorderColor }}
                      >
                        <option value="">{`회사 기본값 사용 (${
                          companyDefaultVal !== undefined ? String(companyDefaultVal) : "없음"
                        })`}</option>
                        <option value="true">True (사용)</option>
                        <option value="false">False (미사용)</option>
                      </select>
                    ) : isGoogleDriveFolderIdConfigKey(field.key) ? (
                      <div style={{ borderColor: inputBorderColor }}>
                        <GoogleDriveFolderIdInput
                          value={String(personalSettings[field.key] ?? "")}
                          onChange={(v) =>
                            setPersonalSettings((prev) => ({ ...prev, [field.key]: v }))
                          }
                          placeholder={`${helpText} (폴더 ID 또는 링크, 비워두면 기본값 사용)`}
                          allowEmpty
                        />
                      </div>
                    ) : (
                      <input
                        type={field.type === "number" ? "number" : "text"}
                        className="ux_input_compact"
                        value={personalSettings[field.key] ?? ""}
                        onChange={(e) =>
                          setPersonalSettings((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        placeholder={`${helpText} (비워두면 기본값 사용)`}
                        style={{ borderColor: inputBorderColor }}
                      />
                    )}

                    {shouldHideWhenEmpty && hasPersonalValue && (
                      <span className="ux_guidance_badge_recommended" style={{ fontSize: "11px", fontWeight: "600", marginTop: "2px", display: "inline-flex", alignSelf: "flex-start", padding: "2px 8px" }}>
                        ℹ️ 기존 개인 설정값이 있어 표시 중입니다. 값을 비우면 회사 기본값으로 처리됩니다.
                      </span>
                    )}

                    {guidanceText && (
                      <span style={{ fontSize: "11px", fontWeight: "600", color: guidance === "required_override" ? "#dc2626" : "#d97706", marginTop: "2px" }}>
                        ⚠️ {guidanceText}
                      </span>
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
                  <label className="ux_label" style={{ fontSize: "12px" }}>
                    내 보관 단계
                  </label>
                  <span style={{ fontSize: "10px", color: "#10b981", fontWeight: 600 }}>개인 설정 우선</span>
                </div>
                <select
                  className="ux_select_compact"
                  value={userPreferredLevel}
                  onChange={(e) => setUserPreferredLevel(e.target.value)}
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
            className="ux_button_compact ux_button_secondary"
            onClick={onClose}
            style={{
              height: "34px",
              padding: "0 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            취소
          </button>
          <button
            type="button"
            className="ux_button_compact ux_button_primary"
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              height: "34px",
              padding: "0 16px",
              borderRadius: "6px",
              fontSize: "12px",
              border: "none",
            }}
          >
            {saving ? "저장 중..." : "설정 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
