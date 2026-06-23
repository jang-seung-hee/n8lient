// 이 파일은 DB/n8n 연동규약 v0.1을 기반으로 N8Lient 전체 컬렉션의 TypeScript 타입을 정의하는 파일입니다.

// ─────────────────────────────────────────────────────────────────────────────
// 공통 ID 타입
// ─────────────────────────────────────────────────────────────────────────────

/** Firebase Auth UID */
export type Uid = string;

/** 회사 고유 ID (예: client_rentaltoktok_001) */
export type ClientId = string;

/** 자동화 종류 ID (예: tongjayo, expense-report) */
export type WorkflowKey = string;

/** 회사가 실제 등록한 자동화 ID (예: auto_expense_001) */
export type AutomationId = string;

/** 실행 요청 ID (예: sub_20260607_0001) */
export type SubmissionId = string;

/** 민감정보 참조 ID (예: secret_gemini_client_001) */
export type SecretId = string;

// ─────────────────────────────────────────────────────────────────────────────
// 역할 및 상태 열거형
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 사용자 역할
 * - operator: 엔팔라이언트 사업자 (전체 운영)
 * - company_admin: 고객사 관리자
 * - user: 고객사 일반 사용자
 */
export type UserRole = "operator" | "company_admin" | "user";

/**
 * 사용자 회사 승인 상태
 * - no_company: 회사코드 미입력
 * - pending: 승인 대기
 * - approved: 승인 완료
 * - rejected: 승인 거절
 * - suspended: 계정 정지
 */
export type ApprovalStatus = "no_company" | "pending" | "approved" | "rejected" | "suspended";

/**
 * 회사 관리자(company_admin) 최초 등록 진행 상태
 * - pending: 회사 관리자 등록 대기 중
 * - completed: 회사 관리자 등록 완료
 */
export type AdminBootstrapStatus = "pending" | "completed";

/**
 * 회사(client) 상태
 * - active: 정상 운영 중
 * - pending_setup: 초기 설정 대기
 * - suspended: 운영 정지
 * - terminated: 계약 종료
 */
export type ClientStatus = "active" | "pending_setup" | "suspended" | "terminated";

/**
 * 회사 가입 요청 상태
 * - pending: 승인 대기
 * - approved: 승인 완료
 * - rejected: 승인 거절
 * - cancelled: 요청 취소
 */
export type JoinRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

/** 회사 가입 승인 요청 제출 경로 */
export type JoinRequestSource = "manual_code" | "invite_link";

/**
 * 자동화 명세서(workflowTemplate) 상태
 * - draft: 작성 중
 * - published: 공개 완료
 * - disabled: 비활성화
 */
export type WorkflowTemplateStatus = "draft" | "published" | "disabled";

/**
 * 자동화 계약(clientContract) 상태
 * - active: 계약 중
 * - paused: 일시 정지
 * - ended: 계약 종료
 */
export type ContractStatus = "active" | "paused" | "ended";

/**
 * 자동화 설정(clientAutomation) 설정 완료 상태
 * - draft: 설정 미완료
 * - configured: 설정 완료 (실행 가능)
 * - invalid: 설정 오류
 * - disabled: 비활성화
 */
export type ConfigStatus = "draft" | "configured" | "invalid" | "disabled";

/**
 * 자동화 실행(submission) 처리 상태
 * - queued: 실행 대기
 * - processing: 처리 중
 * - success: 성공
 * - failed: 실패
 * - skipped: 처리 제외
 * - config_error: 설정 오류
 */
export type SubmissionStatus = "queued" | "processing" | "success" | "failed" | "skipped" | "config_error";

/**
 * 민감정보(secret) 종류
 */
export type SecretType = "geminiApiKey" | "n8nWebhookUrl" | "n8nWebhookToken" | "googleServiceAccount";

// ─────────────────────────────────────────────────────────────────────────────
// 에러 코드
// ─────────────────────────────────────────────────────────────────────────────

/**
 * n8n 실행 에러 코드 (DB/n8n 연동규약 §16)
 */
export type N8nErrorCode =
  | "CONFIG_NOT_FOUND"
  | "CLIENT_NOT_ACTIVE"
  | "CONTRACT_NOT_ACTIVE"
  | "AUTOMATION_DISABLED"
  | "WORKFLOW_KEY_MISMATCH"
  | "CONFIG_NOT_CONFIGURED"
  | "REQUIRED_SETTING_MISSING"
  | "SECRET_NOT_FOUND"
  | "INVALID_INPUT_TYPE"
  | "INVALID_FILE_TYPE"
  | "CLIENT_AUTOMATION_COMPANY_DISABLED";

// ─────────────────────────────────────────────────────────────────────────────
// Firestore 컬렉션 도큐먼트 인터페이스
// ─────────────────────────────────────────────────────────────────────────────

/**
 * clients 컬렉션 — 회사 기본 정보
 */
export interface ClientDoc {
  clientId: ClientId;
  companyName: string;
  companyCode: string;
  status: ClientStatus;
  ownerAdminUid: Uid | null;
  ownerAdminEmail?: string;
  ownerAdminDisplayName?: string;
  adminBootstrapStatus?: AdminBootstrapStatus;
  defaultTimezone: string;
  defaultReportEmail: string;
  defaultDriveRootFolderId?: string;
  geminiApiKeySecretId?: SecretId;
  companyDisplayName?: string;
  contactName?: string;
  contactPhone?: string;
  address?: string;
  homepageUrl?: string;
  description?: string;
  createdAt: string; // ISO 타임스탬프 또는 Firestore Timestamp
  updatedAt: string;
}

/**
 * users 컬렉션 — 사용자 정보 (문서 ID = uid)
 */
export interface UserDoc {
  uid: Uid;
  email: string;
  displayName: string;
  photoURL?: string;
  clientId?: ClientId | null; // 승인 전에는 null 또는 없음
  role: UserRole;
  approvalStatus: ApprovalStatus;
  department?: string;
  position?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

/**
 * companyCodeLookups 컬렉션 — 회사코드 룩업 테이블
 */
export interface CompanyCodeLookup {
  clientId: ClientId;
  companyCode: string;
  companyName: string;
  hasOwnerAdmin: boolean;
  adminBootstrapStatus: AdminBootstrapStatus;
  status: "active" | "disabled";
}

/**
 * companyJoinRequests 컬렉션 — 회사코드 승인 요청
 */
export interface CompanyJoinRequest {
  requestId: string;
  uid: Uid;
  email: string;
  displayName: string;
  requestedCompanyCode: string;
  clientId: ClientId;
  status: JoinRequestStatus;
  requestedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: Uid | null;
  rejectReason?: string | null;
  requestedRole?: "company_admin" | "user";
  companyCode?: string;
  companyName?: string;
  cancelledAt?: string | null;
  cancelledBy?: Uid | null;
  /** 사용자가 입력·확인한 신청 성명 */
  requestedDisplayName?: string;
  /** Google 계정 표시 이름 (하위 호환을 위해 displayName도 유지) */
  googleDisplayName?: string;
  /** Google 계정 이메일 (하위 호환을 위해 email도 유지) */
  googleEmail?: string;
  /** 가입 요청 제출 경로 */
  source?: JoinRequestSource;
}

/** 회사 가입 승인 요청 제출 payload */
export interface SubmitCompanyJoinRequestPayload {
  companyCode: string;
  requestedDisplayName: string;
  source: JoinRequestSource;
}

/**
 * configSchema의 개별 설정 항목 타입
 */
export interface ConfigSchemaField {
  /** clientAutomations.settings의 key와 반드시 일치해야 함 */
  key: string;
  label: string;
  type: "text" | "email" | "number" | "boolean" | "select" | "textarea" | "secret" | "google_drive_folder_id" | "google_sheet_id";
  required: boolean;
  defaultValue?: string | number | boolean | null;
  /** 값을 auth 등에서 자동 가져오는 경우 (예: "auth.email") */
  defaultValueSource?: string | null;
  options?: string[];
  placeholder?: string;
  /** 사용자/관리자 화면에 노출할 이 필드에 대한 상세 가이드 설명 */
  description?: string;
  /** UI 폼 입력 시 쉼표 포함 실시간 편집용 임시 필드 */
  tempOptionsStr?: string;
  /** 특정 선택값에 따라 필수가 되는 조건부 필수 설정 */
  conditionalRequired?: {
    field: string;
    equals: string;
  } | null;
}

/**
 * workflowTemplates 컬렉션 — 자동화 명세서 (문서 ID = workflowKey)
 */
export interface WorkflowTemplate {
  workflowKey: WorkflowKey;
  name: string;
  shortName: string;
  description?: string;
  version: string;
  status: WorkflowTemplateStatus;
  webhookSecretId: SecretId;
  n8nServerKey?: string;
  configSchemaVersion: number;
  inputSchema: {
    acceptedInputTypes: Array<"text" | "file" | "audio" | "image">;
    allowedFileTypes?: string[];
    maxFileSizeMB?: number;
    titleRequired?: boolean;
    requiredInputMode?: "none" | "at_least_one" | "all";
    requiredInputTypes?: Array<"text" | "file" | "audio" | "image">;
    maxFiles?: number;
  };
  /** settings의 key 이름과 반드시 일치해야 하는 설정 스키마 */
  configSchema: ConfigSchemaField[];
  retentionPolicy?: RetentionPolicy; // [v2.5] 보관 정책 추가 (하위 호환)
  retentionCapabilities?: RetentionCapabilities; // [v2.6] 지원 범위
  operatorRetentionPolicy?: OperatorRetentionPolicy; // [v2.6] 오퍼레이터 제한 정책
  createdAt: string;
  updatedAt: string;
}

export interface ContractRetentionLimit {
  maxLevel: RetentionLevel;
  allowedLevels: RetentionLevel[];
}

/**
 * clientContracts 컬렉션 — 회사별 계약 자동화 (문서 ID = {clientId}_{workflowKey})
 */
export interface ClientContract {
  contractId: string;
  clientId: ClientId;
  workflowKey: WorkflowKey;
  enabled: boolean;
  contractStatus: ContractStatus;
  contractRetentionLimit?: ContractRetentionLimit; // [v2.7] 회사별 계약 한도
  contractMode?: "test" | "production";
  isTestContract?: boolean;
  templateStatusAtContract?: "draft" | "published";
  startedAt: string;
  endedAt?: string | null;
  createdBy: Uid;
  createdAt: string;
  updatedAt: string;
}

export type UserSettingGuidanceLevel = "required_override" | "recommended_override";

/**
 * clientAutomations 컬렉션 — 회사가 실제 등록한 자동화 설정 (문서 ID = automationId)
 * n8n이 가장 중요하게 조회하는 컬렉션
 */
export interface ClientAutomation {
  automationId: AutomationId;
  clientId: ClientId;
  workflowKey: WorkflowKey;
  automationName: string;
  enabled: boolean;
  configStatus: ConfigStatus;
  configSchemaVersion: number;
  allowedUserIds?: Uid[];
  /**
   * 실제 설정값 — configSchema.key와 반드시 동일한 key를 사용해야 함
   * n8n도 이 key를 기준으로 값을 읽음
   */
  settings: Record<string, string | number | boolean>;
  retentionPolicy?: RetentionPolicy; // [v2.5] 보관 정책 하위 호환
  companyRetentionPolicy?: CompanyRetentionPolicy; // [v2.6] 회사 보관 정책
  contractRetentionLimit?: ContractRetentionLimit; // [v2.7] 회사별 계약 한도 복사본
  /** 회사관리자가 등록한 워크플로우별 사용자 안내 공지 (UI 표시 전용) */
  noticeText?: string;
  /** 사용자 개인설정 안내/강조 가이드 정책 정보 (UI 표시 전용) */
  userSettingGuidance?: Record<string, UserSettingGuidanceLevel>;
  /** 회사관리자 전용 — 직원 실행·노출 차단 (operator 매핑/enabled와 독립) */
  companyDisabled?: boolean;
  companyDisabledAt?: string;
  companyDisabledBy?: string;
  companyDisableReason?: string;
  deploymentMode?: "test" | "production";
  templateStatusAtBinding?: "draft" | "published";
  createdBy: Uid;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 결과/보관 레벨 계층 구조 타입 정의 (v2.6)
// ─────────────────────────────────────────────────────────────────────────────

export type RetentionLevel = "notify_only" | "processed_result" | "full_archive";

export interface RetentionCapabilities {
  maxLevel: RetentionLevel; // [v2.7] 워크플로우 기술적 최대 지원 단계
  supportedLevels: RetentionLevel[];
  defaultLevel: RetentionLevel;
  supportsProcessorResult: boolean;
  supportsOriginalFileRefs: boolean;
  supportsResultRefs: boolean;
  supportsEmailNotification: boolean;
  supportsResultPolicyRouter: boolean;
}

export interface OperatorRetentionPolicy {
  allowedLevels: RetentionLevel[]; // [v2.7] 회사 계약상 허용 보관 단계
  defaultLevel: RetentionLevel;    // [v2.7] 계약 기본 레벨
  allowCompanyOverride: boolean;
  allowUserOverride: boolean;
}

export interface CompanyRetentionPolicy {
  recommendedLevel: RetentionLevel; // [v2.7] 회사 권장 보관 단계
  allowedUserLevels: RetentionLevel[];
  allowUserOverride: boolean;
}

export interface UserRetentionPreference {
  preferredLevel?: RetentionLevel;
}

export interface EffectiveRetentionPolicy {
  level: RetentionLevel;
  emailEnabled: boolean;
  emailAttachResult: boolean;
  emailAttachOriginal: boolean;
  storeProcessorResult: boolean;
  storeOriginalFiles: boolean;
  storageProvider: "none" | "firebase_storage";
  optionalExportProvider: "none" | "google_drive";
  resolvedFrom: {
    workflowDefault?: RetentionLevel;
    operatorDefault?: RetentionLevel;
    companyDefault?: RetentionLevel;
    userPreference?: RetentionLevel;
    reason: string;
  };
}

// [v2.5] 하위 호환성 유지용 타입 선언
export type RetentionPolicy = EffectiveRetentionPolicy;

export const DEFAULT_RETENTION_CAPABILITIES: RetentionCapabilities = {
  maxLevel: "full_archive",
  supportedLevels: ["notify_only", "processed_result", "full_archive"],
  defaultLevel: "full_archive",
  supportsProcessorResult: true,
  supportsOriginalFileRefs: true,
  supportsResultRefs: true,
  supportsEmailNotification: false,
  supportsResultPolicyRouter: true,
};

export const DEFAULT_OPERATOR_RETENTION_POLICY: OperatorRetentionPolicy = {
  allowedLevels: ["notify_only", "processed_result", "full_archive"],
  defaultLevel: "full_archive",
  allowCompanyOverride: true,
  allowUserOverride: true,
};

export const DEFAULT_COMPANY_RETENTION_POLICY: CompanyRetentionPolicy = {
  recommendedLevel: "full_archive",
  allowedUserLevels: ["notify_only", "processed_result", "full_archive"],
  allowUserOverride: true,
};

export const DEFAULT_RETENTION_POLICY: EffectiveRetentionPolicy = {
  level: "full_archive",
  emailEnabled: false,
  emailAttachResult: false,
  emailAttachOriginal: false,
  storeProcessorResult: true,
  storeOriginalFiles: true,
  storageProvider: "firebase_storage",
  optionalExportProvider: "none",
  resolvedFrom: {
    reason: "default_fallback",
  },
};

export function buildEffectiveRetentionPolicy(
  level: RetentionLevel,
  resolvedFrom: EffectiveRetentionPolicy["resolvedFrom"]
): EffectiveRetentionPolicy {
  switch (level) {
    case "notify_only":
      return {
        level: "notify_only",
        emailEnabled: false,
        emailAttachResult: false,
        emailAttachOriginal: false,
        storeProcessorResult: false,
        storeOriginalFiles: false,
        storageProvider: "none",
        optionalExportProvider: "none",
        resolvedFrom,
      };
    case "processed_result":
      return {
        level: "processed_result",
        emailEnabled: false,
        emailAttachResult: false,
        emailAttachOriginal: false,
        storeProcessorResult: true,
        storeOriginalFiles: false,
        storageProvider: "none",
        optionalExportProvider: "none",
        resolvedFrom,
      };
    case "full_archive":
    default:
      return {
        level: "full_archive",
        emailEnabled: false,
        emailAttachResult: false,
        emailAttachOriginal: false,
        storeProcessorResult: true,
        storeOriginalFiles: true,
        storageProvider: "firebase_storage",
        optionalExportProvider: "none",
        resolvedFrom,
      };
  }
}

// [v2.5] 하위 호환용 헬퍼 함수 래퍼
export function getDefaultRetentionPolicy(level: RetentionLevel): EffectiveRetentionPolicy {
  return buildEffectiveRetentionPolicy(level, { reason: "legacy_helper_call" });
}



/**
 * userAutomationSettings 컬렉션 — 개별 사용자의 실무 맞춤형 사용자 개인 자동화 설정값 (문서 ID = {uid}_{automationId})
 */
export interface UserAutomationSettings {
  settingId: string;
  uid: Uid;
  clientId: ClientId;
  automationId: AutomationId;
  workflowKey: WorkflowKey;
  /**
   * 개인 설정값 — configSchema.key와 동일한 key를 사용하며,
   * 빈 값은 회사 기본값(Fallback)을 사용하겠다는 의미임
   */
  settings: Record<string, string | number | boolean>;
  userRetentionPreference?: UserRetentionPreference; // [v2.6] 개인 선호 설정
  templateStatusAtSetting?: "draft" | "published";
  isTestSetting?: boolean;
  createdAt: string;
  updatedAt: string;
}


/**
 * 파일 참조 정보 (v2 원본 파일)
 */
export interface FileRef {
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  inputType: string;
}

/**
 * 결과 파일 참조 정보 (v2 생성 결과 파일)
 */
export interface ResultRef {
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  resultType: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 실행 실패 디버깅 관련 타입 (v2.8)
// ─────────────────────────────────────────────────────────────────────────────

export type ExecutionFailurePhase =
  | "APP_VALIDATE"
  | "API_ROUTE_VALIDATE"
  | "API_ROUTE_GATEWAY_CALL"
  | "GATEWAY_VALIDATE"
  | "GATEWAY_STORAGE"
  | "GATEWAY_N8N_CALL"
  | "N8N_WORKFLOW"
  | "N8N_EMAIL"
  | "N8N_CALLBACK"
  | "GATEWAY_CALLBACK"
  | "FIRESTORE_UPDATE"
  | "UNKNOWN";

export type ExecutionFailureSource =
  | "app"
  | "api_route"
  | "gateway"
  | "n8n"
  | "callback"
  | "firestore"
  | "unknown";

export interface SubmissionErrorDetails {
  phase: ExecutionFailurePhase;
  source: ExecutionFailureSource;
  httpStatus?: number;
  retryable?: boolean;
  occurredAt: string;

  gatewayTraceId?: string;
  n8nExecutionId?: string | null;

  n8nServerKey?: string;
  n8nWorkflowName?: string;
  n8nWebhookPath?: string;
  safeTarget?: string;

  hint?: string;
  sanitizedMessage?: string;
}

/**
 * n8n 프로세서가 반환하는 가공된 결과 구조
 */
export interface ProcessorResult {
  title: string | null;
  summary: string | null;
  content: string | null;
  mdContent: string | null;
  structuredData: Record<string, any> | null;
  keywords: string[] | null;
  warnings: string[] | null;
}

/**
 * submissions 컬렉션 — 자동화 실행 요청 및 처리 상태
 */
export interface Submission {
  submissionId: SubmissionId;
  clientId: ClientId;
  uid: Uid;
  workflowKey: WorkflowKey;
  automationId: AutomationId;
  status: SubmissionStatus;
  input: {
    /** 사용자가 직접 입력한 제목만. 없으면 null */
    title: string | null;
    /** 실행 목록/내부 관리용 임시 제목 (시스템 생성) */
    submissionTitle?: string;
    titleProvided?: boolean;
    titleSource?: "user" | "empty";
    text?: string | null;
    fileUrl?: string | null;
    fileName?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null; // 하위 호환용 크기
    inputType?: string | null;
  };
  /** UI 표시용 제목 (callback 후 processorResult.title로 갱신) */
  displayTitle?: string | null;
  result: {
    resultUrl?: string | null;
    summary?: string | null;
  };
  error: {
    code?: N8nErrorCode | string | null; // N8nErrorCode 외 Gateway 에러코드 대응을 위해 string 확장
    message?: string | null;
  };
  /** 디버깅용 상세 에러 정보 (v2.8 추가) */
  errorDetails?: SubmissionErrorDetails;
  /** 재전송 시 원본 submissionId 참조 */
  retryOf?: SubmissionId | null;
  /** 디버깅용 비민감 설정 병합 요약 정보 */
  settingsMergeSummary?: {
    hasUserSetting: boolean;
    mergedKeys: string[];
    fallbackKeys: string[];
  } | null;
  
  // ── v2 추가 필드 (하위 호환을 위해 모두 옵셔널로 처리) ──
  trigger?: {
    type: string;
  };
  originalFileRefs?: FileRef[];
  processorResult?: ProcessorResult | null;
  resultRefs?: ResultRef[];
  settingsSnapshot?: Record<string, string | number | boolean>;
  retentionPolicySnapshot?: RetentionPolicy; // [v2.5] 실행 시점 보관 정책 스냅샷
  
  templateStatusAtExecution?: "draft" | "published";
  isTestExecution?: boolean;
  
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

/**
 * secrets 컬렉션 — 민감정보 (프론트에서 value를 읽지 못하도록 Firestore Rules로 차단)
 */
export interface SecretDoc {
  secretId: SecretId;
  clientId?: ClientId;
  type: SecretType;
  /** 실제 민감값 — 프론트에서 절대 읽지 않음 */
  value: string;
  /** 마스킹된 값 (UI 표시용) */
  maskedValue: string;
  workflowKey?: WorkflowKey;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// n8n 연동 payload 타입
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 엔팔라이언트 → n8n으로 보내는 표준 실행 payload (DB/n8n 연동규약 §13)
 * 브라우저에서 직접 전송하지 않고 반드시 서버리스 함수(Netlify Function 등)를 통해 전송함
 */
export interface N8nWebhookPayload {
  submissionId: SubmissionId;
  clientId: ClientId;
  uid: Uid;
  workflowKey: WorkflowKey;
  automationId: AutomationId;
  input: Submission["input"];
  requestedAt: string;
}

/**
 * N8Lient 워크플로우 템플릿 사용 정보 요약 인터페이스
 * - 한국어 주석 표준을 준수합니다.
 */
export interface WorkflowTemplateUsageSummary {
  isReferenced: boolean;
  hasProductionReferences: boolean;
  hasTestReferences: boolean;
  hasClientContracts: boolean;
  hasClientAutomations: boolean;
  hasSubmissions: boolean;
  hasUserSettings: boolean;
  productionClientContractCount: number;
  testClientContractCount: number;
  productionClientAutomationCount: number;
  productionSubmissionCount: number;
  productionUserSettingCount: number;
  testClientAutomationCount: number;
  testSubmissionCount: number;
  testUserSettingCount: number;
  clientContractCount: number;
  clientAutomationCount: number;
  submissionCount: number;
  userSettingCount: number;
}

export interface ClientPublicProfile {
  clientId: string;
  companyName: string;
  companyDisplayName?: string;
  companyCode?: string;
  contactName?: string;
  contactPhone?: string;
  homepageUrl?: string;
  description?: string;
  updatedAt?: string;
}

