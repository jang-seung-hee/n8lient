// 실행 결과 상세 화면 값 표시용 공통 formatter

/** React child로 안전하게 출력할 문자열로 변환 */
export function formatResultDisplayValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function isPlainObjectValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** submission.error / errorDetails에서 오류 요약 code·message 추출 (객체 중첩 대응) */
export function resolveSubmissionErrorDisplay(submission: {
  status: string;
  error?: { code?: unknown; message?: unknown } | null;
  errorDetails?: { code?: unknown; message?: unknown; phase?: unknown } | null;
}): { code: string; message: string; hasContent: boolean } {
  const failed =
    submission.status === "failed" || submission.status === "config_error";

  if (!failed) {
    return { code: "", message: "", hasContent: false };
  }

  const err = submission.error as Record<string, unknown> | null | undefined;
  const details = submission.errorDetails as Record<string, unknown> | null | undefined;

  let rawMessage: unknown = err?.message ?? details?.message;
  let rawCode: unknown = err?.code;

  if (isPlainObjectValue(rawCode)) {
    const codeObj = rawCode;
    rawMessage = rawMessage ?? codeObj.message;
    rawCode = codeObj.code ?? codeObj.phase;
  }

  if (isPlainObjectValue(rawMessage)) {
    const msgObj = rawMessage;
    rawCode = rawCode ?? msgObj.code ?? msgObj.phase;
    rawMessage = msgObj.message ?? msgObj;
  }

  if (!rawMessage && isPlainObjectValue(err) && ("message" in err || "phase" in err)) {
    rawMessage = err.message;
    rawCode = rawCode ?? err.code ?? err.phase;
  }

  if (!rawMessage && !rawCode && (err || details)) {
    rawMessage = err ?? details;
  }

  const hasContent = Boolean(rawMessage || rawCode || err || details);

  return {
    code: formatResultDisplayValue(rawCode ?? "UNKNOWN_ERROR"),
    message: formatResultDisplayValue(rawMessage ?? "상세 에러 내용이 없습니다."),
    hasContent,
  };
}

/** 객체 가능성이 있는 값을 pre 블록용 문자열로 (이미 문자열이면 그대로) */
export function formatResultDisplayBlock(value: unknown): string {
  return formatResultDisplayValue(value);
}
