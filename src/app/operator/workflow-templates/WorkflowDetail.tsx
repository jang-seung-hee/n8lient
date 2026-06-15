// 이 파일은 선택된 N8N 워크플로우의 상세 명세(기본 정보, 입력 스키마, 설정값 스키마)를 조회하는 서브 컴포넌트입니다.

"use client";

import { useState } from "react";
import { Firestore } from "firebase/firestore";
import type { WorkflowTemplate, WorkflowTemplateUsageSummary } from "@/types/n8lient";
import {
  buildWorkflowTemplateImportJson,
  buildWorkflowTemplateExportFileName,
  downloadJsonAsFile,
} from "@/features/operator/workflowTemplateImport";

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
  let badgeBg = "#eff6ff";
  let badgeColor = "#1d4ed8";
  let guideMessage = "";

  if (hasProductionReferences) {
    badgeText = "운영 참조 있음";
    badgeBg = "#ffedd5";
    badgeColor = "#c2410c";
    guideMessage = "이 워크플로우 마스터는 회사 매핑이나 운영 계약 등의 참조가 존재하여 식별/구조 필드를 변경할 수 없으며 삭제가 불가합니다.";
  } else if (hasProductionSubmissions) {
    badgeText = "실행 이력 있음";
    badgeBg = "#fee2e2";
    badgeColor = "#b91c1c";
    guideMessage = "운영 자동화 실행 이력이 존재합니다. 구조 변경이 필요하다면 복제 기능을 이용해 새 버전으로 등록하는 것을 권장합니다.";
  } else if (hasTestReferences) {
    badgeText = "테스트 참조 있음";
    badgeBg = "#f3e8ff";
    badgeColor = "#6b21a8";
    guideMessage = "테스트 계약, 테스트 배포 설정 또는 테스트 실행 이력이 존재합니다. Draft 워크플로우를 삭제할 경우 관련 테스트 참조 데이터가 함께 일괄 정리됩니다. 구조 수정은 가능합니다.";
  } else {
    // 참조 없음
    badgeText = "참조 없음";
    badgeBg = "#eff6ff";
    badgeColor = "#1d4ed8";
    guideMessage = "아무런 계약이나 배포, 실행 참조가 없습니다. 자유로운 수정 및 삭제가 가능합니다.";
  }

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
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#111111", margin: 0 }}>
                {template.name} 상세 명세
              </h2>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  backgroundColor: badgeBg,
                  color: badgeColor,
                  padding: "2px 8px",
                  borderRadius: "12px",
                }}
              >
                {badgeText}
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0 0" }}>
              Key: {template.workflowKey} · v{template.version}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {/* Draft 삭제 버튼 추가 */}
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
          {/* JSON 다운로드 버튼: 현재 명세를 N8Lient 표준 Import JSON으로 내보냅니다 */}
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

      {/* 구조 잠금 안내 배너 노출 */}
      {guideMessage && (
        <div
          style={{
            backgroundColor: badgeBg,
            border: `1px solid ${badgeColor}33`,
            color: badgeColor,
            padding: "12px 16px",
            borderRadius: "6px",
            fontSize: "13px",
            lineHeight: 1.5,
            fontWeight: 500,
          }}
        >
          💡 {guideMessage}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* 왼쪽 패널: 기본정보 & Webhook 설정 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "20px",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#111111", margin: "0 0 12px 0", borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
              📌 기본 정보
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>워크플로우 명칭</span>
                <span style={{ fontWeight: 600, color: "#111111" }}>{template.name}</span>
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
                  {template.status === "published" ? "배포 완료" : template.status === "disabled" ? "비활성" : "작성 중"}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                <span style={{ color: "#6b7280" }}>워크플로우 설명</span>
                <p style={{ margin: 0, padding: "8px 10px", backgroundColor: "#f9fafb", borderRadius: "6px", color: "#374151", lineHeight: 1.4 }}>
                  {template.description || "설명이 등록되지 않았습니다."}
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "20px",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#111111", margin: "0 0 12px 0", borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
              🔗 Webhook 환경변수 맵핑 정보
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>n8n 서버 식별 Key</span>
                <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#1d4ed8" }}>{template.n8nServerKey || "main"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>Webhook Secret 참조 ID</span>
                <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#1d4ed8" }}>{template.webhookSecretId}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽 패널: inputSchema & configSchema 목록 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "20px",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#111111", margin: "0 0 12px 0", borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
              ⚙️ 허용 입력 양식 (inputSchema)
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>허용 입력 형태</span>
                <span style={{ fontWeight: 600, color: "#111111" }}>{template.inputSchema?.acceptedInputTypes?.join(", ") || "없음"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>허용 파일 확장자</span>
                <span style={{ fontWeight: 600, color: "#111111", fontFamily: "monospace" }}>
                  {template.inputSchema?.allowedFileTypes?.join(", ") || "없음"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>최대 업로드 제한 크기</span>
                <span style={{ fontWeight: 600, color: "#111111" }}>{template.inputSchema?.maxFileSizeMB || 50} MB</span>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "20px",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#111111", margin: "0 0 12px 0", borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
              ⚙️ 설정값 맵핑 필드 (configSchema)
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#6b7280" }}>
                    <th style={{ padding: "8px 4px", fontWeight: 600 }}>설정 Key</th>
                    <th style={{ padding: "8px 4px", fontWeight: 600 }}>라벨명</th>
                    <th style={{ padding: "8px 4px", fontWeight: 600 }}>타입</th>
                    <th style={{ padding: "8px 4px", fontWeight: 600 }}>필수</th>
                  </tr>
                </thead>
                <tbody>
                  {template.configSchema?.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: "12px", textAlign: "center", color: "#9ca3af" }}>
                        등록된 설정값 매핑 규격이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    template.configSchema.map((field) => (
                      <tr key={field.key} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "10px 4px", fontFamily: "monospace", fontWeight: 600 }}>{field.key}</td>
                        <td style={{ padding: "10px 4px" }}>
                          <div>{field.label}</div>
                          {field.description && (
                            <div style={{ fontSize: "10.5px", color: "#9ca3af", marginTop: "2px" }}>
                              💡 {field.description}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "10px 4px", color: "#4b5563" }}>{field.type}</td>
                        <td style={{ padding: "10px 4px" }}>
                          <span style={{ color: field.required ? "#ef4444" : "#9ca3af", fontWeight: field.required ? 600 : 400 }}>
                            {field.required ? "Y" : "N"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
