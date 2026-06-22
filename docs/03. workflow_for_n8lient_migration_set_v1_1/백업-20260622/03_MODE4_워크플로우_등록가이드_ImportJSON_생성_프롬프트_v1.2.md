# MODE 4 — 워크플로우 등록 가이드 / Import JSON 생성 프롬프트 v1.2

이 문서는 최종 n8n 워크플로우 JSON을 분석하여 N8Lient 앱에 등록할 워크플로우 마스터 HTML 가이드와 표준 Import JSON을 생성하는 모드다.
이 모드에서는 n8n JSON 자체를 수정하지 않는다.

필수 첨부:

```text
1. 이 프롬프트 파일
2. 최종 n8n 워크플로우 JSON
```

추가 설계서/테스트 결과가 있으면 참고하되, 없어도 질문하지 말고 n8n JSON에서 확인 가능한 값만으로 진행한다.

---

# MODE 4 — N8Lient 워크플로우 마스터 등록 HTML 가이드 & Import JSON 생성 프롬프트 v1.2

최종 n8n 워크플로우 JSON을 분석하여, N8Lient 앱의 **워크플로우 마스터 등록용 HTML 가이드**와 **N8Lient 표준 Import JSON**을 생성하라.

이 프롬프트의 목적은 오퍼레이터가 n8n 워크플로우를 N8Lient 워크플로우 마스터로 등록할 때 필요한 값을 검토·수정하고, 앱에 불러올 수 있는 표준 Import JSON을 다운로드하게 하는 것이다.

기본 첨부는 아래 2개면 충분하다.

```text
1. 이 프롬프트 파일
2. 최종 n8n 워크플로우 JSON 파일
```

추가 설계서/테스트 결과가 있으면 참고하되, 없어도 질문하지 말고 n8n JSON에서 확인 가능한 값만으로 진행한다.

- 이 프롬프트만 있고 n8n JSON이 없으면: `가이드 생성 준비가 되었습니다. 워크플로우 JSON 파일을 첨부해 주세요.`
- 이 프롬프트와 n8n JSON이 모두 있으면: `가이드 생성 준비 완료되었습니다. 지금 생성할까요? 덧붙일 지시가 있으면 알려주세요. 없으면 바로 시작하겠습니다.`

---

## 0. v1.2 핵심 변경점

v1.2는 v1.1의 실행 Validation 계약과 Level 1 `notify_only`의 이메일 MD/입력 원본파일 임시 첨부 정책을 유지하면서, `09_엔팔라이언트_워크플로우_버전관리_운영_계약` 기준을 추가로 반영한 버전이다.

```text
1. acceptedInputTypes와 requiredInputTypes를 분리한다.
2. titleRequired는 제목 필수 여부만 뜻한다.
3. titleRequired=false이면 input.title이 비어 있어도 실행 가능해야 한다.
4. 시스템이 만든 임시 제목을 input.title에 넣지 않는다.
5. 실행 목록 표시용 제목이 필요하면 executionTitle/displayTitle/submissionTitle 같은 별도 필드를 사용한다.
6. configSchema에 conditionalRequired를 허용한다.
7. Optional Export 사용 시 Google Drive 폴더 4종은 조건부 필수로 표현한다.
8. notify_only는 N8Lient에 결과 본문/파일을 보관하지 않지만, 이메일 MD 첨부 전송은 지원할 수 있다.
9. notify_only는 Webhook multipart 입력 원본 파일(file/image/audio 등)을 이메일에 임시 첨부할 수 있다.
10. notify_only의 MD 첨부와 입력 원본파일 이메일 첨부는 resultRefs, originalFileRefs 또는 Storage 보관으로 판단하지 않는다.
11. workflowKey는 자동화 제품군/논리 키이고, version은 실제 배포 workflowVersion으로 판단한다.
12. n8n 워크플로우명에 버전이 포함되어 있는지 확인하고, webhookPath 또는 n8nWorkflowId가 해당 버전과 연결되는지 warning으로 표시한다.
13. releaseType: PATCH / MINOR / MAJOR 후보와 신규 버전 등록/기존 버전 PATCH 여부를 확인 필요 항목에 포함한다.
```

N8Lient는 특정 워크플로우 전용 앱이 아니라 범용 n8n 클라이언트 앱이다.  
따라서 실행 필수값은 앱/Gateway가 하드코딩하지 않고, 워크플로우 마스터 Import JSON의 `inputSchema`와 `configSchema`를 기준으로 동적으로 검증해야 한다.

---

## 1. 최종 산출물

반드시 **단일 HTML 파일**을 만든다.

HTML의 목적은 2가지다.

```text
1. 오퍼레이터가 A4 출력용 체크리스트처럼 보면서 등록값을 검토·수정
2. HTML에서 수정한 값을 N8Lient 표준 Import JSON으로 다운로드
```

HTML은 외부 라이브러리 없이 단일 파일로 동작해야 한다.

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>...</title>
  <style>...</style>
</head>
<body>
  ...
  <script>...</script>
</body>
</html>
```

최종 파일명:

```text
N8Lient_워크플로우_마스터_등록가이드_{workflowKey}_v1.0.html
```

HTML 안에서 다운로드되는 JSON 파일명:

```text
N8Lient_워크플로우_마스터_ImportJSON_{workflowKey}_v1.0.json
```

---

## 2. 가장 중요한 강제 규칙

아래 규칙은 반드시 지켜라.

```text
1. 최종 Import JSON에는 undefined 값을 절대 만들지 않는다.
2. null도 가능하면 쓰지 않는다. 모르면 안전한 기본값을 넣고 HTML에서 warning 처리한다.
3. boolean은 반드시 true 또는 false로 출력한다.
4. 배열은 반드시 배열로 출력한다.
5. configSchema의 인풋 타입 필드명은 반드시 type이다.
6. inputType은 최종 Import JSON에 절대 남기지 않는다.
7. inputSchema의 허용 확장자 필드명은 반드시 allowedFileTypes이다.
8. allowedExtensions는 최종 Import JSON에 절대 남기지 않는다.
9. retentionCapabilities와 operatorRetentionPolicy는 일부 필드만 출력하지 말고 전체 필드를 반드시 출력한다.
10. Credential, Token, Secret, API Key, Access Token, Refresh Token, Private Key, Service Account 값은 절대 출력하지 않는다.
11. 자동 생성된 실행 표시용 제목을 input.title로 취급하지 않는다.
12. titleRequired=false인 워크플로우에서 input.title을 필수로 판단하지 않는다.
```

---

## 3. N8Lient 표준 Import JSON 구조

HTML의 `collectImportJson()`은 반드시 아래 구조를 만든다.

```json
{
  "schemaVersion": "n8lient.workflowTemplateImport.v1",
  "workflowTemplate": {
    "workflowKey": "",
    "name": "",
    "shortName": "",
    "version": "1.0.0",
    "status": "draft",
    "description": "",
    "webhookSecretId": "",
    "n8nServerKey": "main",
    "inputSchema": {
      "titleRequired": false,
      "acceptedInputTypes": [],
      "requiredInputMode": "at_least_one",
      "requiredInputTypes": [],
      "allowedFileTypes": [],
      "maxFileSizeMB": 20,
      "maxFiles": 1
    },
    "retentionCapabilities": {
      "maxLevel": "processed_result",
      "defaultLevel": "processed_result",
      "supportedLevels": ["notify_only", "processed_result"],
      "supportsProcessorResult": true,
      "supportsOriginalFileRefs": false,
      "supportsResultRefs": false,
      "supportsResultPolicyRouter": false,
      "supportsEmailNotification": false
    },
    "operatorRetentionPolicy": {
      "allowedLevels": ["notify_only", "processed_result"],
      "defaultLevel": "processed_result",
      "allowCompanyOverride": true,
      "allowUserOverride": true
    },
    "configSchema": []
  }
}
```

### retentionCapabilities 전체 필드

반드시 아래 8개 필드를 모두 출력한다.

```text
maxLevel
defaultLevel
supportedLevels
supportsProcessorResult
supportsOriginalFileRefs
supportsResultRefs
supportsResultPolicyRouter
supportsEmailNotification
```

판단 기준:

```text
이메일 알림/보고 기능, 이메일 MD 첨부 전송 기능, 또는 입력 원본파일 이메일 임시 첨부 기능이 있으면 supportsEmailNotification = true
명확하지 않으면 false
입력 원본파일을 이메일에 임시 첨부하는 기능만으로는 supportsOriginalFileRefs = true로 판단하지 않는다
원본 파일 저장/참조가 있으면 supportsOriginalFileRefs = true
결과 파일 저장/참조가 있으면 supportsResultRefs = true
보관 정책 라우터가 있으면 supportsResultPolicyRouter = true
명확하지 않으면 false
```

### operatorRetentionPolicy 전체 필드

반드시 아래 4개 필드를 모두 출력한다.

```text
allowedLevels
defaultLevel
allowCompanyOverride
allowUserOverride
```

---

## 4. HTML 구성

HTML은 아래 섹션만 포함한다.

```text
0. 상단 요약 / 액션 버튼
1. 워크플로우 기본 정보
2. inputSchema
3. 워크플로우 보관 지원 범위
4. 오퍼레이터 허용 보관 정책
5. configSchema
6. 확인 필요 항목
```

기존 “Webhook Secret 및 설명글” 섹션은 따로 만들지 말고, **워크플로우 기본 정보** 안에 포함한다.

상단 버튼:

```text
[Import JSON 다운로드]
[현재 값 복사]
[인쇄]
```

---

## 5. A4 출력 디자인

디자인은 실무 체크리스트처럼 단순하게 한다.

```text
폭: A4 기준 190mm 안쪽
배경: 흰색
폰트: system-ui, Arial, sans-serif
색상: 흑백 중심 + 상태 색상 최소
카드: 얇은 회색 테두리
버튼: 화면에서만 표시, 인쇄 시 숨김
```

반드시 print CSS를 포함한다.

```css
@page { size: A4; margin: 12mm; }

@media print {
  body { background: #fff; }
  .no_print { display: none !important; }
  .section { break-inside: avoid; page-break-inside: avoid; }
  input, textarea, select {
    border: none;
    background: transparent;
    color: #111;
  }
}
```

---

## 6. 필드 상태 표시

모든 주요 필드는 상태를 가진다.

```text
ok      = 파란색, 사용 가능
warning = 주황색, 확인 필요
error   = 빨간색, 저장 전 수정 필요
```

기본 CSS:

```css
.field.ok { border-left: 4px solid #3b82f6; background: #eff6ff; }
.field.warning { border-left: 4px solid #f97316; background: #fff7ed; }
.field.error { border-left: 4px solid #ef4444; background: #fef2f2; }
```

각 필드에는 짧은 안내문을 붙인다.

```text
ok: 저장 가능한 값입니다.
warning: 자동 추정값입니다. 저장 전 확인하세요.
error: 필수값이거나 형식 오류입니다. 저장 전 수정하세요.
```

---

## 7. 기본 정보 필드

아래 필드는 모두 input/select/textarea로 수정 가능해야 한다.

```text
workflowKey          영문 소문자/숫자/하이픈
name                 사용자에게 보일 이름
shortName            2~4자 권장
version              workflowVersion, 기본값 1.0.0
status               draft 또는 published, 기본 draft
webhookSecretId      실제 Secret 값이 아니라 참조 ID, 보통 workflowKey와 동일 권장
n8nServerKey         기본값 main
description          1~2문장
```

중요:

```text
n8n 워크플로우 이름과 N8Lient 표시 이름은 달라도 된다.
하지만 n8n 워크플로우명에는 운영자가 구분할 수 있도록 버전을 포함하는 것을 원칙으로 한다.
workflowKey는 자동화 제품군/논리 키이고, version은 실제 배포 workflowVersion이다.
동일 workflowKey라도 여러 workflowVersion이 존재할 수 있으며, 고객사별 사용 버전은 clientAutomation.workflowVersion에 고정된다.
webhookSecretId는 실제 n8n Webhook Path 또는 Gateway 매핑 키와 맞아야 한다.
버전별 webhookPath 또는 n8nWorkflowId가 분리되어야 하는 경우 확인 필요 항목에 표시한다.
```

---

## 8. inputSchema 기준

출력 필드:

```text
titleRequired         checkbox
acceptedInputTypes    text/file/image/audio 체크박스
requiredInputMode     none/at_least_one/all select
requiredInputTypes    text/file/image/audio 체크박스
allowedFileTypes      쉼표 문자열, export 시 배열
maxFileSizeMB         숫자
maxFiles              숫자
```

### 필드 의미

```text
titleRequired
- 사용자가 직접 입력한 제목이 반드시 필요한지 여부다.
- false이면 제목 없이 실행 가능해야 한다.
- false인 경우 n8n/Gemini가 본문, 음성, 이미지, 파일 내용을 분석해 제목을 생성할 수 있다.

acceptedInputTypes
- 워크플로우가 받을 수 있는 입력 타입이다.
- text, file, image, audio 중 하나 이상을 가진다.

requiredInputMode
- 입력 필수 조건 방식이다.
- none: 본문/파일 입력 없이도 실행 가능
- at_least_one: requiredInputTypes 중 하나 이상 필요
- all: requiredInputTypes에 명시된 모든 입력 필요

requiredInputTypes
- 실제 실행 시 필수로 요구되는 입력 타입 목록이다.
- acceptedInputTypes의 부분집합이어야 한다.

allowedFileTypes
- 허용 파일 확장자 또는 MIME 타입 목록이다.
- file/image/audio 입력이 있을 때 적용한다.

maxFileSizeMB
- 파일 최대 크기 정책이다.
- 명확하지 않으면 20MB를 기본값으로 넣고 warning 처리한다.

maxFiles
- 업로드 가능한 최대 파일 수다.
- 명확하지 않으면 1을 기본값으로 넣고 warning 처리한다.
```

### 판단 기준

```text
audio binary가 핵심이면 acceptedInputTypes=["audio"], requiredInputTypes=["audio"]로 둔다.
텍스트 또는 음성 중 하나만 있으면 되면 acceptedInputTypes=["text","audio"], requiredInputMode="at_least_one", requiredInputTypes=["text","audio"]로 둔다.
파일이 선택 첨부일 뿐이면 acceptedInputTypes에는 포함할 수 있으나 requiredInputTypes에는 넣지 않는다.
문서 파싱이 명확하지 않으면 file 체크 금지
이미지 처리가 명확하지 않으면 image 체크 금지
file_0 같은 generic 이름만 보고 file을 자동 체크하지 말 것
확실하지 않은 최대 크기는 20MB 또는 운영상 안전값을 넣고 warning
```

### title 처리 원칙

```text
input.title은 실행 시 사용자가 입력한 제목이다.
titleRequired=false이면 input.title은 빈 값일 수 있다.
시스템이 만든 임시 실행 제목을 input.title에 넣지 않는다.
실행 목록 표시용 제목이 필요하면 executionTitle/displayTitle/submissionTitle 같은 별도 필드를 사용한다.
n8n/Gemini가 제목을 생성해야 하는 워크플로우라면 titleRequired=false가 기본이다.
```

### 예시

음성 파일이 필수이고 제목은 선택인 워크플로우:

```json
{
  "titleRequired": false,
  "acceptedInputTypes": ["audio"],
  "requiredInputMode": "at_least_one",
  "requiredInputTypes": ["audio"],
  "allowedFileTypes": ["webm", "mp3", "m4a", "wav"],
  "maxFileSizeMB": 20,
  "maxFiles": 1
}
```

텍스트 또는 음성 중 하나 이상이 필요한 워크플로우:

```json
{
  "titleRequired": false,
  "acceptedInputTypes": ["text", "audio"],
  "requiredInputMode": "at_least_one",
  "requiredInputTypes": ["text", "audio"],
  "allowedFileTypes": ["webm", "mp3", "m4a", "wav"],
  "maxFileSizeMB": 20,
  "maxFiles": 1
}
```

제목과 텍스트가 모두 필요한 워크플로우:

```json
{
  "titleRequired": true,
  "acceptedInputTypes": ["text"],
  "requiredInputMode": "at_least_one",
  "requiredInputTypes": ["text"],
  "allowedFileTypes": [],
  "maxFileSizeMB": 20,
  "maxFiles": 0
}
```

---

## 9. 보관 정책 기준

레벨 표기:

```text
notify_only = 이메일 중심 경량형
processed_result = 지식 DB 저장형
full_archive = 원본·첨부파일 연결형
```

레벨 의미:

```text
notify_only
- N8Lient에는 생성 지식 본문이나 결과 파일을 보관하지 않는다.
- 이메일 본문 또는 MD 첨부파일 형태로 결과를 전달할 수 있다.
- Webhook multipart 입력 원본 파일(file/image/audio 등)을 이메일에 임시 첨부할 수 있다.
- MD 첨부파일과 입력 원본파일 이메일 첨부는 이메일 전송용 임시 결과물이므로 resultRefs/originalFileRefs/Storage 보관으로 보지 않는다.

processed_result
- 1단계 기능에 더해 processorResult를 DB에 저장한다.
- 결과 목록, 상세 보기, 검색, 공유, mdContent 기반 동적 MD 다운로드를 제공할 수 있다.
- 원본 파일과 결과 파일을 Storage에 영구 보관하지 않는 것이 기본이다.

full_archive
- 2단계 기능에 더해 원본/첨부파일 및 결과 파일 참조를 Storage와 연결한다.
- 원본 신뢰성, 감사, 재검토, 첨부파일 기반 지식 관리가 필요한 워크플로우에 사용한다.
```

### retentionCapabilities

HTML에서 수정 가능한 필드:

```text
maxLevel
defaultLevel
supportedLevels
supportsProcessorResult
supportsOriginalFileRefs
supportsResultRefs
supportsResultPolicyRouter
supportsEmailNotification
```

### operatorRetentionPolicy

HTML에서 수정 가능한 필드:

```text
allowedLevels
defaultLevel
allowCompanyOverride
allowUserOverride
```

주의 문구:

```text
오퍼레이터 허용 보관 정책은 워크플로우의 기술 지원 범위를 넘을 수 없습니다.
```

---

## 10. configSchema 기준

각 설정 필드는 아래 필드를 가진다.

```json
{
  "key": "",
  "label": "",
  "type": "text",
  "defaultSource": "직접 입력",
  "required": false,
  "placeholder": "",
  "description": "",
  "options": [],
  "conditionalRequired": null
}
```

허용 type:

```text
text
textarea
email
number
boolean
select
password
url
```

주의:

```text
type 필드만 사용한다.
inputType은 export하지 않는다.
select 타입이면 options가 반드시 필요하다.
configSchema는 HTML 카드 순서대로 export한다.
required는 항상 필수인 설정값에만 true를 쓴다.
특정 선택값에 따라 필수가 되는 값은 conditionalRequired를 사용한다.
```

### conditionalRequired

필요 시 아래 구조를 사용한다.

```json
{
  "field": "optionalExportProvider",
  "equals": "google_drive"
}
```

의미:

```text
field에 지정된 config key의 값이 equals와 같을 때 이 항목은 실행 시 필수다.
```

조건부 필수가 아니면 `conditionalRequired`는 export하지 않거나 빈 객체가 아니라 안전하게 생략한다.

configSchema 후보:

```text
payload.settings.xxx
settings.xxx
회사/사용자별로 달라지는 값
실행에 필요한 폴더 ID
보고 이메일
언어/타임존
파일명 prefix
Google Drive Optional Export 관련 값
```

configSchema 금지 후보:

```text
n8n token
callback secret
Credential ID
Google Access Token
Google Refresh Token
Gemini API Key
Firebase Admin Key
Service Account private key
privateKey
apiKey
secret
token
credential
```

비밀번호성 사용자 설정이 정말 필요한 경우에만 type=password를 쓰되, Credential/Token/API Key 원문은 절대 저장 대상으로 만들지 않는다.

---

## 11. 표준 설정 키 메타데이터

아래 key는 다음 메타데이터를 우선 적용한다.

```text
reportEmailTo
label: 결과 보고 이메일
type: email
defaultSource: 직접 입력
required: false
placeholder: example@company.com
description: 처리 결과를 이메일로 받을 주소입니다.

emailEnabled
label: 이메일 보고 사용
type: boolean
defaultSource: false
required: false
placeholder:
description: 처리 결과를 이메일로 보고할지 설정합니다.

emailAttachResult
label: 결과 MD 파일 첨부
type: boolean
defaultSource: true
required: false
placeholder:
description: 이메일 보고 시 생성된 Markdown 결과 파일을 첨부할지 설정합니다. notify_only에서는 이메일 전송용 임시 첨부이며 DB/Storage/resultRefs 보관 대상이 아닙니다.

optionalExportProvider
label: 외부 내보내기 방식
type: select
defaultSource: none
required: false
placeholder: none
options: none, google_drive
description: 결과 파일을 외부 저장소로 내보낼지 선택합니다.

googleDriveMdFolderName
label: MD 파일 보관 폴더명
type: text
defaultSource: 직접 입력
required: false
conditionalRequired: optionalExportProvider == google_drive
placeholder: N8Lient Notes
description: MD 결과 파일을 저장할 Google Drive 폴더의 표시명입니다.

googleDriveMdFolderId
label: MD 파일 보관 폴더 ID
type: text
defaultSource: 직접 입력
required: false
conditionalRequired: optionalExportProvider == google_drive
placeholder: Google Drive 폴더 ID
description: MD 결과 파일을 저장할 Google Drive 폴더 ID입니다.

googleDriveAttachmentFolderName
label: 첨부파일 보관 폴더명
type: text
defaultSource: 직접 입력
required: false
conditionalRequired: optionalExportProvider == google_drive
placeholder: Attachments
description: 원본 음성, 이미지, 첨부파일을 저장할 Google Drive 폴더의 표시명입니다.

googleDriveAttachmentFolderId
label: 첨부파일 보관 폴더 ID
type: text
defaultSource: 직접 입력
required: false
conditionalRequired: optionalExportProvider == google_drive
placeholder: Google Drive 폴더 ID
description: 원본 음성, 이미지, 첨부파일을 저장할 Google Drive 폴더 ID입니다.

audioPrefix
label: 원본 음성 파일명 접두사
type: text
defaultSource: idea_audio
required: false
placeholder: idea_audio
description: 원본 음성 파일명을 만들 때 사용할 접두사입니다.

mdPrefix
label: MD 파일명 접두사
type: text
defaultSource: idea_card
required: false
placeholder: idea_card
description: 생성된 마크다운 파일명을 만들 때 사용할 접두사입니다.

geminiModel
label: Gemini 모델명
type: text
defaultSource: gemini-2.5-flash
required: false
placeholder: gemini-2.5-flash
description: 처리에 사용할 Gemini 모델명입니다.

prompt
label: 처리 프롬프트
type: textarea
defaultSource: 기본 프롬프트
required: false
placeholder: 기본 프롬프트를 사용하거나 직접 입력
description: 워크플로우 처리에 사용할 사용자 정의 지시문입니다.
```

---

## 12. Google Drive Optional Export

워크플로우가 Google Drive Optional Export를 지원하거나 구형 `googleDriveExportFolderId`가 감지되면 아래 5개 필드를 제안한다.

```text
optionalExportProvider
googleDriveMdFolderName
googleDriveMdFolderId
googleDriveAttachmentFolderName
googleDriveAttachmentFolderId
```

구형 `googleDriveExportFolderId`는 export하지 않는다.

확인 필요 항목에 아래 문구를 넣는다.

```text
구형 googleDriveExportFolderId가 감지되었습니다. 최신 기준은 MD 폴더와 첨부파일 폴더를 분리합니다. n8n 워크플로우도 이 구조에 맞는지 확인하세요.
```

Google Drive Optional Export 조건부 필수:

```text
optionalExportProvider = none
→ Google Drive 관련 필드는 없어도 된다.

optionalExportProvider = google_drive
→ MD 폴더명, MD 폴더 ID, 첨부파일 폴더명, 첨부파일 폴더 ID를 모두 요구한다.
```

---

## 13. HTML JavaScript 요구사항

반드시 아래 함수를 구현한다.

```text
collectImportJson()
downloadImportJson()
copyToClipboard()
printGuide()
validateGuide()
updateStatusSummary()
setFieldStatus(fieldEl, status, message)
```

### collectImportJson() 규칙

```text
acceptedInputTypes: 체크된 값만 배열
requiredInputTypes: 체크된 값만 배열
allowedFileTypes: 쉼표 문자열을 배열로 변환
supportedLevels: 체크된 값만 배열
operatorRetentionPolicy.allowedLevels: 체크된 값만 배열
configSchema: 화면 카드 순서대로 배열
configSchema.type: 반드시 type으로 export
configSchema.options: 쉼표 문자열을 배열로 변환
configSchema.conditionalRequired: 값이 있을 때만 export
boolean checkbox: checked => true, unchecked => false
number: Number() 변환, NaN이면 안전 기본값
undefined/null 값은 절대 export하지 않음
inputType/allowedExtensions는 절대 export하지 않음
```

### validateGuide() 최소 기준

```text
workflowKey 비어 있음 또는 형식 오류 => error
name 비어 있음 => error
webhookSecretId 비어 있음 => error
n8nServerKey 비어 있음 => error

titleRequired가 boolean이 아니면 error
acceptedInputTypes 없음 => error
requiredInputMode가 none/at_least_one/all 중 하나가 아니면 error
requiredInputTypes가 acceptedInputTypes의 부분집합이 아니면 error
requiredInputMode가 at_least_one/all인데 requiredInputTypes 없음 => error
file/image/audio가 requiredInputTypes에 있는데 allowedFileTypes 없음 => warning
maxFileSizeMB 숫자 아님 => error
maxFiles 숫자 아님 => error

retentionCapabilities 전체 필드 누락 => error
operatorRetentionPolicy 전체 필드 누락 => error

configSchema key 비어 있음 => error
configSchema key 중복 => error
configSchema type 비어 있음 또는 지원 타입 아님 => error
select 타입인데 options 없음 => error
conditionalRequired.field가 있는데 해당 config key가 없으면 warning
conditionalRequired.equals가 비어 있으면 warning

label / placeholder / description 비어 있음 => warning
자동 추정값 => warning
정상 입력값 => ok
```

입력 변경 시 즉시 `validateGuide()`를 실행한다.

```text
input
change
click
```

다운로드 버튼은 `validateGuide()`를 먼저 실행한다.

```text
error가 있으면 다운로드 전 confirm으로 경고
warning만 있으면 다운로드 가능
최종 저장 차단은 N8Lient 앱이 다시 수행
```

---

## 14. 복사 버튼

주요 입력값에는 복사 버튼을 제공한다.

```html
<button type="button" data-copy-target="fieldId">복사</button>
```

---

## 15. 확인 필요 항목

HTML 마지막에 확인 필요 항목을 최대 8개만 표시한다.

예:

```text
maxFileSizeMB 운영 정책 확인 필요
Webhook Secret 참조 ID와 실제 n8n Webhook Path 일치 확인 필요
acceptedInputTypes와 requiredInputTypes 구분 확인 필요
titleRequired 권장값 확인 필요
titleRequired=false일 때 input.title 자동 주입 금지 확인 필요
Optional Export 사용 시 Google Drive MD/첨부파일 폴더 분리 확인 필요
notify_only 사용 시 MD 첨부는 이메일 전송용 임시 파일이며 DB/Storage/resultRefs에 보관하지 않는지 확인 필요
workflowVersion이 SemVer 형식인지 확인 필요
n8n 워크플로우명에 버전이 포함되어 있는지 확인 필요
webhookPath 또는 n8nWorkflowId가 해당 버전과 연결되는지 확인 필요
releaseType: PATCH / MINOR / MAJOR 후보 확인 필요
신규 버전 등록인지 기존 버전 PATCH인지 확인 필요
```

---

## 16. 최종 점검

HTML 출력 전에 아래를 확인한다.

```text
1. 완전한 HTML 문서인가?
2. HTML 안에서 값 수정이 가능한가?
3. Import JSON 다운로드 버튼이 있는가?
4. 다운로드 JSON에 schemaVersion과 workflowTemplate이 있는가?
5. inputSchema에 titleRequired, acceptedInputTypes, requiredInputMode, requiredInputTypes, allowedFileTypes, maxFileSizeMB, maxFiles가 있는가?
6. acceptedInputTypes와 requiredInputTypes를 혼동하지 않았는가?
7. titleRequired=false인 워크플로우에서 input.title을 필수로 설명하지 않았는가?
8. configSchema가 카드 순서대로 export되는가?
9. configSchema 필드명이 type인가?
10. conditionalRequired는 필요한 항목에만 export되는가?
11. Import JSON에 inputType이 없는가?
12. inputSchema 필드명이 allowedFileTypes인가?
13. Import JSON에 allowedExtensions가 없는가?
14. retentionCapabilities 8개 필드가 모두 있는가?
15. operatorRetentionPolicy 4개 필드가 모두 있는가?
16. undefined/null 값이 없는가?
17. Credential/Token/Secret 값이 노출되지 않았는가?
18. raw n8n JSON 전체가 그대로 출력되지 않았는가?
19. notify_only의 MD 첨부와 입력 원본파일 이메일 첨부를 supportsResultRefs/originalFileRefs 또는 Storage 보관으로 오판하지 않았는가?
20. workflowVersion이 SemVer 형식인가?
21. n8n 워크플로우명에 버전이 포함되어 있는가?
22. webhookPath 또는 n8nWorkflowId 확인 필요 여부를 표시했는가?
23. releaseType: PATCH / MINOR / MAJOR 후보를 확인 필요 항목에 포함했는가?
24. A4 출력 시 버튼이 숨겨지는가?
```
