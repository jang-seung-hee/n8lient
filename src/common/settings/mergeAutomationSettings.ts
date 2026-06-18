// 회사 공용 자동화 설정과 사용자 개인 설정을 병합하는 유틸입니다.

/**
 * userSettings의 유효한 값만 companySettings 위에 덮어씁니다.
 * null, undefined, 빈 문자열("")은 무시하여 회사 기본값 fallback을 유지합니다.
 */
export function mergeAutomationSettings(
  companySettings: Record<string, unknown> = {},
  userSettings?: Record<string, unknown> | null
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...companySettings };

  if (!userSettings || typeof userSettings !== "object") {
    return merged;
  }

  for (const [key, val] of Object.entries(userSettings)) {
    const isInvalid =
      val === null ||
      val === undefined ||
      (typeof val === "string" && val.trim() === "");

    if (!isInvalid) {
      merged[key] = val;
    }
  }

  return merged;
}
