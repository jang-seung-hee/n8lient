"use strict";
// Gateway용 operator 계약 활성 판정 (프론트 src/common/automation과 동일 규칙)
Object.defineProperty(exports, "__esModule", { value: true });
exports.isClientContractActiveForEmployee = isClientContractActiveForEmployee;
exports.buildClientContractId = buildClientContractId;
function isClientContractActiveForEmployee(contract) {
    if (!contract)
        return false;
    if (contract.enabled !== true)
        return false;
    if (contract.contractStatus !== "active")
        return false;
    return true;
}
function buildClientContractId(clientId, workflowKey) {
    return `${clientId}_${workflowKey}`;
}
