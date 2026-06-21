/**
 * URL 식별 및 파싱을 위한 공통 유틸리티
 * 한국어 주석 표준을 준수합니다.
 */

export interface TextToken {
  type: "text" | "link";
  text: string;
  url?: string;
}

// 문장 끝에서 URL 범위에서 제외해야 할 문장 부호 목록
const TRAILING_PUNCTUATION = /[.,)\]}"'”’]+$/;

// URL 인식을 위한 기본 정규식
// 1. https:// 또는 http:// 로 시작하는 주소
// 2. www. 으로 시작하는 주소
// 3. 일반 도메인 형태 (알파벳/숫자/하이픈.알파벳 2-6글자 TLD, 뒤에 경로가 올 수 있음)
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,6}(?:\/[^\s]*)?)/g;

/**
 * 주어진 텍스트 내에서 URL과 일반 텍스트를 구분하여 토큰 배열로 분리합니다.
 * @param text 대상 입력 문자열
 * @returns 분리된 토큰 배열
 */
export function tokenizeText(text: string): TextToken[] {
  if (!text) return [];

  const tokens: TextToken[] = [];
  let lastIndex = 0;

  // 정규식 매칭 수행
  let match;
  // RegExp.prototype.exec의 무한 루프 방지를 위해 정규식 복사본 사용
  const regex = new RegExp(URL_REGEX);

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    let rawUrl = match[0];

    // 매칭 전 일반 텍스트 추가
    if (matchIndex > lastIndex) {
      tokens.push({
        type: "text",
        text: text.substring(lastIndex, matchIndex),
      });
    }

    // 문장 끝 문장부호 제외 처리 (예: https://example.com. -> https://example.com 과 .)
    let suffix = "";
    const puncMatch = rawUrl.match(TRAILING_PUNCTUATION);
    if (puncMatch) {
      const puncText = puncMatch[0];
      // 문장부호 부분을 URL에서 떼어냄
      rawUrl = rawUrl.substring(0, rawUrl.length - puncText.length);
      suffix = puncText;
    }

    // 정규식으로 다시 걸러서 도메인이 너무 짧거나 유효하지 않은 특수 케이스 제외
    const hasProtocol = /^https?:\/\//i.test(rawUrl);
    const hasWww = /^www\./i.test(rawUrl);
    
    // 프로토콜도 없고 www도 없는 일반 도메인의 경우 최소한 dot(.)이 포함되어 있어야 함
    const isValidDomain = hasProtocol || hasWww || (rawUrl.includes(".") && rawUrl.length > 4);

    if (rawUrl && isValidDomain) {
      // href에 바인딩할 최종 URL 생성 (www. 로 시작하거나 프로토콜이 없는 경우 https:// 보정)
      let finalHref = rawUrl;
      if (!hasProtocol) {
        finalHref = `https://${rawUrl}`;
      }

      tokens.push({
        type: "link",
        text: rawUrl,
        url: finalHref,
      });
    } else {
      // 유효하지 않은 경우 일반 텍스트로 환원
      tokens.push({
        type: "text",
        text: rawUrl,
      });
    }

    // 떼어낸 문장부호가 있다면 일반 텍스트로 토큰 목록에 추가
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
