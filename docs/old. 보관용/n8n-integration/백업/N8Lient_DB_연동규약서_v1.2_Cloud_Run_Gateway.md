# N8Lient DB 연동 규약서 v1.2

이 문서는 n8n 워크플로우를 엔팔라이언트(N8Lient) 데이터베이스 구조에 맞게 연동하거나 조회할 때 지켜야 할 Firestore DB 기준서이다.

> 업데이트 기준: **Cloud Run Gateway API 경유 구조 반영**  
> 이전의 `브라우저 → n8n 직접 업로드`, `uploadToken`, `verify-upload-token`, `uploadSessions` 구조는 표준 구조에서 제외한다.

---

## 1. Firestore 컬렉션 구조 및 역할

N8Lient MVP의 핵심 데이터는 Firestore에 보관되며, 아래 9개 컬렉션을 중심으로 연동된다.

| 컬렉션명 | 설명 및 역할 | 문서 ID 규칙 |
| :--- | :--- | :--- |
| `clients` | 고객사 기본 정보 관리 | 임의 생성 ID 예: `client_rentaltoktok_001` |
| `users` | 사용자 프로필 및 권한 정보 | Firebase Auth `uid` |
| `companyCodeLookups` | 회사코드 입력 시 clientId 조회용 보안 룩업 | `trim().toUpperCase()` 기준 회사코드 |
| `companyJoinRequests` | 사용자 회사 가입 신청 이력 | `{uid}_{clientId}` |
| `workflowTemplates` | 운영자가 등록하는 N8N 워크플로우 마스터 명세 | `{workflowKey}` |
| `clientContracts` | 고객사별 N8N 워크플로우 사용권/계약 배정 | `{clientId}_{workflowKey}` |
| `clientAutomations` | 고객사가 등록한 회사 공용 기본 설정값 | 임의 생성 ID 예: `auto_expense_001` |
| `userAutomationSettings` | 사용자 개인 자동화 설정값 | `{uid}_{automationId}` |
| `submissions` | 사용자가 요청한 자동화 실행 요청서 및 이력 | `{submissionId}` |

### 제외된 컬렉션

| 컬렉션명 | 처리 방침 |
| :--- | :--- |
| `uploadSessions` | Cloud Run Gateway 구조에서는 사용하지 않는다. 기존 데이터가 남아 있더라도 클라이언트 SDK의 read/write는 차단한다. 운영 안정화 후 삭제 또는 아카이브한다. |

---

## 2. 컬렉션별 주요 필드 상세

### 2.1 clients

```json
{
  "clientId": "client_rentaltoktok_001",
  "companyName": "렌탈톡톡",
  "companyCode": "RTT2026",
  "status": "active",
  "ownerAdminUid": "firebase_uid_001",
  "defaultTimezone": "Asia/Seoul",
  "defaultReportEmail": "report@company.com",
  "defaultDriveRootFolderId": "company_google_drive_root_folder_id",
  "createdAt": "ISO_8601_Timestamp",
  "updatedAt": "ISO_8601_Timestamp"
}
```

### 2.2 users

```json
{
  "uid": "firebase_uid_001",
  "email": "user@gmail.com",
  "displayName": "김민수",
  "clientId": "client_rentaltoktok_001",
  "role": "user",
  "approvalStatus": "approved",
  "createdAt": "ISO_8601_Timestamp",
  "updatedAt": "ISO_8601_Timestamp"
}
```

### 2.3 workflowTemplates

운영자가 정의하는 N8N 워크플로우 마스터 명세다. Google OAuth 연결 ID나 API Key 자체를 입력받는 필드는 배제한다.

```json
{
  "workflowKey": "idea-catcher",
  "name": "아이디어 캐처",
  "shortName": "캐처",
  "status": "published",
  "webhookSecretId": "n8lient-idea-catcher",
  "n8nServerKey": "main",
  "configSchemaVersion": 1,
  "inputSchema": {
    "acceptedInputTypes": ["text", "audio"],
    "allowedFileTypes": ["txt", "md", "webm", "mp3", "m4a", "wav"],
    "maxFileSizeMB": 10
  },
  "configSchema": [
    {
      "key": "mdFolderId",
      "label": "마크다운 저장 폴더 ID",
      "type": "text",
      "required": true
    },
    {
      "key": "originalFileFolderId",
      "label": "원본 파일 저장 폴더 ID",
      "type": "text",
      "required": true
    },
    {
      "key": "reportEmailTo",
      "label": "결과 보고 수신 이메일",
      "type": "email",
      "required": false
    }
  ]
}
```

`inputSchema.maxFileSizeMB`는 사용자 UI와 Cloud Run Gateway의 업로드 허용 기준이다. Gateway의 실제 제한은 `MAX_UPLOAD_MB` 환경변수를 따른다. 프론트 표시값과 Gateway 제한값은 운영상 일치시키는 것을 원칙으로 한다.

### 2.4 clientAutomations

회사 공용 기본 설정값이다. 사용자 개인 설정이 없거나 비어 있을 때 fallback으로 사용한다.

```json
{
  "automationId": "auto_idea_001",
  "clientId": "client_rentaltoktok_001",
  "workflowKey": "idea-catcher",
  "automationName": "아이디어 캐처",
  "enabled": true,
  "configStatus": "configured",
  "settings": {
    "mdFolderId": "company_default_md_folder_id",
    "originalFileFolderId": "company_default_original_folder_id",
    "reportEmailTo": "company-report@example.com"
  },
  "createdAt": "ISO_8601_Timestamp",
  "updatedAt": "ISO_8601_Timestamp"
}
```

### 2.5 userAutomationSettings

사용자 개인 설정값이다. 회사 공용 설정보다 우선 적용된다.

```json
{
  "settingId": "firebase_uid_001_auto_idea_001",
  "uid": "firebase_uid_001",
  "clientId": "client_rentaltoktok_001",
  "automationId": "auto_idea_001",
  "workflowKey": "idea-catcher",
  "settings": {
    "mdFolderId": "user_md_folder_id",
    "originalFileFolderId": "user_original_folder_id",
    "reportEmailTo": "user@example.com",
    "audioPrefix": "jangseunghee_audio",
    "mdPrefix": "jangseunghee_note"
  },
  "createdAt": "ISO_8601_Timestamp",
  "updatedAt": "ISO_8601_Timestamp"
}
```

빈 문자열, 공백 문자열, `null`, `undefined` 성격의 개인 설정값은 회사 공용 기본값을 덮어쓰지 않는다. `false`, `0`은 유효 값으로 취급할 수 있다.

### 2.6 submissions

자동화 실행 요청 및 결과 이력이다.

```json
{
  "submissionId": "sub_20260608_abcdef",
  "clientId": "client_rentaltoktok_001",
  "uid": "firebase_uid_001",
  "workflowKey": "idea-catcher",
  "automationId": "auto_idea_001",
  "status": "queued",
  "input": {
    "title": "오늘 떠오른 아이디어",
    "text": "아이디어 본문",
    "files": [
      {
        "fileName": "idea_audio.webm",
        "mimeType": "audio/webm",
        "sizeBytes": 8234412,
        "inputType": "audio"
      }
    ],
    "fileName": "idea_audio.webm",
    "mimeType": "audio/webm"
  },
  "settingsMergeSummary": {
    "hasUserSetting": true,
    "mergedKeys": ["mdFolderId", "originalFileFolderId"],
    "fallbackKeys": ["reportEmailTo"]
  },
  "gateway": {
    "service": "n8lient-gateway",
    "requestMode": "multipart",
    "n8nServerKey": "main",
    "webhookSecretId": "n8lient-idea-catcher"
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
  "createdAt": "ISO_8601_Timestamp",
  "updatedAt": "ISO_8601_Timestamp",
  "completedAt": null
}
```

Firestore에는 파일 원본, base64, Blob, binary를 저장하지 않는다. 파일명, MIME, 크기, 입력 유형 같은 메타데이터만 저장한다.

#### status 값

| status | 의미 |
| :--- | :--- |
| `queued` | Gateway가 요청을 접수하고 n8n 호출 전 또는 호출 직후 상태 |
| `processing` | n8n이 처리 중인 상태. Gateway가 n8n 수신 성공 후 설정할 수 있다. |
| `success` | 정상 완료 |
| `failed` | 실패 |
| `skipped` | 처리 제외 |
| `config_error` | 설정/권한 오류 |

#### error.code 예시

| code | 의미 |
| :--- | :--- |
| `N8N_WEBHOOK_FAILED` | Gateway가 n8n Webhook 호출에 실패함 |
| `MAX_UPLOAD_EXCEEDED` | Gateway 업로드 제한 초과 |
| `REQUIRED_SETTING_MISSING` | 필수 settings 누락 |
| `RESOURCE_PERMISSION_DENIED` | Google Drive/Sheet 권한 미공유 또는 접근 실패 |
| `CALLBACK_AUTH_FAILED` | callback 인증 실패 |
| `GATEWAY_AUTH_FAILED` | Firebase ID Token 또는 사용자 승인 상태 검증 실패 |

---

## 3. Cloud Run Gateway 실행 라이프사이클

```mermaid
graph TD
    A[workflowTemplates 마스터 정의] --> B[clientContracts 계약 배정]
    B --> C[clientAutomations 회사 공용 설정]
    C --> D[userAutomationSettings 사용자 개인 설정]
    C --> E[사용자 실행 요청]
    D --> E
    E --> F[Cloud Run Gateway /api/automation/execute]
    F --> G[Firebase ID Token 및 승인 상태 검증]
    G --> H[회사 설정 + 개인 설정 병합]
    H --> I[submissions 생성]
    I --> J{파일 포함 여부}
    J -->|없음| K[n8n 서버 간 JSON 호출]
    J -->|있음| L[n8n 서버 간 multipart 호출 file_0 포함]
    K --> M[n8n 실행]
    L --> M
    M --> N[Gateway callback API로 결과 반영]
    N --> O[submissions 최종 상태 갱신]
```

---

## 4. 설정 병합 및 우선순위 규칙

최종 실행 설정값(`finalSettings`)은 Cloud Run Gateway에서 생성한다.

```text
finalSettings = {
  ...clientAutomations.settings,
  ...validUserAutomationSettings.settings
}
```

우선순위는 다음과 같다.

```text
userAutomationSettings.settings > clientAutomations.settings
```

`input.overrideSettings`는 MVP 표준에서는 사용하지 않는다. 향후 임시 실행 오버라이드 기능을 별도로 승인할 때만 확장한다.

n8n은 이 병합을 직접 수행하지 않는다. n8n은 Gateway가 전달한 `payload.settings`를 최종 실행 설정값으로 사용한다.

---

## 5. 아이디어 캐처 설정 매핑 예시

### 회사 공용 기본 설정

```json
{
  "mdFolderId": "company_default_md_folder_id",
  "originalFileFolderId": "company_default_original_file_folder_id",
  "reportEmailTo": "company-report@example.com"
}
```

### 사용자 개인 설정

```json
{
  "mdFolderId": "user_md_folder_id",
  "originalFileFolderId": "user_original_file_folder_id",
  "reportEmailTo": "user@example.com"
}
```

### 최종 settings

```json
{
  "mdFolderId": "user_md_folder_id",
  "originalFileFolderId": "user_original_file_folder_id",
  "reportEmailTo": "user@example.com"
}
```

---

## 6. 핵심 동치 규칙: configSchema.key ↔ settings

스키마 키 명칭이 서로 다르면 매핑 에러가 발생한다.

```text
workflowTemplates.configSchema[i].key
= clientAutomations.settings key
= userAutomationSettings.settings key
= 최종 payload.settings key
= n8n 내부 참조 key
```

예를 들어 n8n이 `settings.mdFolderId`를 사용한다면 configSchema key도 `mdFolderId`여야 한다.

---

## 7. Gateway 환경변수 매핑 규칙

Gateway는 `workflowTemplates.n8nServerKey`와 `workflowTemplates.webhookSecretId`를 조합하여 n8n 호출 정보를 찾는다.

### 7.1 n8n 서버 매핑

| 값 | 환경변수 |
| :--- | :--- |
| `n8nServerKey = main` | `N8N_SERVER_MAIN_BASE_URL` |
| `n8nServerKey = main` | `N8N_SERVER_MAIN_TOKEN` |

### 7.2 Webhook Path 매핑

`webhookSecretId`는 대문자화하고 하이픈을 언더스코어로 변환해 환경변수 이름을 만든다.

| webhookSecretId | 권장 환경변수 |
| :--- | :--- |
| `n8lient-idea-catcher` | `N8N_WEBHOOK_PATH_N8LIENT_IDEA_CATCHER` |
| `idea-catcher` | `N8N_WEBHOOK_PATH_IDEA_CATCHER` |

운영 안정성을 위해 기존 값과 신규 값을 모두 둘 수 있다.

```env
N8N_WEBHOOK_PATH_IDEA_CATCHER=/webhook/n8lient-idea-catcher
N8N_WEBHOOK_PATH_N8LIENT_IDEA_CATCHER=/webhook/n8lient-idea-catcher
N8N_WEBHOOK_PATH_MAIN_N8LIENT_IDEA_CATCHER=/webhook/n8lient-idea-catcher
```

---

## 8. n8n 워크플로우 개발 및 DB 조회 시 주의사항

1. **n8n의 설정값 획득 원칙**
   * n8n은 Firestore를 직접 조회하지 않는다.
   * n8n은 Gateway가 전달한 `payload.settings`를 사용한다.
   * `uploadToken`, `verify-upload-token`, `uploadSessions`는 표준 구조에서 사용하지 않는다.

2. **공용 Google 계정 Credential 고정**
   * Google Drive, Google Sheets, Gmail 노드는 공용 Google 계정 Credential을 고정 사용한다.
   * 대상 Drive/Sheet는 공용 Google 계정에 쓰기 권한으로 공유되어 있어야 한다.

3. **파일 원본 저장 금지**
   * Firestore에는 파일 원본, base64, Blob, binary를 저장하지 않는다.
   * Firebase Storage는 기본 저장소로 사용하지 않는다.
   * Gateway는 파일을 `/tmp` 등에 임시 저장할 수 있으나 n8n 전송 후 즉시 삭제한다.
   * 파일 원본은 n8n이 Google Drive에 저장한다.

4. **submissions 직접 수정 금지**
   * n8n은 Firestore `submissions`를 직접 수정하지 않는다.
   * 결과 반영은 Gateway callback API를 통해 수행한다.

5. **uploadSessions 접근 제한**
   * `uploadSessions`는 Cloud Run Gateway 표준 구조에서 사용하지 않는다.
   * 남아 있는 경우에도 클라이언트 read/write는 `false`로 차단한다.
