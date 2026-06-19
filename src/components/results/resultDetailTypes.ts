// 실행 결과 상세 화면 섹션 키·역할·가시성 타입 정의

export type ViewerRole = "user" | "companyAdmin" | "operator";

export type ResultSectionKey =
  | "basicInfo"
  | "statusSummary"
  | "inputInfo"
  | "retentionPolicy"
  | "originalFiles"
  | "resultSummary"
  | "reportBody"
  | "structuredData"
  | "resultFiles"
  | "optionalExport"
  | "actions"
  | "debugInfo"
  | "snapshots"
  | "rawJson";

export type SectionVisibility = {
  visible: boolean;
  defaultOpen: boolean;
};

export type { UserDisplaySource } from "@/common/user/formatUserDisplayName";

/** 섹션 표준 순서 및 한글 제목 */
export const RESULT_SECTION_ORDER: ResultSectionKey[] = [
  "basicInfo",
  "statusSummary",
  "inputInfo",
  "retentionPolicy",
  "originalFiles",
  "resultSummary",
  "reportBody",
  "structuredData",
  "resultFiles",
  "optionalExport",
  "actions",
  "debugInfo",
  "snapshots",
  "rawJson",
];

export const RESULT_SECTION_LABELS: Record<ResultSectionKey, string> = {
  basicInfo: "실행 기본 정보",
  statusSummary: "실행 상태 / 오류 요약",
  inputInfo: "요청 입력 정보",
  retentionPolicy: "보관 정책 정보",
  originalFiles: "첨부 원본 파일",
  resultSummary: "처리 결과 요약",
  reportBody: "상세 리포트 본문",
  structuredData: "추출 구조화 데이터",
  resultFiles: "생성된 결과 파일",
  optionalExport: "Google Drive보내기",
  actions: "실행 액션",
  debugInfo: "운영 디버그 정보",
  snapshots: "Snapshot 정보 (병합됨)",
  rawJson: "Raw JSON / 개발자 도구",
};

export const RESULT_SECTION_NUMBERS: Record<ResultSectionKey, string> = {
  basicInfo: "01",
  statusSummary: "02",
  inputInfo: "03",
  retentionPolicy: "04",
  originalFiles: "05",
  resultSummary: "06",
  reportBody: "07",
  structuredData: "08",
  resultFiles: "09",
  optionalExport: "10",
  actions: "11",
  debugInfo: "12",
  snapshots: "13",
  rawJson: "14",
};
