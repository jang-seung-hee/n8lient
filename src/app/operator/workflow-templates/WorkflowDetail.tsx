// 이 파일은 선택된 N8N 워크플로우의 상세 명세(기본 정보, 입력 스키마, 설정값 스키마)를 조회하는 서브 컴포넌트입니다.

"use client";

import type { WorkflowTemplate } from "@/types/n8lient";

interface WorkflowDetailProps {
  template: WorkflowTemplate;
  onEditClick: () => void;
  onCloneClick: () => void;
  onBackClick: () => void;
}

export function WorkflowDetail({
  template,
  onEditClick,
  onCloneClick,
  onBackClick,
}: WorkflowDetailProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
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
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#111111", margin: 0 }}>
              {template.name} 상세 명세
            </h2>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0 0" }}>
              Key: {template.workflowKey} · v{template.version}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onCloneClick}
            style={{
              backgroundColor: "#eff6ff",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
              borderRadius: "6px",
              padding: "6px 14px",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            📋 워크플로우 복제
          </button>
          <button
            onClick={onEditClick}
            style={{
              backgroundColor: "#111111",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              padding: "6px 14px",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ⚙️ 명세 수정
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
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
                <span style={{ fontWeight: 600, color: "#111111" }}>{template.inputSchema.acceptedInputTypes.join(", ")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>허용 파일 확장자</span>
                <span style={{ fontWeight: 600, color: "#111111", fontFamily: "monospace" }}>
                  {template.inputSchema.allowedFileTypes?.join(", ") || "없음"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>최대 업로드 제한 크기</span>
                <span style={{ fontWeight: 600, color: "#111111" }}>{template.inputSchema.maxFileSizeMB || 50} MB</span>
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
