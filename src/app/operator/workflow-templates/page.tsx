// 이 파일은 시스템 운영자가 공용 자동화 템플릿(명세서)을 등록, 수정, 복제하고 Webhook 참조 논리 설정을 관리하는 화면입니다.

"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  getWorkflowTemplates,
  createWorkflowTemplate,
  updateWorkflowTemplate,
} from "@/features/operator/operatorService";
import type { WorkflowTemplate, ConfigSchemaField } from "@/types/n8lient";
import { siteConfig } from "@/config/siteConfig";

export default function OperatorTemplates() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 수정/복제 제어 상태
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalSchemaKeys, setOriginalSchemaKeys] = useState<Set<string>>(new Set());
  const [originalStatus, setOriginalStatus] = useState<"draft" | "published" | "disabled" | null>(null);

  // 템플릿 신규 등록 / 수정 폼 상태
  const [workflowKey, setWorkflowKey] = useState("");
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [status, setStatus] = useState<"draft" | "published" | "disabled">("published");
  
  // Webhook 논리 참조 및 서버 키 추가
  const [webhookSecretId, setWebhookSecretId] = useState("");
  const [n8nServerKey, setN8nServerKey] = useState("main");
  
  // inputSchema 상태
  const [acceptedTypes, setAcceptedTypes] = useState<string[]>(["text"]);
  const [allowedFileTypesStr, setAllowedFileTypesStr] = useState("pdf, jpg, png, xlsx");
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(50);

  // configSchema 동적 필드 상태
  const [schemaFields, setSchemaFields] = useState<ConfigSchemaField[]>([]);

  // 도움말 모달 활성화 상태
  const [showHelpModal, setShowHelpModal] = useState(false);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await getWorkflowTemplates(db);
      setTemplates(list);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "템플릿 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // workflowKey 입력 핸들러 (입력에 따라 webhookSecretId 기본값 동시 세팅)
  const handleWorkflowKeyChange = (val: string) => {
    setWorkflowKey(val);
    if (!isEditMode) {
      // 복제 또는 신규 생성 시에는 기본값으로 workflowKey와 동일하게 매핑
      setWebhookSecretId(val);
    }
  };

  // 동적 필드 추가
  const handleAddField = () => {
    const newField: ConfigSchemaField = {
      key: "",
      label: "",
      type: "text",
      required: true,
      defaultValue: "",
      defaultValueSource: "",
      options: [],
    };
    setSchemaFields([...schemaFields, newField]);
  };

  // 동적 필드 삭제
  const handleRemoveField = (index: number) => {
    const targetField = schemaFields[index];
    // 기존에 저장된 필드이며 원본 상태가 published인 경우 삭제 불가 가이드
    if (isEditMode && originalStatus === "published" && originalSchemaKeys.has(targetField.key)) {
      alert("배포 일관성 보호 정책에 의해, 이미 배포 완료(published)된 템플릿의 기존 설정 필드 Key는 삭제할 수 없습니다. 큰 변경은 복제 기능을 사용하십시오.");
      return;
    }
    const next = [...schemaFields];
    next.splice(index, 1);
    setSchemaFields(next);
  };

  // 동적 필드 속성 편집
  const handleFieldChange = (index: number, keyProp: keyof ConfigSchemaField, val: any) => {
    const targetField = schemaFields[index];
    // 기존에 저장된 필드이며 원본 상태가 published인데 key를 수정하려고 하는 경우 차단
    if (keyProp === "key" && isEditMode && originalStatus === "published" && originalSchemaKeys.has(targetField.key)) {
      alert("배포 일관성 보호 정책에 의해, 이미 배포 완료(published)된 템플릿의 기존 설정 필드 Key는 수정할 수 없습니다. 큰 변경은 복제 기능을 사용하십시오.");
      return;
    }
    const next = [...schemaFields];
    next[index] = {
      ...next[index],
      [keyProp]: val,
    };
    setSchemaFields(next);
  };

  // 폼 초기화 (취소 시 호출)
  const handleResetForm = () => {
    setIsEditMode(false);
    setOriginalSchemaKeys(new Set());
    setOriginalStatus(null);
    setWorkflowKey("");
    setName("");
    setShortName("");
    setDescription("");
    setVersion("1.0.0");
    setStatus("published");
    setWebhookSecretId("");
    setN8nServerKey("main");
    setAcceptedTypes(["text"]);
    setAllowedFileTypesStr("pdf, jpg, png, xlsx");
    setMaxFileSizeMB(50);
    setSchemaFields([]);
  };

  // 수정 로드
  const handleStartEdit = (template: WorkflowTemplate) => {
    setIsEditMode(true);
    // 수정 방지 대상 기존 키 저장
    setOriginalSchemaKeys(new Set(template.configSchema.map((f) => f.key)));
    setOriginalStatus(template.status);

    setWorkflowKey(template.workflowKey);
    setName(template.name);
    setShortName(template.shortName);
    setDescription(template.description || "");
    setVersion(template.version);
    setStatus(template.status);
    setWebhookSecretId(template.webhookSecretId);
    setN8nServerKey(template.n8nServerKey || "main");
    setAcceptedTypes(template.inputSchema.acceptedInputTypes);
    setAllowedFileTypesStr(template.inputSchema.allowedFileTypes?.join(", ") || "");
    setMaxFileSizeMB(template.inputSchema.maxFileSizeMB || 50);
    setSchemaFields(template.configSchema);
  };

  // 복제 로드
  const handleStartClone = (template: WorkflowTemplate) => {
    setIsEditMode(false);
    setOriginalSchemaKeys(new Set()); // 복제 시에는 모든 설정 키를 수정/삭제할 수 있으므로 비움
    setOriginalStatus(null);

    setWorkflowKey(""); // 새 workflowKey를 지정하게 함 (3번 조건)
    setName(`${template.name} (복제본)`);
    setShortName(`${template.shortName} 복제`);
    setDescription(template.description || "");
    setVersion(template.version);
    setStatus("draft"); // 복제본은 초기에 안전하게 draft 상태로 로드
    setWebhookSecretId("");
    setN8nServerKey(template.n8nServerKey || "main");
    setAcceptedTypes(template.inputSchema.acceptedInputTypes);
    setAllowedFileTypesStr(template.inputSchema.allowedFileTypes?.join(", ") || "");
    setMaxFileSizeMB(template.inputSchema.maxFileSizeMB || 50);
    setSchemaFields(template.configSchema);
    alert("템플릿 설정이 폼에 복사되었습니다. 새로운 자동화 Key를 입력하여 신규 등록해 주십시오.");
  };

  // 수동 템플릿 등록/수정 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. workflowKey 영문 소문자, 숫자, 하이픈 검증
    const keyRegex = /^[a-z0-9-]+$/;
    if (!keyRegex.test(workflowKey)) {
      alert("자동화 Key는 영문 소문자, 숫자, 하이픈(-)만 허용합니다. (예: expense-report)");
      return;
    }

    // 2. configSchema.key 검증
    const schemaKeys = new Set<string>();
    const keyPattern = /^[a-zA-Z0-9]+$/; // 공백, 한글, 특수문자 금지

    for (let i = 0; i < schemaFields.length; i++) {
      const field = schemaFields[i];
      const trimmedKey = field.key.trim();

      if (!trimmedKey) {
        alert(`${i + 1}번째 설정 필드의 Key가 비어 있습니다. 입력해 주십시오.`);
        return;
      }

      if (!keyPattern.test(trimmedKey)) {
        alert(`${i + 1}번째 설정 필드 Key(${trimmedKey})에 허용되지 않는 한글, 공백, 또는 특수문자가 포함되어 있습니다. (영문/숫자만 허용)`);
        return;
      }

      if (schemaKeys.has(trimmedKey)) {
        alert(`설정 필드 Key 중복 오류: 중복되는 Key '${trimmedKey}'가 존재합니다.`);
        return;
      }
      schemaKeys.add(trimmedKey);
    }

    // 파일 유형 파싱
    const allowedFileTypes = allowedFileTypesStr
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);

    const template: WorkflowTemplate = {
      workflowKey,
      name,
      shortName,
      description: description || undefined,
      version,
      status,
      webhookSecretId: webhookSecretId.trim() || workflowKey, // 비어있으면 workflowKey 지정
      n8nServerKey: n8nServerKey.trim() || "main",
      configSchemaVersion: 1,
      inputSchema: {
        acceptedInputTypes: acceptedTypes as Array<"text" | "file" | "audio" | "image">,
        allowedFileTypes,
        maxFileSizeMB,
      },
      configSchema: schemaFields,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      setLoading(true);

      if (isEditMode) {
        // 수정 모드: update 실행
        const res = await updateWorkflowTemplate(db, workflowKey, template);
        if (res.success) {
          alert(`자동화 템플릿 [${name}] 수정 저장이 완료되었습니다.`);
          handleResetForm();
          loadTemplates();
        } else {
          alert(res.message);
        }
      } else {
        // 등록 모드: create 실행 (중복 체크 포함)
        const res = await createWorkflowTemplate(db, template);
        if (res.success) {
          alert(`자동화 템플릿 [${name}] 등록이 완료되었습니다.`);
          handleResetForm();
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

  const handleCheckboxChange = (type: string, checked: boolean) => {
    if (checked) {
      setAcceptedTypes([...acceptedTypes, type]);
    } else {
      setAcceptedTypes(acceptedTypes.filter((t) => t !== type));
    }
  };

  // 개발자용 테스트 샘플 데이터 등록
  const handleRegisterSample = async () => {
    const sampleTemplate: WorkflowTemplate = {
      workflowKey: "expense-report",
      name: "지출결의서 자동 정리",
      shortName: "지결자",
      description: "지출결의서 관련 자료를 정리하고 회계 담당자에게 전달합니다.",
      version: "1.0.0",
      status: "published",
      webhookSecretId: "expense-report",
      n8nServerKey: "main",
      configSchemaVersion: 1,
      inputSchema: {
        acceptedInputTypes: ["text", "file"],
        allowedFileTypes: ["pdf", "jpg", "png", "xlsx"],
        maxFileSizeMB: 50,
      },
      configSchema: [
        {
          key: "googleDriveId",
          label: "구글드라이브 ID",
          type: "text",
          required: true,
          placeholder: "자료를 업로드할 구글 드라이브 폴더 고유 ID",
        },
        {
          key: "googleSheetId",
          label: "구글시트 ID",
          type: "text",
          required: true,
          placeholder: "내역이 기록될 구글 스프레드시트 고유 ID",
        },
        {
          key: "accountantEmail",
          label: "회계담당 이메일",
          type: "email",
          required: true,
          placeholder: "회계 부서 담당자 메일 주소",
        },
        {
          key: "userEmail",
          label: "사용자 이메일",
          type: "email",
          required: true,
          defaultValueSource: "auth.email",
          placeholder: "기본 제출자 이메일 주소",
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      setLoading(true);
      const res = await createWorkflowTemplate(db, sampleTemplate);
      if (res.success) {
        alert("샘플 템플릿(지결자)이 Firestore에 성공적으로 등록되었습니다.");
        loadTemplates();
      } else {
        alert(`등록 실패: ${res.message}`);
      }
    } catch (err: any) {
      alert(`에러 발생: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
            📋 자동화 템플릿(Templates) 관리
          </h2>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
            플랫폼 전체에 제공되는 자동화 명세서의 inputSchema 및 설정 요구사항 스키마를 정의합니다.
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
                💡 자동화 웹훅(Webhook) 매핑 가이드
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
                  https://n8n.rentaltalk.kr/webhook-test/idea-catcher
                </p>
                <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#6b7280" }}>
                  (앞부분 도메인은 <strong>서버 식별 Key</strong>가 결정하고, 뒷부분 경로는 <strong>Webhook Secret 참조 ID</strong>가 결정합니다)
                </p>
              </div>

              <div>
                <p style={{ margin: "0 0 8px 0", fontWeight: 700, color: "#111111", borderBottom: "2px solid #e5e7eb", paddingBottom: "4px" }}>📌 각 팩터(Factor)의 역할 상세 설명</p>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <span style={{ fontWeight: 700, color: "#2563eb" }}>① 자동화 Key (workflowKey)</span>
                    <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "6px" }}>(예: `idea-catcher`)</span>
                    <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#4b5563" }}>
                      • <strong>시스템 내부 DB 문서 매핑용 ID</strong>입니다. DB에서 템플릿 정보나 계약 정보를 식별할 때 기준이 됩니다.<br />
                      • <strong>영문 소문자, 숫자, 하이픈(-)</strong>만 허용되며, 한 번 저장하면 수정할 수 없습니다.
                    </p>
                  </div>

                  <div>
                    <span style={{ fontWeight: 700, color: "#2563eb" }}>② n8n 서버 식별 Key (n8nServerKey)</span>
                    <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "6px" }}>(예: `main` ➡️ 대문자 변환 `MAIN`)</span>
                    <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#4b5563" }}>
                      • 호출할 n8n 서버의 <strong>기본 도메인</strong>을 지정합니다.<br />
                      • 입력창에는 소문자 <code style={{ fontWeight: 600 }}>main</code>이라고만 적어두면, 서버에서 자동으로 대문자로 변환하여 환경변수 중 <code style={{ backgroundColor: "#f3f4f6", padding: "2px 4px", borderRadius: "4px", fontSize: "12px" }}>N8N_SERVER_MAIN_BASE_URL</code> 값을 찾아 읽어옵니다.<br />
                      • <strong>차후 확장성(Scale-out) 고려:</strong> 단일 서버 운영 시에는 <code style={{ fontWeight: 600 }}>main</code>으로 충분하지만, 추후 트래픽 증가나 부하 분산을 위해 n8n 서버를 2대 이상(예: sub, batch 등) 확장하여 병렬 운영할 경우, 이 값을 변경하여 작업 성격별로 호출할 n8n 서버를 동적으로 지정할 수 있도록 설계된 아키텍처 옵션입니다.
                    </p>
                  </div>

                  <div>
                    <span style={{ fontWeight: 700, color: "#2563eb" }}>③ Webhook Secret 참조 ID (webhookSecretId)</span>
                    <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "6px" }}>(예: `idea-catcher` ➡️ 대문자/언더스코어 변환 `IDEA_CATCHER`)</span>
                    <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#4b5563" }}>
                      • 호출할 <strong>웹훅 경로</strong>가 담겨있는 환경변수 이름을 가리킵니다.<br />
                      • 입력창에 소문자 <code style={{ fontWeight: 600 }}>idea-catcher</code>로 적어두면 자동으로 변환되어 환경변수 중 <code style={{ backgroundColor: "#f3f4f6", padding: "2px 4px", borderRadius: "4px", fontSize: "12px" }}>N8N_WEBHOOK_PATH_IDEA_CATCHER</code> 값을 읽어옵니다.<br />
                      • <strong>실무적 용도 및 한계:</strong> 새로운 환경변수를 추가하고 서버를 재기동하면 되므로 일반적인 상황에서는 자동화 Key와 똑같이 적어 1:1 매핑하여 사용하면 됩니다. 다만, 서비스 중단을 허용할 수 없어 서버의 환경변수 재시작이 곤란할 때 기존에 등록되어 있는 환경변수 값을 그대로 빌려서 호출 주소를 재사용하고자 하는 특수한 실무 케이스에서 주로 활용되며, 기본적으로는 다르게 지정하여 쓸 일이 거의 없습니다.
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
                  <li>
                    <strong>주소 난수화:</strong> 악의적인 웹훅 무단 호출을 막기 위해 운영 서버에서 주소 뒤에 난수(예: `/webhook/idea-catcher-8f1a2b`)를 붙여야 할 때, 코드나 DB 데이터 수정 없이 환경변수 수정만으로 보안 주소 변경이 가능합니다.
                  </li>
                </ul>
              </div>

              <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "8px", padding: "14px", fontSize: "13px", color: "#78350f" }}>
                <p style={{ margin: "0 0 6px 0", fontWeight: 700 }}>💡 헷갈림 방지를 위한 실제 실무 운영 예시 (경로 공유와 서버 무중단)</p>
                <p style={{ margin: "0 0 8px 0" }}>
                  <strong>Q. 왜 매번 환경변수를 새로 파지 않고 기존 웹훅 경로를 빌려 쓰나요?</strong><br />
                  A. 새로운 자동화 기능(예: 기존 지출결의서 기능에 AI 영수증 분석을 추가한 <code style={{ fontWeight: 600 }}>expense-report-v2</code>)을 릴리즈해야 한다고 가정해 봅시다.
                </p>
                <ol style={{ margin: "0 0 8px 0", paddingLeft: "20px" }}>
                  <li style={{ marginBottom: "4px" }}>
                    <strong>서버 무중단 배포:</strong> 클라우드 플랫폼에서 새로운 환경변수(<code style={{ fontWeight: 600 }}>N8N_WEBHOOK_PATH_EXPENSE_REPORT_V2</code>)를 추가하고 적용하려면 서버를 멈추거나 재빌드/배포해야 합니다. 하지만 기존 웹훅 경로 환경변수(<code style={{ fontWeight: 600 }}>expense-report</code>)를 재사용하도록 포인터를 연결해 두면, <strong>서버 재배포 없이 웹화면 조작만으로 신규 서비스 즉시 출시가 가능</strong>합니다.
                  </li>
                  <li>
                    <strong>n8n 워크플로우 파편화 방지:</strong> 자동화 버전이 늘어날 때마다 n8n 웹훅 주소를 1:1로 계속 파면, n8n 대시보드에 수십 개의 유사 워크플로우가 생겨 관리가 힘들어집니다. n8n 웹훅 경로를 공유하면 n8n 측에서는 하나의 큰 메인 워크플로우만 두고 들어오는 데이터 속의 자동화 Key를 판별하여 분기 처리할 수 있습니다.
                  </li>
                </ol>
                <p style={{ margin: 0 }}>
                  ➡️ <strong>작성 요령:</strong> 나 홀로 테스트 개발 단계에서는 자동화 Key와 Webhook Secret 참조 ID를 <strong>완전히 똑같이 적어서 1:1로 매핑</strong>하여 쉽게 사용하고, 위와 같이 운영 안정성과 무중단 관리가 필요한 비즈니스 출시 단계에서만 다르게 지정하여 사용하면 됩니다.
                </p>
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
        <p style={{ margin: "0 0 4px 0" }}>• Webhook URL은 보안상 Firestore에 저장하지 않습니다. 템플릿에는 <code style={{ fontFamily: "monospace", backgroundColor: "#e5e7eb", padding: "2px 4px", borderRadius: "2px" }}>n8nServerKey</code>와 <code style={{ fontFamily: "monospace", backgroundColor: "#e5e7eb", padding: "2px 4px", borderRadius: "2px" }}>webhookSecretId</code> 같은 참조값만 저장하며, 실제 URL 및 토큰은 서버리스 실행 게이트웨이의 환경변수/Secret 저장소에서 관리합니다.</p>
        <p style={{ margin: "0 0 4px 0" }}>• 배포 완료(<code style={{ color: "#065f46", fontWeight: 600 }}>published</code>) 상태의 기존 템플릿은 기존 회사 설정값과의 충돌을 방지하기 위해 <code style={{ fontWeight: 600 }}>workflowKey</code> 및 기존 설정 필드 <code style={{ fontWeight: 600 }}>key</code>의 수정/삭제가 제한됩니다.</p>
        <p style={{ margin: 0 }}>• 큰 구조 변경이 필요할 경우, 우측 목록에서 <strong>[복제]</strong>를 클릭하여 새로운 자동화 Key를 부여해 신규 등록하십시오.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px", alignItems: "flex-start" }}>
        
        {/* 등록 및 수정 폼 */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "20px",
          }}
        >
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111111", margin: "0 0 16px 0", borderBottom: "1px solid #f3f4f6", paddingBottom: "10px" }}>
            {isEditMode ? "⚙️ 자동화 템플릿 수정" : "➕ 새 자동화 템플릿 등록"}
          </h3>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>자동화 Key * (영문소문자/숫자/-)</label>
                <input
                  type="text"
                  value={workflowKey}
                  onChange={(e) => handleWorkflowKeyChange(e.target.value)}
                  placeholder="예: expense-report"
                  required
                  disabled={isEditMode} // 수정 시 key 변경 차단 (4번 조건)
                  style={{
                    height: "36px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    padding: "0 8px",
                    fontSize: "13px",
                    outline: "none",
                    color: isEditMode ? "#9ca3af" : "#111111",
                    backgroundColor: isEditMode ? "#f3f4f6" : "#ffffff"
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>자동화 이름 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 지출결의서 자동 정리"
                  required
                  style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", color: "#111111" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr 1fr", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>줄임말 *</label>
                <input
                  type="text"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  placeholder="예: 지결자"
                  required
                  style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", color: "#111111" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>버전 *</label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.0.0"
                  required
                  style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", color: "#111111" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>배포 상태 *</label>
                <select
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", backgroundColor: "#ffffff", color: "#111111" }}
                >
                  <option value="published">배포완료 (published)</option>
                  <option value="draft">작성중 (draft)</option>
                  <option value="disabled">비활성 (disabled)</option>
                </select>
              </div>
            </div>

            {/* Webhook 참조값 및 n8n 서버 키 입력 단락 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>Webhook Secret 참조 ID *</label>
                <input
                  type="text"
                  value={webhookSecretId}
                  onChange={(e) => setWebhookSecretId(e.target.value)}
                  placeholder="예: expense-report"
                  required
                  style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", color: "#111111" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>n8n 서버 식별 Key *</label>
                <input
                  type="text"
                  value={n8nServerKey}
                  onChange={(e) => setN8nServerKey(e.target.value)}
                  placeholder="main"
                  required
                  style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", color: "#111111" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>설명</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="자동화 명세에 관한 상세 설명을 적으십시오."
                style={{ minHeight: "40px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "6px 8px", fontSize: "13px", outline: "none", color: "#111111", resize: "vertical" }}
              />
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "4px 0" }} />
            <h4 style={{ fontSize: "12.5px", fontWeight: 700, color: "#374151", margin: 0 }}>⚙️ inputSchema (입력 정보 요구사항)</h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>허용 입력 형태 (다중 선택 가능)</span>
              <div style={{ display: "flex", gap: "16px", fontSize: "13px" }}>
                {["text", "file", "audio", "image"].map((type) => (
                  <label key={type} style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", color: "#111111" }}>
                    <input
                      type="checkbox"
                      checked={acceptedTypes.includes(type)}
                      onChange={(e) => handleCheckboxChange(type, e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>허용 파일 확장자 (쉼표 구분)</label>
                <input
                  type="text"
                  value={allowedFileTypesStr}
                  onChange={(e) => setAllowedFileTypesStr(e.target.value)}
                  placeholder="pdf, jpg, png, xlsx"
                  style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", color: "#111111" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>최대 파일 크기 (MB)</label>
                <input
                  type="number"
                  value={maxFileSizeMB}
                  onChange={(e) => setMaxFileSizeMB(Number(e.target.value))}
                  required
                  style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", color: "#111111" }}
                />
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "4px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ fontSize: "12.5px", fontWeight: 700, color: "#374151", margin: 0 }}>⚙️ configSchema (설정 맵핑 요구사항)</h4>
              <button
                type="button"
                onClick={handleAddField}
                style={{ fontSize: "11px", fontWeight: 600, color: "#2563eb", background: "none", border: "none", cursor: "pointer" }}
              >
                ＋ 설정 필드 추가
              </button>
            </div>

            {/* 동적 configSchema 설정 필드 편집기 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {schemaFields.length === 0 ? (
                <p style={{ fontSize: "12px", color: "#9ca3af", textAlign: "center", margin: "8px 0" }}>
                  지정된 설정 요구사항이 없습니다. 필드를 추가해 주십시오.
                </p>
              ) : (
                schemaFields.map((field, idx) => {
                  const isExistingField = isEditMode && originalStatus === "published" && originalSchemaKeys.has(field.key);

                  return (
                    <div
                      key={idx}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        padding: "10px",
                        backgroundColor: "#f9fafb",
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {/* 기존 필드가 아닌 신규 필드일 때만 제거(Remove) 버튼 노출 (4번 조건) */}
                      {!isExistingField && (
                        <button
                          type="button"
                          onClick={() => handleRemoveField(idx)}
                          style={{
                            position: "absolute",
                            top: "6px",
                            right: "8px",
                            border: "none",
                            background: "none",
                            color: "#ef4444",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          제거
                        </button>
                      )}

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginRight: "32px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "#4b5563" }}>설정 Key * (영문/숫자)</span>
                          <input
                            type="text"
                            value={field.key}
                            onChange={(e) => handleFieldChange(idx, "key", e.target.value)}
                            placeholder="예: googleDriveId"
                            required
                            disabled={isExistingField} // 기존에 이미 등록된 필드키는 변조 금지 (4번 조건)
                            style={{
                              height: "30px",
                              border: "1px solid #d1d5db",
                              borderRadius: "4px",
                              padding: "0 6px",
                              fontSize: "12px",
                              outline: "none",
                              color: isExistingField ? "#9ca3af" : "#111111",
                              backgroundColor: isExistingField ? "#f3f4f6" : "#ffffff"
                            }}
                          />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "#4b5563" }}>라벨 이름 *</span>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => handleFieldChange(idx, "label", e.target.value)}
                            placeholder="예: 구글 드라이브 ID"
                            required
                            style={{ height: "30px", border: "1px solid #d1d5db", borderRadius: "4px", padding: "0 6px", fontSize: "12px", outline: "none", color: "#111111" }}
                          />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "#4b5563" }}>인풋 타입</span>
                          <select
                            value={field.type}
                            onChange={(e: any) => handleFieldChange(idx, "type", e.target.value)}
                            style={{ height: "30px", border: "1px solid #d1d5db", borderRadius: "4px", padding: "0 4px", fontSize: "12px", outline: "none", backgroundColor: "#ffffff", color: "#111111" }}
                          >
                            <option value="text">text</option>
                            <option value="email">email</option>
                            <option value="number">number</option>
                            <option value="boolean">boolean</option>
                            <option value="select">select</option>
                            <option value="textarea">textarea</option>
                            <option value="secret">secret</option>
                          </select>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "#4b5563" }}>기본값 출처</span>
                          <input
                            type="text"
                            value={field.defaultValueSource || ""}
                            onChange={(e) => handleFieldChange(idx, "defaultValueSource", e.target.value)}
                            placeholder="예: auth.email"
                            style={{ height: "30px", border: "1px solid #d1d5db", borderRadius: "4px", padding: "0 6px", fontSize: "12px", outline: "none", color: "#111111" }}
                          />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", height: "100%", marginTop: "16px" }}>
                          <input
                            type="checkbox"
                            id={`required-${idx}`}
                            checked={field.required}
                            onChange={(e) => handleFieldChange(idx, "required", e.target.checked)}
                            style={{ cursor: "pointer" }}
                          />
                          <label htmlFor={`required-${idx}`} style={{ fontSize: "11px", fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                            필수 입력 항목
                          </label>
                        </div>
                      </div>

                      {field.type === "select" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "#4b5563" }}>셀렉트 옵션 리스트 (쉼표 구분)</span>
                          <input
                            type="text"
                            value={field.options?.join(", ") || ""}
                            onChange={(e) => handleFieldChange(idx, "options", e.target.value.split(",").map(x => x.trim()).filter(Boolean))}
                            placeholder="옵션1, 옵션2, 옵션3"
                            style={{ height: "30px", border: "1px solid #d1d5db", borderRadius: "4px", padding: "0 6px", fontSize: "12px", outline: "none", color: "#111111" }}
                          />
                        </div>
                      )}

                      {/* 6번 조건: 신규 필드 추가 시 required: true이면 기존 회사 설정값과 충돌할 수 있다는 경고 표시 */}
                      {isEditMode && !isExistingField && field.required && (
                        <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fcd34d", color: "#78350f", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500 }}>
                          ⚠️ 주의: 배포 완료(published)된 기존 템플릿에 필수 설정 필드를 신규 추가하면, 이미 이 템플릿을 배정받아 사용 중인 회사의 자동화 설정값과 충돌하여 작동 오류가 발생할 수 있습니다.
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  height: "38px",
                  backgroundColor: loading ? "#4b5563" : "#111111",
                  color: "#ffffff",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "저장 중..." : isEditMode ? "⚙️ 자동화 템플릿 수정 저장" : "🚀 자동화 템플릿 등록"}
              </button>
              
              {/* 수정/복제 진행 상태 취소 버튼 */}
              {(isEditMode || workflowKey || name || schemaFields.length > 0) && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  style={{
                    height: "38px",
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    padding: "0 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  취소
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 자동화 템플릿 목록 조회 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
            📋 등록된 템플릿 목록
          </h3>
          
          {loading && templates.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#6b7280" }}>{siteConfig.messages.loading}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {templates.length === 0 ? (
                <div style={{ padding: "32px", border: "1px dashed #e5e7eb", borderRadius: "8px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                  등록된 템플릿이 없습니다. 좌측 폼을 이용해 템플릿을 신규 생성해 주십시오.
                </div>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.workflowKey}
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottom: "1px solid #f3f4f6",
                        paddingBottom: "8px",
                        marginBottom: "10px",
                      }}
                    >
                      <div>
                        <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#111111", margin: 0 }}>
                          {template.name} ({template.shortName})
                        </h4>
                        <p style={{ fontSize: "11px", color: "#9ca3af", margin: "2px 0 0 0" }}>
                          Key: {template.workflowKey} · v{template.version}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            backgroundColor: template.status === "published" ? "#d1fae5" : "#f3f4f6",
                            color: template.status === "published" ? "#065f46" : "#374151",
                            padding: "2px 5px",
                            borderRadius: "4px",
                          }}
                        >
                          {template.status === "published" ? "배포 완료" : "작성 중"}
                        </span>
                        
                        {/* 1번 조건: 수정 버튼 연동 */}
                        <button
                          onClick={() => handleStartEdit(template)}
                          style={{
                            fontSize: "11px",
                            backgroundColor: "#f3f4f6",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            padding: "2px 6px",
                            cursor: "pointer",
                            fontWeight: 600,
                            color: "#374151"
                          }}
                        >
                          수정
                        </button>

                        {/* 7번 조건: 복제 버튼 연동 */}
                        <button
                          onClick={() => handleStartClone(template)}
                          style={{
                            fontSize: "11px",
                            backgroundColor: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            borderRadius: "4px",
                            padding: "2px 6px",
                            cursor: "pointer",
                            fontWeight: 600,
                            color: "#1d4ed8"
                          }}
                        >
                          복제
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
                      {template.description && (
                        <p style={{ margin: "0 0 4px 0", color: "#4b5563", lineHeight: 1.3 }}>
                          {template.description}
                        </p>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#6b7280" }}>Webhook ID</span>
                        <span style={{ fontWeight: 500, color: "#111111", fontFamily: "monospace" }}>
                          {template.webhookSecretId} (서버 키: {template.n8nServerKey || "main"})
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#6b7280" }}>허용 입력 형태</span>
                        <span style={{ fontWeight: 500, color: "#111111" }}>
                          {template.inputSchema.acceptedInputTypes.join(", ")}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#6b7280" }}>설정 키 리스트</span>
                        <span style={{ fontWeight: 500, color: "#111111", fontFamily: "monospace" }}>
                          {template.configSchema.map(f => f.key).join(", ") || "없음"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>

      {/* 개발자용 테스트 샘플 데이터 격리 패널 */}
      <div
        style={{
          backgroundColor: "#f9fafb",
          border: "1px dashed #d1d5db",
          borderRadius: "8px",
          padding: "16px",
          marginTop: "12px",
        }}
      >
        <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#4b5563", margin: "0 0 8px 0" }}>
          🛠️ 개발자용 테스트 샘플 데이터 생성 (격리 패널)
        </h3>
        <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 12px 0", lineHeight: 1.4 }}>
          테스트용 공용 템플릿(지결자, expense-report)을 원터치로 빠르게 데이터베이스에 생성할 수 있는 도구입니다.
        </p>
        <button
          onClick={handleRegisterSample}
          disabled={loading}
          style={{
            backgroundColor: "#e5e7eb",
            color: "#374151",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            padding: "8px 14px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "처리 중..." : "🚀 테스트 샘플 템플릿(지결자) 일괄 등록"}
        </button>
      </div>
    </div>
  );
}
