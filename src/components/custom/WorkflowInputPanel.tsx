"use client";

import React, { useState, useRef, useEffect } from "react";
import { siteConfig } from "@/config/siteConfig";
import { playAppSound, setAppSoundMuted } from "@/lib/appSound";

interface WorkflowInputPanelProps {
  acceptedInputTypes: Array<"text" | "file" | "audio" | "image">;
  allowedFileTypes?: string[];
  maxFileSizeMB?: number;
  onChange: (data: {
    text?: string;
    file: File | null;
    inputType: "text" | "file" | "image" | "audio" | null;
  }) => void;
  submitting: boolean;
  onRecordingStateChange?: (isRecording: boolean, seconds: number) => void;
  innerRef?: React.RefObject<{ stopRecording: () => void } | null>;
}

export default function WorkflowInputPanel({
  acceptedInputTypes,
  allowedFileTypes,
  maxFileSizeMB,
  onChange,
  submitting,
  onRecordingStateChange,
  innerRef,
}: WorkflowInputPanelProps) {
  // 환경변수 기반 최대 업로드 용량 결정 (기본값: 4MB)
  const envMaxUploadMB = process.env.NEXT_PUBLIC_MAX_UPLOAD_MB
    ? parseInt(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB, 10)
    : 4;
  const maxLimitMB = maxFileSizeMB ? Math.min(maxFileSizeMB, envMaxUploadMB) : envMaxUploadMB;

  const [textVal, setTextVal] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<"text" | "file" | "image" | "audio" | null>(null);

  // 음성 녹음 상태 관련
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isRecordingSupported, setIsRecordingSupported] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // 녹음 지원 여부 체크
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasMediaRecorder = typeof MediaRecorder !== "undefined";
      setIsRecordingSupported(hasMediaDevices && hasMediaRecorder);
    }
  }, []);

  // 기본 활성 탭 설정
  useEffect(() => {
    if (acceptedInputTypes.length > 0) {
      // 우선순위가 높은 탭부터 활성화
      if (acceptedInputTypes.includes("text")) {
        setActiveTab("text");
      } else if (acceptedInputTypes.includes("file")) {
        setActiveTab("file");
      } else if (acceptedInputTypes.includes("image")) {
        setActiveTab("image");
      } else if (acceptedInputTypes.includes("audio")) {
        setActiveTab("audio");
      }
    } else {
      setActiveTab(null);
    }
  }, [acceptedInputTypes]);

  // 상위 컴포넌트에 데이터 전달
  const propagateChange = (
    text: string,
    file: File | null,
    type: "text" | "file" | "image" | "audio" | null
  ) => {
    onChange({
      text: text.trim() || undefined,
      file,
      inputType: type,
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setTextVal(val);
    propagateChange(val, selectedFile, activeTab);
  };

  // 파일 확장자 추출 헬퍼
  const getFileExtension = (filename: string): string => {
    const parts = filename.split(".");
    return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
  };

  // 허용 확장자 정규화 (. 제거 및 소문자화)
  const normalizeAllowedExtensions = (types?: string[]): string[] => {
    if (!types) return [];
    return types.map((t) => t.replace(/^\./, "").trim().toLowerCase());
  };

  // 확장자 기준 허용 여부 체크
  const isAllowedByExtension = (fileExt: string, allowedExts: string[]): boolean => {
    return allowedExts.includes(fileExt);
  };

  // MIME 타입 기준 허용 여부 체크 (mp3, webm, m4a, wav MIME 후보군 정규식 및 mapping 포함)
  const isAllowedByMime = (fileMime: string, allowedExts: string[]): boolean => {
    const mimeMap: Record<string, string[]> = {
      mp3: ["audio/mpeg", "audio/mp3", "audio/x-mp3"],
      webm: ["audio/webm", "video/webm"],
      m4a: ["audio/mp4", "audio/x-m4a", "audio/m4a"],
      wav: ["audio/wav", "audio/wave", "audio/x-wav"],
    };

    const lowercaseMime = fileMime.toLowerCase();

    // 1. 매핑된 명시적 후보군 검사
    for (const ext of allowedExts) {
      const candidates = mimeMap[ext];
      if (candidates && candidates.includes(lowercaseMime)) {
        return true;
      }
    }

    // 2. 일반적 MIME 매칭 (예: audio/* 등 와일드카드 검사 지원)
    for (const ext of allowedExts) {
      if (ext === "audio" && lowercaseMime.startsWith("audio/")) return true;
      if (ext === "image" && lowercaseMime.startsWith("image/")) return true;
      if (ext === "video" && lowercaseMime.startsWith("video/")) return true;
      
      const regexStr = ext.replace("*", ".*");
      if (lowercaseMime.match(new RegExp(regexStr))) {
        return true;
      }
    }

    return false;
  };

  // 파일 유효성 검사 (용량 및 확장자)
  const validateFile = (file: File): boolean => {
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxLimitMB) {
      alert(`파일 크기가 제한 용량(${maxLimitMB}MB)을 초과했습니다. (현재 파일 크기: ${fileSizeMB.toFixed(2)}MB)`);
      return false;
    }

    if (allowedFileTypes && allowedFileTypes.length > 0) {
      const fileExt = getFileExtension(file.name);
      const normalizedExts = normalizeAllowedExtensions(allowedFileTypes);

      const hasValidExtension = isAllowedByExtension(fileExt, normalizedExts);
      const hasValidMime = isAllowedByMime(file.type, normalizedExts);

      // 확장자나 MIME 타입 중 하나라도 만족하면 승인
      if (!hasValidExtension && !hasValidMime) {
        alert(`허용되지 않는 파일 형식입니다. 허용 형식: ${allowedFileTypes.join(", ")}`);
        return false;
      }
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "file" | "image") => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        propagateChange(textVal, file, type);
      } else {
        e.target.value = "";
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    setAudioUrl(null);
    propagateChange(textVal, null, activeTab);
  };

  // 음성 녹음 시작
  const startRecording = async () => {
    if (!isRecordingSupported) return;
    setAudioError(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = "audio/webm";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/mpeg")) {
          mimeType = "audio/mpeg";
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType.split("/")[1] || "webm";
        const audioFile = new File([audioBlob], `recorded_audio_${Date.now()}.${ext}`, {
          type: mimeType,
        });

        // 파일 유효성 검사
        if (validateFile(audioFile)) {
          const url = URL.createObjectURL(audioBlob);
          setAudioUrl(url);
          setSelectedFile(audioFile);
          propagateChange(textVal, audioFile, "audio");
        }
        
        // 스트림 트랙 중지
        stream.getTracks().forEach((track) => track.stop());

        // 녹음이 완료된 시점에 unmute 후 성공 알림음 재생
        setAppSoundMuted(false);
        playAppSound("success");
      };

      // 녹음 시 UI 효과음이 유입되지 않도록 음소거 처리
      setAppSoundMuted(true);
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      if (onRecordingStateChange) {
        onRecordingStateChange(true, 0);
      }
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const nextTime = prev + 1;
          if (onRecordingStateChange) {
            onRecordingStateChange(true, nextTime);
          }
          return nextTime;
        });
      }, 1000);
    } catch (err: any) {
      console.error("마이크 사용 권한 획득 실패:", err);
      setAudioError("마이크 권한을 획득할 수 없거나 연결 상태를 확인할 수 없습니다.");
    }
  };

  // 음성 녹음 정지
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (onRecordingStateChange) {
        onRecordingStateChange(false, 0);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // 컴포넌트 unmount 시 음소거 풀기 및 타이머 정리 cleanup
  useEffect(() => {
    return () => {
      setAppSoundMuted(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (innerRef) {
      innerRef.current = { stopRecording };
    }
  }, [innerRef, isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 탭 변경 시 상태 초기화
  const handleTabChange = (tab: "text" | "file" | "image" | "audio") => {
    setActiveTab(tab);
    setSelectedFile(null);
    setAudioUrl(null);
    setAudioError(null);
    if (isRecording) {
      stopRecording();
    }
    // 인풋 리셋
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";

    propagateChange(textVal, null, tab);
  };

  if (acceptedInputTypes.length === 0) return null;

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", backgroundColor: "#ffffff", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* 탭 버튼 영역 */}
      <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
        {acceptedInputTypes.includes("text") && (
          <button
            type="button"
            onClick={() => handleTabChange("text")}
            style={{ padding: "6px 10px", fontSize: "12px", fontWeight: 600, border: "none", borderRadius: "4px", cursor: "pointer", backgroundColor: activeTab === "text" ? "#111111" : "transparent", color: activeTab === "text" ? "#ffffff" : "#4b5563" }}
          >
            📝 텍스트
          </button>
        )}
        {acceptedInputTypes.includes("file") && (
          <button
            type="button"
            onClick={() => handleTabChange("file")}
            style={{ padding: "6px 10px", fontSize: "12px", fontWeight: 600, border: "none", borderRadius: "4px", cursor: "pointer", backgroundColor: activeTab === "file" ? "#111111" : "transparent", color: activeTab === "file" ? "#ffffff" : "#4b5563" }}
          >
            📎 일반 파일
          </button>
        )}
        {acceptedInputTypes.includes("image") && (
          <button
            type="button"
            onClick={() => handleTabChange("image")}
            style={{ padding: "6px 10px", fontSize: "12px", fontWeight: 600, border: "none", borderRadius: "4px", cursor: "pointer", backgroundColor: activeTab === "image" ? "#111111" : "transparent", color: activeTab === "image" ? "#ffffff" : "#4b5563" }}
          >
            📷 이미지/카메라
          </button>
        )}
        {acceptedInputTypes.includes("audio") && (
          <button
            type="button"
            onClick={() => handleTabChange("audio")}
            style={{ padding: "6px 10px", fontSize: "12px", fontWeight: 600, border: "none", borderRadius: "4px", cursor: "pointer", backgroundColor: activeTab === "audio" ? "#111111" : "transparent", color: activeTab === "audio" ? "#ffffff" : "#4b5563" }}
          >
            🎙️ 음성 녹음
          </button>
        )}
      </div>

      {/* 탭 본문 영역 */}
      <div>
        {activeTab === "text" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <textarea
              value={textVal}
              onChange={handleTextChange}
              placeholder="워크플로우 처리에 필요한 추가 설명이나 텍스트 정보를 입력해 주세요."
              disabled={submitting}
              style={{ minHeight: "80px", borderRadius: "6px", border: "1px solid #e5e7eb", padding: "8px 10px", fontSize: "13px", color: "#111111", outline: "none", resize: "vertical", boxSizing: "border-box", width: "100%" }}
            />
          </div>
        )}

        {activeTab === "file" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <input
              type="file"
              ref={fileInputRef}
              accept={
                allowedFileTypes && allowedFileTypes.length > 0
                  ? allowedFileTypes.map((ext) => (ext.startsWith(".") ? ext : `.${ext}`)).join(",") + ",audio/*"
                  : undefined
              }
              onChange={(e) => handleFileChange(e, "file")}
              disabled={submitting}
              style={{ fontSize: "13px", width: "100%" }}
            />
          </div>
        )}

        {activeTab === "image" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={submitting}
                style={{ flex: 1, height: "36px", fontSize: "13px", fontWeight: 600, border: "1px solid #d1d5db", borderRadius: "6px", backgroundColor: "#ffffff", color: "#374151", cursor: "pointer" }}
              >
                🖼️ 이미지 선택
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={submitting}
                style={{ flex: 1, height: "36px", fontSize: "13px", fontWeight: 600, border: "1px solid #d1d5db", borderRadius: "6px", backgroundColor: "#ffffff", color: "#374151", cursor: "pointer" }}
              >
                📸 카메라 촬영
              </button>
            </div>
            {/* 실제 숨겨진 인풋 */}
            <input
              type="file"
              ref={imageInputRef}
              accept="image/*"
              onChange={(e) => handleFileChange(e, "image")}
              style={{ display: "none" }}
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={(e) => handleFileChange(e, "image")}
              style={{ display: "none" }}
            />
          </div>
        )}

        {activeTab === "audio" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {!isRecordingSupported ? (
              <p style={{ fontSize: "12px", color: "#ef4444", margin: 0 }}>
                ⚠️ 이 브라우저에서는 녹음 기능을 지원하지 않습니다.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={() => {
                        playAppSound("click");
                        startRecording();
                      }}
                      disabled={submitting}
                      style={{ height: "36px", padding: "0 12px", fontSize: "13px", fontWeight: 600, border: "none", borderRadius: "6px", backgroundColor: "#ef4444", color: "#ffffff", cursor: "pointer" }}
                    >
                      🎙️ 녹음 시작
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        // 녹음 정지 시에는 click 효과음 대신 success 효과음이 stopRecording 내부에서 재생됨 (소리가 겹치거나 마이크에 들어가지 않도록 정밀 대응)
                        stopRecording();
                      }}
                      style={{ height: "36px", padding: "0 12px", fontSize: "13px", fontWeight: 600, border: "none", borderRadius: "6px", backgroundColor: "#111111", color: "#ffffff", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ef4444", animation: "pulse 1.5s infinite" }}></span>
                      정지 ({formatTime(recordingTime)})
                    </button>
                  )}
                </div>

                {audioError && (
                  <p style={{ fontSize: "12px", color: "#ef4444", margin: 0 }}>{audioError}</p>
                )}

                {audioUrl && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                    <span style={{ fontSize: "11px", color: "#4b5563", fontWeight: 600 }}>녹음 파일 미리듣기:</span>
                    <audio src={audioUrl} controls style={{ width: "100%", height: "36px" }} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 선택된 파일 요약 리스트 */}
      {selectedFile && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#111111", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
              📎 {selectedFile.name}
            </span>
            <span style={{ fontSize: "10px", color: "#6b7280" }}>
              {(selectedFile.size / 1024).toFixed(1)} KB | {selectedFile.type || "unknown mime"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemoveFile}
            disabled={submitting}
            style={{ background: "none", border: "none", color: "#ef4444", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
          >
            삭제
          </button>
        </div>
      )}

      {/* 가이드 메시지 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", borderTop: "1px solid #f3f4f6", paddingTop: "6px" }}>
        <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0, lineHeight: 1.4 }}>
          ⚠️ 업로드 제한: 단일 파일 최대 **{maxLimitMB}MB** 이하만 전송 가능합니다.
        </p>
        {allowedFileTypes && allowedFileTypes.length > 0 && (
          <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0, lineHeight: 1.4 }}>
            허용 확장자: {allowedFileTypes.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
