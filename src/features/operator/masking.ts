/**
 * 이 파일은 개인정보 유출 방지를 위한 마스킹 유틸리티 기능을 제공합니다.
 * 한국어 주석 표준을 준수합니다.
 */

/**
 * 디스플레이 이름(이름)을 마스킹 처리합니다.
 * - 한글 2글자: 첫 글자 유지, 뒤에 * 표시 (예: "김민" -> "김*")
 * - 한글 3글자 이상: 첫 글자 유지, 나머지는 **로 표시 (예: "장승희" -> "장**", "홍길동" -> "홍**")
 * - 영문/기타: 첫 글자 유지, 뒤에 *** 표시 (예: "Jang Seunghee" -> "J***")
 * - 값이 없는 경우: "-" 반환
 */
export function maskDisplayName(name?: string | null): string {
  if (!name) return "-";
  const trimmed = name.trim();
  if (!trimmed) return "-";

  // 한글 검사 정규식
  const koreanRegex = /^[가-힣]+$/;

  if (koreanRegex.test(trimmed)) {
    if (trimmed.length <= 1) {
      return trimmed;
    }
    if (trimmed.length === 2) {
      return trimmed[0] + "*";
    }
    return trimmed[0] + "**";
  } else {
    // 영문 및 기타 문자
    return trimmed[0] + "***";
  }
}

/**
 * 이메일 주소를 마스킹 처리합니다.
 * - 골뱅이(@) 앞자리 ID의 첫 글자만 남기고 나머지는 길이에 관계없이 *로 표시하거나, 
 *   요청 명세에 맞춰 d*********@gmail.com 형식으로 마스킹합니다.
 *   (예: diafactory9@gmail.com -> d*********@gmail.com)
 * - 값이 없는 경우: "-" 반환
 */
export function maskEmail(email?: string | null): string {
  if (!email) return "-";
  const trimmed = email.trim();
  if (!trimmed) return "-";

  const atIdx = trimmed.indexOf("@");
  if (atIdx <= 0) return trimmed; // 올바르지 않은 이메일 형식인 경우 원본 반환

  const localPart = trimmed.slice(0, atIdx);
  const domainPart = trimmed.slice(atIdx);

  if (localPart.length <= 1) {
    return localPart + "@" + domainPart;
  }

  // 첫 글자 유지하고 나머지는 '*'로 대체
  const maskedLocal = localPart[0] + "*".repeat(localPart.length - 1);
  return maskedLocal + domainPart;
}
