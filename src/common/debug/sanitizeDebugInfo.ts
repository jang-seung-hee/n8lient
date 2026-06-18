/**
 * 실행 디버깅 정보에서 민감한 정보를 제거하거나 마스킹하고, 다운로드용 스냅샷 JSON을 생성하는 유틸리티입니다.
 */

import type { Submission } from "@/types/n8lient";

const MASKED_VALUE = "******** (마스킹됨)";

/** 민감 키 패턴 (키 이름 기준) */
const SENSITIVE_KEY_REGEX =
  /(secret|token|credential|password|auth|private|accessToken|refreshToken|apiKey|privateKey|secretKey|accessKey|authorization|x-n8n-token|serviceAccount|clientSecret)/i;

/**
 * 객체 내의 민감한 키를 재귀적으로 마스킹합니다.
 */
export function maskSensitiveData(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(maskSensitiveData);
  }

  const resultObj: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      resultObj[key] = MASKED_VALUE;
    } else if (typeof value === "object" && value !== null) {
      resultObj[key] = maskSensitiveData(value);
    } else {
      resultObj[key] = value;
    }
  }
  return resultObj;
}

/**
 * 복사 또는 표시용으로 안전한 디버그 정보 객체를 생성합니다.
 */
export function getSanitizedDebugInfo(submission: Submission): Record<string, unknown> {
  const {
    submissionId,
    workflowKey,
    automationId,
    status,
    error,
    errorDetails,
    createdAt,
    completedAt,
    retentionPolicySnapshot,
  } = submission;

  const debugInfo: Record<string, unknown> = {
    submissionId,
    workflowKey,
    automationId,
    status,
    retentionLevel: retentionPolicySnapshot?.level || null,
    errorCode: error?.code || null,
    errorMessage: error?.message || null,
    createdAt,
    completedAt: completedAt || null,
  };

  if (errorDetails) {
    debugInfo.phase = errorDetails.phase;
    debugInfo.source = errorDetails.source;
    debugInfo.httpStatus = errorDetails.httpStatus || null;
    debugInfo.gatewayTraceId = errorDetails.gatewayTraceId || null;
    debugInfo.n8nExecutionId = errorDetails.n8nExecutionId || null;
    debugInfo.n8nWebhookPath = errorDetails.n8nWebhookPath || null;
    debugInfo.safeTarget = errorDetails.safeTarget || null;
    debugInfo.hint = errorDetails.hint || null;
    debugInfo.occurredAt = errorDetails.occurredAt;
  }

  return debugInfo;
}

/**
 * 실행 당시 submissions 스냅샷 기준 다운로드 JSON 객체를 생성합니다 (마스킹 적용).
 */
export function buildExecutionSnapshotDownload(submission: Submission): Record<string, unknown> {
  const raw = {
    meta: {
      submissionId: submission.submissionId,
      workflowKey: submission.workflowKey,
      workflowVersion: null,
      automationId: submission.automationId,
      clientId: submission.clientId,
      uid: submission.uid,
      status: submission.status,
      createdAt: submission.createdAt,
      completedAt: submission.completedAt ?? null,
    },
    input: submission.input ?? {},
    settingsSnapshot: submission.settingsSnapshot ?? {},
    settingsMergeSummary: submission.settingsMergeSummary ?? null,
    retentionPolicySnapshot: submission.retentionPolicySnapshot ?? null,
    error: submission.error ?? {},
    errorDetails: submission.errorDetails ?? null,
    debugNote: {
      source: "submissions document snapshot",
      description:
        "이 JSON은 현재 설정값이 아니라 실행 당시 submissions 문서에 저장된 스냅샷 기준입니다.",
    },
  };

  return maskSensitiveData(raw) as Record<string, unknown>;
}

/**
 * 실행 설정 스냅샷 JSON 파일을 클라이언트에서 다운로드합니다.
 */
export function downloadExecutionSnapshotJson(submission: Submission): void {
  const sanitized = buildExecutionSnapshotDownload(submission);
  const json = JSON.stringify(sanitized, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `debug_snapshot_${submission.submissionId}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
