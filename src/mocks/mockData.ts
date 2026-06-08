// 이 파일은 Phase 1A 개발 검증을 위한 N8Lient 목(Mock) 데이터를 정의하는 파일입니다.
// 실제 Firebase 연동 없이 UI 개발 및 빌드 안정성 확인에 사용합니다.

import type {
  ClientDoc,
  UserDoc,
  CompanyJoinRequest,
  WorkflowTemplate,
  ClientContract,
  ClientAutomation,
  Submission,
} from "@/types/n8lient";

// ─────────────────────────────────────────────────────────────────────────────
// Mock 회사(Client) 데이터
// ─────────────────────────────────────────────────────────────────────────────

export const mockClients: ClientDoc[] = [
  {
    clientId: "client_rentaltoktok_001",
    companyName: "렌탈톡톡",
    companyCode: "RTT2026",
    status: "active",
    ownerAdminUid: "mock_admin_uid_001",
    defaultTimezone: "Asia/Seoul",
    defaultReportEmail: "report@example.com",
    defaultDriveRootFolderId: "mock_drive_folder_id",
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-07T00:00:00Z",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mock 사용자(User) 데이터
// ─────────────────────────────────────────────────────────────────────────────

/** mock 일반 사용자 — 승인 완료 상태 */
export const mockApprovedUser: UserDoc = {
  uid: "mock_user_uid_001",
  email: "user@example.com",
  displayName: "김민수",
  photoURL: undefined,
  clientId: "client_rentaltoktok_001",
  role: "user",
  approvalStatus: "approved",
  department: "영업팀",
  position: "매니저",
  phone: "010-0000-0000",
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-07T00:00:00Z",
};

/** mock 일반 사용자 — 승인 대기 상태 */
export const mockPendingUser: UserDoc = {
  uid: "mock_user_uid_002",
  email: "pending@example.com",
  displayName: "이철수",
  role: "user",
  approvalStatus: "pending",
  createdAt: "2026-06-05T00:00:00Z",
  updatedAt: "2026-06-07T00:00:00Z",
};

/** mock 회사 관리자 */
export const mockCompanyAdmin: UserDoc = {
  uid: "mock_admin_uid_001",
  email: "admin@example.com",
  displayName: "박관리자",
  clientId: "client_rentaltoktok_001",
  role: "company_admin",
  approvalStatus: "approved",
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-07T00:00:00Z",
};

/** mock 운영자 */
export const mockOperator: UserDoc = {
  uid: "mock_operator_uid_001",
  email: "operator@example.com",
  displayName: "엔팔운영자",
  role: "operator",
  approvalStatus: "approved",
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-07T00:00:00Z",
};

// ─────────────────────────────────────────────────────────────────────────────
// Mock 가입 요청(CompanyJoinRequest) 데이터
// ─────────────────────────────────────────────────────────────────────────────

export const mockJoinRequests: CompanyJoinRequest[] = [
  {
    requestId: "join_req_001",
    uid: "mock_user_uid_002",
    email: "pending@example.com",
    displayName: "이철수",
    requestedCompanyCode: "RTT2026",
    clientId: "client_rentaltoktok_001",
    status: "pending",
    requestedAt: "2026-06-05T10:00:00Z",
    reviewedAt: null,
    reviewedBy: null,
    rejectReason: null,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mock 자동화 명세서(WorkflowTemplate) 데이터
// ─────────────────────────────────────────────────────────────────────────────

export const mockWorkflowTemplates: WorkflowTemplate[] = [
  {
    workflowKey: "expense-report",
    name: "지출결의서 자동 정리",
    shortName: "지결자",
    description: "지출결의서 관련 자료를 정리하고 회계 담당자에게 전달합니다.",
    version: "1.0.0",
    status: "published",
    webhookSecretId: "secret_webhook_expense_report",
    configSchemaVersion: 1,
    inputSchema: {
      acceptedInputTypes: ["text", "file"],
      allowedFileTypes: ["pdf", "jpg", "png", "xlsx"],
      maxFileSizeMB: 50,
    },
    configSchema: [
      { key: "googleDriveId", label: "구글드라이브 ID", type: "text", required: true },
      { key: "googleSheetId", label: "구글시트 ID", type: "text", required: true },
      { key: "accountantEmail", label: "회계담당 이메일", type: "email", required: true },
      {
        key: "userEmail",
        label: "사용자 이메일",
        type: "email",
        required: true,
        defaultValueSource: "auth.email",
      },
    ],
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-07T00:00:00Z",
  },
  {
    workflowKey: "tongjayo",
    name: "통화 자동 요약",
    shortName: "통자요",
    description: "고객 통화 내용을 자동으로 요약하여 기록합니다.",
    version: "1.0.0",
    status: "published",
    webhookSecretId: "secret_webhook_tongjayo",
    configSchemaVersion: 1,
    inputSchema: {
      acceptedInputTypes: ["audio", "text"],
      maxFileSizeMB: 100,
    },
    configSchema: [
      { key: "googleDriveId", label: "구글드라이브 ID", type: "text", required: true },
      { key: "reportEmail", label: "보고서 수신 이메일", type: "email", required: true },
    ],
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-07T00:00:00Z",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mock 계약(ClientContract) 데이터
// ─────────────────────────────────────────────────────────────────────────────

export const mockClientContracts: ClientContract[] = [
  {
    contractId: "client_rentaltoktok_001_expense-report",
    clientId: "client_rentaltoktok_001",
    workflowKey: "expense-report",
    enabled: true,
    contractStatus: "active",
    startedAt: "2026-06-01T00:00:00Z",
    endedAt: null,
    createdBy: "mock_operator_uid_001",
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-07T00:00:00Z",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mock 자동화 설정(ClientAutomation) 데이터
// ─────────────────────────────────────────────────────────────────────────────

export const mockClientAutomations: ClientAutomation[] = [
  {
    automationId: "auto_expense_001",
    clientId: "client_rentaltoktok_001",
    workflowKey: "expense-report",
    automationName: "지결자",
    enabled: true,
    configStatus: "configured",
    configSchemaVersion: 1,
    allowedUserIds: ["mock_user_uid_001"],
    // settings의 key는 configSchema.key와 반드시 일치해야 함
    settings: {
      googleDriveId: "mock_google_drive_folder_id",
      googleSheetId: "mock_google_sheet_id",
      accountantEmail: "accounting@example.com",
      userEmail: "user@example.com",
    },
    createdBy: "mock_admin_uid_001",
    createdAt: "2026-06-02T00:00:00Z",
    updatedAt: "2026-06-07T00:00:00Z",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mock 실행 결과(Submission) 데이터
// ─────────────────────────────────────────────────────────────────────────────

export const mockSubmissions: Submission[] = [
  {
    submissionId: "sub_20260607_0001",
    clientId: "client_rentaltoktok_001",
    uid: "mock_user_uid_001",
    workflowKey: "expense-report",
    automationId: "auto_expense_001",
    status: "success",
    input: {
      title: "5월 지출결의서",
      text: "5월 카드 사용 내역 정리 요청",
      fileName: "expense_may.pdf",
      mimeType: "application/pdf",
    },
    result: {
      resultUrl: "https://docs.google.com/spreadsheets/d/mock_sheet_id",
      summary: "총 37건 정리 완료, 회계팀 이메일 전송 완료",
    },
    error: { code: null, message: null },
    retryOf: null,
    createdAt: "2026-06-07T09:00:00Z",
    updatedAt: "2026-06-07T09:05:00Z",
    completedAt: "2026-06-07T09:05:00Z",
  },
  {
    submissionId: "sub_20260607_0002",
    clientId: "client_rentaltoktok_001",
    uid: "mock_user_uid_001",
    workflowKey: "expense-report",
    automationId: "auto_expense_001",
    status: "failed",
    input: {
      title: "4월 지출결의서",
      text: "4월 카드 사용 내역 정리 요청",
    },
    result: { resultUrl: null, summary: null },
    error: {
      code: "REQUIRED_SETTING_MISSING",
      message: "accountantEmail 설정값이 없습니다.",
    },
    retryOf: null,
    createdAt: "2026-06-06T14:00:00Z",
    updatedAt: "2026-06-06T14:01:00Z",
    completedAt: null,
  },
  {
    submissionId: "sub_20260607_0003",
    clientId: "client_rentaltoktok_001",
    uid: "mock_user_uid_001",
    workflowKey: "expense-report",
    automationId: "auto_expense_001",
    status: "success",
    input: {
      title: "4월 지출결의서 재전송",
      text: "4월 카드 사용 내역 재정리 요청",
    },
    result: {
      resultUrl: "https://docs.google.com/spreadsheets/d/mock_sheet_id_2",
      summary: "총 25건 정리 완료",
    },
    error: { code: null, message: null },
    // 이전 실패 건을 retryOf로 연결
    retryOf: "sub_20260607_0002",
    createdAt: "2026-06-06T15:00:00Z",
    updatedAt: "2026-06-06T15:04:00Z",
    completedAt: "2026-06-06T15:04:00Z",
  },
  {
    submissionId: "sub_20260607_0004",
    clientId: "client_rentaltoktok_001",
    uid: "mock_user_uid_001",
    workflowKey: "expense-report",
    automationId: "auto_expense_001",
    status: "processing",
    input: {
      title: "6월 1주차 지출결의서",
      text: "6월 첫째 주 카드 내역",
    },
    result: { resultUrl: null, summary: null },
    error: { code: null, message: null },
    retryOf: null,
    createdAt: "2026-06-07T15:00:00Z",
    updatedAt: "2026-06-07T15:00:30Z",
    completedAt: null,
  },
];
