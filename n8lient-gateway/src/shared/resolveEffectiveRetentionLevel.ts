/**
 * 실행 시점 보관 레벨 effective value 계산 — 계약·회사·개인 선호를 교집합/clamp
 */

import type { RetentionLevel } from "./resolveRetentionPolicy";

export const RETENTION_ORDER: readonly RetentionLevel[] = [
  "notify_only",
  "processed_result",
  "full_archive",
] as const;

const RETENTION_RANK: Record<RetentionLevel, number> = {
  notify_only: 1,
  processed_result: 2,
  full_archive: 3,
};

export interface ContractRetentionLimitLike {
  maxLevel?: RetentionLevel | string | null;
  allowedLevels?: RetentionLevel[] | string[] | null;
}

export interface CompanyRetentionPolicyLike {
  recommendedLevel?: RetentionLevel | string | null;
  defaultLevel?: RetentionLevel | string | null;
  allowedUserLevels?: RetentionLevel[] | string[] | null;
  allowUserOverride?: boolean | null;
}

export interface RetentionCapabilitiesLike {
  supportedLevels?: RetentionLevel[] | string[] | null;
  defaultLevel?: RetentionLevel | string | null;
}

export type RetentionLimitSource = "none" | "contract_limit" | "company_policy" | "company_override_disabled";

export interface RetentionLevelResolvedFrom {
  workflowDefault?: RetentionLevel | null;
  operatorDefault?: RetentionLevel | null;
  companyDefault?: RetentionLevel | null;
  userPreference?: RetentionLevel | null;
  companyRecommendedLevel?: RetentionLevel | null;
  contractAllowedLevels?: RetentionLevel[];
  liveContractAllowedLevels?: RetentionLevel[];
  autoDocContractAllowedLevels?: RetentionLevel[];
  companyAllowedUserLevels?: RetentionLevel[];
  selectableLevels?: RetentionLevel[];
  effectiveLevel?: RetentionLevel;
  limitedBy?: RetentionLimitSource;
  reason: string;
}

export interface ResolveEffectiveRetentionLevelParams {
  capabilities: RetentionCapabilitiesLike;
  operatorDefaultLevel?: RetentionLevel | string | null;
  liveContractLimit?: ContractRetentionLimitLike | null;
  autoDocContractLimit?: ContractRetentionLimitLike | null;
  operatorContractFallback: ContractRetentionLimitLike;
  companyPolicy: CompanyRetentionPolicyLike;
  userPreferredLevel?: RetentionLevel | string | null;
}

export interface ResolveEffectiveRetentionLevelResult {
  effectiveLevel: RetentionLevel;
  selectableLevels: RetentionLevel[];
  resolvedFrom: RetentionLevelResolvedFrom;
}

function isRetentionLevel(value: unknown): value is RetentionLevel {
  return value === "notify_only" || value === "processed_result" || value === "full_archive";
}

function normalizeAllowedLevels(
  limit: ContractRetentionLimitLike | null | undefined,
  fallback: RetentionLevel[]
): RetentionLevel[] {
  const raw = limit?.allowedLevels;
  if (!Array.isArray(raw) || raw.length === 0) {
    if (limit?.maxLevel && isRetentionLevel(limit.maxLevel)) {
      const maxIdx = RETENTION_RANK[limit.maxLevel];
      return RETENTION_ORDER.filter((lvl) => RETENTION_RANK[lvl] <= maxIdx);
    }
    return [...fallback];
  }
  return RETENTION_ORDER.filter((lvl) => raw.includes(lvl));
}

/** live contract와 autoDoc 스냅샷의 교집합(더 낮은 한도) */
export function mergeContractRetentionLimits(
  live: ContractRetentionLimitLike | null | undefined,
  snapshot: ContractRetentionLimitLike | null | undefined,
  fallback: ContractRetentionLimitLike
): { allowedLevels: RetentionLevel[]; maxLevel: RetentionLevel } {
  const fallbackLevels = normalizeAllowedLevels(fallback, [...RETENTION_ORDER]);
  const liveLevels = live ? normalizeAllowedLevels(live, fallbackLevels) : null;
  const snapshotLevels = snapshot ? normalizeAllowedLevels(snapshot, fallbackLevels) : null;

  let allowedLevels: RetentionLevel[];
  if (liveLevels && snapshotLevels) {
    allowedLevels = RETENTION_ORDER.filter(
      (lvl) => liveLevels.includes(lvl) && snapshotLevels.includes(lvl)
    );
  } else if (liveLevels) {
    allowedLevels = liveLevels;
  } else if (snapshotLevels) {
    allowedLevels = snapshotLevels;
  } else {
    allowedLevels = fallbackLevels;
  }

  if (allowedLevels.length === 0) {
    allowedLevels = [RETENTION_ORDER[0]];
  }

  const liveMax =
    live?.maxLevel && isRetentionLevel(live.maxLevel) ? live.maxLevel : allowedLevels[allowedLevels.length - 1];
  const snapshotMax =
    snapshot?.maxLevel && isRetentionLevel(snapshot.maxLevel)
      ? snapshot.maxLevel
      : allowedLevels[allowedLevels.length - 1];
  const maxRank = Math.min(RETENTION_RANK[liveMax], RETENTION_RANK[snapshotMax]);
  const maxLevel = RETENTION_ORDER.find((lvl) => RETENTION_RANK[lvl] === maxRank) ?? allowedLevels[allowedLevels.length - 1];

  const capped = allowedLevels.filter((lvl) => RETENTION_RANK[lvl] <= maxRank);
  return {
    allowedLevels: capped.length > 0 ? capped : [maxLevel],
    maxLevel,
  };
}

function resolveCompanyAllowedUserLevels(
  companyPolicy: CompanyRetentionPolicyLike,
  contractAllowedLevels: RetentionLevel[],
  companyRecommendedLevel: RetentionLevel
): RetentionLevel[] {
  const explicit = companyPolicy.allowedUserLevels;
  if (Array.isArray(explicit) && explicit.length > 0) {
    return RETENTION_ORDER.filter(
      (lvl) => explicit.includes(lvl) && contractAllowedLevels.includes(lvl)
    );
  }

  const recRank = RETENTION_RANK[companyRecommendedLevel];
  return RETENTION_ORDER.filter(
    (lvl) => RETENTION_RANK[lvl] <= recRank && contractAllowedLevels.includes(lvl)
  );
}

function clampToSelectable(
  requestedLevel: RetentionLevel,
  selectableLevels: RetentionLevel[]
): RetentionLevel {
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

function detectLimitedBy(params: {
  canUseUserPreference: boolean;
  userPreferredLevel: RetentionLevel | null;
  requestedLevel: RetentionLevel;
  effectiveLevel: RetentionLevel;
  selectableLevels: RetentionLevel[];
  contractAllowedLevels: RetentionLevel[];
  companyAllowedUserLevels: RetentionLevel[];
}): { limitedBy: RetentionLimitSource; reason: string } {
  const {
    canUseUserPreference,
    userPreferredLevel,
    requestedLevel,
    effectiveLevel,
    selectableLevels,
    contractAllowedLevels,
    companyAllowedUserLevels,
  } = params;

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
export function resolveEffectiveRetentionLevel(
  params: ResolveEffectiveRetentionLevelParams
): ResolveEffectiveRetentionLevelResult {
  const {
    capabilities,
    operatorDefaultLevel,
    liveContractLimit,
    autoDocContractLimit,
    operatorContractFallback,
    companyPolicy,
    userPreferredLevel: rawUserPref,
  } = params;

  const supportedLevels = RETENTION_ORDER.filter((lvl) =>
    (capabilities.supportedLevels?.length
      ? capabilities.supportedLevels.includes(lvl)
      : true)
  );

  const liveContractAllowed = liveContractLimit
    ? normalizeAllowedLevels(liveContractLimit, [...RETENTION_ORDER])
    : null;
  const autoDocContractAllowed = autoDocContractLimit
    ? normalizeAllowedLevels(autoDocContractLimit, [...RETENTION_ORDER])
    : null;

  const mergedContract = mergeContractRetentionLimits(
    liveContractLimit,
    autoDocContractLimit,
    operatorContractFallback
  );
  const contractAllowedLevels = mergedContract.allowedLevels;

  const companyRecommendedLevel: RetentionLevel = isRetentionLevel(companyPolicy.recommendedLevel)
    ? companyPolicy.recommendedLevel
    : isRetentionLevel(companyPolicy.defaultLevel)
      ? companyPolicy.defaultLevel
      : isRetentionLevel(capabilities.defaultLevel)
        ? capabilities.defaultLevel
        : "full_archive";

  const companyAllowedUserLevels = resolveCompanyAllowedUserLevels(
    companyPolicy,
    contractAllowedLevels,
    companyRecommendedLevel
  );

  const selectableLevels = supportedLevels.filter(
    (lvl) => contractAllowedLevels.includes(lvl) && companyAllowedUserLevels.includes(lvl)
  );

  const safeSelectable =
    selectableLevels.length > 0
      ? selectableLevels
      : [RETENTION_ORDER.find((lvl) => contractAllowedLevels.includes(lvl)) ?? "notify_only"];

  const userPreferredLevel = isRetentionLevel(rawUserPref) ? rawUserPref : null;
  const canUseUserPreference = companyPolicy.allowUserOverride !== false;

  const requestedLevel: RetentionLevel =
    canUseUserPreference && userPreferredLevel ? userPreferredLevel : companyRecommendedLevel;

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
export function applyEffectiveRetentionToSettings(
  finalSettings: Record<string, unknown>,
  effectiveLevel: RetentionLevel,
  effectiveOptionalExportProvider: "none" | "google_drive"
): Record<string, unknown> {
  return {
    ...finalSettings,
    retentionLevel: effectiveLevel,
    optionalExportProvider: effectiveOptionalExportProvider,
  };
}
