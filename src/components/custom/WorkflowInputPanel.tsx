"use client";

// 워크플로우 실행 화면용 복합 입력 패널 — textarea 상시 + 이미지/음성/파일 단일 첨부
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { playAppSound, setAppSoundMuted } from "@/lib/appSound";
import {
  ALLOWED_AUDIO_EXTENSIONS,
  ALLOWED_IMAGE_EXTENSIONS,
  resolveFileType,
} from "@/common/validation/validateExecution";
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

type InputKind = "text" | "file" | "image" | "audio";

function resolveAudioExtensionFromMimeType(mimeType: string): string {
  const normalized = mimeType.toLowerCase();

  if (normalized.includes("webm")) return "webm";
  if (normalized.includes("mp4")) return "m4a";
  if (normalized.includes("aac")) return "aac";
  if (normalized.includes("mpeg")) return "mp3";
  if (normalized.includes("mp3")) return "mp3";
  if (normalized.includes("wav")) return "wav";
  if (normalized.includes("ogg")) return "ogg";

  return "webm";
}

function resolvePropagateInputType(text: string, file: File | null): InputKind | null {
  if (file) return resolveFileType(file);
  if (text.trim()) return "text";
  return null;
}

interface WorkflowInputPanelProps {
  acceptedInputTypes: Array<InputKind>;
  allowedFileTypes?: string[];
  maxFileSizeMB?: number;
  onChange: (data: {
    text?: string;
    file: File | null;
    inputType: InputKind | null;
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
  const schemaMaxUploadMB =
    typeof maxFileSizeMB === "number" && Number.isFinite(maxFileSizeMB) && maxFileSizeMB > 0
      ? maxFileSizeMB
      : 20;
  const envMaxUploadMB = process.env.NEXT_PUBLIC_MAX_UPLOAD_MB
    ? parseInt(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB, 10)
    : null;
  const maxLimitMB =
    envMaxUploadMB && Number.isFinite(envMaxUploadMB) && envMaxUploadMB > 0
      ? Math.min(schemaMaxUploadMB, envMaxUploadMB)
      : schemaMaxUploadMB;

  const showText = acceptedInputTypes.includes("text");
  const showImage = acceptedInputTypes.includes("image");
  const showAudio = acceptedInputTypes.includes("audio");
  const showFile = acceptedInputTypes.includes("file");
  const showAttachmentSection = showImage || showAudio || showFile;

  const [textVal, setTextVal] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);
  const [swapNotice, setSwapNotice] = useState<string | null>(null);
  const [isDropzoneActive, setIsDropzoneActive] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isRecordingSupported, setIsRecordingSupported] = useState(true);
  const [micPermissionState, setMicPermissionState] = useState<MicrophonePermissionState>("unknown");
  const [micPermissionUiState, setMicPermissionUiState] = useState<
    "idle" | "retryable" | "blocked" | "device_error" | "unsupported"
  >("idle");
  const [isAudioDetailOpen, setIsAudioDetailOpen] = useState(false);
  const [isUploadGuideExpanded, setIsUploadGuideExpanded] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeRef = useRef<number>(0);
  const compactAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isCompactPlaying, setIsCompactPlaying] = useState(false);
  const imagePreviewUrlRef = useRef<string | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const attachmentKind = selectedFile ? resolveFileType(selectedFile) : null;
  const isImageAttached = attachmentKind === "image";
  const isAudioAttached = attachmentKind === "audio";
  const isGenericFileAttached = attachmentKind === "file";

  const allowedExtensions = useMemo(() => {
    if (allowedFileTypes && allowedFileTypes.length > 0) {
      return allowedFileTypes.map((ext) => ext.replace(/^\./, "").trim());
    }
    const exts: string[] = [];
    if (showAudio) exts.push(...ALLOWED_AUDIO_EXTENSIONS);
    if (showImage) exts.push(...ALLOWED_IMAGE_EXTENSIONS);
    return [...new Set(exts)];
  }, [allowedFileTypes, showAudio, showImage]);

  const previewExtensions = allowedExtensions.slice(0, 3);
  const hasMoreExtensions = allowedExtensions.length > 3;

  const propagateChange = useCallback(
    (text: string, file: File | null) => {
      onChange({
        text: text.trim() || undefined,
        file,
        inputType: resolvePropagateInputType(text, file),
      });
    },
    [onChange]
  );

  const revokeImagePreview = useCallback(() => {
    if (imagePreviewUrlRef.current) {
      URL.revokeObjectURL(imagePreviewUrlRef.current);
      imagePreviewUrlRef.current = null;
    }
    setImagePreviewUrl(null);
  }, []);

  const revokeAudioUrl = useCallback(() => {
    if (audioObjectUrlRef.current) {
      URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = null;
    }
    setAudioUrl(null);
  }, []);

  const resetFileInputs = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const clearAudioAttachment = useCallback(() => {
    revokeAudioUrl();
    setRecordedFile(null);
    setFileValidationError(null);
    setIsAudioDetailOpen(false);
    setIsCompactPlaying(false);
    setAudioError(null);
    setMicPermissionUiState("idle");
  }, [revokeAudioUrl]);

  const clearImageAttachment = useCallback(() => {
    revokeImagePreview();
  }, [revokeImagePreview]);

  const handleRemoveAttachment = useCallback(() => {
    setSelectedFile(null);
    clearAudioAttachment();
    clearImageAttachment();
    setFileValidationError(null);
    setSwapNotice(null);
    resetFileInputs();
    propagateChange(textVal, null);
  }, [clearAudioAttachment, clearImageAttachment, propagateChange, textVal]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasMediaRecorder = typeof MediaRecorder !== "undefined";
      setIsRecordingSupported(hasMediaDevices && hasMediaRecorder);
    }
  }, []);

  useEffect(() => {
    if (!selectedFile || resolveFileType(selectedFile) !== "image") {
      revokeImagePreview();
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    imagePreviewUrlRef.current = url;
    setImagePreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      if (imagePreviewUrlRef.current === url) {
        imagePreviewUrlRef.current = null;
      }
    };
  }, [selectedFile, revokeImagePreview]);

  useEffect(() => {
    return () => {
      setAppSoundMuted(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
      if (audioObjectUrlRef.current) URL.revokeObjectURL(audioObjectUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (innerRef) innerRef.current = { stopRecording };
  }, [innerRef, isRecording]);

  const validateFile = (file: File): boolean => {
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxLimitMB) {
      alert(
        `파일 크기가 제한 용량(${maxLimitMB}MB)을 초과했습니다. (현재 파일 크기: ${fileSizeMB.toFixed(2)}MB)`
      );
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

  const applyAttachment = (file: File, notice?: string) => {
    if (!validateFile(file)) return false;

    const nextKind = resolveFileType(file);

    if (nextKind === "image" && (isAudioAttached || audioUrl || recordedFile)) {
      clearAudioAttachment();
      setSwapNotice(notice ?? "기존 음성 녹음이 해제되고 이미지로 교체되었습니다.");
    } else if (nextKind === "audio" && isImageAttached) {
      clearImageAttachment();
      setSwapNotice(notice ?? "기존 이미지 첨부가 해제되고 음성으로 교체되었습니다.");
    } else if (notice) {
      setSwapNotice(notice);
    } else {
      setSwapNotice(null);
    }

    if (nextKind !== "audio") {
      clearAudioAttachment();
    }
    if (nextKind !== "image") {
      clearImageAttachment();
    }

    setFileValidationError(null);
    setSelectedFile(file);
    propagateChange(textVal, file);
    return true;
  };

  const applyImageFile = (file: File) => {
    if (!showImage) return false;
    if (!file.type.startsWith("image/") && resolveFileType(file) !== "image") {
      alert("이미지 파일만 첨부할 수 있습니다.");
      return false;
    }
    return applyAttachment(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const ok = applyAttachment(file);
      if (!ok) e.target.value = "";
    }
  };

  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const ok = applyImageFile(files[0]);
      if (!ok) e.target.value = "";
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setTextVal(val);
    propagateChange(val, selectedFile);
  };

  const extractImageFromDataTransfer = (dataTransfer: DataTransfer): File | null => {
    const fromFiles = Array.from(dataTransfer.files).find(
      (f) => f.type.startsWith("image/") || resolveFileType(f) === "image"
    );
    if (fromFiles) return fromFiles;

    for (const item of Array.from(dataTransfer.items)) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) return file;
      }
    }
    return null;
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!showImage || submitting) return;
    const imageFile = extractImageFromDataTransfer(e.clipboardData);
    if (!imageFile) return;
    e.preventDefault();
    applyImageFile(imageFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!showImage || submitting) return;
    e.preventDefault();
    setIsDropzoneActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropzoneActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!showImage || submitting) return;
    e.preventDefault();
    setIsDropzoneActive(false);
    const imageFile = extractImageFromDataTransfer(e.dataTransfer);
    if (imageFile) applyImageFile(imageFile);
  };

  const startRecording = async () => {
    if (!isRecordingSupported || !showAudio) return;

    if (isImageAttached) {
      clearImageAttachment();
      setSelectedFile(null);
      resetFileInputs();
      propagateChange(textVal, null);
      setSwapNotice("기존 이미지 첨부가 해제되고 음성 녹음으로 교체되었습니다.");
    }

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

      const recordingMimeCandidates = [
        { mimeType: "audio/webm;codecs=opus", ext: "webm" },
        { mimeType: "audio/webm", ext: "webm" },
        { mimeType: "audio/mp4", ext: "m4a" },
        { mimeType: "audio/aac", ext: "aac" },
        { mimeType: "audio/mpeg", ext: "mp3" },
      ];

      const selectedFormat =
        recordingMimeCandidates.find(
          (candidate) =>
            typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(candidate.mimeType)
        ) ?? null;

      let mediaRecorder: MediaRecorder;
      let selectedMimeType = selectedFormat?.mimeType ?? "";
      let selectedExtension = selectedFormat?.ext ?? "webm";

      try {
        mediaRecorder = selectedFormat
          ? new MediaRecorder(stream, { mimeType: selectedFormat.mimeType })
          : new MediaRecorder(stream);

        if (!selectedMimeType && mediaRecorder.mimeType) {
          selectedMimeType = mediaRecorder.mimeType;
          selectedExtension = resolveAudioExtensionFromMimeType(mediaRecorder.mimeType);
        }
      } catch {
        mediaRecorder = new MediaRecorder(stream);
        selectedMimeType = mediaRecorder.mimeType || "audio/webm";
        selectedExtension = resolveAudioExtensionFromMimeType(selectedMimeType);
      }

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: selectedMimeType || "audio/webm" });
        const audioFile = new File(
          [audioBlob],
          `recorded_audio_${Date.now()}.${selectedExtension}`,
          { type: selectedMimeType || "audio/webm" }
        );
        const url = URL.createObjectURL(audioBlob);
        if (audioObjectUrlRef.current) URL.revokeObjectURL(audioObjectUrlRef.current);
        audioObjectUrlRef.current = url;

        setAudioUrl(url);
        setRecordedFile(audioFile);

        const fileSizeMB = audioFile.size / (1024 * 1024);
        if (fileSizeMB > maxLimitMB) {
          setFileValidationError(
            `녹음 파일 크기(${fileSizeMB.toFixed(2)}MB)가 제한 용량(${maxLimitMB}MB)을 초과하여 전송할 수 없습니다.`
          );
          setSelectedFile(null);
          propagateChange(textVal, null);
        } else {
          setFileValidationError(null);
          setSelectedFile(audioFile);
          propagateChange(textVal, audioFile);
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
    } catch (err: unknown) {
      console.error("마이크 사용 권한 획득 실패:", err);
      const errName = err instanceof Error ? err.name : String(err);
      try {
        setMicPermissionState(await getMicrophonePermissionState());
      } catch (e) {
        console.warn(e);
      }

      if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        setAudioError("NotAllowedError");
        setMicPermissionUiState((prev) => (prev === "idle" ? "retryable" : "blocked"));
      } else if (
        [
          "NotFoundError",
          "DevicesNotFoundError",
          "NotReadableError",
          "TrackStartError",
          "SecurityError",
          "OverconstrainedError",
        ].includes(errName)
      ) {
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
      alert(
        "현재 브라우저에서는 녹음 일시정지를 지원하지 않습니다.\n녹음을 종료한 뒤 다시 녹음해 주세요."
      );
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (acceptedInputTypes.length === 0) return null;

  return (
    <div className="ux_execute_composer">
      {showText && (
        <textarea
          className="ux_textarea ux_execute_textarea"
          value={textVal}
          onChange={handleTextChange}
          onPaste={handlePaste}
          placeholder="워크플로우 처리에 필요한 추가 설명이나 텍스트 정보를 입력해 주세요."
          disabled={submitting}
        />
      )}

      {showAttachmentSection && (
        <div
          className={`ux_attachment_section${isDropzoneActive ? " ux_dropzone_active" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onPaste={handlePaste}
        >
          <div className="ux_attachment_top_row">
            <span className="ux_attachment_section_label">첨부 자료</span>
            <div className="ux_attachment_actions">
            {showImage && (
              <>
                <button
                  type="button"
                  className="ux_attach_action_card"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={submitting}
                >
                  <span className="ux_attach_action_icon">🖼️</span>
                  <span className="ux_attach_action_label ux_attach_action_label_long">이미지 추가</span>
                  <span className="ux_attach_action_label ux_attach_action_label_short">이미지</span>
                </button>
                <button
                  type="button"
                  className="ux_attach_action_card ux_attach_action_card_secondary ux_attach_action_camera"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={submitting}
                >
                  <span className="ux_attach_action_icon">📸</span>
                  <span className="ux_attach_action_label ux_attach_action_label_long">카메라 촬영</span>
                  <span className="ux_attach_action_label ux_attach_action_label_short">카메라</span>
                </button>
                <input
                  type="file"
                  ref={imageInputRef}
                  accept="image/*"
                  onChange={handleImageInputChange}
                  style={{ display: "none" }}
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageInputChange}
                  style={{ display: "none" }}
                />
              </>
            )}

            {showAudio && (
              <>
                {!isRecordingSupported ? (
                  <p className="ux_attachment_unsupported">⚠️ 이 브라우저에서는 녹음 기능을 지원하지 않습니다.</p>
                ) : !isRecording ? (
                  <button
                    type="button"
                    className="ux_attach_action_card ux_attach_action_card_danger"
                    onClick={() => {
                      playAppSound("click");
                      startRecording();
                    }}
                    disabled={submitting}
                  >
                    <span className="ux_attach_action_icon">🎙️</span>
                    <span className="ux_attach_action_label ux_attach_action_label_long">음성 녹음</span>
                    <span className="ux_attach_action_label ux_attach_action_label_short">녹음</span>
                  </button>
                ) : (
                  <div className="ux_audio_recording_controls ux_audio_recording_controls_full">
                    {!isPaused ? (
                      <button
                        type="button"
                        className="ux_button ux_button_secondary"
                        onClick={pauseRecording}
                      >
                        ⏸️ 일시정지
                      </button>
                    ) : (
                      <button type="button" className="ux_button ux_button_primary" onClick={resumeRecording}>
                        ▶️ 이어 녹음
                      </button>
                    )}
                    <button type="button" className="ux_button ux_button_danger" onClick={stopRecording}>
                      <span className="ux_recording_dot" />
                      ⏹️ 녹음 종료 ({formatTime(recordingTime)})
                    </button>
                  </div>
                )}
              </>
            )}

            {showFile && (
              <label className="ux_attach_action_card ux_attach_action_card_file">
                <span className="ux_attach_action_icon">📎</span>
                <span className="ux_attach_action_label ux_attach_action_label_long">일반 파일 선택</span>
                <span className="ux_attach_action_label ux_attach_action_label_short">파일</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept={
                    allowedFileTypes && allowedFileTypes.length > 0
                      ? allowedFileTypes
                          .map((ext) => (ext.startsWith(".") ? ext : `.${ext}`))
                          .join(",") + ",audio/*"
                      : undefined
                  }
                  onChange={handleFileChange}
                  disabled={submitting}
                  style={{ display: "none" }}
                />
              </label>
            )}
            </div>
          </div>

          {showImage && (
            <span className="ux_attachment_section_hint ux_attachment_section_hint_pc">
              PC: 이미지를 여기에 끌어다 놓거나 붙여넣을 수 있습니다.
            </span>
          )}

          {swapNotice && (
            <p className="ux_attachment_swap_notice" role="status">
              ℹ️ {swapNotice}
            </p>
          )}

          {isRecording && (
            <p className={`ux_recording_status${isPaused ? " ux_recording_status_paused" : ""}`}>
              {isPaused
                ? "⏸️ 녹음이 일시정지되었습니다. 이어 녹음을 누르면 계속 녹음됩니다."
                : "🎙️ 녹음 중입니다. 편하게 말씀해 주세요."}
            </p>
          )}

          <AudioPermissionNotice
            uiState={micPermissionUiState}
            errorMessage={audioError}
            onRetry={startRecording}
          />
        </div>
      )}

      {isImageAttached && imagePreviewUrl && selectedFile && !fileValidationError && (
        <div className="ux_attach_preview ux_attach_preview_image">
          <img
            src={imagePreviewUrl}
            alt={selectedFile.name}
            className="ux_attach_preview_thumb"
          />
          <div className="ux_attach_preview_meta">
            <span className="ux_attach_preview_name">{selectedFile.name}</span>
            <span className="ux_attach_preview_size">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </span>
          </div>
          <button
            type="button"
            className="ux_attach_remove"
            onClick={handleRemoveAttachment}
            disabled={submitting}
          >
            삭제
          </button>
        </div>
      )}

      {isAudioAttached && audioUrl && !isRecording && (
        <>
          <p className="ux_audio_complete_notice">✅ 녹음이 완료되었습니다.</p>
          <div className="ux_audio_compact_card">
            <div className="ux_audio_compact_summary">
              <span className="ux_audio_compact_icon">✅</span>
              <div className="ux_audio_compact_meta">
                <span className="ux_audio_compact_filename">{recordedFile?.name ?? "녹음 완료"}</span>
                <span className="ux_audio_compact_info">
                  {recordedFile ? `${(recordedFile.size / 1024).toFixed(1)} KB` : ""}
                  {recordingTimeRef.current > 0 ? ` · ${formatTime(recordingTimeRef.current)}` : ""}
                </span>
              </div>
              <div className="ux_audio_compact_actions">
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
                <audio
                  ref={compactAudioRef}
                  src={audioUrl}
                  onEnded={() => setIsCompactPlaying(false)}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  className="ux_audio_compact_delete_btn"
                  onClick={handleRemoveAttachment}
                  disabled={submitting}
                >
                  삭제
                </button>
                <button
                  type="button"
                  className="ux_audio_compact_toggle_btn"
                  onClick={() => setIsAudioDetailOpen((prev) => !prev)}
                >
                  {isAudioDetailOpen ? "닫기 ▲" : "상세 ▼"}
                </button>
              </div>
            </div>

            {isAudioDetailOpen && (
              <div className="ux_audio_compact_detail">
                <span style={{ fontSize: "11px", color: "#4b5563", fontWeight: 600 }}>
                  녹음 파일 미리듣기:
                </span>
                <audio src={audioUrl} controls />
                {fileValidationError && (
                  <div className="ux_audio_error_box">
                    <p style={{ fontWeight: 600 }}>⚠️ 전송 불가 안내</p>
                    <p>{fileValidationError}</p>
                    <p>
                      녹음본은 유실되지 않도록 보관 중입니다. 아래 다운로드 버튼으로 파일을 저장하거나, 더
                      짧게 다시 녹음해 주세요.
                    </p>
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

          <div className="ux_audio_pc_detail">
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
              <span style={{ fontSize: "11px", color: "#4b5563", fontWeight: 600 }}>
                녹음 파일 미리듣기:
              </span>
              <audio src={audioUrl} controls style={{ width: "100%", height: "36px" }} />
              {fileValidationError && (
                <div
                  style={{
                    padding: "8px",
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fee2e2",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "#ef4444",
                    marginTop: "6px",
                    lineHeight: 1.4,
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 600 }}>⚠️ 전송 불가 안내</p>
                  <p style={{ margin: "4px 0 0" }}>{fileValidationError}</p>
                  <p style={{ margin: "4px 0 0" }}>
                    녹음본은 유실되지 않도록 보관 중입니다. 아래 다운로드 버튼으로 파일을 저장하거나, 더
                    짧게 다시 녹음해 주세요.
                  </p>
                </div>
              )}
              {recordedFile && (
                <div style={{ marginTop: "6px" }}>
                  <a
                    href={audioUrl}
                    download={recordedFile.name}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "12px",
                      color: "#2563eb",
                      textDecoration: "underline",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    📥 녹음 파일 다운로드 ({recordedFile.name})
                  </a>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {isGenericFileAttached && selectedFile && !fileValidationError && (
        <div className="ux_attach_preview">
          <div className="ux_attach_preview_meta">
            <span className="ux_attach_preview_name">📎 {selectedFile.name}</span>
            <span className="ux_attach_preview_size">
              {(selectedFile.size / 1024).toFixed(1)} KB | {selectedFile.type || "unknown mime"}
            </span>
          </div>
          <button
            type="button"
            className="ux_attach_remove"
            onClick={handleRemoveAttachment}
            disabled={submitting}
          >
            삭제
          </button>
        </div>
      )}

      {showAttachmentSection && (
        <div className="ux_attachment_upload_guide">
          <div className="ux_upload_guide_text_pc">
            ⚠️ 업로드 제한: 첨부 파일은 1개만 가능하며, 최대 {maxLimitMB}MB 이하만 전송할 수 있습니다.
            {allowedExtensions.length > 0 && (
              <>
                <br />
                허용 확장자: {allowedExtensions.join(", ")}
              </>
            )}
          </div>

          <div className="ux_upload_limit_tags">
            <span className="ux_upload_limit_tag ux_upload_limit_tag_notice">최대 {maxLimitMB}MB · 1개</span>
            {previewExtensions.map((ext) => (
              <span key={ext} className="ux_upload_limit_tag">
                {ext}
              </span>
            ))}
            {hasMoreExtensions && (
              <button
                type="button"
                className="ux_upload_limit_more_button"
                onClick={() => setIsUploadGuideExpanded((prev) => !prev)}
              >
                {isUploadGuideExpanded ? "닫기" : "더보기"}
              </button>
            )}
            {isUploadGuideExpanded && (
              <div className="ux_upload_limit_detail">전체 허용: {allowedExtensions.join(", ")}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
