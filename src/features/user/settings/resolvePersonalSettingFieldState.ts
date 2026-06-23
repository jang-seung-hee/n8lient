/**
 * 사용자 개인 설정 필드의 상태를 판정하는 순수 헬퍼 함수 라이브러리입니다.
 */

/**
 * 개인 설정값이 존재하는지 판정합니다.
 * boolean false 및 숫자 0도 유효한 개인값으로 판정합니다.
 *
 * @param value 검사할 개인 설정값
 * @returns 값의 존재 여부
 */
export function hasPersonalSettingValue(value: any): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    return true;
  }
  return String(value).trim() !== "";
}

/**
 * 필드의 Guidance 등급과 개인값 존재 여부에 따라 배지 정보 및 경고 상태를 판정합니다.
 */
export interface FieldGuidanceState {
  badgeType: "required" | "recommended" | "success" | "none";
  guidanceText: string;
  inputBorderColor?: string;
}

export function resolveFieldGuidanceState(
  guidance: "required_override" | "recommended_override" | undefined | null,
  hasValue: boolean
): FieldGuidanceState {
  if (guidance === "required_override") {
    if (hasValue) {
      return {
        badgeType: "success",
        guidanceText: "",
      };
    } else {
      return {
        badgeType: "required",
        guidanceText: "개인 설정이 필요합니다.",
        inputBorderColor: "#fecaca", // 옅은 빨강 경계선 가이드
      };
    }
  }

  if (guidance === "recommended_override") {
    if (hasValue) {
      return {
        badgeType: "success",
        guidanceText: "",
      };
    } else {
      return {
        badgeType: "recommended",
        guidanceText: "회사 기본값으로 처리됩니다. 개인 설정을 권장합니다.",
      };
    }
  }

  return {
    badgeType: "none",
    guidanceText: "",
  };
}
