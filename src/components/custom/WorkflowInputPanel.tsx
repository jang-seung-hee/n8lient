"use client";

import React, { useState, useRef, useEffect } from "react";
import { playAppSound, setAppSoundMuted } from "@/lib/appSound";
import { ALLOWED_AUDIO_EXTENSIONS, ALLOWED_IMAGE_EXTENSIONS } from "@/common/validation/validateExecution";
import AudioPermissionNotice from "./AudioPermissionNotice";
import {
  getFileExtension,
  normalizeAllowedExtensions,
  isAllowedByExtension,
  isAllowedByMime,
} from "@/common/validation/fileValidationHelpers";
import {
  getMicrophonePermissionState,
  type MicrophonePermissionState,
} from "@/common/utils/microphone";

interface WorkflowInputPanelProps {
  acceptedInputTypes: Array<"text" | "file" | "image" | "audio">;
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
  const schemaMaxUploadMB = typeof maxFileSizeMB === "number" && Number.isFinite(maxFileSizeMB) && maxFileSizeMB > 0 ? maxFileSizeMB : 20;
  const envMaxUploadMB = process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ? parseInt(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB, 10) : null;
  const maxLimitMB = envMaxUploadMB && Number.isFinite(envMaxUploadMB) && envMaxUploadMB > 0 ? Math.min(schemaMaxUploadMB, envMaxUploadMB) : schemaMaxUploadMB;

  const [textVal, setTextVal] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"text" | "file" | "image" | "audio" | null>(null);

  // 음성 녹음 상태 관련
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isRecordingSupported, setIsRecordingSupported] = useState(true);
  const [micPermissionState, setMicPermissionState] = useState<MicrophonePermissionState>("unknown");
  const [micPermissionUiState, setMicPermissionUiState] = useState<"idle" | "retryable" | "blocked" | "device_error" | "unsupported">("idle");
  // 모바일 compact 카드 상세보기 토글 상태
  const [isAudioDetailOpen, setIsAudioDetailOpen] = useState(false);
  // 모바일 업로드 안내 더보기 토글 상태
  const [isUploadGuideExpanded, setIsUploadGuideExpanded] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeRef = useRef<number>(0);
  // 모바일 compact 카드 내 audio 엘리먼트 ref (재생/일시정지 제어)
  const compactAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isCompactPlaying, setIsCompactPlaying] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasMediaRecorder = typeof MediaRecorder !== "undefined";
      setIsRecordingSupported(hasMediaDevices && hasMediaRecorder);
    }
  }, []);

  useEffect(() => {
    if (acceptedInputTypes.length > 0) {
      if (acceptedInputTypes.includes("text")) setActiveTab("text");
      else if (acceptedInputTypes.includes("file")) setActiveTab("file");
      else if (acceptedInputTypes.includes("image")) setActiveTab("image");
      else if (acceptedInputTypes.includes("audio")) setActiveTab("audio");
    } else {
      setActiveTab(null);
    }
  }, [acceptedInputTypes]);

  const propagateChange = (text: string, file: File | null, type: "text" | "file" | "image" | "audio" | null) => {
    onChange({ text: text.trim() || undefined, file, inputType: type });
  };

  // 현재 탭 및 세팅 기준 허용 확장자 계산
  const allowedExtensions = (() => {
    if (allowedFileTypes && allowedFileTypes.length > 0) {
      return allowedFileTypes.map((ext) => ext.replace(/^\./, "").trim());
    }
    if (activeTab === "audio") return ALLOWED_AUDIO_EXTENSIONS;
    if (activeTab === "image") return ALLOWED_IMAGE_EXTENSIONS;
    return [];
  })();
  const previewExtensions = allowedExtensions.slice(0, 3);
  const hasMoreExtensions = allowedExtensions.length > 3;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setTextVal(val);
    propagateChange(val, selectedFile, activeTab);
  };

  const validateFile = (file: File): boolean => {
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxLimitMB) {
      alert(`파일 크기가 제한 용량(${maxLimitMB}MB)을 초과했습니다. (현재 파일 크기: ${fileSizeMB.toFixed(2)}MB)`);
      return false;
    }
    if (allowedFileTypes && allowedFileTypes.length > 0) {
      const fileExt = getFileExtension(file.name);
      const normalizedExts = normalizeAllowedExtensions(allowedFileTypes);
      if (!isAllowedByExtension(fileExt, normalizedExts) && !isAllowedByMime(file.type, normalizedExts)) {
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
    setRecordedFile(null);
    setFileValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    setAudioUrl(null);
    propagateChange(textVal, null, activeTab);
  };

  const startRecording = async () => {
    if (!isRecordingSupported) return;
    setAudioError(null);
    audioChunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setAudioError("TypeError");
      setMicPermissionState("unsupported");
      return;
    }

    try {
      const permissionState = await getMicrophonePermissionState();
      setMicPermissionState(permissionState);
    } catch (e) {
      console.warn("Permissions API query failed:", e);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermissionState("granted");
      setMicPermissionUiState("idle");

      let mimeType = "audio/webm";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm")) mimeType = "audio/webm";
        else if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";
        else if (MediaRecorder.isTypeSupported("audio/mpeg")) mimeType = "audio/mpeg";
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType.split("/")[1] || "webm";
        const audioFile = new File([audioBlob], `recorded_audio_${Date.now()}.${ext}`, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);

        setAudioUrl(url);
        setRecordedFile(audioFile);

        const fileSizeMB = audioFile.size / (1024 * 1024);
        if (fileSizeMB > maxLimitMB) {
          setFileValidationError(`녹음 파일 크기(${fileSizeMB.toFixed(2)}MB)가 제한 용량(${maxLimitMB}MB)을 초과하여 전송할 수 없습니다.`);
          setSelectedFile(null);
          propagateChange(textVal, null, "audio");
        } else {
          setFileValidationError(null);
          setSelectedFile(audioFile);
          propagateChange(textVal, audioFile, "audio");
        }

        stream.getTracks().forEach((track) => track.stop());
        setAppSoundMuted(false);
        playAppSound("success");
      };

      setAppSoundMuted(true);
      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      recordingTimeRef.current = 0;

      if (onRecordingStateChange) onRecordingStateChange(true, 0);

      timerRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
      }, 1000);
    } catch (err: any) {
      console.error("마이크 사용 권한 획득 실패:", err);
      const errName = err.name || err.toString();
      try {
        setMicPermissionState(await getMicrophonePermissionState());
      } catch (e) {
        console.warn(e);
      }

      if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        setAudioError("NotAllowedError");
        setMicPermissionUiState((prev) => (prev === "idle" ? "retryable" : "blocked"));
      } else if (["NotFoundError", "DevicesNotFoundError", "NotReadableError", "TrackStartError", "SecurityError", "OverconstrainedError"].includes(errName)) {
        setAudioError(errName);
        setMicPermissionUiState("device_error");
      } else {
        setAudioError("UnknownError");
        setMicPermissionUiState("device_error");
      }
    }
  };

  const pauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    if (typeof recorder.pause !== "function") {
      alert("현재 브라우저에서는 녹음 일시정지를 지원하지 않습니다.\n녹음을 종료한 뒤 다시 녹음해 주세요.");
      return;
    }
    recorder.pause();
    setIsPaused(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const resumeRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "paused") return;
    if (typeof recorder.resume !== "function") {
      alert("현재 브라우저에서는 이어 녹음을 지원하지 않습니다.");
      return;
    }
    recorder.resume();
    setIsPaused(false);
    timerRef.current = setInterval(() => {
      recordingTimeRef.current += 1;
      setRecordingTime(recordingTimeRef.current);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (onRecordingStateChange) onRecordingStateChange(false, recordingTimeRef.current);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      setAppSoundMuted(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (innerRef) innerRef.current = { stopRecording };
  }, [innerRef, isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTabChange = (tab: "text" | "file" | "image" | "audio") => {
    setActiveTab(tab);
    setSelectedFile(null);
    setRecordedFile(null);
    setFileValidationError(null);
    setAudioUrl(null);
    setAudioError(null);
    setMicPermissionUiState("idle");
    setIsAudioDetailOpen(false);
    setIsCompactPlaying(false);
    if (isRecording) stopRecording();
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
        {acceptedInputTypes.map((tab) => {
          const emojiMap = { text: "📝 텍스트", file: "📎 일반 파일", image: "📷 이미지", audio: "🎙️ 음성 녹음" };
          return (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              style={{ padding: "6px 10px", fontSize: "12px", fontWeight: 600, border: "none", borderRadius: "4px", cursor: "pointer", backgroundColor: activeTab === tab ? "#111111" : "transparent", color: activeTab === tab ? "#ffffff" : "#4b5563" }}
            >
              {emojiMap[tab]}
            </button>
          );
        })}
      </div>

      {/* 탭 본문 영역 */}
      <div>
        {activeTab === "text" && (
          <textarea
            className="ux_textarea"
            value={textVal}
            onChange={handleTextChange}
            placeholder="워크플로우 처리에 필요한 추가 설명이나 텍스트 정보를 입력해 주세요."
            disabled={submitting}
            style={{ minHeight: "80px", width: "100%", borderRadius: "6px", border: "1px solid #e5e7eb", boxSizing: "border-box" }}
          />
        )}

        {activeTab === "file" && (
          <input
            type="file"
            ref={fileInputRef}
            accept={allowedFileTypes && allowedFileTypes.length > 0 ? allowedFileTypes.map((ext) => (ext.startsWith(".") ? ext : `.${ext}`)).join(",") + ",audio/*" : undefined}
            onChange={(e) => handleFileChange(e, "file")}
            disabled={submitting}
            style={{ fontSize: "13px", width: "100%" }}
          />
        )}

        {activeTab === "image" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" className="ux_button ux_button_secondary" onClick={() => imageInputRef.current?.click()} disabled={submitting} style={{ flex: 1, borderRadius: "6px" }}>🖼️ 이미지 선택</button>
              <button type="button" className="ux_button ux_button_secondary" onClick={() => cameraInputRef.current?.click()} disabled={submitting} style={{ flex: 1, borderRadius: "6px" }}>📸 카메라 촬영</button>
            </div>
            <input type="file" ref={imageInputRef} accept="image/*" onChange={(e) => handleFileChange(e, "image")} style={{ display: "none" }} />
            <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, "image")} style={{ display: "none" }} />
          </div>
        )}

        {activeTab === "audio" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {!isRecordingSupported ? (
              <p style={{ fontSize: "12px", color: "#ef4444", margin: 0 }}>⚠️ 이 브라우저에서는 녹음 기능을 지원하지 않습니다.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {!isRecording ? (
                    <button type="button" className="ux_button ux_button_danger" onClick={() => { playAppSound("click"); startRecording(); }} disabled={submitting} style={{ borderRadius: "6px", border: "none", backgroundColor: "#ef4444" }}>🎙️ 녹음 시작</button>
                  ) : (
                    <div style={{ display: "flex", gap: "6px" }}>
                      {!isPaused ? (
                        <button type="button" className="ux_button ux_button_secondary" onClick={pauseRecording} style={{ borderRadius: "6px", border: "1px solid #d1d5db" }}>⏸️ 일시정지</button>
                      ) : (
                        <button type="button" className="ux_button ux_button_primary" onClick={resumeRecording} style={{ borderRadius: "6px", border: "none" }}>▶️ 이어 녹음</button>
                      )}
                      <button type="button" className="ux_button ux_button_danger" onClick={stopRecording} style={{ borderRadius: "6px", border: "none", backgroundColor: "#ef4444" }}>
                        <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ffffff", marginRight: "4px", animation: !isPaused ? "pulse 1.5s infinite" : "none" }}></span>
                        ⏹️ 녹음 종료 ({formatTime(recordingTime)})
                      </button>
                    </div>
                  )}
                </div>

                {isRecording && (
                  <p style={{ fontSize: "12px", color: isPaused ? "#d97706" : "#059669", margin: "4px 0", fontWeight: 600 }}>
                    {isPaused ? "⏸️ 녹음이 일시정지되었습니다. 이어 녹음을 누르면 계속 녹음됩니다." : "🎙️ 녹음 중입니다. 편하게 말씀해 주세요."}
                  </p>
                )}

                {audioUrl && !isRecording && (
                  <p style={{ fontSize: "12px", color: "#059669", margin: "4px 0", fontWeight: 600 }}>✅ 녹음이 완료되었습니다. </p>
                )}

                <AudioPermissionNotice uiState={micPermissionUiState} errorMessage={audioError} onRetry={startRecording} />

                {/* ── 녹음 완료 후 UI ── */}
                {audioUrl && (
                  <>
                    {/* ── [모바일 전용] compact 카드 — CSS display:none으로 PC에서 숨김 ── */}
                    <div className="ux_audio_compact_card">
                      {/* 요약 행: 상태 + 파일명 + 재생 + 삭제 + 상세보기 */}
                      <div className="ux_audio_compact_summary">
                        <span className="ux_audio_compact_icon">✅</span>
                        <div className="ux_audio_compact_meta">
                          <span className="ux_audio_compact_filename">
                            {recordedFile?.name ?? "녹음 완료"}
                          </span>
                          <span className="ux_audio_compact_info">
                            {recordedFile ? `${(recordedFile.size / 1024).toFixed(1)} KB` : ""}
                            {recordingTimeRef.current > 0 ? ` · ${formatTime(recordingTimeRef.current)}` : ""}
                          </span>
                        </div>
                        <div className="ux_audio_compact_actions">
                          {/* 간단 재생 버튼 */}
                          <button
                            type="button"
                            className="ux_audio_compact_play_btn"
                            aria-label={isCompactPlaying ? "일시정지" : "재생"}
                            onClick={() => {
                              const audio = compactAudioRef.current;
                              if (!audio) return;
                              if (isCompactPlaying) {
                                audio.pause();
                                setIsCompactPlaying(false);
                              } else {
                                audio.play();
                                setIsCompactPlaying(true);
                              }
                            }}
                          >
                            {isCompactPlaying ? "⏸" : "▶"}
                          </button>
                          {/* 숨겨진 audio 엘리먼트 (compact play용) */}
                          <audio
                            ref={compactAudioRef}
                            src={audioUrl}
                            onEnded={() => setIsCompactPlaying(false)}
                            style={{ display: "none" }}
                          />
                          {/* 삭제 버튼 (항상 노출) */}
                          <button
                            type="button"
                            className="ux_audio_compact_delete_btn"
                            onClick={handleRemoveFile}
                            disabled={submitting}
                          >
                            삭제
                          </button>
                          {/* 상세보기 토글 */}
                          <button
                            type="button"
                            className="ux_audio_compact_toggle_btn"
                            onClick={() => setIsAudioDetailOpen((prev) => !prev)}
                          >
                            {isAudioDetailOpen ? "닫기 ▲" : "상세 ▼"}
                          </button>
                        </div>
                      </div>

                      {/* 상세 영역 (토글 열릴 때만 표시) */}
                      {isAudioDetailOpen && (
                        <div className="ux_audio_compact_detail">
                          <span style={{ fontSize: "11px", color: "#4b5563", fontWeight: 600 }}>녹음 파일 미리듣기:</span>
                          <audio src={audioUrl} controls />
                          {fileValidationError && (
                            <div className="ux_audio_error_box">
                              <p style={{ fontWeight: 600 }}>⚠️ 전송 불가 안내</p>
                              <p>{fileValidationError}</p>
                              <p>녹음본은 유실되지 않도록 보관 중입니다. 아래 다운로드 버튼으로 파일을 저장하거나, 더 짧게 다시 녹음해 주세요.</p>
                            </div>
                          )}
                          {recordedFile && (
                            <a href={audioUrl} download={recordedFile.name} className="ux_audio_download_link">
                              📥 녹음 파일 다운로드 ({recordedFile.name})
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ── [PC 전용] 기존 UI — 모바일에서는 CSS로 숨길 수 있으나 compact 카드가 위에서 대체하므로 유지 ── */}
                    {/* PC에서 아래 블록이 표시되고, 모바일에서는 compact 카드가 표시됨 */}
                    {/* PC는 display:none 처리 없이 그대로 노출, 모바일은 compact 카드가 우선 */}
                    <div className="ux_audio_pc_detail">
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                        <span style={{ fontSize: "11px", color: "#4b5563", fontWeight: 600 }}>녹음 파일 미리듣기:</span>
                        <audio src={audioUrl} controls style={{ width: "100%", height: "36px" }} />
                        {fileValidationError && (
                          <div style={{ padding: "8px", backgroundColor: "#fef2f2", border: "1px solid #fee2e2", borderRadius: "6px", fontSize: "12px", color: "#ef4444", marginTop: "6px", lineHeight: 1.4 }}>
                            <p style={{ margin: 0, fontWeight: 600 }}>⚠️ 전송 불가 안내</p>
                            <p style={{ margin: "4px 0 0" }}>{fileValidationError}</p>
                            <p style={{ margin: "4px 0 0" }}>녹음본은 유실되지 않도록 보관 중입니다. 아래 다운로드 버튼으로 파일을 저장하거나, 더 짧게 다시 녹음해 주세요.</p>
                          </div>
                        )}
                        {recordedFile && (
                          <div style={{ marginTop: "6px" }}>
                            <a href={audioUrl} download={recordedFile.name} style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#2563eb", textDecoration: "underline", fontWeight: 600, cursor: "pointer" }}>📥 녹음 파일 다운로드 ({recordedFile.name})</a>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 선택된 파일 요약 리스트 */}
      {/* 모바일 + audio 탭인 체우 노로드에서는 compact 카드가 대체하두로 CSS로 숨김 */}
      {selectedFile && !fileValidationError && (
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px" }}
          className={activeTab === "audio" ? "ux_file_summary_audio_hide_mobile" : undefined}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#111111", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>📎 {selectedFile.name}</span>
            <span style={{ fontSize: "10px", color: "#6b7280" }}>{(selectedFile.size / 1024).toFixed(1)} KB | {selectedFile.type || "unknown mime"}</span>
          </div>
          <button type="button" onClick={handleRemoveFile} disabled={submitting} style={{ background: "none", border: "none", color: "#ef4444", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>삭제</button>
        </div>
      )}

      {/* 가이드 메시지 */}
      {activeTab !== "text" && activeTab !== null && (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", borderTop: "1px solid #f3f4f6", paddingTop: "6px" }}>

          {/* ── PC 전용 텍스트형 안내 (모바일에서는 CSS로 숨김) ── */}
          <div className="ux_upload_guide_text_pc">
            ⚠️ 업로드 제한: 단일 파일 최대 {maxLimitMB}MB 이하만 전송 가능합니다.
            <br />
            허용 확장자: {allowedExtensions.join(", ")}
          </div>

          {/* ── 모바일 전용 태그형 안내 (PC에서는 CSS로 숨김) ── */}
          <div className="ux_upload_limit_tags">
            {/* 용량 제한 강조 태그 */}
            <span className="ux_upload_limit_tag ux_upload_limit_tag_notice">
              최대 {maxLimitMB}MB 이하
            </span>

            {/* 확장자 태그 — 첫 3개 대표 확장자 노출 */}
            {previewExtensions.map((ext) => (
              <span key={ext} className="ux_upload_limit_tag">
                {ext}
              </span>
            ))}
            
            {/* 더보기 버튼 (4개 이상일 때만 표시) */}
            {hasMoreExtensions && (
              <button
                type="button"
                className="ux_upload_limit_more_button"
                onClick={() => setIsUploadGuideExpanded((prev) => !prev)}
              >
                {isUploadGuideExpanded ? "닫기" : "더보기"}
              </button>
            )}
            {/* 더보기 클릭 시 전체 확장자 */}
            {isUploadGuideExpanded && (
              <div className="ux_upload_limit_detail">
                전체 허용: {allowedExtensions.join(", ")}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
