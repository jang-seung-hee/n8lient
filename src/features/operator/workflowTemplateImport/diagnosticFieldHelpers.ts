// 이 파일은 UI 폼 컴포넌트에서 진단(diagnostics) 결과값들을 바탕으로 필드 테두리 색상, 경고 배경 및 세부 메시지를 렌더링하기 위한 스타일 매핑 헬퍼들입니다.
// 한국어 주석 표준을 준수합니다.

import type { WorkflowImportDiagnostics, WorkflowImportDiagnosticItem, DiagnosticLevel } from "./workflowTemplateImportTypes";

/**
 * 특정 필드 경로에 일치하는 진단 항목이 있는지 가져옵니다.
 */
export function getFieldDiagnostic(
  fieldPath: string,
  diagnostics: WorkflowImportDiagnostics | null
): WorkflowImportDiagnosticItem | null {
  if (!diagnostics || !diagnostics.items) return null;

  if (diagnostics.fieldDiagnostics && diagnostics.fieldDiagnostics[fieldPath]) {
    return diagnostics.fieldDiagnostics[fieldPath];
  }

  const found = diagnostics.items.find(item => item.field === fieldPath);
  return found || null;
}

/**
 * 특정 필드 경로의 진단 등급을 반환합니다.
 */
export function getFieldDiagnosticLevel(
  fieldPath: string,
  diagnostics: WorkflowImportDiagnostics | null
): DiagnosticLevel | null {
  const diag = getFieldDiagnostic(fieldPath, diagnostics);
  return diag ? diag.level : null;
}

/**
 * 특정 필드 경로의 진단 상세 메시지를 반환합니다.
 */
export function getFieldDiagnosticMessage(
  fieldPath: string,
  diagnostics: WorkflowImportDiagnostics | null
): string | null {
  const diag = getFieldDiagnostic(fieldPath, diagnostics);
  return diag ? diag.message : null;
}

/**
 * 특정 필드에 적용될 경고 등급별 인라인 CSS 테두리 및 배경색 스타일을 반환합니다.
 */
export function getDiagnosticStyles(
  fieldPath: string,
  diagnostics: WorkflowImportDiagnostics | null
): React.CSSProperties {
  const level = getFieldDiagnosticLevel(fieldPath, diagnostics);
  if (!level) return {};

  switch (level) {
    case "error":
      return {
        border: "1px solid #ef4444",      // 빨강
        backgroundColor: "#fef2f2",       // 연한 빨강
      };
    case "warning":
      return {
        border: "1px solid #f97316",      // 주황
        backgroundColor: "#fff7ed",       // 연한 주황
      };
    case "ok":
      return {
        border: "1px solid #3b82f6",      // 파랑
        backgroundColor: "#eff6ff",       // 연한 파랑
      };
    default:
      return {};
  }
}

/**
 * 필드 하단에 출력될 개별 진단 문구의 글자색과 정렬 스타일을 반환합니다.
 */
export function getDiagnosticMessageStyle(level: DiagnosticLevel): React.CSSProperties {
  switch (level) {
    case "error":
      return {
        fontSize: "11px",
        color: "#b91c1c",
        fontWeight: 600,
        marginTop: "4px",
      };
    case "warning":
      return {
        fontSize: "11px",
        color: "#c2410c",
        fontWeight: 600,
        marginTop: "4px",
      };
    case "ok":
    default:
      return {
        fontSize: "11px",
        color: "#1d4ed8",
        fontWeight: 600,
        marginTop: "4px",
      };
  }
}

/**
 * configSchema 내 특정 설정 카드의 필드들을 종합하여 최대 심각도를 반환합니다.
 */
export function getConfigSchemaCardSeverity(
  index: number,
  diagnostics: WorkflowImportDiagnostics | null
): DiagnosticLevel | null {
  if (!diagnostics || !diagnostics.items) return null;

  const prefix = `configSchema[${index}]`;
  let maxLevel: DiagnosticLevel | null = null;

  for (const item of diagnostics.items) {
    if (item.field.startsWith(prefix) || item.field === "configSchema") {
      const currentLevel = item.level;
      if (currentLevel === "error") {
        return "error"; // 최고 심각도이므로 즉시 리턴
      } else if (currentLevel === "warning") {
        maxLevel = "warning";
      } else if (currentLevel === "ok" && maxLevel !== "warning") {
        maxLevel = "ok";
      }
    }
  }

  return maxLevel;
}

/**
 * configSchema 특정 설정 카드 전체 영역에 입힐 테두리색 및 스타일을 반환합니다.
 */
export function getConfigSchemaCardStyles(
  index: number,
  diagnostics: WorkflowImportDiagnostics | null
): React.CSSProperties {
  const level = getConfigSchemaCardSeverity(index, diagnostics);
  if (!level) return {};

  switch (level) {
    case "error":
      return {
        border: "1.5px solid #ef4444",
        backgroundColor: "#fef2f2",
      };
    case "warning":
      return {
        border: "1.5px solid #f97316",
        backgroundColor: "#fff7ed",
      };
    case "ok":
      return {
        border: "1.5px solid #3b82f6",
        backgroundColor: "#eff6ff",
      };
    default:
      return {};
  }
}
