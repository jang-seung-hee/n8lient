// 이 파일은 n8n 워크플로우 JSON 파일을 업로드하여 사전 분석 결과를 출력하고 정합성을 진단해 주는 컴포넌트입니다.
// 한국어 주석 표준을 준수합니다.

"use client";

import { useState, useRef } from "react";
import type { WorkflowTemplate } from "@/types/n8lient";
import {
  analyzeN8nWorkflow,
  validateWorkflowImport,
  type WorkflowTemplateImportDraft
} from "@/features/operator/workflowAnalyzer";
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

  // 파일 파싱 및 분석 메인 로직
  const processFile = async (file: File) => {
    try {
      setError(null);
      setFileName(file.name);

      const fileText = await file.text();
      let parsedJson: unknown;
      
      try {
        parsedJson = JSON.parse(fileText);
      } catch (err) {
        throw new Error("JSON 파싱에 실패했습니다. 올바른 워크플로우 JSON 형식인지 확인해 주십시오.");
      }

      // 1. JSON 분석 및 초안 생성
      const initialDraft = analyzeN8nWorkflow(parsedJson, {
        sourceFileName: file.name
      });

      // 2. 기존 템플릿과 충돌 검사
      const validatedDraft = validateWorkflowImport(initialDraft, existingTemplates);

      setDraft(validatedDraft);
      playAppSound("success");
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

  // 진단 결과 레벨별 배경색 및 텍스트 컬러 지정
  const getBadgeStyles = (level: "ok" | "warning" | "error") => {
    switch (level) {
      case "error":
        return { bg: "#fee2e2", color: "#b91c1c", label: "오류 (Error)" };
      case "warning":
        return { bg: "#ffedd5", color: "#c2410c", label: "확인 필요 (Warning)" };
      case "ok":
      default:
        return { bg: "#eff6ff", color: "#1d4ed8", label: "정상 (Ok)" };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 타이틀 및 가이드 영역 */}
      <div>
        <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
          📂 n8n JSON 워크플로우 분석 및 등록
        </h2>
        <p style={{ fontSize: "12.5px", color: "#6b7280", margin: 0 }}>
          n8n에서 내보내기(Export)한 JSON 파일을 업로드하면, 플랫폼에 최적화된 마스터 스키마 권장값을 자동으로 분석하여 폼에 반영해 줍니다.
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
          {fileName ? `선택된 파일: ${fileName}` : "n8n JSON 파일을 드래그하여 여기에 놓거나 클릭하여 업로드하세요"}
        </p>
        <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
          n8n 워크플로우 편집기에서 Export한 *.json 명세 파일만 지원합니다.
        </p>
      </div>

      {/* 직접 입력으로 시작하기 빠른 버튼 */}
      {!draft && (
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <span style={{ fontSize: "13px", color: "#6b7280", marginRight: "12px" }}>
            분석 파일이 없으신가요?
          </span>
          <button
            onClick={onDirectCreate}
            style={{
              backgroundColor: "#ffffff",
              color: "#111111",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "6px 14px",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ✏️ 빈 폼으로 직접 등록하기
          </button>
        </div>
      )}

      {/* 파싱/처리 도중 오류 발생 시 표시 */}
      {error && (
        <div
          style={{
            backgroundColor: "#fee2e2",
            border: "1px solid #fca5a5",
            borderRadius: "8px",
            padding: "12px 16px",
            fontSize: "13px",
            color: "#b91c1c",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* 분석 결과 진단 표시 보드 */}
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
          {/* 1. 분석 결과 요약 요약박스 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid #f3f4f6", paddingBottom: "16px" }}>
            <div style={{ flex: 1, minWidth: "150px" }}>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>워크플로우 명칭</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#111111", marginTop: "2px" }}>
                {draft.source.n8nWorkflowName || "지정되지 않음"}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: "120px" }}>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>권장 식별 Key</div>
              <div style={{ fontSize: "13px", fontFamily: "monospace", fontWeight: 700, color: "#2563eb", marginTop: "2px" }}>
                {draft.workflowTemplate.workflowKey || "imported-workflow"}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: "100px" }}>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>전체 진단 상태</div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  display: "inline-block",
                  marginTop: "2px",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  backgroundColor: getBadgeStyles(draft.diagnostics.severity).bg,
                  color: getBadgeStyles(draft.diagnostics.severity).color,
                }}
              >
                {getBadgeStyles(draft.diagnostics.severity).label}
              </div>
            </div>
          </div>

          {/* 2. 경고 고지 안내 문구 */}
          {draft.diagnostics.severity === "error" ? (
            <div style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "12px", borderRadius: "6px", fontSize: "12.5px" }}>
              <strong>⚠️ 안내:</strong> 현재 분석 결과에 수정이 필요한 오류가 존재합니다. 폼에 반영하여 이동한 뒤 빨간색 표시 항목을 정상적으로 수정해야 최종 저장이 활성화됩니다.
            </div>
          ) : draft.diagnostics.requiresWarningConfirmation ? (
            <div style={{ backgroundColor: "#ffedd5", color: "#9a3412", padding: "12px", borderRadius: "6px", fontSize: "12.5px" }}>
              <strong>💡 안내:</strong> 일부 권장 사항 및 검토 경고(주황색) 항목이 있습니다. 폼으로 이동하여 설정값을 확인하고 필요에 따라 다듬어 주십시오.
            </div>
          ) : (
            <div style={{ backgroundColor: "#ecfdf5", color: "#065f46", padding: "12px", borderRadius: "6px", fontSize: "12.5px" }}>
              <strong>✓ 안내:</strong> 정합성 충돌 및 오류가 없는 안전한 명세서입니다. 아래 버튼을 눌러 등록 폼에 반영하십시오.
            </div>
          )}

          {/* 3. 진단 세부 항목 목록 */}
          <div>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
              🔍 정합성 검사 진단 상세 내역 ({draft.diagnostics.items.length}건)
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
                      const badge = getBadgeStyles(item.level);
                      return (
                        <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#374151" }}>
                            {item.field}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: "4px",
                                backgroundColor: badge.bg,
                                color: badge.color,
                              }}
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
              onClick={() => onApplyDraft(draft)}
              style={{
                flex: 1,
                height: "38px",
                backgroundColor: "#111111",
                color: "#ffffff",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              🚀 등록 폼에 적용 및 이동
            </button>
            <button
              onClick={() => {
                setDraft(null);
                setFileName(null);
                setError(null);
              }}
              style={{
                height: "38px",
                backgroundColor: "#ffffff",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                padding: "0 16px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
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
          onClick={onCancel}
          style={{
            height: "38px",
            backgroundColor: "#f3f4f6",
            color: "#374151",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            padding: "0 16px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          목록으로 돌아가기
        </button>
      </div>
    </div>
  );
}
