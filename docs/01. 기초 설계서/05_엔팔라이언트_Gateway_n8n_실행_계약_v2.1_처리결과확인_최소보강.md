# 엔팔라이언트 Gateway ↔ n8n 실행 계약 v2.1

- 문서명: 엔팔라이언트 Gateway ↔ n8n 실행 계약
- 버전: v2.1 핵심 최적화
- 작성일: 2026-06-18
- 문서 상태: 현행 실행 계약 기준 문서
- 보강 메모: 2026-06-22 처리 결과 확인 메시지 계약 최소 보강
- 상위 문서: 솔루션 헌법 v2.0, 아키텍처 명세서 v2.0, 결과/보관 레벨 계약 v2.0
- 목적: Gateway, n8n, App 사이의 실행 책임과 정책 계산 기준을 짧고 명확하게 고정한다.

---

## 1. 기본 원칙

브라우저는 n8n을 직접 호출하지 않는다.

```text
n8lient-app
→ n8lient-gateway
→ n8lient-workflows(n8n)
→ n8lient-gateway callback
```

Gateway는 실행 요청의 최종 방어선이다.

```text
Gateway = 인증 + 권한 + 설정 병합 + 실행 검증 + 보관 정책 계산 + n8n 호출 + callback 저장
```

n8n은 Gateway가 전달한 `canonicalPayload`를 신뢰하고 업무 처리를 수행한다.

n8n은 다음을 하지 않는다.

```text
- Firestore 직접 수정
- 사용자 권한 판단
- 회사/개인 설정 병합
- retentionPolicy 최종 계산
- 사용자 Credential 저장
```

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

중요 원칙:

```text
validation과 retentionPolicy 계산은 반드시 병합 완료된 finalSettings 기준으로 수행한다.
```

---

## 3. Settings 병합 계약

회사 설정과 개인 설정은 다음 규칙으로 병합한다.

```text
1. companySettings를 기본값으로 둔다.
2. userSettings의 유효한 값만 companySettings를 덮어쓴다.
3. null, undefined, 빈 문자열("")은 유효하지 않은 값으로 본다.
4. 빈 문자열은 “회사 기본값을 사용하겠다”는 뜻으로 해석한다.
5. 병합 결과를 finalSettings라고 부른다.
```

금지:

```ts
const currentSettings = userSettings?.settings || companySettings || {};
```

위 방식은 `userSettings.settings = {}`인 경우에도 회사 설정 fallback을 무시할 수 있으므로 사용하지 않는다.

권장 함수:

```ts
mergeAutomationSettings(companySettings, userSettings)
```

---

## 4. 실행 Validation 계약

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
conditionalRequired는 finalSettings 기준으로 판단한다.
```

### Google Drive Optional Export 조건부 필수

`optionalExportProvider = google_drive`일 때만 아래 값이 필수다.

```text
googleDriveMdFolderName
googleDriveMdFolderId
googleDriveAttachmentFolderName
googleDriveAttachmentFolderId
```

`optionalExportProvider = none` 또는 미설정이면 Google Drive 필드 누락으로 실행을 막지 않는다.

---

## 5. canonicalPayload 최소 구조

Gateway는 n8n에 다음 구조를 전달한다.

```json
{
  "submissionId": "sub_xxx",
  "clientId": "client_xxx",
  "uid": "uid_xxx",
  "workflowKey": "n8lient-idea-catcher",
  "workflowVersion": "0.9.0",
  "automationId": "auto_xxx",
  "callbackUrl": "https://.../api/automation/callback",
  "input": {
    "title": null,
    "titleProvided": false,
    "titleSource": "empty",
    "text": "",
    "inputType": "audio",
    "fileName": "recording.webm",
    "mimeType": "audio/webm",
    "sizeBytes": 123456
  },
  "submissionTitle": "아이디어 캐처 음성 입력 2026-06-18 09:00",
  "displayTitle": "아이디어 캐처 음성 입력 2026-06-18 09:00",
  "settings": {},
  "retentionPolicy": {
    "level": "processed_result",
    "emailEnabled": true,
    "emailAttachResult": true,
    "emailAttachOriginal": true,
    "storeProcessorResult": true,
    "storeOriginalFiles": false,
    "storeOriginalFileRefs": false,
    "storeResultRefs": false,
    "storageProvider": "none",
    "optionalExportProvider": "none"
  },
  "files": []
}
```

`settings`는 병합 완료된 finalSettings 기준이다.  
`retentionPolicy`는 Gateway가 최종 계산한 실행 정책이다.

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

---

## 7. retentionPolicy 계산 계약

Gateway는 최종 `retentionPolicy`를 계산해 canonicalPayload에 포함한다.

선택 가능 레벨:

```text
notify_only
processed_result
full_archive
```

계산 계층:

```text
workflowTemplates.retentionCapabilities
→ clientContracts.contractRetentionLimit
→ clientAutomations.contractRetentionLimit
→ clientAutomations.companyRetentionPolicy
→ userAutomationSettings.userRetentionPreference
→ Gateway 최종 계산
```

권장 구조:

```json
{
  "level": "processed_result",
  "resolvedFrom": {
    "workflowDefault": "processed_result",
    "operatorDefault": "processed_result",
    "companyDefault": "full_archive",
    "userPreference": "full_archive",
    "reason": "user_preference_applied_within_contract_limit"
  },
  "emailEnabled": true,
  "emailAttachResult": true,
  "emailAttachOriginal": true,
  "storeProcessorResult": true,
  "storeOriginalFiles": false,
  "storeOriginalFileRefs": false,
  "storeResultRefs": false,
  "storageProvider": "none",
  "optionalExportProvider": "google_drive"
}
```

---

## 8. retentionPolicy 핵심 계산 규칙

### 8.1 이메일

```text
emailEnabled:
reportEmailTo가 있고 emailEnabled가 false가 아니면 true

emailAttachResult:
emailEnabled=true이고 finalSettings.emailAttachResult=true이면 true

emailAttachOriginal:
emailEnabled=true이고 finalSettings.emailAttachOriginal=true이고 원본 파일이 있으면 true
```

### 8.2 DB / Storage

```text
notify_only:
- storeProcessorResult=false
- storeOriginalFiles=false
- storeOriginalFileRefs=false
- storeResultRefs=false
- storageProvider=none

processed_result:
- storeProcessorResult=true
- storeOriginalFiles=false
- storeOriginalFileRefs=false
- storeResultRefs=false
- storageProvider=none

full_archive:
- storeProcessorResult=true
- storeOriginalFiles=true
- storeOriginalFileRefs=true
- storeResultRefs=true
- storageProvider=firebase_storage
```

### 8.3 Optional Export

```text
optionalExportProvider:
finalSettings.optionalExportProvider = google_drive이면 google_drive
그 외에는 none
```

`storageProvider`와 `optionalExportProvider`는 별개다.

```text
full_archive + google_drive
→ storageProvider=firebase_storage
→ optionalExportProvider=google_drive
```

---

## 9. 반드시 분리해야 하는 정책 필드

### 9.1 emailAttachOriginal ≠ storeOriginalFiles

```text
emailAttachOriginal = 이메일에 원본 파일을 일회성으로 첨부할지 여부
storeOriginalFiles = Firebase Storage에 원본 파일을 영구 보관할지 여부
```

금지:

```ts
emailAttachOriginal = storeOriginalFiles;
```

정상 예:

```text
processed_result + audio + emailAttachOriginal=true
→ emailAttachOriginal=true
→ storeOriginalFiles=false
```

### 9.2 optionalExportProvider ≠ storageProvider

```text
storageProvider = N8Lient 기본 파일 저장소
optionalExportProvider = Google Drive 등 외부 내보내기 대상
```

금지:

```ts
optionalExportProvider = "none"; // 하드코딩 금지
optionalExportProvider = storageProvider;
```

### 9.3 settingsSnapshot ≠ retentionPolicySnapshot

```text
settingsSnapshot = 사용자가 어떤 기능을 원했는지
retentionPolicySnapshot = Gateway가 최종 허용한 실행 정책
```

단, 실행 관련 설정이 settingsSnapshot에 켜져 있는데 retentionPolicySnapshot에서 꺼져 있다면 반드시 명시적 이유가 있어야 한다.

---

## 10. Snapshot 저장 계약

Gateway는 submission 생성 또는 업데이트 시 아래 snapshot을 저장한다.

```text
settingsSnapshot
retentionPolicySnapshot
settingsMergeSummary
```

### 10.1 settingsSnapshot

`settingsSnapshot`은 실행 당시의 finalSettings를 안전하게 필터링한 값이다.

저장 금지:

```text
Credential
Token
Secret
API Key
Private Key
Authorization
Refresh Token
Access Token
```

### 10.2 retentionPolicySnapshot

`retentionPolicySnapshot`은 n8n에 전달한 `canonicalPayload.retentionPolicy`와 동일해야 한다.

금지:

```text
n8nPayload.retentionPolicy와 submissions.retentionPolicySnapshot이 서로 다르게 저장되는 것
```

### 10.3 settingsMergeSummary

`settingsMergeSummary`는 회사 설정과 개인 설정의 병합 결과를 진단하기 위한 요약 정보다.

권장 구조:

```json
{
  "hasUserSetting": true,
  "mergedKeys": ["reportEmailTo", "optionalExportProvider"],
  "fallbackKeys": ["emailEnabled", "googleDriveMdFolderId"],
  "ignoredUserKeys": ["googleDriveMdFolderId"]
}
```

---

## 11. n8n Result Policy Router

n8n은 Gateway가 전달한 `retentionPolicy`를 기준으로 결과 후처리를 분기한다.

```text
notify_only
→ 이메일 본문/MD, 기타파일 첨부 전송 중심
→ processorResult 전체 DB 저장 목적 callback 생략 가능

processed_result
→ Level 1 이메일 전달/첨부 기능 유지 가능
→ processorResult callback 포함
→ 원본 파일 참조 제외

full_archive
→ Level 2 기능 전체 유지
→ processorResult callback 포함
→ originalFileRefs/resultRefs 포함
```

Optional Export는 `retentionPolicy.level`을 대체하지 않고 별도 부가 기능으로 처리한다.

---

## 12. callback 요청 구조

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

### 12.1 처리 결과 확인 메시지 callback 계약

n8n은 callback 직전 사용자에게 보여줄 처리 결과 확인 메시지를 구성할 수 있다.

역할:

```text
n8n = 워크플로우별 사용자 메시지와 링크 생성
Gateway = callback 수신 및 저장
App = 결과 상세 [02] 처리 결과 확인에 표시
```

권장 성공 callback 확장 예:

```json
{
  "submissionId": "sub_xxx",
  "status": "success",
  "result": {
    "summary": "구글 캘린더 일정 등록이 완료되었습니다.",
    "resultUrl": "https://calendar.google.com/calendar/event?eid=..."
  },
  "processorResult": {
    "title": "구글 캘린더 일정 등록 완료",
    "summary": "요청하신 일정이 구글 캘린더에 등록되었습니다.",
    "content": "상세 결과 본문",
    "mdContent": "# 상세 결과 본문",
    "hashtags": [],
    "structuredData": {
      "actionLinks": [
        {
          "label": "구글 캘린더에서 일정 보기",
          "url": "https://calendar.google.com/calendar/event?eid=...",
          "type": "primary"
        }
      ]
    },
    "warnings": []
  },
  "originalFileRefs": [],
  "resultRefs": [],
  "error": null
}
```

처리 기준:

```text
result.summary는 짧은 사용자용 결과 메시지다.
result.resultUrl은 대표 결과 URL 1개다.
processorResult.summary는 Level 2 이상에서 상세 결과 확인 요약으로 사용한다.
processorResult.structuredData.actionLinks는 여러 후속 링크나 버튼형 액션이 필요할 때 사용한다.
```

n8n 커스터마이징 AI는 워크플로우 성격을 분석해 처리 결과 확인 메시지 초안을 작성하고, 사용자 승인 후 callback payload 생성 노드에 반영한다.


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

## 14. 최소 회귀 테스트

Gateway 정책 수정 후에는 최소 아래 테스트를 확인한다.

```text
1. processed_result + audio + emailAttachOriginal=true
   → emailAttachOriginal=true
   → storeOriginalFiles=false

2. processed_result + text + emailAttachOriginal=true
   → 원본 파일 없음
   → emailAttachOriginal=false

3. full_archive + audio
   → storeOriginalFiles=true
   → storageProvider=firebase_storage

4. full_archive + google_drive
   → storageProvider=firebase_storage
   → optionalExportProvider=google_drive

5. google_drive + 회사 fallback
   → finalSettings Drive 폴더 ID 반영
   → validation 통과

6. userSettings 빈 문자열
   → companySettings fallback

7. optionalExportProvider=none
   → Google Drive 필드 없어도 validation 통과

8. n8nPayload.retentionPolicy와 retentionPolicySnapshot 일치
```

---

## 15. 금지 사항

```text
Gateway가 input.title을 항상 필수로 보는 것
Gateway가 optionalExportProvider를 "none"으로 하드코딩하는 것
Gateway가 emailAttachOriginal을 storeOriginalFiles와 동일하게 계산하는 것
Gateway가 raw userSettings만 기준으로 validation하는 것
Gateway가 n8nPayload.retentionPolicy와 retentionPolicySnapshot을 다르게 저장하는 것
n8n이 Firestore를 직접 수정하는 것
n8n이 settings를 직접 조회하는 것
n8n이 retentionPolicy를 임의 재계산하는 것
callback 없이 n8n이 결과를 외부에만 저장하는 것
Secret/Token을 payload.settings로 전달하는 것
```

---

## 16. 개발 AI 참고 포인트

이 문서를 참조해 개발 지시를 만들 때는 문서 전체를 반복하지 말고, 아래 포인트만 작업 지시문에 포함한다.

```text
이번 작업은 Gateway 정책 안정화다.

핵심 목표:
settingsSnapshot과 retentionPolicySnapshot의 불일치를 제거한다.

반드시 지킬 것:
- validation과 retentionPolicy 계산은 finalSettings 기준으로 수행
- userSettings의 null/undefined/빈 문자열은 companySettings fallback
- emailAttachOriginal과 storeOriginalFiles 분리
- optionalExportProvider와 storageProvider 분리
- n8nPayload.retentionPolicy와 retentionPolicySnapshot 일치

수정 금지:
- n8n 워크플로우 수정 금지
- callback 구조 변경 금지
- Firestore Rules 변경 금지
- inputSchema/configSchema 구조 변경 금지
```

개발 지시문에는 수정 대상 파일, 금지 범위, 테스트 케이스만 추가로 명시한다.
