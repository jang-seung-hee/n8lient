/**
 * N8Lient Gateway Retention Policy Resolver
 * v2.1 핵심 최적화 규격 준수 + optional export 정책 게이트
 */

import type { RetentionLevelResolvedFrom } from "./resolveEffectiveRetentionLevel";

export type RetentionLevel = "notify_only" | "processed_result" | "full_archive";

export interface EffectiveRetentionPolicy {
  level: RetentionLevel;
  emailEnabled: boolean;
  emailAttachResult: boolean;
  emailAttachOriginal: boolean;
  storeProcessorResult: boolean;
  storeOriginalFiles: boolean;
  storeOriginalFileRefs: boolean;
  storeResultRefs: boolean;
  storageProvider: "none" | "firebase_storage";
  optionalExportProvider: "none" | "google_drive";
  resolvedFrom: RetentionLevelResolvedFrom;
}

export interface ResolveRetentionPolicyParams {
  finalLevel: RetentionLevel;
  finalSettings: Record<string, unknown>;
  input: {
    inputType: string;
    fileName?: string | null;
    fileUrl?: string | null;
  };
  hasFile: boolean;
  resolvedFrom: RetentionLevelResolvedFrom;
}

/**
 * effective level 기준 optional export 허용 여부 (보수적: full_archive만)
 */
export function resolveEffectiveOptionalExportProvider(
  finalLevel: RetentionLevel,
  rawOptionalExport: unknown
): "none" | "google_drive" {
  if (finalLevel !== "full_archive") {
    return "none";
  }
  return rawOptionalExport === "google_drive" ? "google_drive" : "none";
}

/**
 * 최종 보관 정책(Retention Policy)을 계산합니다.
 */
export function resolveRetentionPolicy(params: ResolveRetentionPolicyParams): EffectiveRetentionPolicy {
  const { finalLevel, finalSettings, input, hasFile, resolvedFrom } = params;

  const storeProcessorResult = finalLevel !== "notify_only";
  const storeOriginalFiles = finalLevel === "full_archive";
  const storeOriginalFileRefs = finalLevel === "full_archive";
  const storeResultRefs = finalLevel === "full_archive";
  const storageProvider = storeOriginalFiles ? "firebase_storage" : "none";

  const emailEnabled = Boolean(finalSettings.reportEmailTo) && finalSettings.emailEnabled !== false;
  const emailAttachResult = emailEnabled && finalSettings.emailAttachResult === true;

  const hasOriginalInput =
    ["audio", "image", "file"].includes(input.inputType) &&
    Boolean(input.fileName || hasFile || input.fileUrl);
  const emailAttachOriginal = emailEnabled && finalSettings.emailAttachOriginal === true && hasOriginalInput;

  const optionalExportProvider = resolveEffectiveOptionalExportProvider(
    finalLevel,
    finalSettings.optionalExportProvider
  );

  return {
    level: finalLevel,
    emailEnabled,
    emailAttachResult,
    emailAttachOriginal,
    storeProcessorResult,
    storeOriginalFiles,
    storeOriginalFileRefs,
    storeResultRefs,
    storageProvider,
    optionalExportProvider,
    resolvedFrom: {
      ...resolvedFrom,
      effectiveLevel: finalLevel,
    },
  };
}
