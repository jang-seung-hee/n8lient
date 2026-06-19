// Google Drive folderId 또는 폴더 링크 입력 필드 (blur 시 ID 추출)

"use client";

import { useState, type CSSProperties } from "react";
import {
  normalizeGoogleDriveFolderIdInput,
  GOOGLE_DRIVE_FOLDER_ID_EXTRACTED_HINT,
} from "@/common/googleDrive/extractGoogleDriveFolderId";

interface GoogleDriveFolderIdInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** true면 빈 값 허용 (개인 설정 등) */
  allowEmpty?: boolean;
  style?: CSSProperties;
}

export function GoogleDriveFolderIdInput({
  value,
  onChange,
  placeholder,
  required,
  disabled,
  allowEmpty = false,
  style,
}: GoogleDriveFolderIdInputProps) {
  const [hint, setHint] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleBlur = () => {
    setHint(null);
    setFieldError(null);

    const result = normalizeGoogleDriveFolderIdInput(value, { allowEmpty });
    if (!result.ok) {
      if (value.trim()) {
        setFieldError(result.error);
      }
      return;
    }

    if (result.isEmpty) {
      if (value !== "") {
        onChange("");
      }
      return;
    }

    if (value !== result.folderId) {
      onChange(result.folderId);
    }

    if (result.extractedFromUrl) {
      setHint(GOOGLE_DRIVE_FOLDER_ID_EXTRACTED_HINT);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
      <input
        type="text"
        className="ux_input_compact"
        value={value}
        onChange={(e) => {
          setHint(null);
          setFieldError(null);
          onChange(e.target.value);
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        style={{
          ...(fieldError ? { borderColor: "#fca5a5" } : {}),
          ...style,
        }}
      />
      {hint && (
        <span style={{ fontSize: "11px", color: "#059669" }}>✓ {hint}</span>
      )}
      {fieldError && (
        <span style={{ fontSize: "11px", color: "#dc2626" }}>⚠️ {fieldError}</span>
      )}
    </div>
  );
}
