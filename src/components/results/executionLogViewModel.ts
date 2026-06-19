/**
 * 이 파일은 시스템 로그 리스트 공통화를 위한 ExecutionLogRow 타입 및 포맷터 헬퍼를 제공합니다.
 * 한국어 주석 표준을 준수합니다.
 */

import type { Submission } from "@/types/n8lient";

export type ExecutionLogRow = {
  id: string;
  createdAt?: unknown;
  workflowName?: string;
  workflowKey?: string;
  clientName?: string;
  clientId?: string;
  userEmail?: string;
  googleEmail?: string;
  title?: string;
  status?: string;
  raw: Submission;
};

/**
 * 텍스트 길이를 제한하고 말줄임표(…)를 추가하는 헬퍼 함수
 */
export function truncateText(value: unknown, maxLength = 20): string {
  const text = typeof value === "string" ? value : value == null ? "" : String(value);
  if (!text) return "-";
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

/**
 * 날짜 포맷 변환 헬퍼 함수 (YYMMDD HH:MM 포맷)
 */
export function formatCompactDateTime(value: unknown): string {
  let date: Date | null = null;

  if (value instanceof Date) {
    date = value;
  } else if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    date = value.toDate();
  } else if (typeof value === "string" || typeof value === "number") {
    date = new Date(value);
  }

  if (!date || Number.isNaN(date.getTime())) return "-";

  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");

  return `${yy}${mm}${dd} ${hh}:${mi}`;
}

/**
 * Submission 객체를 ExecutionLogRow 규격으로 매핑하는 헬퍼 함수
 */
export function mapSubmissionToRow(
  sub: Submission,
  clientsMap?: Map<string, string>,
  singleClientName?: string
): ExecutionLogRow {
  let clientName = "-";
  if (singleClientName) {
    clientName = singleClientName;
  } else if (clientsMap && sub.clientId) {
    clientName = clientsMap.get(sub.clientId) || "회사명 없음";
  }

  // 사용자 메일: googleEmail 또는 userEmail 표시 (우선순위: googleEmail -> input.googleEmail -> email)
  const userEmail = sub.input?.fileUrl ? (sub as any).googleEmail || (sub as any).userEmail || "-" : (sub as any).googleEmail || (sub as any).userEmail || "-";
  
  // 구글 이메일을 표시하기 위해 submission 내부 데이터를 정확히 추출
  let resolvedEmail = "-";
  if ((sub as any).googleEmail) {
    resolvedEmail = (sub as any).googleEmail;
  } else if ((sub as any).userEmail) {
    resolvedEmail = (sub as any).userEmail;
  } else if (sub.uid) {
    // sub.uid를 활용한 fallback이 필요한 경우 활용 (page.tsx에서 actorLabelByUid 등을 연동하므로 우선 row에 보관)
    resolvedEmail = "-";
  }

  // 실행명: displayTitle이나 input.title, 혹은 input.submissionTitle
  const title = sub.displayTitle || sub.input?.title || sub.input?.submissionTitle || "-";

  return {
    id: sub.submissionId,
    createdAt: sub.createdAt,
    workflowName: sub.input?.title || sub.workflowKey || "-", // 워크플로우 이름 매핑은 외부(page.tsx)에서 이름 조회가 되므로 아래에서 workflowKey와 함께 처리됨
    workflowKey: sub.workflowKey,
    clientName,
    clientId: sub.clientId,
    userEmail: resolvedEmail,
    googleEmail: resolvedEmail,
    title,
    status: sub.status,
    raw: sub,
  };
}
