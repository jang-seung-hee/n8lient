import { useState, Fragment } from "react";
import type { ClientContract, ClientAutomation, WorkflowTemplate } from "@/types/n8lient";
import AutomationNoticeBox from "@/components/core/automation/AutomationNoticeBox";
import { resolveWorkflowDisplayName } from "@/common/workflow/resolveWorkflowDisplayName";
import { SectionTabs } from "@/components/core/layout/SectionTabs";

interface CompanyAutomationDetailProps {
  contract: ClientContract;
  automation: ClientAutomation | null;
  template: WorkflowTemplate | null;
  onBack: () => void;
  onEdit: () => void;
  onToggleEmployeeAccess: (
    disabled: boolean,
    reason?: string
  ) => Promise<{ success: boolean; message?: string }>;
}

export default function CompanyAutomationDetail({
  contract,
  automation,
  template,
  onBack,
  onEdit,
  onToggleEmployeeAccess,
}: CompanyAutomationDetailProps) {
  const [toggleLoading, setToggleLoading] = useState(false);
  const [disableReason, setDisableReason] = useState("");
  const [toggleError, setToggleError] = useState<string | null>(null);

  // 탭 상태 관리
  const [activeTab, setActiveTab] = useState("basic");

  const isSecurityKey = (key: string) => {
    const lowercaseKey = key.toLowerCase();
    const forbiddenKeywords = ["token", "secret", "apikey", "credential", "accesstoken", "refreshtoken"];
    return forbiddenKeywords.some((keyword) => lowercaseKey.includes(keyword));
  };

  const noticeText = automation?.noticeText?.trim() ?? "";
  const displayName = resolveWorkflowDisplayName({
    template,
    automation,
    workflowKey: contract.workflowKey,
  });

  const isEmployeeDisabled = automation?.companyDisabled === true;

  const handleToggleEmployeeAccess = async () => {
    if (!automation) return;

    setToggleLoading(true);
    setToggleError(null);

    const nextDisabled = !isEmployeeDisabled;
    const result = await onToggleEmployeeAccess(
      nextDisabled,
      nextDisabled ? disableReason : undefined
    );

    if (result.success) {
      if (!nextDisabled) {
        setDisableReason("");
      }
    } else {
      setToggleError(result.message || "설정 변경에 실패했습니다.");
    }

    setToggleLoading(false);
  };

  const companyAutomationDetailTabs = [
    { key: "basic", label: "기본 정보" },
    { key: "settings", label: "실행 설정값" },
  ];

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
      {/* 상단 공통 영역 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f3f4f6", paddingBottom: "12px" }}>
        <div>
          <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>N8N 워크플로우 상세 정보</span>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#111827", margin: "2px 0 0 0" }}>
            {displayName}
          </h3>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="ux_button_compact ux_button_secondary"
            onClick={onBack}
            style={{
              height: "34px",
              padding: "0 12px",
              borderRadius: "6px",
              fontSize: "12px",
              color: "#4b5563",
            }}
          >
            ⬅️ 목록으로
          </button>
          <button
            className="ux_button_compact ux_button_primary"
            onClick={onEdit}
            style={{
              height: "34px",
              padding: "0 12px",
              borderRadius: "6px",
              fontSize: "12px",
              border: "none",
            }}
          >
            ⚙️ 설정 편집
          </button>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <SectionTabs
        items={companyAutomationDetailTabs}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {/* 탭 1. 기본 정보 */}
      {activeTab === "basic" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <span className="ux_caption" style={{ fontWeight: 500 }}>workflowKey</span>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#111111", margin: "4px 0 0 0", fontFamily: "monospace" }}>
                {contract.workflowKey}
              </p>
            </div>
            <div>
              <span className="ux_caption" style={{ fontWeight: 500 }}>설정 상태</span>
              <p style={{ fontSize: "14px", fontWeight: 600, color: automation ? "#059669" : "#dc2626", margin: "4px 0 0 0" }}>
                {automation ? "설정 완료" : "⚠️ 설정 미완료"}
              </p>
            </div>
            <div>
              <span className="ux_caption" style={{ fontWeight: 500 }}>사용자 활성 상태</span>
              <p style={{ fontSize: "14px", fontWeight: 600, color: automation?.enabled ? "#059669" : "#dc2626", margin: "4px 0 0 0" }}>
                {automation?.enabled ? "노출 및 활성화됨" : "비활성화됨"}
              </p>
            </div>
            <div>
              <span className="ux_caption" style={{ fontWeight: 500 }}>직원 사용</span>
              <p style={{ fontSize: "14px", fontWeight: 600, margin: "4px 0 0 0" }}>
                {!automation ? (
                  <span style={{ color: "#9ca3af" }}>-</span>
                ) : isEmployeeDisabled ? (
                  <span style={{ color: "#92400e" }}>🚫 사용 안함 (직원에게 숨김)</span>
                ) : (
                  <span style={{ color: "#1e40af" }}>✅ 사용함</span>
                )}
              </p>
            </div>
            <div>
              <span className="ux_caption" style={{ fontWeight: 500 }}>최종 수정 일시</span>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "#111111", margin: "4px 0 0 0" }}>
                {automation?.updatedAt ? new Date(automation.updatedAt).toLocaleString() : "-"}
              </p>
            </div>
          </div>

          {template?.description && (
            <div className="ux_alert ux_alert_muted" style={{ borderRadius: "6px" }}>
              <span className="ux_card_title" style={{ fontWeight: 600 }}>N8N 워크플로우 설명</span>
              <p className="ux_body_text" style={{ margin: "4px 0 0 0" }}>
                {template.description}
              </p>
            </div>
          )}

          <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "8px 0" }} />

          {/* 직원 사용 제어 섹션 */}
          {automation && (
            <div
              className={isEmployeeDisabled ? "ux_alert ux_alert_warning" : "ux_alert ux_alert_success"}
              style={{
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                border: isEmployeeDisabled ? undefined : "1px solid #bbf7d0",
                margin: 0,
              }}
            >
              <div>
                <span className="ux_label" style={{ fontSize: "13px", fontWeight: 600 }}>
                  👥 직원에게 사용함 / 사용 안함
                </span>
                <p className="ux_help_text" style={{ margin: "4px 0 0 0" }}>
                  오퍼레이터 매핑·활성 상태와 별도로, 회사 직원의 실행·목록 노출만 제어합니다. 기존 실행 기록은 유지됩니다.
                </p>
              </div>

              {isEmployeeDisabled && automation.companyDisableReason && (
                <p style={{ fontSize: "12px", color: "#92400e", margin: 0 }}>
                  사유: {automation.companyDisableReason}
                </p>
              )}

              {!isEmployeeDisabled && (
                <input
                  type="text"
                  value={disableReason}
                  onChange={(e) => setDisableReason(e.target.value)}
                  placeholder="사용 안함 사유 (선택)"
                  className="ux_input"
                  style={{
                    maxWidth: "400px",
                  }}
                />
              )}

              {toggleError && (
                <p style={{ fontSize: "12px", color: "#b91c1c", margin: 0 }}>{toggleError}</p>
              )}

              <button
                type="button"
                onClick={handleToggleEmployeeAccess}
                disabled={toggleLoading}
                className={isEmployeeDisabled ? "ux_button ux_button_primary" : "ux_button ux_button_danger"}
                style={{
                  alignSelf: "flex-start",
                  height: "34px",
                  padding: "0 14px",
                }}
              >
                {toggleLoading
                  ? "처리 중..."
                  : isEmployeeDisabled
                    ? "✅ 직원에게 다시 사용함"
                    : "🚫 직원에게 사용 안함"}
              </button>
            </div>
          )}

          {/* 사용방법 안내 섹션 */}
          {noticeText && (
            <AutomationNoticeBox
              noticeText={noticeText}
              workflowKey={automation?.workflowKey || contract.workflowKey}
              userId={automation?.createdBy}
              updatedAt={automation?.updatedAt}
            />
          )}
        </div>
      )}

      {/* 탭 2. 실행 설정값 */}
      {activeTab === "settings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="ux_alert ux_alert_info" style={{ borderRadius: "6px", fontSize: "12.5px", lineHeight: 1.5, margin: 0 }}>
            ℹ️ <strong>개인 설정 우선 적용 안내</strong><br />
            이 값은 회사 공용 기본값입니다. 사용자가 개인 설정을 저장하면 개인 설정이 우선 적용되고, 비어 있는 값은 회사 기본값을 사용합니다.
          </div>

          <div className="ux_panel">
            <h4 className="ux_card_title" style={{ fontSize: "13px", margin: "0 0 12px 0" }}>
              📁 회사 공용 기본 설정값
            </h4>
            {!automation || !automation.settings || Object.keys(automation.settings).length === 0 ? (
              <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0, padding: "16px 0", textAlign: "center", border: "1px dashed #e5e7eb", borderRadius: "6px" }}>
                등록된 공용 설정값이 없습니다. 설정 편집을 통해 채워주십시오.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {template?.configSchema && template.configSchema.length > 0 && (
                  <div className="ux_scroll_area">
                    <table className="ux_key_value_table">
                      <tbody>
                        {template.configSchema
                          .filter((field) => !isSecurityKey(field.key))
                          .map((field) => {
                            const val = automation.settings[field.key];
                            const fType = field.type as string;

                            // 1. 실제 저장값이 존재하는지 체크
                            // 숫자 0 과 boolean false 는 빈값 처리 대상에서 제외
                            const hasValue =
                              val !== null &&
                              val !== undefined &&
                              !(typeof val === "string" && val.trim() === "");

                            let resolvedVal: any = null;
                            let isDefaulted = false;

                            if (hasValue) {
                              resolvedVal = val;
                            } else {
                              // 2. 저장값이 없고 field.defaultValue 또는 기본 option 값이 존재하는지 체크
                              let defaultVal = field.defaultValue;

                              if (
                                defaultVal === undefined ||
                                defaultVal === null ||
                                defaultVal === ""
                              ) {
                                // select/radio/enum 계열일 때 options 배열의 첫 번째 항목을 기본값으로 사용
                                if (
                                  (fType === "select" ||
                                    fType === "radio" ||
                                    fType === "enum") &&
                                  field.options &&
                                  field.options.length > 0
                                ) {
                                  defaultVal = field.options[0];
                                }
                              }

                              if (
                                defaultVal !== undefined &&
                                defaultVal !== null &&
                                defaultVal !== ""
                              ) {
                                resolvedVal = defaultVal;
                                isDefaulted = true;
                              }
                            }

                            // 3. 저장값도 없고 기본값도 없으면 최종 빈값 처리
                            const isEmpty =
                              resolvedVal === null ||
                              resolvedVal === undefined ||
                              (typeof resolvedVal === "string" && resolvedVal.trim() === "");

                            // 표시값 해석 (특히 select/radio/enum 계열 룩업)
                            let displayVal = "";
                            if (isEmpty) {
                              displayVal = "빈값";
                            } else if (
                              (fType === "select" ||
                                fType === "radio" ||
                                fType === "enum") &&
                              field.options &&
                              Array.isArray(field.options)
                            ) {
                              const stringVal = String(resolvedVal);
                              // options 배열에서 매칭되는 항목 탐색 (객체 형태 { value, label } 또는 문자열 형태 모두 대응 가능하도록 any 캐스팅)
                              const opt = field.options.find((o: any) => {
                                if (typeof o === "object" && o !== null) {
                                  return String(o.value) === stringVal;
                                }
                                return String(o) === stringVal;
                              });

                              if (opt) {
                                if (typeof opt === "object" && opt !== null) {
                                  displayVal = (opt as any).label || String((opt as any).value);
                                } else {
                                  displayVal = String(opt);
                                }
                              } else {
                                displayVal = stringVal;
                              }
                            } else if (typeof resolvedVal === "boolean") {
                              displayVal = resolvedVal ? "예 (true)" : "아니오 (false)";
                            } else {
                              displayVal = String(resolvedVal);
                            }

                            const desc = field.description || field.placeholder || "";
                            return (
                              <Fragment key={field.key}>
                                <tr>
                                  <th scope="row">
                                    {field.label || field.key}
                                    <span className="ux_key_value_tech_key">{field.key}</span>
                                  </th>
                                  <td>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                      <span
                                        className={
                                          isEmpty
                                            ? "ux_key_value_value_empty"
                                            : "ux_key_value_value_box"
                                        }
                                      >
                                        {displayVal}
                                      </span>
                                      {isDefaulted && (
                                        <span className="ux_key_value_default_badge">
                                          회사 설정값 없음 · 기본값 사용
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                                {desc && (
                                  <tr className="ux_key_value_description_row">
                                    <td colSpan={2}>* {desc}</td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}

                {(() => {
                  const schemaKeys = new Set(template?.configSchema?.map((f) => f.key) || []);
                  const extraSettings = Object.entries(automation.settings).filter(
                    ([key]) => !schemaKeys.has(key) && !isSecurityKey(key)
                  );

                  if (extraSettings.length === 0) return null;

                  return (
                    <div style={{ marginTop: "8px" }}>
                      <h5 style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563", margin: "0 0 10px 0" }}>
                        ⚙️ 기타 설정값 (이전 스키마 또는 임시 데이터)
                      </h5>
                      <div className="ux_scroll_area">
                        <table className="ux_key_value_table">
                          <tbody>
                            {extraSettings.map(([key, val]) => {
                              const isEmpty =
                                val === null ||
                                val === undefined ||
                                (typeof val === "string" && val.trim() === "");

                              const displayVal = isEmpty ? "빈값" : String(val);

                              return (
                                <tr key={key}>
                                  <th scope="row">
                                    <span style={{ color: "#ef4444" }}>{key}</span>
                                    <span className="ux_key_value_tech_key">(정의되지 않은 스키마)</span>
                                  </th>
                                  <td>
                                    <span
                                      className={
                                        isEmpty
                                          ? "ux_key_value_value_empty"
                                          : "ux_key_value_value_box"
                                      }
                                    >
                                      {displayVal}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
