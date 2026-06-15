// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
// Source: src/common/validation/validateExecution.ts

// 이 파일은 N8Lient 자동화 실행 시 프론트엔드, API route, 게이트웨이 전반에서 동일한 검증 규칙을 유지하기 위한 공통 유효성 검사 헬퍼입니다.
// React, Next.js, Firebase, DOM/Node API에 의존하지 않는 순수 TypeScript 파일로 관리됩니다.
// 한국어 주석 표준을 준수합니다.

export type AcceptedInputType = "text" | "file" | "audio" | "image";
export type RequiredInputMode = "none" | "at_least_one" | "all";

export type ExecutionFileLike = {
  name?: string;
  size?: number;
  type?: string;
};

export type ExecutionInputLike = {
  title?: string | null;
  text?: string;
  inputType?: AcceptedInputType | string;
};

export type ExecutionValidationParams = {
  automationId?: string | null;
  input: ExecutionInputLike;
  files?: ExecutionFileLike[];
  inputSchema: {
    titleRequired?: boolean;
    acceptedInputTypes?: AcceptedInputType[];
    requiredInputMode?: RequiredInputMode;
    requiredInputTypes?: AcceptedInputType[];
    allowedFileTypes?: string[];
    maxFileSizeMB?: number;
    maxFiles?: number;
  };
  configSchema?: Array<{
    key: string;
    label?: string;
    type?: string;
    required?: boolean;
    conditionalRequired?: {
      field: string;
      equals: string;
    } | null;
  }>;
  settings?: Record<string, unknown>;
};

export type ExecutionValidationIssue = {
  field: string;
  code: string;
  message: string;
};

export type ExecutionValidationResult = {
  isValid: boolean;
  issues: ExecutionValidationIssue[];
  missingFields: string[];
  received: {
    hasAutomationId: boolean;
    hasTitle: boolean;
    hasText: boolean;
    fileCount: number;
    providedInputTypes: AcceptedInputType[];
  };
};

/**
 * 파일 정보와 MIME type, 확장자를 기준으로 제공된 파일의 인풋 타입을 판별합니다.
 * @param file 검사할 파일 객체
 */
export function resolveFileType(file: ExecutionFileLike): "audio" | "image" | "file" {
  const mimeType = (file.type || "").toLowerCase();
  const fileName = (file.name || "").toLowerCase();
  const ext = fileName.split(".").pop() || "";

  // 1. audio 판별
  if (mimeType.startsWith("audio/") || ["webm", "mp3", "m4a", "wav", "ogg", "aac", "flac"].includes(ext)) {
    return "audio";
  }

  // 2. image 판별
  if (mimeType.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(ext)) {
    return "image";
  }

  // 3. 일반 file 판별
  return "file";
}

/**
 * 자동화 실행 요청 페이로드의 정합성을 검증합니다.
 */
export function validateExecution(params: ExecutionValidationParams): ExecutionValidationResult {
  const issues: ExecutionValidationIssue[] = [];
  const missingFields: string[] = [];

  const automationId = params.automationId;
  const input = params.input || {};
  const files = params.files || [];
  const inputSchema = params.inputSchema || {};
  const configSchema = params.configSchema || [];
  const settings = params.settings || {};

  // 1. automationId 검증
  const hasAutomationId = typeof automationId === "string" && automationId.trim() !== "";
  if (!hasAutomationId) {
    missingFields.push("automationId");
    issues.push({
      field: "automationId",
      code: "REQUIRED_FIELD_MISSING",
      message: "자동화 실행 대상 식별자(automationId)가 누락되었습니다."
    });
  }

  // 2. title 검증 (titleRequired !== false일 때 필수)
  const titleRequired = inputSchema.titleRequired !== false;
  const hasTitle = typeof input.title === "string" && input.title.trim() !== "";
  if (titleRequired && !hasTitle) {
    missingFields.push("input.title");
    issues.push({
      field: "input.title",
      code: "REQUIRED_FIELD_MISSING",
      message: "자동화 실행에 필수적인 제목(input.title)이 누락되었습니다."
    });
  }

  // 3. 제공된 입력 타입 계산 (input.title은 text 입력으로 인정하지 않음)
  const hasText = typeof input.text === "string" && input.text.trim() !== "";
  const providedInputTypes: AcceptedInputType[] = [];

  if (hasText) {
    providedInputTypes.push("text");
  }

  // 파일들 분석하여 중복 제거된 제공 타입 수집
  files.forEach(file => {
    const resolved = resolveFileType(file);
    if (!providedInputTypes.includes(resolved)) {
      providedInputTypes.push(resolved);
    }
  });

  // 4. acceptedInputTypes 검증
  const acceptedInputTypes = inputSchema.acceptedInputTypes || [];
  if (acceptedInputTypes.length === 0) {
    issues.push({
      field: "inputSchema.acceptedInputTypes",
      code: "INVALID_SCHEMA_CONFIGURATION",
      message: "워크플로우 템플릿의 허용 입력 타입(acceptedInputTypes) 설정이 비어 있습니다."
    });
  } else {
    // 제공된 입력 타입이 acceptedInputTypes 범위에 없는지 검증
    providedInputTypes.forEach(pType => {
      if (!acceptedInputTypes.includes(pType)) {
        issues.push({
          field: `input.${pType}`,
          code: "UNSUPPORTED_INPUT_TYPE",
          message: `이 워크플로우는 '${pType}' 입력을 지원하지 않습니다. 허용 범위: ${acceptedInputTypes.join(", ")}`
        });
      }
    });
  }

  // 5. requiredInputMode / requiredInputTypes 검증
  const requiredInputMode = inputSchema.requiredInputMode || "at_least_one";
  const requiredInputTypes = inputSchema.requiredInputTypes || acceptedInputTypes; // 누락 시 fallback

  if (acceptedInputTypes.length > 0 && requiredInputMode !== "none") {
    if (requiredInputMode === "all") {
      // 모든 필수 유형이 제공되었는지 검증
      requiredInputTypes.forEach(reqType => {
        if (!providedInputTypes.includes(reqType)) {
          missingFields.push(`input.${reqType}`);
          issues.push({
            field: `input.${reqType}`,
            code: "REQUIRED_INPUT_MISSING",
            message: `필수 입력 사항인 '${reqType}' 정보가 입력되지 않았습니다.`
          });
        }
      });
    } else if (requiredInputMode === "at_least_one") {
      // 최소 1개 이상이 제공되었는지 검증
      const hasAnyRequired = requiredInputTypes.some(reqType => providedInputTypes.includes(reqType));
      if (!hasAnyRequired) {
        requiredInputTypes.forEach(reqType => {
          missingFields.push(`input.${reqType}`);
        });
        issues.push({
          field: "input.types",
          code: "AT_LEAST_ONE_INPUT_REQUIRED",
          message: `다음 입력 항목 중 최소 하나를 작성/첨부해야 합니다: ${requiredInputTypes.join(", ")}`
        });
      }
    }
  }

  // 6. maxFiles 검증 (기본값: 미디어 존재 시 1, 미존재 시 0)
  const hasMedia = acceptedInputTypes.some(t => ["file", "image", "audio"].includes(t));
  const fallbackMaxFiles = hasMedia ? 1 : 0;
  const maxFiles = inputSchema.maxFiles !== undefined ? inputSchema.maxFiles : fallbackMaxFiles;

  if (files.length > maxFiles) {
    issues.push({
      field: "input.files",
      code: "MAX_FILES_EXCEEDED",
      message: `첨부 파일 개수(${files.length}개)가 허용 최대 개수(${maxFiles}개)를 초과했습니다.`
    });
  }

  // 7. allowedFileTypes 검증 (확장자 정규화)
  const allowedFileTypes = inputSchema.allowedFileTypes || [];
  if (files.length > 0 && allowedFileTypes.length > 0) {
    // allowedFileTypes 항목 정규화 (예: ".webm" -> "webm", "audio/webm" -> "audio/webm")
    const normalizedAllowed = allowedFileTypes.map(t => t.replace(/^\./, "").trim().toLowerCase());

    files.forEach((file, index) => {
      const fileName = (file.name || "").toLowerCase();
      const fileExt = fileName.split(".").pop() || "";
      const mimeType = (file.type || "").toLowerCase();

      // 확장자 일치 여부
      const isExtAllowed = normalizedAllowed.includes(fileExt);

      // MIME type 분류 기반 일치 여부 (예: 'audio' 키워드가 있으면 audio/ 로 시작하는 모든 타입 허용 등)
      const isMimeAllowed = normalizedAllowed.some(pattern => {
        if (pattern === "audio" && mimeType.startsWith("audio/")) return true;
        if (pattern === "image" && mimeType.startsWith("image/")) return true;
        if (pattern === "video" && mimeType.startsWith("video/")) return true;
        return mimeType.includes(pattern);
      });

      if (!isExtAllowed && !isMimeAllowed) {
        issues.push({
          field: `input.files[${index}]`,
          code: "DISALLOWED_FILE_TYPE",
          message: `'${file.name}' 파일은 허용되지 않는 확장자/형식입니다. 허용 형식: ${allowedFileTypes.join(", ")}`
        });
      }
    });
  }

  // 8. maxFileSizeMB 검증
  const maxFileSizeMB = inputSchema.maxFileSizeMB || 20; // fallback 20MB
  files.forEach((file, index) => {
    // 파일 크기가 지정되지 않은 경우(예: 프론트엔드 input 변경 시 File 구조가 불완전하거나 stream인 경우 등) 검증 스킵
    if (file.size !== undefined && file.size !== null) {
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxFileSizeMB) {
        issues.push({
          field: `input.files[${index}]`,
          code: "FILE_SIZE_LIMIT_EXCEEDED",
          message: `'${file.name}' 파일 크기(${fileSizeMB.toFixed(2)}MB)가 제한 크기(${maxFileSizeMB}MB)를 초과합니다.`
        });
      }
    }
  });

  // 9. configSchema required / conditionalRequired 검증
  configSchema.forEach(field => {
    let isFieldRequired = field.required === true;

    // 조건부 필수 판별
    const condReq = field.conditionalRequired;
    if (condReq && typeof condReq === "object") {
      const refField = condReq.field;
      const refEquals = condReq.equals;

      if (refField) {
        const refVal = settings[refField];
        // settings에 담긴 값이 condReq.equals와 문자열/값 비교가 맞을 시 필수 처리
        if (refVal !== undefined && refVal !== null && String(refVal) === String(refEquals)) {
          isFieldRequired = true;
        }
      }
    }

    if (isFieldRequired) {
      const value = settings[field.key];
      // 비어 있는 값 기준 판정 (undefined, null, "", 공백 문자열)
      const isEmpty = value === undefined || value === null || (typeof value === "string" && value.trim() === "");
      if (isEmpty) {
        missingFields.push(`settings.${field.key}`);
        issues.push({
          field: `settings.${field.key}`,
          code: "REQUIRED_SETTING_MISSING",
          message: `'${field.label || field.key}' 설정값이 비어 있어 실행이 불가능합니다.`
        });
      }
    }
  });

  return {
    isValid: issues.length === 0,
    issues,
    missingFields,
    received: {
      hasAutomationId,
      hasTitle,
      hasText,
      fileCount: files.length,
      providedInputTypes
    }
  };
}
