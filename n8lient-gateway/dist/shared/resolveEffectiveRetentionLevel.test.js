"use strict";
/**
 * resolveEffectiveRetentionLevel 단위 검증 — 케이스 A~D
 * 실행: npx tsx n8lient-gateway/src/shared/resolveEffectiveRetentionLevel.test.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const resolveEffectiveRetentionLevel_1 = require("./resolveEffectiveRetentionLevel");
const resolveRetentionPolicy_1 = require("./resolveRetentionPolicy");
const ALL_LEVELS = ["notify_only", "processed_result", "full_archive"];
function assertCase(name, condition, detail) {
    if (!condition) {
        throw new Error(`[FAIL] ${name}${detail ? `: ${detail}` : ""}`);
    }
    console.log(`[PASS] ${name}`);
}
// 테스트 A
{
    const result = (0, resolveEffectiveRetentionLevel_1.resolveEffectiveRetentionLevel)({
        capabilities: { supportedLevels: [...ALL_LEVELS], defaultLevel: "full_archive" },
        operatorDefaultLevel: "processed_result",
        liveContractLimit: { maxLevel: "full_archive", allowedLevels: [...ALL_LEVELS] },
        autoDocContractLimit: { maxLevel: "full_archive", allowedLevels: [...ALL_LEVELS] },
        operatorContractFallback: { maxLevel: "full_archive", allowedLevels: [...ALL_LEVELS] },
        companyPolicy: {
            recommendedLevel: "processed_result",
            allowedUserLevels: ["notify_only", "processed_result"],
            allowUserOverride: true,
        },
        userPreferredLevel: "full_archive",
    });
    assertCase("A effectiveLevel", result.effectiveLevel === "processed_result");
    assertCase("A limitedBy company", result.resolvedFrom.limitedBy === "company_policy");
    assertCase("A optional export none", (0, resolveRetentionPolicy_1.resolveEffectiveOptionalExportProvider)(result.effectiveLevel, "google_drive") === "none");
}
// 테스트 B
{
    const merged = (0, resolveEffectiveRetentionLevel_1.mergeContractRetentionLimits)({ maxLevel: "notify_only", allowedLevels: ["notify_only"] }, { maxLevel: "full_archive", allowedLevels: [...ALL_LEVELS] }, { maxLevel: "full_archive", allowedLevels: [...ALL_LEVELS] });
    assertCase("B merged contract", merged.allowedLevels.join() === "notify_only");
    const result = (0, resolveEffectiveRetentionLevel_1.resolveEffectiveRetentionLevel)({
        capabilities: { supportedLevels: [...ALL_LEVELS], defaultLevel: "full_archive" },
        liveContractLimit: { maxLevel: "notify_only", allowedLevels: ["notify_only"] },
        autoDocContractLimit: { maxLevel: "full_archive", allowedLevels: [...ALL_LEVELS] },
        operatorContractFallback: { maxLevel: "full_archive", allowedLevels: [...ALL_LEVELS] },
        companyPolicy: {
            recommendedLevel: "full_archive",
            allowedUserLevels: [...ALL_LEVELS],
            allowUserOverride: true,
        },
        userPreferredLevel: "full_archive",
    });
    assertCase("B effectiveLevel", result.effectiveLevel === "notify_only");
    assertCase("B optional export none", (0, resolveRetentionPolicy_1.resolveEffectiveOptionalExportProvider)(result.effectiveLevel, "google_drive") === "none");
}
// 테스트 C
{
    const result = (0, resolveEffectiveRetentionLevel_1.resolveEffectiveRetentionLevel)({
        capabilities: { supportedLevels: [...ALL_LEVELS], defaultLevel: "full_archive" },
        liveContractLimit: { maxLevel: "full_archive", allowedLevels: [...ALL_LEVELS] },
        autoDocContractLimit: { maxLevel: "full_archive", allowedLevels: [...ALL_LEVELS] },
        operatorContractFallback: { maxLevel: "full_archive", allowedLevels: [...ALL_LEVELS] },
        companyPolicy: {
            recommendedLevel: "full_archive",
            allowedUserLevels: [...ALL_LEVELS],
            allowUserOverride: true,
        },
        userPreferredLevel: "processed_result",
    });
    assertCase("C effectiveLevel", result.effectiveLevel === "processed_result");
    assertCase("C reason user applied", result.resolvedFrom.reason === "user_preference_applied_within_policy_limits");
}
// 테스트 D
{
    const result = (0, resolveEffectiveRetentionLevel_1.resolveEffectiveRetentionLevel)({
        capabilities: { supportedLevels: [...ALL_LEVELS], defaultLevel: "full_archive" },
        liveContractLimit: { maxLevel: "full_archive", allowedLevels: [...ALL_LEVELS] },
        autoDocContractLimit: { maxLevel: "full_archive", allowedLevels: [...ALL_LEVELS] },
        operatorContractFallback: { maxLevel: "full_archive", allowedLevels: [...ALL_LEVELS] },
        companyPolicy: {
            recommendedLevel: "processed_result",
            allowedUserLevels: [...ALL_LEVELS],
            allowUserOverride: false,
        },
        userPreferredLevel: "full_archive",
    });
    assertCase("D effectiveLevel", result.effectiveLevel === "processed_result");
    assertCase("D limitedBy override disabled", result.resolvedFrom.limitedBy === "company_override_disabled");
}
console.log("\n모든 retention level 검증 케이스 통과");
