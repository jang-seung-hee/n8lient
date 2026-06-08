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
  | "INVALID_FILE_TYPE";

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
  ownerAdminUid: Uid;
  defaultTimezone: string;
  defaultReportEmail: string;
  defaultDriveRootFolderId?: string;
  geminiApiKeySecretId?: SecretId;
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
}

/**
 * configSchema의 개별 설정 항목 타입
 */
export interface ConfigSchemaField {
  /** clientAutomations.settings의 key와 반드시 일치해야 함 */
  key: string;
  label: string;
  type: "text" | "email" | "number" | "boolean" | "select" | "textarea" | "secret";
  required: boolean;
  defaultValue?: string | number | boolean | null;
  /** 값을 auth 등에서 자동 가져오는 경우 (예: "auth.email") */
  defaultValueSource?: string | null;
  options?: string[];
  placeholder?: string;
  /** 사용자/관리자 화면에 노출할 이 필드에 대한 상세 가이드 설명 */
  description?: string;
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
  };
  /** settings의 key 이름과 반드시 일치해야 하는 설정 스키마 */
  configSchema: ConfigSchemaField[];
  createdAt: string;
  updatedAt: string;
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
  startedAt: string;
  endedAt?: string | null;
  createdBy: Uid;
  createdAt: string;
  updatedAt: string;
}

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
  createdBy: Uid;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
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
    title: string;
    text?: string;
    fileUrl?: string;
    fileName?: string;
    mimeType?: string;
  };
  result: {
    resultUrl?: string | null;
    summary?: string | null;
  };
  error: {
    code?: N8nErrorCode | null;
    message?: string | null;
  };
  /** 재전송 시 원본 submissionId 참조 */
  retryOf?: SubmissionId | null;
  /** 디버깅용 비민감 설정 병합 요약 정보 */
  settingsMergeSummary?: {
    hasUserSetting: boolean;
    mergedKeys: string[];
    fallbackKeys: string[];
  } | null;
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
