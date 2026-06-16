# N8Lient 규약 기반 n8n 워크플로우 JSON 수정 지시 프롬프트 v1.5

첨부한 아래 4개 파일을 기준으로 n8n 워크플로우 JSON을 엔팔라이언트(N8Lient) Cloud Run Gateway 규약에 맞게 검토하고, 필요한 경우에만 최소 수정하라.

참고 문서.

1. N8Lient_MVP_구조개요서.md
2. N8Lient_DB_연동규약서.md
3. N8Lient_Webhook_Callback_연동규약서.md
4. 수정 대상 n8n 워크플로우 JSON

---

## 1. 최우선 작업 원칙

1. 전체 워크플로우를 갈아엎지 않는다.
2. 기존에 정상 동작하는 업무 처리 노드는 가능한 유지한다.
3. 실제 수정 전, 먼저 변경 대상 노드와 변경 이유를 보고한다.
4. 사용자가 승인하기 전에는 JSON 파일을 수정하거나 새 파일을 생성하지 않는다.
5. 이미 N8Lient Cloud Run Gateway 표준이 반영된 노드는 불필요하게 수정하지 않는다.
6. 수정이 필요 없는 항목은 “수정 불필요”로 보고한다.
7. 추측으로 노드를 추가하지 않는다. 규약과 현재 JSON 분석 결과에 근거해 필요한 노드만 수정한다.
8. 노드명, 기존 연결, 기존 Credential 참조는 꼭 필요한 경우가 아니면 유지한다.
9. import 가능성을 해치지 않도록 JSON 구조, node id, connections, credential 참조 형식을 보존한다.

---

## 2. 역할 분리 원칙

1. 브라우저는 n8n Webhook을 직접 호출하지 않는다.
2. 브라우저는 Cloud Run Gateway의 `/api/automation/execute`만 호출한다.
3. Cloud Run Gateway가 Firebase 인증, 사용자 승인 확인, 회사/개인 설정 병합, submissions 생성, 파일 수신, n8n 서버 간 호출을 담당한다.
4. n8n은 Firestore를 직접 조회하지 않는다.
5. n8n은 회사 설정과 개인 설정을 직접 병합하지 않는다.
6. n8n은 Cloud Run Gateway가 전달한 `payload.settings`를 최종 실행 설정값으로 사용한다.
7. n8n은 실제 업무 처리, 결과 저장, 결과 발송, callback 전송만 담당한다.
8. n8n은 Firestore `submissions`를 직접 수정하지 않는다.
9. 실행 결과 반영은 반드시 `payload.callbackUrl`을 통한 Gateway callback으로 처리한다.

---

## 3. 제거하거나 비활성화할 구형 구조

아래 구조가 있으면 제거, 비활성화 또는 미사용 상태로 정리한다.

* 브라우저 직접 n8n Webhook 호출 구조
* 브라우저 직접 업로드 분기
* `submissionId + uploadToken` 검증 분기
* `/api/automation/verify-upload-token` 호출 HTTP Request 노드
* `/api/automation/prepare-upload` 의존 구조
* `/api/automation/upload-failed` 의존 구조
* `uploadSessions` 관련 코드, Sticky Note, 주석
* `N8LIENT_BASE_URL` 또는 `N8LIENT_APP_BASE_URL` 의존
* n8n Webhook CORS에 운영상 의존하는 구조
* `no-server-token-dev` 같은 개발용 우회 인증
* Code 노드 내부에서 `$env.N8N_SERVER_MAIN_TOKEN`을 직접 읽어 비교하는 구조
* Callback 노드 내부에서 `$env.N8N_CALLBACK_SECRET`을 직접 읽어 Authorization 헤더를 만드는 구조

단, 기존 기록용 Sticky Note에 과거 버전 설명이 남아 있는 경우에는 운영 혼선을 줄 수 있는지 판단한 뒤 수정 여부를 보고한다.

---

## 4. Webhook 인증 표준

n8n Webhook 노드는 Header Auth Credential을 사용한다.

권장 Credential:

```text
Credential Type: Header Auth
Name: N8Lient Gateway Header Auth
Header Name: X-N8N-TOKEN
Header Value: Gateway의 N8N_SERVER_MAIN_TOKEN 값
```

적용 기준:

1. Webhook 노드에 `authentication: headerAuth`가 적용되어야 한다.
2. Webhook 노드가 `N8Lient Gateway Header Auth` Credential을 사용해야 한다.
3. 인증 실패 시 후속 노드가 실행되지 않아야 한다.
4. `00 환경설정` Code 노드는 토큰 검증을 직접 수행하지 않는다.
5. `00 환경설정` Code 노드는 payload 파싱, settings/input 정리, 필수값 검증만 수행한다.
6. n8n Cloud 호환성을 위해 `.env` 직접 의존보다 Credential 기반 인증을 우선한다.

---

## 5. 표준 n8n 입력 구조

Cloud Run Gateway는 n8n Webhook으로 아래 중 하나를 보낸다.

### 5.1 JSON 실행

```json
{
  "submissionId": "sub_20260608_abcdef",
  "clientId": "client_rentaltoktok_001",
  "uid": "firebase_uid_001",
  "workflowKey": "idea-catcher",
  "automationId": "auto_idea_001",
  "settings": {
    "driveId": "shared_drive_id_or_empty_for_my_drive",
    "mdFolderId": "user_or_company_md_folder_id",
    "originalFileFolderId": "user_or_company_original_file_folder_id",
    "reportEmailTo": "user@example.com"
  },
  "input": {
    "title": "오늘 떠오른 아이디어",
    "text": "아이디어 본문"
  },
  "requestedAt": "ISO_8601_Timestamp",
  "callbackUrl": "https://n8lient-gateway-xxxx.run.app/api/automation/callback"
}
```

### 5.2 multipart 실행

```text
FormData
- payload: JSON.stringify(canonicalPayload)
- file_0: binary file
```

n8n 처리 기준:

1. JSON 호출이면 body 전체를 payload로 사용한다.
2. multipart 호출이면 `body.payload` 또는 `json.payload`를 JSON 파싱하여 payload로 사용한다.
3. binary `file_0`가 있으면 보존하거나 워크플로우 내부 표준 binary 필드로 안전하게 변환한다.
4. `payload.settings`, `payload.input`, `payload.callbackUrl`, `payload.submissionId`를 표준 config로 정리한다.
5. 필수 settings 누락 여부를 검증한다.
6. `input.fileUrl` 지원은 기존 워크플로우 호환을 위해 유지할 수 있으나, 표준 파일 입력은 multipart `file_0`이다.
7. 구형 `verify-upload-token` 호출은 사용하지 않는다.

---

## 6. settings / input / payload / credentials 분류 원칙

아래 기준으로 현재 JSON의 값들을 분류하고, 잘못 섞인 값이 있으면 수정 대상 후보로 보고한다.

### 6.1 settings

사용자 또는 회사별로 달라질 수 있는 실행 설정값이다.

예시:

* `driveId` (선택값. My Drive 사용 시 비워두고, Shared Drive 사용 시 Shared Drive ID를 넣는다.)
* `mdFolderId`
* `originalFileFolderId`
* `reportEmailTo`
* `sheetId`
* `driveFolderId`
* `audioPrefix`
* `mdPrefix`

### 6.2 input

사용자가 실행 시 입력하는 값이다.

예시:

* `input.title`
* `input.text`
* `input.fileUrl`
* `input.files`
* multipart binary `file_0`

### 6.3 payload

시스템 메타데이터다.

예시:

* `submissionId`
* `clientId`
* `uid`
* `workflowKey`
* `automationId`
* `requestedAt`
* `callbackUrl`

### 6.4 credentials

n8n에 고정 등록되어야 하는 보안 자격증명이다.

예시:

* Google Drive OAuth Credential
* Google Drive Service Account Credential
* Gmail OAuth Credential
* Google Sheets OAuth Credential
* Google Sheets Service Account Credential
* Gemini API Credential
* Webhook Header Auth Credential
* Callback Bearer Secret Credential

### 6.5 settings에 넣으면 안 되는 값

아래 값은 settings, input, payload에 넣지 않는다.

* Google Access Token
* Google Refresh Token
* n8n Credential ID
* Gemini API Key
* n8n 서버 토큰
* callback secret
* Firebase Admin Key
* Service Account private key

---

## 7. configSchema / inputSchema 점검 원칙

1. `workflowTemplates.configSchema[i].key`와 `payload.settings` key와 n8n 내부 참조 key는 반드시 일치해야 한다.
2. n8n이 `settings.driveId`를 사용하면 configSchema key도 `driveId`여야 한다. 단, `driveId`는 My Drive 사용 시 생략 가능한 선택값이다.
3. n8n이 `settings.mdFolderId`를 사용하면 configSchema key도 `mdFolderId`여야 한다.
4. n8n이 `settings.originalFileFolderId`를 사용하면 configSchema key도 `originalFileFolderId`여야 한다.
5. `reportEmailTo`는 수신자이며, 발신자는 n8n 공용 Gmail Credential이다.
5. Google Credential, API Key, Secret 값은 configSchema에 넣지 않는다.
6. 파일 입력 워크플로우라면 inputSchema에 파일 입력 지원 여부를 명시해야 한다.
7. 아이디어 캐처 기준 권장 inputSchema는 text/audio 중심이며, 허용 확장자는 txt, md, webm, mp3, m4a, wav 등으로 판단한다.
8. maxFileSizeMB는 UI와 Gateway 제한값이 운영상 일치해야 한다.

---

## 8. Google Drive / Sheets Credential 및 저장소 호환 원칙

1. Google Drive, Google Sheets, Gmail 노드는 사용자별 Credential을 런타임에 동적으로 바꾸지 않는다.
2. n8n에는 자동화 실행용 공용 Credential을 고정 연결한다.
3. Google Drive/Sheets 저장용 Credential은 아래 둘 중 하나일 수 있다.
   - 운영용 Google OAuth 계정 Credential
   - Google Service Account Credential
4. Gmail 발송은 별도 정책으로 보며, 일반적으로 공용 Gmail OAuth Credential을 유지한다.
5. settings에는 Credential ID, Access Token, Refresh Token, API Key, Service Account private key를 넣지 않는다.
6. settings에는 대상 리소스 값만 넣는다.
   - `driveId`
   - `mdFolderId`
   - `originalFileFolderId`
   - `sheetId`
   - `reportEmailTo`
7. `driveId`는 선택값이다.
   - My Drive 사용 시 `driveId`는 비워두거나 워크플로우 내부 기본값 `My Drive`를 사용한다.
   - Shared Drive 사용 시 `driveId`에는 Shared Drive ID를 넣는다.
8. Google Drive 노드가 `driveId.value = "My Drive"`로 고정되어 있고 Shared Drive 호환이 필요한 경우에는 `settings.driveId`를 읽도록 수정한다.
9. Shared Drive 호환 구조에서는 Google Drive 노드의 `driveId`와 `folderId`를 분리해서 본다.
   - `driveId`: 어느 드라이브인가
   - `folderId`: 그 드라이브 안의 어느 폴더인가
10. Service Account Credential을 사용하는 경우 Shared Drive 사용을 기본 권장한다.
11. Service Account가 파일을 저장하려면 해당 Shared Drive 또는 대상 폴더에 서비스 계정 이메일이 편집 권한을 가져야 한다.
12. OAuth 계정 Credential을 사용하는 경우 My Drive와 Shared Drive 모두 접근 가능할 수 있으나, 해당 OAuth 계정에 대상 폴더 권한이 있어야 한다.
13. 권한 미공유, 잘못된 `driveId`, 잘못된 `folderId`, Shared Drive 접근 실패는 무시하지 않고 failed 또는 config_error callback 후보로 보고한다.

### 8.1 Drive settings 권장 구조

Google Drive 저장 워크플로우는 아래 settings 구조를 우선 고려한다.

```json
{
  "driveId": "shared_drive_id_or_empty_for_my_drive",
  "mdFolderId": "markdown_result_folder_id",
  "originalFileFolderId": "original_file_folder_id",
  "reportEmailTo": "user@example.com"
}
```

`driveId`는 선택값이다. My Drive만 사용하는 기존 워크플로우에서는 생략할 수 있다. Shared Drive 또는 Service Account 호환이 필요한 워크플로우에서는 `driveId`를 configSchema와 n8n 내부 참조에 반영한다.

### 8.2 Google Drive 노드 수정 기준

Google Drive 저장 노드를 검토할 때 아래 기준을 적용한다.

1. Google Drive 노드의 `folderId`가 `payload.settings` 기반인지 확인한다.
2. Google Drive 노드의 `driveId`가 `"My Drive"`로 고정되어 있는지 확인한다.
3. Shared Drive 호환이 필요한 경우 `driveId`를 `payload.settings.driveId` 기반으로 바꾼다.
4. `settings.driveId`가 비어 있으면 기존 My Drive 동작을 유지하도록 기본값을 둔다.
5. 기존 My Drive 전용 워크플로우를 강제로 Shared Drive 전용으로 바꾸지 않는다.
6. 기존 OAuth Credential을 Service Account Credential로 임의 변경하지 않는다.
7. Credential 변경이 필요하면 “Credential 재연결 필요 항목”에 명확히 보고한다.
8. n8n import 가능성을 위해 기존 Google Drive 노드의 operation, binary field, file name, folderId 표현식은 꼭 필요한 경우가 아니면 유지한다.

---

## 9. callback 표준

n8n은 업무 처리 성공 시 `payload.callbackUrl`로 아래 구조를 전송한다.

```json
{
  "submissionId": "sub_20260608_abcdef",
  "status": "success",
  "result": {
    "summary": "처리 요약",
    "resultUrl": "https://drive.google.com/file/d/xxxx/view"
  }
}
```

실패 시 아래 구조를 전송한다.

```json
{
  "submissionId": "sub_20260608_abcdef",
  "status": "failed",
  "error": {
    "code": "RESOURCE_PERMISSION_DENIED",
    "message": "Google Drive 폴더에 공용 계정 쓰기 권한이 없습니다."
  }
}
```

설정 오류는 `config_error`를 사용할 수 있다.

```json
{
  "submissionId": "sub_20260608_abcdef",
  "status": "config_error",
  "error": {
    "code": "REQUIRED_SETTING_MISSING",
    "message": "필수 settings가 누락되었습니다."
  }
}
```

callback HTTP Request 노드는 Header Auth Credential을 사용한다.

권장 Credential:

```text
Credential Type: Header Auth
Name: N8Lient Callback Bearer Secret
Header Name: Authorization
Header Value: Bearer {Gateway의 N8N_CALLBACK_SECRET 값}
```

적용 기준:

1. callback URL은 하드코딩하지 않고 `payload.callbackUrl` 또는 정규화된 config의 `callbackUrl`을 사용한다.
2. Authorization 값은 Code 노드에서 `$env.N8N_CALLBACK_SECRET`으로 조립하지 않는다.
3. Callback HTTP Request 노드에 Header Auth Credential을 연결한다.
4. 성공 callback이 이미 있으면 기존 구조를 최대한 유지한다.
5. 실패 callback이 현재 워크플로우 안에 없으면, 무리하게 전체 오류 흐름을 새로 만들지 말고 “현재 워크플로우 내부 처리”와 “공통 오류 리포터 처리” 중 어떤 방식이 적절한지 먼저 보고한다.
6. 공통 오류 리포터를 사용하는 경우, 해당 Error Workflow가 failed/config_error callback을 보장하는지 확인 대상으로 보고한다.

---

## 10. Webhook 즉시 응답 원칙

1. n8n Webhook의 즉시 응답은 업무 처리 완료가 아니다.
2. 즉시 응답은 “실행 접수” 의미다.
3. 실제 완료 여부는 callbackUrl로 전달된 success, failed, config_error 결과로 판단한다.
4. Sticky Note에 이 차이를 명확히 적는다.
5. Webhook 응답 모드와 응답 데이터 설정은 현재 n8n 버전의 실제 JSON 속성에 맞춰 검토한다.
6. 이미 정상 동작 중인 Webhook 응답 설정은 불필요하게 변경하지 않는다.

---

## 11. Sticky Note 영역 구분 지시

수정 JSON에는 Sticky Note를 추가하거나 갱신해 역할 영역을 시각적으로 구분한다.

기존 노드 위치를 크게 훼손하지 말고, 영역 제목과 주의사항을 명확히 표시한다.

필수 Sticky Note 영역:

1. N8Lient 입력/인증 영역

   * Webhook, Header Auth Credential, Gateway 서버 간 호출 설명

2. payload/settings 해석 영역

   * `payload.settings`, `payload.input`, `callbackUrl`, `submissionId` 정리

3. 순수 업무 처리 영역

   * AI 처리, 변환, 요약, 문서 생성 등 n8n 본연의 업무 로직

4. 결과 저장/발송 영역

   * Google Drive 저장, Gmail 발송, Sheets 기록 등

5. N8Lient callback 영역

   * success/failed/config_error callback 전송

6. 오류/예외 처리 영역

   * 필수 settings 누락, 권한 미공유, 외부 API 실패 처리

Sticky Note에는 “N8Lient 연동부”와 “순수 업무 처리부”가 구분되도록 적는다.

기존 Sticky Note에 구형 구조 설명이 남아 있으면, 운영자가 오해하지 않도록 현재 Cloud Run Gateway 표준 기준으로 갱신한다.

---

## 12. import 가능성 점검

수정 후 아래 항목을 점검한다.

1. JSON 파싱 오류가 없는가.
2. nodes 배열과 connections 구조가 깨지지 않았는가.
3. 연결되지 않은 필수 노드가 생기지 않았는가.
4. 기존 node id를 불필요하게 변경하지 않았는가.
5. 새로 추가한 노드가 있으면 id가 중복되지 않는가.
6. Credential 값 자체를 JSON에 하드코딩하지 않았는가.
7. Credential 참조는 이름과 타입 기준으로 식별 가능하게 남겼는가.
8. HTTP Request URL, Header, Body 표현식이 n8n 표현식 문법에 맞는가.
9. Code 노드 JavaScript 문법 오류가 없는가.
10. binary 필드명이 다음 노드의 `inputDataFieldName`과 일치하는가.
11. Sticky Note는 실행 로직에 영향을 주지 않는가.
12. n8n import 후 Credential 재연결이 필요한 항목을 별도로 보고했는가.

---

## 13. 1차 보고 형식

수정 전 1차 보고에는 아래 항목만 포함하라.

1. 현재 워크플로우의 N8Lient 표준 반영 상태
2. 수정이 필요한 노드 목록
3. 각 노드를 수정해야 하는 이유
4. 수정하지 말아야 할 노드 목록
5. 구형 직접 업로드 구조 발견 여부
6. Header Auth Credential 적용 상태
7. settings/input/payload/credentials 분류 결과
8. configSchema 등록 필요 항목
9. inputSchema 파일 입력 지원 여부
10. 공용 Google 계정 Credential 사용 여부
11. Webhook binary `file_0` 처리 여부
12. n8n CORS 의존 여부
13. callback 구조 상태
14. Sticky Note 갱신 필요 여부
15. 남은 위험 요소
16. Drive 저장소 모드 확인
    - My Drive 고정인지
    - Shared Drive 호환인지
    - `settings.driveId` 사용 여부
17. Google Drive Credential 유형 확인
    - OAuth 계정 Credential인지
    - Service Account Credential인지
    - import 후 재연결이 필요한지
18. 승인 요청 문장

1차 보고 후 사용자가 승인하면 그때 수정 JSON을 생성한다.

---

## 14. 최종 보고 형식

수정 JSON 생성 후 최종 보고에는 아래 항목만 포함하라.

1. 수정/추가/삭제한 노드
2. 직접 업로드 구형 구조 제거 여부
3. Header Auth Credential 적용 위치
4. settings/input/payload/credentials 추출 결과
5. configSchema 등록 필요 항목
6. inputSchema 파일 입력 지원 여부
7. 공용 Google 계정 Credential 사용 여부
8. Webhook binary `file_0` 처리 여부
9. n8n CORS 의존 제거 여부
10. callback 구조
11. Sticky Note 영역 구분 반영 여부
12. 남은 위험 요소
13. import 가능성 점검 결과
14. Credential 재연결 필요 항목
15. Drive 저장소 호환성
    - My Drive 사용 가능 여부
    - Shared Drive 사용 가능 여부
    - `driveId` 기본값 처리 방식
16. Google Drive Credential 정책
    - OAuth 계정 Credential 유지 여부
    - Service Account Credential 전환 가능 여부
    - 대상 Drive/Folder 권한 공유 필요 사항
