# 엔팔라이언트 Gateway ↔ n8n 실행 계약 v0.1

- 문서명: 엔팔라이언트 Gateway ↔ n8n 실행 계약
    
- 버전: v0.1
    
- 상위 문서: 엔팔라이언트 솔루션 헌법 1.0, 엔팔라이언트 아키텍처 명세서 1.0
    
- 목적: n8lient-gateway와 n8lient-workflows 사이의 최소 통신 구조를 정의한다.
    

---

## 1. 기본 원칙

브라우저는 n8n을 직접 호출하지 않는다.

```text
n8lient-app
→ n8lient-gateway
→ n8lient-workflows
→ n8lient-gateway callback
```

n8lient-gateway는 인증, 권한, 설정 병합, 파일 보관, 실행 이력 생성을 담당한다.

n8n은 Gateway가 전달한 표준 payload를 받아 프로세서 작업을 수행하고 결과를 callback으로 반환한다.

---

## 2. Gateway의 책임

Gateway는 n8n 호출 전에 다음을 완료해야 한다.

```text
1. Firebase ID Token 검증
2. 사용자 approvalStatus 확인
3. clientId 확인
4. workflow 사용권 확인
5. 회사 공용 설정 조회
6. 개인 설정 조회
7. 설정 병합
8. submission 생성
9. 파일이 있으면 Firebase Storage에 원본 저장
10. canonicalPayload 생성
11. n8n Webhook 서버 간 호출
```

---

## 3. n8n의 책임

n8n은 다음만 담당한다.

```text
1. Gateway 요청 수신
2. Header Auth 검증
3. payload 파싱
4. processorInput 생성 또는 수신
5. 실제 업무 처리
6. processorResult 생성
7. callbackUrl로 결과 반환
```

n8n은 Firestore를 직접 수정하지 않는다.  
n8n은 회사/개인 설정 병합을 수행하지 않는다.  
n8n은 사용자 권한을 판단하지 않는다.

---

## 4. 인증 계약

Gateway는 n8n Webhook 호출 시 Header Auth를 사용한다.

```text
Header Name: X-N8N-TOKEN
Header Value: Gateway의 N8N_SERVER_MAIN_TOKEN
```

n8n Webhook 노드는 Header Auth Credential로 이를 검증한다.

n8n 내부 Code 노드에서 `$env.N8N_SERVER_MAIN_TOKEN`을 직접 비교하는 방식은 표준이 아니다.

---

## 5. canonicalPayload 최소 구조

Gateway는 n8n에 다음 성격의 payload를 전달한다.

```json
{
  "submissionId": "sub_xxx",
  "clientId": "client_xxx",
  "uid": "user_uid",
  "workflowKey": "idea-catcher",
  "automationId": "auto_xxx",
  "trigger": {
    "type": "manual"
  },
  "settings": {
    "exampleSetting": "value"
  },
  "input": {
    "title": "입력 제목",
    "text": "입력 본문",
    "inputType": "text"
  },
  "originalFileRefs": [],
  "requestedAt": "ISO_8601",
  "callbackUrl": "https://gateway-url/api/automation/callback"
}
```

settings는 Gateway가 병합 완료한 최종 설정값이다.  
n8n은 settings를 다시 병합하지 않는다.

---

## 6. 파일 입력 계약

파일이 있는 실행은 기본적으로 다음을 만족해야 한다.

```text
1. Gateway는 파일 원본을 Firebase Storage에 저장한다.
2. Gateway는 originalFileRefs를 payload에 포함한다.
3. 필요 시 Gateway는 n8n에 binary file_0도 함께 전달할 수 있다.
```

초기 구현에서는 n8n 호환성을 위해 `file_0` binary 전달을 허용한다.

장기적으로는 n8n이 `originalFileRefs` 또는 signed reference 기반으로 파일을 읽는 구조로 확장할 수 있다.

---

## 7. processorInput 최소 구조

n8n은 canonicalPayload에서 프로세서에 필요한 값만 추출해 processorInput을 만든다.

```json
{
  "title": "입력 제목",
  "text": "입력 본문",
  "inputType": "audio",
  "primaryFile": {
    "fileName": "audio.webm",
    "mimeType": "audio/webm",
    "sizeBytes": 8234412,
    "binaryKey": "file_0"
  },
  "options": {}
}
```

processorInput은 입력 출처에 직접 의존하지 않아야 한다.

즉, manual, watch, webhook, scheduled 입력이더라도 프로세서 영역은 같은 구조로 처리할 수 있어야 한다.

---

## 8. processorResult 최소 구조

n8n은 처리 완료 후 processorResult를 만든다.

```json
{
  "title": "결과 제목",
  "summary": "결과 요약",
  "content": "본문",
  "mdContent": "# Markdown 결과",
  "structuredData": {},
  "keywords": [],
  "warnings": []
}
```

워크플로우에 따라 일부 필드는 비어 있을 수 있다.

단, 최소한 `title` 또는 `summary` 중 하나는 반환하는 것을 권장한다.

---

## 9. success callback 계약

n8n은 성공 시 `callbackUrl`로 다음 구조를 전송한다.

```json
{
  "submissionId": "sub_xxx",
  "status": "success",
  "processorResult": {
    "title": "결과 제목",
    "summary": "결과 요약",
    "content": "본문",
    "mdContent": "# Markdown 결과",
    "structuredData": {},
    "keywords": [],
    "warnings": []
  },
  "resultRefs": []
}
```

Gateway는 callback을 수신해 submissions를 success로 갱신한다.

---

## 10. failed callback 계약

n8n은 실패 시 가능한 한 failed callback을 전송한다.

```json
{
  "submissionId": "sub_xxx",
  "status": "failed",
  "error": {
    "code": "PROCESSOR_FAILED",
    "message": "프로세서 처리 중 오류가 발생했습니다."
  }
}
```

---

## 11. config_error callback 계약

필수 settings 또는 필수 input이 누락된 경우 config_error를 사용할 수 있다.

```json
{
  "submissionId": "sub_xxx",
  "status": "config_error",
  "error": {
    "code": "REQUIRED_SETTING_MISSING",
    "message": "필수 설정값이 누락되었습니다."
  }
}
```

---

## 12. error.code 최소 후보

초기 표준 error.code 후보는 다음과 같다.

```text
REQUIRED_SETTING_MISSING
REQUIRED_INPUT_MISSING
REQUIRED_INPUT_FILE_MISSING
UNSUPPORTED_FILE_TYPE
MAX_UPLOAD_EXCEEDED
RESOURCE_PERMISSION_DENIED
STORAGE_UPLOAD_FAILED
PROCESSOR_FAILED
CALLBACK_FAILED
EXTERNAL_API_FAILED
```

세부 error code 목록은 후속 Gateway API 규약서에서 확정한다.

---

## 13. Optional Export

Google Drive, Gmail, Sheets, Docs 등 외부 저장 또는 발송은 Optional Export로 본다.

Optional Export가 필요한 경우 n8n에서 수행할 수 있다.

단, Optional Export 실패가 기본 processorResult 생성 성공을 무조건 실패로 만들지는 않는다.  
워크플로우 성격에 따라 warning으로 처리할 수 있다.

---

## 14. 금지 사항

아래 구조는 금지한다.

```text
- 브라우저가 n8n Webhook 직접 호출
- n8n이 Firestore 직접 수정
- n8n이 설정 병합 수행
- n8n이 사용자 권한 판단
- n8n이 Credential ID를 payload에서 받음
- n8n이 Google Access Token 또는 Refresh Token을 payload에서 받음
- Gateway가 만든 callbackUrl 대신 하드코딩 URL 사용
```

---

## 15. 미확정 항목

아래 항목은 후속 Gateway API 규약서에서 확정한다.

```text
- 전체 API endpoint 목록
- request/response JSON 전문
- 인증 실패 응답 형식
- callback retry 정책
- signed URL 정책
- queue/worker 분리 여부
```