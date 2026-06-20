"use client";

import React, { useState } from "react";

interface AudioPermissionNoticeProps {
  uiState: "idle" | "retryable" | "blocked" | "device_error" | "unsupported";
  errorMessage: string | null;
  onRetry: () => void;
}

export default function AudioPermissionNotice({
  uiState,
  errorMessage,
  onRetry,
}: AudioPermissionNoticeProps) {
  const [activeGuideTab, setActiveGuideTab] = useState<
    "android_chrome" | "ios_safari" | "ios_chrome" | "desktop_chrome" | "mac_safari" | "desktop_firefox"
  >("android_chrome");

  if (!errorMessage || uiState === "idle") return null;

  return (
    <div className="ux_audio_permission_notice">
      <h5 className="ux_audio_permission_notice_title">
        ⚠️ {(() => {
          if (errorMessage === "NotAllowedError") {
            return uiState === "blocked"
              ? "마이크 권한이 브라우저에서 차단된 상태입니다."
              : "마이크 권한이 거부되었습니다.";
          }
          if (errorMessage === "NotFoundError") return "연결된 마이크 장치를 찾을 수 없습니다.";
          if (errorMessage === "NotReadableError") return "마이크 장치를 열 수 없습니다.";
          if (errorMessage === "SecurityError") return "보안 정책에 의해 차단되었습니다.";
          if (errorMessage === "TypeError") return "녹음 환경을 지원하지 않습니다.";
          if (errorMessage === "OverconstrainedError") return "마이크 설정 요구사항을 만족할 수 없습니다.";
          return "마이크 권한 또는 장치 상태를 확인해 주세요.";
        })()}
      </h5>
      
      <div className="ux_audio_permission_notice_body">
        {(() => {
          if (errorMessage === "NotAllowedError") {
            if (uiState === "blocked") {
              return (
                <>
                  마이크 권한이 브라우저에서 차단된 상태입니다.<br />
                  현재 상태에서는 앱이 권한 팝업을 다시 띄울 수 없습니다.<br />
                  아래 안내에 따라 브라우저 또는 기기 설정에서 마이크 권한을 허용해 주세요.
                </>
              );
            } else {
              return (
                <>
                  마이크 권한이 거부되었습니다.<br />
                  권한 요청이 다시 표시될 수 있습니다.<br />
                  다시 시도를 눌러 한 번 더 권한 요청을 진행해 주세요.
                </>
              );
            }
          }
          if (
            errorMessage === "NotFoundError" ||
            errorMessage === "NotReadableError" ||
            errorMessage === "OverconstrainedError"
          ) {
            return (
              <>
                사용 가능한 마이크를 찾을 수 없거나 다른 앱에서 사용 중입니다.<br />
                다른 앱의 녹음을 종료한 뒤 다시 시도해 주세요.
              </>
            );
          }
          return "마이크 입력 장치에 문제가 있거나 브라우저 권한 문제일 수 있습니다. 오디오 장치 연결 및 설정을 확인해 주세요.";
        })()}
      </div>

      {errorMessage === "NotAllowedError" && uiState === "blocked" && (
        <div className="ux_audio_permission_device_guide" style={{ marginTop: "10px" }}>
          <div className="ux_audio_permission_device_tabs" style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
            {[
              { id: "android_chrome", label: "Android Chrome" },
              { id: "ios_safari", label: "iPhone Safari" },
              { id: "ios_chrome", label: "iPhone Chrome" },
              { id: "desktop_chrome", label: "PC Chrome" },
              { id: "mac_safari", label: "Mac Safari" },
              { id: "desktop_firefox", label: "PC Firefox" }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveGuideTab(tab.id as any)}
                className="ux_audio_permission_button"
                style={{
                  padding: "4px 8px",
                  fontSize: "11px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  backgroundColor: activeGuideTab === tab.id ? "#111111" : "#ffffff",
                  color: activeGuideTab === tab.id ? "#ffffff" : "#374151",
                  cursor: "pointer"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="ux_audio_permission_device_content" style={{ fontSize: "11px", color: "#7f1d1d", backgroundColor: "#fff5f5", padding: "10px", borderRadius: "6px", border: "1px solid #feb2b2", lineHeight: 1.5 }}>
            {activeGuideTab === "android_chrome" && (
              <ol className="ux_audio_permission_device_steps" style={{ margin: 0, paddingLeft: "16px" }}>
                <li>Chrome 주소창 왼쪽의 자물쇠 또는 사이트 정보 아이콘을 누릅니다.</li>
                <li><strong>권한</strong> 또는 <strong>사이트 설정</strong>으로 들어갑니다.</li>
                <li>마이크를 <strong>허용</strong>으로 변경합니다.</li>
                <li>페이지로 돌아와 <strong>“권한 허용 후 다시 확인”</strong>을 누릅니다.</li>
                <li style={{ marginTop: "4px", listStyleType: "none", marginLeft: "-16px" }}><em>또는: Chrome &gt; 설정 &gt; 사이트 설정 &gt; 마이크에서 현재 사이트가 차단되어 있으면 허용으로 변경합니다.</em></li>
                <li style={{ marginTop: "4px", listStyleType: "none", marginLeft: "-16px" }}><em>또는: Android 설정 &gt; 앱 &gt; Chrome &gt; 권한 &gt; 마이크에서 Chrome 앱의 마이크 권한을 허용합니다.</em></li>
              </ol>
            )}
            {activeGuideTab === "ios_safari" && (
              <ol className="ux_audio_permission_device_steps" style={{ margin: 0, paddingLeft: "16px" }}>
                <li>iPhone/iPad <strong>설정 앱</strong>을 엽니다.</li>
                <li><strong>Safari</strong> 설정으로 이동합니다.</li>
                <li><strong>마이크 권한</strong> 또는 <strong>웹 사이트별 권한 설정</strong>을 확인합니다.</li>
                <li>현재 사이트의 마이크 접근을 <strong>허용</strong>합니다.</li>
                <li>Safari로 돌아와 페이지를 새로고침한 뒤 다시 녹음을 시도합니다.</li>
              </ol>
            )}
            {activeGuideTab === "ios_chrome" && (
              <ol className="ux_audio_permission_device_steps" style={{ margin: 0, paddingLeft: "16px" }}>
                <li>iPhone/iPad <strong>설정 앱</strong>을 엽니다.</li>
                <li><strong>Chrome</strong> 설정으로 이동합니다.</li>
                <li><strong>마이크</strong> 또는 음성 인식 관련 권한을 허용합니다.</li>
                <li>Chrome으로 돌아와 페이지를 새로고침한 뒤 다시 녹음을 시도합니다.</li>
              </ol>
            )}
            {activeGuideTab === "desktop_chrome" && (
              <ol className="ux_audio_permission_device_steps" style={{ margin: 0, paddingLeft: "16px" }}>
                <li>주소창 왼쪽의 자물쇠 또는 사이트 정보 아이콘을 클릭합니다.</li>
                <li><strong>사이트 설정</strong>으로 들어갑니다.</li>
                <li>마이크 권한을 <strong>허용</strong>으로 변경합니다.</li>
                <li>페이지로 돌아와 <strong>“권한 허용 후 다시 확인”</strong>을 누릅니다.</li>
              </ol>
            )}
            {activeGuideTab === "mac_safari" && (
              <ol className="ux_audio_permission_device_steps" style={{ margin: 0, paddingLeft: "16px" }}>
                <li>Safari &gt; 설정을 엽니다.</li>
                <li><strong>웹 사이트</strong> 탭으로 이동합니다.</li>
                <li><strong>마이크</strong> 항목을 선택합니다.</li>
                <li>현재 사이트의 권한을 <strong>허용</strong>으로 변경합니다.</li>
                <li>페이지로 돌아와 <strong>“권한 허용 후 다시 확인”</strong>을 누릅니다.</li>
              </ol>
            )}
            {activeGuideTab === "desktop_firefox" && (
              <ol className="ux_audio_permission_device_steps" style={{ margin: 0, paddingLeft: "16px" }}>
                <li>주소창 왼쪽의 자물쇠 또는 권한 아이콘을 클릭합니다.</li>
                <li>마이크 차단 권한을 해제합니다.</li>
                <li>또는 Firefox 설정 &gt; 개인정보 및 보안 &gt; 권한 &gt; 마이크 설정에서 현재 사이트를 허용합니다.</li>
                <li>페이지로 돌아와 <strong>“권한 허용 후 다시 확인”</strong>을 누릅니다.</li>
              </ol>
            )}
          </div>
        </div>
      )}

      <div className="ux_audio_permission_actions">
        {uiState === "blocked" ? (
          <button
            type="button"
            className="ux_audio_permission_button ux_button_compact ux_button_secondary"
            onClick={onRetry}
            style={{ border: "1px solid #b91c1c", color: "#b91c1c", backgroundColor: "#fff" }}
          >
            🔄 권한 허용 후 다시 확인
          </button>
        ) : (
          <button
            type="button"
            className="ux_audio_permission_button ux_button_compact ux_button_secondary"
            onClick={onRetry}
            style={{ border: "1px solid #b91c1c", color: "#b91c1c", backgroundColor: "#fff" }}
          >
            🔄 다시 시도
          </button>
        )}
      </div>
    </div>
  );
}
