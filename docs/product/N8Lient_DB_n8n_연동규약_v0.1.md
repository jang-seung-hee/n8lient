# 엔팔라이언트(N8Lient) DB 및 n8n 연동 규약 v0.1

## 1. 문서 목적

이 문서는 엔팔라이언트와 n8n이 서로 맞춰야 하는 최소 연결 규약을 정의한다.

이 문서는 상세 DB 설계서가 아니라 MVP 개발을 시작하기 위한 백본 규약이다. 필드 추가는 가능하지만, 이 문서에서 정의한 핵심 ID, 컬렉션명, settings 저장 방식, 자동화 명세서 포맷, n8n payload 구조는 가급적 변경하지 않는다.

---

## 2. 공통 ID 규칙

| ID | 의미 | 예시 |
|---|---|---|
| `clientId` | 회사 고유 ID | `client_rentaltoktok_001` |
| `uid` | Firebase Auth 사용자 UID | Firebase Auth UID |
| `workflowKey` | 자동화 종류 ID | `tongjayo`, `expense-report` |
| `automationId` | 회사가 실제 등록한 자동화 ID | `auto_expense_001` |
| `submissionId` | 실행 요청 ID | `sub_20260607_0001` |
| `secretId` | 민감정보 참조 ID | `secret_gemini_client_001` |

n8n 실행에 필요한 필수 키는 다음이다.

```text
clientId
uid
workflowKey
automationId
submissionId
```

---

## 3. 컬렉션 백본

Firestore 기준 컬렉션은 다음으로 확정한다.

```text
clients
users
companyJoinRequests
workflowTemplates
clientContracts
clientAutomations
submissions
secrets
```

데이터 분석, 검색, 보고서 기능은 MVP 이후 별도 컬렉션으로 추가한다.

---

## 4. clients

회사 기본 정보 컬렉션이다.

```json
{
  "clientId": "client_rentaltoktok_001",
  "companyName": "렌탈톡톡",
  "companyCode": "RTT2026",
  "status": "active",
  "ownerAdminUid": "firebase_uid_001",
  "defaultTimezone": "Asia/Seoul",
  "defaultReportEmail": "report@company.com",
  "defaultDriveRootFolderId": "google_drive_folder_id",
  "geminiApiKeySecretId": "secret_gemini_client_001",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### status

```text
active
pending_setup
suspended
terminated
```

n8n은 `status`가 `active`가 아니면 실행을 중단한다.

---

## 5. users

사용자 정보 컬렉션이다. 문서 ID는 Firebase Auth의 `uid`를 사용한다.

```json
{
  "uid": "firebase_uid_001",
  "email": "user@gmail.com",
  "displayName": "김민수",
  "photoURL": "google_profile_url",
  "clientId": "client_rentaltoktok_001",
  "role": "user",
  "approvalStatus": "approved",
  "department": "영업팀",
  "position": "매니저",
  "phone": "010-0000-0000",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "lastLoginAt": "timestamp"
}
```

### role

```text
operator
company_admin
user
```

### approvalStatus

```text
no_company
pending
approved
rejected
suspended
```

---

## 6. companyJoinRequests

회사코드 입력 후 승인 요청을 저장하는 컬렉션이다.

```json
{
  "requestId": "join_req_001",
  "uid": "firebase_uid_001",
  "email": "user@gmail.com",
  "displayName": "김민수",
  "requestedCompanyCode": "RTT2026",
  "clientId": "client_rentaltoktok_001",
  "status": "pending",
  "requestedAt": "timestamp",
  "reviewedAt": null,
  "reviewedBy": null,
  "rejectReason": null
}
```

### status

```text
pending
approved
rejected
cancelled
```

---

## 7. workflowTemplates

운영자가 등록하는 자동화 명세서 컬렉션이다. 문서 ID는 `workflowKey`를 사용한다.

```json
{
  "workflowKey": "expense-report",
  "name": "지출결의서 자동 정리",
  "shortName": "지결자",
  "description": "지출결의서 관련 자료를 정리하고 회계 담당자에게 전달합니다.",
  "version": "1.0.0",
  "status": "published",
  "webhookSecretId": "secret_webhook_expense_report",
  "configSchemaVersion": 1,
  "inputSchema": {
    "acceptedInputTypes": ["text", "file"],
    "allowedFileTypes": ["pdf", "jpg", "png", "xlsx"],
    "maxFileSizeMB": 50
  },
  "configSchema": [
    {
      "key": "googleDriveId",
      "label": "구글드라이브 ID",
      "type": "text",
      "required": true
    },
    {
      "key": "googleSheetId",
      "label": "구글시트 ID",
      "type": "text",
      "required": true
    },
    {
      "key": "accountantEmail",
      "label": "회계담당 이메일",
      "type": "email",
      "required": true
    },
    {
      "key": "userEmail",
      "label": "사용자 이메일",
      "type": "email",
      "required": true,
      "defaultValueSource": "auth.email"
    }
  ],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### status

```text
draft
schema_ready
test_passed
published
disabled
```

MVP에서는 다음 3개만 써도 된다.

```text
draft
published
disabled
```

---

## 8. clientContracts

회사가 어떤 자동화를 계약했는지 저장하는 컬렉션이다.

문서 ID 규칙:

```text
{clientId}_{workflowKey}
```

예:

```text
client_rentaltoktok_001_expense-report
```

```json
{
  "contractId": "client_rentaltoktok_001_expense-report",
  "clientId": "client_rentaltoktok_001",
  "workflowKey": "expense-report",
  "enabled": true,
  "contractStatus": "active",
  "startedAt": "timestamp",
  "endedAt": null,
  "createdBy": "operator_uid",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### contractStatus

```text
active
paused
ended
```

---

## 9. clientAutomations

회사가 실제로 등록한 자동화 설정값 컬렉션이다. n8n이 가장 중요하게 조회하는 컬렉션이다.

문서 ID는 `automationId`를 사용한다.

```json
{
  "automationId": "auto_expense_001",
  "clientId": "client_rentaltoktok_001",
  "workflowKey": "expense-report",
  "automationName": "지결자",
  "enabled": true,
  "configStatus": "configured",
  "configSchemaVersion": 1,
  "allowedUserIds": ["firebase_uid_001"],
  "settings": {
    "googleDriveId": "google_drive_folder_id",
    "googleSheetId": "google_sheet_id",
    "accountantEmail": "accounting@company.com",
    "userEmail": "user@gmail.com"
  },
  "createdBy": "firebase_uid_001",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### configStatus

```text
draft
configured
invalid
disabled
```

n8n 실행 조건:

```text
1. clientAutomations 문서가 존재한다.
2. clientId가 요청값과 일치한다.
3. workflowKey가 요청값과 일치한다.
4. enabled가 true다.
5. configStatus가 configured다.
6. workflowTemplates.configSchema에서 required=true인 key가 settings에 모두 존재한다.
```

---

## 10. submissions

자동화 실행 요청과 처리 상태를 저장하는 컬렉션이다.

```json
{
  "submissionId": "sub_20260607_0001",
  "clientId": "client_rentaltoktok_001",
  "uid": "firebase_uid_001",
  "workflowKey": "expense-report",
  "automationId": "auto_expense_001",
  "status": "queued",
  "input": {
    "title": "5월 지출결의서",
    "text": "5월 카드 사용 내역 정리 요청",
    "fileUrl": "uploaded_file_url",
    "fileName": "expense_may.pdf",
    "mimeType": "application/pdf"
  },
  "result": {
    "resultUrl": null,
    "summary": null
  },
  "error": {
    "code": null,
    "message": null
  },
  "retryOf": null,
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "completedAt": null
}
```

### status

```text
queued
processing
success
failed
skipped
config_error
```

재전송은 새 submissionId를 만든다.

```json
{
  "submissionId": "sub_20260607_0002",
  "retryOf": "sub_20260607_0001"
}
```

---

## 11. secrets

민감정보 저장 컬렉션이다. 프론트에서는 실제 value를 읽지 못하게 한다.

```json
{
  "secretId": "secret_gemini_client_001",
  "clientId": "client_rentaltoktok_001",
  "type": "geminiApiKey",
  "value": "실제_민감값",
  "maskedValue": "************abcd",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

Webhook URL 예시:

```json
{
  "secretId": "secret_webhook_expense_report",
  "type": "n8nWebhookUrl",
  "workflowKey": "expense-report",
  "value": "https://n8n.example.com/webhook/...",
  "maskedValue": "https://n8n.../webhook/***",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### type

```text
geminiApiKey
n8nWebhookUrl
n8nWebhookToken
googleServiceAccount
```

---

## 12. 자동화 명세서 포맷 v0.1

```json
{
  "workflowKey": "string",
  "name": "string",
  "shortName": "string",
  "description": "string",
  "version": "string",
  "status": "draft | published | disabled",
  "webhookSecretId": "string",
  "configSchemaVersion": 1,
  "inputSchema": {
    "acceptedInputTypes": ["text", "file", "audio", "image"],
    "allowedFileTypes": ["pdf", "jpg", "png"],
    "maxFileSizeMB": 50
  },
  "configSchema": [
    {
      "key": "string",
      "label": "string",
      "type": "text | email | number | boolean | select | textarea | secret",
      "required": true,
      "defaultValue": null,
      "defaultValueSource": null,
      "options": []
    }
  ]
}
```

MVP 필수 필드:

```text
workflowKey
name
shortName
version
status
webhookSecretId
configSchemaVersion
inputSchema
configSchema.key
configSchema.label
configSchema.type
configSchema.required
```

선택 필드:

```text
defaultValue
defaultValueSource
options
description
placeholder
validation
```

---

## 13. n8n 실행 payload v0.1

엔팔라이언트가 n8n으로 보내는 표준 payload이다.

```json
{
  "submissionId": "sub_20260607_0001",
  "clientId": "client_rentaltoktok_001",
  "uid": "firebase_uid_001",
  "workflowKey": "expense-report",
  "automationId": "auto_expense_001",
  "input": {
    "title": "5월 지출결의서",
    "text": "5월 지출 내역 정리 요청",
    "fileUrl": "uploaded_file_url",
    "fileName": "expense_may.pdf",
    "mimeType": "application/pdf"
  },
  "requestedAt": "timestamp"
}
```

---

## 14. n8n 설정 조회 규칙

n8n은 다음 위치에서 설정을 조회한다.

```text
clientAutomations/{automationId}.settings
```

지결자 예시:

```text
settings.googleDriveId
settings.googleSheetId
settings.accountantEmail
settings.userEmail
```

필수 설정값이 없으면 실행하지 않고 `config_error`로 처리한다.

---

## 15. 설정값 우선순위

설정값이 겹칠 때 우선순위는 다음으로 확정한다.

```text
1순위: clientAutomations.settings
2순위: clients 기본값
3순위: workflowTemplates의 defaultValue
4순위: 없으면 config_error
```

MVP에서는 필수값을 가능하면 `clientAutomations.settings`에 직접 저장한다.

---

## 16. 에러 코드 v0.1

```text
CONFIG_NOT_FOUND
CLIENT_NOT_ACTIVE
CONTRACT_NOT_ACTIVE
AUTOMATION_DISABLED
WORKFLOW_KEY_MISMATCH
CONFIG_NOT_CONFIGURED
REQUIRED_SETTING_MISSING
SECRET_NOT_FOUND
INVALID_INPUT_TYPE
INVALID_FILE_TYPE
```

n8n은 설정 오류 시 submissions에 다음처럼 저장한다.

```json
{
  "status": "config_error",
  "error": {
    "code": "REQUIRED_SETTING_MISSING",
    "message": "accountantEmail 설정값이 없습니다."
  }
}
```

---

## 17. 핵심 규칙 요약

```text
1. workflowTemplates는 자동화가 어떤 설정값을 요구하는지 정의한다.
2. clientAutomations는 회사가 실제로 입력한 자동화 설정값을 저장한다.
3. n8n은 automationId로 clientAutomations를 조회한다.
4. settings의 key 이름은 configSchema.key와 반드시 일치해야 한다.
5. n8n은 settings.key를 기준으로 값을 읽는다.
6. 민감정보는 secrets에 저장하고 secretId로 참조한다.
7. 필수 설정값이 없으면 자동화를 실행하지 않는다.
```
