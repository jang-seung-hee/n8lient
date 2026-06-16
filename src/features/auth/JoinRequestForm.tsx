// 이 파일은 회사코드·성명을 입력받아 가입 승인 요청을 제출하는 공통 폼 컴포넌트입니다.

"use client";

import { useState, FormEvent } from "react";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { siteConfig } from "@/config/siteConfig";
import type { JoinRequestSource } from "@/types/n8lient";

interface JoinRequestFormProps {
  /** URL query 등으로 미리 채울 회사코드 */
  initialCompanyCode?: string;
  /** 초대링크 진입 시 회사코드 입력 잠금 */
  companyCodeReadOnly?: boolean;
  source: JoinRequestSource;
  /** 초대링크 안내 문구 표시 여부 */
  showInviteHint?: boolean;
}

export function JoinRequestForm({
  initialCompanyCode = "",
  companyCodeReadOnly = false,
  source,
  showInviteHint = false,
}: JoinRequestFormProps) {
  const { submitCompanyCode } = useAuthUser();
  const [code, setCode] = useState(initialCompanyCode);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedCode = code.trim();
    const trimmedName = displayName.trim();

    if (!trimmedCode) {
      setError(siteConfig.messages.companyCodeEmpty);
      return;
    }
    if (!trimmedName) {
      setError(siteConfig.messages.displayNameEmpty);
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitCompanyCode({
        companyCode: trimmedCode,
        requestedDisplayName: trimmedName,
        source,
      });
      if (!result.success) {
        setError(result.message || siteConfig.messages.companyCodeInvalid);
      }
    } catch (err) {
      console.error("[JoinRequestForm] 제출 오류:", err);
      setError(siteConfig.messages.error);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    height: "38px",
    borderRadius: "6px",
    padding: "8px 10px",
    fontSize: "14px",
    border: "1px solid #e5e7eb",
    backgroundColor: submitting ? "#f3f4f6" : "#ffffff",
    outline: "none",
    color: "#111111",
    width: "100%",
    boxSizing: "border-box" as const,
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "360px",
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "16px",
        boxShadow: "none",
      }}
    >
      <h2
        style={{
          fontSize: "15px",
          fontWeight: 600,
          color: "#111111",
          marginBottom: "12px",
        }}
      >
        회사 등록
      </h2>
      <p
        style={{
          fontSize: "12px",
          color: "#6b7280",
          lineHeight: 1.4,
          marginBottom: "16px",
        }}
      >
        {showInviteHint
          ? "초대 링크로 접속하셨습니다. 성명을 확인·입력한 뒤 승인을 요청해 주십시오."
          : "발급받으신 회사코드와 성명을 입력하고 승인을 요청해 주십시오. 회사코드는 대소문자를 구분하지 않습니다."}
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>회사코드</label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={siteConfig.messages.companyCodePlaceholder}
          disabled={submitting || companyCodeReadOnly}
          readOnly={companyCodeReadOnly}
          style={{
            ...inputStyle,
            backgroundColor: companyCodeReadOnly ? "#f9fafb" : inputStyle.backgroundColor,
            color: companyCodeReadOnly ? "#6b7280" : inputStyle.color,
          }}
        />

        <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151", marginTop: "4px" }}>성명</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={siteConfig.messages.displayNamePlaceholder}
          disabled={submitting}
          style={inputStyle}
        />

        {error && (
          <p
            style={{
              fontSize: "12px",
              color: "#ef4444",
              margin: "2px 0 4px 0",
              lineHeight: 1.35,
            }}
          >
            ⚠️ {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            height: "38px",
            backgroundColor: submitting ? "#4b5563" : "#111111",
            color: "#ffffff",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: 600,
            border: "none",
            cursor: submitting ? "not-allowed" : "pointer",
            width: "100%",
            marginTop: "4px",
            transition: "background-color 0.2s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {submitting ? siteConfig.messages.submitting : siteConfig.messages.submitBtn}
        </button>
      </form>
    </div>
  );
}
