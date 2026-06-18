// workflowTemplates.name을 기준으로 화면 표시명을 resolve하는 공통 유틸입니다.

import type { ClientAutomation, WorkflowTemplate } from "@/types/n8lient";

export interface ResolveWorkflowDisplayNameParams {
  template?: WorkflowTemplate | null;
  automation?: Pick<ClientAutomation, "automationName"> | null;
  workflowKey?: string;
}

/**
 * 화면 표시명 우선순위: template.name → automation.automationName → workflowKey
 */
export function resolveWorkflowDisplayName(
  params: ResolveWorkflowDisplayNameParams
): string {
  const templateName = params.template?.name?.trim();
  if (templateName) return templateName;

  const automationName = params.automation?.automationName?.trim();
  if (automationName) return automationName;

  return params.workflowKey?.trim() || "";
}
