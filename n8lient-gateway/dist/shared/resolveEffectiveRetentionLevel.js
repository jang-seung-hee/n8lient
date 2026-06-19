"use strict";
/**
 * 실행 시점 보관 레벨 effective value 계산 — 계약·회사·개인 선호를 교집합/clamp
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RETENTION_ORDER = void 0;
exports.mergeContractRetentionLimits = mergeContractRetentionLimits;
exports.resolveEffectiveRetentionLevel = resolveEffectiveRetentionLevel;
exports.applyEffectiveRetentionToSettings = applyEffectiveRetentionToSettings;
exports.RETENTION_ORDER = [
    "notify_only",
    "processed_result",
    "full_archive",
];
const RETENTION_RANK = {
    notify_only: 1,
    processed_result: 2,
    full_archive: 3,
};
function isRetentionLevel(value) {
    return value === "notify_only" || value === "processed_result" || value === "full_archive";
}
function normalizeAllowedLevels(limit, fallback) {
    const raw = limit?.allowedLevels;
    if (!Array.isArray(raw) || raw.length === 0) {
        if (limit?.maxLevel && isRetentionLevel(limit.maxLevel)) {
            const maxIdx = RETENTION_RANK[limit.maxLevel];
            return exports.RETENTION_ORDER.filter((lvl) => RETENTION_RANK[lvl] <= maxIdx);
        }
        return [...fallback];
    }
    return exports.RETENTION_ORDER.filter((lvl) => raw.includes(lvl));
}
/** live contract와 autoDoc 스냅샷의 교집합(더 낮은 한도) */
function mergeContractRetentionLimits(live, snapshot, fallback) {
    const fallbackLevels = normalizeAllowedLevels(fallback, [...exports.RETENTION_ORDER]);
    const liveLevels = live ? normalizeAllowedLevels(live, fallbackLevels) : null;
    const snapshotLevels = snapshot ? normalizeAllowedLevels(snapshot, fallbackLevels) : null;
    let allowedLevels;
    if (liveLevels && snapshotLevels) {
        allowedLevels = exports.RETENTION_ORDER.filter((lvl) => liveLevels.includes(lvl) && snapshotLevels.includes(lvl));
    }
    else if (liveLevels) {
        allowedLevels = liveLevels;
    }
    else if (snapshotLevels) {
        allowedLevels = snapshotLevels;
    }
    else {
        allowedLevels = fallbackLevels;
    }
    if (allowedLevels.length === 0) {
        allowedLevels = [exports.RETENTION_ORDER[0]];
    }
    const liveMax = live?.maxLevel && isRetentionLevel(live.maxLevel) ? live.maxLevel : allowedLevels[allowedLevels.length - 1];
    const snapshotMax = snapshot?.maxLevel && isRetentionLevel(snapshot.maxLevel)
        ? snapshot.maxLevel
        : allowedLevels[allowedLevels.length - 1];
    const maxRank = Math.min(RETENTION_RANK[liveMax], RETENTION_RANK[snapshotMax]);
    const maxLevel = exports.RETENTION_ORDER.find((lvl) => RETENTION_RANK[lvl] === maxRank) ?? allowedLevels[allowedLevels.length - 1];
    const capped = allowedLevels.filter((lvl) => RETENTION_RANK[lvl] <= maxRank);
    return {
        allowedLevels: capped.length > 0 ? capped : [maxLevel],
        maxLevel,
    };
}
function resolveCompanyAllowedUserLevels(companyPolicy, contractAllowedLevels, companyRecommendedLevel) {
    const explicit = companyPolicy.allowedUserLevels;
    if (Array.isArray(explicit) && explicit.length > 0) {
        return exports.RETENTION_ORDER.filter((lvl) => explicit.includes(lvl) && contractAllowedLevels.includes(lvl));
    }
    const recRank = RETENTION_RANK[companyRecommendedLevel];
    return exports.RETENTION_ORDER.filter((lvl) => RETENTION_RANK[lvl] <= recRank && contractAllowedLevels.includes(lvl));
}
function clampToSelectable(requestedLevel, selectableLevels) {
    if (selectableLevels.includes(requestedLevel)) {
        return requestedLevel;
    }
    const reqRank = RETENTION_RANK[requestedLevel];
    const lowerOrEqual = selectableLevels
        .filter((lvl) => RETENTION_RANK[lvl] <= reqRank)
        .sort((a, b) => RETENTION_RANK[b] - RETENTION_RANK[a]);
    if (lowerOrEqual.length > 0) {
        return lowerOrEqual[0];
    }
    return [...selectableLevels].sort((a, b) => RETENTION_RANK[a] - RETENTION_RANK[b])[0];
}
function detectLimitedBy(params) {
    const { canUseUserPreference, userPreferredLevel, requestedLevel, effectiveLevel, selectableLevels, contractAllowedLevels, companyAllowedUserLevels, } = params;
    if (!canUseUserPreference && userPreferredLevel && userPreferredLevel !== effectiveLevel) {
        return {
            limitedBy: "company_override_disabled",
            reason: "company_override_disabled",
        };
    }
    if (userPreferredLevel && userPreferredLevel !== effectiveLevel) {
        if (!contractAllowedLevels.includes(userPreferredLevel)) {
            return {
                limitedBy: "contract_limit",
                reason: "user_preference_exceeds_contract_limit",
            };
        }
        if (!companyAllowedUserLevels.includes(userPreferredLevel)) {
            return {
                limitedBy: "company_policy",
                reason: "user_preference_exceeds_company_allowed_levels",
            };
        }
        if (!selectableLevels.includes(userPreferredLevel)) {
            return {
                limitedBy: "contract_limit",
                reason: "user_preference_clamped_to_max_allowed",
            };
        }
        return {
            limitedBy: "company_policy",
            reason: "user_preference_clamped_to_company_or_contract_limit",
        };
    }
    if (requestedLevel !== effectiveLevel) {
        if (!contractAllowedLevels.includes(requestedLevel)) {
            return {
                limitedBy: "contract_limit",
                reason: "company_recommended_clamped_to_contract_limit",
            };
        }
        return {
            limitedBy: "company_policy",
            reason: "company_recommended_clamped_to_max_allowed",
        };
    }
    if (userPreferredLevel && userPreferredLevel === effectiveLevel) {
        return {
            limitedBy: "none",
            reason: "user_preference_applied_within_policy_limits",
        };
    }
    return {
        limitedBy: "none",
        reason: "company_recommended_level_applied",
    };
}
/** 실행 시점 effective retention level 계산 */
function resolveEffectiveRetentionLevel(params) {
    const { capabilities, operatorDefaultLevel, liveContractLimit, autoDocContractLimit, operatorContractFallback, companyPolicy, userPreferredLevel: rawUserPref, } = params;
    const supportedLevels = exports.RETENTION_ORDER.filter((lvl) => (capabilities.supportedLevels?.length
        ? capabilities.supportedLevels.includes(lvl)
        : true));
    const liveContractAllowed = liveContractLimit
        ? normalizeAllowedLevels(liveContractLimit, [...exports.RETENTION_ORDER])
        : null;
    const autoDocContractAllowed = autoDocContractLimit
        ? normalizeAllowedLevels(autoDocContractLimit, [...exports.RETENTION_ORDER])
        : null;
    const mergedContract = mergeContractRetentionLimits(liveContractLimit, autoDocContractLimit, operatorContractFallback);
    const contractAllowedLevels = mergedContract.allowedLevels;
    const companyRecommendedLevel = isRetentionLevel(companyPolicy.recommendedLevel)
        ? companyPolicy.recommendedLevel
        : isRetentionLevel(companyPolicy.defaultLevel)
            ? companyPolicy.defaultLevel
            : isRetentionLevel(capabilities.defaultLevel)
                ? capabilities.defaultLevel
                : "full_archive";
    const companyAllowedUserLevels = resolveCompanyAllowedUserLevels(companyPolicy, contractAllowedLevels, companyRecommendedLevel);
    const selectableLevels = supportedLevels.filter((lvl) => contractAllowedLevels.includes(lvl) && companyAllowedUserLevels.includes(lvl));
    const safeSelectable = selectableLevels.length > 0
        ? selectableLevels
        : [exports.RETENTION_ORDER.find((lvl) => contractAllowedLevels.includes(lvl)) ?? "notify_only"];
    const userPreferredLevel = isRetentionLevel(rawUserPref) ? rawUserPref : null;
    const canUseUserPreference = companyPolicy.allowUserOverride !== false;
    const requestedLevel = canUseUserPreference && userPreferredLevel ? userPreferredLevel : companyRecommendedLevel;
    const effectiveLevel = clampToSelectable(requestedLevel, safeSelectable);
    const { limitedBy, reason } = detectLimitedBy({
        canUseUserPreference,
        userPreferredLevel,
        requestedLevel,
        effectiveLevel,
        selectableLevels: safeSelectable,
        contractAllowedLevels,
        companyAllowedUserLevels,
    });
    return {
        effectiveLevel,
        selectableLevels: safeSelectable,
        resolvedFrom: {
            workflowDefault: isRetentionLevel(capabilities.defaultLevel) ? capabilities.defaultLevel : null,
            operatorDefault: isRetentionLevel(operatorDefaultLevel) ? operatorDefaultLevel : null,
            companyDefault: companyRecommendedLevel,
            userPreference: userPreferredLevel,
            companyRecommendedLevel,
            contractAllowedLevels,
            liveContractAllowedLevels: liveContractAllowed ?? undefined,
            autoDocContractAllowedLevels: autoDocContractAllowed ?? undefined,
            companyAllowedUserLevels,
            selectableLevels: safeSelectable,
            effectiveLevel,
            limitedBy,
            reason,
        },
    };
}
/** 병합된 settings에 effective retention 관련 키 반영 */
function applyEffectiveRetentionToSettings(finalSettings, effectiveLevel, effectiveOptionalExportProvider) {
    return {
        ...finalSettings,
        retentionLevel: effectiveLevel,
        optionalExportProvider: effectiveOptionalExportProvider,
    };
}
