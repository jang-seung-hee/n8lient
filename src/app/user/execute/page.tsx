// 이 파일은 사용자가 소속 회사에서 활성화한 자동화를 선택하고 실행 요청 값(제목, 내용 등)을 입력하여
// /api/automation/execute API를 통해 서버리스 게이트웨이로 실행을 요청하는 화면입니다.
// 보안 규정: submissions를 프론트에서 직접 생성하는 구조는 사용하지 않습니다.

"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { getActiveAutomations } from "@/features/user/userService";
import { doc, getDoc } from "firebase/firestore";
import type { ClientAutomation, WorkflowTemplate } from "@/types/n8lient";
import { siteConfig } from "@/config/siteConfig";

export default function UserExecute() {
  const { user, userDoc } = useAuthUser();
  const [automations, setAutomations] = useState<ClientAutomation[]>([]);
  const [templates, setTemplates] = useState<Record<string, WorkflowTemplate>>({});
  const [selectedAutoId, setSelectedAutoId] = useState("");

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [mockFileName, setMockFileName] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!userDoc?.clientId) return;
    try {
      setLoading(true);
      setError(null);

      // 1. 활성화 및 설정이 완료된 자동화 목록 가져오기
      const activeAutos = await getActiveAutomations(db, userDoc.clientId);
      setAutomations(activeAutos);

      if (activeAutos.length > 0) {
        setSelectedAutoId(activeAutos[0].automationId);
      }

      // 2. 해당 자동화들의 템플릿(명세서) 데이터 로드 (inputSchema 파악용)
      const tempMap: Record<string, WorkflowTemplate> = {};
      for (const auto of activeAutos) {
        if (!tempMap[auto.workflowKey]) {
          const tempRef = doc(db, "workflowTemplates", auto.workflowKey);
          const tempSnap = await getDoc(tempRef);
          if (tempSnap.exists()) {
            tempMap[auto.workflowKey] = tempSnap.data() as WorkflowTemplate;
          }
        }
      }
      setTemplates(tempMap);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "자동화 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userDoc?.clientId) {
      loadData();
    }
  }, [userDoc]);

  // 선택된 자동화 객체 및 템플릿 객체
  const currentAuto = automations.find((a) => a.automationId === selectedAutoId);
  const currentTemplate = currentAuto ? templates[currentAuto.workflowKey] : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userDoc?.clientId || !currentAuto) return;

    if (!title.trim()) {
      alert("실행 제목을 입력해 주십시오.");
      return;
    }

    try {
      setSubmitting(true);
      setSuccess(false);
      setError(null);

      // Firebase ID Token 획득 (서버 측 인증에 사용)
      const idToken = await user.getIdToken();

      // 파일 업로드는 이번 스프린트 제외 사항이므로 Mock 파일명만 수집
      const fileUrl = mockFileName
        ? `https://storage.n8lient.app/mock-uploads/${mockFileName}`
        : undefined;

      // /api/automation/execute API 호출 (프론트에서 submissions 직접 생성 금지)
      const res = await fetch("/api/automation/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Firebase ID Token을 Authorization 헤더로 전달
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          automationId: currentAuto.automationId,
          input: {
            title,
            text: text || undefined,
            fileName: mockFileName || undefined,
            fileUrl,
            mimeType: mockFileName ? "application/octet-stream" : undefined,
          },
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        setTitle("");
        setText("");
        setMockFileName("");
        alert(
          `자동화 실행 요청이 성공적으로 전송되었습니다.\n요청 ID: ${data.submissionId}\n\n결과는 [실행 결과] 탭에서 확인하실 수 있습니다.`
        );
      } else {
        setError(data.error || "실행 요청 처리 중 오류가 발생했습니다.");
      }
    } catch (err: any) {
      setError(`네트워크 오류: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && automations.length === 0) {
    return (
      <p style={{ fontSize: "13px", color: "#6b7280", textAlign: "center", padding: "24px" }}>
        {siteConfig.messages.loading}
      </p>
    );
  }

  return (
    <div style={{ padding: "12px", boxSizing: "border-box", maxWidth: "480px", margin: "0 auto" }}>
      <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#111111", marginBottom: "16px" }}>
        🚀 자동화 실행 요청
      </h2>

      {error && (
        <div
          style={{
            backgroundColor: "#fee2e2",
            color: "#b91c1c",
            padding: "12px",
            borderRadius: "6px",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          ⚠️ {error}
          <button
            onClick={() => setError(null)}
            style={{
              float: "right",
              background: "none",
              border: "none",
              color: "#b91c1c",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            닫기
          </button>
        </div>
      )}

      {success && (
        <div
          style={{
            backgroundColor: "#d1fae5",
            color: "#065f46",
            border: "1px solid #a7f3d0",
            borderRadius: "6px",
            padding: "10px 12px",
            fontSize: "13px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>✅ 실행 요청이 성공적으로 전달되었습니다. (처리 중)</span>
          <button
            onClick={() => setSuccess(false)}
            style={{ background: "none", border: "none", color: "#065f46", fontWeight: 600, cursor: "pointer" }}
          >
            닫기
          </button>
        </div>
      )}

      {automations.length === 0 ? (
        <div
          style={{
            padding: "32px",
            border: "1px dashed #e5e7eb",
            borderRadius: "8px",
            textAlign: "center",
            color: "#6b7280",
            fontSize: "13px",
          }}
        >
          사용 가능한 자동화 기능이 없습니다. 사내 관리자에게 문의해 주십시오.
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* 자동화 인스턴스 선택 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>자동화 종류</label>
            <select
              value={selectedAutoId}
              onChange={(e) => {
                setSelectedAutoId(e.target.value);
                setSuccess(false);
                setError(null);
              }}
              style={{
                height: "38px",
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
                padding: "0 8px",
                fontSize: "14px",
                backgroundColor: "#ffffff",
                color: "#111111",
                outline: "none",
              }}
            >
              {automations.map((a) => (
                <option key={a.automationId} value={a.automationId}>
                  {a.automationName} ({a.workflowKey})
                </option>
              ))}
            </select>
          </div>

          {/* 템플릿 설명 */}
          {currentTemplate?.description && (
            <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 4px 0", lineHeight: 1.4 }}>
              💡 {currentTemplate.description}
            </p>
          )}

          {/* 제목 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>실행 제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 5월 카드 지출 내역 정리 요청"
              required
              style={{
                height: "38px",
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
                padding: "8px 10px",
                fontSize: "14px",
                color: "#111111",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* 내용 / 텍스트 입력 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>입력 내용 (선택)</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="자동화 처리에 필요한 추가 설명이나 텍스트 정보를 기입해 주십시오."
              style={{
                minHeight: "80px",
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
                padding: "8px 10px",
                fontSize: "14px",
                color: "#111111",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* 파일 입력 모방 (Storage 제외사항으로 인해 텍스트 입력으로 모방) */}
          {currentTemplate?.inputSchema?.acceptedInputTypes.includes("file") && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>
                첨부 파일 이름 (선택 - MVP Beta 모방)
              </label>
              <input
                type="text"
                value={mockFileName}
                onChange={(e) => setMockFileName(e.target.value)}
                placeholder="예: receipt_202605.pdf"
                style={{
                  height: "38px",
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb",
                  padding: "8px 10px",
                  fontSize: "14px",
                  color: "#111111",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {currentTemplate?.inputSchema?.allowedFileTypes && (
                <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>
                  허용 확장자 스펙: {currentTemplate.inputSchema.allowedFileTypes.join(", ")} (최대{" "}
                  {currentTemplate.inputSchema.maxFileSizeMB}MB)
                </p>
              )}
            </div>
          )}

          {/* 실행 요청 버튼 */}
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
              marginTop: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background-color 0.15s ease",
            }}
          >
            {submitting ? "실행 요청 처리 중..." : "🚀 자동화 실행 요청 제출"}
          </button>
        </form>
      )}
    </div>
  );
}
