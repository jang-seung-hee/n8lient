// 목록용 컴팩트 날짜/시간 포맷 (YYMMDD HH:MM, 로컬 시간)

/** Firestore Timestamp·Date·ISO 문자열을 Date로 변환 */
function toDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "object" && value !== null && "toDate" in value) {
    const converted = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(converted.getTime()) ? null : converted;
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** YYMMDD HH:MM 형식 (한국 로컬 시간) */
export function formatCompactDateTime(value: unknown): string {
  const date = toDate(value);
  if (!date) return "-";

  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");

  return `${yy}${mm}${dd} ${hh}:${mi}`;
}

/** submission 실행 시각 필드 우선순위: createdAt → requestedAt → startedAt → submittedAt */
export function resolveSubmissionExecutionDateTime(submission: {
  createdAt?: unknown;
  requestedAt?: unknown;
  startedAt?: unknown;
  submittedAt?: unknown;
}): unknown {
  return (
    submission.createdAt ??
    submission.requestedAt ??
    submission.startedAt ??
    submission.submittedAt ??
    null
  );
}
