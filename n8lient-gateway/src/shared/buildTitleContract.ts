// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
// Source: src/common/execution/buildTitleContract.ts

// 이 파일은 자동화 실행 요청의 제목(title) 계약을 프론트/API/Gateway/n8n 전 구간에서 동일하게 맞추기 위한 순수 TypeScript 헬퍼입니다.

export type TitleSource = "user" | "empty";

export type ExecutionTitleContract = {
  /** 사용자가 직접 입력한 제목만. 없으면 null */
  title: string | null;
  titleProvided: boolean;
  titleSource: TitleSource;
  /** 실행 목록/내부 관리용 임시 제목 (시스템 생성) */
  submissionTitle: string;
  /** UI 표시용 제목 (초기값은 submissionTitle, callback 후 processorResult.title로 갱신) */
  displayTitle: string;
};

type BuildTitleContractParams = {
  inputTitle?: string | null;
  titleProvided?: boolean | null;
  titleSource?: string | null;
  workflowName: string;
  now?: Date;
};

/**
 * 실행 요청 payload/submission 저장용 제목 계약 필드를 생성합니다.
 */
export function buildExecutionTitleContract(params: BuildTitleContractParams): ExecutionTitleContract {
  const trimmedTitle = typeof params.inputTitle === "string" ? params.inputTitle.trim() : "";
  const titleProvided = params.titleProvided ?? trimmedTitle !== "";
  const titleSource: TitleSource =
    params.titleSource === "user" || params.titleSource === "empty"
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

type ResolveDisplayTitleParams = {
  processorResultTitle?: string | null;
  existingDisplayTitle?: string | null;
  submissionTitle?: string | null;
};

/**
 * callback 이후 submission 표시 제목을 결정합니다.
 * processorResult.title 우선, 없으면 기존 displayTitle, 마지막으로 submissionTitle을 사용합니다.
 */
export function resolveDisplayTitleAfterCallback(params: ResolveDisplayTitleParams): string | null {
  const processorTitle =
    typeof params.processorResultTitle === "string" ? params.processorResultTitle.trim() : "";
  if (processorTitle) {
    return processorTitle;
  }

  const existingDisplay =
    typeof params.existingDisplayTitle === "string" ? params.existingDisplayTitle.trim() : "";
  if (existingDisplay) {
    return existingDisplay;
  }

  const submissionTitle =
    typeof params.submissionTitle === "string" ? params.submissionTitle.trim() : "";
  return submissionTitle || null;
}
