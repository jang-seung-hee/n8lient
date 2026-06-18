# MODE 1 — N8Lient 커스터마이징 + 이메일 디자인 개선 동시 프롬프트 v1.0

이 문서는 일반 n8n 워크플로우를 N8Lient 표준으로 마이그레이션하면서 이메일 리포트 디자인까지 함께 개선하는 통합 모드다.

## 모드 1의 목적

- 기존 정상 동작 중인 업무 처리 로직은 최대한 보존한다.
- N8Lient Gateway / inputSchema / retentionPolicy / processorResult / callback 구조를 맞춘다.
- 이메일 리포트가 있는 경우, 첨부된 이메일 프레임 템플릿 HTML, Design.md, 이메일 디자인 작업 프롬프트를 기준으로 Notify / Email 영역을 함께 정리한다.
- 최종 산출물은 마이그레이션과 디자인 개선이 모두 반영된 하나의 n8n JSON이다.

## 필수 첨부

```text
1. 최신 N8Lient 기초설계서 문서세트
2. 수정 대상 n8n 워크플로우 JSON
3. 이메일 프레임 템플릿 HTML
4. 이메일 디자인 규칙 Design.md
5. 이메일 디자인 작업 프롬프트
6. 콘텐츠 패턴 예시 HTML은 선택
```

## 이메일 디자인 동시 적용 규칙

이메일 리포팅 노드가 있는 경우, 아래를 수행한다.

```text
- 첨부된 이메일 디자인 작업 프롬프트를 이메일 디자인 작업 범위의 우선 지시로 삼는다.
- 이메일 프레임 템플릿 HTML은 공통 헤더, 상태바, 본문 삽입 영역, 푸터 프레임으로 사용한다.
- Design.md는 CONTENT_HTML 본문 디자인 기준으로 사용한다.
- 기존 이메일 본문에 들어가던 정보와 의미는 유지한다.
- 업무 처리 로직, Processor/Gemini 로직, Gateway callback, retentionPolicy 계산, DB/Storage 저장 정책은 이메일 디자인 때문에 변경하지 않는다.
- 디자인 적용 범위는 Notify / Email 영역의 HTML 프레임, 본문 구조, 상태바, 링크 표현, 모바일 대응, 이메일용 MD 첨부 처리, 기존 입력 원본파일의 이메일 임시 첨부 처리로 제한한다.
```

이메일 리포팅 노드가 없으면 디자인 적용 대상 없음으로 보고한다.

## 1차 보고에 반드시 포함할 추가 항목

```text
- 이메일 리포팅 노드 존재 여부
- 기존 이메일 본문 생성 방식
- 이메일 디자인 적용 대상 노드
- 이메일 디자인 참고 파일 확인 여부
- 디자인 적용 시 업무 처리 로직 영향 여부
- notify_only MD 이메일 첨부 적용 필요 여부
- notify_only 입력 원본파일 이메일 임시 첨부 적용 필요 여부
```

아래에는 N8Lient n8n 마이그레이션 기본 지시를 따른다.

---

# N8Lient n8n 워크플로우 마이그레이션 지시 프롬프트 v2.6

> v2.6 변경 요지: v2.4/v2.5의 입력 Validation 계약과 Level 1 `notify_only`의 이메일 MD 첨부 정책을 유지하면서, Webhook multipart로 넘어온 입력 원본 파일(file/image/audio 등)을 이메일 전송용 임시 첨부로 함께 보낼 수 있는 선택 규칙을 추가한다. 단, `notify_only`에서는 결과 MD와 입력 원본 첨부파일을 N8Lient DB/Storage/originalFileRefs/resultRefs에 보관하지 않는다.

첨부한 최신 N8Lient 기초설계서 문서세트와 수정 대상 n8n 워크플로우 JSON을 기준으로, 기존 n8n 워크플로우를 엔팔라이언트(N8Lient) 표준 프로세서 구조로 마이그레이션하라.
첨부한 최신 N8Lient 기초설계서 문서세트 중 `07_엔팔라이언트_결과_DB화_지식검색_최소_계약`이 포함되어 있다면, Level 2 이상 결과 DB화/검색 최소 구조도 함께 반영한다.
첨부한 최신 N8Lient 기초설계서 문서세트 중 `08_엔팔라이언트_Google_Drive_Optional_Export_최소_계약`이 포함되어 있다면, Google Drive Optional Export는 MD 파일 보관 폴더와 첨부파일 보관 폴더를 분리하는 최신 기준을 반영한다.

## 0. 문서 우선순위
문서 간 내용이 충돌하면 아래 순서를 따른다.
1. 최신 N8Lient 기초설계서 문서세트의 현재 정책
2. 현재 첨부된 수정 대상 n8n 워크플로우 JSON의 실제 구조
3. 기존 Drive/ServiceAccount 호환 문서 또는 과거 프롬프트의 절차적 원칙

과거 문서에 클라우드메모 웹훅, Google Drive 기본 저장, Firebase Storage 미사용, uploadToken, verify-upload-token, uploadSessions, 브라우저 직접 n8n 호출 구조가 있더라도, 최신 표준과 충돌하면 사용하지 않는다.

## 1. 최우선 원칙
1. 전체 워크플로우를 갈아엎지 않는다.
2. 기존 정상 동작 중인 업무 처리 노드는 가능한 유지한다.
3. 실제 수정 전, 먼저 변경 대상 노드와 변경 이유를 보고한다.
4. 사용자가 승인하기 전에는 JSON을 수정하거나 새 JSON을 생성하지 않는다.
5. 이미 엔팔라이언트 표준이 반영된 노드는 불필요하게 수정하지 않는다.
6. 수정이 필요 없는 항목은 “수정 불필요”로 보고한다.
7. 추측으로 노드를 추가하지 않는다.
8. 노드의 기존 연결, 기존 Credential 참조는 꼭 필요한 경우가 아니면 유지한다.
9. n8n import 가능성을 해치지 않도록 JSON 구조, node id, connections, credential 참조 형식을 보존한다.
10. 노드의 이름은 순번과 한글명으로 최적화하여 새로 짓는다.
11. 워크플로우별 입력 Validation 계약을 반드시 추출한다. 제목, 텍스트, 파일, 이미지, 음성의 필수 여부를 앱이 하드코딩하지 않도록 `inputSchema` 후보를 남긴다.

## 2. 최신 N8Lient 핵심 구조
엔팔라이언트의 현재 결과/보관 정책은 다음 구조를 따른다.

```text
워크플로우 마스터 = 기술적 최대치
회사별 계약/매핑 = 계약 한도
회사관리자 설정 = 회사 권장값
개인사용자 설정 = 개인 선택
Gateway = 최종 계산 및 방어
n8n = Gateway가 내려준 최종 retentionPolicy에 따른 분기 처리
```

n8n은 아래 값을 다시 계산하지 않는다.

```text
workflowTemplates.retentionCapabilities
clientContracts.contractRetentionLimit
clientAutomations.companyRetentionPolicy
userAutomationSettings.userRetentionPreference
```

n8n은 Gateway가 전달한 `payload.retentionPolicy`를 신뢰하고, 그 값에 따라 결과 처리 영역만 분기한다.

## 2-1. 결과 DB화 / 지식검색 최소 구조
Level 1 `notify_only`는 이메일/알림 중심 경량형이다. 결과 본문이나 결과 파일을 N8Lient DB/Storage에 보관하지 않는다. 다만 이메일 전송 과정에서 Markdown 결과 파일을 임시 생성하여 본문 또는 첨부파일로 제공할 수 있고, Webhook multipart로 넘어온 입력 원본 파일(file/image/audio 등)도 선택적으로 이메일에 임시 첨부할 수 있다.
Level 2 `processed_result` 이상부터는 나중에 검색, 필터링, 지식 인덱싱이 가능하도록 최소 공통 DB 포맷을 맞춘다.

핵심 원칙:
```text
Level 1 notify_only = 이메일 중심 경량형. N8Lient에는 생성 지식 본문/파일과 원본 파일 참조를 보관하지 않음. 이메일 MD 첨부 및 입력 원본 파일 임시 첨부 가능.
Level 2 processed_result = 지식 DB 저장형. processorResult 저장, 결과 조회/검색/공유 가능.
Level 3 full_archive = 원본·첨부파일 연결형. processorResult + 원본/결과 파일 참조 보관.
```

`notify_only`의 MD 첨부파일과 입력 원본 첨부파일은 이메일 전송용 임시 결과물이다.
따라서 `notify_only` callback에는 processorResult 전체, Storage 경로, originalFileRefs, resultRefs를 넣지 않는 것을 기본으로 한다.
메일 발송 성공 여부, 짧은 summary, 상태, 오류 정도만 submissions 로그에 남긴다.

워크플로우 실행 단계에서는 아래 후가공을 하지 않는다.

```text
벡터라이징
embedding 생성
knowledgeSearchIndex 생성
백링크 생성
지식 그래프 생성
관련 노트 자동 연결
과도한 자동 분류
후가공 규칙에 종속된 태그 대량 생성
```

이런 작업은 나중에 `knowledgeSearchIndex`, `embeddingIndex` 또는 별도 인덱싱/마이그레이션 워크플로우에서 처리한다.


## 2-2. Google Drive Optional Export 최신 구조

Google Drive는 엔팔라이언트 기본 저장소가 아니다.  
Google Drive는 사용자가 선택한 Optional Export 패키지로만 본다.

Google Drive Optional Export가 필요한 워크플로우는 MD 결과 파일과 원본/첨부파일 저장 위치를 분리한다.

표준 설정 키:

```text
optionalExportProvider
googleDriveMdFolderName
googleDriveMdFolderId
googleDriveAttachmentFolderName
googleDriveAttachmentFolderId
```

조건부 필수:

```text
optionalExportProvider = none
→ Google Drive 필드 불필요

optionalExportProvider = google_drive
→ googleDriveMdFolderName 필수
→ googleDriveMdFolderId 필수
→ googleDriveAttachmentFolderName 필수
→ googleDriveAttachmentFolderId 필수
```

n8n Optional Export 표준 흐름:

```text
1. optionalExportProvider == google_drive 확인
2. googleDriveMdFolderId 확인
3. googleDriveAttachmentFolderId 확인
4. 원본 음성/이미지/첨부파일을 googleDriveAttachmentFolderId 폴더에 업로드
5. 업로드된 첨부파일 webViewLink 확보
6. 첨부파일 링크가 포함된 MD 생성 또는 MD 재생성
7. MD 파일을 googleDriveMdFolderId 폴더에 업로드
8. resultRefs에 optional_export_md / optional_export_attachment 기록
9. Gateway callback
```

Google Drive Credential 값, OAuth Token, Refresh Token, n8n Credential ID는 settings에 넣지 않는다.  
Google Drive 접근 권한은 n8n Credential이 담당한다.


## 3. 역할 분리 원칙

1. 브라우저는 n8n Webhook을 직접 호출하지 않는다.
2. 브라우저는 Cloud Run Gateway의 `/api/automation/execute`만 호출한다.
3. Cloud Run Gateway가 Firebase 인증, 사용자 승인 확인, 회사/개인 설정 병합, contractRetentionLimit 적용, retentionPolicy 최종 계산, submissions 생성, 파일 수신, 원본 저장 여부 결정, n8n 서버 간 호출을 담당한다.
4. n8n은 Firestore를 직접 조회하지 않는다.
5. n8n은 회사 설정과 개인 설정을 직접 병합하지 않는다.
6. n8n은 Gateway가 전달한 `payload.settings`를 최종 실행 설정값으로 사용한다.
7. n8n은 실제 업무 처리, processorResult 생성, Result Policy Router 분기, callback 전송만 담당한다.
8. n8n은 Firestore `submissions`를 직접 수정하지 않는다.
9. 실행 결과 반영은 반드시 `payload.callbackUrl`을 통한 Gateway callback으로 처리한다.

## 4. 제거하거나 비활성화할 구형 구조

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
* n8n이 Firestore를 직접 수정하는 구조
* retentionPolicy 없이 결과 저장 위치를 하드코딩하는 구조
* 워크플로우 실행 중 knowledgeSearchIndex, embeddingIndex, 백링크, 지식 그래프를 직접 생성하는 구조

## 5. Webhook 인증 표준

n8n Webhook 노드는 Header Auth Credential을 사용한다.

권장 Credential:

```text
Credential Type: Header Auth
Name: N8Lient Gateway Header Auth
Header Name: X-N8N-TOKEN
Header Value: Gateway의 N8N_SERVER_MAIN_TOKEN 값
```

적용 기준:
1. Webhook 노드에 Header Auth Credential이 적용되어야 한다.
2. 인증 실패 시 후속 노드가 실행되지 않아야 한다.
3. Code 노드에서 `$env.N8N_SERVER_MAIN_TOKEN`을 직접 비교하지 않는다.
4. Code 노드는 payload 파싱, settings/input 정리, 필수값 검증만 수행한다.

## 6. Callback 인증 표준
callback HTTP Request 노드는 Header Auth Credential을 사용한다.

권장 Credential:

```text
Credential Type: Header Auth
Name: N8Lient Callback Bearer Secret
Header Name: Authorization
Header Value: Bearer {Gateway의 N8N_CALLBACK_SECRET 값}
```

적용 기준:

1. callback URL은 하드코딩하지 않는다.
2. `payload.callbackUrl`을 사용한다.
3. Authorization 값을 Code 노드에서 `$env.N8N_CALLBACK_SECRET`으로 조립하지 않는다.
4. Callback HTTP Request 노드에 Header Auth Credential을 연결한다.

## 7. 표준 입력 구조

Gateway는 n8n Webhook으로 아래 중 하나를 보낸다.

### JSON 실행

```json
{

  "submissionId": "sub_xxx",

  "clientId": "client_xxx",

  "uid": "user_uid",

  "workflowKey": "idea-catcher",

  "automationId": "auto_xxx",

  "settings": {},

  "input": {},

  "retentionPolicy": {

    "level": "processed_result",

    "storeProcessorResult": true,

    "storeOriginalFiles": false,

    "storageProvider": "none"

  },

  "originalFileRefs": [],

  "requestedAt": "ISO_8601",

  "callbackUrl": "https://gateway-url/api/automation/callback"

}
```

### multipart 실행

```text

FormData

- payload: JSON.stringify(canonicalPayload)

- file_0: binary file

```

n8n 처리 기준:

1. JSON 호출이면 body 전체를 payload로 사용한다.
2. multipart 호출이면 `body.payload` 또는 `json.payload`를 JSON 파싱하여 payload로 사용한다.
3. binary `file_0`가 있으면 보존하거나 워크플로우 내부 표준 binary 필드로 안전하게 변환한다.
4. `notify_only`에서 입력 원본 파일 이메일 첨부가 필요한 워크플로우라면, 원본 binary를 모든 처리 노드에 불필요하게 복제하지 말고 이메일 첨부용 브랜치에서만 소실되지 않게 유지한다.
5. `payload.settings`, `payload.input`, `payload.retentionPolicy`, `payload.callbackUrl`, `payload.submissionId`를 표준 config로 정리한다.
6. 필수 settings와 input 누락 여부를 검증한다.

## 7-1. 입력 Validation 계약 추출 기준

N8Lient는 특정 워크플로우 전용 앱이 아니라 범용 n8n 클라이언트 앱이다.  
따라서 실행 필수값은 프론트/Gateway/n8n에서 하드코딩하지 않고, 워크플로우 마스터 Import JSON의 `inputSchema`와 `configSchema` 기준으로 판단해야 한다.

마이그레이션 시 아래 후보를 반드시 분석해 1차 보고와 최종 보고에 포함한다.

```text
titleRequired
acceptedInputTypes
requiredInputMode
requiredInputTypes
allowedFileTypes
maxFileSizeMB
maxFiles
configSchema.required
configSchema.conditionalRequired
```

### 핵심 원칙

```text
automationId는 실행 대상 식별자이므로 항상 필수다.
input.title은 항상 필수가 아니다.
titleRequired=true인 워크플로우에서만 사용자가 직접 입력한 제목을 필수로 본다.
titleRequired=false이면 input.title이 비어 있어도 Webhook / Normalize / Processor는 실패 처리하지 않는다.
사용자가 입력하지 않은 시스템 임시 제목을 input.title에 주입하지 않는다.
표시용 실행 제목이 필요하면 executionTitle, displayTitle, submissionTitle 같은 별도 필드로 분리한다.
Processor/LLM은 input.title이 있을 때만 사용자 입력 제목으로 참고한다.
input.title이 비어 있으면 본문, 음성, 이미지, 파일 내용을 기반으로 결과 제목을 생성한다.
acceptedInputTypes는 허용 가능한 입력 타입이다.
requiredInputTypes는 실행에 필요한 필수 입력 타입이다.
requiredInputTypes는 acceptedInputTypes의 부분집합이어야 한다.
```

### requiredInputMode 의미

```text
none = 본문/파일 입력 없이 실행 가능
at_least_one = requiredInputTypes 중 하나 이상 필요
all = requiredInputTypes에 명시된 모든 입력 필요
```

예시:

```json
{
  "titleRequired": false,
  "acceptedInputTypes": ["audio", "text"],
  "requiredInputMode": "at_least_one",
  "requiredInputTypes": ["audio", "text"],
  "allowedFileTypes": ["webm", "mp3", "m4a", "wav"],
  "maxFileSizeMB": 20,
  "maxFiles": 1
}
```

위 예시는 “제목은 선택, 음성 또는 텍스트 중 하나 이상 필요”라는 뜻이다.

### n8n 내부 방어 검증

n8n은 Gateway/App의 schema validation을 신뢰하되, 워크플로우 실행 안정성을 위해 방어적 검증을 할 수 있다.  
단, 방어적 검증도 해당 워크플로우의 실제 입력 계약에 맞아야 하며 `input.title`을 무조건 필수로 처리하면 안 된다.

```text
필수 입력 누락은 throw로 워크플로우를 터뜨리기보다 controlled config_error callback으로 변환하는 것을 우선한다.
입력 누락 에러에는 code, message, phase, nodeName, retryable을 포함한다.
민감정보, 원본 파일 내용, 토큰, Credential 값은 에러 details에 넣지 않는다.
```

## 8. settings / input / payload / credentials 분류 원칙

### settings

사용자 또는 회사별로 달라질 수 있는 실행 설정값이다.

예:

```text

reportEmailTo

language

timezone

fileNamePrefix

optionalExportProvider

googleDriveMdFolderName

googleDriveMdFolderId

googleDriveAttachmentFolderName

googleDriveAttachmentFolderId

sheetId

```

### input

사용자가 실행 시 입력하는 값이다.

```text

input.title

input.text

input.files

multipart binary file_0

```

주의:

```text
input.title은 사용자가 실행 시 입력한 제목이다.
제목이 선택값인 워크플로우에서는 빈 값일 수 있다.
시스템이 만든 임시 실행 제목을 input.title에 넣지 않는다.
실행 목록 표시용 제목은 payload 또는 submission 메타 필드로 분리한다.
```

### payload

시스템 메타데이터다.

```text

submissionId

clientId

uid

workflowKey

automationId

requestedAt

callbackUrl

retentionPolicy

originalFileRefs

```

### credentials

n8n에 고정 등록되어야 하는 보안 자격증명이다.

```text

Google Drive OAuth Credential

Google Drive Service Account Credential

Gmail OAuth Credential

Gemini API Credential

Webhook Header Auth Credential

Callback Bearer Secret Credential

```

### settings에 넣으면 안 되는 값

```text

Google Access Token

Google Refresh Token

n8n Credential ID

Gemini API Key

n8n 서버 토큰

callback secret

Firebase Admin Key

Service Account private key

```

## 9. Result Policy Router 표준

processorResult 생성 이후 결과 처리 영역에 `[20] Result Policy Router`를 둔다.

권장 영역:

```text

[20] Result Policy Router

[21] Notify / Email

[22] Store Processor Result

[23] Optional Export

[24] Callback

```

입력 원본파일 이메일 첨부 노드 권장 구조:

```text
[21A] Email MD Attachment Build
- processorResult 또는 Markdown 문자열을 이메일 첨부용 .md binary로 변환한다.

[21B] Email Original Attachment Prepare
- Webhook multipart의 원본 binary(file_0 등)를 이메일 첨부용으로 전달한다.
- 원본 파일명, MIME 타입이 있으면 최대한 보존한다.
- 원본 binary를 새로 Storage/Drive에 업로드하지 않는다.

[21C] Send Email Report
- 이메일 본문 + MD 첨부 + 선택적 원본 입력파일 첨부를 함께 전송한다.
```

### [21] Notify / Email 표준

```text
이메일 보고 기능이 있는 워크플로우는 가능한 경우 processor 결과를 Markdown 본문으로 정리한다.
notify_only에서는 이 Markdown을 이메일 본문 또는 .md 첨부파일로 전송할 수 있다.
notify_only에서 Webhook multipart 입력 원본 파일(file/image/audio 등)이 존재하고 워크플로우 정책상 원본 첨부가 필요한 경우, 해당 원본 binary도 이메일에 임시 첨부할 수 있다.
notify_only의 MD 첨부파일과 입력 원본 첨부파일은 임시 결과물이며 N8Lient DB/Storage/originalFileRefs/resultRefs에 보관하지 않는다.
processed_result 이상에서는 processorResult.mdContent를 callback에 포함할 수 있다.
full_archive 또는 Optional Export에서는 정책에 따라 resultRefs에 파일 참조를 포함할 수 있다.
```

### notify_only

```text
이메일/알림 중심 경량형
Markdown 결과 파일을 임시 생성하여 이메일 본문 또는 첨부파일로 전달 가능
Webhook multipart로 넘어온 입력 원본 파일(file/image/audio 등)을 이메일에 임시 첨부 가능
processorResult 전체 callback 생략 가능
originalFileRefs 없음
resultRefs 없음
N8Lient DB/Storage에 결과 본문 또는 결과 파일 보관 금지
```

`notify_only`에서 생성하는 MD 첨부파일과 입력 원본 첨부파일은 이메일 발송용 임시 파일이다.  
이 파일을 Firebase Storage, Google Drive 기본 보관 위치, originalFileRefs, resultRefs에 저장하면 `notify_only`가 아니다.  
입력 원본 binary는 이메일 첨부용 브랜치에서만 유지하고, Processor/LLM/Callback 노드 전체에 불필요하게 복제하지 않는다.  
원본 binary가 이메일 발송 시점에 존재하지 않거나 워크플로우의 이메일 첨부 한도를 초과하면 원본 첨부를 생략하고 이메일 본문에 사유를 짧게 표시한다.  
이메일 발송 실패는 워크플로우 정책에 따라 warning 또는 failed/config_error로 보고하되, 민감정보나 파일 내용을 error details에 넣지 않는다.

### processed_result

```text
processorResult callback 포함
processorResult.title / summary / content / mdContent 저장
결과 목록/상세/검색 대상 가능
원본 파일 영구 보관 없음
resultRefs는 기본적으로 없음
MD 다운로드는 저장된 mdContent 기반 동적 생성 가능
```

### full_archive

```text
processorResult callback 포함
originalFileRefs 유지
resultRefs 포함 가능
Firebase Storage 또는 지정 스토리지에 원본/결과 파일 참조 보관
Optional Export 가능
```

중요:

```text

원본 파일 영구 저장 여부는 Gateway가 결정한다.

n8n은 Gateway가 전달한 retentionPolicy.level에 따라 callback payload와 optional export만 조정한다.

```

## 10. Google Drive / Optional Export 원칙

Google Drive는 기본 보관소가 아니라 Optional Export 패키지다.

1. Google Drive 저장이 기존 업무 로직에 필요하면 Optional Export 영역으로 분리한다.
2. Drive 저장 실패가 processorResult 생성 성공을 무조건 실패로 만들 필요는 없다.
3. 다만 해당 자동화에서 Drive 파일 생성 자체가 핵심 결과라면 failed 또는 warning 정책을 보고한다.
4. Drive 저장용 Credential은 공용 OAuth 또는 Service Account Credential을 사용한다.
5. 사용자의 Google Token, Refresh Token, Credential ID를 settings에 넣지 않는다.
6. 단일 Google Drive 폴더 ID 하나로 MD 파일과 첨부파일을 섞지 않는다.
7. MD 파일 보관 폴더와 첨부파일 보관 폴더를 분리한다.
8. 폴더명은 사용자 이해용 표시값이고, 실제 업로드 위치는 Folder ID 기준이다.
9. Shared Drive 사용 시에는 해당 Credential이 대상 폴더에 접근 가능한지 확인한다.
10. Service Account 사용 시 대상 Shared Drive 또는 폴더에 서비스 계정 이메일 권한이 있어야 한다.

표준 settings 키:

```text
optionalExportProvider
googleDriveMdFolderName
googleDriveMdFolderId
googleDriveAttachmentFolderName
googleDriveAttachmentFolderId
```

위 조건부 필수 규칙은 후속 Workflow Template Import JSON의 `configSchema.conditionalRequired` 후보로 반드시 보고한다.

```json
{
  "key": "googleDriveMdFolderId",
  "required": false,
  "conditionalRequired": {
    "field": "optionalExportProvider",
    "equals": "google_drive"
  }
}
```

`optionalExportProvider=google_drive`일 때 조건부 필수 후보:

```text
googleDriveMdFolderName
googleDriveMdFolderId
googleDriveAttachmentFolderName
googleDriveAttachmentFolderId
```

금지되는 구형/혼합 표현:

```text
settings.driveId
settings.mdFolderId
settings.originalFileFolderId
settings.googleDriveExportFolderId 하나로 MD/첨부파일을 함께 처리하는 구조
```

Google Drive Optional Export 표준 분기:

```text
optionalExportProvider = none
→ Optional Export 미실행

optionalExportProvider = google_drive
→ googleDriveMdFolderId에 MD 업로드
→ googleDriveAttachmentFolderId에 원본 음성/이미지/첨부파일 업로드
→ MD 본문에 첨부파일 webViewLink 삽입
→ resultRefs에 optional_export_md / optional_export_attachment 기록
```

## 11. processorResult 표준

n8n은 처리 완료 후 가능한 한 아래 구조로 processorResult를 만든다.

```json
{
  "title": "결과 제목",
  "summary": "짧은 요약",
  "content": "본문 텍스트",
  "mdContent": "# Markdown 결과",
  "hashtags": ["태그1", "태그2"],
  "attachments": [],
  "structuredData": {},
  "warnings": []
}
```

최소 기준:

```text
Level 2 이상에서는 title 또는 summary 중 하나가 있어야 한다.
Level 2 이상에서는 content 또는 mdContent 중 하나가 있어야 한다.
hashtags는 필요한 경우만 사용하고, 무리한 자동 분류나 지식 그래프 대체 용도로 쓰지 않는다.
attachments는 원본/결과 파일 참조를 표현할 때만 사용한다.
structuredData는 워크플로우별 자유 확장 영역이다.
warnings는 불확실성, 누락, 외부 export 실패 등 보조 정보를 담는다.
```

구버전 호환:

```text
기존 워크플로우가 keywords를 쓰고 있다면 즉시 제거하지 않아도 된다.
다만 신규 표준은 hashtags를 우선한다.
필요하면 keywords 값을 hashtags로 정규화해 반환한다.
구버전 callback 또는 기존 노드가 keywords를 요구하면 processorResult.structuredData.legacyKeywords에 보존할 수 있다.
```

## 12. callback 표준

### success

```json
{

  "submissionId": "sub_xxx",

  "status": "success",

  "processorResult": {

    "title": "결과 제목",

    "summary": "결과 요약",

    "content": "본문",

    "mdContent": "# Markdown 결과",

    "hashtags": [],

    "attachments": [],

    "structuredData": {},

    "warnings": []

  },

  "resultRefs": [],

  "result": {

    "summary": "사용자에게 표시할 짧은 요약",

    "resultUrl": null

  }

}
```

### failed

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

### config_error

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

## 13. Sticky Note 영역 구분

수정 JSON에는 Sticky Note를 추가하거나 갱신해 역할 영역을 시각적으로 구분한다.

필수 영역:

```text

N8Lient 입력/인증 영역

Payload Normalize 영역

Input Validate 영역

File Normalize 영역

Processor 영역

Result / Retention Policy 영역

Optional Export 영역

Callback 영역

Error / Exception 영역

```

Sticky Note에는 “N8Lient 연동부”와 “순수 업무 처리부”가 구분되도록 적는다.

## 13-1. 노드 시각화 배치 / 캔버스 정리 기준

수정 JSON은 기능적으로 동작하는 것뿐 아니라, n8n 캔버스에서 단계별 구조가 한눈에 보이도록 정리한다.

핵심 원칙:

```text
왼쪽에서 오른쪽으로 실행 흐름이 이어지게 배치한다.
입력 단계, 프로세서 단계, 결과/보관/보고 단계, 오류/예외 단계를 시각적으로 분리한다.
수동 테스트 branch와 운영 Webhook branch는 같은 Payload Normalize 이후 합류시킨다.
노드명은 번호만 붙이지 말고 역할이 드러나게 작성한다.
같은 단계 안에서도 응답, 검증, 분기, callback payload 생성 노드는 접미사로 구분한다.
Sticky Note는 단순 설명이 아니라 캔버스 영역 구분판 역할을 하게 배치한다.
```

권장 단계 구분:

```text
[00T] Manual Test Input
[01] N8Lient Webhook / Input
[01R] N8Lient Accepted Response
[02] Payload Normalize
[03] Input / File Normalize
[03V] Validate / Controlled Error Check

위 영역 = 입력/정규화/검증 단계

[10] Processor Request Build
[11] AI / External Processor Call
[12] Parse Result / Build ProcessorResult
[13] Build Result Content / MD Content

위 영역 = 순수 업무 처리부, 즉 Processor 단계

[20] Result Policy Router
[21V] Notify Required?
[21] Notify / Email
[22] Store Processor Result 준비 또는 callback 반영 준비
[23] Optional Export
[24B] Build Success Callback Payload
[24V] Callback Required?
[24C] Gateway Callback

위 영역 = 결과/보관/보고/Callback 단계

[90] Error / Exception
[90B] Build Error Callback Payload
[90C] Error Callback 또는 공용 에러 처리 워크플로우 연계

위 영역 = 오류/예외 처리 단계
```

캔버스 배치 기준:

```text
수동 테스트 영역은 운영 Webhook 위쪽 또는 별도 상단 라인에 둔다.
운영 Webhook 입력 영역은 가장 왼쪽에 둔다.
Payload Normalize와 Validate는 Webhook 오른쪽에 붙여 입력 단계가 끝나는 지점을 명확히 한다.
Processor 영역은 중앙에 배치하고, 기존 정상 업무 처리 노드는 가능한 이 영역 안에 보존한다.
Result Policy Router 이후 결과 단계는 Processor 오른쪽에 배치한다.
Optional Export, Email Notify, Gateway Callback은 Result Policy Router에서 분기된 하위 라인으로 정렬한다.
Error / Exception 영역은 하단에 별도로 배치해 정상 흐름과 섞이지 않게 한다.
노드가 겹치거나 대각선 연결이 과도하게 생기지 않도록 좌우 간격과 상하 간격을 확보한다.
```

Sticky Note 필수 권장 제목:

```text
AREA 00T - Manual Test Input
AREA 01-03 - Input / Normalize / Validate
AREA 10-13 - Processor
AREA 20-24 - Result / Retention / Callback
AREA 90 - Error / Exception
```

노드 수정 시 주의:

```text
기능상 수정이 필요 없어도, 영역 구분을 위해 노드명과 위치는 정리할 수 있다.
단, 기존 정상 동작 중인 업무 처리 노드의 내부 로직은 불필요하게 수정하지 않는다.
시각 정리를 위해 노드를 복제하거나 불필요한 중간 노드를 추가하지 않는다.
위치 변경과 Sticky Note 추가는 실행 로직에 영향을 주지 않아야 한다.
수정 후 최종 보고에는 시각화 배치 기준을 어떻게 반영했는지 반드시 설명한다.
```

## 14. import 가능성 점검

수정 후 아래 항목을 점검한다.

1. JSON 파싱 오류가 없는가.
2. nodes 배열과 connections 구조가 깨지지 않았는가.
3. 연결되지 않은 필수 노드가 생기지 않았는가.
4. 기존 node id를 불필요하게 변경하지 않았는가.
5. 새로 추가한 노드 id가 중복되지 않는가.
6. Credential 값 자체를 JSON에 하드코딩하지 않았는가.
7. Credential 참조는 이름과 타입 기준으로 식별 가능하게 남겼는가.
8. HTTP Request URL, Header, Body 표현식이 n8n 표현식 문법에 맞는가.
9. Code 노드 JavaScript 문법 오류가 없는가.
10. binary 필드명이 다음 노드의 inputDataFieldName과 일치하는가.
11. Sticky Note는 실행 로직에 영향을 주지 않는가.
12. 입력/프로세서/결과/오류 영역이 캔버스에서 시각적으로 분리되어 있는가.
13. 노드 번호와 노드명이 단계별 역할을 충분히 드러내는가.
14. 수동 테스트 branch와 운영 branch가 Payload Normalize 이후 자연스럽게 합류하는가.
15. n8n import 후 Credential 재연결이 필요한 항목을 별도로 보고했는가.

## 15. 1차 보고 형식

수정 전 1차 보고에는 아래를 포함한다.  
사용자가 승인하기 전에는 JSON을 수정하지 않는다.

### 노드 변경 검토표 (필수)

- **대상**: 워크플로우 노드
- **작업 시점**: JSON 수정이 필요할 때
- n8n 노드 **순번(01, 02, …)** 순으로 **빠진 노드 없이** 전 행을 작성한다. Sticky Note도 포함하되 변경 없으면 일반 행으로 둔다.
- **산출물 우선순위** (1차 보고·승인 전):
  1. **1안 (필수 시도)**: 노드 변경 검토표를 **Excel 파일(.xlsx)** 로 생성해 사용자가 다운로드할 수 있게 제공한다. 프로젝트 `scripts/` 또는 사용자 지정 폴더에 저장하고, 저장 경로와 파일명을 채팅에 안내한다.
  2. **2안**: .xlsx 생성이 불가하면 **단일 HTML 파일**로 생성해 다운로드·열기 가능하게 제공한다.
  3. **3안**: 파일 생성도 불가하면 **채팅에 표(Markdown/HTML 표)** 로 전체 노드를 표시한다.
- **표 컬럼**: `순번 | 노드명 | 변경 전 | 변경 후 | 변경 내용`
- **파일명 예시**: `{워크플로우명}_노드변경검토표_1차보고.xlsx` 또는 `.html`
- 수정 불필요 행: 배경색 없음. 변경 전·후는 「동일」 또는 「-」
- 수정 필요 행: **주황색 배경** (Excel: 해당 행 Fill `#FFE0B2`, HTML: `<tr style="background-color:#FFE0B2">`)
- MODE 1에서는 커스터마이징·이메일 디자인 수정 대상 모두 주황색으로 표시한다.
- 표(또는 파일) 하단/본문 마지막에 **승인 요청 문장** 1줄
- **1안·2안**을 사용한 경우, 채팅에는 파일 제공 사실과 요약(수정 필요 노드 개수 등)만 적고 **전체 표를 중복 붙이지 않는다**.

### 워크플로우 계약 요약 (검토표 외)

1. 현재 워크플로우의 N8Lient 표준 반영 상태
2. 구형 직접 업로드 구조 발견 여부
3. Header Auth Credential 적용 상태
4. settings/input/payload/credentials 분류 결과
5. configSchema 등록 필요 항목
   - 항상 필수 required 후보
   - 조건부 필수 conditionalRequired 후보
6. inputSchema 최종 후보
   - titleRequired
   - acceptedInputTypes
   - requiredInputMode
   - requiredInputTypes
   - allowedFileTypes
   - maxFileSizeMB
   - maxFiles
   - 판단 근거 노드
7. 제목 처리 정책
   - 사용자가 입력한 제목을 필수로 요구하는가
   - 제목이 없을 때 LLM/Processor가 생성하는가
   - 시스템 임시 제목을 input.title에 넣는 구조가 있는가
   - 수정 필요 여부
8. Webhook binary file_0 처리 여부
9. 필수 입력 누락 처리 방식
   - failed/config_error 구분
   - controlled error callback 가능 여부
10. retentionPolicy 수신 및 Result Policy Router 필요 여부
11. notify_only 이메일 MD 첨부 처리 방식
   - MD 임시 생성 여부
   - 이메일 본문 또는 첨부 전송 여부
   - DB/Storage/resultRefs 미보관 여부
12. processorResult 생성 상태
13. callback 구조 상태
14. Sticky Note 갱신 필요 여부
15. 노드 시각화 배치/번호 체계 정리 필요 여부
16. Google Drive / Optional Export 구조
   - optionalExportProvider
   - googleDriveMdFolderName / googleDriveMdFolderId
   - googleDriveAttachmentFolderName / googleDriveAttachmentFolderId
   - optional_export_md / optional_export_attachment resultRefs 설계
17. Credential 재연결 필요 항목
18. 남은 위험 요소

## 16. 최종 보고 형식

수정 JSON 생성 후 최종 보고에는 아래 항목을 포함하라.

1. 수정/추가/삭제한 노드
2. 구형 구조 제거 여부
3. Header Auth Credential 적용 위치
4. settings/input/payload/credentials 추출 결과
5. configSchema 등록 필요 항목
   - 항상 필수 required
   - 조건부 필수 conditionalRequired
6. inputSchema 최종 후보
   - titleRequired
   - acceptedInputTypes
   - requiredInputMode
   - requiredInputTypes
   - allowedFileTypes
   - maxFileSizeMB
   - maxFiles
7. 제목 처리 정책 반영 여부
   - input.title 선택/필수 여부
   - 제목 없음 시 Processor/LLM 제목 생성 여부
   - 시스템 표시용 제목과 input.title 분리 여부
8. Webhook binary file_0 처리 여부
9. 필수 입력 누락 처리 및 controlled error callback 여부
10. retentionPolicy 처리 및 Result Policy Router 반영 여부
11. notify_only 이메일 MD 첨부 처리
   - MD 임시 생성 및 이메일 첨부 여부
   - DB/Storage/resultRefs 미보관 여부
12. processorResult 생성 방식
13. callback 구조
14. Sticky Note 영역 구분 반영 여부
15. 노드 시각화 배치/번호 체계 반영 여부
16. Google Drive / Optional Export 처리
   - MD 폴더와 첨부파일 폴더 분리 여부
   - Google Drive 첨부파일 링크를 MD에 반영했는지 여부
   - resultRefs optional_export_md / optional_export_attachment 기록 여부
   - optionalExportProvider=google_drive 조건부 필수 settings 반영 여부
17. import 가능성 점검 결과
18. Credential 재연결 필요 항목
19. 남은 위험 요소
20. 수정 JSON 다운로드 링크 또는 파일명
