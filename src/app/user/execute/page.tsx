// 이 파일은 사용자가 소속 회사에서 활성화한 N8N 워크플로우를 선택하고 실행 요청 값(제목, 내용 등)을 입력하여
// /api/automation/execute API를 통해 서버리스 게이트웨이로 실행을 요청하는 화면입니다.
// 보안 규정: submissions를 프론트에서 직접 생성하는 구조는 사용하지 않습니다.

"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { getActiveAutomations, getUserAutomationSettings } from "@/features/user/userService";
import { doc, getDoc } from "firebase/firestore";
import type { ClientAutomation, WorkflowTemplate, UserAutomationSettings } from "@/types/n8lient";
import { siteConfig } from "@/config/siteConfig";
import UserPersonalSettingsModal from "@/components/custom/UserPersonalSettingsModal";
import WorkflowConfigBadge from "@/components/custom/WorkflowConfigBadge";

export default function UserExecute() {
  const { user, userDoc } = useAuthUser();
  const [automations, setAutomations] = useState<ClientAutomation[]>([]);
  const [templates, setTemplates] = useState<Record<string, WorkflowTemplate>>({});
  const [selectedAutoId, setSelectedAutoId] = useState("");
  const [userSettings, setUserSettings] = useState<UserAutomationSettings | null>(null);

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [mockFileName, setMockFileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const loadData = async () => {
    if (!userDoc?.clientId) return;
    try {
      setLoading(true);
      setError(null);

      const activeAutos = await getActiveAutomations(db, userDoc.clientId);
      setAutomations(activeAutos);

      if (activeAutos.length > 0) {
        setSelectedAutoId(activeAutos[0].automationId);
      }

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
      setError(err.message || "N8N 워크플로우 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const loadUserSettings = async (autoId: string) => {
    if (!user?.uid || !autoId) {
      setUserSettings(null);
      return;
    }
    try {
      const settingsData = await getUserAutomationSettings(db, user.uid, autoId);
      setUserSettings(settingsData);
    } catch (err) {
      console.error("개인 설정 조회 실패:", err);
      setUserSettings(null);
    }
  };

  useEffect(() => {
    if (userDoc?.clientId) {
      loadData();
    }
  }, [userDoc]);

  useEffect(() => {
    if (selectedAutoId) {
      loadUserSettings(selectedAutoId);
    } else {
      setUserSettings(null);
    }
  }, [selectedAutoId, user]);

  const currentAuto = automations.find((a) => a.automationId === selectedAutoId);
  const currentTemplate = currentAuto ? templates[currentAuto.workflowKey] : null;

  const handleOpenSettingsModal = () => {
    if (!selectedAutoId) {
      alert("N8N 워크플로우를 먼저 선택해 주십시오.");
      return;
    }
    setShowModal(true);
  };

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

      const idToken = await user.getIdToken();
      const fileUrl = mockFileName
        ? `https://storage.n8lient.app/mock-uploads/${mockFileName}`
        : undefined;

      const res = await fetch("/api/automation/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
          `N8N 워크플로우 실행 요청이 성공적으로 전송되었습니다.\n요청 ID: ${data.submissionId}\n\n결과는 [N8N 워크플로우 실행 로그] 탭에서 확인하실 수 있습니다.`
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
        🚀 N8N 워크플로우 실행 요청
      </h2>

      {error && (
        <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "6px", fontSize: "13px", marginBottom: "16px" }}>
          ⚠️ {error}
          <button
            onClick={() => setError(null)}
            style={{ float: "right", background: "none", border: "none", color: "#b91c1c", cursor: "pointer", fontWeight: 600 }}
          >
            닫기
          </button>
        </div>
      )}

      {success && (
        <div style={{ backgroundColor: "#d1fae5", color: "#065f46", border: "1px solid #a7f3d0", borderRadius: "6px", padding: "10px 12px", fontSize: "13px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
        <div style={{ padding: "32px", border: "1px dashed #e5e7eb", borderRadius: "8px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
          사용 가능한 N8N 워크플로우가 없습니다. 사내 관리자에게 문의해 주십시오.
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>N8N 워크플로우 선택</label>
              {currentAuto && (
                <WorkflowConfigBadge
                  automation={currentAuto}
                  template={currentTemplate}
                  userSettings={userSettings}
                />
              )}
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <select
                value={selectedAutoId}
                onChange={(e) => {
                  setSelectedAutoId(e.target.value);
                  setSuccess(false);
                  setError(null);
                }}
                style={{ flex: 1, height: "38px", borderRadius: "6px", border: "1px solid #e5e7eb", padding: "0 8px", fontSize: "14px", backgroundColor: "#ffffff", color: "#111111", outline: "none" }}
              >
                {automations.map((a) => (
                  <option key={a.automationId} value={a.automationId}>
                    {a.automationName} ({a.workflowKey})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleOpenSettingsModal}
                disabled={!selectedAutoId}
                style={{
                  height: "38px",
                  padding: "0 12px",
                  fontSize: "13px",
                  fontWeight: 600,
                  backgroundColor: selectedAutoId ? "#ffffff" : "#f3f4f6",
                  color: selectedAutoId ? "#374151" : "#9ca3af",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  cursor: selectedAutoId ? "pointer" : "not-allowed",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                  transition: "all 0.15s ease",
                }}
              >
                🛠️ 내 설정
              </button>
            </div>
            <p style={{ fontSize: "11px", color: "#6b7280", margin: "4px 0 0 0", lineHeight: 1.4 }}>
              💡 개인 설정을 저장하면 회사 기본값보다 우선 적용됩니다. 비워둔 값은 회사 기본값을 사용합니다.
            </p>
          </div>

          {currentTemplate?.description && (
            <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 4px 0", lineHeight: 1.4 }}>
              💡 {currentTemplate.description}
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>실행 제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 5월 카드 지출 내역 정리 요청"
              required
              style={{ height: "38px", borderRadius: "6px", border: "1px solid #e5e7eb", padding: "8px 10px", fontSize: "14px", color: "#111111", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>입력 내용 (선택)</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="워크플로우 처리에 필요한 추가 설명이나 텍스트 정보를 기입해 주십시오."
              style={{ minHeight: "80px", borderRadius: "6px", border: "1px solid #e5e7eb", padding: "8px 10px", fontSize: "14px", color: "#111111", outline: "none", resize: "vertical", boxSizing: "border-box" }}
            />
          </div>

          {currentTemplate?.inputSchema?.acceptedInputTypes.includes("file") && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>첨부 파일 이름 (선택 - MVP Beta 모방)</label>
              <input
                type="text"
                value={mockFileName}
                onChange={(e) => setMockFileName(e.target.value)}
                placeholder="예: receipt_202605.pdf"
                style={{ height: "38px", borderRadius: "6px", border: "1px solid #e5e7eb", padding: "8px 10px", fontSize: "14px", color: "#111111", outline: "none", boxSizing: "border-box" }}
              />
              {currentTemplate?.inputSchema?.allowedFileTypes && (
                <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>
                  허용 확장자 스펙: {currentTemplate.inputSchema.allowedFileTypes.join(", ")} (최대 {currentTemplate.inputSchema.maxFileSizeMB}MB)
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{ height: "38px", backgroundColor: submitting ? "#4b5563" : "#111111", color: "#ffffff", borderRadius: "6px", fontSize: "13px", fontWeight: 600, border: "none", cursor: submitting ? "not-allowed" : "pointer", marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", transition: "background-color 0.15s ease" }}
          >
            {submitting ? "실행 요청 처리 중..." : "🚀 N8N 워크플로우 실행 요청 제출"}
          </button>
        </form>
      )}

      {showModal && currentAuto && currentTemplate && user && userDoc?.clientId && (
        <UserPersonalSettingsModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            if (selectedAutoId) loadUserSettings(selectedAutoId);
          }}
          db={db}
          uid={user.uid}
          clientId={userDoc.clientId}
          currentAuto={currentAuto}
          currentTemplate={currentTemplate}
        />
      )}
    </div>
  );
}

