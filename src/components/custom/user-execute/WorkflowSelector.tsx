"use client";

import React from "react";
import type { ClientAutomation, WorkflowTemplate, UserAutomationSettings } from "@/types/n8lient";
import { resolveWorkflowDisplayName } from "@/common/workflow/resolveWorkflowDisplayName";
import { resolveUserSettingGuidanceStatus } from "@/features/user/execute/resolveUserSettingGuidanceStatus";
import WorkflowConfigBadge from "@/components/custom/WorkflowConfigBadge";
import AutomationNoticeBox from "@/components/core/automation/AutomationNoticeBox";

interface WorkflowSelectorProps {
  selectedAutoId: string;
  automations: ClientAutomation[];
  templates: Record<string, WorkflowTemplate>;
  userSettings: UserAutomationSettings | null;
  onSelectChange: (autoId: string) => void;
  onOpenSettings: () => void;
  noticeText?: string;
  noticeUserId?: string;
  noticeUpdatedAt?: string;
}

/**
 * N8N 워크플로우 실행 요청 화면에서 활성화된 워크플로우 목록을 조회하고 
 * 워크플로우의 구성 배지 및 개인 설정 유도 상태(상태점)를 포함한 셀렉트 컴포넌트입니다.
 */
export default function WorkflowSelector({
  selectedAutoId,
  automations,
  templates,
  userSettings,
  onSelectChange,
  onOpenSettings,
  noticeText,
  noticeUserId,
  noticeUpdatedAt,
}: WorkflowSelectorProps) {
  const currentAuto = automations.find((a) => a.automationId === selectedAutoId);
  const currentTemplate = currentAuto ? templates[currentAuto.workflowKey] : null;
  const hasUsageGuide = Boolean(noticeText?.trim());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>
          N8N 워크플로우 선택
        </label>
        {currentAuto && (
          <WorkflowConfigBadge
            automation={currentAuto}
            template={currentTemplate}
            userSettings={userSettings}
          />
        )}
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0, maxWidth: "100%" }}>
          <select
            className="ux_select"
            value={selectedAutoId}
            onChange={(e) => onSelectChange(e.target.value)}
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {automations.map((a) => (
              <option key={a.automationId} value={a.automationId}>
                {resolveWorkflowDisplayName({
                  template: templates[a.workflowKey],
                  automation: a,
                  workflowKey: a.workflowKey,
                })}
              </option>
            ))}
          </select>
        </div>
        <div className="ux_execute_top_actions">
          <button
            type="button"
            className="ux_button ux_button_secondary ux_execute_settings_button"
            onClick={onOpenSettings}
            disabled={!selectedAutoId}
          >
            🛠️ 내 설정
            {(() => {
              const status = resolveUserSettingGuidanceStatus(currentAuto, currentTemplate, userSettings);
              if (status === "required_missing") {
                return (
                  <span
                    className="ux_settings_status_dot ux_settings_status_dot_required"
                    title="개인 설정 필수 항목이 누락되었습니다."
                  />
                );
              }
              if (status === "recommended_missing") {
                return (
                  <span
                    className="ux_settings_status_dot ux_settings_status_dot_recommended"
                    title="개인 설정 권장 항목이 누락되었습니다."
                  />
                );
              }
              if (status === "complete") {
                return (
                  <span
                    className="ux_settings_status_dot ux_settings_status_dot_success"
                    title="모든 안내 대상 개인 설정이 완료되었습니다."
                  />
                );
              }
              return null;
            })()}
          </button>
          {hasUsageGuide && currentAuto && (
            <AutomationNoticeBox
              variant="icon"
              noticeText={noticeText!}
              workflowKey={currentAuto.workflowKey}
              userId={noticeUserId}
              updatedAt={noticeUpdatedAt ?? currentAuto.updatedAt}
            />
          )}
        </div>
      </div>
      {currentAuto && (
        (() => {
          const policy = currentAuto.retentionPolicy || currentTemplate?.retentionPolicy || { level: "full_archive" };
          const level = policy.level || "full_archive";

          let rawAccessMode: string | undefined = undefined;
          if (currentAuto.resultAccessPolicy && typeof currentAuto.resultAccessPolicy === "object") {
            rawAccessMode = currentAuto.resultAccessPolicy.defaultAccessMode;
          }
          if (!rawAccessMode && currentTemplate?.resultAccessPolicy && typeof currentTemplate.resultAccessPolicy === "object") {
            rawAccessMode = currentTemplate.resultAccessPolicy.defaultAccessMode;
          }
          const resolvedAccessMode = rawAccessMode === "company" ? "company" : "private";

          let accessSummaryText = "";
          let badgeBgColor = "";
          let badgeTextColor = "";
          const accessSummaryTitle =
            "DB 결과 공개 범위입니다. 이메일·캘린더·Google Drive는 공개 전환 대상이 아닙니다.";

          if (level === "notify_only") {
            accessSummaryText = "DB 결과 : 저장 안 함 (DB에 보관하지 않습니다)";
            badgeBgColor = "#f3f4f6";
            badgeTextColor = "#4b5563";
          } else if (resolvedAccessMode === "company") {
            accessSummaryText = "DB 결과 : 회사 공개 (소속 직원이 볼 수 있습니다)";
            badgeBgColor = "#d1fae5";
            badgeTextColor = "#065f46";
          } else {
            accessSummaryText = "DB 결과 : 개인 보관 (다른 사람은 볼 수 없습니다)";
            badgeBgColor = "#eff6ff";
            badgeTextColor = "#1d4ed8";
          }

          return (
            <p
              className="ux_execute_db_access_summary"
              title={accessSummaryTitle}
              style={{
                margin: "6px 0 0",
                fontSize: "11px",
                padding: "4px 8px",
                borderRadius: "4px",
                fontWeight: 600,
                backgroundColor: badgeBgColor,
                color: badgeTextColor,
                lineHeight: 1.35,
              }}
            >
              🔒 {accessSummaryText}
            </p>
          );
        })()
      )}
    </div>
  );
}
