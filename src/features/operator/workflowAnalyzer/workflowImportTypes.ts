// 이 파일은 n8n 워크플로우 JSON을 분석하여 워크플로우 마스터 등록을 지원하는 데이터 구조와 진단 타입을 정의합니다.
// 한국어 주석 표준을 준수합니다.

import type { WorkflowTemplate } from "@/types/n8lient";

/**
 * 진단 등급 타입
 * - ok: 정상 (파란색)
 * - warning: 확인 필요 (주황색)
 * - error: 오류 (빨간색)
 */
export type DiagnosticLevel = "ok" | "warning" | "error";

/**
 * 개별 필드 또는 설정에 대한 진단 결과 항목
 */
export interface WorkflowImportDiagnosticItem {
  field: string;           // 진단 대상 필드명 (예: "workflowKey", "configSchema[0].key")
  level: DiagnosticLevel;  // 진단 레벨
  message: string;         // 운영자에게 보여줄 안내 메시지
}

/**
 * 분석 결과에 대한 전체 진단 요약 및 필드별 매핑 상태
 */
export interface WorkflowImportDiagnostics {
  severity: DiagnosticLevel;                     // 전체 진단 등급 중 가장 심각한 레벨 (error > warning > ok)
  canSave: boolean;                              // 최종 저장 가능 여부 (error가 없으면 true)
  requiresWarningConfirmation: boolean;          // warning이 존재하여 운영자 확인 동의가 필요한지 여부
  items: WorkflowImportDiagnosticItem[];          // 전체 진단 항목 리스트
  fieldDiagnostics: Record<string, WorkflowImportDiagnosticItem>; // 필드명을 키로 하는 빠른 진단 매핑
}

/**
 * N8Lient 앱 내 분석 및 폼 매핑 시 사용되는 Draft 데이터 구조 (DTO)
 */
export interface WorkflowTemplateImportDraft {
  schemaVersion: "n8lient.workflowTemplateImport.v1";
  source: {
    analyzerVersion: string;   // 분석기 버전
    analyzedAt: string;        // 분석 수행 일시 (ISO string)
    sourceFileName?: string;   // 분석한 원본 파일명
    n8nWorkflowName?: string;  // n8n 내에 정의된 워크플로우 이름
    n8nActive?: boolean | null; // n8n 활성화 여부
    detectedWebhookPath?: string; // 감지된 웹훅 경로
    annotationDetected?: boolean; // 주석 감지 여부
    annotationBlocks?: {
      workflowMeta?: boolean;
      configFieldCount?: number;
      retentionPolicy?: boolean;
    };
  };
  workflowTemplate: Partial<WorkflowTemplate>; // 폼에 선반영할 워크플로우 데이터 초안
  diagnostics: WorkflowImportDiagnostics;      // 정합성 및 충돌 진단 결과
}
