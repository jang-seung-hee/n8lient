# N8Lient 규약 기반 n8n 워크플로우 JSON 수정 지시 프롬프트 v1.2

첨부한 아래 4개 파일을 기준으로 n8n 워크플로우 JSON을 엔팔라이언트(N8Lient) Cloud Run Gateway 규약에 맞게 최적화/수정하라.

참고 문서.

1. N8Lient_MVP_구조개요서.md
2. N8Lient_DB_연동규약서.md
3. N8Lient_Webhook_Callback_연동규약서.md
4. 수정 대상 n8n 워크플로우 JSON

---

## 중요 원칙

1. 전체를 갈아엎지 말고 필요한 노드만 최소 변경한다.
2. 수정 전 변경 대상 노드와 이유를 먼저 보고하고 승인받는다.
3. n8n은 Firestore를 직접 조회하거나 개인/회사 설정을 병합하지 않는다.
4. n8n은 Cloud Run Gateway가 전달한 `payload.settings`를 최종 실행 설정값으로 사용한다.
5. 텍스트 실행과 파일 실행 모두 Cloud Run Gateway가 n8n Webhook을 서버 간 호출한다.
6. 브라우저가 n8n Webhook을 직접 호출하지 않는다.
7. `uploadToken`, `verify-upload-token`, `upload-failed`, `uploadSessions` 구조는 표준 구조에서 제거한다.
8. settings.xxx는 configSchema 후보, input.xxx는 실행 입력값, payload.xxx는 시스템 메타데이터, $env.xxx는 n8n 서버 환경변수로 분류한다.
9. Webhook URL, Token, Secret, API Key는 하드코딩하지 않는다.
10. 브라우저에는 공통 `X-N8N-TOKEN` 또는 n8n 서버 토큰을 절대 노출하지 않는다.
11. n8n은 `X-N8N-TOKEN`을 검증하고, 토큰이 없거나 불일치하면 즉시 실패시킨다.
12. Google Drive, Google Sheets, Gmail 노드는 사용자별 Credential을 동적으로 바꾸지 않고 n8n 공용 Google 계정 Credential을 고정 사용한다.
13. settings에는 폴더 ID, 시트 ID, 수신 이메일 등 대상 리소스 값만 넣고, Google Access Token, Refresh Token, n8n Credential ID, Gemini API Key는 절대 넣지 않는다.
14. 개인/회사 Google Drive 폴더나 Sheet는 n8n 공용 Google 계정에 쓰기 권한으로 공유되어 있어야 한다.
15. reportEmailTo는 수신자이며, 실제 발신자는 n8n 공용 Gmail 계정이다.
16. 작업 완료 후 `callbackUrl`로 success payload를 전송한다.
17. 실패 callback은 현재 워크플로우에서 처리할지, 공통 오류 리포터에서 처리할지 명확히 구분한다.
18. 권한 미공유, 필수 settings 누락, 리소스 접근 실패는 callback failed 또는 config_error로 반환하도록 설계한다.
19. 파일 입력이 있는 워크플로우는 Webhook 노드가 multipart/form-data와 binary `file_0`를 받을 수 있게 구성한다.
20. n8n Webhook의 즉시 응답은 처리 완료가 아니라 실행 접수 의미다. 실제 완료는 callbackUrl 결과로 판단한다.
21. Sticky Note도 Cloud Run Gateway 구조와 실제 코드 분석 결과에 맞게 갱신한다.

---

## 제거해야 할 구형 직접 업로드 구조

아래 구조가 기존 워크플로우에 있으면 제거하거나 비활성화한다.

* 브라우저 직접 업로드 분기
* `submissionId + uploadToken` 검증 분기
* `/api/automation/verify-upload-token` 호출 HTTP Request 노드
* `N8LIENT_BASE_URL` 또는 `N8LIENT_APP_BASE_URL` 의존
* n8n Webhook Allowed Origins(CORS) 운영 의존 구조
* `no-server-token-dev` 같은 개발용 우회 인증
* `uploadSessions` 관련 Sticky Note 또는 코드 주석

---

## 표준 n8n 입력 구조

Cloud Run Gateway는 n8n Webhook으로 아래 중 하나를 보낸다.

### 1. JSON 실행

```json
{
  "submissionId": "sub_20260608_abcdef",
  "clientId": "client_rentaltoktok_001",
  "uid": "firebase_uid_001",
  "workflowKey": "idea-catcher",
  "automationId": "auto_idea_001",
  "settings": {
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

### 2. multipart 실행

```text
FormData
- payload: JSON.stringify(canonicalPayload)
- file_0: binary file
```

n8n은 `payload`를 JSON으로 파싱하고, binary `file_0`를 워크플로우 내부 표준 binary 필드로 넘긴다.

---

## 00 환경설정 노드 표준 처리

`00 환경설정` 노드는 아래만 수행한다.

1. Webhook headers에서 `x-n8n-token`을 읽는다.
2. `$env.N8N_SERVER_MAIN_TOKEN`과 비교한다.
3. 불일치하면 즉시 실패한다.
4. JSON 호출이면 body를 payload로 사용한다.
5. multipart 호출이면 body.payload 또는 json.payload를 파싱하여 payload로 사용한다.
6. `payload.settings`, `payload.input`, `payload.callbackUrl`, `payload.submissionId`를 표준 config로 정리한다.
7. binary `file_0`가 있으면 보존하여 다음 노드로 넘긴다.

구형 구조처럼 `verify-upload-token`을 호출하지 않는다.

---

## callback 표준

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

callback 요청에는 아래 헤더를 포함한다.

```http
Authorization: Bearer {{$env.N8N_CALLBACK_SECRET}}
```

---

## 최종 보고 형식

최종 보고에는 아래 항목만 포함하라.

1. 수정/추가/삭제한 노드
2. 직접 업로드 구형 구조 제거 여부
3. settings/input/payload/env 추출 결과
4. configSchema 등록 필요 항목
5. inputSchema 파일 입력 지원 여부
6. 공용 Google 계정 Credential 사용 여부
7. 서버 간 호출 인증 구조(`X-N8N-TOKEN`) 적용 여부
8. Webhook binary `file_0` 처리 여부
9. n8n CORS 의존 제거 여부
10. callback 구조
11. Sticky Note 갱신 여부
12. 남은 위험 요소
13. import 가능성 점검 결과
