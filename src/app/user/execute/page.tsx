// 이 파일은 사용자가 소속 회사에서 활성화한 N8N 워크플로우를 선택하고 실행 요청 값(제목, 내용 등)을 입력하여
// /api/automation/execute API를 통해 서버리스 게이트웨이로 실행을 요청하는 화면입니다.
// 보안 규정: submissions를 프론트에서 직접 생성하는 구조는 사용하지 않습니다.

"use client";
import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { getActiveAutomations, getUserAutomationSettings } from "@/features/user/userService";
import type { ClientAutomation, WorkflowTemplate, UserAutomationSettings } from "@/types/n8lient";
import { DEFAULT_RETENTION_POLICY } from "@/types/n8lient";
import { siteConfig } from "@/config/siteConfig";
import UserPersonalSettingsModal from "@/components/custom/UserPersonalSettingsModal";
import WorkflowConfigBadge from "@/components/custom/WorkflowConfigBadge";
import WorkflowInputPanel from "@/components/custom/WorkflowInputPanel";
import AutomationNoticeBox from "@/components/core/automation/AutomationNoticeBox";
import { playAppSound, setAppSoundMuted } from "@/lib/appSound";
import { useSearchParams, useRouter } from "next/navigation";
import { validateExecution } from "@/common/validation/validateExecution";
import { buildExecutionTitleContract } from "@/common/execution/buildTitleContract";
import { mergeAutomationSettings } from "@/common/settings/mergeAutomationSettings";
import { fetchWorkflowTemplatesByKeys } from "@/common/workflow/fetchWorkflowTemplatesByKeys";
import { resolveWorkflowDisplayName } from "@/common/workflow/resolveWorkflowDisplayName";
import { useScreenWakeLock } from "@/hooks/useScreenWakeLock";
import { resolveCompletionNotice } from "@/features/user/execute/resolveCompletionNotice";
import { resolveUserSettingGuidanceStatus } from "@/features/user/execute/resolveUserSettingGuidanceStatus";

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

  const router = useRouter();
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeModalMessage, setCompleteModalMessage] = useState("");
  const [completeModalNotice, setCompleteModalNotice] = useState<any | null>(null);

  // 녹음 오작동 방지용 상태 및 ref
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const inputPanelRef = useRef<{ stopRecording: () => void } | null>(null);

  // 모바일 화면 자동 꺼짐 방지 훅 적용
  const shouldKeepScreenAwake = isRecording || submitting;
  useScreenWakeLock({
    active: shouldKeepScreenAwake,
    reason: "user_execute_active_task",
  });

  // alert 지연 호출용 타이머 ID 보존 목록
  const timeoutIdsRef = useRef<number[]>([]);

  // 컴포넌트 unmount 시 Mute 해제 및 pending alert 타이머 전체 취소
  useEffect(() => {
    return () => {
      setAppSoundMuted(false);
      timeoutIdsRef.current.forEach((id) => clearTimeout(id));
    };
  }, []);

  const handleGoHome = () => {
    timeoutIdsRef.current.forEach((id) => clearTimeout(id));
    router.push("/user");
  };



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

      const tempMap = await fetchWorkflowTemplatesByKeys(
        db,
        activeAutos.map((auto) => auto.workflowKey)
      );
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
      workflowName: resolveWorkflowDisplayName({
        template: currentTemplate,
        automation: currentAuto ?? null,
        workflowKey: currentAuto?.workflowKey,
      }) || currentAuto?.workflowKey || "",
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

        const notice = data.completionNotice;
        if (process.env.NODE_ENV === "development") {
          console.debug("[execute-response-completion-notice]", {
            completionNotice: data?.completionNotice,
            fallbackUsed: !data?.completionNotice?.message,
          });
          console.debug("[execute-response-raw]", data);
        }
        const fallbackMessage = `실행 요청이 완료되었습니다.\n결과보고 이메일이 설정되어 있지 않아, 처리 결과는 결과 화면에서 확인해 주세요.\n\n단, 워크플로우 실패 시에는 결과 화면에서만 확인할 수 있습니다.`;
        setCompleteModalNotice(notice ?? null);
        setCompleteModalMessage(notice?.message ?? fallbackMessage);
        setShowCompleteModal(true);

        // 10초 지연 후 홈으로 자동 이동
        const timerId = setTimeout(() => {
          router.push("/user");
        }, 10000) as any;
        timeoutIdsRef.current.push(timerId);
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
    <div style={{ boxSizing: "border-box", minWidth: 0 }}>
      <h2 className="ux_section_title" style={{ marginBottom: "16px" }}>
        🚀 N8N 워크플로우 실행 요청
      </h2>

      {error && (
        <div className="ux_alert ux_alert_danger" style={{ marginBottom: "16px" }}>
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
        <div className="ux_alert ux_alert_success" style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
        <div className="ux_card" style={{ padding: "32px", borderStyle: "dashed", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
          사용 가능한 N8N 워크플로우가 없습니다. 사내 관리자에게 문의해 주십시오.
        </div>
      ) : (
        <>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }} className="ux_execute_form_mobile_padded">
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
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", minWidth: 0 }}>
              <div style={{ flex: 1, minWidth: 0, maxWidth: "100%" }}>
                <select
                  className="ux_select"
                  value={selectedAutoId}
                  onChange={(e) => {
                    setSelectedAutoId(e.target.value);
                    setSuccess(false);
                    setError(null);
                  }}
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {automations.map((a) => (
                    <option key={a.automationId} value={a.automationId}>
                      {resolveWorkflowDisplayName({
                        template: templates[a.workflowKey],
                        automation: a,
                        workflowKey: a.workflowKey,
                      })}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="ux_button ux_button_secondary"
                onClick={handleOpenSettingsModal}
                disabled={!selectedAutoId}
                style={{
                  flexShrink: 0,
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "6px",
                  backgroundColor: selectedAutoId ? "#ffffff" : "#f3f4f6",
                  color: selectedAutoId ? "#374151" : "#9ca3af",
                  cursor: selectedAutoId ? "pointer" : "not-allowed",
                  boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                  transition: "all 0.15s ease",
                }}
              >
                🛠️ 내 설정
                {(() => {
                  const status = resolveUserSettingGuidanceStatus(currentAuto, currentTemplate, userSettings);
                  if (status === "required_missing") {
                    return <span className="ux_settings_status_dot ux_settings_status_dot_required" title="개인 설정 필수 항목이 누락되었습니다." />;
                  }
                  if (status === "recommended_missing") {
                    return <span className="ux_settings_status_dot ux_settings_status_dot_recommended" title="개인 설정 권장 항목이 누락되었습니다." />;
                  }
                  if (status === "complete") {
                    return <span className="ux_settings_status_dot ux_settings_status_dot_success" title="모든 안내 대상 개인 설정이 완료되었습니다." />;
                  }
                  return null;
                })()}
              </button>
            </div>
          </div>

          {currentAuto?.noticeText?.trim() && (
            <AutomationNoticeBox
              noticeText={currentAuto.noticeText}
              workflowKey={currentAuto.workflowKey}
              userId={user.uid}
              updatedAt={currentAuto.updatedAt}
            />
          )}

          {(() => {
            const isTitleRequired = currentTemplate?.inputSchema?.titleRequired !== false;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>
                  제목{isTitleRequired ? " *" : ""}
                </label>
                <input
                  type="text"
                  className="ux_input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isTitleRequired ? "예: 5월 카드 지출 내역 정리 요청" : "입력하지 않으면 자동 생성됩니다."}
                  required={isTitleRequired}
                />
              </div>
            );
          })()}

          {currentTemplate?.inputSchema && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>내용작성</label>
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

          <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px", padding: "0 2px", lineHeight: 1.4 }}>
            💡 긴 녹음이나 업로드 중에는 화면이 꺼지지 않도록 유지합니다. 일부 브라우저나 저전력 모드에서는 기기 설정에 따라 화면이 꺼질 수 있습니다.
          </div>

          {isRecording ? (
            <button
              type="submit"
              className="ux_button ux_button_danger ux_button_submit_large ux_execute_submit_inline_mobile_hide"
              style={{
                width: "100%",
                marginTop: "8px",
                borderRadius: "6px",
                transition: "background-color 0.15s ease",
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
              className="ux_button ux_button_primary ux_button_submit_large ux_execute_submit_inline_mobile_hide"
              disabled={submitting}
              style={{
                width: "100%",
                marginTop: "8px",
                borderRadius: "6px",
                backgroundColor: submitting ? "#4b5563" : undefined,
                border: submitting ? "none" : undefined,
                transition: "background-color 0.15s ease",
              }}
            >
              {submitting ? (selectedFile ? "파일을 업로드 중입니다. 화면을 닫지 마세요..." : "실행 요청 처리 중...") : "작성내용 전송하기"}
            </button>
          )}
        </form>

        {/* 모바일 전용 하단 고정 전송 버튼 바 — PC에서는 CSS로 자동 숨김 */}
        <div className="ux_mobile_submit_bar">
          {isRecording ? (
            <button
              type="button"
              onClick={handleSubmit as unknown as React.MouseEventHandler}
              className="ux_button ux_button_danger ux_button_submit_large"
              style={{ width: "100%", borderRadius: "6px", transition: "background-color 0.15s ease" }}
            >
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ffffff", animation: "pulse 1.5s infinite", marginRight: "6px" }}></span>
              🛑 녹음 정지 ({(() => {
                const mins = Math.floor(recordingTime / 60);
                const secs = recordingTime % 60;
                return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
              })()})
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit as unknown as React.MouseEventHandler}
              className="ux_button ux_button_primary ux_button_submit_large"
              disabled={submitting}
              style={{
                width: "100%",
                borderRadius: "6px",
                backgroundColor: submitting ? "#4b5563" : undefined,
                border: submitting ? "none" : undefined,
                transition: "background-color 0.15s ease",
              }}
            >
              {submitting ? (selectedFile ? "파일을 업로드 중입니다. 화면을 닫지 마세요..." : "실행 요청 처리 중...") : "작성내용 전송하기"}
            </button>
          )}
        </div>
        </>
      )}

      {isDebugMode && validationDebug && (
        <div className="ux_info_box" style={{ marginTop: "16px", padding: "10px", borderRadius: "6px", fontSize: "12px", color: "#374151", backgroundColor: "#f3f4f6" }}>
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

      {showCompleteModal && (
        <div className="ux_modal_overlay" style={{ backdropFilter: "blur(4px)" }}>
          <div
            className="ux_modal_panel"
            style={{
              backgroundColor: "#ffffff",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              border: "1px solid #e5e7eb",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="ux_card_title" style={{ fontSize: "16px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                🎉 실행 요청 완료
              </h3>
              <button
                type="button"
                onClick={handleGoHome}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  color: "#9ca3af",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
                aria-label="닫기"
              >
                ×
              </button>
            </div>
            <div>
              <div className="ux_body_text" style={{ fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
                {resolveCompletionNotice(completeModalNotice, completeModalMessage)}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", borderTop: "1px solid #f3f4f6", paddingTop: "12px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="ux_button ux_button_secondary"
                  onClick={handleGoHome}
                  style={{ borderRadius: "6px" }}
                >
                  닫기
                </button>
                <button
                  type="button"
                  className="ux_button ux_button_primary"
                  onClick={handleGoHome}
                  style={{ borderRadius: "6px", border: "none" }}
                >
                  홈으로 이동
                </button>
              </div>
              <span className="ux_micro_text" style={{ color: "#9ca3af" }}>
                ⏱️ 잠시 후 홈으로 이동합니다.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

