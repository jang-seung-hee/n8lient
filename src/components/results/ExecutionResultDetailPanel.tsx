"use client";

// 실행 결과 상세 14섹션 패널 — 역할별 visibility 정책에 따라 렌더

import React from "react";
import type { Submission } from "@/types/n8lient";
import { getSubmissionDisplayTitle } from "@/common/submission/getSubmissionDisplayTitle";
import { SubmissionStatusBadge } from "@/components/core/submission/SubmissionStatusBadge";
import { OpsDebugInfoSection } from "./OpsDebugInfoSection";
import { ResultSectionAccordion } from "./ResultSectionAccordion";
import { getSectionVisibility } from "./resultDetailVisibility";
import {
  formatSubmissionActorLabel,
  type UserDisplaySource,
} from "@/common/user/formatUserDisplayName";
import {
  formatResultDisplayValue,
  resolveSubmissionErrorDisplay,
} from "./formatResultDisplayValue";
import {
  RESULT_SECTION_ORDER,
  type ResultSectionKey,
  type ViewerRole,
} from "./resultDetailTypes";

export interface ExecutionResultDetailPanelProps {
  submission: Submission;
  viewerRole: ViewerRole;
  /** 실행자 표시용 사용자 정보 (미제공 시 submission.uid fallback) */
  actorDisplaySource?: UserDisplaySource | null;
  /** 파일 다운로드 (user 경로 등). 미제공 시 다운로드 버튼 비활성 */
  onDownloadFile?: (
    refType: "original" | "result",
    index: number,
    fileName: string
  ) => Promise<void>;
  downloadingIndex?: { type: string; idx: number } | null;
  /** MD 내보내기. 미제공 시 버튼 비활성 */
  onMarkdownExport?: () => void;
}

function isFailedStatus(status: string): boolean {
  return status === "failed" || status === "config_error";
}

function renderRetentionLevelLabel(level: string): React.ReactNode {
  if (level === "notify_only") {
    return (
      <span className="font-semibold text-amber-600">알림/로그형 (notify_only)</span>
    );
  }
  if (level === "processed_result") {
    return (
      <span className="font-semibold text-blue-600">가공지식 저장형 (processed_result)</span>
    );
  }
  return (
    <span className="font-semibold text-teal-600">원본 포함 지식보관형 (full_archive)</span>
  );
}

function hasReportBody(submission: Submission): boolean {
  const pr = submission.processorResult ?? null;
  return Boolean(pr?.mdContent || pr?.content);
}

function getReportBodyText(submission: Submission): string {
  const pr = submission.processorResult ?? null;
  return pr?.mdContent ?? pr?.content ?? "";
}

function getStructuredData(submission: Submission): Record<string, unknown> | null {
  const data = submission.processorResult?.structuredData;
  if (!data || typeof data !== "object") return null;
  return data as Record<string, unknown>;
}

function hasResultSummaryContent(submission: Submission): boolean {
  const pr = submission.processorResult ?? null;
  if (pr?.title || pr?.summary) return true;
  if (pr?.keywords && pr.keywords.length > 0) return true;
  if (pr?.warnings && pr.warnings.length > 0) return true;
  if (submission.result?.summary || submission.result?.resultUrl) return true;
  if (isFailedStatus(submission.status)) return true;
  return submission.status === "success" && pr !== null;
}

function pickGoogleDriveSnapshotKeys(
  settings: Record<string, string | number | boolean> | undefined
): Record<string, string | number | boolean> {
  if (!settings) return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (/googleDrive|optionalExport/i.test(key)) {
      out[key] = value;
    }
  }
  return out;
}

interface SectionWrapperProps {
  sectionKey: ResultSectionKey;
  viewerRole: ViewerRole;
  children: React.ReactNode;
  /** false면 데이터 없을 때 섹션 숨김 */
  showWhenEmpty?: boolean;
  hasContent?: boolean;
}

function SectionWrapper({
  sectionKey,
  viewerRole,
  children,
  showWhenEmpty = true,
  hasContent = true,
}: SectionWrapperProps) {
  const policy = getSectionVisibility(viewerRole, sectionKey);
  if (!policy.visible) return null;
  if (!showWhenEmpty && !hasContent) return null;

  return (
    <ResultSectionAccordion sectionKey={sectionKey} defaultOpen={policy.defaultOpen}>
      {children}
    </ResultSectionAccordion>
  );
}

export function ExecutionResultDetailPanel({
  submission,
  viewerRole,
  actorDisplaySource,
  onDownloadFile,
  downloadingIndex = null,
  onMarkdownExport,
}: ExecutionResultDetailPanelProps) {
  const retention = submission.retentionPolicySnapshot;
  const level = retention?.level || "full_archive";
  const optionalProvider = retention?.optionalExportProvider ?? "none";
  const googleDriveKeys = pickGoogleDriveSnapshotKeys(submission.settingsSnapshot);

  const processorResult = submission.processorResult ?? null;
  const reportBodyText = getReportBodyText(submission);
  const structuredData = getStructuredData(submission);
  const originalFileRefs = submission.originalFileRefs ?? [];
  const resultRefs = submission.resultRefs ?? [];
  const actorLabel = formatSubmissionActorLabel(submission, actorDisplaySource);
  const errorDisplay = resolveSubmissionErrorDisplay(submission);

  const renderSection = (sectionKey: ResultSectionKey): React.ReactNode => {
    switch (sectionKey) {
      case "basicInfo":
        return (
          <SectionWrapper key={sectionKey} sectionKey={sectionKey} viewerRole={viewerRole}>
            <div className="grid grid-cols-2 gap-2 text-[11.5px] text-gray-600">
              <div>
                <strong>실행 ID:</strong>{" "}
                <span className="font-mono">{submission.submissionId}</span>
              </div>
              <div>
                <strong>실행자:</strong> {actorLabel}
              </div>
              <div>
                <strong>워크플로우 Key:</strong> {submission.workflowKey}
              </div>
              <div>
                <strong>자동화 ID:</strong> {submission.automationId}
              </div>
              <div>
                <strong>요청 시각:</strong>{" "}
                {new Date(submission.createdAt).toLocaleString()}
              </div>
              <div className="col-span-2">
                <strong>완료 시각:</strong>{" "}
                {submission.completedAt
                  ? new Date(submission.completedAt).toLocaleString()
                  : "-"}
              </div>
              <div className="col-span-2 border-t border-gray-100 pt-2">
                <strong>표시 제목:</strong> {getSubmissionDisplayTitle(submission)}
              </div>
            </div>
          </SectionWrapper>
        );

      case "statusSummary":
        return (
          <SectionWrapper key={sectionKey} sectionKey={sectionKey} viewerRole={viewerRole}>
            <div className="flex flex-col gap-2">
              <SubmissionStatusBadge status={submission.status} />
              {isFailedStatus(submission.status) && errorDisplay.hasContent && (
                <div className="rounded border-l-4 border-red-500 bg-red-50 p-2.5">
                  <p className="mb-1 text-xs font-bold text-red-900">
                    ⚠️ 에러 발생 ({errorDisplay.code})
                  </p>
                  <p className="whitespace-pre-wrap text-[11.5px] leading-snug text-red-700">
                    {errorDisplay.message}
                  </p>
                </div>
              )}
              {!isFailedStatus(submission.status) && (
                <p className="text-xs text-gray-500">현재 상태 기준 정상 처리 흐름입니다.</p>
              )}
            </div>
          </SectionWrapper>
        );

      case "inputInfo":
        return (
          <SectionWrapper key={sectionKey} sectionKey={sectionKey} viewerRole={viewerRole}>
            <div className="flex flex-col gap-1.5 text-[13px]">
              <div>
                <span className="mr-1.5 text-gray-500">제목:</span>
                <span className="font-medium text-gray-900">
                  {getSubmissionDisplayTitle(submission)}
                </span>
              </div>
              {submission.input.text != null && (
                <div>
                  <span className="mr-1.5 text-gray-500">설명:</span>
                  <span className="text-gray-700">
                    {formatResultDisplayValue(submission.input.text)}
                  </span>
                </div>
              )}
              {submission.input.fileName != null && (
                <div>
                  <span className="mr-1.5 text-gray-500">첨부 파일:</span>
                  <span className="font-mono text-blue-600">
                    {formatResultDisplayValue(submission.input.fileName)}
                  </span>
                </div>
              )}
              {!submission.input.text && !submission.input.fileName && (
                <p className="text-xs italic text-gray-400">추가 입력 필드 없음</p>
              )}
            </div>
          </SectionWrapper>
        );

      case "retentionPolicy":
        return (
          <SectionWrapper key={sectionKey} sectionKey={sectionKey} viewerRole={viewerRole}>
            <div className="flex flex-col gap-1.5 text-xs text-gray-700">
              <div>
                <strong>보관 레벨:</strong> {renderRetentionLevelLabel(level)}
              </div>
              {retention && (
                <>
                  <div>
                    <strong>processorResult 저장:</strong>{" "}
                    {retention.storeProcessorResult ? "예" : "아니오"}
                  </div>
                  <div>
                    <strong>원본 파일 저장:</strong>{" "}
                    {retention.storeOriginalFiles ? "예" : "아니오"}
                  </div>
                  <div>
                    <strong>저장소:</strong> {retention.storageProvider}
                  </div>
                </>
              )}
              {!retention && (
                <p className="italic text-gray-400">retentionPolicySnapshot 없음 (레거시)</p>
              )}
            </div>
          </SectionWrapper>
        );

      case "originalFiles": {
        if (originalFileRefs.length === 0) return null;
        return (
          <SectionWrapper
            key={sectionKey}
            sectionKey={sectionKey}
            viewerRole={viewerRole}
            showWhenEmpty={false}
            hasContent
          >
            <div className="flex flex-col gap-1">
              {originalFileRefs.map((ref, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs"
                >
                  <span className="min-w-0 flex-1 truncate text-gray-900">{ref.fileName}</span>
                  <button
                    type="button"
                    disabled={!onDownloadFile || downloadingIndex !== null}
                    onClick={() => onDownloadFile?.("original", idx, ref.fileName)}
                    className="shrink-0 rounded border border-gray-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {downloadingIndex?.type === "original" && downloadingIndex?.idx === idx
                      ? "다운 중..."
                      : "📥 다운로드"}
                  </button>
                </div>
              ))}
            </div>
          </SectionWrapper>
        );
      }

      case "resultSummary": {
        if (!hasResultSummaryContent(submission)) return null;
        return (
          <SectionWrapper
            key={sectionKey}
            sectionKey={sectionKey}
            viewerRole={viewerRole}
            showWhenEmpty={false}
            hasContent
          >
            <div className="flex flex-col gap-2">
              {processorResult?.title != null && (
                <p className="text-xs font-bold text-gray-900">
                  📝 {formatResultDisplayValue(processorResult.title)}
                </p>
              )}
              {(processorResult?.summary != null || submission.result?.summary != null) && (
                <p className="text-xs leading-snug text-gray-600">
                  {formatResultDisplayValue(
                    processorResult?.summary ?? submission.result?.summary
                  )}
                </p>
              )}
              {submission.result?.resultUrl && (
                <div className="text-xs">
                  <span className="mr-1.5 text-gray-500">출력 URL:</span>
                  <a
                    href={submission.result.resultUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-blue-600 underline"
                  >
                    {submission.result.resultUrl}
                  </a>
                </div>
              )}
              {processorResult?.keywords && processorResult.keywords.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[11px] font-semibold text-gray-500">키워드:</span>
                  {processorResult.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="rounded bg-gray-100 px-1.5 py-0.5 text-[10.5px] text-gray-700"
                    >
                      #{formatResultDisplayValue(kw)}
                    </span>
                  ))}
                </div>
              )}
              {processorResult?.warnings && processorResult.warnings.length > 0 && (
                <div className="rounded border-l-4 border-amber-400 bg-amber-50 px-2.5 py-2">
                  <span className="mb-1 block text-[11px] font-bold text-amber-800">
                    ⚠️ 분석 경고 사항
                  </span>
                  <ul className="list-inside list-disc text-[11px] text-amber-900">
                    {processorResult.warnings.map((warn, i) => (
                      <li key={i}>{formatResultDisplayValue(warn)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </SectionWrapper>
        );
      }

      case "reportBody": {
        if (!reportBodyText) return null;
        return (
          <SectionWrapper
            key={sectionKey}
            sectionKey={sectionKey}
            viewerRole={viewerRole}
            showWhenEmpty={false}
            hasContent
          >
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 font-mono text-xs text-gray-800">
              {reportBodyText}
            </pre>
          </SectionWrapper>
        );
      }

      case "structuredData": {
        if (!structuredData) return null;
        return (
          <SectionWrapper
            key={sectionKey}
            sectionKey={sectionKey}
            viewerRole={viewerRole}
            showWhenEmpty={false}
            hasContent
          >
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 font-mono text-xs text-gray-800">
              {formatResultDisplayValue(structuredData)}
            </pre>
          </SectionWrapper>
        );
      }

      case "resultFiles": {
        if (resultRefs.length === 0) return null;
        return (
          <SectionWrapper
            key={sectionKey}
            sectionKey={sectionKey}
            viewerRole={viewerRole}
            showWhenEmpty={false}
            hasContent
          >
            <div className="flex flex-col gap-1">
              {resultRefs.map((ref, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs"
                >
                  <span className="min-w-0 flex-1 truncate text-teal-900">{ref.fileName}</span>
                  <button
                    type="button"
                    disabled={!onDownloadFile || downloadingIndex !== null}
                    onClick={() => onDownloadFile?.("result", idx, ref.fileName)}
                    className="shrink-0 rounded border border-teal-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {downloadingIndex?.type === "result" && downloadingIndex?.idx === idx
                      ? "다운 중..."
                      : "📥 결과 다운"}
                  </button>
                </div>
              ))}
            </div>
          </SectionWrapper>
        );
      }

      case "optionalExport":
        return (
          <SectionWrapper key={sectionKey} sectionKey={sectionKey} viewerRole={viewerRole}>
            <div className="flex flex-col gap-1.5 text-xs text-gray-700">
              <div>
                <strong>Export Provider:</strong>{" "}
                {optionalProvider === "google_drive" ? (
                  <span className="font-semibold text-blue-700">Google Drive</span>
                ) : (
                  <span className="text-gray-500">미사용 (none)</span>
                )}
              </div>
              {Object.keys(googleDriveKeys).length > 0 ? (
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-2 font-mono text-[11px]">
                  {formatResultDisplayValue(googleDriveKeys)}
                </pre>
              ) : (
                <p className="italic text-gray-400">
                  실행 시점 settingsSnapshot에 Optional Export 관련 키가 없습니다.
                </p>
              )}
            </div>
          </SectionWrapper>
        );

      case "actions":
        return (
          <SectionWrapper key={sectionKey} sectionKey={sectionKey} viewerRole={viewerRole}>
            <div className="flex flex-wrap gap-2">
              {hasReportBody(submission) && (
                <button
                  type="button"
                  disabled={!onMarkdownExport}
                  onClick={onMarkdownExport}
                  className="rounded border border-gray-300 bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  📝 MD 다운로드
                </button>
              )}
              {!hasReportBody(submission) && (
                <p className="text-xs italic text-gray-400">사용 가능한 액션이 없습니다.</p>
              )}
            </div>
          </SectionWrapper>
        );

      case "debugInfo":
        return (
          <SectionWrapper key={sectionKey} sectionKey={sectionKey} viewerRole={viewerRole}>
            <OpsDebugInfoSection submission={submission} viewerRole={viewerRole} />
          </SectionWrapper>
        );

      case "snapshots":
      case "rawJson":
        // [13][14]는 [12] 운영 디버그 정보 섹션에 병합됨
        return null;

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      {RESULT_SECTION_ORDER.map((key) => renderSection(key))}
    </div>
  );
}
