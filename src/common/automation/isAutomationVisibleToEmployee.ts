// 직원 홈/execute 노출 및 실행 허용 판정 — operator 계약 + 회사 자동화 설정 SSOT

import type { ClientAutomation, ClientContract } from "@/types/n8lient";

/** operator 계약(clientContracts)이 직원 노출·실행에 유효한지 */
export function isClientContractActiveForEmployee(
  contract: ClientContract | null | undefined
): boolean {
  if (!contract) return false;
  if (contract.enabled !== true) return false;
  if (contract.contractStatus !== "active") return false;
  return true;
}

/** 직원에게 노출·실행 가능한 자동화인지 최종 판정 */
export function isAutomationVisibleToEmployee(
  automation: ClientAutomation,
  contract: ClientContract | null | undefined
): boolean {
  if (!isClientContractActiveForEmployee(contract)) return false;
  if (automation.enabled !== true) return false;
  if (automation.configStatus !== "configured") return false;
  if (automation.companyDisabled === true) return false;
  return true;
}

/** clientContracts 문서 ID ({clientId}_{workflowKey}) */
export function buildClientContractId(clientId: string, workflowKey: string): string {
  return `${clientId}_${workflowKey}`;
}
