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

  // 명시적 인앱 브라우저 토큰 검증
  const isKnownInApp = isKakao || isInstagram || isFacebook || isNaver || isLine || isTwitter || isDaum;

  // 일반적인 Webview 패턴 검출
  const isAndroidWebView =
    ua.includes("android") &&
    (ua.includes("; wv") || ua.includes(" wv") || ua.includes("webview") || ua.includes("version/"));

  const isIOSWebView =
    /iphone|ipad|ipod/.test(ua) &&
    !ua.includes("safari") &&
    !ua.includes("crios") &&
    !ua.includes("fxios") &&
    !ua.includes("edgios") &&
    !ua.includes("opios");

  const isInApp = isKnownInApp || isAndroidWebView || isIOSWebView;

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
