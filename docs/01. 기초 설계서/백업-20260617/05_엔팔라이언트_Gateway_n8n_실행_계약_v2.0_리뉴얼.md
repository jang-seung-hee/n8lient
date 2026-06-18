# 엔팔라이언트 Gateway ↔ n8n 실행 계약 v2.0

- 문서명: 엔팔라이언트 Gateway ↔ n8n 실행 계약
- 버전: v2.0 리뉴얼
- 작성일: 2026-06-16
- 문서 상태: 현행 실행 계약 기준 문서
- 상위 문서: 솔루션 헌법 v2.0, 아키텍처 명세서 v2.0, 결과/보관 레벨 계약 v2.0

---

## 1. 기본 원칙

브라우저는 n8n을 직접 호출하지 않는다.

```text
n8lient-app
→ n8lient-gateway
→ n8lient-workflows(n8n)
→ n8lient-gateway callback
```

Gateway는 인증, 권한, 설정 병합, 보관 정책 결정, submission 생성, 파일 처리, n8n 호출, callback 저장을 담당한다.

n8n은 Gateway가 전달한 canonicalPayload를 받아 업무 처리를 수행하고, 결과를 Gateway callback으로 반환한다.

---

## 2. Gateway 책임

Gateway는 n8n 호출 전에 다음을 완료해야 한다.

```text
1. Firebase ID Token 검증
2. 사용자 승인 상태 확인
3. clientId 확인
4. workflow 사용권 확인
5. workflowTemplate 조회
6. clientAutomation/clientContract 확인
7. 회사 설정 조회
8. 개인 설정 조회
9. 설정 병합
10. inputSchema/configSchema 기반 실행 검증
11. retentionPolicy 계산
12. submission 생성
13. 파일 처리
14. canonicalPayload 생성
15. n8n Webhook 서버 간 호출
```

Gateway는 실행 요청의 최종 방어선이다.

---

## 3. n8n 책임

n8n은 다음만 담당한다.

```text
1. Gateway 요청 수신
2. Header Auth 검증
3. canonicalPayload 파싱
4. 입력 정리
5. processorInput 생성
6. 업무 처리
7. processorResult 생성
8. retentionPolicy에 따른 후처리
9. Optional Export 수행
10. Gateway callback 호출
```

n8n이 하지 않는 일:

```text
Firestore 직접 수정
사용자 권한 판단
회사/개인 설정 병합
retentionPolicy 최종 계산
사용자 Credential 저장
```

---

## 4. 인증 계약

Gateway가 n8n Webhook을 호출할 때는 Header Auth를 사용한다.

```text
Header Name: X-N8N-TOKEN
Header Value: Gateway의 N8N_SERVER_MAIN_TOKEN
```

n8n이 Gateway callback을 호출할 때도 Header Auth를 사용한다.

```text
Header Name: Authorization
Header Value: Bearer {N8N_CALLBACK_SECRET}
```

Secret 값은 문서, 로그, UI, 테스트 출력에 노출하지 않는다.

---

## 5. canonicalPayload 최소 구조

Gateway는 n8n에 다음 구조를 전달한다.

```json
{
  "submissionId": "sub_xxx",
  "clientId": "client_xxx",
  "uid": "uid_xxx",
  "workflowKey": "n8lient-idea-catcher",
  "automationId": "auto_xxx",
  "callbackUrl": "https://.../api/automation/callback",
  "input": {
    "title": null,
    "titleProvided": false,
    "titleSource": "empty",
    "text": "",
    "inputType": "audio"
  },
  "submissionTitle": "아이디어 캐처 음성 입력 2026-06-16 09:00",
  "displayTitle": "아이디어 캐처 음성 입력 2026-06-16 09:00",
  "settings": {},
  "retentionPolicy": {
    "level": "processed_result",
    "emailEnabled": true,
    "emailAttachResult": true,
    "emailAttachOriginal": false,
    "storeProcessorResult": true,
    "storeOriginalFileRefs": false,
    "storeResultRefs": false,
    "optionalExportProvider": "none"
  },
  "files": []
}
```

---

## 6. title 계약

`input.title`은 사용자가 직접 입력한 제목만 의미한다.

```text
사용자 제목 있음 → input.title = "사용자 입력 제목", titleProvided = true
사용자 제목 없음 → input.title = null, titleProvided = false
```

Gateway는 `input.title`을 고정 필수값으로 검사하지 않는다.

```text
titleRequired=true → input.title 필수
titleRequired=false → input.title=null 허용
```

시스템 임시 제목은 다음 필드에만 둔다.

```text
submissionTitle
displayTitle
```

n8n/Gemini는 `submissionTitle`을 사용자가 입력한 제목으로 취급하지 않는다.

callback 후 표시 우선순위:

```text
processorResult.title
→ displayTitle
→ submissionTitle
```

---

## 7. 실행 Validation 계약

Gateway는 workflowTemplate의 schema를 기준으로 실행 가능 여부를 검증한다.

입력 schema 기준:

```text
acceptedInputTypes
allowedFileTypes
maxFileSizeMB
titleRequired
requiredInputMode
requiredInputTypes
maxFiles
```

설정 schema 기준:

```text
required
conditionalRequired
```

검증 원칙:

```text
automationId는 항상 필수다.
input 객체는 항상 필수다.
input.title은 titleRequired=true일 때만 필수다.
requiredInputMode에 따라 text/audio/image/file 입력 충족 여부를 판단한다.
conditionalRequired는 Gateway에서도 최종 방어 검증한다.
```

---

## 8. retentionPolicy 계산

Gateway는 최종 retentionPolicy를 계산해 canonicalPayload에 포함한다.

계산 계층:

```text
workflowTemplates.retentionCapabilities
→ clientContracts.contractRetentionLimit
→ clientAutomations.contractRetentionLimit
→ clientAutomations.companyRetentionPolicy
→ userAutomationSettings.userRetentionPreference
→ Gateway 최종 계산
```

선택 가능 레벨:

```text
selectableLevels =
workflowTemplates.retentionCapabilities.supportedLevels
∩ clientAutomations.contractRetentionLimit.allowedLevels
```

Gateway는 잘못된 요청을 한도 내 보정하거나 오류 처리한다.

---

## 9. retentionPolicy 필드

권장 구조:

```json
{
  "level": "notify_only",
  "resolvedFrom": "user_preference | company_recommended | workflow_default | system_default",
  "emailEnabled": true,
  "emailAttachResult": true,
  "emailAttachOriginal": false,
  "storeProcessorResult": false,
  "storeOriginalFileRefs": false,
  "storeResultRefs": false,
  "optionalExportProvider": "none"
}
```

레벨별 기본 해석:

```text
notify_only:
- storeProcessorResult=false
- storeOriginalFileRefs=false
- storeResultRefs=false
- emailAttachResult 가능

processed_result:
- storeProcessorResult=true
- storeOriginalFileRefs=false
- storeResultRefs=false 기본

full_archive:
- storeProcessorResult=true
- storeOriginalFileRefs=true
- storeResultRefs=true 가능
```

---

## 10. 파일 처리 계약

### 10.1 notify_only

```text
원본 파일 영구 보관 없음
처리 중 임시 사용 가능
이메일 첨부용 MD, 기타파일 임시 생성 가능
Storage 저장 없음
```

### 10.2 processed_result

```text
원본 파일 영구 보관 없음
processorResult 저장
MD 다운로드는 mdContent 기반 동적 생성
Storage 결과 파일 기본 없음
```

### 10.3 full_archive

```text
원본 파일 Storage 저장
결과 파일 Storage 저장 가능
originalFileRefs/resultRefs callback 포함
```

---

## 11. callback 요청 구조

n8n은 처리 완료 후 Gateway callback으로 결과를 반환한다.

```json
{
  "submissionId": "sub_xxx",
  "status": "success",
  "processorResult": {
    "title": "결과 제목",
    "summary": "짧은 요약",
    "content": "본문",
    "mdContent": "# 마크다운 본문",
    "hashtags": [],
    "structuredData": {},
    "warnings": []
  },
  "originalFileRefs": [],
  "resultRefs": [],
  "error": null
}
```

Gateway는 callback 수신 후 다음을 수행한다.

```text
status 업데이트
processorResult 저장 여부 판단
originalFileRefs/resultRefs 저장 여부 판단
displayTitle 갱신
completedAt 기록
error 정보 기록
```

---

## 12. n8n Result Policy Router

n8n은 Gateway가 전달한 retentionPolicy를 기준으로 결과 후처리를 분기한다.

```text
notify_only
→ 이메일 본문/MD, 기타파일 첨부 전송 중심
→ processorResult 전체 DB 저장 목적 callback 생략 가능

processed_result
→ processorResult callback 포함
→ 원본 파일 참조 제외

full_archive
→ processorResult callback 포함
→ originalFileRefs/resultRefs 포함
```

Optional Export는 retentionPolicy.level을 대체하지 않고, 별도 부가 기능으로 처리한다.

---

## 13. 오류 처리

Gateway 오류 응답은 사용자 메시지와 개발자 디버그 정보를 분리한다.

원칙:

```text
일반 사용자에게는 간단한 메시지 제공
debug=1일 때만 안전한 진단 정보 제공
Token, Secret, Credential, 원본 파일 내용, settings 실제 값은 노출 금지
```

구형 오류 메시지 금지:

```text
필수 파라미터(automationId, input.title)가 누락되었습니다.
```

대신 schema 기반 누락 필드를 명확히 반환한다.

---

## 14. 금지 사항

```text
Gateway가 input.title을 항상 필수로 보는 것
n8n이 Firestore를 직접 수정하는 것
n8n이 settings를 직접 조회하는 것
n8n이 retentionPolicy를 임의 재계산하는 것
callback 없이 n8n이 결과를 외부에만 저장하는 것
Secret/Token을 payload.settings로 전달하는 것
```
