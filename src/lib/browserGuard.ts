/**
 * N8Lient 인앱 브라우저 감지 유틸 (v1.0)
 * SSR 환경 대응을 위해 userAgent 인자를 받아서 처리
 */

export interface InAppBrowserInfo {
  isInApp: boolean;
  browserName: string;
  isKakao: boolean;
  isInstagram: boolean;
  isFacebook: boolean;
  isNaver: boolean;
  isLine: boolean;
  isIOS: boolean;
  isAndroid: boolean;
}

export function detectInAppBrowser(userAgent: string): InAppBrowserInfo {
  const ua = userAgent.toLowerCase();

  const isKakao = ua.includes("kakaotalk");
  const isInstagram = ua.includes("instagram");
  const isFacebook = ua.includes("fban") || ua.includes("fbav");
  const isNaver = ua.includes("naver");
  const isLine = ua.includes("line");
  const isTwitter = ua.includes("twitter");
  const isDaum = ua.includes("daumapps");

  // 일반적인 Webview 패턴 검출
  const isWebview =
    ua.includes("webview") ||
    ua.includes("wv") ||
    (ua.includes("iphone") && !ua.includes("safari")) ||
    (ua.includes("android") && ua.includes("version/"));

  const isInApp = isKakao || isInstagram || isFacebook || isNaver || isLine || isTwitter || isDaum || isWebview;

  let browserName = "Generic Webview";
  if (isKakao) browserName = "KakaoTalk";
  else if (isInstagram) browserName = "Instagram";
  else if (isFacebook) browserName = "Facebook";
  else if (isNaver) browserName = "NAVER";
  else if (isLine) browserName = "LINE";
  else if (isTwitter) browserName = "Twitter";
  else if (isDaum) browserName = "Daum";

  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);

  return {
    isInApp,
    browserName,
    isKakao,
    isInstagram,
    isFacebook,
    isNaver,
    isLine,
    isIOS,
    isAndroid,
  };
}
