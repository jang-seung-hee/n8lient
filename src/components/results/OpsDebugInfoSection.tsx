"use client";

// [12] 운영 디버그 정보 — debugInfo + snapshots + rawJson(role별) 병합 섹션

import React, { useState } from "react";
import type { Submission } from "@/types/n8lient";
import {
  buildExecutionSnapshotDownload,
  downloadExecutionSnapshotJson,
  getSanitizedDebugInfo,
  maskSensitiveData,
} from "@/common/debug/sanitizeDebugInfo";
import type { ViewerRole } from "./resultDetailTypes";
import { formatResultDisplayValue } from "./formatResultDisplayValue";
import {
  buildDebugClipboardText,
  buildDebugSummaryText,
  copyDebugClipboardText,
  downloadDebugJsonFile,
} from "./buildDebugClipboardText";

interface OpsDebugInfoSectionProps {
  submission: Submission;
  viewerRole: ViewerRole;
}

function isFailedStatus(status: string): boolean {
  return status === "failed" || status === "config_error";
}

const BTN_CLASS =
  "rounded border border-gray-300 bg-white px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-50";

export function OpsDebugInfoSection({ submission, viewerRole }: OpsDebugInfoSectionProps) {
  const [copyLabel, setCopyLabel] = useState("📋 전체 디버그 정보 복사");

  const executionSettings = buildExecutionSnapshotDownload(submission);
  const settingsSnapshot = maskSensitiveData(submission.settingsSnapshot ?? {});
  const retentionSnapshot = maskSensitiveData(submission.retentionPolicySnapshot ?? null);
  const rawSubmission = maskSensitiveData(submission);
  const sanitizedDebug = getSanitizedDebugInfo(submission);
  const failed = isFailedStatus(submission.status);
  const { errorDetails } = submission;

  const settingsKeyCount = submission.settingsSnapshot
    ? Object.keys(submission.settingsSnapshot).length
    : 0;

  const handleCopyAll = async () => {
    try {
      const text = buildDebugClipboardText(submission, viewerRole);
      await copyDebugClipboardText(text);
      setCopyLabel("✅ 복사 완료");
      window.setTimeout(() => setCopyLabel("📋 전체 디버그 정보 복사"), 2000);
    } catch {
      alert("클립보드 복사에 실패했습니다. 브라우저 권한을 확인해 주세요.");
    }
  };

  const handleDownloadExecutionSettings = () => {
    try {
      downloadExecutionSnapshotJson(submission);
    } catch {
      alert("JSON 다운로드에 실패했습니다.");
    }
  };

  const handleDownloadSettingsSnapshot = () => {
    try {
      downloadDebugJsonFile(
        `settings_snapshot_${submission.submissionId}.json`,
        settingsSnapshot
      );
    } catch {
      alert("JSON 다운로드에 실패했습니다.");
    }
  };

  const handleDownloadRawJson = () => {
    try {
      downloadDebugJsonFile(`raw_submission_${submission.submissionId}.json`, rawSubmission);
    } catch {
      alert("JSON 다운로드에 실패했습니다.");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 상단 버튼 */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleCopyAll} className={BTN_CLASS}>
          {copyLabel}
        </button>
        <button type="button" onClick={handleDownloadExecutionSettings} className={BTN_CLASS}>
          📥 실행 설정 JSON 다운로드
        </button>
        <button type="button" onClick={handleDownloadSettingsSnapshot} className={BTN_CLASS}>
          📥 설정 스냅샷 JSON 다운로드
        </button>
        {viewerRole === "operator" && (
          <button type="button" onClick={handleDownloadRawJson} className={BTN_CLASS}>
            📥 Raw JSON 다운로드
          </button>
        )}
      </div>

      {/* 1. 디버그 요약 */}
      <div>
        <p className="mb-1 text-[11px] font-bold text-gray-600">1. 디버그 요약</p>
        <div className="text-[11px] text-gray-600">
          {failed && errorDetails ? (
            <div className="flex flex-col gap-1">
              <div>
                <span className="text-gray-400">실패 단계:</span>{" "}
                {formatResultDisplayValue(errorDetails.phase)}
              </div>
              <div>
                <span className="text-gray-400">실패 위치:</span>{" "}
                {formatResultDisplayValue(errorDetails.source)}
              </div>
              {errorDetails.httpStatus != null && (
                <div>
                  <span className="text-gray-400">HTTP 상태:</span>{" "}
                  {formatResultDisplayValue(errorDetails.httpStatus)}
                </div>
              )}
              {errorDetails.gatewayTraceId && (
                <div>
                  <span className="text-gray-400">추적 ID:</span>{" "}
                  {formatResultDisplayValue(errorDetails.gatewayTraceId)}
                </div>
              )}
              {errorDetails.n8nExecutionId && (
                <div>
                  <span className="text-gray-400">n8n 실행 ID:</span>{" "}
                  {formatResultDisplayValue(errorDetails.n8nExecutionId)}
                </div>
              )}
              {errorDetails.n8nWebhookPath && (
                <div>
                  <span className="text-gray-400">Webhook Path:</span>{" "}
                  {formatResultDisplayValue(errorDetails.n8nWebhookPath)}
                </div>
              )}
              <div className="mt-1 rounded border-l-2 border-gray-300 bg-slate-50 px-2 py-1">
                <strong>확인 힌트:</strong>{" "}
                {formatResultDisplayValue(errorDetails.hint || "n8n 실행 로그를 확인해 주세요.")}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div>
                <span className="text-gray-400">보관 정책:</span>{" "}
                {formatResultDisplayValue(submission.retentionPolicySnapshot?.level ?? "(스냅샷 없음)")}
              </div>
              <div>
                <span className="text-gray-400">설정 스냅샷:</span>{" "}
                {settingsKeyCount > 0
                  ? `${settingsKeyCount}개 키 저장됨`
                  : "settingsSnapshot 없음 (레거시 또는 API Route 경로 실행)"}
              </div>
            </div>
          )}
        </div>
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-2 font-mono text-[10px] text-gray-700">
          {buildDebugSummaryText(submission)}
        </pre>
      </div>

      {/* 2. 설정 병합 요약 */}
      {submission.settingsMergeSummary && (
        <div>
          <p className="mb-1 text-[11px] font-bold text-gray-600">2. 설정 병합 요약</p>
          <div className="rounded border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs text-blue-900">
            <p className="font-semibold">
              {submission.settingsMergeSummary.hasUserSetting
                ? "✅ 사용자 개인 설정 우선 적용"
                : "🏢 회사 기본 설정으로 실행"}
            </p>
            {submission.settingsMergeSummary.mergedKeys.length > 0 && (
              <p className="mt-1 break-all">
                <strong>개인값 키:</strong>{" "}
                {submission.settingsMergeSummary.mergedKeys.join(", ")}
              </p>
            )}
            {submission.settingsMergeSummary.fallbackKeys.length > 0 && (
              <p className="mt-0.5 break-all">
                <strong>회사 기본값 키:</strong>{" "}
                {submission.settingsMergeSummary.fallbackKeys.join(", ")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 3. Snapshot JSON (실행 설정 스냅샷) */}
      <div>
        <p className="mb-1 text-[11px] font-bold text-gray-600">3. Snapshot JSON</p>
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 font-mono text-[11px] text-gray-800">
          {formatResultDisplayValue(executionSettings)}
        </pre>
      </div>

      {/* 4. 실행 설정 / 설정 스냅샷 / 보관 정책 */}
      <div>
        <p className="mb-1 text-[11px] font-bold text-gray-600">4. 실행 설정 JSON</p>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 font-mono text-[11px] text-gray-800">
          {formatResultDisplayValue(sanitizedDebug)}
        </pre>
      </div>

      <div>
        <p className="mb-1 text-[11px] font-bold text-gray-600">설정 스냅샷 JSON</p>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 font-mono text-[11px] text-gray-800">
          {formatResultDisplayValue(settingsSnapshot)}
        </pre>
      </div>

      {retentionSnapshot != null && (
        <div>
          <p className="mb-1 text-[11px] font-bold text-gray-600">보관 정책 Snapshot JSON</p>
          <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 font-mono text-[11px] text-gray-800">
            {formatResultDisplayValue(retentionSnapshot)}
          </pre>
        </div>
      )}

      {/* 5. Raw JSON — operator만 */}
      {viewerRole === "operator" && (
        <div>
          <p className="mb-1 text-[11px] font-bold text-gray-600">
            5. Raw JSON / 개발자 도구
          </p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 font-mono text-[11px] text-gray-800">
            {formatResultDisplayValue(rawSubmission)}
          </pre>
        </div>
      )}
    </div>
  );
}
