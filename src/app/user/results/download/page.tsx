"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { downloadSubmissionFile } from "@/features/user/userService";
import { auth } from "@/lib/firebase";

export default function ResultDownloadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuthUser();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const submissionId = searchParams.get("submissionId");
  const refType = searchParams.get("refType") as "original" | "result" | null;
  const indexStr = searchParams.get("index");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setStatus("error");
      setErrorMessage("로그인이 필요합니다. 결과 화면으로 이동합니다.");
      setTimeout(() => {
        router.push("/user/results");
      }, 2000);
      return;
    }

    if (!submissionId || !refType || !indexStr) {
      setStatus("error");
      setErrorMessage("필수 요청 파라미터가 누락되었습니다.");
      return;
    }

    const index = parseInt(indexStr, 10);
    if (isNaN(index)) {
      setStatus("error");
      setErrorMessage("인덱스 파라미터가 잘못되었습니다.");
      return;
    }

    const triggerDownload = async () => {
      try {
        setStatus("loading");
        
        // 다운로드 시 파일명 fallback 기본값 지정
        const fileName = `downloaded_file_${submissionId}_${refType}_${index}`;
        
        await downloadSubmissionFile(auth, submissionId, refType, index, fileName);
        setStatus("success");

        // 다운로드 성공 후 약간의 딜레이 뒤 자동으로 이전 결과 페이지로 안내 혹은 창 닫기
        setTimeout(() => {
          window.close();
        }, 1500);
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message || "파일 다운로드 중 오류가 발생했습니다.");
      }
    };

    triggerDownload();
  }, [user, authLoading, submissionId, refType, indexStr, router]);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f9fafb",
        fontFamily: "sans-serif",
        padding: "16px",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "24px",
          maxWidth: "400px",
          width: "100%",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111111", margin: "0 0 12px 0" }}>
          📥 N8Lient 파일 안전 다운로드
        </h2>

        {status === "loading" && (
          <div>
            <p style={{ fontSize: "14px", color: "#4b5563", margin: "0 0 16px 0" }}>
              보안 인증 토큰을 확인하고 다운로드를 준비하고 있습니다...
            </p>
            <div style={{ display: "inline-block", width: "24px", height: "24px", border: "3px solid #e5e7eb", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {status === "success" && (
          <div>
            <p style={{ fontSize: "14px", color: "#059669", fontWeight: 600, margin: "0 0 16px 0" }}>
              ✓ 다운로드가 시작되었습니다.
            </p>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
              이 창은 잠시 후 자동으로 닫힙니다.
            </p>
          </div>
        )}

        {status === "error" && (
          <div>
            <p style={{ fontSize: "14px", color: "#dc2626", fontWeight: 600, margin: "0 0 16px 0" }}>
              ⚠️ 다운로드 실패
            </p>
            <p style={{ fontSize: "13px", color: "#4b5563", margin: "0 0 20px 0", lineHeight: 1.4 }}>
              {errorMessage}
            </p>
            <button
              onClick={() => router.push("/user/results")}
              style={{
                height: "36px",
                padding: "0 16px",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              결과 목록으로 돌아가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
