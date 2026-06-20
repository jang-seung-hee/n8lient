# 엔팔라이언트 Gateway → n8n Payload / Meta 계약 v1.0

- 문서명: 엔팔라이언트 Gateway → n8n Payload / Meta 계약
- 파일명: `10_엔팔라이언트_Gateway_n8n_Payload_Meta_계약_v1.0.md`
- 버전: v1.0
- 작성일: 2026-06-20
- 문서 상태: 현행 보고 기준 신규 계약 문서
- 상위 문서:
  - `01_엔팔라이언트_솔루션_헌법_v2.0`
  - `02_엔팔라이언트_아키텍처_명세서_v2.0`
  - `05_엔팔라이언트_Gateway_n8n_실행_계약_v2.1`
  - `09_엔팔라이언트_워크플로우_버전관리_운영_계약_v1.0`
- 적용 범위:
  - `n8lient-gateway`
  - Next.js local route
  - n8n workflow
  - Gateway callback
  - `processorResult`
  - MD 결과 파일
  - 이메일 리포트 표시용 메타데이터

---

## 0. 문서 작성 기준

본 문서는 개발 AI의 현황 조사 보고를 기준으로 정리한 Gateway → n8n Payload/Meta 계약 문서다.

현행 보고 기준:

```text
운영 Gateway: Cloud Run n8lient-gateway
실제 운영 파일: n8lient-gateway/src/server.ts
로컬/개발 route: src/app/api/automation/prepare-upload/route.ts, src/app/api/automation/execute/route.ts
n8n 호출 방식: Gateway가 axios를 통해 JSON 또는 multipart 형태로 n8n Webhook 호출
아이디어 캐처 운영 workflowKey: idea-catcher
아이디어 캐처 운영 webhookPath: n8lient-idea-catcher
아이디어 캐처 운영 workflowVersion: v1.02
```

주의:

```text
이 문서는 현재 보고된 코드/노드 상태를 기준으로 작성되었다.
실제 배포 전에는 Cloud Run Gateway와 n8n Active 워크플로우 기준으로 최종 스모크 테스트를 수행해야 한다.
```

---

## 1. 목적

본 문서는 N8Lient에서 Gateway가 n8n에 전달하는 실행 payload의 필드명, 타입, 의미, 생성 주체, 사용 주체, fallback 규칙, 보안 주의사항을 고정하기 위한 계약 문서다.

이 문서의 목적은 다음과 같다.

```text
1. n8n 커스터마이징 시 AI가 payload 필드명을 추측하지 않게 한다.
2. clientId를 회사명처럼 표시하는 문제를 방지한다.
3. uid를 작성자 이메일처럼 표시하는 문제를 방지한다.
4. reportEmailTo와 userEmail을 혼동하지 않게 한다.
5. Gateway가 계산한 settings와 retentionPolicy를 n8n이 재계산하지 않게 한다.
6. MD 파일, 이메일 리포트, processorResult, callback payload의 메타데이터 기준을 통일한다.
7. Secret, Token, Credential 값이 payload/log/mdContent/emailBody에 노출되지 않게 한다.
```

---

## 2. 최상위 원칙

Gateway는 n8n 실행 전 다음을 완료한다.

```text
인증 검증
사용자 승인 상태 확인
clientId/uid 확인
workflow 사용권 확인
회사 설정 조회
개인 설정 조회
settings 병합
retentionPolicy 계산
submission 생성
파일 처리
canonicalPayload 생성
n8n Webhook 서버 간 호출
```

n8n은 Gateway가 전달한 payload만 사용한다.

n8n은 다음을 하지 않는다.

```text
- Firestore 직접 조회
- 회사명 직접 조회
- 사용자 이메일 직접 조회
- 회사/개인 설정 직접 병합
- 사용자 권한 판단
- retentionPolicy 최종 계산
- Firebase Storage 직접 공개 URL 생성
- Gateway callback 우회 저장
```

---

## 3. 실제 실행 경로 계약

### 3.1 운영 실행 경로

운영 환경의 실제 실행 경로는 Cloud Run Gateway다.

```text
n8lient-app
→ n8lient-gateway
→ n8n Webhook
→ n8lient-gateway callback
→ Firestore submissions 저장
```

운영 기준 파일:

```text
n8lient-gateway/src/server.ts
```

운영 반영 여부는 위 파일의 배포 여부를 기준으로 판단한다.

### 3.2 로컬/개발 실행 경로

로컬 개발 및 테스트 호환을 위해 아래 Next.js route도 Gateway와 동기화할 수 있다.

```text
src/app/api/automation/prepare-upload/route.ts
src/app/api/automation/execute/route.ts
```

단, 위 파일만 수정했다고 운영 반영으로 판단하지 않는다.

운영 반영 기준은 항상 다음 파일이다.

```text
n8lient-gateway/src/server.ts
```

---

## 4. canonicalPayload 전체 구조

Gateway가 n8n에 전달하는 canonicalPayload는 아래 구조를 기준으로 한다.

```ts
type N8LientCanonicalPayload = {
  submissionId: string;
  clientId: string;
  uid: string;
  workflowKey: string;
  workflowVersion?: string;
  automationId: string;
  requestedAt?: string;
  callbackUrl: string;

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
top-level 필드는 n8n 호환성을 위해 우선 유지한다.
meta 객체는 보조 경로다.
n8n은 top-level 값을 먼저 보고, 없으면 meta 값을 본다.
meta가 없어도 실행 실패 처리하지 않는다.
선택 메타데이터가 없거나 null이어도 실행 실패 처리하지 않는다.
```

---

## 5. top-level 필드 계약

### 5.1 submissionId

```text
타입: string
필수 여부: 필수
생성 주체: Gateway
사용 주체: n8n, Gateway callback, Firestore submissions
설명: 자동화 실행 1건의 고유 ID
빈값 허용: 불가
```

### 5.2 clientId

```text
타입: string
필수 여부: 필수
생성 주체: Gateway
값 출처: 사용자 문서 또는 계약/권한 검증 결과
사용 주체: Gateway, n8n 추적용
설명: 고객사 내부 식별 ID
빈값 허용: 불가
주의: 회사명으로 표시하지 않는다.
fallback 금지: companyName이 없을 때 clientId를 회사명처럼 표시하지 않는다.
```

### 5.3 uid

```text
타입: string
필수 여부: 필수
생성 주체: Gateway
값 출처: Firebase Auth 또는 사용자 검증 결과
사용 주체: Gateway, n8n 추적용
설명: 사용자 내부 식별 ID
빈값 허용: 불가
주의: 작성자 이메일로 표시하지 않는다.
fallback 금지: userEmail이 없을 때 uid를 작성자 ID처럼 표시하지 않는다.
```

### 5.4 workflowKey

```text
타입: string
필수 여부: 필수
생성 주체: Gateway
사용 주체: Gateway 라우팅, n8n 추적, callback 저장
설명: 자동화 제품군 식별자
예: idea-catcher
```

### 5.5 workflowVersion

```text
타입: string
필수 여부: 권장
생성 주체: Gateway
사용 주체: Gateway 라우팅, n8n 추적, callback 저장, 운영 버전관리
설명: 고객사에 배포된 워크플로우 버전
예: v1.02, 0.9.0.1, 1.0.0
주의: workflowVersion 값은 운영 DB/clientAutomation 기준과 n8n Active 워크플로우 기준이 일치해야 한다.
```

### 5.6 automationId

```text
타입: string
필수 여부: 필수
생성 주체: Gateway
사용 주체: Gateway, n8n, submissions
설명: 고객사 또는 사용자에게 노출되는 자동화 실행 대상 ID
```

### 5.7 callbackUrl

```text
타입: string
필수 여부: 필수
생성 주체: Gateway
사용 주체: n8n callback 노드
설명: n8n이 성공/실패 결과를 반환할 Gateway callback URL
보안: callback 호출 시 Authorization Bearer secret을 Header로 사용한다. secret 값은 payload에 넣지 않는다.
```

### 5.8 requestedAt

```text
타입: string
필수 여부: 선택
생성 주체: Gateway
사용 주체: n8n 메타데이터, MD 출처, 로그
설명: 실행 요청 시각 ISO string
fallback: 없으면 n8n 실행 시각 또는 receivedAt/generatedAt 사용 가능
```

### 5.9 companyName

```text
타입: string | null
필수 여부: 선택
생성 주체: Gateway
값 출처: Firestore clients 컬렉션의 실제 회사명
사용 주체: n8n MD 출처, 이메일 INFO, processorResult.structuredData.source
설명: 고객사 실제 표시명
빈값 허용: 허용
정규화: 빈 문자열은 null
fallback 허용: "회사명 미전달"
fallback 금지: clientId로 대체하지 않는다.
```

### 5.10 clientName

```text
타입: string | null
필수 여부: 선택 alias
생성 주체: Gateway
권장값: companyName과 동일
사용 주체: 레거시/호환 n8n 노드
설명: companyName의 alias
fallback 금지: clientId로 대체하지 않는다.
```

### 5.11 userEmail

```text
타입: string | null
필수 여부: 선택
생성 주체: Gateway
값 출처: users 컬렉션, Auth Token, 사용자 문서의 email
사용 주체: n8n MD 출처, 이메일 INFO, processorResult.structuredData.source
설명: 실행 작성자의 구글메일 또는 사용자 이메일
빈값 허용: 허용
정규화: 빈 문자열은 null
fallback 허용: "작성자 ID 미전달"
fallback 금지:
- uid로 대체하지 않는다.
- reportEmailTo로 대체하지 않는다.
주의: reportEmailTo는 결과 수신 이메일이며, userEmail은 작성자 표시용 이메일이다.
```

### 5.12 googleEmail

```text
타입: string | null
필수 여부: 선택 alias
생성 주체: Gateway
권장값: userEmail과 동일
사용 주체: 레거시/호환 n8n 노드
설명: userEmail의 alias
fallback 금지: uid 또는 reportEmailTo로 대체하지 않는다.
```

### 5.13 authorId

```text
타입: string | null
필수 여부: 선택 alias
생성 주체: Gateway
권장값: userEmail과 동일
사용 주체: MD 출처의 작성자 ID 표시
설명: 작성자 표시용 ID
주의: uid가 아니다.
fallback 금지: uid로 대체하지 않는다.
```

---

## 6. input 객체 계약

input은 사용자가 실행 화면에서 입력한 값이다.

```ts
type N8LientInput = {
  title?: string | null;
  submissionTitle?: string;
  titleProvided?: boolean;
  titleSource?: "user" | "empty" | "system" | string;

  text?: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  inputType?: "text" | "file" | "image" | "audio" | string;
  files?: unknown[];
};
```

### 6.1 title

```text
타입: string | null
필수 여부: titleRequired=true일 때만 필수
설명: 사용자가 직접 입력한 제목
주의: 시스템 임시 제목을 input.title에 저장하지 않는다.
```

### 6.2 submissionTitle

```text
타입: string
필수 여부: 권장
설명: 시스템이 생성한 임시 표시 제목
주의: processorResult.title이 있으면 UI 표시는 processorResult.title을 우선한다.
```

### 6.3 titleProvided

```text
타입: boolean
필수 여부: 권장
설명: 사용자가 제목을 직접 제공했는지 여부
```

### 6.4 titleSource

```text
타입: string
필수 여부: 권장
예: user, empty, system
설명: 제목 출처
```

### 6.5 text

```text
타입: string
필수 여부: 워크플로우 inputSchema 기준
설명: 텍스트 입력값
빈값 허용: inputSchema에 따라 다름
```

### 6.6 fileName

```text
타입: string
필수 여부: 파일 입력일 때 권장
설명: 원본 파일 표시명
사용 위치: MD 출처의 원본 파일명, 이메일 첨부명, processorResult metadata
```

### 6.7 mimeType

```text
타입: string
필수 여부: 파일 입력일 때 권장
설명: 원본 파일 MIME type
```

### 6.8 sizeBytes

```text
타입: number
필수 여부: 파일 입력일 때 권장
설명: 원본 파일 크기
```

### 6.9 inputType

```text
타입: string
필수 여부: 권장
예: text, file, image, audio
설명: 사용자의 입력 방식
```

---

## 7. settings 객체 계약

settings는 Gateway가 회사 설정과 개인 설정을 병합한 최종 설정이다.

n8n은 settings를 다시 병합하지 않는다.

현행 보고 기준 settings 예:

```ts
type N8LientSettings = {
  mdFolderId?: string;
  originalFileFolderId?: string;
  reportEmailTo?: string;
  geminiModel?: string;
  audioPrefix?: string;
  mdPrefix?: string;

  workflowName?: string;
  workflowVersion?: string;

  emailEnabled?: boolean;
  emailAttachResult?: boolean;
  emailAttachOriginal?: boolean;

  optionalExportProvider?: "none" | "google_drive" | string;
  googleDriveMdFolderName?: string;
  googleDriveMdFolderId?: string;
  googleDriveAttachmentFolderName?: string;
  googleDriveAttachmentFolderId?: string;
};
```

### 7.1 reportEmailTo

```text
타입: string
필수 여부: 이메일 발송 활성 시 필요
생성 주체: Gateway settings 병합 결과
사용 주체: n8n Gmail 노드
설명: 결과 리포트를 받을 수신 이메일
주의: 작성자 ID가 아니다.
fallback 금지: userEmail이 없을 때 reportEmailTo를 작성자 ID로 사용하지 않는다.
```

### 7.2 geminiModel

```text
타입: string
필수 여부: 권장
사용 주체: n8n Gemini 호출 노드
설명: 사용할 Gemini 모델명
예: gemini-2.5-flash
```

### 7.3 mdPrefix

```text
타입: string
필수 여부: 선택
사용 주체: n8n MD 파일명 생성
설명: 결과 MD 파일명 prefix
```

### 7.4 audioPrefix

```text
타입: string
필수 여부: 선택
사용 주체: n8n 원본 음성 파일명 또는 저장명 생성
설명: 원본 음성 파일명 prefix
```

### 7.5 mdFolderId / originalFileFolderId

```text
타입: string
필수 여부: 워크플로우/보관 정책 기준
사용 주체: n8n Drive 저장 노드
설명: Google Drive 저장 폴더 ID
주의: Google Drive는 N8Lient 기본 저장소가 아니라 Optional Export 또는 레거시 Drive 저장 경로일 수 있다.
```

### 7.6 emailEnabled

```text
타입: boolean
필수 여부: 권장
사용 주체: n8n 이메일 분기
설명: 이메일 발송 여부
```

### 7.7 emailAttachResult

```text
타입: boolean
필수 여부: 권장
사용 주체: n8n 이메일 첨부 분기
설명: 결과 MD 파일을 이메일에 첨부할지 여부
주의: resultRefs 저장 여부와 다르다.
```

### 7.8 emailAttachOriginal

```text
타입: boolean
필수 여부: 권장
사용 주체: n8n 이메일 첨부 분기
설명: 입력 원본 파일을 이메일에 첨부할지 여부
주의: originalFileRefs 저장 여부와 다르다.
```

### 7.9 optionalExportProvider

```text
타입: "none" | "google_drive" | string
필수 여부: 권장
사용 주체: n8n Optional Export 분기
설명: 외부 내보내기 provider
주의: retentionPolicy.level을 대체하지 않는다.
```

---

## 8. retentionPolicy 객체 계약

retentionPolicy는 Gateway가 최종 계산해서 n8n에 전달하는 보관 정책이다.

n8n은 retentionPolicy를 재계산하지 않는다.

현행 보고 기준:

```ts
type N8LientRetentionPolicy = {
  level: "notify_only" | "processed_result" | "full_archive";

  emailEnabled: boolean;
  emailAttachResult: boolean;
  emailAttachOriginal: boolean;

  storeProcessorResult: boolean;
  storeOriginalFiles?: boolean;
  storeOriginalFileRefs?: boolean;
  storeResultFiles?: boolean;
  storeResultRefs?: boolean;

  storageProvider?: "none" | "firestore" | "firebase_storage" | string;
  optionalExportProvider?: "none" | "google_drive" | string;
};
```

### 8.1 level

```text
타입: notify_only | processed_result | full_archive
필수 여부: 필수
생성 주체: Gateway
사용 주체: n8n 결과 후처리 분기
설명: 결과 보관 레벨
```

### 8.2 emailEnabled

```text
타입: boolean
설명: 이메일 발송 여부
주의: 보관 레벨과 별개로 이메일 전송 여부를 결정한다.
```

### 8.3 emailAttachResult

```text
타입: boolean
설명: 결과 파일을 이메일에 첨부할지 여부
주의: resultRefs 저장 여부와 다르다.
```

### 8.4 emailAttachOriginal

```text
타입: boolean
설명: 원본 파일을 이메일에 첨부할지 여부
주의: originalFileRefs 저장 여부와 다르다.
```

### 8.5 storeProcessorResult

```text
타입: boolean
설명: processorResult를 DB에 저장할지 여부
권장:
- notify_only: false
- processed_result: true
- full_archive: true
```

### 8.6 storeOriginalFiles / storeOriginalFileRefs

```text
타입: boolean
설명: 원본 파일 참조 또는 원본 파일 보관 여부
권장:
- notify_only: false
- processed_result: false
- full_archive: true
주의: storeOriginalFiles는 레거시 alias일 수 있으므로 storeOriginalFileRefs와 병행 수용한다.
```

### 8.7 storeResultFiles / storeResultRefs

```text
타입: boolean
설명: 결과 파일 참조 또는 결과 파일 보관 여부
권장:
- notify_only: false
- processed_result: false 또는 동적 생성
- full_archive: true
주의: storeResultFiles는 레거시 alias일 수 있으므로 storeResultRefs와 병행 수용한다.
```

### 8.8 storageProvider

```text
타입: string
설명: 결과 저장 provider
예: none, firestore, firebase_storage
주의: Google Drive Optional Export와 혼동하지 않는다.
```

### 8.9 optionalExportProvider

```text
타입: none | google_drive | string
설명: 외부 내보내기 provider
주의: retentionPolicy.level을 대체하지 않는다.
```

---

## 9. meta 객체 계약

meta는 표시용/추적용 보조 메타데이터를 담는다.

```ts
type N8LientPayloadMeta = {
  companyName: string | null;
  userEmail: string | null;
  generatedBy?: "n8lient-gateway" | string;
};
```

원칙:

```text
- top-level 호환성을 우선한다.
- meta는 보조 경로다.
- n8n은 top-level 값을 먼저 보고, 없으면 meta 값을 본다.
- meta가 없어도 실행 실패 처리하지 않는다.
- meta.companyName이 없어도 clientId를 회사명으로 표시하지 않는다.
- meta.userEmail이 없어도 uid를 작성자 ID로 표시하지 않는다.
```

---

## 10. files / refs 계약

### 10.1 originalFileRefs

```text
타입: array
필수 여부: full_archive에서 권장
생성 주체: Gateway 또는 n8n 후처리 구조
사용 주체: Gateway callback, Firestore, UI 다운로드, 이메일 첨부 분기
설명: 원본 파일 참조 목록
주의: notify_only에서는 DB/Storage 보관 대상이 아닐 수 있다.
```

### 10.2 resultRefs

```text
타입: array
필수 여부: full_archive에서 권장
생성 주체: n8n 또는 Gateway 후처리 구조
사용 주체: Gateway callback, Firestore, UI 다운로드
설명: 결과 파일 참조 목록
```

### 10.3 이메일 첨부와 파일 보관의 차이

```text
emailAttachOriginal = 입력 원본 파일을 이메일에 임시 첨부할지 여부
storeOriginalFileRefs = 원본 파일 참조를 DB/Storage에 보관할지 여부

emailAttachResult = 결과 파일을 이메일에 임시 첨부할지 여부
storeResultRefs = 결과 파일 참조를 DB/Storage에 보관할지 여부
```

이메일 첨부는 전송 목적이고, 파일 보관은 N8Lient 결과 저장 목적이다.

---

## 11. 빈값 정규화 규칙

Gateway는 선택 문자열을 반드시 null-safe로 정규화한다.

```ts
const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
```

n8n은 선택 문자열을 반드시 null-safe로 추출한다.

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
null에 .trim() 호출
undefined에 .split() 호출
선택 메타데이터 누락을 실행 실패로 처리
companyName/userEmail을 필수 validation으로 승격
```

---

## 12. fallback 금지 규칙

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
generatedAt 없음 → new Date().toISOString()
```

---

## 13. 회사명 / 작성자 ID 표시 표준

### 13.1 회사명

표시 우선순위:

```text
payload.companyName
→ payload.clientName
→ payload.meta.companyName
→ settings.companyName
→ "회사명 미전달"
```

금지:

```text
clientId로 대체 표시 금지
```

### 13.2 작성자 ID

작성자 ID는 구글메일 또는 사용자 이메일을 의미한다.

표시 우선순위:

```text
payload.userEmail
→ payload.googleEmail
→ payload.authorId
→ payload.meta.userEmail
→ settings.userEmail
→ settings.googleEmail
→ "작성자 ID 미전달"
```

금지:

```text
uid로 대체 표시 금지
reportEmailTo로 대체 표시 금지
```

### 13.3 reportEmailTo와 userEmail의 차이

```text
userEmail = 실행 작성자 표시용 이메일
reportEmailTo = 결과 리포트 수신 이메일
```

두 값은 같을 수도 있지만, 의미상 별도 필드다.

---

## 14. 아이디어 캐처 n8n 사용 현황

현행 보고 기준 운영 워크플로우:

```text
파일명: N8Lient 아이디어 캐처 v1.02 - 직접 업로드 토큰 검증 반영.json
workflowKey: idea-catcher
webhookPath: n8lient-idea-catcher
workflowVersion: v1.02
```

### 14.1 00 환경설정

```text
역할:
- payload 전체 수신
- companyName, userEmail 추출
- config 객체에 저장
- 기존 환경설정 값 유지

사용 필드:
- payload.companyName
- payload.clientName
- payload.userEmail
- payload.googleEmail
- payload.authorId
- payload.meta.companyName
- payload.meta.userEmail
- payload.settings
```

주의:

```text
companyName이 없을 때 clientId로 대체하지 않는다.
userEmail이 없을 때 uid로 대체하지 않는다.
```

### 14.2 01 입력 정리

```text
역할:
- _config의 companyName, userEmail을 prep/meta 객체로 전달
- 기존 inputType, fileName, title 처리 유지

주의:
- companyName/userEmail이 null이어도 에러를 내지 않는다.
- null에 문자열 메서드를 직접 호출하지 않는다.
```

### 14.3 03 Gemini 요청 구성

```text
역할:
- Gemini 요청 프롬프트 구성
- 기존 processor input 구성
주의:
- 회사명/작성자 ID 표시 메타데이터는 Gemini 생성 대상이 아니라 MD 출처 조립 대상이다.
```

### 14.4 05 Gemini 응답 파싱

```text
역할:
- Gemini 응답 JSON 파싱
- noteTitle, content, keywords 생성
- md 문자열 생성
- processorResult.mdContent에 동일 md 반영

추가 표준:
- ## 출처 섹션에 companyName/userEmail 포함
```

### 14.5 06 MD 파일 생성

```text
역할:
- 05에서 생성한 md 또는 processorResult.mdContent를 binary MD 파일로 변환
주의:
- 별도 MD 문자열을 재생성하지 않는 것이 원칙이다.
```

### 14.6 08 최종 보고 데이터 생성

```text
역할:
- callbackPayload 생성
- parsed.md 또는 processorResult.mdContent를 callbackPayload.processorResult.mdContent에 매핑
- Gmail 템플릿 데이터 매핑

주의:
- 이메일 리포트 디자인과 MD 출처 포맷은 별도다.
```

### 14.7 09 Gmail 보고

```text
역할:
- 이메일 발송
- reportEmailTo 기준 발송
주의:
- reportEmailTo를 작성자 ID로 사용하지 않는다.
```

### 14.8 10 N8Lient Callback 성공

```text
역할:
- callbackUrl로 성공 callbackPayload POST
- Gateway가 Firestore submissions/{submissionId}에 결과 저장
```

---

## 15. MD / DB / Callback 흐름

아이디어 캐처 기준 흐름:

```text
05 Gemini 응답 파싱
→ md 문자열 생성
→ processorResult.mdContent 생성
→ 06 MD 파일 생성
→ 08 최종 보고 데이터 생성
→ callbackPayload.processorResult.mdContent 매핑
→ 10 N8Lient Callback 성공
→ Gateway callback 수신
→ Firestore submissions/{submissionId}.processorResult.mdContent 저장
```

원칙:

```text
MD 파일 내용과 processorResult.mdContent는 동일해야 한다.
DB 저장용 mdContent를 별도 포맷으로 재생성하지 않는다.
Optional Export MD도 동일 mdContent를 사용하는 경우 동일 출처 보강 내용이 포함되는 것은 정상 영향이다.
이메일 리포트 본문은 별도 HTML을 사용할 수 있으며, MD 출처 변경만으로 이메일 디자인을 변경하지 않는다.
```

---

## 16. MD 출처 표준

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

값 생성 기준:

```text
회사명: companyName 우선
작성자 ID: userEmail 우선
워크플로우: workflowName 또는 settings.workflowName 우선
입력방식: inputType 또는 내부 inputMethod
AI 모델: settings.geminiModel
원본 파일명: input.fileName 또는 originalFileName
생성일시: requestedAt, receivedAt, generatedAt 중 현재 구조에서 사용하는 값
```

금지:

```text
회사명 없음 → clientId 표시
작성자 ID 없음 → uid 표시
작성자 ID 없음 → reportEmailTo 표시
```

---

## 17. 이메일 INFO 표준

이메일 리포트에 INFO 섹션을 사용하는 경우 아래 기준을 따른다.

```text
회사명: companyName || "회사명 미전달"
작성자 ID: userEmail || "작성자 ID 미전달"
워크플로우: workflowName
처리 시각: generatedAt
```

주의:

```text
이메일 리포트 디자인은 워크플로우별 이메일 템플릿 정책을 따른다.
MD 출처 포맷 보강은 이메일 리포트 디자인 변경이 아니다.
```

---

## 18. processorResult 계약

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
processorResult.mdContent는 MD 파일 본문과 동일해야 한다.
processorResult.structuredData.source에는 표시용 출처 메타데이터를 넣을 수 있다.
Secret, Token, Credential 값은 processorResult에 넣지 않는다.
```

---

## 19. callback payload 계약

### 19.1 성공 callback

성공 callback은 아래 필드를 포함할 수 있다.

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

### 19.2 실패 callback

실패 callback은 아래 필드를 포함할 수 있다.

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

원칙:

```text
n8n은 callbackUrl로 결과를 반환한다.
Gateway callback이 Firestore submissions를 업데이트한다.
n8n은 Firestore에 직접 저장하지 않는다.
```

---

## 20. Firestore 저장 기준

Gateway callback은 callbackPayload를 수신해 submissions/{submissionId} 문서를 업데이트한다.

저장 대상은 보관 레벨에 따라 달라진다.

```text
notify_only:
- 최소 submission 로그
- emailSent
- status/error 정보
- processorResult 본문 저장 안 함

processed_result:
- submission 로그
- processorResult
- processorResult.mdContent

full_archive:
- processed_result 전체
- originalFileRefs
- resultRefs
```

주의:

```text
processorResult.mdContent가 저장되려면 retentionPolicy.storeProcessorResult가 true여야 한다.
```

---

## 21. Optional Export 계약

Google Drive Optional Export는 기본 저장소가 아니다.

```text
기본 DB = Firestore
기본 파일 저장소 = Firebase Storage
Google Drive = Optional Export 또는 레거시 외부 저장 경로
```

주의:

```text
optionalExportProvider는 retentionPolicy.level을 대체하지 않는다.
Optional Export 노드/폴더/정책은 payload 메타데이터 보강만으로 변경하지 않는다.
동일 mdContent를 사용하는 Optional Export MD 파일에 ## 출처 보강 내용이 포함되는 것은 정상 영향이다.
```

금지:

```text
- Optional Export Provider 임의 변경
- Google Drive 폴더 ID/폴더명 로직 임의 변경
- Drive 업로드 Credential 변경
- Optional Export 활성/비활성 정책 임의 변경
```

---

## 22. 보안 금지값

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

로그 출력 금지:

```text
companyName은 필요 시 제한적으로 가능하지만, userEmail은 불필요하게 console.log로 출력하지 않는다.
Authorization, Token, Secret, Credential 값은 어떤 경우에도 로그에 출력하지 않는다.
```

---

## 23. 샘플 payload

아래 샘플은 민감정보를 제거한 예시다.

### 23.1 notify_only + email enabled

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
    "level": "notify_only",
    "emailEnabled": true,
    "emailAttachResult": true,
    "emailAttachOriginal": false,
    "storeProcessorResult": false,
    "storeOriginalFiles": false,
    "storageProvider": "none",
    "optionalExportProvider": "none"
  },
  "meta": {
    "companyName": "Example Company",
    "userEmail": "user@example.com"
  }
}
```

n8n이 읽어야 하는 필드:

```text
submissionId
workflowKey
workflowVersion
callbackUrl
input
settings
retentionPolicy
companyName/userEmail
```

n8n이 읽으면 안 되는 값:

```text
Authorization Header
X-N8N-TOKEN
N8N_CALLBACK_SECRET
Credential 값
```

### 23.2 processed_result + email attach result

```json
{
  "submissionId": "sub_example_002",
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
    "title": "아이디어 메모",
    "titleProvided": true,
    "titleSource": "user",
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
    "storeOriginalFiles": false,
    "storageProvider": "firestore",
    "optionalExportProvider": "none"
  },
  "meta": {
    "companyName": "Example Company",
    "userEmail": "user@example.com"
  }
}
```

### 23.3 full_archive + original file refs

```json
{
  "submissionId": "sub_example_003",
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
    "emailAttachOriginal": true,
    "optionalExportProvider": "google_drive",
    "googleDriveMdFolderName": "MD 결과",
    "googleDriveMdFolderId": "drive_folder_md_example",
    "googleDriveAttachmentFolderName": "원본 첨부",
    "googleDriveAttachmentFolderId": "drive_folder_attachment_example"
  },
  "retentionPolicy": {
    "level": "full_archive",
    "emailEnabled": true,
    "emailAttachResult": true,
    "emailAttachOriginal": true,
    "storeProcessorResult": true,
    "storeOriginalFiles": true,
    "storeOriginalFileRefs": true,
    "storeResultFiles": true,
    "storeResultRefs": true,
    "storageProvider": "firebase_storage",
    "optionalExportProvider": "google_drive"
  },
  "originalFileRefs": [
    {
      "storagePath": "submissions/sub_example_003/original/idea_audio_20260619_145524.webm",
      "fileName": "idea_audio_20260619_145524.webm",
      "mimeType": "audio/webm",
      "sizeBytes": 123456
    }
  ],
  "meta": {
    "companyName": "Example Company",
    "userEmail": "user@example.com"
  }
}
```

---

## 24. deprecated / alias / 금지 필드

### 24.1 alias로 허용

```text
clientName = companyName alias
googleEmail = userEmail alias
authorId = userEmail alias
storeOriginalFiles = storeOriginalFileRefs alias
storeResultFiles = storeResultRefs alias
```

### 24.2 표시용으로 사용 금지

```text
clientId → 회사명으로 표시 금지
uid → 작성자 ID로 표시 금지
reportEmailTo → 작성자 ID로 표시 금지
```

### 24.3 payload 포함 금지

```text
Credential ID
Access Token
Refresh Token
Authorization Header
Callback Secret
Webhook Secret
Firebase ID Token
Service Account Key
```

---

## 25. n8n 커스터마이징 체크리스트

n8n 워크플로우를 수정하기 전 반드시 확인한다.

```text
1. Gateway payload에 필요한 표시용 메타데이터가 있는가?
2. companyName/userEmail이 선택 필드로 처리되는가?
3. companyName이 없을 때 clientId를 표시하지 않는가?
4. userEmail이 없을 때 uid를 표시하지 않는가?
5. reportEmailTo와 userEmail을 혼동하지 않는가?
6. n8n이 Firestore를 직접 조회하지 않는가?
7. settings를 n8n에서 다시 병합하지 않는가?
8. retentionPolicy를 n8n에서 다시 계산하지 않는가?
9. processorResult.mdContent와 MD 파일 내용이 같은가?
10. Optional Export가 같은 mdContent를 사용하는 경우 정상 영향으로 판단했는가?
11. callbackPayload 구조를 깨지 않았는가?
12. Secret/Token/Credential이 payload/log/mdContent/emailBody에 노출되지 않는가?
13. null/undefined 값에 문자열 메서드를 직접 호출하지 않는가?
14. 변경 대상 노드 외의 노드를 불필요하게 수정하지 않았는가?
```

---

## 26. 디버깅 시 확인 순서

실행 오류 또는 결과 누락이 발생하면 아래 순서로 확인한다.

```text
1. Gateway 로그에서 canonicalPayload 생성 여부 확인
2. payload top-level에 submissionId/clientId/uid/workflowKey/automationId/callbackUrl 확인
3. payload에 companyName/userEmail 포함 여부 확인
4. settings 병합 결과 확인
5. retentionPolicy 최종 계산 결과 확인
6. n8n Webhook 수신 여부 확인
7. n8n 입력 정리 노드에서 payload 필드 유지 여부 확인
8. processorResult.mdContent 생성 여부 확인
9. callbackPayload.processorResult.mdContent 포함 여부 확인
10. Gateway callback 수신 여부 확인
11. Firestore submissions/{submissionId} 저장 여부 확인
12. 이메일/Optional Export는 후순위로 확인
```

---

## 27. 향후 문서 반영 규칙

앞으로 n8n 워크플로우 커스터마이징, 이메일 리포트 수정, MD 포맷 수정, callback 구조 수정, 디버깅 작업을 할 때는 본 문서를 함께 참고한다.

모드별 프롬프트에 아래 문구를 추가한다.

```text
n8n 워크플로우를 수정할 때는 반드시 `10_엔팔라이언트_Gateway_n8n_Payload_Meta_계약_v1.0.md`를 함께 참고하고, Gateway payload 필드명과 fallback 금지 규칙을 따른다.
```

---

## 28. 변경 유형 판단

본 문서에서 정의한 companyName/userEmail 추가는 기존 payload에 선택 메타데이터를 추가하는 성격이다.

```text
변경 유형: PATCH 또는 MINOR 경계
권장 판단: 기존 실행 구조를 깨지 않고 선택 필드를 추가하는 경우 PATCH
주의: 기존 필수 schema를 변경하거나 validation 필수값으로 승격하면 MINOR/MAJOR 검토
```

운영 원칙:

```text
기존 고객 자동 적용 금지
운영자 테스트 후 clientAutomation 기준 전환
문제 발생 시 이전 stable 워크플로우로 롤백 가능해야 함
```

---

## 29. 부록: 안전 추출 함수

### 29.1 Gateway 선택 문자열 정규화

```ts
const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
```

### 29.2 n8n 선택 문자열 추출

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

### 29.3 표시용 source 메타 구성 예시

```js
const sourceCompanyName = pickOptionalString(
  payload.companyName,
  payload.clientName,
  payload.meta?.companyName,
  config.companyName
) || "회사명 미전달";

const sourceUserEmail = pickOptionalString(
  payload.userEmail,
  payload.googleEmail,
  payload.authorId,
  payload.meta?.userEmail,
  config.userEmail,
  config.googleEmail
) || "작성자 ID 미전달";
```

금지:

```js
const sourceCompanyName = payload.companyName || payload.clientId;
const sourceUserEmail = payload.userEmail || payload.uid || settings.reportEmailTo;
```
