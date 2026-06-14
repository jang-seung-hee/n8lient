# [Google Drive Optional Export 고도화 개정 메모]

이 문서는 2026-06-13 기준으로 확정된 Google Drive Optional Export 패키지 정책을 추가 반영한 보존형 개정본이다.

기존 원문은 삭제하지 않는다.  
다만 Google Drive Export가 사용되는 경우에는 아래 정책을 우선 해석 기준으로 삼는다.

## 핵심 원칙

```text
엔팔라이언트 기본 저장소 = Firestore + Firebase Storage
Google Drive = 기본 저장소가 아니라 Optional Export
Optional Export = 사용자가 선택한 외부 복사/내보내기 패키지
```

Google Drive Optional Export는 결과/보관 레벨을 대체하지 않는다.  
`retentionPolicy.level`은 여전히 Gateway가 결정하고, n8n은 Gateway가 내려준 정책을 따른다.

## Google Drive Optional Export 폴더 분리

Google Drive Optional Export를 사용하는 워크플로우는 MD 결과 파일과 첨부파일 저장 위치를 분리한다.

```text
MD 파일 보관 폴더명
MD 파일 보관 폴더 ID
첨부파일 보관 폴더명
첨부파일 보관 폴더 ID
```

폴더명은 사용자가 이해하기 위한 표시값이다.  
실제 업로드 위치는 Google Drive Folder ID를 기준으로 한다.

## 표준 설정 키

```text
optionalExportProvider
googleDriveMdFolderName
googleDriveMdFolderId
googleDriveAttachmentFolderName
googleDriveAttachmentFolderId
```

조건부 필수 규칙은 다음과 같다.

```text
optionalExportProvider = none
→ Google Drive 관련 필드는 없어도 된다.

optionalExportProvider = google_drive
→ MD 폴더명, MD 폴더 ID, 첨부파일 폴더명, 첨부파일 폴더 ID를 모두 요구한다.
```

## 표준 동작

```text
1. n8n은 Gateway가 병합해 전달한 payload.settings를 사용한다.
2. MD 파일은 googleDriveMdFolderId에 업로드한다.
3. 원본 음성, 이미지, 첨부파일은 googleDriveAttachmentFolderId에 업로드한다.
4. MD 본문에는 업로드된 첨부파일의 Google Drive 링크를 포함한다.
5. resultRefs에는 MD export 결과와 첨부 export 결과를 구분해 기록한다.
```

권장 resultRefs 타입:

```text
optional_export_md
optional_export_attachment
```

## Level 2 / Level 3와의 관계

```text
processed_result + google_drive
→ 엔팔라이언트 DB에는 processorResult 저장
→ Firebase Storage 원본 보관은 기본적으로 없음
→ Google Drive Optional Export가 켜져 있으면 원본 첨부파일을 Google Drive 첨부 폴더에 외부 복사 가능

full_archive + google_drive
→ 엔팔라이언트 DB에는 processorResult 저장
→ Firebase Storage에는 원본 보관
→ Google Drive에도 MD 파일과 첨부파일을 외부 복사 가능
```

따라서 Google Drive Optional Export는 엔팔라이언트 기본 보관 정책과 별개의 외부 복사 동작이다.  
UI에서는 사용자가 혼동하지 않도록 아래 의미를 명확히 표시한다.

```text
Google Drive 내보내기를 사용하면 MD 결과 파일과 원본 첨부파일이 지정한 Google Drive 폴더에 복사됩니다.
```

## 보안 및 Credential 원칙

```text
Google Drive 폴더 ID는 settings로 받는다.
Google 계정, OAuth Token, Refresh Token, Credential ID는 settings로 받지 않는다.
Google Drive 접근 권한은 n8n Credential이 담당한다.
지정한 폴더 ID는 해당 n8n Google Drive Credential 계정이 접근 가능한 폴더여야 한다.
```

---


# [지식 DB화/검색 최소 계약 개정 메모]

이 문서는 2026-06-12 기준으로 확정된 엔팔라이언트 결과 DB화 및 지식 검색 최소 구조를 추가 반영한 보존형 개정본이다.

기존 원문은 삭제하지 않는다.  
다만 Level 2 `processed_result` 이상에서 DB에 저장되는 결과는 아래 최소 공통 구조를 우선 해석 기준으로 삼는다.

## 핵심 원칙

```text
Level 1 notify_only = 이메일/알림 중심. 자유 포맷 허용.
Level 2 processed_result 이상 = 최소 공통 DB 포맷 적용.
Level 3 full_archive = 최소 공통 DB 포맷 + 원본/결과 파일 참조 보관.
```

통합 검색, 벡터라이징, 자동 분류, 백링크, 지식 그래프는 워크플로우 실행 단계에서 수행하지 않는다.  
이런 후가공은 나중에 `knowledgeSearchIndex`, `embeddingIndex` 또는 별도 인덱싱/마이그레이션 워크플로우에서 처리한다.

## 최소 공통 결과 구조

Level 2 이상에서 `processorResult`는 가능한 한 아래 공통 필드를 맞춘다.

```json
{
  "title": "결과 제목",
  "summary": "짧은 요약",
  "content": "본문 텍스트",
  "mdContent": "마크다운 본문",
  "hashtags": ["태그1", "태그2"],
  "attachments": [],
  "structuredData": {},
  "warnings": []
}
```

## 검색 1차 대상

초기 검색은 다음 필드를 우선 대상으로 한다.

```text
title
summary
content
mdContent
hashtags
authorName
workflowName
companyName
createdAt
```

검색 결과 카드에는 다음 라벨을 표시할 수 있어야 한다.

```text
제목
요약
워크플로우명
작성자
회사명
생성일
첨부파일 여부
보관 레벨
```

## 원본성 결과와 후가공 결과 분리

워크플로우는 가능한 한 원본성 결과를 저장한다.

```text
좋은 예:
- 발화/회의/통화/문서 내용을 정리한 title, content, mdContent
- 사용자가 나중에 검색할 수 있는 최소 hashtags
- 첨부파일 참조

피해야 할 예:
- 자동 백링크 생성
- 지식 그래프 생성
- 벡터 임베딩 생성
- 과도한 자동 분류
- 후가공 규칙에 종속된 태그 대량 생성
```

## 저장 계층

```text
submissions = 원본형 실행 결과와 최소 공통 processorResult 저장
knowledgeSearchIndex = 향후 통합 검색/자연어 검색용 후가공 인덱스
embeddingIndex = 필요 시 Level 2 이상 결과를 대상으로 생성하는 벡터 인덱스
```

Obsidian과 Google Drive Export는 기본 지식관리 저장소가 아니다.  
엔팔라이언트의 기준 저장소는 Firestore + Firebase Storage다.  
Obsidian, Google Drive, Markdown Export는 Optional Export로만 본다.

---

# [보존형 개정 메모]

이 문서는 기존 원문을 삭제하거나 요약하지 않고 보존한 상태에서, 2026-06-12 기준으로 확정된 결과/보관 정책 계층 구조를 우선 해석 기준으로 추가한 보존형 개정본이다.

기존 문서의 철학, 서비스 책임 경계, 4단계 자동화 구조는 유지한다.  
다만 결과/보관 정책 관련 용어와 우선순위는 아래 최신 정책을 우선한다.

## 최신 결과/보관 정책 계층

```text
워크플로우 마스터 = 기술적 최대치
회사별 계약/매핑 = 계약 한도
회사관리자 설정 = 회사 권장값
개인사용자 설정 = 개인 선택
Gateway = 최종 계산 및 방어
n8n = Gateway가 내려준 최종 retentionPolicy에 따른 분기 처리
```

## 강제 한도

```text
workflowTemplates.retentionCapabilities
→ clientContracts.contractRetentionLimit
→ clientAutomations.contractRetentionLimit
```

워크플로우가 기술적으로 지원하지 않는 단계, 또는 회사가 계약하지 않은 단계는 선택할 수 없다.

## 실행 선택 우선순위

```text
userAutomationSettings.userRetentionPreference
→ clientAutomations.companyRetentionPolicy.recommendedLevel
→ workflowTemplates.retentionCapabilities.defaultLevel
→ 시스템 기본값 full_archive
```

회사관리자의 설정은 강제값이 아니라 회사 권장값이다.  
개인사용자가 별도 설정을 하면 개인 설정이 회사 권장값보다 우선한다.  
단, 개인 설정은 워크플로우 기술 한도와 회사별 계약 한도를 초과할 수 없다.

## 핵심 필드

```text
workflowTemplates.retentionCapabilities
clientContracts.contractRetentionLimit
clientAutomations.contractRetentionLimit
clientAutomations.companyRetentionPolicy
userAutomationSettings.userRetentionPreference
submissions.retentionPolicySnapshot
submissions.retentionPolicySnapshot.resolvedFrom
```

## 최신 계산 원칙

```text
selectableLevels =
workflowTemplates.retentionCapabilities.supportedLevels
∩ clientAutomations.contractRetentionLimit.allowedLevels
```

회사 권장값은 선택 가능 범위를 제한하지 않는다.  
Gateway는 잘못된 요청이 들어와도 최종 방어선으로 한도 내 보정 또는 오류 처리를 수행한다.

---

# 이하 기존 문서 원문 전체 보존

# 엔팔라이언트 Gateway ↔ n8n 실행 계약 v0.2

- 문서명: 엔팔라이언트 Gateway ↔ n8n 실행 계약
- 버전: v0.2
- 이전 버전: v0.1
- 상위 문서: 엔팔라이언트 솔루션 헌법 1.1, 엔팔라이언트 아키텍처 명세서 1.1, 엔팔라이언트 결과/보관 레벨 최소 계약 v0.1
- 목적: n8lient-gateway와 n8lient-workflows 사이의 최소 통신 구조를 정의한다.
- 개정 요지: canonicalPayload에 retentionPolicy를 추가하고, 파일 보관을 resultRetentionLevel 기준으로 조건화한다.

---

## 1. 기본 원칙

브라우저는 n8n을 직접 호출하지 않는다.

```text
n8lient-app
→ n8lient-gateway
→ n8lient-workflows
→ n8lient-gateway callback
```

n8lient-gateway는 인증, 권한, 설정 병합, 보관 정책 결정, 파일 처리, 실행 이력 생성을 담당한다.

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
8. retentionPolicy 결정
9. submission 생성
10. retentionPolicy에 따른 파일 저장 또는 임시 처리
11. canonicalPayload 생성
12. n8n Webhook 서버 간 호출
```

---

## 3. n8n의 책임

n8n은 다음만 담당한다.

```text
1. Gateway 요청 수신
2. Header Auth 검증
3. payload 파싱
4. retentionPolicy 확인
5. processorInput 생성 또는 수신
6. 실제 업무 처리
7. processorResult 생성
8. 결과/보관 정책에 따른 후처리
9. callbackUrl로 결과 반환
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

n8n이 Gateway callback을 호출할 때도 Header Auth Credential을 사용한다.

```text
Header Name: Authorization
Header Value: Bearer {N8N_CALLBACK_SECRET}
```

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
  "retentionPolicy": {
    "level": "processed_result",
    "emailEnabled": false,
    "storeProcessorResult": true,
    "storeOriginalFiles": false,
    "storeResultFiles": false,
    "storageProvider": "firestore",
    "optionalExportProvider": "none"
  },
  "originalFileRefs": [],
  "requestedAt": "ISO_8601",
  "callbackUrl": "https://gateway-url/api/automation/callback"
}
```

settings는 Gateway가 병합 완료한 최종 설정값이다.  
n8n은 settings를 다시 병합하지 않는다.

retentionPolicy는 Gateway가 결정한 최종 보관 정책이다.  
n8n은 retentionPolicy를 참고하되, 사용자 권한이나 정책 허용 범위를 다시 판단하지 않는다.

---

## 6. 파일 입력 계약

파일이 있는 실행은 retentionPolicy에 따라 다음을 만족해야 한다.

### 6.1 notify_only

```text
1. Gateway는 파일을 처리 중 임시로 받을 수 있다.
2. Gateway는 원본 파일을 영구 저장하지 않을 수 있다.
3. n8n 처리를 위해 binary file_0를 전달할 수 있다.
4. originalFileRefs는 빈 배열일 수 있다.
```

### 6.2 processed_result

```text
1. Gateway는 파일을 처리 중 임시로 받을 수 있다.
2. Gateway는 원본 파일을 영구 저장하지 않을 수 있다.
3. n8n 처리를 위해 binary file_0를 전달할 수 있다.
4. processorResult는 callback으로 반환되어 저장된다.
```

### 6.3 full_archive

```text
1. Gateway는 파일 원본을 Firebase Storage에 저장한다.
2. Gateway는 originalFileRefs를 payload에 포함한다.
3. 필요 시 Gateway는 n8n에 binary file_0도 함께 전달할 수 있다.
4. 원본 저장 실패는 STORAGE_UPLOAD_FAILED 또는 RETENTION_STORAGE_FAILED로 실패 처리할 수 있다.
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
  "options": {},
  "retentionPolicy": {
    "level": "full_archive"
  }
}
```

processorInput은 입력 출처에 직접 의존하지 않아야 한다.

manual, watch, webhook, scheduled 입력이더라도 프로세서 영역은 같은 구조로 처리할 수 있어야 한다.

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
  "resultRefs": [],
  "result": {
    "summary": "사용자에게 표시할 짧은 요약",
    "resultUrl": "엔팔라이언트 결과 상세 링크 또는 선택 결과 링크"
  }
}
```

Gateway는 callback을 수신해 submissions를 success로 갱신한다.

보관 레벨이 `notify_only`인 경우 processorResult는 null이거나 요약 수준일 수 있다.

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
RETENTION_POLICY_INVALID
RETENTION_STORAGE_FAILED
PROCESSOR_FAILED
CALLBACK_FAILED
EXTERNAL_API_FAILED
```

세부 error code 목록은 후속 Gateway API 규약서에서 확정한다.

---

## 13. Result Policy Router

n8n 워크플로우는 processorResult 생성 이후 결과 처리 영역에서 retentionPolicy를 확인한다.

권장 노드 구성은 다음과 같다.

```text
[20] Result Policy Router
[21] Notify / Email
[22] Store Processor Result
[23] Optional Export
[24] Callback
```

분기 기준은 다음과 같다.

```text
notify_only = 이메일/로그 중심, processorResult 전체 저장 생략 가능
processed_result = processorResult callback 포함
full_archive = processorResult + originalFileRefs/resultRefs 유지
```

---

## 14. Optional Export

Google Drive, Gmail, Sheets, Docs 등 외부 저장 또는 발송은 Optional Export로 본다.

Optional Export가 필요한 경우 n8n에서 수행할 수 있다.

단, Optional Export 실패가 기본 processorResult 생성 성공을 무조건 실패로 만들지는 않는다.  
워크플로우 성격에 따라 warning으로 처리할 수 있다.

---

## 15. 금지 사항

아래 구조는 금지한다.

```text
브라우저가 n8n Webhook 직접 호출
n8n이 Firestore 직접 수정
n8n이 설정 병합 수행
n8n이 사용자 권한 판단
n8n이 Credential ID를 payload에서 받음
n8n이 Google Access Token 또는 Refresh Token을 payload에서 받음
Gateway가 만든 callbackUrl 대신 하드코딩 URL 사용
retentionPolicy 없이 n8n이 임의로 보관 방식을 결정
보관 레벨과 무관하게 n8n이 모든 결과를 외부 저장소에 무조건 저장
```

---

## 16. 미확정 항목

아래 항목은 후속 Gateway API 규약서에서 확정한다.

```text
전체 API endpoint 목록
request/response JSON 전문
인증 실패 응답 형식
callback retry 정책
signed URL 정책
queue/worker 분리 여부
retentionPolicy merge 상세 로직
```
