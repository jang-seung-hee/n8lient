// Firestore setDoc/updateDoc 전송 전 객체에서 undefined 값을 재귀적으로 제거합니다.

/**
 * Firestore는 undefined 필드를 저장할 수 없으므로, 전송 직전에 undefined를 제거합니다.
 * null 값은 유지합니다.
 */
export function removeUndefinedFields<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => removeUndefinedFields(item))
      .filter((item) => item !== undefined) as T;
  }
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (nested === undefined) {
      continue;
    }
    result[key] = removeUndefinedFields(nested);
  }
  return result as T;
}

/** @deprecated removeUndefinedFields와 동일 — 하위 호환 alias */
export const removeUndefinedDeep = removeUndefinedFields;
