import type { ClientAutomation, WorkflowTemplate, UserAutomationSettings } from "@/types/n8lient";
import { hasPersonalSettingValue } from "@/features/user/settings/resolvePersonalSettingFieldState";

/**
 * 워크플로우에 정의된 스키마 필드들과 사용자의 개인 설정 상태를 비교하여
 * 내 설정 버튼의 상태점 등급을 계산합니다.
 */
export function resolveUserSettingGuidanceStatus(
  currentAuto: ClientAutomation | null | undefined,
  currentTemplate: WorkflowTemplate | null | undefined,
  userSettings: UserAutomationSettings | null | undefined
): "required_missing" | "recommended_missing" | "complete" | "none" {
  if (!currentAuto || !currentTemplate || !currentTemplate.configSchema) {
    return "none";
  }

  const guidance = currentAuto.userSettingGuidance;
  if (!guidance || Object.keys(guidance).length === 0) {
    return "none";
  }

  // 보안 필드를 제외한 필드 키 배열 생성
  const schemaKeys = currentTemplate.configSchema
    .filter((f) => {
      const lowercaseKey = f.key.toLowerCase();
      const forbiddenKeywords = ["token", "secret", "apikey", "credential", "accesstoken", "refreshtoken"];
      const isSec = f.type === "secret" || forbiddenKeywords.some((keyword) => lowercaseKey.includes(keyword));
      return !isSec;
    })
    .map((f) => f.key);

  const personalSettingsMap = userSettings?.settings || {};
  const visibilityMap = currentAuto.userSettingVisibility || {};

  let hasRequiredMissing = false;
  let hasRecommendedMissing = false;
  let hasGuidanceFields = false;

  for (const key of schemaKeys) {
    const visibility = visibilityMap[key];
    const shouldHideWhenEmpty = visibility === "hide_when_empty";
    const rawVal = personalSettingsMap[key];
    const hasPersonalValue = hasPersonalSettingValue(rawVal);

    // 숨김 필드이고 개인값이 없으면 경고(상태점) 계산에서 완벽히 제외
    if (shouldHideWhenEmpty && !hasPersonalValue) {
      continue;
    }

    const level = guidance[key];
    if (!level) continue;

    hasGuidanceFields = true;

    if (level === "required_override" && !hasPersonalValue) {
      hasRequiredMissing = true;
    } else if (level === "recommended_override" && !hasPersonalValue) {
      hasRecommendedMissing = true;
    }
  }

  if (!hasGuidanceFields) {
    return "none";
  }

  if (hasRequiredMissing) {
    return "required_missing";
  }
  if (hasRecommendedMissing) {
    return "recommended_missing";
  }
  return "complete";
}
