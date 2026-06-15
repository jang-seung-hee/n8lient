"use strict";
// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
// Source: src/common/execution/buildTitleContract.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildExecutionTitleContract = buildExecutionTitleContract;
exports.resolveDisplayTitleAfterCallback = resolveDisplayTitleAfterCallback;
/**
 * 실행 요청 payload/submission 저장용 제목 계약 필드를 생성합니다.
 */
function buildExecutionTitleContract(params) {
    const trimmedTitle = typeof params.inputTitle === "string" ? params.inputTitle.trim() : "";
    const titleProvided = params.titleProvided ?? trimmedTitle !== "";
    const titleSource = params.titleSource === "user" || params.titleSource === "empty"
        ? params.titleSource
        : titleProvided
            ? "user"
            : "empty";
    const title = titleProvided && trimmedTitle ? trimmedTitle : null;
    const now = params.now ?? new Date();
    const nowFormatted = now
        .toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false })
        .replace(/\. /g, "-")
        .replace(/\./g, "")
        .slice(0, 16);
    const submissionTitle = title ?? `[${params.workflowName}] ${nowFormatted} 실행`;
    const displayTitle = submissionTitle;
    return {
        title,
        titleProvided,
        titleSource,
        submissionTitle,
        displayTitle,
    };
}
/**
 * callback 이후 submission 표시 제목을 결정합니다.
 * processorResult.title 우선, 없으면 기존 displayTitle, 마지막으로 submissionTitle을 사용합니다.
 */
function resolveDisplayTitleAfterCallback(params) {
    const processorTitle = typeof params.processorResultTitle === "string" ? params.processorResultTitle.trim() : "";
    if (processorTitle) {
        return processorTitle;
    }
    const existingDisplay = typeof params.existingDisplayTitle === "string" ? params.existingDisplayTitle.trim() : "";
    if (existingDisplay) {
        return existingDisplay;
    }
    const submissionTitle = typeof params.submissionTitle === "string" ? params.submissionTitle.trim() : "";
    return submissionTitle || null;
}
