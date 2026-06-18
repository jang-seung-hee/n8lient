// 이 파일은 사용자가 소속 회사에서 활성화한 N8N 워크플로우를 선택하고 실행 요청 값(제목, 내용 등)을 입력하여
// /api/automation/execute API를 통해 서버리스 게이트웨이로 실행을 요청하는 화면입니다.
// 보안 규정: submissions를 프론트에서 직접 생성하는 구조는 사용하지 않습니다.

"use client";
import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { getActiveAutomations, getUserAutomationSettings } from "@/features/user/userService";
import { doc, getDoc } from "firebase/firestore";
import type { ClientAutomation, WorkflowTemplate, UserAutomationSettings } from "@/types/n8lient";
import { siteConfig } from "@/config/siteConfig";
import UserPersonalSettingsModal from "@/components/custom/UserPersonalSettingsModal";
import WorkflowConfigBadge from "@/components/custom/WorkflowConfigBadge";
import WorkflowInputPanel from "@/components/custom/WorkflowInputPanel";
import AutomationNoticeBox from "@/components/core/automation/AutomationNoticeBox";
import { playAppSound, setAppSoundMuted } from "@/lib/appSound";
import { useSearchParams } from "next/navigation";
import { validateExecution } from "@/common/validation/validateExecution";
import { buildExecutionTitleContract } from "@/common/execution/buildTitleContract";
import { mergeAutomationSettings } from "@/common/settings/mergeAutomationSettings";

export default function UserExecute() {
  const searchParams = useSearchParams();
  const isDebugMode = searchParams.get("debug") === "1";
  const requestedAutoId = searchParams.get("automationId");
  const { user, userDoc, loading: authLoading } = useAuthUser();
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
  const [validationDebug, setValidationDebug] = useState<any>(null);
  
  // 녹음 오작동 방지용 상태 및 ref
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const inputPanelRef = useRef<{ stopRecording: () => void } | null>(null);

  // alert 지연 호출용 타이머 ID 보존 목록
  const timeoutIdsRef = useRef<number[]>([]);

  // 컴포넌트 unmount 시 Mute 해제 및 pending alert 타이머 전체 취소
  useEffect(() => {
    return () => {
      setAppSoundMuted(false);
      timeoutIdsRef.current.forEach((id) => clearTimeout(id));
    };
  }, []);

  const addDelayedAlert = (message: string, delay = 150) => {
    const id = setTimeout(() => {
      alert(message);
    }, delay) as any;
    timeoutIdsRef.current.push(id);
  };

  const loadData = async () => {
    if (!userDoc?.clientId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const activeAutos = await getActiveAutomations(db, userDoc.clientId);
      setAutomations(activeAutos);

      if (activeAutos.length > 0) {
        const matchedAutoId =
          requestedAutoId && activeAutos.some((a) => a.automationId === requestedAutoId)
            ? requestedAutoId
            : activeAutos[0].automationId;
        setSelectedAutoId(matchedAutoId);
      } else {
        setSelectedAutoId("");
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
    if (authLoading) return;
    
    if (!user || !userDoc) {
      setLoading(false);
      return;
    }

    if (userDoc.clientId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [userDoc, user, authLoading, requestedAutoId]);

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
    playAppSound("click");
    if (!selectedAutoId) {
      playAppSound("notify");
      addDelayedAlert("N8N 워크플로우를 먼저 선택해 주십시오.");
      return;
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userDoc?.clientId || !currentAuto) return;

    // 녹음 중 제출 버튼 클릭 시, 제출하지 않고 녹음 정지만 수행
    if (isRecording) {
      if (inputPanelRef.current) {
        inputPanelRef.current.stopRecording();
      }
      return;
    }

    playAppSound("click");

    const titleContract = buildExecutionTitleContract({
      inputTitle: title,
      workflowName: currentTemplate?.name || currentAuto.workflowKey,
    });

    const resolvedInputType = inputType || "text";
    const currentSettings = mergeAutomationSettings(
      currentAuto.settings || {},
      userSettings?.settings
    );

    const validationResult = validateExecution({
      automationId: currentAuto.automationId,
      input: {
        title: titleContract.title,
        text: inputText || undefined,
        inputType: resolvedInputType
      },
      files: selectedFile ? [{
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type
      }] : [],
      inputSchema: currentTemplate?.inputSchema || {},
      configSchema: currentTemplate?.configSchema || [],
      settings: currentSettings
    });

    console.warn("[N8Lient execute validation]", {
      isValid: validationResult.isValid,
      missingFields: validationResult.missingFields,
      issues: validationResult.issues,
      received: validationResult.received,
      settingsKeysUsed: Object.keys(currentSettings),
    });
    setValidationDebug(validationResult);

    if (!validationResult.isValid) {
      playAppSound("notify");
      setError("실행에 필요한 입력값이 부족합니다. 입력 항목을 확인해 주세요.");
      return;
    }

    try {
      setSubmitting(true);
      setSuccess(false);
      setError(null);

      const idToken = await user.getIdToken();
      const gatewayBaseUrl = process.env.NEXT_PUBLIC_GATEWAY_BASE_URL || "";
      const gatewayUrl = `${gatewayBaseUrl.replace(/\/$/, "")}/api/automation/execute`;

      const formData = new FormData();
      const payload = {
        automationId: currentAuto.automationId,
        input: {
          title: titleContract.title,
          titleProvided: titleContract.titleProvided,
          titleSource: titleContract.titleSource,
          text: inputText || undefined,
          inputType: resolvedInputType
        }
      };
      
      formData.append("payload", JSON.stringify(payload));
      
      if (selectedFile) {
        formData.append("file_0", selectedFile);
      }

      const res = await fetch(gatewayUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        setTitle("");
        setInputText("");
        setSelectedFile(null);
        setInputType(null);
        setValidationDebug(null);
        playAppSound("success");
        addDelayedAlert(`실행 요청이 성공적으로 전달되었습니다.\n요청 ID: ${data.submissionId}\n\n처리 결과는 [N8N 워크플로우 실행 로그] 탭에서 확인하실 수 있습니다.`);
      } else {
        playAppSound("error");
        if (data.missingFields || data.source) {
          setValidationDebug({
            code: data.code,
            source: data.source,
            missingFields: data.missingFields,
            received: data.received,
            requestId: data.requestId
          });
        }
        setError(data.error || "실행 요청 처리 중 오류가 발생했습니다.");
      }
    } catch (err: any) {
      playAppSound("error");
      console.error("[N8Lient] N8N 실행 요청 처리 실패 상세 오류 로그:", err);
      setError(`오류 발생: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <p style={{ fontSize: "13px", color: "#6b7280", textAlign: "center", padding: "24px" }}>
        {siteConfig.messages.loading}
      </p>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: "32px 16px", textAlign: "center", color: "#4b5563", fontSize: "14px" }}>
        🔒 자동화 실행을 위해 로그인이 필요합니다.
      </div>
    );
  }

  if (!userDoc) {
    return (
      <div style={{ padding: "32px 16px", textAlign: "center", color: "#dc2626", fontSize: "14px" }}>
        ⚠️ 사용자 프로필 정보를 찾을 수 없습니다. 관리자에게 문의하세요.
      </div>
    );
  }

  if (userDoc.approvalStatus !== "approved") {
    return (
      <div style={{ padding: "32px 16px", textAlign: "center", color: "#d97706", fontSize: "14px" }}>
        ⏳ 계정 승인 대기 상태입니다. 관리자의 승인 완료 후 실행 가능합니다.
      </div>
    );
  }

  if (!userDoc.clientId) {
    return (
      <div style={{ padding: "32px 16px", textAlign: "center", color: "#4b5563", fontSize: "14px" }}>
        🏢 소속 회사 가입 승인 정보가 등록되어 있지 않습니다.
      </div>
    );
  }

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

          {currentAuto?.noticeText?.trim() && (
            <AutomationNoticeBox noticeText={currentAuto.noticeText} />
          )}

          {currentTemplate?.description && (
            <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 4px 0", lineHeight: 1.4 }}>
              💡 {currentTemplate.description}
            </p>
          )}

          {(() => {
            const isTitleRequired = currentTemplate?.inputSchema?.titleRequired !== false;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>
                  실행 제목{isTitleRequired ? " *" : ""}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isTitleRequired ? "예: 5월 카드 지출 내역 정리 요청" : "입력하지 않으면 자동 생성됩니다."}
                  required={isTitleRequired}
                  style={{ height: "38px", borderRadius: "6px", border: "1px solid #e5e7eb", padding: "8px 10px", fontSize: "14px", color: "#111111", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            );
          })()}

          {currentTemplate?.inputSchema && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>실행 입력 값</label>
              <WorkflowInputPanel
                acceptedInputTypes={currentTemplate.inputSchema.acceptedInputTypes}
                allowedFileTypes={currentTemplate.inputSchema.allowedFileTypes}
                maxFileSizeMB={currentTemplate.inputSchema.maxFileSizeMB}
                onChange={({ text, file, inputType }) => { setInputText(text || ""); setSelectedFile(file); setInputType(inputType); }}
                submitting={submitting}
                innerRef={inputPanelRef}
                onRecordingStateChange={(rec, sec) => {
                  setIsRecording(rec);
                  setRecordingTime(sec);
                }}
              />
            </div>
          )}

          {isRecording ? (
            <button
              type="submit"
              style={{
                height: "38px",
                backgroundColor: "#ef4444",
                color: "#ffffff",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                marginTop: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background-color 0.15s ease",
                gap: "6px"
              }}
            >
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ffffff", animation: "pulse 1.5s infinite" }}></span>
              🛑 녹음 정지 ({(() => {
                const mins = Math.floor(recordingTime / 60);
                const secs = recordingTime % 60;
                return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
              })()})
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              style={{ height: "38px", backgroundColor: submitting ? "#4b5563" : "#111111", color: "#ffffff", borderRadius: "6px", fontSize: "13px", fontWeight: 600, border: "none", cursor: submitting ? "not-allowed" : "pointer", marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", transition: "background-color 0.15s ease" }}
            >
              {submitting ? (selectedFile ? "파일을 업로드 중입니다. 화면을 닫지 마세요..." : "실행 요청 처리 중...") : "🚀 N8N 워크플로우 실행 요청 제출"}
            </button>
          )}
        </form>
      )}

      {isDebugMode && validationDebug && (
        <div style={{ marginTop: "16px", backgroundColor: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "10px", fontSize: "12px", color: "#374151" }}>
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 600, outline: "none" }}>🔍 개발자 디버그 정보 (클릭하여 열기)</summary>
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px", fontFamily: "monospace" }}>
              <div>누락 필드: {validationDebug.missingFields?.join(", ") || "(없음)"}</div>
              {validationDebug.issues?.length > 0 && (
                <div style={{ marginTop: "4px" }}>
                  <div style={{ fontWeight: 600, marginBottom: "2px" }}>검증 이슈:</div>
                  {validationDebug.issues.map((issue: { field: string; code: string; message: string }, idx: number) => (
                    <div key={idx} style={{ marginLeft: "8px" }}>
                      [{issue.code}] {issue.field}: {issue.message}
                    </div>
                  ))}
                </div>
              )}
              {validationDebug.received ? (
                <>
                  <div>자동화 ID 존재 여부: {String(validationDebug.received.hasAutomationId ?? "")}</div>
                  <div>제목 존재 여부: {String(validationDebug.received.hasTitle ?? "")}</div>
                  <div>본문 존재 여부: {String(validationDebug.received.hasText ?? "")}</div>
                  <div>첨부 파일 개수: {validationDebug.received.fileCount ?? 0}</div>
                  <div>인식된 입력 타입: {validationDebug.received.providedInputTypes?.join(", ") || "없음"}</div>
                </>
              ) : (
                <>
                  <div>자동화 ID 존재 여부: {String(validationDebug.hasAutomationId ?? "")}</div>
                  <div>제목 존재 여부: {String(validationDebug.hasTitle ?? "")}</div>
                  <div>입력 유형: {validationDebug.inputType || ""}</div>
                  <div>파일 첨부 여부: {validationDebug.hasFile ? "있음" : "없음"}</div>
                </>
              )}
              {validationDebug.source && <div>요청 단계: {validationDebug.source}</div>}
              {validationDebug.requestId && <div>요청 ID: {validationDebug.requestId}</div>}
            </div>
          </details>
        </div>
      )}

      {showModal && currentAuto && currentTemplate && user && userDoc?.clientId && (
        <UserPersonalSettingsModal isOpen={showModal} onClose={() => { setShowModal(false); if (selectedAutoId) loadUserSettings(selectedAutoId); }} db={db} uid={user.uid} clientId={userDoc.clientId} currentAuto={currentAuto} currentTemplate={currentTemplate} />
      )}
    </div>
  );
}

