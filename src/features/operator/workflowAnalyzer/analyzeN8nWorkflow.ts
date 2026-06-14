// 이 파일은 n8n 워크플로우 JSON 데이터를 파싱하고 분석하여 N8Lient 워크플로우 마스터 등록 권장값 초안을 생성하는 기능을 제공합니다.
// 한국어 주석 표준을 준수합니다.

import type { WorkflowTemplate, ConfigSchemaField, RetentionLevel } from "@/types/n8lient";
import type { WorkflowTemplateImportDraft, WorkflowImportDiagnosticItem, DiagnosticLevel } from "./workflowImportTypes";
import { parseN8lientAnnotations } from "./parseN8lientAnnotations";
import { validateWorkflowImport } from "./validateWorkflowImport";

/**
 * n8n 워크플로우 JSON을 분석하여 WorkflowTemplateImportDraft DTO를 생성합니다.
 * @param workflowJson n8n 워크플로우 JSON 객체
 * @param options 파일명 등의 추가 옵션
 */
export function analyzeN8nWorkflow(
  workflowJson: unknown,
  options?: {
    sourceFileName?: string;
  }
): WorkflowTemplateImportDraft {
  const diagnostics: WorkflowImportDiagnosticItem[] = [];
  const analyzedAt = new Date().toISOString();
  const sourceFileName = options?.sourceFileName || "unknown_file.json";

  // 1. JSON 기본 유효성 검사
  if (!workflowJson || typeof workflowJson !== "object") {
    diagnostics.push({
      field: "workflowJson",
      level: "error",
      message: "워크플로우 데이터가 비어있거나 유효한 JSON 객체가 아닙니다."
    });
    return createEmptyDraft(sourceFileName, analyzedAt, diagnostics);
  }

  const rawObj = workflowJson as any;
  const nodes = Array.isArray(rawObj.nodes) ? rawObj.nodes : [];
  const n8nWorkflowName = typeof rawObj.name === "string" ? rawObj.name.trim() : "";
  const n8nActive = typeof rawObj.active === "boolean" ? rawObj.active : null;

  if (nodes.length === 0) {
    diagnostics.push({
      field: "nodes",
      level: "error",
      message: "워크플로우 내에 노드(Nodes) 정보가 존재하지 않습니다. 정상적인 n8n 내보내기 파일인지 확인하십시오."
    });
  }

  if (!n8nWorkflowName) {
    diagnostics.push({
      field: "name",
      level: "error",
      message: "워크플로우 이름(name)이 누락되었습니다."
    });
  }

  // Webhook 노드 탐색 및 경로 추출
  const webhookNode = nodes.find((node: any) => node.type === "n8n-nodes-base.webhook");
  const detectedWebhookPath = webhookNode?.parameters?.path || "";

  if (!webhookNode) {
    diagnostics.push({
      field: "webhookSecretId",
      level: "error",
      message: "워크플로우 내에 Webhook Trigger 노드가 감지되지 않았습니다. 외부 호출이 불가능할 수 있습니다."
    });
  } else if (!detectedWebhookPath) {
    diagnostics.push({
      field: "webhookSecretId",
      level: "warning",
      message: "Webhook 노드가 존재하나, 호출 경로(path) 파라미터가 비어 있습니다."
    });
  }

  // 2. 워크플로우 기본값 추출 및 권장 설정 생성
  // workflowKey 생성: 영문 소문자, 숫자, 하이픈만 허용
  let workflowKey = "imported-workflow";
  if (n8nWorkflowName) {
    // 한글 및 특수문자를 하이픈으로 치환하고 소문자 변환
    const cleanKey = n8nWorkflowName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""); // 앞뒤 하이픈 제거
    
    if (cleanKey) {
      workflowKey = cleanKey;
    }
  }

  // name 정제
  const name = n8nWorkflowName || "가져온 자동화 워크플로우";

  // shortName 생성 (줄임말, 2~4자 이내)
  let shortName = "자동화";
  if (name) {
    const cleanName = name.replace(/[^ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z0-9]/g, "");
    if (cleanName.length > 0) {
      shortName = cleanName.substring(0, Math.min(3, cleanName.length));
    }
  }
  diagnostics.push({
    field: "shortName",
    level: "warning",
    message: `줄임말(shortName)이 "${shortName}"(으)로 임시 추정되었습니다. 실제 운영 목적에 맞게 수정이 권장됩니다.`
  });

  const description = name ? `${name} 워크플로우입니다.` : "n8n에서 가져온 워크플로우 명세입니다.";
  diagnostics.push({
    field: "description",
    level: "warning",
    message: "설명(description)이 기본 분석값으로 채워졌습니다. 구체적인 동작 요약을 작성해 주십시오."
  });

  const version = "1.0.0";
  const status = "draft"; // 최초 분석 등록 시에는 항상 draft로 안전하게 시작
  const webhookSecretId = detectedWebhookPath || workflowKey;
  const n8nServerKey = "main";

  // 3. inputSchema 및 입력 유형 추정
  const jsonStr = JSON.stringify(rawObj);
  const jsonStrLower = jsonStr.toLowerCase();

  // 입력 미디어 타입 독립 감지
  // - audio 감지: 노드 타입이나 파라미터, 노드명에 음성 인식 키워드가 있는 경우
  const hasAudioNode = nodes.some((n: any) => 
    n.type === "n8n-nodes-base.openAi" && n.parameters?.operation === "speechToText" ||
    n.type === "n8n-nodes-base.awsTranscribe" ||
    String(n.name).toLowerCase().includes("whisper") ||
    String(n.name).toLowerCase().includes("stt") ||
    String(n.name).toLowerCase().includes("transcribe") ||
    String(n.name).toLowerCase().includes("speech")
  ) || jsonStrLower.includes(".mp3") || jsonStrLower.includes(".wav") || jsonStrLower.includes(".m4a");

  // - image 감지: 노드 타입이나 파일 파라미터에 이미지 확장자가 포함되거나 vision 키워드가 있는 경우
  const hasImageNode = jsonStrLower.includes(".png") || jsonStrLower.includes(".jpg") || 
                       jsonStrLower.includes(".jpeg") || jsonStrLower.includes(".gif") ||
                       jsonStrLower.includes("vision") || jsonStrLower.includes("image");

  // - file 감지: readBinaryFile, writeBinaryFile이 있거나 attachment, file, pdf, xlsx 등이 언급될 때
  const hasFileNode = nodes.some((n: any) => 
    n.type === "n8n-nodes-base.readBinaryFile" ||
    n.type === "n8n-nodes-base.writeBinaryFile"
  ) || jsonStrLower.includes(".pdf") || jsonStrLower.includes(".xlsx") || 
      jsonStrLower.includes("attachment") || jsonStrLower.includes("file");

  const acceptedInputTypes: Array<"text" | "file" | "audio" | "image"> = ["text"];
  const allowedExtensions: string[] = [];

  if (hasAudioNode) {
    acceptedInputTypes.push("audio");
    allowedExtensions.push("mp3", "wav", "m4a", "webm", "ogg");
  }
  if (hasImageNode) {
    acceptedInputTypes.push("image");
    allowedExtensions.push("png", "jpg", "jpeg", "gif");
  }
  if (hasFileNode) {
    acceptedInputTypes.push("file");
    allowedExtensions.push("pdf", "xlsx", "docx", "pptx", "zip");
  }

  // 중복 제거 및 소문자 정제
  const uniqueExtensions = Array.from(new Set(allowedExtensions));

  const hasMediaInput = hasAudioNode || hasImageNode || hasFileNode;
  const maxFileSizeMB = hasMediaInput ? 50 : 10;

  diagnostics.push({
    field: "inputSchema.maxFileSizeMB",
    level: "warning",
    message: `허용 최대 파일 용량이 ${maxFileSizeMB}MB로 권장되었습니다. 실제 요구사양과 일치하는지 확인하십시오.`
  });

  if (hasMediaInput && uniqueExtensions.length === 0) {
    diagnostics.push({
      field: "inputSchema.allowedFileTypes",
      level: "warning",
      message: "파일 입력이 필요할 것으로 추정되나 허용 확장자가 지정되지 않았습니다."
    });
  }

  // titleRequired 감지 보완
  // 음성 입력 중심 워크플로우로 강하게 추정될 때 titleRequired=false 권장
  let titleRequired = true;
  if (hasAudioNode && !hasFileNode && !hasImageNode) {
    titleRequired = false;
    diagnostics.push({
      field: "inputSchema.titleRequired",
      level: "warning",
      message: "음성 입력 중심 워크플로우로 감지되어 titleRequired=false를 권장했습니다. 실제 운영 의도와 맞는지 확인하세요."
    });
  } else {
    diagnostics.push({
      field: "inputSchema.titleRequired",
      level: "warning",
      message: "입력 제목 필수 여부(titleRequired)가 true로 설정되었습니다. 사용 환경에 맞게 검토하십시오."
    });
  }

  // 4. retentionCapabilities 및 operatorRetentionPolicy 추정
  // n8n JSON 내부에 Google Drive 업로드나 결과 생성 노드가 감지되는 경우 지원 여부 활성화
  const hasDriveUpload = nodes.some((n: any) => 
    n.type === "n8n-nodes-base.googleDrive" && n.parameters?.operation === "upload"
  );
  
  const supportsOriginalFileRefs = hasMediaInput;
  const supportsResultRefs = hasDriveUpload; // 구글 드라이브 업로드가 있으면 결과 파일 참조가 발생할 것으로 추정

  const maxLevel: RetentionLevel = "full_archive";
  const defaultLevel: RetentionLevel = "full_archive";
  const supportedLevels: RetentionLevel[] = ["notify_only", "processed_result", "full_archive"];

  const retentionCapabilities = {
    maxLevel,
    supportedLevels,
    defaultLevel,
    supportsProcessorResult: true, // 기본 탑재로 가정
    supportsOriginalFileRefs,
    supportsResultRefs,
    supportsEmailNotification: false,
    supportsResultPolicyRouter: true
  };

  const operatorRetentionPolicy = {
    allowedLevels: [...supportedLevels],
    defaultLevel,
    allowCompanyOverride: true,
    allowUserOverride: true
  };

  // 5. configSchema 후보 추출 (정규식 기반)
  const schemaFieldsMap = new Map<string, ConfigSchemaField>();

  // n8n 표현식 내 설정 키 추출용 정규식 목록
  const regexes = [
    /settings\.([a-zA-Z0-9_]+)/g,
    /payload\.settings\.([a-zA-Z0-9_]+)/g,
    /\$json\.settings\.([a-zA-Z0-9_]+)/g,
    /settings\["([a-zA-Z0-9_]+)"\]/g,
    /payload\.settings\["([a-zA-Z0-9_]+)"\]/g,
    /\$json\.settings\["([a-zA-Z0-9_]+)"\]/g,
    /settings\['([a-zA-Z0-9_]+)'\]/g,
    /payload\.settings\['([a-zA-Z0-9_]+)'\]/g,
    /\$json\.settings\['([a-zA-Z0-9_]+)'\]/g
  ];

  const detectedKeys: string[] = [];

  for (const regex of regexes) {
    let match;
    // 정규식 실행 시 상태 보존을 위한 global flag 리셋 방지용 루프
    while ((match = regex.exec(jsonStr)) !== null) {
      if (match[1]) {
        detectedKeys.push(match[1]);
      }
    }
  }

  // 중복 제거
  const uniqueDetectedKeys = Array.from(new Set(detectedKeys));

  // 민감정보 키워드 블랙리스트 정의 (대소문자 무관 비교용)
  const sensitiveKeywords = [
    "token", "secret", "credential", "credentialid", "accesstoken",
    "refreshtoken", "privatekey", "apikey", "api_key", "password",
    "serviceaccount"
  ];

  // 구형 Google Drive 폴더 ID 감지 여부
  const hasLegacyDriveFolderId = uniqueDetectedKeys.includes("googleDriveExportFolderId") || jsonStr.includes("googleDriveExportFolderId");

  if (hasLegacyDriveFolderId) {
    diagnostics.push({
      field: "configSchema",
      level: "warning",
      message: "구형 googleDriveExportFolderId가 감지되었습니다. 최신 기준은 MD 폴더와 첨부파일 폴더를 분리합니다."
    });
  }

  // 감지된 키들 중 검증 및 맵핑 수행
  for (const key of uniqueDetectedKeys) {
    const lowerKey = key.toLowerCase();
    
    // 민감정보 키는 configSchema에 수동 노출하지 않고 경고 남김
    const isSensitive = sensitiveKeywords.some(keyword => lowerKey.includes(keyword));
    if (isSensitive) {
      diagnostics.push({
        field: `configSchema.${key}`,
        level: "warning",
        message: `민감 정보 키(${key})가 감지되었습니다. 보안 위험 방지를 위해 설정 스키마에서 제외하며, 서버 환경변수 활용이 필요합니다.`
      });
      continue;
    }

    // 구형 구글드라이브 폴더 ID는 등록 대상에서 생략 (최신 표준으로 대체 권장하기 때문)
    if (key === "googleDriveExportFolderId") {
      continue;
    }

    // 표준 필드와 겹치지 않는 동적 필드 정의
    const field: ConfigSchemaField = {
      key,
      label: key, // 오퍼레이터가 직접 편집할 수 있도록 키명을 라벨로 임시 설정
      type: lowerKey.includes("email") ? "email" : lowerKey.includes("url") || lowerKey.includes("id") ? "text" : "text",
      required: true,
      defaultValue: "",
      description: `${key} 설정 항목입니다.`
    };

    schemaFieldsMap.set(key, field);
  }

  // Google Drive 노드가 존재하거나 구형 폴더 ID가 감지되면 최신 표준 5대 필드를 후보에 강제 추가
  const hasGoogleDriveNode = nodes.some((n: any) => n.type === "n8n-nodes-base.googleDrive");
  if (hasGoogleDriveNode || hasLegacyDriveFolderId) {
    const driveFields: ConfigSchemaField[] = [
      {
        key: "optionalExportProvider",
        label: "외부 내보내기 방식",
        type: "select",
        required: true,
        defaultValue: "none",
        options: ["none", "google_drive"],
        description: "Google Drive 내보내기 사용 여부를 선택합니다."
      },
      {
        key: "googleDriveMdFolderName",
        label: "MD 파일 보관 폴더명",
        type: "text",
        required: false,
        defaultValue: "N8Lient Notes",
        description: "MD 결과 파일을 저장할 Google Drive 폴더의 표시명입니다. google_drive 선택 시 필요합니다."
      },
      {
        key: "googleDriveMdFolderId",
        label: "MD 파일 보관 폴더 ID",
        type: "text",
        required: false,
        defaultValue: "",
        description: "MD 결과 파일을 저장할 Google Drive 폴더 ID입니다. google_drive 선택 시 필요합니다."
      },
      {
        key: "googleDriveAttachmentFolderName",
        label: "첨부파일 보관 폴더명",
        type: "text",
        required: false,
        defaultValue: "Attachments",
        description: "원본 음성, 이미지, 첨부파일을 저장할 Google Drive 폴더의 표시명입니다. google_drive 선택 시 필요합니다."
      },
      {
        key: "googleDriveAttachmentFolderId",
        label: "첨부파일 보관 폴더 ID",
        type: "text",
        required: false,
        defaultValue: "",
        description: "원본 음성, 이미지, 첨부파일을 저장할 Google Drive 폴더 ID입니다. google_drive 선택 시 필요합니다."
      }
    ];

    for (const f of driveFields) {
      schemaFieldsMap.set(f.key, f);
    }
  }

  // 6. configSchema 순서 정렬 규칙 적용 (알파벳 정렬 미사용)
  // 표준 권장 필드 순서 목록
  const standardOrder = [
    "reportEmailTo",
    "emailEnabled",
    "optionalExportProvider",
    "googleDriveMdFolderName",
    "googleDriveMdFolderId",
    "googleDriveAttachmentFolderName",
    "googleDriveAttachmentFolderId",
    "audioPrefix",
    "mdPrefix",
    "geminiModel",
    "language",
    "timezone",
    "prompt"
  ];

  const sortedFields: ConfigSchemaField[] = [];

  // 1순위: 표준 권장 필드 순서대로 존재하는 것들 먼저 추가
  for (const stdKey of standardOrder) {
    if (schemaFieldsMap.has(stdKey)) {
      sortedFields.push(schemaFieldsMap.get(stdKey)!);
      schemaFieldsMap.delete(stdKey);
    }
  }

  // 2순위: 그 외 실제 감지된 순서대로 남은 필드 추가 (uniqueDetectedKeys 순서 유지)
  for (const detKey of uniqueDetectedKeys) {
    if (schemaFieldsMap.has(detKey)) {
      sortedFields.push(schemaFieldsMap.get(detKey)!);
      schemaFieldsMap.delete(detKey);
    }
  }

  // 3순위: 기타 맵에 남은 필드 추가 (방어용 코드)
  for (const remainingField of schemaFieldsMap.values()) {
    sortedFields.push(remainingField);
  }

  // 7. WorkflowTemplate 객체 구조화
  const workflowTemplate: Partial<WorkflowTemplate> = {
    workflowKey,
    name,
    shortName,
    description,
    version,
    status,
    webhookSecretId,
    n8nServerKey,
    configSchemaVersion: 1,
    inputSchema: {
      acceptedInputTypes: acceptedInputTypes as Array<"text" | "file" | "audio" | "image">,
      allowedFileTypes: uniqueExtensions,
      maxFileSizeMB,
      titleRequired
    },
    configSchema: sortedFields,
    retentionCapabilities,
    operatorRetentionPolicy
  };

  // 진단 목록을 맵으로 구성
  const fieldDiagnostics: Record<string, WorkflowImportDiagnosticItem> = {};
  let maxSeverity: DiagnosticLevel = "ok";

  for (const diag of diagnostics) {
    fieldDiagnostics[diag.field] = diag;
    if (diag.level === "error") {
      maxSeverity = "error";
    } else if (diag.level === "warning" && maxSeverity !== "error") {
      maxSeverity = "warning";
    }
  }

  const hasError = maxSeverity === "error";
  const hasWarning = maxSeverity === "warning";

  return {
    schemaVersion: "n8lient.workflowTemplateImport.v1",
    source: {
      analyzerVersion: "1.0.0",
      analyzedAt,
      sourceFileName,
      n8nWorkflowName,
      n8nActive,
      detectedWebhookPath
    },
    workflowTemplate,
    diagnostics: {
      severity: maxSeverity,
      canSave: !hasError, // error가 없을 때만 true
      requiresWarningConfirmation: hasWarning, // warning이 있는 경우 동의 확인 체크 필요
      items: diagnostics,
      fieldDiagnostics
    }
  };
}

/**
 * 분석 실패 시 리턴할 빈 Draft 객체 헬퍼
 */
function createEmptyDraft(
  sourceFileName: string,
  analyzedAt: string,
  errors: WorkflowImportDiagnosticItem[]
): WorkflowTemplateImportDraft {
  const fieldDiagnostics: Record<string, WorkflowImportDiagnosticItem> = {};
  for (const err of errors) {
    fieldDiagnostics[err.field] = err;
  }

  return {
    schemaVersion: "n8lient.workflowTemplateImport.v1",
    source: {
      analyzerVersion: "1.0.0",
      analyzedAt,
      sourceFileName
    },
    workflowTemplate: {},
    diagnostics: {
      severity: "error",
      canSave: false,
      requiresWarningConfirmation: false,
      items: errors,
      fieldDiagnostics
    }
  };
}
