// [workflowFormSubmitValidator.ts]
// WorkflowForm 최종 제출 직전 수행되는 로컬 검증 로직을 담당합니다.
// useWorkflowForm 훅에서 호출되며, 독립적인 순수 함수로 구성됩니다.

import type { ConfigSchemaField } from "@/types/n8lient";
import { playAppSound } from "@/lib/appSound";

// 보관 레벨 순서 맵 (검증에 사용)
const RETENTION_LEVEL_ORDER: Record<string, number> = {
  notify_only: 1,
  processed_result: 2,
  full_archive: 3,
};

/** 지연 alert 호출 유틸 */
function delayedAlert(
  timeoutIdsRef: React.MutableRefObject<number[]>,
  message: string,
  delay = 150
) {
  const id = setTimeout(() => alert(message), delay) as any;
  timeoutIdsRef.current.push(id);
}

// ────────────────────────────────────────────────────────────────────────────
// 검증 파라미터 타입
// ────────────────────────────────────────────────────────────────────────────

export interface WorkflowSubmitValidationParams {
  timeoutIdsRef: React.MutableRefObject<number[]>;
  workflowKey: string;
  schemaFields: ConfigSchemaField[];
  opAllowedLevels: string[];
  supportedLevels: string[];
  opDefaultLevel: string;
  capsDefaultLevel: string;
  maxLevel: string;
}

// ────────────────────────────────────────────────────────────────────────────
// 제출 전 로컬 검증 함수
// 검증 실패 시 false를 반환합니다. 통과 시 true를 반환합니다.
// ────────────────────────────────────────────────────────────────────────────

export function validateWorkflowFormBeforeSubmit({
  timeoutIdsRef,
  workflowKey,
  schemaFields,
  opAllowedLevels,
  supportedLevels,
  opDefaultLevel,
  capsDefaultLevel,
  maxLevel,
}: WorkflowSubmitValidationParams): boolean {
  // ── 워크플로우 Key 형식 검증 ──────────────────────────────────────────────
  const keyRegex = /^[a-z0-9-]+$/;
  if (!keyRegex.test(workflowKey)) {
    playAppSound("notify");
    delayedAlert(
      timeoutIdsRef,
      "N8N 워크플로우 Key는 영문 소문자, 숫자, 하이픈(-)만 허용합니다. (예: expense-report)"
    );
    return false;
  }

  // ── configSchema 필드 검증 ─────────────────────────────────────────────────
  const schemaKeySet = new Set<string>();
  const keyPattern = /^[a-zA-Z0-9]+$/;

  for (let i = 0; i < schemaFields.length; i++) {
    const field = schemaFields[i];
    const trimmedKey = field.key.trim();

    if (!trimmedKey) {
      playAppSound("notify");
      delayedAlert(timeoutIdsRef, `${i + 1}번째 설정 필드의 Key가 비어 있습니다. 입력해 주십시오.`);
      return false;
    }
    if (!keyPattern.test(trimmedKey)) {
      playAppSound("notify");
      delayedAlert(
        timeoutIdsRef,
        `${i + 1}번째 설정 필드 Key(${trimmedKey})에 허용되지 않는 한글, 공백, 또는 특수문자가 포함되어 있습니다. (영문/숫자만 허용)`
      );
      return false;
    }
    if (schemaKeySet.has(trimmedKey)) {
      playAppSound("notify");
      delayedAlert(timeoutIdsRef, `설정 필드 Key 중복 오류: 중복되는 Key '${trimmedKey}'가 존재합니다.`);
      return false;
    }
    schemaKeySet.add(trimmedKey);
  }

  // ── [v2.6] 보관 정책 레벨 교차 검증 ─────────────────────────────────────
  for (const lvl of opAllowedLevels) {
    if (!supportedLevels.includes(lvl)) {
      playAppSound("notify");
      delayedAlert(
        timeoutIdsRef,
        `검증 오류: 오퍼레이터 허용 레벨(${lvl})은 워크플로우 지원 레벨(${supportedLevels.join(", ")})에 포함되어야 합니다.`
      );
      return false;
    }
  }
  if (!opAllowedLevels.includes(opDefaultLevel)) {
    playAppSound("notify");
    delayedAlert(
      timeoutIdsRef,
      `검증 오류: 오퍼레이터 기본 레벨(${opDefaultLevel})은 허용 레벨 목록(${opAllowedLevels.join(", ")})에 포함되어야 합니다.`
    );
    return false;
  }
  if (!supportedLevels.includes(capsDefaultLevel)) {
    playAppSound("notify");
    delayedAlert(
      timeoutIdsRef,
      `검증 오류: 기본 지원 레벨(${capsDefaultLevel})은 지원 레벨 목록(${supportedLevels.join(", ")})에 포함되어야 합니다.`
    );
    return false;
  }

  // ── [v2.7] maxLevel 범위 초과 검증 ──────────────────────────────────────
  const maxVal = RETENTION_LEVEL_ORDER[maxLevel] ?? 0;
  for (const lvl of opAllowedLevels) {
    if ((RETENTION_LEVEL_ORDER[lvl] ?? 0) > maxVal) {
      playAppSound("notify");
      delayedAlert(
        timeoutIdsRef,
        `검증 오류: 오퍼레이터 허용 레벨(${lvl})이 워크플로우 최대 보관 지원 단계(${maxLevel})를 초과할 수 없습니다.`
      );
      return false;
    }
  }

  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// 제출 payload용 configSchema 정제 유틸
// tempOptionsStr가 있는 select 필드를 최종 파싱하고 UI 임시 필드를 제거합니다.
// ────────────────────────────────────────────────────────────────────────────

export function cleanSchemaFieldsForSubmit(schemaFields: ConfigSchemaField[]): ConfigSchemaField[] {
  return schemaFields.map((field) => {
    const copy = { ...field } as any;
    if (copy.type === "select") {
      const sourceStr =
        copy.tempOptionsStr !== undefined
          ? copy.tempOptionsStr
          : copy.options?.join(", ") || "";
      copy.options = sourceStr
        .split(",")
        .map((x: string) => x.trim())
        .filter(Boolean);
    }
    delete copy.tempOptionsStr;
    return copy;
  });
}
