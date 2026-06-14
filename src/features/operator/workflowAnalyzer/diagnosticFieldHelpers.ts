// 이 파일은 폼 컴포넌트들에서 진단 결과(diagnostics)를 필드별로 매핑하여 테두리 색상, 배경색 및 가이드 문구를 출력할 수 있도록 지원하는 공통 헬퍼 모듈입니다.
// 한국어 주석 표준을 준수합니다.

import type { WorkflowImportDiagnostics, WorkflowImportDiagnosticItem, DiagnosticLevel } from "./workflowImportTypes";

/**
 * 특정 필드 경로에 해당하는 진단 항목(DiagnosticItem)이 있는지 조회합니다.
 * @param fieldPath 필드 경로 (예: "workflowKey", "configSchema[0].key")
 * @param diagnostics 진단 정보 객체
 */
export function getFieldDiagnostic(
  fieldPath: string,
  diagnostics: WorkflowImportDiagnostics | null
): WorkflowImportDiagnosticItem | null {
  if (!diagnostics || !diagnostics.items) return null;
  
  // 빠른 매핑용 객체에서 먼저 탐색
  if (diagnostics.fieldDiagnostics && diagnostics.fieldDiagnostics[fieldPath]) {
    return diagnostics.fieldDiagnostics[fieldPath];
  }

  // 매핑 객체에 없는 복합 경로(예: configSchema[index]) 등을 위해 순회 탐색
  const found = diagnostics.items.find(item => item.field === fieldPath);
  return found || null;
}

/**
 * 특정 필드 경로의 진단 심각도 등급(Level)을 반환합니다.
 * @param fieldPath 필드 경로
 * @param diagnostics 진단 정보 객체
 */
export function getFieldDiagnosticLevel(
  fieldPath: string,
  diagnostics: WorkflowImportDiagnostics | null
): DiagnosticLevel | null {
  const diagnostic = getFieldDiagnostic(fieldPath, diagnostics);
  return diagnostic ? diagnostic.level : null;
}

/**
 * 특정 필드 경로의 진단 메시지를 반환합니다.
 * @param fieldPath 필드 경로
 * @param diagnostics 진단 정보 객체
 */
export function getFieldDiagnosticMessage(
  fieldPath: string,
  diagnostics: WorkflowImportDiagnostics | null
): string | null {
  const diagnostic = getFieldDiagnostic(fieldPath, diagnostics);
  return diagnostic ? diagnostic.message : null;
}

/**
 * 특정 필드에 적용할 diagnostic 스타일 클래스 이름 또는 인라인 스타일 객체를 생성합니다.
 * UX 가이드라인에 따라 연한 배경색, 테두리색을 지정합니다.
 * @param fieldPath 필드 경로
 * @param diagnostics 진단 정보 객체
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
        border: "1px solid #ef4444",      // 빨강 테두리
        backgroundColor: "#fef2f2",       // 연한 빨강 배경
      };
    case "warning":
      return {
        border: "1px solid #f97316",      // 주황 테두리
        backgroundColor: "#fff7ed",       // 연한 주황 배경
      };
    case "ok":
      return {
        border: "1px solid #3b82f6",      // 파랑 테두리
        backgroundColor: "#eff6ff",       // 연한 파랑 배경
      };
    default:
      return {};
  }
}

/**
 * 필드 하단에 출력될 가이드 안내문의 인라인 CSS 스타일을 반환합니다.
 * @param level 진단 심각도 레벨
 */
export function getDiagnosticMessageStyle(level: DiagnosticLevel): React.CSSProperties {
  switch (level) {
    case "error":
      return {
        fontSize: "11px",
        color: "#b91c1c", // 진한 빨강
        fontWeight: 600,
        marginTop: "4px",
      };
    case "warning":
      return {
        fontSize: "11px",
        color: "#c2410c", // 진한 주황
        fontWeight: 600,
        marginTop: "4px",
      };
    case "ok":
    default:
      return {
        fontSize: "11px",
        color: "#1d4ed8", // 진한 파랑
        fontWeight: 600,
        marginTop: "4px",
      };
  }
}

/**
 * configSchema의 특정 인덱스 설정 카드 전체의 종합 심각도 등급을 계산합니다.
 * 우선순위: error > warning > ok > none
 * @param index configSchema의 인덱스
 * @param diagnostics 진단 정보 객체
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
        return "error"; // 가장 심각하므로 즉시 반환
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
 * configSchema의 설정 카드 전체에 적용할 종합 인라인 스타일을 반환합니다.
 * @param index configSchema의 인덱스
 * @param diagnostics 진단 정보 객체
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
