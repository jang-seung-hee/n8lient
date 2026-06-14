// 이 파일은 N8Lient 표준 Import JSON 데이터를 가공하고 정합성을 검증하기 위한 데이터 타입들을 정의합니다.
// 한국어 주석 표준을 준수합니다.

import type { WorkflowTemplate } from "@/types/n8lient";

/**
 * 진단 심각도 등급
 * - ok: 정상 (파란색)
 * - warning: 확인 필요 (주황색)
 * - error: 오류 (빨간색)
 */
export type DiagnosticLevel = "ok" | "warning" | "error";

/**
 * 개별 필드 및 설정에 대한 정합성 진단 결과 항목
 */
export interface WorkflowImportDiagnosticItem {
  field: string;           // 진단 대상 필드 경로 (예: "workflowKey", "configSchema[0].key")
  level: DiagnosticLevel;  // 진단 등급
  message: string;         // 오퍼레이터용 상세 가이드 안내 메시지
}

/**
 * 가져오기 진단 요약 및 필드 매핑 맵
 */
export interface WorkflowImportDiagnostics {
  severity: DiagnosticLevel;                     // 전체 진단 등급 중 가장 심각한 레벨 (error > warning > ok)
  canSave: boolean;                              // 최종 저장 가능 여부 (error가 없으면 true)
  requiresWarningConfirmation: boolean;          // warning이 있어 확인 동의 체크가 필요한지 여부
  items: WorkflowImportDiagnosticItem[];          // 전체 진단 세부 내역
  fieldDiagnostics: Record<string, WorkflowImportDiagnosticItem>; // 빠른 매핑을 위한 필드명 기준 맵
}

/**
 * N8Lient 표준 Import JSON 기반 분석 드래프트 객체 (DTO)
 */
export interface WorkflowTemplateImportDraft {
  schemaVersion: "n8lient.workflowTemplateImport.v1";
  source: {
    analyzerVersion: string; // 검증 엔진 버전
    analyzedAt: string;      // 분석 수행 일시
    sourceFileName: string;  // 업로드된 파일명
  };
  workflowTemplate: Partial<WorkflowTemplate>; // 폼에 자동 채워넣을 데이터 초안
  diagnostics: WorkflowImportDiagnostics;      // 정합성 및 충돌 진단 결과
}
