# 엔팔라이언트 Gateway → n8n Payload / Meta 표준 규약 v1.0

- 문서명: 엔팔라이언트 Gateway → n8n Payload / Meta 표준 규약
- 파일명: `10_엔팔라이언트_Gateway_n8n_Payload_Meta_표준규약_v1.1_처리결과확인_표시필드보강.md`
- 버전: v1.1
- 문서 상태: n8n 커스터마이징/디버깅용 간결 표준 규약
- 보강 메모: 2026-06-22 처리 결과 확인 메시지 계약 최소 보강
- 추가 보강 메모: 2026-06-22 앱 결과 상세 `[02] 처리 결과 확인` 실제 렌더링 필드 우선순위 확정
- 적용 범위: `n8lient-gateway`, n8n workflow, callback payload, processorResult, MD 출처, 이메일 INFO
- 사용법: n8n 워크플로우 수정, 이메일 리포트 수정, MD 포맷 수정, callback 디버깅 시 01~09 문서와 함께 첨부한다.

---

## 1. 목적

이 문서는 Gateway가 n8n에 전달하는 payload/meta/settings/retentionPolicy의 필드명과 의미를 고정하기 위한 최소 규약이다.

목적은 다음 실수를 막는 것이다.

```text
- clientId를 회사명처럼 표시하는 실수
- uid를 작성자 이메일처럼 표시하는 실수
- reportEmailTo를 작성자 ID로 착각하는 실수
- n8n이 Firestore를 직접 조회하는 실수
- n8n이 settings나 retentionPolicy를 다시 계산하는 실수
- Secret/Token/Credential을 payload, log, mdContent, emailBody에 노출하는 실수
```

---

## 2. 최우선 원칙

```text
1. Gateway가 인증, 권한, settings 병합, retentionPolicy 계산을 완료한다.
2. n8n은 Gateway가 전달한 canonicalPayload만 사용한다.
3. n8n은 Firestore를 직접 조회하지 않는다.
4. n8n은 회사명, 사용자 이메일, 회사/개인 설정을 직접 조회하지 않는다.
5. n8n은 retentionPolicy를 재계산하지 않는다.
6. n8n은 callbackUrl로 결과를 반환하고, DB 저장은 Gateway callback이 담당한다.
7. 표시용 메타데이터가 없거나 null이어도 실행 실패로 처리하지 않는다.
8. 기존 payload 필드를 제거하거나 이름을 바꾸지 않는다.
```

---

## 3. 실제 실행 경로

운영 실행 경로:

```text
n8lient-app
→ Cloud Run n8lient-gateway
→ n8n Webhook
→ n8lient-gateway callback
→ Firestore submissions 저장
```

운영 기준 파일:

```text
n8lient-gateway/src/server.ts
```

로컬/개발 동기화 대상:

```text
src/app/api/automation/prepare-upload/route.ts
src/app/api/automation/execute/route.ts
```

주의:

```text
Next.js route만 수정하고 운영 반영됐다고 판단하지 않는다.
운영 반영 기준은 항상 n8lient-gateway/src/server.ts다.
```

---

## 4. canonicalPayload 표준 구조

Gateway가 n8n에 전달하는 표준 payload는 아래 구조를 기준으로 한다.

```ts
type N8LientCanonicalPayload = {
  submissionId: string;
  clientId: string;
  uid: string;
  workflowKey: string;
  workflowVersion?: string;
  automationId: string;
  callbackUrl: string;
  requestedAt?: string;

  companyName: string | null;
  clientName?: string | null;
  userEmail: string | null;
  googleEmail?: string | null;
  authorId?: string | null;

  input: N8LientInput;
  settings: N8LientSettings;
  retentionPolicy?: N8LientRetentionPolicy;
  meta?: N8LientPayloadMeta;

  originalFileRefs?: N8LientFileRef[];
  resultRefs?: N8LientFileRef[];
};
```

원칙:

```text
- top-level 필드를 우선 사용한다.
- meta는 보조 경로다.
- n8n은 top-level → meta → settings 순으로 표시용 값을 찾을 수 있다.
- meta가 없어도 실패 처리하지 않는다.
```

---

## 5. 필수 top-level 필드

| 필드 | 타입 | 의미 | 주의 |
|---|---:|---|---|
| submissionId | string | 실행 1건 ID | callback/DB 저장 기준 |
| clientId | string | 고객사 내부 ID | 회사명으로 표시 금지 |
| uid | string | 사용자 내부 ID | 작성자 ID/이메일로 표시 금지 |
| workflowKey | string | 자동화 제품군 식별자 | 예: idea-catcher |
| workflowVersion | string | 배포 버전 | 가능하면 포함 |
| automationId | string | 실행 자동화 ID | 필수 |
| callbackUrl | string | Gateway callback URL | secret은 payload에 넣지 않음 |

---

## 6. 표시용 메타 필드

### 6.1 회사명

```text
표준 필드: companyName
alias: clientName, meta.companyName
타입: string | null
생성 주체: Gateway
값 출처: Firestore clients 컬렉션의 실제 회사명
사용 위치: MD 출처, 이메일 INFO, processorResult.structuredData.source
없을 때 표시: 회사명 미전달
금지 fallback: clientId
```

### 6.2 작성자 ID

```text
표준 필드: userEmail
alias: googleEmail, authorId, meta.userEmail
타입: string | null
생성 주체: Gateway
값 출처: users 컬렉션 또는 Auth Token의 사용자 이메일
사용 위치: MD 출처, 이메일 INFO, processorResult.structuredData.source
없을 때 표시: 작성자 ID 미전달
금지 fallback: uid, reportEmailTo
```

### 6.3 reportEmailTo와 userEmail 차이

```text
userEmail = 실행 작성자 표시용 이메일
reportEmailTo = 결과 리포트 수신 이메일
```

둘이 같을 수도 있지만 의미는 다르다.  
`reportEmailTo`를 작성자 ID로 사용하지 않는다.

---

## 7. input 객체 기준

```ts
type N8LientInput = {
  title?: string | null;
  submissionTitle?: string;
  titleProvided?: boolean;
  titleSource?: "user" | "empty" | "system" | string;

  text?: string;
  inputType?: "text" | "file" | "image" | "audio" | string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  fileUrl?: string;
  files?: unknown[];
};
```

주의:

```text
- input.title은 사용자가 직접 입력한 제목일 때만 사용한다.
- 시스템 임시 제목은 input.title에 넣지 않는다.
- 원본 파일명 표시는 input.fileName 또는 기존 originalFileName 값을 우선한다.
```

---

## 8. settings 객체 기준

settings는 Gateway가 회사 설정과 개인 설정을 병합한 최종값이다.  
n8n은 settings를 다시 병합하지 않는다.

```ts
type N8LientSettings = {
  workflowName?: string;
  workflowVersion?: string;

  geminiModel?: string;
  reportEmailTo?: string;

  emailEnabled?: boolean;
  emailAttachResult?: boolean;
  emailAttachOriginal?: boolean;

  optionalExportProvider?: "none" | "google_drive" | string;

  googleDriveMdFolderName?: string;
  googleDriveMdFolderId?: string;
  googleDriveAttachmentFolderName?: string;
  googleDriveAttachmentFolderId?: string;

  mdFolderId?: string;
  originalFileFolderId?: string;
  audioPrefix?: string;
  mdPrefix?: string;
};
```

주의:

```text
- reportEmailTo는 결과 수신자다.
- reportEmailTo를 userEmail 또는 authorId로 사용하지 않는다.
- optionalExportProvider는 retentionPolicy.level을 대체하지 않는다.
```

---

## 9. retentionPolicy 객체 기준

retentionPolicy는 Gateway가 최종 계산한다.

```ts
type N8LientRetentionPolicy = {
  level: "notify_only" | "processed_result" | "full_archive";

  emailEnabled: boolean;
  emailAttachResult: boolean;
  emailAttachOriginal: boolean;

  storeProcessorResult: boolean;
  storeOriginalFileRefs?: boolean;
  storeResultRefs?: boolean;

  storeOriginalFiles?: boolean;
  storeResultFiles?: boolean;

  storageProvider?: "none" | "firestore" | "firebase_storage" | string;
  optionalExportProvider?: "none" | "google_drive" | string;
};
```

레벨 기준:

```text
notify_only
- 이메일/알림 중심
- processorResult 본문 저장 안 함
- MD/원본 파일 이메일 임시 첨부 가능

processed_result
- processorResult 저장
- processorResult.mdContent 저장 가능
- 원본 파일 참조 기본 저장 안 함

full_archive
- processorResult 저장
- originalFileRefs/resultRefs 저장
- 원본/결과 파일 보관
```

첨부와 보관 차이:

```text
emailAttachOriginal = 원본 파일을 이메일에 임시 첨부
storeOriginalFileRefs = 원본 파일 참조를 DB/Storage에 보관

emailAttachResult = 결과 MD 파일을 이메일에 임시 첨부
storeResultRefs = 결과 파일 참조를 DB/Storage에 보관
```

---

## 10. null/empty 처리 규칙

Gateway는 선택 문자열을 아래처럼 정규화한다.

```ts
const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
```

n8n은 선택 문자열을 아래처럼 안전하게 추출한다.

```js
const pickOptionalString = (...values) => {
  for (const value of values) {
    if (typeof value !== "string") continue;

    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }

  return null;
};
```

금지:

```text
- null에 .trim() 호출
- undefined에 .split() 호출
- companyName/userEmail 누락을 실행 실패 처리
- 선택 메타데이터를 필수 validation으로 승격
```

---

## 11. fallback 금지 규칙

아래 fallback은 금지한다.

```text
companyName 없음 → clientId 표시
clientName 없음 → clientId 표시
userEmail 없음 → uid 표시
googleEmail 없음 → uid 표시
authorId 없음 → uid 표시
userEmail 없음 → reportEmailTo 표시
companyName 없음 → workflowName 표시
```

허용 fallback:

```text
companyName 없음 → 회사명 미전달
userEmail 없음 → 작성자 ID 미전달
originalFileName 없음 → 원본 파일 없음
workflowName 없음 → workflowKey 또는 워크플로우명 미전달
generatedAt 없음 → 현재 시각
```

---

## 12. 표시용 값 우선순위

### 12.1 회사명

```text
payload.companyName
→ payload.clientName
→ payload.meta.companyName
→ settings.companyName
→ "회사명 미전달"
```

### 12.2 작성자 ID

```text
payload.userEmail
→ payload.googleEmail
→ payload.authorId
→ payload.meta.userEmail
→ settings.userEmail
→ settings.googleEmail
→ "작성자 ID 미전달"
```

주의:

```text
uid와 reportEmailTo는 작성자 ID fallback 대상이 아니다.
```

---

## 13. MD 출처 표준

모든 MD 결과 파일의 `## 출처` 섹션은 아래 포맷을 따른다.

```md
## 출처

- 회사명 : {{companyName || "회사명 미전달"}}
- 작성자 ID : {{userEmail || "작성자 ID 미전달"}}
- 워크플로우: {{workflowName}}
- 입력방식: {{inputMethod}}
- AI 모델: {{geminiModel}}
- 원본 파일명: {{originalFileName || "원본 파일 없음"}}
- 생성일시: {{generatedAt}}
```

값 기준:

```text
companyName = 표시용 회사명
userEmail = 작성자 이메일
workflowName = settings.workflowName 또는 기존 workflowName
inputMethod = input.inputType 또는 워크플로우 내부 입력방식
geminiModel = settings.geminiModel
originalFileName = input.fileName 또는 기존 originalFileName
generatedAt = requestedAt / receivedAt / generatedAt / 현재 시각
```

---

## 14. 이메일 INFO 표준

이메일 리포트에 INFO 섹션을 둘 경우 아래 기준을 따른다.

```text
회사명: companyName || "회사명 미전달"
작성자 ID: userEmail || "작성자 ID 미전달"
워크플로우: workflowName
처리 시각: generatedAt
```

주의:

```text
MD 출처 수정은 이메일 리포트 디자인 변경이 아니다.
이메일 디자인은 별도 이메일 템플릿 정책을 따른다.
```

---

## 15. processorResult / DB 저장 기준

Level 2 이상에서는 callback payload에 processorResult를 포함할 수 있다.

```ts
type N8LientProcessorResult = {
  title: string;
  summary: string;
  content: string;
  mdContent: string;
  hashtags?: string[];
  attachments?: unknown[];
  structuredData?: {
    source?: {
      companyName: string | null;
      userEmail: string | null;
      workflowName: string;
      inputMethod: string;
      geminiModel: string;
      originalFileName: string | null;
      generatedAt: string;
    };
    [key: string]: unknown;
  };
  warnings?: string[];
};
```

원칙:

```text
- MD 파일 내용과 processorResult.mdContent는 동일해야 한다.
- DB 저장은 Gateway callback이 담당한다.
- n8n은 Firestore에 직접 저장하지 않는다.
- processorResult에는 Secret/Token/Credential 값을 넣지 않는다.
```

---

## 16. callback payload 기준

### 16.1 성공 callback

```ts
type N8LientSuccessCallbackPayload = {
  status: "success";
  submissionId: string;
  workflowKey?: string;
  workflowVersion?: string;
  processorResult?: N8LientProcessorResult;
  result?: {
    title?: string;
    summary?: string;
    resultUrl?: string | null;
  };
  emailSent?: boolean;
  originalFileRefs?: N8LientFileRef[];
  resultRefs?: N8LientFileRef[];
  retentionPolicySnapshot?: N8LientRetentionPolicy;
  warnings?: string[];
};
```

## 16-1. 처리 결과 확인 메시지 / actionLinks 표준

N8Lient 앱 결과 상세 화면의 `[02] 처리 결과 확인` 섹션은 n8n callback payload의 사용자용 결과 메타를 표시한다.

역할 분리:

```text
n8n 워크플로우 = 사용자에게 보여줄 처리 결과 확인 메시지와 링크 생성
Gateway = callback 수신, 보관 레벨에 따른 저장
N8Lient 앱 = 저장된 값 표시
```

앱은 워크플로우별 완료 문구를 하드코딩하지 않는다.

### 표준 result 객체

```ts
type N8LientCallbackResult = {
  summary?: string | null;
  resultUrl?: string | null;
};
```

의미:

```text
summary = 레벨과 무관하게 남길 수 있는 짧은 사용자용 처리 결과 메시지
resultUrl = 사용자가 열 수 있는 대표 결과 URL 1개
```

`result.summary/resultUrl`은 긴 지식 본문이나 파일 보관이 아니라 결과 확인용 메타다.

### actionLinks 표준

```ts
type N8LientActionLink = {
  label?: string | null;
  url: string;
  type?: "primary" | "secondary" | string;
};

type N8LientProcessorStructuredData = {
  actionLinks?: N8LientActionLink[];
  [key: string]: unknown;
};
```

의미:

```text
label = 사용자에게 표시할 링크 문구. 없으면 앱이 기본 문구로 표시 가능
url = 사용자가 열 수 있는 URL
type = primary 또는 secondary. 알 수 없는 값은 secondary 취급 가능
```

표시 매핑:

```text
result.summary → [02] 처리 결과 확인의 fallback 결과 메시지
result.resultUrl → [02] 처리 결과 확인의 대표 링크
processorResult.title → [02] 처리 결과 확인의 표시 제목
processorResult.summary → [02] 처리 결과 확인의 1순위 상세 요약
processorResult.structuredData.actionLinks → [02] 처리 결과 확인의 후속 액션 링크 목록
processorResult.content/mdContent → 상세 리포트 본문 또는 다운로드/검색 대상
```

### 현재 앱 구현 기준 표시 우선순위

N8Lient 앱 결과 상세 화면의 `[02] 처리 결과 확인` 섹션은 현재 아래 필드를 기준으로 렌더링한다.

| 화면 표시 항목 | 실제 참조 필드 | 우선순위 / fallback | 현재 렌더링 여부 | 비고 |
|---|---|---|---|---|
| 제목 | `processorResult.title` | 값이 있을 때만 표시 | 표시됨 | 제목 영역에 노출된다. |
| 본문 요약 | `processorResult.summary` | 1순위 | 표시됨 | 사용자에게 보여줄 상세 처리 결과 문구는 이 필드를 우선 사용한다. |
| 본문 요약 fallback | `result.summary` | `processorResult.summary`가 없을 때 사용 | 표시됨 | 모든 보관 레벨에서 남길 수 있는 안전한 짧은 요약 또는 fallback 메시지다. |
| 결과 링크 URL | `result.resultUrl` | 값이 있을 때만 표시 | 표시됨 | 대표 결과 URL 1개를 넣는다. |
| 결과 링크 버튼 문구 | 앱 고정값 | `관련 URL 열기` | 표시됨 | 현재 n8n payload로 버튼 문구를 변경하지 않는다. |
| actionLinks | `processorResult.structuredData.actionLinks` | 배열이 있고 유효한 `url`이 있을 때 표시 | 표시됨 | 여러 후속 액션 링크가 필요한 경우 사용한다. |

주의:

```text
- [02] 처리 결과 확인의 본문을 제어하려면 `processorResult.summary`를 1순위로 작성한다.
- `processorResult.summary`가 저장되지 않거나 누락될 경우를 대비해 `result.summary`에도 fallback 문구를 넣는다.
- 대표 링크는 `result.resultUrl`에 넣는다.
- 링크 버튼 문구 `관련 URL 열기`는 현재 앱 고정값이다.
- 여러 링크가 필요하면 `processorResult.structuredData.actionLinks` 배열을 사용한다.
```

### Gateway 저장 및 retention level 영향

Gateway callback은 n8n이 보낸 `result`와 `processorResult`의 필드명을 임의로 바꾸지 않고 Firestore `submissions` 문서에 저장한다.

| callback payload 필드 | Firestore 저장 필드 | 필드명 변경 여부 | retention level 영향 |
|---|---|---|---|
| `result.summary` | `result.summary` | 없음 | 모든 레벨에서 기본 저장 가능 |
| `result.resultUrl` | `result.resultUrl` | 없음 | 모든 레벨에서 기본 저장 가능 |
| `processorResult.title` | `processorResult.title` | 없음 | `processed_result`, `full_archive`에서 저장. `notify_only`에서는 저장되지 않을 수 있음 |
| `processorResult.summary` | `processorResult.summary` | 없음 | `processed_result`, `full_archive`에서 저장. `notify_only`에서는 저장되지 않을 수 있음 |
| `processorResult.structuredData.actionLinks` | `processorResult.structuredData.actionLinks` | 없음 | `processed_result`, `full_archive`에서 저장. `notify_only`에서는 저장되지 않을 수 있음 |

n8n 작성 기준:

```text
1. 사용자에게 반드시 보여야 하는 완료 요약은 `processorResult.summary`에 넣는다.
2. 보관 레벨이나 fallback 상황을 고려해 `result.summary`에도 짧은 요약 또는 동일 요약을 넣는다.
3. 대표 결과 링크는 `result.resultUrl`에 넣는다.
4. 후속 링크가 여러 개이면 `processorResult.structuredData.actionLinks`에 넣는다.
5. `notify_only`에서는 processorResult가 저장되지 않을 수 있으므로, 최소 결과 확인 문구는 result.summary/result.resultUrl만으로도 의미가 통해야 한다.
```

권장 callback 예:

```json
{
  "submissionId": "sub_xxx",
  "status": "success",
  "result": {
    "summary": "구글 캘린더에 일정 2건이 등록되었습니다.",
    "resultUrl": "https://calendar.google.com/calendar/event?eid=..."
  },
  "processorResult": {
    "title": "구글 캘린더 일정 등록 결과",
    "summary": "구글 캘린더에 일정 2건이 등록되었습니다. 첨부파일 옵션을 사용한 경우 캘린더 일정에서 이미지·음성 첨부파일을 확인할 수 있습니다.\n\n- 일정 1: 예고/마감 문자 정리 / 2026. 06. 23. 10:00 ~ 11:00\n- 일정 2: 예고/마감 안내 문자 발송 / 2026. 06. 23. 16:00 ~ 17:00\n\n----------------------------------------\n- 결과 첨부: calendar_schedule_result_20260622130049.md\n- 원본 첨부: 없음\n- 보관 레벨: full_archive\n- AI 모델: gemini-2.5-flash\n- 캘린더 이름: 베타테스트 회사 캘린더",
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
  }
}
```

줄바꿈 주의:

```text
n8n Code 노드에서 사용자 표시 문구를 조립할 때는 실제 줄바꿈 `\n`이 저장되도록 `.join('\n')`을 사용한다.
문자 그대로 `\\n`이 들어가면 앱이나 Google Calendar 화면에 역슬래시+n이 그대로 표시될 수 있다.
```

n8n 커스터마이징 절차:

```text
1. AI가 워크플로우 성격에 맞는 처리 결과 확인 메시지 초안을 작성한다.
2. 사용자에게 완료 문구, 링크 label, URL 출처를 확인받는다.
3. 승인 후 callback payload 생성 노드에 반영한다.
```

보안 금지:

```text
access_token
refresh_token
API key
secret
credential ID
authorization header
service account key
비공개 내부 storage path
```

사용자의 브라우저 권한으로 열리는 Google Calendar, Google Drive, 외부 문서 링크는 허용할 수 있다. 단, URL query에 민감값이 포함되면 안 된다.


### 16.2 실패 callback

```ts
type N8LientFailureCallbackPayload = {
  status: "failed";
  submissionId: string;
  workflowKey?: string;
  workflowVersion?: string;
  errorCode?: string;
  errorMessage: string;
  nodeName?: string;
  phase?: string;
  retryable?: boolean;
};
```

---

## 17. Optional Export 기준

```text
Google Drive는 N8Lient 기본 저장소가 아니다.
Google Drive는 Optional Export 또는 레거시 외부 저장 경로다.
optionalExportProvider는 retentionPolicy.level을 대체하지 않는다.
```

금지:

```text
- Optional Export Provider 임의 변경
- Google Drive 폴더 ID/폴더명 로직 임의 변경
- Drive 업로드 Credential 변경
- Optional Export 활성/비활성 정책 임의 변경
```

정상 영향:

```text
동일 mdContent를 사용하는 Optional Export MD 파일에 ## 출처 보강 내용이 포함되는 것은 정상이다.
```

---

## 18. 보안 금지값

아래 값은 payload, settings, meta, mdContent, emailBody, logs에 넣지 않는다.

```text
Authorization Header
X-N8N-TOKEN
N8N_CALLBACK_SECRET
Credential ID
Google OAuth Access Token
Google OAuth Refresh Token
Firebase ID Token
Service Account Key
Webhook Secret
n8n Basic Auth
API Key
Password
```

주의:

```text
- userEmail은 불필요하게 console.log로 출력하지 않는다.
- Token/Secret/Credential은 어떤 경우에도 로그에 출력하지 않는다.
```

---

## 19. 최소 샘플 payload

민감정보 제거 예시다.

```json
{
  "submissionId": "sub_example_001",
  "clientId": "client_example_001",
  "uid": "user_uid_12345",
  "workflowKey": "idea-catcher",
  "workflowVersion": "v1.02",
  "automationId": "auto_idea_catcher",
  "callbackUrl": "https://gateway.example.com/api/automation/callback",
  "companyName": "Example Company",
  "clientName": "Example Company",
  "userEmail": "user@example.com",
  "googleEmail": "user@example.com",
  "authorId": "user@example.com",
  "input": {
    "title": null,
    "titleProvided": false,
    "titleSource": "empty",
    "inputType": "audio",
    "fileName": "idea_audio_20260619_145524.webm",
    "mimeType": "audio/webm",
    "sizeBytes": 123456
  },
  "settings": {
    "workflowName": "N8Lient 아이디어 캐처 v1.02",
    "geminiModel": "gemini-2.5-flash",
    "reportEmailTo": "receiver@example.com",
    "emailEnabled": true,
    "emailAttachResult": true,
    "emailAttachOriginal": false,
    "optionalExportProvider": "none"
  },
  "retentionPolicy": {
    "level": "processed_result",
    "emailEnabled": true,
    "emailAttachResult": true,
    "emailAttachOriginal": false,
    "storeProcessorResult": true,
    "storeOriginalFileRefs": false,
    "storeResultRefs": false,
    "storageProvider": "firestore",
    "optionalExportProvider": "none"
  },
  "meta": {
    "companyName": "Example Company",
    "userEmail": "user@example.com"
  }
}
```

---

## 20. n8n 커스터마이징 체크리스트

수정 전 반드시 확인한다.

```text
1. 실제 운영 Gateway가 n8lient-gateway/src/server.ts인지 확인했는가?
2. Gateway payload에 필요한 표시용 메타데이터가 있는가?
3. companyName/userEmail을 선택 필드로 처리했는가?
4. companyName이 없을 때 clientId를 표시하지 않는가?
5. userEmail이 없을 때 uid를 표시하지 않는가?
6. reportEmailTo와 userEmail을 혼동하지 않는가?
7. n8n이 Firestore를 직접 조회하지 않는가?
8. settings를 n8n에서 다시 병합하지 않는가?
9. retentionPolicy를 n8n에서 다시 계산하지 않는가?
10. processorResult.mdContent와 MD 파일 내용이 같은가?
11. callbackPayload 구조를 깨지 않았는가?
12. Optional Export 노드/정책을 임의 변경하지 않았는가?
13. Secret/Token/Credential이 payload/log/mdContent/emailBody에 노출되지 않는가?
14. null/undefined 값에 문자열 메서드를 직접 호출하지 않는가?
15. 변경 대상 노드 외의 노드를 불필요하게 수정하지 않았는가?
16. `[02] 처리 결과 확인` 문구를 바꿀 때 `processorResult.title`, `processorResult.summary`, `result.summary`, `result.resultUrl`을 확인했는가?
17. `notify_only`에서도 최소 결과 확인이 가능하도록 `result.summary`와 `result.resultUrl`에 fallback 값을 넣었는가?
18. 여러 후속 링크가 필요한 경우 `processorResult.structuredData.actionLinks`를 사용했는가?
```

---

## 21. 디버깅 확인 순서

문제가 생기면 아래 순서로 확인한다.

```text
1. Gateway가 canonicalPayload를 생성했는가?
2. submissionId/clientId/uid/workflowKey/automationId/callbackUrl이 있는가?
3. companyName/userEmail이 있는가? 없어도 null-safe인가?
4. settings가 Gateway에서 병합된 최종값인가?
5. retentionPolicy가 Gateway에서 최종 계산됐는가?
6. n8n Webhook이 payload를 받았는가?
7. n8n 입력 정리 노드가 필드를 유지 전달하는가?
8. MD 파일 내용과 processorResult.mdContent가 같은가?
9. callbackPayload.processorResult.mdContent가 포함됐는가?
10. `[02] 처리 결과 확인` 제목이 의도와 다르면 `processorResult.title`을 확인했는가?
11. `[02] 처리 결과 확인` 본문이 의도와 다르면 `processorResult.summary → result.summary` 순서로 확인했는가?
12. 결과 링크 버튼이 보이지 않으면 `result.resultUrl`이 있는지 확인했는가?
13. actionLinks가 보이지 않으면 `processorResult.structuredData.actionLinks` 배열과 각 항목의 `url`을 확인했는가?
14. Gateway callback이 Firestore submissions를 업데이트했는가?
```

---

## 22. 프롬프트 첨부 문구

n8n 수정 지시문에는 아래 문구를 넣는다.

```text
n8n 워크플로우를 수정할 때는 반드시 `10_엔팔라이언트_Gateway_n8n_Payload_Meta_표준규약_v1.0.md`를 함께 참고하고, Gateway payload 필드명과 fallback 금지 규칙을 따른다.
```

---

## 23. 변경 유형 판단

companyName/userEmail 같은 선택 메타데이터 추가는 기존 구조를 깨지 않으면 PATCH로 본다.

```text
PATCH:
- 선택 메타데이터 추가
- null/empty 방어
- MD 출처 보강
- 기존 callback 구조 유지

MINOR 이상 검토:
- 필수 input/config 추가
- callback 구조 변경
- retentionPolicy 구조 변경
- 기존 고객 설정과 호환되지 않는 변경
```
