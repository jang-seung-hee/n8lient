"use client";

import React from "react";
import type { ClientAutomation, WorkflowTemplate, UserAutomationSettings } from "@/types/n8lient";
import { resolveWorkflowDisplayName } from "@/common/workflow/resolveWorkflowDisplayName";
import { resolveUserSettingGuidanceStatus } from "@/features/user/execute/resolveUserSettingGuidanceStatus";
import WorkflowConfigBadge from "@/components/custom/WorkflowConfigBadge";

interface WorkflowSelectorProps {
  selectedAutoId: string;
  automations: ClientAutomation[];
  templates: Record<string, WorkflowTemplate>;
  userSettings: UserAutomationSettings | null;
  onSelectChange: (autoId: string) => void;
  onOpenSettings: () => void;
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
}: WorkflowSelectorProps) {
  const currentAuto = automations.find((a) => a.automationId === selectedAutoId);
  const currentTemplate = currentAuto ? templates[currentAuto.workflowKey] : null;

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
        <button
          type="button"
          className="ux_button ux_button_secondary"
          onClick={onOpenSettings}
          disabled={!selectedAutoId}
          style={{
            flexShrink: 0,
            height: "38px",
            padding: "0 12px",
            borderRadius: "6px",
            backgroundColor: selectedAutoId ? "#ffffff" : "#f3f4f6",
            color: selectedAutoId ? "#374151" : "#9ca3af",
            cursor: selectedAutoId ? "pointer" : "not-allowed",
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            transition: "all 0.15s ease",
          }}
        >
          🛠️ 내 설정
          {(() => {
            const status = resolveUserSettingGuidanceStatus(currentAuto, currentTemplate, userSettings);
            if (status === "required_missing") {
              return <span className="ux_settings_status_dot ux_settings_status_dot_required" title="개인 설정 필수 항목이 누락되었습니다." />;
            }
            if (status === "recommended_missing") {
              return <span className="ux_settings_status_dot ux_settings_status_dot_recommended" title="개인 설정 권장 항목이 누락되었습니다." />;
            }
            if (status === "complete") {
              return <span className="ux_settings_status_dot ux_settings_status_dot_success" title="모든 안내 대상 개인 설정이 완료되었습니다." />;
            }
            return null;
          })()}
        </button>
      </div>
    </div>
  );
}
