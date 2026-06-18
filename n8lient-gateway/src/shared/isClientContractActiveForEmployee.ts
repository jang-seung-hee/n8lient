// Gateway용 operator 계약 활성 판정 (프론트 src/common/automation과 동일 규칙)

type ContractLike = {
  enabled?: boolean;
  contractStatus?: string;
};

export function isClientContractActiveForEmployee(
  contract: ContractLike | null | undefined
): boolean {
  if (!contract) return false;
  if (contract.enabled !== true) return false;
  if (contract.contractStatus !== "active") return false;
  return true;
}

export function buildClientContractId(clientId: string, workflowKey: string): string {
  return `${clientId}_${workflowKey}`;
}
