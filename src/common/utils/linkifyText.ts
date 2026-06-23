/**
 * URL 식별 및 파싱을 위한 공통 유틸리티 (이메일 및 따옴표 감싸진 URL 제외 로직 추가)
 * 한국어 주석 표준을 준수합니다.
 */

export interface TextToken {
  type: "text" | "link";
  text: string;
  url?: string;
}

// 문장 끝에서 URL 범위에서 제외해야 할 문장 부호 목록
// 따옴표 및 스마트 따옴표도 제외 처리를 위해 대상에 추가
const TRAILING_PUNCTUATION = /[.,)\]}"'”’]+$/;

// 이메일 주소 매칭 정규식
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/;

// 통합 매칭 정규식 (이메일을 먼저 매칭하여 URL 매칭 오폭을 원천 차단)
const COMBINED_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}|https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,6}(?:\/[^\s]*)?)/g;

// URL 자동 링크 대상에서 제외할 일반 파일 확장자 목록
const EXCLUDED_EXTENSIONS = new Set([
  "md", "json", "txt", "tar", "zip", "webm", "mp3", "png", "jpg", "jpeg", "pdf",
  "gif", "wav", "mp4", "mov", "csv", "xlsx", "xls", "ppt", "pptx", "doc", "docx", "xml", "yaml", "yml"
]);

/**
 * 주어진 문자열이 유효한 URL 패턴인지 판별합니다.
 * 파일명 오폭을 방지하기 위해 정교한 필터링 규칙을 적용합니다.
 */
export function isProbablyUrl(str: string): boolean {
  if (!str) return false;

  const hasProtocol = /^https?:\/\//i.test(str);
  const hasWww = /^www\./i.test(str);

  // 1. 프로토콜과 www.이 둘 다 없는 도메인 형태의 경우
  if (!hasProtocol && !hasWww) {
    const lowercase = str.toLowerCase();
    
    // 호스트명(도메인)에는 RFC 규격상 언더바(_)를 포함할 수 없으므로, 언더바가 포함되어 있다면 파일명으로 분류
    if (lowercase.includes("_")) {
      return false;
    }

    // 쿼리나 해시를 떼고 판단
    const cleanStr = lowercase.split("?")[0].split("#")[0];
    const parts = cleanStr.split(".");
    
    if (parts.length > 1) {
      const ext = parts[parts.length - 1];
      if (EXCLUDED_EXTENSIONS.has(ext)) {
        return false;
      }
    } else {
      // 점(.)이 없으면 URL이 아님
      return false;
    }

    // TLD(가장 마지막 도메인 파트) 형식 검증 (2~6자의 알파벳)
    const lastPart = parts[parts.length - 1];
    const tldRegex = /^[a-z]{2,6}$/i;
    if (!tldRegex.test(lastPart)) {
      return false;
    }
  }

  // 2. 기본적인 URL 형식 여부 검사
  const hasDot = str.includes(".");
  return hasProtocol || hasWww || (hasDot && str.length > 4);
}

/**
 * 주어진 텍스트 내에서 URL과 일반 텍스트를 구분하여 토큰 배열로 분리합니다.
 * - 이메일 주소는 링크화하지 않습니다.
 * - 큰따옴표, 작은따옴표, 스마트 따옴표("URL", 'URL', “URL”, ‘URL’)로 감싸진 URL은 링크화하지 않습니다.
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

    // 4. 따옴표로 완전히 감싸진 URL 제외 처리
    // URL 바로 앞 문자와 (문장부호를 뗀 후의) URL 바로 뒤 문자를 스캔
    const charBefore = matchIndex > 0 ? text[matchIndex - 1] : "";
    const charAfter = text[matchIndex + matchedStr.length] || "";

    const isWrappedInDoubleQuotes = charBefore === '"' && charAfter === '"';
    const isWrappedInSingleQuotes = charBefore === "'" && charAfter === "'";
    const isWrappedInSmartDoubleQuotes = charBefore === "“" && charAfter === "”";
    const isWrappedInSmartSingleQuotes = charBefore === "‘" && charAfter === "’";

    const isWrappedInQuotes =
      isWrappedInDoubleQuotes ||
      isWrappedInSingleQuotes ||
      isWrappedInSmartDoubleQuotes ||
      isWrappedInSmartSingleQuotes;

    if (matchedStr && isProbablyUrl(matchedStr) && !isWrappedInQuotes) {
      const hasProtocol = /^https?:\/\//i.test(matchedStr);
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
      // 따옴표로 감싸졌거나 유효하지 않은 도메인은 일반 텍스트로 보존
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
