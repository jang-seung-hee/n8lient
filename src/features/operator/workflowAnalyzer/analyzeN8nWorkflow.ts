// 이 파일은 n8n 워크플로우 JSON 데이터를 파싱하고 분석하여 N8Lient 워크플로우 마스터 등록 권장값 초안을 생성하는 기능을 제공합니다.
// 한국어 주석 표준을 준수합니다.

import type { WorkflowTemplate, ConfigSchemaField, RetentionLevel } from "@/types/n8lient";
import type { WorkflowTemplateImportDraft, WorkflowImportDiagnosticItem, DiagnosticLevel } from "./workflowImportTypes";
import { parseN8lientAnnotations } from "./parseN8lientAnnotations";

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
  const hasAudioNode = nodes.some((n: any) => 
    n.type === "n8n-nodes-base.openAi" && n.parameters?.operation === "speechToText" ||
    n.type === "n8n-nodes-base.awsTranscribe" ||
    String(n.name).toLowerCase().includes("whisper") ||
    String(n.name).toLowerCase().includes("stt") ||
    String(n.name).toLowerCase().includes("transcribe") ||
    String(n.name).toLowerCase().includes("speech")
  ) || jsonStrLower.includes(".mp3") || jsonStrLower.includes(".wav") || jsonStrLower.includes(".m4a");

  const hasImageNode = jsonStrLower.includes(".png") || jsonStrLower.includes(".jpg") || 
                       jsonStrLower.includes(".jpeg") || jsonStrLower.includes(".gif") ||
                       jsonStrLower.includes("vision") || jsonStrLower.includes("image");

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
  const hasDriveUpload = nodes.some((n: any) => 
    n.type === "n8n-nodes-base.googleDrive" && n.parameters?.operation === "upload"
  );
  
  const supportsOriginalFileRefs = hasMediaInput;
  const supportsResultRefs = hasDriveUpload;

  const maxLevel: RetentionLevel = "full_archive";
  const defaultLevel: RetentionLevel = "full_archive";
  const supportedLevels: RetentionLevel[] = ["notify_only", "processed_result", "full_archive"];

  const retentionCapabilities = {
    maxLevel,
    supportedLevels,
    defaultLevel,
    supportsProcessorResult: true,
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
    while ((match = regex.exec(jsonStr)) !== null) {
      if (match[1]) {
        detectedKeys.push(match[1]);
      }
    }
  }

  const uniqueDetectedKeys = Array.from(new Set(detectedKeys));
  const sensitiveKeywords = [
    "token", "secret", "credential", "credentialid", "accesstoken",
    "refreshtoken", "privatekey", "apikey", "api_key", "password",
    "serviceaccount"
  ];

  const hasLegacyDriveFolderId = uniqueDetectedKeys.includes("googleDriveExportFolderId") || jsonStr.includes("googleDriveExportFolderId");
  if (hasLegacyDriveFolderId) {
    diagnostics.push({
      field: "configSchema",
      level: "warning",
      message: "구형 googleDriveExportFolderId가 감지되었습니다. 최신 기준은 MD 폴더와 첨부파일 폴더를 분리합니다."
    });
  }

  for (const key of uniqueDetectedKeys) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeywords.some(keyword => lowerKey.includes(keyword));
    if (isSensitive) {
      diagnostics.push({
        field: `configSchema.${key}`,
        level: "warning",
        message: `민감 정보 키(${key})가 감지되었습니다. 보안 위험 방지를 위해 설정 스키마에서 제외하며, 서버 환경변수 활용이 필요합니다.`
      });
      continue;
    }

    if (key === "googleDriveExportFolderId") {
      continue;
    }

    const field: ConfigSchemaField = {
      key,
      label: key,
      type: lowerKey.includes("email") ? "email" : lowerKey.includes("url") || lowerKey.includes("id") ? "text" : "text",
      required: true,
      defaultValue: "",
      description: `${key} 설정 항목입니다.`
    };
    schemaFieldsMap.set(key, field);
  }

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
  for (const stdKey of standardOrder) {
    if (schemaFieldsMap.has(stdKey)) {
      sortedFields.push(schemaFieldsMap.get(stdKey)!);
      schemaFieldsMap.delete(stdKey);
    }
  }

  for (const detKey of uniqueDetectedKeys) {
    if (schemaFieldsMap.has(detKey)) {
      sortedFields.push(schemaFieldsMap.get(detKey)!);
      schemaFieldsMap.delete(detKey);
    }
  }

  for (const remainingField of schemaFieldsMap.values()) {
    sortedFields.push(remainingField);
  }

  // 6. N8Lient 주석 메타 파싱 연동 및 우선순위 병합
  const annotations = parseN8lientAnnotations(rawObj);
  const annotationDetected = !!(annotations.workflowMeta || annotations.configFields.length > 0 || annotations.retentionPolicy);
  const annotationBlocks = {
    workflowMeta: !!annotations.workflowMeta,
    configFieldCount: annotations.configFields.length,
    retentionPolicy: !!annotations.retentionPolicy,
  };

  // 주석 오버라이드 변수 선언
  let finalWorkflowKey = workflowKey;
  let finalName = name;
  let finalShortName = shortName;
  let finalDescription = description;
  let finalInputSchema = {
    acceptedInputTypes: acceptedInputTypes as Array<"text" | "file" | "audio" | "image">,
    allowedFileTypes: uniqueExtensions,
    maxFileSizeMB,
    titleRequired
  };
  let finalRetentionCapabilities = { ...retentionCapabilities };
  let finalOperatorRetentionPolicy = { ...operatorRetentionPolicy };

  let isShortNameFromMeta = false;
  let isDescFromMeta = false;
  let isMaxFileSizeFromMeta = false;
  let isTitleRequiredFromMeta = false;

  if (annotations.workflowMeta) {
    const wm = annotations.workflowMeta;
    if (wm.workflowKey) finalWorkflowKey = wm.workflowKey;
    if (wm.name) finalName = wm.name;
    if (wm.shortName) {
      finalShortName = wm.shortName;
      isShortNameFromMeta = true;
    }
    if (wm.description) {
      finalDescription = wm.description;
      isDescFromMeta = true;
    }
    if (wm.maxFileSizeMB !== undefined) {
      finalInputSchema.maxFileSizeMB = wm.maxFileSizeMB;
      isMaxFileSizeFromMeta = true;
    }
    if (wm.titleRequired !== undefined) {
      finalInputSchema.titleRequired = wm.titleRequired;
      isTitleRequiredFromMeta = true;
    }
    if (wm.acceptedInputTypes) {
      finalInputSchema.acceptedInputTypes = wm.acceptedInputTypes as any;
    }
    if (wm.allowedExtensions) {
      finalInputSchema.allowedFileTypes = wm.allowedExtensions;
    }
  }

  if (annotations.retentionPolicy) {
    const rp = annotations.retentionPolicy;
    if (rp.supportedLevels) finalRetentionCapabilities.supportedLevels = rp.supportedLevels as any;
    if (rp.maxLevel) finalRetentionCapabilities.maxLevel = rp.maxLevel as any;
    if (rp.defaultLevel) finalRetentionCapabilities.defaultLevel = rp.defaultLevel as any;
    if (rp.supportsProcessorResult !== undefined) finalRetentionCapabilities.supportsProcessorResult = rp.supportsProcessorResult;
    if (rp.supportsOriginalFileRefs !== undefined) finalRetentionCapabilities.supportsOriginalFileRefs = rp.supportsOriginalFileRefs;
    if (rp.supportsResultRefs !== undefined) finalRetentionCapabilities.supportsResultRefs = rp.supportsResultRefs;
    if (rp.supportsResultPolicyRouter !== undefined) finalRetentionCapabilities.supportsResultPolicyRouter = rp.supportsResultPolicyRouter;

    if (rp.allowedLevels) finalOperatorRetentionPolicy.allowedLevels = rp.allowedLevels as any;
    if (rp.operatorDefaultLevel) finalOperatorRetentionPolicy.defaultLevel = rp.operatorDefaultLevel as any;
    if (rp.allowCompanyOverride !== undefined) finalOperatorRetentionPolicy.allowCompanyOverride = rp.allowCompanyOverride;
    if (rp.allowUserOverride !== undefined) finalOperatorRetentionPolicy.allowUserOverride = rp.allowUserOverride;
  }

  // configSchema 병합 (주석설정 우선적용 및 정렬 순서 보정)
  const finalConfigFields: ConfigSchemaField[] = [];
  const addedKeys = new Set<string>();

  // 1순위: 주석 선언 필드 순서대로 추가
  for (const field of annotations.configFields) {
    if (field.key) {
      finalConfigFields.push(field);
      addedKeys.add(field.key);
    }
  }

  // 2순위: 그 외 정규식 감지 sortedFields 중 주석에 없는 것 뒤에 유지
  for (const field of sortedFields) {
    if (field.key && !addedKeys.has(field.key)) {
      finalConfigFields.push(field);
      addedKeys.add(field.key);
    }
  }

  // WorkflowTemplate 최종 조립
  const workflowTemplate: Partial<WorkflowTemplate> = {
    workflowKey: finalWorkflowKey,
    name: finalName,
    shortName: finalShortName,
    description: finalDescription,
    version,
    status,
    webhookSecretId: webhookSecretId === workflowKey ? finalWorkflowKey : webhookSecretId,
    n8nServerKey,
    configSchemaVersion: 1,
    inputSchema: finalInputSchema,
    configSchema: finalConfigFields,
    retentionCapabilities: finalRetentionCapabilities,
    operatorRetentionPolicy: finalOperatorRetentionPolicy
  };

  // diagnostics 완화 및 ok 등급 보정 추가
  const finalDiagnostics: WorkflowImportDiagnosticItem[] = [];

  for (const diag of diagnostics) {
    if (diag.field === "shortName" && isShortNameFromMeta) {
      continue; // 자동추정 경고 제거
    }
    if (diag.field === "description" && isDescFromMeta) {
      continue; // 자동추정 경고 제거
    }
    if (diag.field === "inputSchema.maxFileSizeMB" && isMaxFileSizeFromMeta) {
      continue; // 용량 경고 제거
    }
    if (diag.field === "inputSchema.titleRequired" && isTitleRequiredFromMeta) {
      continue;
    }
    
    // configSchema 개별 key/description/placeholder 경고 완화
    let isConfigWarningMasked = false;
    for (const af of annotations.configFields) {
      if (diag.field.startsWith(`configSchema`) && diag.field.includes(af.key)) {
        isConfigWarningMasked = true;
      }
    }
    if (isConfigWarningMasked && diag.level === "warning") {
      continue;
    }

    finalDiagnostics.push(diag);
  }

  // ok 진단 결과 주입
  if (isShortNameFromMeta) {
    finalDiagnostics.push({
      field: "shortName",
      level: "ok",
      message: "n8n 주석 메타에서 줄임말을 가져왔습니다."
    });
  }
  if (isDescFromMeta) {
    finalDiagnostics.push({
      field: "description",
      level: "ok",
      message: "n8n 주석 메타에서 설명글을 가져왔습니다."
    });
  }
  if (isMaxFileSizeFromMeta) {
    finalDiagnostics.push({
      field: "inputSchema.maxFileSizeMB",
      level: "ok",
      message: "n8n 주석 메타에서 허용 파일 용량을 가져왔습니다."
    });
  }
  if (isTitleRequiredFromMeta) {
    finalDiagnostics.push({
      field: "inputSchema.titleRequired",
      level: "ok",
      message: "n8n 주석 메타에서 실행 제목 필수 여부를 가져왔습니다."
    });
  }
  if (annotations.configFields.length > 0) {
    finalDiagnostics.push({
      field: "configSchema",
      level: "ok",
      message: `n8n 주석 메타에서 ${annotations.configFields.length}개의 설정 필드 명세를 파싱하여 반영했습니다.`
    });
  }
  if (annotations.retentionPolicy) {
    finalDiagnostics.push({
      field: "operatorRetentionPolicy.allowedLevels",
      level: "ok",
      message: "n8n 주석 메타에서 보관 정책 계약 수준을 적용했습니다."
    });
  }

  // 진단 목록을 맵으로 구성
  const fieldDiagnostics: Record<string, WorkflowImportDiagnosticItem> = {};
  let maxSeverity: DiagnosticLevel = "ok";

  for (const diag of finalDiagnostics) {
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
      detectedWebhookPath,
      annotationDetected,
      annotationBlocks,
      unknownFields: annotations.unknownFields
    },
    workflowTemplate,
    diagnostics: {
      severity: maxSeverity,
      canSave: !hasError,
      requiresWarningConfirmation: hasWarning,
      items: finalDiagnostics,
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
