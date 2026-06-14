// 이 파일은 업로드된 JSON 텍스트를 파싱하여 N8Lient 표준 Import JSON 규격을 만족하는지 1차 검사합니다.
// 한국어 주석 표준을 준수합니다.

import type { WorkflowTemplateImportDraft } from "./workflowTemplateImportTypes";

/**
 * 업로드된 JSON 데이터를 파싱하고 schemaVersion 및 구조를 확인하여 초안 객체를 생성합니다.
 * @param jsonText 업로드된 파일의 텍스트 데이터
 * @param sourceFileName 업로드된 원본 파일명
 */
export function parseWorkflowTemplateImportJson(
  jsonText: string,
  sourceFileName: string
): WorkflowTemplateImportDraft {
  const analyzedAt = new Date().toISOString();
  let parsed: any;

  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    return createErrorDraft(
      sourceFileName,
      analyzedAt,
      "올바른 JSON 형식이 아닙니다. 파일 손상 여부를 확인해 주십시오."
    );
  }

  // 1. schemaVersion 검증 (raw n8n JSON 방지)
  if (!parsed || parsed.schemaVersion !== "n8lient.workflowTemplateImport.v1") {
    return createErrorDraft(
      sourceFileName,
      analyzedAt,
      "이 파일은 N8Lient 표준 Import JSON 형식이 아닙니다. LLM 프롬프트 또는 외부 도구로 생성한 `n8lient.workflowTemplateImport.v1` 파일을 업로드해 주세요."
    );
  }

  // 2. workflowTemplate 객체 유무 검증
  if (!parsed.workflowTemplate || typeof parsed.workflowTemplate !== "object") {
    return createErrorDraft(
      sourceFileName,
      analyzedAt,
      "workflowTemplate 속성이 누락되었거나 객체가 아닙니다."
    );
  }

  // 1차 구조 유효성 검사 성공 시 기본 Draft 반환 (세부 저장 스키마 검증은 validate 단계에서 수행)
  return {
    schemaVersion: "n8lient.workflowTemplateImport.v1",
    source: {
      analyzerVersion: "1.0.0",
      analyzedAt,
      sourceFileName
    },
    workflowTemplate: parsed.workflowTemplate,
    diagnostics: {
      severity: "ok",
      canSave: true,
      requiresWarningConfirmation: false,
      items: [],
      fieldDiagnostics: {}
    }
  };
}

/**
 * 파싱 실패 또는 미지원 파일에 대한 오류 Draft 생성 헬퍼
 */
function createErrorDraft(
  sourceFileName: string,
  analyzedAt: string,
  errorMessage: string
): WorkflowTemplateImportDraft {
  return {
    schemaVersion: "n8lient.workflowTemplateImport.v1",
    source: {
      analyzerVersion: "1.0.0",
      analyzedAt,
      sourceFileName
    },
    workflowTemplate: {},
    diagnostics: {
      severity: "error",
      canSave: false,
      requiresWarningConfirmation: false,
      items: [
        {
          field: "schemaVersion",
          level: "error",
          message: errorMessage
        }
      ],
      fieldDiagnostics: {
        schemaVersion: {
          field: "schemaVersion",
          level: "error",
          message: errorMessage
        }
      }
    }
  };
}
