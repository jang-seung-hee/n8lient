// 실행 결과 상세 운영 디버그 클립보드 텍스트 및 JSON 다운로드 유틸

import type { Submission } from "@/types/n8lient";
import {
  buildExecutionSnapshotDownload,
  getSanitizedDebugInfo,
  maskSensitiveData,
} from "@/common/debug/sanitizeDebugInfo";
import type { ViewerRole } from "./resultDetailTypes";
import {
  formatResultDisplayValue,
  resolveSubmissionErrorDisplay,
} from "./formatResultDisplayValue";

function stringifyDebugValue(value: unknown): string {
  return formatResultDisplayValue(value);
}

function buildDebugBlock(fileName: string, content: unknown): string {
  return ["---", `파일명: ${fileName}`, "내용:", stringifyDebugValue(content)].join("\n");
}

/** 클립보드용 디버그 요약 텍스트 */
export function buildDebugSummaryText(submission: Submission): string {
  const errorDisplay = resolveSubmissionErrorDisplay(submission);
  const sanitized = getSanitizedDebugInfo(submission);
  const lines: string[] = [
    "디버그 정보 요약:",
    `- 상태: ${submission.status}`,
    `- 오류 코드: ${errorDisplay.code}`,
    `- 오류 메시지: ${errorDisplay.message}`,
  ];

  if (submission.settingsMergeSummary) {
    lines.push(
      `- 설정 병합: ${
        submission.settingsMergeSummary.hasUserSetting
          ? "사용자 개인 설정 우선 적용"
          : "회사 기본 설정으로 실행"
      }`
    );
  }

  if (submission.errorDetails) {
    lines.push(`- 실패 단계: ${formatResultDisplayValue(submission.errorDetails.phase)}`);
    lines.push(`- 실패 위치: ${formatResultDisplayValue(submission.errorDetails.source)}`);
  }

  lines.push("", "Sanitized debug info:", stringifyDebugValue(sanitized));
  return lines.join("\n");
}

export function buildDebugClipboardText(
  submission: Submission,
  viewerRole: ViewerRole
): string {
  const executionSettings = buildExecutionSnapshotDownload(submission);
  const settingsSnapshot = maskSensitiveData(submission.settingsSnapshot ?? {});
  const retentionPolicySnapshot = maskSensitiveData(submission.retentionPolicySnapshot ?? null);
  const settingsMergeSummary = submission.settingsMergeSummary ?? null;
  const rawSubmission = maskSensitiveData(submission);

  const header = [
    "N8Lient 실행 디버그 정보",
    "",
    `실행 ID: ${submission.submissionId}`,
    `워크플로우: ${submission.workflowKey}`,
    `상태: ${submission.status}`,
    `생성일시: ${submission.createdAt}`,
    `완료일시: ${submission.completedAt ?? "-"}`,
  ].join("\n");

  const blocks: string[] = [
    header,
    buildDebugBlock("debug-summary.txt", buildDebugSummaryText(submission)),
    buildDebugBlock("execution-settings.json", executionSettings),
    buildDebugBlock("settings-snapshot.json", settingsSnapshot),
    buildDebugBlock("retention-policy-snapshot.json", retentionPolicySnapshot),
    buildDebugBlock("settings-merge-summary.json", settingsMergeSummary),
  ];

  if (viewerRole === "operator") {
    blocks.push(buildDebugBlock("raw-submission.json", rawSubmission));
  }

  return blocks.join("\n\n");
}

/** JSON 객체를 클라이언트에서 파일로 다운로드 */
export function downloadDebugJsonFile(fileName: string, data: unknown): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function copyDebugClipboardText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
