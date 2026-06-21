/**
 * URL 식별 및 파싱을 위한 공통 유틸리티 (이메일 도메인 오폭 방지 포함)
 * 한국어 주석 표준을 준수합니다.
 */

export interface TextToken {
  type: "text" | "link";
  text: string;
  url?: string;
}

// 문장 끝에서 URL 범위에서 제외해야 할 문장 부호 목록
const TRAILING_PUNCTUATION = /[.,)\]}"'”’]+$/;

// 이메일 주소 매칭 정규식
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/;

// 통합 매칭 정규식 (이메일을 먼저 매칭하여 URL 매칭 오폭을 원천 차단)
const COMBINED_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}|https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,6}(?:\/[^\s]*)?)/g;

/**
 * 주어진 텍스트 내에서 URL과 일반 텍스트를 구분하여 토큰 배열로 분리합니다.
 * 이메일 주소(user@example.com 등)는 도메인이 URL로 쪼개지지 않고 일반 텍스트로 보존됩니다.
 * @param text 대상 입력 문자열
 * @returns 분리된 토큰 배열
 */
export function tokenizeText(text: string): TextToken[] {
  if (!text) return [];

  const tokens: TextToken[] = [];
  let lastIndex = 0;

  let match;
  const regex = new RegExp(COMBINED_REGEX);

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    let matchedStr = match[0];

    // 매칭 전 일반 텍스트 추가
    if (matchIndex > lastIndex) {
      tokens.push({
        type: "text",
        text: text.substring(lastIndex, matchIndex),
      });
    }

    // 1. 이메일 주소인 경우 -> 통째로 일반 텍스트 처리
    if (EMAIL_PATTERN.test(matchedStr)) {
      tokens.push({
        type: "text",
        text: matchedStr,
      });
      lastIndex = regex.lastIndex;
      continue;
    }

    // 2. 앞 문자가 @ 인 경우 -> URL 처리하지 않고 일반 텍스트로 처리
    if (matchIndex > 0 && text[matchIndex - 1] === "@") {
      tokens.push({
        type: "text",
        text: matchedStr,
      });
      lastIndex = regex.lastIndex;
      continue;
    }

    // 3. 문장 끝 문장부호 제외 처리 (예: https://example.com. -> https://example.com 과 .)
    let suffix = "";
    const puncMatch = matchedStr.match(TRAILING_PUNCTUATION);
    if (puncMatch) {
      const puncText = puncMatch[0];
      matchedStr = matchedStr.substring(0, matchedStr.length - puncText.length);
      suffix = puncText;
    }

    // 정규식 오폭 방지 유효성 검사
    const hasProtocol = /^https?:\/\//i.test(matchedStr);
    const hasWww = /^www\./i.test(matchedStr);
    const isValidDomain = hasProtocol || hasWww || (matchedStr.includes(".") && matchedStr.length > 4);

    if (matchedStr && isValidDomain) {
      let finalHref = matchedStr;
      if (!hasProtocol) {
        finalHref = `https://${matchedStr}`;
      }

      tokens.push({
        type: "link",
        text: matchedStr,
        url: finalHref,
      });
    } else {
      tokens.push({
        type: "text",
        text: matchedStr,
      });
    }

    if (suffix) {
      tokens.push({
        type: "text",
        text: suffix,
      });
    }

    lastIndex = regex.lastIndex;
  }

  // 남은 텍스트 추가
  if (lastIndex < text.length) {
    tokens.push({
      type: "text",
      text: text.substring(lastIndex),
    });
  }

  return tokens;
}
