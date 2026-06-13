# N8Lient 규약 기반 n8n 워크플로우 JSON 수정 지시 프롬프트 v1.3

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
8. settings.xxx는 configSchema 후보, input.xxx는 실행 입력값, payload.xxx는 시스템 메타데이터, credentials는 n8n 고정 Credential로 분류한다.
9. Webhook URL, Token, Secret, API Key는 하드코딩하지 않는다.
10. 브라우저에는 공통 `X-N8N-TOKEN` 또는 n8n 서버 토큰을 절대 노출하지 않는다.
11. n8n Webhook 노드는 Header Auth Credential로 `X-N8N-TOKEN`을 검증한다.
12. n8n Code 노드에서 `$env.N8N_SERVER_MAIN_TOKEN`을 직접 읽어 토큰을 비교하는 구조는 기본값으로 사용하지 않는다.
13. n8n Cloud 호환성을 위해 서버 `.env` 의존보다 Credential 기반 인증을 우선한다.
14. Google Drive, Google Sheets, Gmail 노드는 사용자별 Credential을 동적으로 바꾸지 않고 n8n 공용 Google 계정 Credential을 고정 사용한다.
15. settings에는 폴더 ID, 시트 ID, 수신 이메일 등 대상 리소스 값만 넣고, Google Access Token, Refresh Token, n8n Credential ID, Gemini API Key는 절대 넣지 않는다.
16. 개인/회사 Google Drive 폴더나 Sheet는 n8n 공용 Google 계정에 쓰기 권한으로 공유되어 있어야 한다.
17. reportEmailTo는 수신자이며, 실제 발신자는 n8n 공용 Gmail 계정이다.
18. 작업 완료 후 `callbackUrl`로 success payload를 전송한다.
19. 실패 callback은 현재 워크플로우에서 처리할지, 공통 오류 리포터에서 처리할지 명확히 구분한다.
20. 권한 미공유, 필수 settings 누락, 리소스 접근 실패는 callback failed 또는 config_error로 반환하도록 설계한다.
21. 파일 입력이 있는 워크플로우는 Webhook 노드가 multipart/form-data와 binary `file_0`를 받을 수 있게 구성한다.
22. n8n Webhook의 즉시 응답은 처리 완료가 아니라 실행 접수 의미다. 실제 완료는 callbackUrl 결과로 판단한다.
23. Sticky Note도 Cloud Run Gateway 구조와 실제 코드 분석 결과에 맞게 갱신한다.

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
* Code 노드 내부의 `$env.N8N_SERVER_MAIN_TOKEN` 직접 비교 구조
* Callback 노드 내부의 `$env.N8N_CALLBACK_SECRET` 직접 참조 구조

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

## Webhook 인증 표준

n8n Webhook 노드는 Header Auth Credential을 사용한다.

권장 Credential:

```text
Credential Type: Header Auth
Name: N8Lient Gateway Header Auth
Header Name: X-N8N-TOKEN
Header Value: Gateway의 N8N_SERVER_MAIN_TOKEN 값
```

Webhook 노드에서 인증이 실패하면 후속 노드가 실행되지 않아야 한다.

`00 환경설정` Code 노드는 토큰 비교가 아니라 아래 역할만 수행한다.

1. JSON 호출이면 body를 payload로 사용한다.
2. multipart 호출이면 body.payload 또는 json.payload를 파싱하여 payload로 사용한다.
3. `payload.settings`, `payload.input`, `payload.callbackUrl`, `payload.submissionId`를 표준 config로 정리한다.
4. 필수 settings 누락 여부를 검증한다.
5. binary `file_0`가 있으면 보존하여 다음 노드로 넘긴다.
6. 구형 구조처럼 `verify-upload-token`을 호출하지 않는다.

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

callback HTTP Request 노드는 Header Auth Credential을 사용한다.

권장 Credential:

```text
Credential Type: Header Auth
Name: N8Lient Callback Bearer Secret
Header Name: Authorization
Header Value: Bearer {Gateway의 N8N_CALLBACK_SECRET 값}
```

callback URL은 하드코딩하지 말고 `payload.callbackUrl`을 사용한다.

---

## Sticky Note 영역 구분 지시

수정 JSON에는 Sticky Note를 추가해 역할 영역을 시각적으로 구분한다. 기존 노드 위치를 크게 훼손하지 말고, 영역 제목과 주의사항을 명확히 표시한다.

필수 Sticky Note 영역:

1. **N8Lient 입력/인증 영역**

   * Webhook, Header Auth Credential, Gateway 서버 간 호출 설명
2. **payload/settings 해석 영역**

   * `payload.settings`, `payload.input`, `callbackUrl`, `submissionId` 정리
3. **순수 업무 처리 영역**

   * AI 처리, 변환, 요약, 문서 생성 등 n8n 본연의 업무 로직
4. **결과 저장/발송 영역**

   * Google Drive 저장, Gmail 발송, Sheets 기록 등
5. **N8Lient callback 영역**

   * success/failed/config_error callback 전송
6. **오류/예외 처리 영역**

   * 필수 settings 누락, 권한 미공유, 외부 API 실패 처리

Sticky Note에는 “N8Lient 연동부”와 “순수 업무 처리부”가 구분되도록 적는다.

---

## 최종 보고 형식

최종 보고에는 아래 항목만 포함하라.

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
