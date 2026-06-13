\# N8Lient n8n 워크플로우 마이그레이션 지시 프롬프트 v2.0



첨부한 보존형 기초설계서 문서세트와 수정 대상 n8n 워크플로우 JSON을 기준으로, 기존 n8n 워크플로우를 엔팔라이언트(N8Lient) 표준 프로세서 구조로 마이그레이션하라.



\## 0. 문서 우선순위



문서 간 내용이 충돌하면 아래 순서를 따른다.



1\. 보존형 기초설계서 문서세트의 최신 정책

2\. 현재 첨부된 수정 대상 n8n 워크플로우 JSON의 실제 구조

3\. 기존 Drive/ServiceAccount 호환 문서 또는 과거 프롬프트의 절차적 원칙



과거 문서에 Google Drive 기본 저장, Firebase Storage 미사용, uploadToken, verify-upload-token, uploadSessions, 브라우저 직접 n8n 호출 구조가 있더라도, 최신 표준과 충돌하면 사용하지 않는다.



\## 1. 최우선 원칙



1\. 전체 워크플로우를 갈아엎지 않는다.

2\. 기존 정상 동작 중인 업무 처리 노드는 가능한 유지한다.

3\. 실제 수정 전, 먼저 변경 대상 노드와 변경 이유를 보고한다.

4\. 사용자가 승인하기 전에는 JSON을 수정하거나 새 JSON을 생성하지 않는다.

5\. 이미 엔팔라이언트 표준이 반영된 노드는 불필요하게 수정하지 않는다.

6\. 수정이 필요 없는 항목은 “수정 불필요”로 보고한다.

7\. 추측으로 노드를 추가하지 않는다.

8\. 노드명, 기존 연결, 기존 Credential 참조는 꼭 필요한 경우가 아니면 유지한다.

9\. n8n import 가능성을 해치지 않도록 JSON 구조, node id, connections, credential 참조 형식을 보존한다.



\## 2. 최신 N8Lient 핵심 구조



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



\## 3. 역할 분리 원칙



1\. 브라우저는 n8n Webhook을 직접 호출하지 않는다.

2\. 브라우저는 Cloud Run Gateway의 `/api/automation/execute`만 호출한다.

3\. Cloud Run Gateway가 Firebase 인증, 사용자 승인 확인, 회사/개인 설정 병합, contractRetentionLimit 적용, retentionPolicy 최종 계산, submissions 생성, 파일 수신, 원본 저장 여부 결정, n8n 서버 간 호출을 담당한다.

4\. n8n은 Firestore를 직접 조회하지 않는다.

5\. n8n은 회사 설정과 개인 설정을 직접 병합하지 않는다.

6\. n8n은 Gateway가 전달한 `payload.settings`를 최종 실행 설정값으로 사용한다.

7\. n8n은 실제 업무 처리, processorResult 생성, Result Policy Router 분기, callback 전송만 담당한다.

8\. n8n은 Firestore `submissions`를 직접 수정하지 않는다.

9\. 실행 결과 반영은 반드시 `payload.callbackUrl`을 통한 Gateway callback으로 처리한다.



\## 4. 제거하거나 비활성화할 구형 구조



아래 구조가 있으면 제거, 비활성화 또는 미사용 상태로 정리한다.



\* 브라우저 직접 n8n Webhook 호출 구조

\* 브라우저 직접 업로드 분기

\* `submissionId + uploadToken` 검증 분기

\* `/api/automation/verify-upload-token` 호출 HTTP Request 노드

\* `/api/automation/prepare-upload` 의존 구조

\* `/api/automation/upload-failed` 의존 구조

\* `uploadSessions` 관련 코드, Sticky Note, 주석

\* `N8LIENT\_BASE\_URL` 또는 `N8LIENT\_APP\_BASE\_URL` 의존

\* n8n Webhook CORS에 운영상 의존하는 구조

\* `no-server-token-dev` 같은 개발용 우회 인증

\* Code 노드 내부에서 `$env.N8N\_SERVER\_MAIN\_TOKEN`을 직접 읽어 비교하는 구조

\* Callback 노드 내부에서 `$env.N8N\_CALLBACK\_SECRET`을 직접 읽어 Authorization 헤더를 만드는 구조

\* n8n이 Firestore를 직접 수정하는 구조

\* retentionPolicy 없이 결과 저장 위치를 하드코딩하는 구조



\## 5. Webhook 인증 표준



n8n Webhook 노드는 Header Auth Credential을 사용한다.



권장 Credential:



```text

Credential Type: Header Auth

Name: N8Lient Gateway Header Auth

Header Name: X-N8N-TOKEN

Header Value: Gateway의 N8N\_SERVER\_MAIN\_TOKEN 값

```



적용 기준:



1\. Webhook 노드에 Header Auth Credential이 적용되어야 한다.

2\. 인증 실패 시 후속 노드가 실행되지 않아야 한다.

3\. Code 노드에서 `$env.N8N\_SERVER\_MAIN\_TOKEN`을 직접 비교하지 않는다.

4\. Code 노드는 payload 파싱, settings/input 정리, 필수값 검증만 수행한다.



\## 6. Callback 인증 표준



callback HTTP Request 노드는 Header Auth Credential을 사용한다.



권장 Credential:



```text

Credential Type: Header Auth

Name: N8Lient Callback Bearer Secret

Header Name: Authorization

Header Value: Bearer {Gateway의 N8N\_CALLBACK\_SECRET 값}

```



적용 기준:



1\. callback URL은 하드코딩하지 않는다.

2\. `payload.callbackUrl`을 사용한다.

3\. Authorization 값을 Code 노드에서 `$env.N8N\_CALLBACK\_SECRET`으로 조립하지 않는다.

4\. Callback HTTP Request 노드에 Header Auth Credential을 연결한다.



\## 7. 표준 입력 구조



Gateway는 n8n Webhook으로 아래 중 하나를 보낸다.



\### JSON 실행



```json

{

&#x20; "submissionId": "sub\_xxx",

&#x20; "clientId": "client\_xxx",

&#x20; "uid": "user\_uid",

&#x20; "workflowKey": "idea-catcher",

&#x20; "automationId": "auto\_xxx",

&#x20; "settings": {},

&#x20; "input": {},

&#x20; "retentionPolicy": {

&#x20;   "level": "processed\_result",

&#x20;   "storeProcessorResult": true,

&#x20;   "storeOriginalFiles": false,

&#x20;   "storageProvider": "none"

&#x20; },

&#x20; "originalFileRefs": \[],

&#x20; "requestedAt": "ISO\_8601",

&#x20; "callbackUrl": "https://gateway-url/api/automation/callback"

}

```



\### multipart 실행



```text

FormData

\- payload: JSON.stringify(canonicalPayload)

\- file\_0: binary file

```



n8n 처리 기준:



1\. JSON 호출이면 body 전체를 payload로 사용한다.

2\. multipart 호출이면 `body.payload` 또는 `json.payload`를 JSON 파싱하여 payload로 사용한다.

3\. binary `file\_0`가 있으면 보존하거나 워크플로우 내부 표준 binary 필드로 안전하게 변환한다.

4\. `payload.settings`, `payload.input`, `payload.retentionPolicy`, `payload.callbackUrl`, `payload.submissionId`를 표준 config로 정리한다.

5\. 필수 settings와 input 누락 여부를 검증한다.



\## 8. settings / input / payload / credentials 분류 원칙



\### settings



사용자 또는 회사별로 달라질 수 있는 실행 설정값이다.



예:



```text

driveId

mdFolderId

originalFileFolderId

reportEmailTo

sheetId

driveFolderId

audioPrefix

mdPrefix

```



\### input



사용자가 실행 시 입력하는 값이다.



```text

input.title

input.text

input.files

multipart binary file\_0

```



\### payload



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



\### credentials



n8n에 고정 등록되어야 하는 보안 자격증명이다.



```text

Google Drive OAuth Credential

Google Drive Service Account Credential

Gmail OAuth Credential

Gemini API Credential

Webhook Header Auth Credential

Callback Bearer Secret Credential

```



\### settings에 넣으면 안 되는 값



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



\## 9. Result Policy Router 표준



processorResult 생성 이후 결과 처리 영역에 `\[20] Result Policy Router`를 둔다.



권장 영역:



```text

\[20] Result Policy Router

\[21] Notify / Email

\[22] Store Processor Result

\[23] Optional Export

\[24] Callback

```



\### notify\_only



```text

summary 중심

processorResult 전체 callback 생략 가능

originalFileRefs 없음 가능

resultRefs 없음

이메일/알림 중심 가능

```



\### processed\_result



```text

processorResult callback 포함

원본 파일 영구 보관 없음

resultRefs는 기본적으로 없음

```



\### full\_archive



```text

processorResult callback 포함

originalFileRefs 유지

resultRefs 포함 가능

Optional Export 가능

```



중요:



```text

원본 파일 영구 저장 여부는 Gateway가 결정한다.

n8n은 Gateway가 전달한 retentionPolicy.level에 따라 callback payload와 optional export만 조정한다.

```



\## 10. Google Drive / Optional Export 원칙



Google Drive는 기본 보관소가 아니라 Optional Export 또는 기존 워크플로우 호환 저장소다.



1\. Google Drive 저장이 기존 업무 로직에 필요하면 Optional Export 영역으로 분리한다.

2\. Drive 저장 실패가 processorResult 생성 성공을 무조건 실패로 만들 필요는 없다.

3\. 다만 해당 자동화에서 Drive 파일 생성 자체가 핵심 결과라면 failed 또는 warning 정책을 보고한다.

4\. Drive 저장용 Credential은 공용 OAuth 또는 Service Account Credential을 사용한다.

5\. 사용자의 Google Token, Refresh Token, Credential ID를 settings에 넣지 않는다.

6\. `settings.driveId`, `settings.mdFolderId`, `settings.originalFileFolderId`는 대상 리소스 값으로 사용할 수 있다.

7\. Shared Drive 사용 시 `driveId`와 `folderId`를 분리한다.

8\. Service Account 사용 시 대상 Shared Drive 또는 폴더에 서비스 계정 이메일 권한이 있어야 한다.



\## 11. processorResult 표준



n8n은 처리 완료 후 가능한 한 아래 구조로 processorResult를 만든다.



```json

{

&#x20; "title": "결과 제목",

&#x20; "summary": "결과 요약",

&#x20; "content": "본문",

&#x20; "mdContent": "# Markdown 결과",

&#x20; "structuredData": {},

&#x20; "keywords": \[],

&#x20; "warnings": \[]

}

```



최소한 `title` 또는 `summary` 중 하나는 반환하는 것을 권장한다.



\## 12. callback 표준



\### success



```json

{

&#x20; "submissionId": "sub\_xxx",

&#x20; "status": "success",

&#x20; "processorResult": {

&#x20;   "title": "결과 제목",

&#x20;   "summary": "결과 요약",

&#x20;   "content": "본문",

&#x20;   "mdContent": "# Markdown 결과",

&#x20;   "structuredData": {},

&#x20;   "keywords": \[],

&#x20;   "warnings": \[]

&#x20; },

&#x20; "resultRefs": \[],

&#x20; "result": {

&#x20;   "summary": "사용자에게 표시할 짧은 요약",

&#x20;   "resultUrl": null

&#x20; }

}

```



\### failed



```json

{

&#x20; "submissionId": "sub\_xxx",

&#x20; "status": "failed",

&#x20; "error": {

&#x20;   "code": "PROCESSOR\_FAILED",

&#x20;   "message": "프로세서 처리 중 오류가 발생했습니다."

&#x20; }

}

```



\### config\_error



```json

{

&#x20; "submissionId": "sub\_xxx",

&#x20; "status": "config\_error",

&#x20; "error": {

&#x20;   "code": "REQUIRED\_SETTING\_MISSING",

&#x20;   "message": "필수 설정값이 누락되었습니다."

&#x20; }

}

```



\## 13. Sticky Note 영역 구분



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



\## 14. import 가능성 점검



수정 후 아래 항목을 점검한다.



1\. JSON 파싱 오류가 없는가.

2\. nodes 배열과 connections 구조가 깨지지 않았는가.

3\. 연결되지 않은 필수 노드가 생기지 않았는가.

4\. 기존 node id를 불필요하게 변경하지 않았는가.

5\. 새로 추가한 노드 id가 중복되지 않는가.

6\. Credential 값 자체를 JSON에 하드코딩하지 않았는가.

7\. Credential 참조는 이름과 타입 기준으로 식별 가능하게 남겼는가.

8\. HTTP Request URL, Header, Body 표현식이 n8n 표현식 문법에 맞는가.

9\. Code 노드 JavaScript 문법 오류가 없는가.

10\. binary 필드명이 다음 노드의 inputDataFieldName과 일치하는가.

11\. Sticky Note는 실행 로직에 영향을 주지 않는가.

12\. n8n import 후 Credential 재연결이 필요한 항목을 별도로 보고했는가.



\## 15. 1차 보고 형식



수정 전 1차 보고에는 아래 항목만 포함하라.



1\. 현재 워크플로우의 N8Lient 표준 반영 상태

2\. 수정이 필요한 노드 목록

3\. 각 노드를 수정해야 하는 이유

4\. 수정하지 말아야 할 노드 목록

5\. 구형 직접 업로드 구조 발견 여부

6\. Header Auth Credential 적용 상태

7\. settings/input/payload/credentials 분류 결과

8\. configSchema 등록 필요 항목

9\. inputSchema 파일 입력 지원 여부

10\. Webhook binary file\_0 처리 여부

11\. retentionPolicy 수신 및 Result Policy Router 필요 여부

12\. processorResult 생성 상태

13\. callback 구조 상태

14\. Sticky Note 갱신 필요 여부

15\. Google Drive / Optional Export 구조

16\. Credential 재연결 필요 항목

17\. 남은 위험 요소

18\. 승인 요청 문장



사용자가 승인하기 전에는 JSON을 수정하지 않는다.



\## 16. 최종 보고 형식



수정 JSON 생성 후 최종 보고에는 아래 항목을 포함하라.



1\. 수정/추가/삭제한 노드

2\. 구형 구조 제거 여부

3\. Header Auth Credential 적용 위치

4\. settings/input/payload/credentials 추출 결과

5\. configSchema 등록 필요 항목

6\. inputSchema 파일 입력 지원 여부

7\. Webhook binary file\_0 처리 여부

8\. retentionPolicy 처리 및 Result Policy Router 반영 여부

9\. processorResult 생성 방식

10\. callback 구조

11\. Sticky Note 영역 구분 반영 여부

12\. Google Drive / Optional Export 처리

13\. import 가능성 점검 결과

14\. Credential 재연결 필요 항목

15\. 남은 위험 요소

16\. 수정 JSON 다운로드 링크 또는 파일명



