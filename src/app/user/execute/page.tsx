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
import WorkflowInputPanel from "@/components/custom/WorkflowInputPanel";

export default function UserExecute() {
  const { user, userDoc } = useAuthUser();
  const [automations, setAutomations] = useState<ClientAutomation[]>([]);
  const [templates, setTemplates] = useState<Record<string, WorkflowTemplate>>({});
  const [selectedAutoId, setSelectedAutoId] = useState("");
  const [userSettings, setUserSettings] = useState<UserAutomationSettings | null>(null);

  const [title, setTitle] = useState("");
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inputType, setInputType] = useState<"text" | "file" | "image" | "audio" | null>(null);
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

      if (selectedFile) {
        // 1. prepare-upload API 호출로 uploadToken 및 n8n 직접 업로드 대상 경로 획득
        const prepRes = await fetch("/api/automation/prepare-upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            automationId: currentAuto.automationId,
            input: {
              title,
              text: inputText || undefined,
              files: [
                {
                  fileName: selectedFile.name,
                  mimeType: selectedFile.type || "application/octet-stream",
                  sizeBytes: selectedFile.size,
                  inputType: inputType || "file"
                }
              ]
            }
          })
        });

        const prepData = await prepRes.json();
        if (!prepRes.ok || !prepData.success) {
          throw new Error(prepData.error || "업로드 준비(prepare-upload)에 실패했습니다.");
        }

        const { submissionId, uploadToken, n8nUploadUrl, maxUploadBytes } = prepData;

        // 클라이언트단 용량 재검증
        if (selectedFile.size > maxUploadBytes) {
          throw new Error(`파일 크기가 제한 용량(${(maxUploadBytes / (1024 * 1024)).toFixed(0)}MB)을 초과했습니다.`);
        }

        // 2. n8n Webhook URL로 브라우저가 직접 파일 multipart/form-data 업로드 수행
        const formData = new FormData();
        formData.append("submissionId", submissionId);
        formData.append("uploadToken", uploadToken);
        formData.append("file_0", selectedFile);

        const payload = {
          submissionId,
          uploadToken,
          input: {
            title,
            text: inputText || undefined,
            files: [
              {
                fileName: selectedFile.name,
                mimeType: selectedFile.type || "application/octet-stream",
                sizeBytes: selectedFile.size,
                inputType: inputType || "file"
              }
            ]
          }
        };
        formData.append("payload", JSON.stringify(payload));

        let n8nRes;
        try {
          n8nRes = await fetch(n8nUploadUrl, {
            method: "POST",
            body: formData,
            // 중요: 브라우저에 공통 n8n 토큰(X-N8N-TOKEN)을 노출하지 않기 위해 헤더에 인증 정보를 싣지 않습니다.
          });

          if (!n8nRes.ok) {
            const errorText = await n8nRes.text().catch(() => "");
            throw new Error(`n8n 서버 전송 실패 (${n8nRes.status}): ${errorText || "네트워크 오류"}`);
          }
        } catch (n8nErr: any) {
          // n8n 전송 실패 시 백엔드에 알려 submissions 상태를 failed로 갱신 (정체 방지)
          await fetch("/api/automation/upload-failed", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ submissionId }),
          }).catch((err) => console.error("upload-failed API 호출 실패:", err));

          throw n8nErr;
        }

        setSuccess(true);
        setTitle("");
        setInputText("");
        setSelectedFile(null);
        setInputType(null);
        alert(`업로드가 접수되었습니다. 이제 화면을 닫아도 됩니다.\n요청 ID: ${submissionId}\n\n처리 결과는 [N8N 워크플로우 실행 로그] 탭에서 확인하실 수 있습니다.`);
      } else {
        // 파일이 없는 경우 기존 application/json 전송 (execute API)
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
              text: inputText || undefined,
            },
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setSuccess(true);
          setTitle("");
          setInputText("");
          setSelectedFile(null);
          setInputType(null);
          alert(`N8N 워크플로우 실행 요청이 성공적으로 전송되었습니다.\n요청 ID: ${data.submissionId}\n\n결과는 [N8N 워크플로우 실행 로그] 탭에서 확인하실 수 있습니다.`);
        } else {
          setError(data.error || "실행 요청 처리 중 오류가 발생했습니다.");
        }
      }
    } catch (err: any) {
      setError(`오류 발생: ${err.message}`);
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

          {currentTemplate?.inputSchema && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>실행 입력 값</label>
              <WorkflowInputPanel
                acceptedInputTypes={currentTemplate.inputSchema.acceptedInputTypes}
                allowedFileTypes={currentTemplate.inputSchema.allowedFileTypes}
                maxFileSizeMB={currentTemplate.inputSchema.maxFileSizeMB}
                onChange={({ text, file, inputType }) => { setInputText(text || ""); setSelectedFile(file); setInputType(inputType); }}
                submitting={submitting}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{ height: "38px", backgroundColor: submitting ? "#4b5563" : "#111111", color: "#ffffff", borderRadius: "6px", fontSize: "13px", fontWeight: 600, border: "none", cursor: submitting ? "not-allowed" : "pointer", marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", transition: "background-color 0.15s ease" }}
          >
            {submitting ? (selectedFile ? "파일을 업로드 중입니다. 화면을 닫지 마세요..." : "실행 요청 처리 중...") : "🚀 N8N 워크플로우 실행 요청 제출"}
          </button>
        </form>
      )}

      {showModal && currentAuto && currentTemplate && user && userDoc?.clientId && (
        <UserPersonalSettingsModal isOpen={showModal} onClose={() => { setShowModal(false); if (selectedAutoId) loadUserSettings(selectedAutoId); }} db={db} uid={user.uid} clientId={userDoc.clientId} currentAuto={currentAuto} currentTemplate={currentTemplate} />
      )}
    </div>
  );
}

