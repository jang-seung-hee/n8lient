"use client";

import React, { useState, useEffect, useRef } from "react";
import { detectInAppBrowser, InAppBrowserInfo } from "@/lib/browserGuard";

interface InAppBrowserGuardProps {
  children: React.ReactNode;
}

export default function InAppBrowserGuard({ children }: InAppBrowserGuardProps) {
  const [browserInfo, setBrowserInfo] = useState<InAppBrowserInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
      const userAgent = window.navigator.userAgent;
      const info = detectInAppBrowser(userAgent);
      
      // /open-in-browser 예외 경로 검사
      const isGuardRoute = window.location.pathname.startsWith("/open-in-browser");
      if (info.isInApp && !isGuardRoute) {
        setBrowserInfo(info);
      }
    }

    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 3000);
      alert("링크가 복사되었습니다.\nChrome 또는 Safari 주소창에 붙여넣어 주세요.");
    } catch (err) {
      alert("주소 복사에 실패했습니다. 주소창의 링크를 직접 복사해 주세요.");
    }
  };

  const handleOpenAndroidChrome = () => {
    if (typeof window !== "undefined") {
      // Android Chrome Intent URL Scheme
      const cleanUrl = currentUrl.replace(/^https?:\/\//, "");
      const chromeIntent = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = chromeIntent;
    }
  };

  const handleRecheck = () => {
    if (typeof window !== "undefined") {
      const userAgent = window.navigator.userAgent;
      const info = detectInAppBrowser(userAgent);
      const isGuardRoute = window.location.pathname.startsWith("/open-in-browser");
      if (!info.isInApp || isGuardRoute) {
        setBrowserInfo(null);
      } else {
        alert("여전히 인앱 브라우저 상태입니다. 외부 브라우저(Chrome/Safari)로 열어주세요.");
      }
    }
  };

  // 일반 브라우저이거나 가드가 작동하지 않는 경우 정상 렌더링
  if (!browserInfo) {
    return <>{children}</>;
  }

  // 인앱 브라우저 감지 시 안내 화면 노출
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        padding: "24px 16px",
        boxSizing: "border-box",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "400px",
          padding: "28px 24px",
          boxSizing: "border-box",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* 상단 브랜딩 */}
        <div>
          <span style={{ fontSize: "24px" }}>⚠️</span>
          <h1
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#111827",
              marginTop: "8px",
              marginBottom: "4px",
            }}
          >
            외부 브라우저 실행 안내
          </h1>
          <p style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.45 }}>
            N8Lient는 안전한 Google 로그인을 위해<br />
            <strong>Chrome</strong> 또는 <strong>Safari</strong> 브라우저에서 열어야 합니다.
          </p>
        </div>

        {/* 인앱 브라우저 명시적 가이드 박스 */}
        <div
          style={{
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "8px",
            padding: "16px",
            fontSize: "12.5px",
            color: "#1e3a8a",
            textAlign: "left",
            lineHeight: 1.5,
          }}
        >
          {browserInfo.isKakao ? (
            <>
              <strong>💬 카카오톡 외부 브라우저 실행 방법:</strong>
              <div style={{ marginTop: "6px" }}>
                우측 상단 <strong>더보기 버튼(⋯ 또는 세로 점 3개)</strong>을 클릭한 뒤, <strong>"다른 브라우저로 열기"</strong> 또는 <strong>"Safari로 열기"</strong>를 선택해 주세요.
              </div>
            </>
          ) : (
            <>
              <strong>🌐 {browserInfo.browserName || "인앱 브라우저"} 제한 안내:</strong>
              <div style={{ marginTop: "6px" }}>
                현재 열려있는 인앱 브라우저 환경에서는 Google 소셜 로그인이 정상적으로 동작하지 않습니다.
              </div>
            </>
          )}

          {/* iOS & Android 대응 가이드 */}
          <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px dashed #bfdbfe", fontSize: "11.5px" }}>
            {browserInfo.isIOS && (
              <span>ℹ️ <strong>iPhone:</strong> 우측 하단 또는 상단 공유 아이콘을 눌러 <strong>Safari로 열기</strong>를 선택하세요.</span>
            )}
            {browserInfo.isAndroid && (
              <span>ℹ️ <strong>Android:</strong> 우측 상단 더보기 아이콘(⋮)을 눌러 <strong>Chrome으로 열기</strong>를 선택하세요.</span>
            )}
          </div>
        </div>

        {/* 버튼 영역 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {browserInfo.isAndroid && (
            <button
              type="button"
              onClick={handleOpenAndroidChrome}
              style={{
                height: "42px",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "13.5px",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
              }}
            >
              🌐 Chrome으로 열기 (Android)
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              height: "40px",
              backgroundColor: "#ffffff",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {copied ? "✅ 링크가 복사되었습니다" : "📋 현재 페이지 링크 복사"}
          </button>

          <button
            type="button"
            onClick={handleRecheck}
            style={{
              background: "none",
              border: "none",
              color: "#6b7280",
              fontSize: "12px",
              cursor: "pointer",
              textDecoration: "underline",
              padding: "4px",
            }}
          >
            이미 외부 브라우저입니다 (다시 확인)
          </button>
        </div>
      </div>
    </div>
  );
}
