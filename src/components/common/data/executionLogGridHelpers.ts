// [executionLogGridHelpers.ts]
// 이 파일은 회사 관리자 및 플랫폼 운영자 실행 로그 화면에서 공통으로 사용되는
// 데이터 변환, 날짜 포맷, 텍스트 축약 등의 헬퍼 유틸 함수들을 제공합니다.
// 한국어 주석 표준을 준수합니다.

import type { Submission } from "@/types/n8lient";

// 텍스트 축약 헬퍼 함수
export const truncateText = (value: string, maxLength = 25) => {
  if (!value) return "-";
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
};

// 날짜 안전 변환 헬퍼 함수
export const toDateSafe = (value: unknown): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "object" && value !== null && "toDate" in value) {
    const maybeDate = (value as { toDate?: () => Date }).toDate?.();
    return maybeDate && !Number.isNaN(maybeDate.getTime()) ? maybeDate : null;
  }

  if (typeof value === "object" && value !== null && "seconds" in value) {
    const seconds = (value as { seconds?: number }).seconds;
    if (typeof seconds === "number") {
      const date = new Date(seconds * 1000);
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

// YY.MM.DD HH:mm 24시간제 변환 헬퍼 함수
export const formatCompactDateTime = (value: unknown, fallback = "-") => {
  const date = toDateSafe(value);
  if (!date) return fallback;

  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");

  return `${yy}.${mm}.${dd} ${hh}:${mi}`;
};
