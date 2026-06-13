/**
 * 한글 문자열을 영문 로마자 발음 표기법에 맞춰 변환하는 순수 함수입니다.
 * 초성, 중성, 종성을 분리하여 결합하고 영문/숫자 이외의 특수기호나 공백은 하이픈(-)으로 처리합니다.
 * 
 * @param text 변환할 한글 문자열
 * @returns 로마자 표기로 변환된 문자열
 */
export const romanizeKorean = (text: string): string => {
  const chosung = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
  const jungsung = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'ye', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
  const jongsung = ['', 'g', 'kk', 'gs', 'n', 'nj', 'nh', 'd', 'l', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'b', 'bs', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h'];

  let result = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const hangulIndex = code - 0xac00;
      const cho = Math.floor(hangulIndex / 28 / 21);
      const jung = Math.floor((hangulIndex / 28) % 21);
      const jong = hangulIndex % 28;
      result += chosung[cho] + jungsung[jung] + (jongsung[jong] || "");
    } else {
      const char = text.charAt(i).toLowerCase();
      if (/[a-z0-9]/.test(char)) {
        result += char;
      } else if (/\s/.test(char)) {
        result += "-";
      }
    }
  }
  return result.replace(/-+/g, "-").replace(/^-|-$/g, "");
};
