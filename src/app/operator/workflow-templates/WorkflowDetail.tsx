// 이 파일은 선택된 N8N 워크플로우의 상세 명세(기본 정보, 입력 스키마, 설정값 스키마)를 조회하는 서브 컴포넌트입니다.
// 한국어 주석 표준을 준수합니다.

"use client";

import { useState, type CSSProperties } from "react";
import { Firestore } from "firebase/firestore";
import type { WorkflowTemplate, WorkflowTemplateUsageSummary } from "@/types/n8lient";
import {
  buildWorkflowTemplateImportJson,
  buildWorkflowTemplateExportFileName,
  downloadJsonAsFile,
} from "@/features/operator/workflowTemplateImport";
import { SectionTabs, type SectionTabItem } from "@/components/core/layout/SectionTabs";

interface WorkflowDetailProps {
  template: WorkflowTemplate;
  usageSummary?: WorkflowTemplateUsageSummary;
  onEditClick: () => void;
  onCloneClick: () => void;
  onBackClick: () => void;
  db: Firestore;
  onDeleteSuccess?: () => void;
}

export function WorkflowDetail({
  template,
  usageSummary,
  onEditClick,
  onCloneClick,
  onBackClick,
  db,
  onDeleteSuccess,
}: WorkflowDetailProps) {
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("basic");

  const tabs: SectionTabItem[] = [
    { key: "basic", label: "기본 정보" },
    { key: "input", label: "입력 설정" },
    { key: "config", label: "설정 스키마" },
    { key: "retention", label: "보관 정책" },
    { key: "reference", label: "참조/진단" },
  ];

  /**
   * 현재 상세보기 중인 워크플로우를 N8Lient 표준 Import JSON으로 다운로드합니다.
   * - diagnostics, UI 임시 상태값, 실제 Secret/Token/API Key는 포함되지 않습니다.
   * - 다운로드한 파일은 표준 Import JSON 불러오기 기능에서 바로 재업로드 가능합니다.
   */
  const handleDownloadJson = () => {
    const payload = buildWorkflowTemplateImportJson(template);
    const fileName = buildWorkflowTemplateExportFileName(template);
    downloadJsonAsFile(payload, fileName);
  };

  const handleDeleteDraft = async () => {
    if (hasProductionReferences) {
      alert("운영 참조가 있어 삭제할 수 없습니다.");
      return;
    }

    const confirmMsg =
      "이 워크플로우 마스터는 draft 상태입니다.\n" +
      "삭제 시 테스트 계약, 테스트 배포 설정, 테스트 개인 설정, 테스트 실행 이력이 함께 삭제됩니다.\n" +
      "운영 계약 또는 운영 실행 이력이 있는 경우 삭제되지 않습니다.\n" +
      "정말 삭제하시겠습니까?";

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      setDeleting(true);
      const { deleteDraftWorkflowTemplate } = await import("@/features/operator/operatorService");
      const res = await deleteDraftWorkflowTemplate(db, template.workflowKey);
      if (res.success) {
        alert("Draft 워크플로우 마스터와 테스트 계약/설정/실행 이력이 삭제되었습니다.");
        if (onDeleteSuccess) {
          onDeleteSuccess();
        }
      } else {
        alert(res.message || "삭제 실패");
      }
    } catch (err: any) {
      alert(`삭제 도중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // 사용 상태 분석 (테스트/운영 참조 구분)
  const hasProductionReferences = usageSummary?.hasProductionReferences === true;
  const hasTestReferences = usageSummary?.hasTestReferences === true;
  const hasProductionSubmissions = (usageSummary?.productionSubmissionCount ?? 0) > 0;

  let badgeText = "참조 없음";
  let guideMessage = "";
  let badgeClass = "ux_badge ux_badge_info";
  let badgeStyle: CSSProperties = { fontSize: "11px", padding: "2px 8px", borderRadius: "12px" };
  let guideAlertClass = "ux_alert ux_alert_info";
  let guideAlertStyle: CSSProperties = { borderRadius: "6px", fontSize: "13px", lineHeight: 1.5, fontWeight: 500 };

  if (hasProductionReferences) {
    badgeText = "운영 참조 있음";
    badgeClass = "ux_badge ux_badge_warning";
    guideAlertClass = "ux_alert ux_alert_warning";
    guideMessage = "이 워크플로우 마스터는 회사 매핑이나 운영 계약 등의 참조가 존재하여 식별/구조 필드를 변경할 수 없으며 삭제가 불가합니다.";
  } else if (hasProductionSubmissions) {
    badgeText = "실행 이력 있음";
    badgeClass = "ux_badge ux_badge_danger";
    guideAlertClass = "ux_alert ux_alert_danger";
    guideMessage = "운영 자동화 실행 이력이 존재합니다. 구조 변경이 필요하다면 복제 기능을 이용해 새 버전으로 등록하는 것을 권장합니다.";
  } else if (hasTestReferences) {
    badgeText = "테스트 참조 있음";
    badgeClass = "ux_badge";
    badgeStyle = {
      ...badgeStyle,
      backgroundColor: "#f3e8ff",
      color: "#6b21a8",
    };
    guideAlertClass = "ux_alert";
    guideAlertStyle = {
      ...guideAlertStyle,
      backgroundColor: "#f3e8ff",
      border: "1px solid #e9d5ff",
      color: "#6b21a8",
    };
    guideMessage = "테스트 계약, 테스트 배포 설정 또는 테스트 실행 이력이 존재합니다. Draft 워크플로우를 삭제할 경우 관련 테스트 참조 데이터가 함께 일괄 정리됩니다. 구조 수정은 가능합니다.";
  } else {
    // 참조 없음
    badgeText = "참조 없음";
    badgeClass = "ux_badge ux_badge_info";
    guideAlertClass = "ux_alert ux_alert_info";
    guideMessage = "아무런 계약이나 배포, 실행 참조가 없습니다. 자유로운 수정 및 삭제가 가능합니다.";
  }

  // 보관 레벨 한글 라벨 맵핑 함수
  const getRetentionLevelLabel = (level: string) => {
    switch (level) {
      case "notify_only":
        return "알림만 (notify_only)";
      case "processed_result":
        return "결과 보관 (processed_result)";
      case "full_archive":
        return "전체 보관 (full_archive)";
      default:
        return level || "-";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 뒤로가기 및 액션 바 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={onBackClick}
            style={{
              background: "none",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "4px",
            }}
            title="목록으로 이동"
          >
            ⬅️
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 className="ux_section_title" style={{ margin: 0 }}>
                {template.name} 상세 명세
              </h2>
              <span className={badgeClass} style={badgeStyle}>
                {badgeText}
              </span>
            </div>
            <p className="ux_caption" style={{ margin: "2px 0 0 0" }}>
              Key: {template.workflowKey} · v{template.version}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onEditClick}
            disabled={deleting}
            style={{
              backgroundColor: deleting ? "#f3f4f6" : "#111111",
              color: deleting ? "#9ca3af" : "#ffffff",
              border: "none",
              borderRadius: "6px",
              padding: "6px 14px",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: deleting ? "not-allowed" : "pointer",
            }}
          >
            ⚙️ 명세 수정
          </button>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <SectionTabs
        items={tabs}
        activeKey={activeTab}
        onChange={setActiveTab}
        ariaLabel="워크플로우 상세 섹션 탭"
      />

      {/* 탭 콘텐츠 영역 */}
      <div style={{ marginTop: "4px" }}>
        
        {/* 1. 기본 정보 탭 */}
        {activeTab === "basic" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div
              className="ux_panel"
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <h3 className="ux_card_title" style={{ margin: 0, borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
                🏢 워크플로우 기본 정보
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>워크플로우 명칭</span>
                  <span style={{ fontWeight: 600, color: "#111111" }}>{template.name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>워크플로우 식별 Key</span>
                  <span style={{ fontWeight: 600, color: "#111111", fontFamily: "monospace" }}>{template.workflowKey}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>줄임말 (UI 약어)</span>
                  <span style={{ fontWeight: 600, color: "#111111" }}>{template.shortName}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>버전</span>
                  <span style={{ fontWeight: 600, color: "#111111" }}>v{template.version}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#6b7280" }}>상태</span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      backgroundColor: template.status === "published" ? "#d1fae5" : "#f3f4f6",
                      color: template.status === "published" ? "#065f46" : "#374151",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    {template.status === "published" ? "배포 완료 (published)" : template.status === "disabled" ? "비활성" : "작성 중 (draft)"}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                  <span style={{ color: "#6b7280" }}>워크플로우 설명</span>
                  <p style={{ margin: 0, padding: "8px 10px", backgroundColor: "#f9fafb", borderRadius: "6px", color: "#374151", lineHeight: 1.4 }}>
                    {template.description || "설명이 등록되지 않았습니다."}
                  </p>
                </div>
              </div>

              {/* 기본 정보 하단 액션 영역 */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  borderTop: "1px solid #f3f4f6",
                  paddingTop: "16px",
                  marginTop: "8px",
                }}
              >
                {template.status === "draft" && (
                  <button
                    onClick={handleDeleteDraft}
                    disabled={deleting || hasProductionReferences}
                    style={{
                      backgroundColor: (deleting || hasProductionReferences) ? "#f3f4f6" : "#ef4444",
                      color: (deleting || hasProductionReferences) ? "#9ca3af" : "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 14px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      cursor: (deleting || hasProductionReferences) ? "not-allowed" : "pointer",
                    }}
                    title={hasProductionReferences ? "운영 참조가 있어 삭제할 수 없습니다." : "테스트 이력이 함께 삭제됩니다."}
                  >
                    {deleting ? "삭제 중..." : "[Draft 삭제]"}
                  </button>
                )}
                <button
                  onClick={onCloneClick}
                  disabled={deleting}
                  style={{
                    backgroundColor: deleting ? "#f3f4f6" : "#eff6ff",
                    color: deleting ? "#9ca3af" : "#1d4ed8",
                    border: deleting ? "1px solid #e5e7eb" : "1px solid #bfdbfe",
                    borderRadius: "6px",
                    padding: "6px 14px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: deleting ? "not-allowed" : "pointer",
                  }}
                >
                  📋 워크플로우 복제
                </button>
                <button
                  onClick={handleDownloadJson}
                  disabled={deleting}
                  style={{
                    backgroundColor: deleting ? "#f3f4f6" : "#f0fdf4",
                    color: deleting ? "#9ca3af" : "#15803d",
                    border: deleting ? "1px solid #e5e7eb" : "1px solid #bbf7d0",
                    borderRadius: "6px",
                    padding: "6px 14px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: deleting ? "not-allowed" : "pointer",
                  }}
                  title="현재 워크플로우 명세를 N8Lient 표준 Import JSON 파일로 다운로드합니다."
                >
                  ⬇️ JSON 다운로드
                </button>
              </div>
            </div>

            {/* 구조 잠금 및 테스트 참조 안내 배너 노출 */}
            {guideMessage && (
              <div className={guideAlertClass} style={guideAlertStyle}>
                💡 {guideMessage}
              </div>
            )}
          </div>
        )}

        {/* 2. 입력 설정 탭 */}
        {activeTab === "input" && (
          <div
            className="ux_panel"
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <h3 className="ux_card_title" style={{ margin: 0, borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
              📥 허용 입력 양식 (inputSchema)
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>허용 입력 형태</span>
                <span style={{ fontWeight: 600, color: "#111111" }}>
                  {template.inputSchema?.acceptedInputTypes?.join(", ") || "없음"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>허용 파일 확장자</span>
                <span style={{ fontWeight: 600, color: "#111111", fontFamily: "monospace" }}>
                  {template.inputSchema?.allowedFileTypes?.join(", ") || "제한 없음"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>최대 업로드 제한 크기</span>
                <span style={{ fontWeight: 600, color: "#111111" }}>
                  {template.inputSchema?.maxFileSizeMB ? `${template.inputSchema.maxFileSizeMB} MB` : "50 MB (기본값)"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>제목 입력 필수 여부</span>
                <span style={{ fontWeight: 600, color: template.inputSchema?.titleRequired ? "#ef4444" : "#111111" }}>
                  {template.inputSchema?.titleRequired ? "필수 입력" : "선택 사항"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>필수 입력 조건 모드</span>
                <span style={{ fontWeight: 600, color: "#111111" }}>
                  {template.inputSchema?.requiredInputMode === "none"
                    ? "없음 (제한 없음)"
                    : template.inputSchema?.requiredInputMode === "all"
                    ? "모두 입력 필수"
                    : "최소 1개 이상 입력 필수"}
                </span>
              </div>
              {template.inputSchema?.requiredInputTypes && template.inputSchema.requiredInputTypes.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>필수 입력 필요 파일 타입</span>
                  <span style={{ fontWeight: 600, color: "#111111" }}>
                    {template.inputSchema.requiredInputTypes.join(", ")}
                  </span>
                </div>
              )}
              {template.inputSchema?.maxFiles !== undefined && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>최대 허용 파일 수</span>
                  <span style={{ fontWeight: 600, color: "#111111" }}>
                    {template.inputSchema.maxFiles} 개
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. 설정 스키마 탭 */}
        {activeTab === "config" && (
          <div
            className="ux_panel"
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <h3 className="ux_card_title" style={{ margin: 0, borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
              ⚙️ 설정값 맵핑 필드 (configSchema)
            </h3>
            <div className="ux_scroll_area">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#6b7280", backgroundColor: "#f9fafb" }}>
                    <th style={{ padding: "10px 8px", fontWeight: 600 }}>설정 Key</th>
                    <th style={{ padding: "10px 8px", fontWeight: 600 }}>라벨명</th>
                    <th style={{ padding: "10px 8px", fontWeight: 600 }}>타입</th>
                    <th style={{ padding: "10px 8px", fontWeight: 600 }}>필수</th>
                    <th style={{ padding: "10px 8px", fontWeight: 600 }}>기본값</th>
                  </tr>
                </thead>
                <tbody>
                  {template.configSchema?.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: "16px", textAlign: "center", color: "#9ca3af" }}>
                        등록된 설정값 매핑 규격이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    template.configSchema.map((field) => (
                      <tr key={field.key} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "10px 8px", fontFamily: "monospace", fontWeight: 600 }}>{field.key}</td>
                        <td style={{ padding: "10px 8px" }}>
                          <div>{field.label}</div>
                          {field.description && (
                            <div style={{ fontSize: "10.5px", color: "#9ca3af", marginTop: "2px" }} title={field.description}>
                              💡 {field.description.length > 40 ? `${field.description.slice(0, 40)}...` : field.description}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "10px 8px", color: "#4b5563" }}>{field.type}</td>
                        <td style={{ padding: "10px 8px" }}>
                          <span style={{ color: field.required ? "#ef4444" : "#9ca3af", fontWeight: field.required ? 600 : 400 }}>
                            {field.required ? "Y" : "N"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 8px", color: "#6b7280" }}>
                          {field.defaultValue !== undefined && field.defaultValue !== null
                            ? String(field.defaultValue)
                            : "-"}
                          {field.defaultValueSource && (
                            <span style={{ fontSize: "10px", color: "#2563eb", marginLeft: "4px" }}>
                              ({field.defaultValueSource})
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. 보관 정책 탭 */}
        {activeTab === "retention" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* 4.1 기술적 지원 범위 */}
            <div
              className="ux_panel"
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <h3 className="ux_card_title" style={{ margin: 0, borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
                🛡️ 워크플로우 기술적 보관 능력 (retentionCapabilities)
              </h3>
              {template.retentionCapabilities ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>기술적 최대 지원 보관 레벨</span>
                    <span style={{ fontWeight: 600, color: "#111111" }}>
                      {getRetentionLevelLabel(template.retentionCapabilities.maxLevel)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>지원 가능한 레벨 목록</span>
                    <span style={{ fontWeight: 600, color: "#111111" }}>
                      {template.retentionCapabilities.supportedLevels?.map(getRetentionLevelLabel).join(", ") || "-"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>기본 보관 레벨</span>
                    <span style={{ fontWeight: 600, color: "#111111" }}>
                      {getRetentionLevelLabel(template.retentionCapabilities.defaultLevel)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>결과 요약 데이터 저장 지원 여부</span>
                    <span style={{ fontWeight: 600, color: template.retentionCapabilities.supportsProcessorResult ? "#10b981" : "#ef4444" }}>
                      {template.retentionCapabilities.supportsProcessorResult ? "지원" : "미지원"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>원본 파일 참조 정보 저장 지원 여부</span>
                    <span style={{ fontWeight: 600, color: template.retentionCapabilities.supportsOriginalFileRefs ? "#10b981" : "#ef4444" }}>
                      {template.retentionCapabilities.supportsOriginalFileRefs ? "지원" : "미지원"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>결과 파일 참조 정보 저장 지원 여부</span>
                    <span style={{ fontWeight: 600, color: template.retentionCapabilities.supportsResultRefs ? "#10b981" : "#ef4444" }}>
                      {template.retentionCapabilities.supportsResultRefs ? "지원" : "미지원"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>이메일 알림 전송 지원 여부</span>
                    <span style={{ fontWeight: 600, color: template.retentionCapabilities.supportsEmailNotification ? "#10b981" : "#ef4444" }}>
                      {template.retentionCapabilities.supportsEmailNotification ? "지원" : "미지원"}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "13px", color: "#9ca3af", textAlign: "center", padding: "12px 0" }}>
                  설정된 기술적 보관 능력 스키마 정보가 없습니다. (하위 호환)
                </div>
              )}
            </div>

            {/* 4.2 오퍼레이터 정책 제한 */}
            <div
              className="ux_panel"
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <h3 className="ux_card_title" style={{ margin: 0, borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
                🔒 오퍼레이터 계약 제한 정책 (operatorRetentionPolicy)
              </h3>
              {template.operatorRetentionPolicy ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>허용 보관 레벨</span>
                    <span style={{ fontWeight: 600, color: "#111111" }}>
                      {template.operatorRetentionPolicy.allowedLevels?.map(getRetentionLevelLabel).join(", ") || "-"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>계약 기본 레벨</span>
                    <span style={{ fontWeight: 600, color: "#111111" }}>
                      {getRetentionLevelLabel(template.operatorRetentionPolicy.defaultLevel)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>고객사 오버라이드(변경) 허용 여부</span>
                    <span style={{ fontWeight: 600, color: template.operatorRetentionPolicy.allowCompanyOverride ? "#10b981" : "#ef4444" }}>
                      {template.operatorRetentionPolicy.allowCompanyOverride ? "허용" : "차단"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>일반 사용자 오버라이드(변경) 허용 여부</span>
                    <span style={{ fontWeight: 600, color: template.operatorRetentionPolicy.allowUserOverride ? "#10b981" : "#ef4444" }}>
                      {template.operatorRetentionPolicy.allowUserOverride ? "허용" : "차단"}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "13px", color: "#9ca3af", textAlign: "center", padding: "12px 0" }}>
                  설정된 오퍼레이터 제한 정책 정보가 없습니다. (하위 호환)
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. 참조/진단 탭 */}
        {activeTab === "reference" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* 5.1 연동 키 맵핑 정보 */}
            <div
              className="ux_panel"
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <h3 className="ux_card_title" style={{ margin: 0, borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
                🔗 Webhook 환경변수 맵핑 정보
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>n8n 서버 식별 Key</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#1d4ed8" }}>
                    {template.n8nServerKey || "main"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>Webhook Secret 참조 ID</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#1d4ed8" }}>
                    {template.webhookSecretId}
                  </span>
                </div>
              </div>
            </div>

            {/* 5.2 진단 및 사용량 통계 요약 */}
            <div
              className="ux_panel"
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <h3 className="ux_card_title" style={{ margin: 0, borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
                🛠️ 워크플로우 진단 및 참조 통계
              </h3>
              {usageSummary ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>전체 계약 수 (Client Contracts)</span>
                    <span style={{ fontWeight: 600, color: "#111111" }}>{usageSummary.clientContractCount} 건</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>회사 등록 수 (Client Automations)</span>
                    <span style={{ fontWeight: 600, color: "#111111" }}>{usageSummary.clientAutomationCount} 건</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>전체 실행 횟수 (Submissions)</span>
                    <span style={{ fontWeight: 600, color: "#111111" }}>{usageSummary.submissionCount} 회</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>사용자별 개인 설정 수 (User Settings)</span>
                    <span style={{ fontWeight: 600, color: "#111111" }}>{usageSummary.userSettingCount} 건</span>
                  </div>
                  <div style={{ borderTop: "1px dashed #e5e7eb", paddingTop: "8px", marginTop: "4px" }} />
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>운영 참조 보유 여부</span>
                    <span style={{ fontWeight: 600, color: hasProductionReferences ? "#d97706" : "#111111" }}>
                      {hasProductionReferences ? "보유 (구조 변경 제한됨)" : "없음"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>테스트 참조 보유 여부</span>
                    <span style={{ fontWeight: 600, color: "#111111" }}>
                      {hasTestReferences ? "보유" : "없음"}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "13px", color: "#9ca3af", textAlign: "center", padding: "12px 0" }}>
                  참조/진단 정보를 불러오지 못했거나 요약 데이터가 없습니다.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
