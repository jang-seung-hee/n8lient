// 이 파일은 N8Lient 표준 Import JSON 파일을 업로드하여 저장 정합성을 진단해 주는 컴포넌트입니다.
// 한국어 주석 표준을 준수합니다.

"use client";

import { useState, useRef } from "react";
import type { WorkflowTemplate } from "@/types/n8lient";
import {
  parseWorkflowTemplateImportJson,
  validateWorkflowTemplateImport,
  type WorkflowTemplateImportDraft
} from "@/features/operator/workflowTemplateImport";
import { playAppSound } from "@/lib/appSound";

interface WorkflowImportPanelProps {
  existingTemplates: WorkflowTemplate[];
  onApplyDraft: (draft: WorkflowTemplateImportDraft) => void;
  onDirectCreate: () => void;
  onCancel: () => void;
}

export function WorkflowImportPanel({
  existingTemplates,
  onApplyDraft,
  onDirectCreate,
  onCancel
}: WorkflowImportPanelProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [draft, setDraft] = useState<WorkflowTemplateImportDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 드래그 앤 드롭 이벤트 핸들러
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // 파일 파싱 및 정합성 검증 메인 로직
  const processFile = async (file: File) => {
    try {
      setError(null);
      setFileName(file.name);

      const fileText = await file.text();

      // 1. JSON 유효성 1차 파싱 및 구조 유효성 검사
      const initialDraft = parseWorkflowTemplateImportJson(fileText, file.name);

      // 2. 저장 스키마 정합성 및 중복 검증
      const validatedDraft = validateWorkflowTemplateImport(initialDraft, existingTemplates);

      setDraft(validatedDraft);
      
      if (validatedDraft.diagnostics.severity === "error") {
        const firstError = validatedDraft.diagnostics.items.find(x => x.level === "error");
        setError(firstError ? firstError.message : "명세서 형식이 올바르지 않습니다.");
        playAppSound("error");
      } else {
        playAppSound("success");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "파일 처리 중 에러가 발생했습니다.");
      setDraft(null);
      playAppSound("error");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 진단 결과 레벨별 배지 클래스
  const getBadgeMeta = (level: "ok" | "warning" | "error") => {
    switch (level) {
      case "error":
        return { className: "ux_badge ux_badge_danger", label: "오류 (Error)" };
      case "warning":
        return { className: "ux_badge ux_badge_warning", label: "확인 필요 (Warning)" };
      case "ok":
      default:
        return { className: "ux_badge ux_badge_info", label: "정상 (Ok)" };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 타이틀 및 가이드 영역 */}
      <div>
        <h2 className="ux_section_title" style={{ margin: "0 0 4px 0" }}>
          📂 N8Lient 표준 Import JSON 불러오기
        </h2>
        <p style={{ fontSize: "12.5px", color: "#6b7280", margin: 0 }}>
          n8n 원본 JSON은 이 화면에서 직접 분석하지 않습니다. LLM 프롬프트 또는 외부 도구로 생성한 N8Lient 표준 Import JSON 파일을 업로드해 주세요.
        </p>
      </div>

      {/* 파일 드롭존 영역 */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        style={{
          border: dragActive ? "2px dashed #2563eb" : "2px dashed #d1d5db",
          borderRadius: "10px",
          padding: "36px 20px",
          textAlign: "center",
          backgroundColor: dragActive ? "#eff6ff" : "#f9fafb",
          transition: "all 0.15s ease",
          cursor: "pointer",
        }}
        onClick={onButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleChange}
          style={{ display: "none" }}
        />
        <div style={{ fontSize: "28px", marginBottom: "12px" }}>📄</div>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#374151", margin: "0 0 6px 0" }}>
          {fileName ? `선택된 파일: ${fileName}` : "표준 Import JSON 파일을 드래그하여 여기에 놓거나 클릭하여 업로드하세요"}
        </p>
        <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
          N8Lient 표준 Import JSON 규격(*.json) 명세 파일만 지원합니다.
        </p>
      </div>

      {/* 직접 입력으로 시작하기 빠른 버튼 */}
      {!draft && (
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <span style={{ fontSize: "13px", color: "#6b7280", marginRight: "12px" }}>
            Import 파일이 없으신가요?
          </span>
          <button
            className="ux_button ux_button_secondary"
            onClick={onDirectCreate}
            style={{
              borderRadius: "6px",
              padding: "6px 14px",
              fontSize: "12.5px",
            }}
          >
            ✏️ 빈 폼으로 직접 등록하기
          </button>
        </div>
      )}

      {/* 파싱/처리 도중 오류 발생 시 표시 */}
      {error && (
        <div className="ux_alert ux_alert_danger">
          ⚠️ {error}
        </div>
      )}

      {/* 가져오기 검증 표시 보드 */}
      {draft && (
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            padding: "20px",
          }}
        >
          {/* 1. 가져오기 명세 요약 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid #f3f4f6", paddingBottom: "16px" }}>
            <div style={{ flex: 1, minWidth: "150px" }}>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>워크플로우 명칭</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#111111", marginTop: "2px" }}>
                {draft.workflowTemplate.name || "지정되지 않음"}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: "120px" }}>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>가져올 식별 Key</div>
              <div style={{ fontSize: "13px", fontFamily: "monospace", fontWeight: 700, color: "#2563eb", marginTop: "2px" }}>
                {draft.workflowTemplate.workflowKey || "지정되지 않음"}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: "100px" }}>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>전체 진단 상태</div>
              <span
                className={getBadgeMeta(draft.diagnostics.severity).className}
                style={{ fontSize: "12px", fontWeight: 800, marginTop: "2px", padding: "2px 8px", borderRadius: "4px" }}
              >
                {getBadgeMeta(draft.diagnostics.severity).label}
              </span>
            </div>
          </div>

          {/* 2. 경고 고지 안내 문구 */}
          {draft.diagnostics.severity === "error" ? (
            <div className="ux_alert ux_alert_danger" style={{ fontSize: "12.5px" }}>
              <strong>⚠️ 안내:</strong> 현재 명세서 검증 결과에 수정이 필요한 오류가 존재합니다. 폼에 반영하여 이동한 뒤 빨간색 표시 항목을 정상적으로 수정해야 최종 저장이 활성화됩니다.
            </div>
          ) : draft.diagnostics.requiresWarningConfirmation ? (
            <div className="ux_alert ux_alert_warning" style={{ fontSize: "12.5px" }}>
              <strong>💡 안내:</strong> 일부 검토 경고(주황색) 항목이 있습니다. 폼으로 이동하여 설정값을 확인하고 필요에 따라 다듬어 주십시오.
            </div>
          ) : (
            <div className="ux_alert ux_alert_success" style={{ fontSize: "12.5px" }}>
              <strong>✓ 안내:</strong> 정합성 충돌 및 오류가 없는 안전한 명세서입니다. 아래 버튼을 눌러 등록 폼에 반영하십시오.
            </div>
          )}

          {/* 3. 진단 세부 항목 목록 */}
          <div>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
              🔍 저장 스키마 정합성 검증 상세 내역 ({draft.diagnostics.items.length}건)
            </h3>
            {draft.diagnostics.items.length === 0 ? (
              <div style={{ fontSize: "13px", color: "#6b7280", padding: "12px", textAlign: "center", border: "1px solid #f3f4f6", borderRadius: "6px" }}>
                진단 경고 및 충돌 내역이 없습니다. 깨끗한 상태입니다.
              </div>
            ) : (
              <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: "6px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ padding: "8px 12px", width: "180px", color: "#4b5563" }}>진단 필드</th>
                      <th style={{ padding: "8px 12px", width: "110px", color: "#4b5563" }}>구분</th>
                      <th style={{ padding: "8px 12px", color: "#4b5563" }}>상세 진단 안내 메시지</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.diagnostics.items.map((item, idx) => {
                      const badge = getBadgeMeta(item.level);
                      return (
                        <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#374151" }}>
                            {item.field}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span
                              className={badge.className}
                              style={{ fontSize: "11px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px" }}
                            >
                              {item.level === "error" ? "오류" : "확인 필요"}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", color: "#4b5563", lineHeight: 1.4 }}>
                            {item.message}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 4. 액션 버튼 영역 */}
          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
            <button
              className="ux_button ux_button_primary"
              onClick={() => onApplyDraft(draft)}
              style={{
                flex: 1,
                height: "38px",
                borderRadius: "6px",
                border: "none",
              }}
            >
              🚀 등록 폼에 적용 및 이동
            </button>
            <button
              className="ux_button ux_button_secondary"
              onClick={() => {
                setDraft(null);
                setFileName(null);
                setError(null);
              }}
              style={{
                height: "38px",
                borderRadius: "6px",
                padding: "0 16px",
              }}
            >
              다시 올리기
            </button>
          </div>
        </div>
      )}

      {/* 하단 뒤로가기 버튼 */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
        <button
          className="ux_button ux_button_secondary"
          onClick={onCancel}
          style={{
            height: "38px",
            backgroundColor: "#f3f4f6",
            borderRadius: "6px",
            padding: "0 16px",
          }}
        >
          목록으로 돌아가기
        </button>
      </div>
    </div>
  );
}
