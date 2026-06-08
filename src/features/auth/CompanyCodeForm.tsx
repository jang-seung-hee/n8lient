// 이 파일은 회사코드(Company Code)를 입력받고 검증을 거쳐 가입 승인 요청을 제출하는 컴포넌트입니다.

"use client";

import { useState, FormEvent } from "react";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { siteConfig } from "@/config/siteConfig";

export function CompanyCodeForm() {
  const { submitCompanyCode } = useAuthUser();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setError(siteConfig.messages.companyCodeEmpty);
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitCompanyCode(trimmedCode);
      if (!result.success) {
        setError(result.message || siteConfig.messages.companyCodeInvalid);
      }
    } catch (err) {
      console.error("[CompanyCodeForm] 제출 오류:", err);
      setError(siteConfig.messages.error);
    } finally {
      setSubmitting(false);
    }
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
        발급받으신 회사코드를 입력하고 승인을 요청해 주십시오. 회사코드는 대소문자를 구분하지 않습니다.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={siteConfig.messages.companyCodePlaceholder}
          disabled={submitting}
          style={{
            height: "38px",
            borderRadius: "6px",
            padding: "8px 10px",
            fontSize: "14px",
            border: "1px solid #e5e7eb",
            backgroundColor: submitting ? "#f3f4f6" : "#ffffff",
            outline: "none",
            color: "#111111",
            width: "100%",
            boxSizing: "border-box",
          }}
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
