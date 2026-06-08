// 이 파일은 시스템 운영자가 N8N 워크플로우(명세서)를 등록, 수정, 복제하고 Webhook 참조 논리 설정을 관리하는 마스터 화면입니다.
// 기존의 비즈니스 및 DB 연동 로직을 완벽히 보존한 채, List-Detail-Form 3단계 뷰 구조로 컴포넌트를 분리 조립하였습니다.

"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  getWorkflowTemplates,
  createWorkflowTemplate,
  updateWorkflowTemplate,
} from "@/features/operator/operatorService";
import type { WorkflowTemplate } from "@/types/n8lient";
import { siteConfig } from "@/config/siteConfig";

// 서브 컴포넌트 임포트
import { WorkflowList } from "./WorkflowList";
import { WorkflowDetail } from "./WorkflowDetail";
import { WorkflowForm } from "./WorkflowForm";

export default function OperatorTemplates() {
  // 1. 핵심 상태 제어 변수
  const [viewMode, setViewMode] = useState<"list" | "detail" | "form">("list");
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // 2. N8N 워크플로우 목록 로드
  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await getWorkflowTemplates(db);
      setTemplates(list);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "N8N 워크플로우 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // 3. 뷰 제어 및 액션 핸들러
  const handleSelect = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setViewMode("detail");
  };

  const handleCreateClick = () => {
    setSelectedTemplate(null);
    setIsEditMode(false);
    setViewMode("form");
  };

  const handleEditClick = () => {
    if (!selectedTemplate) return;
    setIsEditMode(true);
    setViewMode("form");
  };

  const handleCloneClick = () => {
    if (!selectedTemplate) return;
    setIsEditMode(false);
    // 복제 시에는 새 workflowKey를 사용자가 새로 입력해야 하므로 key를 비움
    const cloneTarget: WorkflowTemplate = {
      ...selectedTemplate,
      workflowKey: "",
      name: `${selectedTemplate.name} (복제본)`,
      shortName: `${selectedTemplate.shortName} 복제`,
      status: "draft",
      webhookSecretId: "",
    };
    setSelectedTemplate(cloneTarget);
    setViewMode("form");
    alert("N8N 워크플로우 설정이 폼에 복사되었습니다. 새로운 워크플로우 Key를 입력하여 신규 등록해 주십시오.");
  };

  const handleBackToList = () => {
    setSelectedTemplate(null);
    setViewMode("list");
  };

  // 4. 폼 등록/수정 서브밋 처리 (DB 연동 로직 완벽 보존)
  const handleFormSubmit = async (template: WorkflowTemplate) => {
    try {
      setLoading(true);
      if (isEditMode) {
        // 수정 모드: update 실행
        const res = await updateWorkflowTemplate(db, template.workflowKey, template);
        if (res.success) {
          alert(`N8N 워크플로우 [${template.name}] 수정 저장이 완료되었습니다.`);
          setViewMode("list");
          setSelectedTemplate(null);
          loadTemplates();
        } else {
          alert(res.message);
        }
      } else {
        // 등록/복제 모드: create 실행 (중복 체크 포함)
        const res = await createWorkflowTemplate(db, template);
        if (res.success) {
          alert(`N8N 워크플로우 [${template.name}] 등록이 완료되었습니다.`);
          setViewMode("list");
          setSelectedTemplate(null);
          loadTemplates();
        } else {
          alert(res.message);
        }
      }
    } catch (err: any) {
      alert("처리 도중 에러가 발생했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", position: "relative" }}>
      {/* 상단 헤더 영역 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
            📂 N8N 워크플로우 마스터
          </h2>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
            플랫폼 전체에 제공되는 N8N 워크플로우 명세의 inputSchema 및 설정 요구사항 스키마를 정의합니다.
          </p>
        </div>
        <button
          onClick={() => setShowHelpModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "20px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
          }}
        >
          ❓ 도움말
        </button>
      </div>

      {/* 도움말 모달 */}
      {showHelpModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "24px",
              width: "600px",
              maxWidth: "90%",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f3f4f6", paddingBottom: "12px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#111111", margin: 0 }}>
                💡 워크플로우 웹훅(Webhook) 매핑 가이드
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#9ca3af" }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontSize: "13.5px", color: "#374151", lineHeight: 1.6 }}>
              <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", padding: "14px", borderRadius: "8px" }}>
                <p style={{ margin: "0 0 6px 0", fontWeight: 700, color: "#1d4ed8", fontSize: "14px" }}>🎯 최종 웹훅 주소 조합 요약 예시</p>
                <p style={{ margin: 0, fontFamily: "monospace", fontSize: "13px", fontWeight: 700, color: "#b91c1c" }}>
                  https://n8n.rentaltalk.kr/webhook/n8lient-idea-catcher
                </p>
                <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#6b7280" }}>
                  (앞부분 도메인은 <strong>서버 식별 Key</strong>가 결정하고, 뒷부분 경로는 <strong>Webhook Secret 참조 ID</strong>가 결정합니다)
                </p>
              </div>

              <div>
                <p style={{ margin: "0 0 8px 0", fontWeight: 700, color: "#111111", borderBottom: "2px solid #e5e7eb", paddingBottom: "4px" }}>📌 각 팩터(Factor)의 역할 상세 설명</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <span style={{ fontWeight: 700, color: "#2563eb" }}>① 워크플로우 Key (workflowKey)</span>
                    <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "6px" }}>(예: `n8lient-idea-catcher`)</span>
                    <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#4b5563" }}>
                      • <strong>시스템 내부 DB 문서 매핑용 ID</strong>입니다. DB에서 워크플로우 정보나 계약 정보를 식별할 때 기준이 됩니다.<br />
                      • <strong>영문 소문자, 숫자, 하이픈(-)</strong>만 허용되며, 한 번 저장하면 수정할 수 없습니다.
                    </p>
                  </div>

                  <div>
                    <span style={{ fontWeight: 700, color: "#2563eb" }}>② n8n 서버 식별 Key (n8nServerKey)</span>
                    <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "6px" }}>(예: `main` ➡️ 대문자 변환 `MAIN`)</span>
                    <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#4b5563" }}>
                      • 호출할 n8n 서버의 <strong>기본 도메인</strong>을 지정합니다.<br />
                      • 입력창에는 소문자 <code style={{ fontWeight: 600 }}>main</code>이라고만 적어두면, 서버에서 자동으로 대문자로 변환하여 환경변수 중 <code style={{ backgroundColor: "#f3f4f6", padding: "2px 4px", borderRadius: "4px", fontSize: "12px" }}>N8N_SERVER_MAIN_BASE_URL</code> 값을 찾아 읽어옵니다.
                    </p>
                  </div>

                  <div>
                    <span style={{ fontWeight: 700, color: "#2563eb" }}>③ Webhook Secret 참조 ID (webhookSecretId)</span>
                    <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "6px" }}>(예: `n8lient-idea-catcher` ➡️ 대문자/언더스코어 변환 `N8LIENT_IDEA_CATCHER`)</span>
                    <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#4b5563" }}>
                      • 호출할 <strong>웹훅 경로</strong>가 담겨있는 환경변수 이름을 가리킵니다.<br />
                      • 입력창에 소문자 <code style={{ fontWeight: 600 }}>n8lient-idea-catcher</code>로 적어두면 자동으로 변환되어 환경변수 중 <code style={{ backgroundColor: "#f3f4f6", padding: "2px 4px", borderRadius: "4px", fontSize: "12px" }}>N8N_WEBHOOK_PATH_N8LIENT_IDEA_CATCHER</code> 값을 읽어옵니다.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p style={{ margin: "0 0 8px 0", fontWeight: 700, color: "#111111", borderBottom: "2px solid #e5e7eb", paddingBottom: "4px" }}>🛡️ 웹훅 경로를 DB에 바로 적지 않고 환경변수로 매핑하는 이유</p>
                <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#4b5563" }}>
                  <li style={{ marginBottom: "6px" }}>
                    <strong>보안 및 권한 노출 차단:</strong> Firestore DB의 필드 값은 보안 규칙 상 일반 클라이언트 사용자나 브라우저 개발자 도구에 노출되기 쉽습니다. 환경변수로 관리하면 실제 웹훅 경로는 <strong>서버리스 API 안에서만 조립</strong>되므로 절대 외부에 노출되지 않습니다.
                  </li>
                  <li style={{ marginBottom: "6px" }}>
                    <strong>다중 환경 지원:</strong> n8n은 테스트 시 웹훅 주소 중간에 <code style={{ fontWeight: 600 }}>/webhook-test/</code>가 들어가고 운영 시에는 <code style={{ fontWeight: 600 }}>/webhook/</code>으로 바뀝니다. 경로를 환경변수로 분리해 놓으면, DB 데이터를 한 번도 바꾸지 않고도 로컬/운영 설정 파일(`.env`)만 바꾸어 바로 대응할 수 있습니다.
                  </li>
                </ul>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <button
                onClick={() => setShowHelpModal(false)}
                style={{
                  backgroundColor: "#111111",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "6px", fontSize: "13px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* 가이드 안내 영역 */}
      <div style={{ backgroundColor: "#f3f4f6", borderLeft: "4px solid #111111", padding: "12px 16px", borderRadius: "4px", fontSize: "12.5px", color: "#4b5563", lineHeight: 1.5 }}>
        <p style={{ margin: "0 0 4px 0", fontWeight: 700 }}>🔒 보안 및 일관성 보호 가이드</p>
        <p style={{ margin: "0 0 4px 0" }}>• Webhook URL은 보안상 Firestore에 저장하지 않습니다. N8N 워크플로우 명세에는 <code style={{ fontFamily: "monospace", backgroundColor: "#e5e7eb", padding: "2px 4px", borderRadius: "2px" }}>n8nServerKey</code>와 <code style={{ fontFamily: "monospace", backgroundColor: "#e5e7eb", padding: "2px 4px", borderRadius: "2px" }}>webhookSecretId</code> 같은 참조값만 저장하며, 실제 URL 및 토큰은 서버리스 실행 게이트웨이의 환경변수/Secret 저장소에서 관리합니다.</p>
        <p style={{ margin: "0 0 4px 0" }}>• 배포 완료(<code style={{ color: "#065f46", fontWeight: 600 }}>published</code>) 상태의 기존 워크플로우는 기존 회사 설정값과의 충돌을 방지하기 위해 <code style={{ fontWeight: 600 }}>workflowKey</code> 및 기존 설정 필드 <code style={{ fontWeight: 600 }}>key</code>의 수정/삭제가 제한됩니다.</p>
        <p style={{ margin: 0 }}>• 큰 구조 변경이 필요할 경우, 우측 목록에서 <strong>[복제]</strong>를 클릭하여 새로운 워크플로우 Key를 부여해 신규 등록하십시오.</p>
      </div>

      {viewMode === "list" && (
        <WorkflowList
          templates={templates}
          loading={loading}
          onSelect={handleSelect}
          onCreateClick={handleCreateClick}
        />
      )}

      {viewMode === "detail" && selectedTemplate && (
        <WorkflowDetail
          template={selectedTemplate}
          onEditClick={handleEditClick}
          onCloneClick={handleCloneClick}
          onBackClick={handleBackToList}
        />
      )}

      {viewMode === "form" && (
        <WorkflowForm
          initialData={selectedTemplate}
          isEditMode={isEditMode}
          onSubmit={handleFormSubmit}
          onCancel={handleBackToList}
          loading={loading}
        />
      )}
    </div>
  );
}
