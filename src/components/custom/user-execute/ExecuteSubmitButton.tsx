"use client";

import React from "react";

interface ExecuteSubmitButtonProps {
  isRecording: boolean;
  recordingTime: number;
  submitting: boolean;
  hasFile: boolean;
  onSubmitClick: (e: React.MouseEvent) => void;
  isInlineMobileHide?: boolean; // inline 버튼의 경우 모바일에서 숨겨지는 클래스 적용 여부
  buttonType?: "submit" | "button"; // 버튼의 type 속성
}

/**
 * N8N 실행 화면에서 녹음 중지 상태, 전송 대기/진행 상태에 대응하는 
 * PC/모바일 전용 제출 버튼 컴포넌트입니다.
 */
export default function ExecuteSubmitButton({
  isRecording,
  recordingTime,
  submitting,
  hasFile,
  onSubmitClick,
  isInlineMobileHide = false,
  buttonType = "submit",
}: ExecuteSubmitButtonProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const className = `ux_button ${
    isRecording ? "ux_button_danger" : "ux_button_primary"
  } ux_button_submit_large ${
    isInlineMobileHide ? "ux_execute_submit_inline_mobile_hide" : ""
  }`;

  const style = {
    width: "100%",
    borderRadius: "6px",
    backgroundColor: !isRecording && submitting ? "#4b5563" : undefined,
    border: !isRecording && submitting ? "none" : undefined,
    transition: "background-color 0.15s ease",
  };

  // 녹음 중일 때는 submit 속성 여부와 상관없이 click 이벤트로 처리
  if (isRecording) {
    return (
      <button
        type="button"
        className={className}
        onClick={onSubmitClick}
        style={style}
      >
        <span
          style={{
            display: "inline-block",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: "#ffffff",
            animation: "pulse 1.5s infinite",
            marginRight: "6px",
          }}
        ></span>
        🛑 녹음 정지 ({formatTime(recordingTime)})
      </button>
    );
  }

  return (
    <button
      type={buttonType}
      className={className}
      onClick={buttonType === "button" ? onSubmitClick : undefined}
      disabled={submitting}
      style={style}
    >
      {submitting
        ? hasFile
          ? "파일을 업로드 중입니다. 화면을 닫지 마세요..."
          : "실행 요청 처리 중..."
        : "작성내용 전송하기"}
    </button>
  );
}
