/**
 * 이 파일은 자동화 실행 상태(SubmissionStatus)에 따른 UI 매핑 정보를 제공합니다.
 * 한국어 주석 표준을 준수합니다.
 */

import type { SubmissionStatus } from "@/types/n8lient";

export interface StatusUiInfo {
  bg: string;
  text: string;
  label: string;
}

/**
 * SubmissionStatus별 배경색, 텍스트색, 한글 라벨을 반환합니다.
 */
export function getStatusUiInfo(status: SubmissionStatus | string): StatusUiInfo {
  switch (status) {
    case "success":
      return { bg: "#e2fbf0", text: "#0d9488", label: "성공" };
    case "processing":
      return { bg: "#eff6ff", text: "#2563eb", label: "진행중" };
    case "failed":
      return { bg: "#fef2f2", text: "#dc2626", label: "실패" };
    case "skipped":
      return { bg: "#f3f4f6", text: "#4b5563", label: "제외됨" };
    case "config_error":
      return { bg: "#fef2f2", text: "#b91c1c", label: "설정오류" };
    case "queued":
      return { bg: "#f9fafb", text: "#6b7280", label: "대기중" };
    default:
      return { bg: "#f9fafb", text: "#6b7280", label: status || "알 수 없음" };
  }
}
