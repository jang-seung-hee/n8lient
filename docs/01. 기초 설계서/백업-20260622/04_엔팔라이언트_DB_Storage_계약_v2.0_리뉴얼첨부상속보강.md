# 엔팔라이언트 DB/Storage 계약 v2.0

- 문서명: 엔팔라이언트 DB/Storage 계약
- 버전: v2.0 리뉴얼
- 작성일: 2026-06-16
- 문서 상태: 현행 저장 구조 기준 문서
- 상위 문서: 솔루션 헌법 v2.0, 아키텍처 명세서 v2.0, 결과/보관 레벨 계약 v2.0

---

## 1. 기본 원칙

엔팔라이언트의 기본 데이터 저장소는 Firestore와 Firebase Storage다.

```text
Firestore = 상태, 권한, 설정, 실행 이력, 결과 메타데이터, processorResult
Firebase Storage = 원본 파일, 결과 파일, 다운로드 대상 파일
```

Google Drive는 기본 저장소가 아니다. Google Drive는 Optional Export다.

금지:

```text
Firestore에 파일 원본 저장
Firestore에 base64 저장
Firestore에 binary/blob 저장
Firestore에 Google Access Token 저장
Firestore에 Google Refresh Token 저장
사용자 설정에 Credential ID 저장
Firebase Storage 공개 URL 직접 노출
```

---

## 2. 주요 컬렉션

```text
users
clients
companyCodeLookups
companyJoinRequests
workflowTemplates
clientContracts
clientAutomations
userAutomationSettings
submissions
knowledgeSearchIndex
embeddingIndex
```

`knowledgeSearchIndex`, `embeddingIndex`는 즉시 필수 컬렉션이 아니라 Level 2 이상 결과의 후가공 인덱스 확장용이다.

---

## 3. submissions 책임

submission은 자동화 실행 1건의 기준 기록이다.

최소 필드:

```text
submissionId
clientId
uid
workflowKey
automationId
status
input
submissionTitle
displayTitle
createdAt
completedAt
errorCode
errorMessage
retentionPolicySnapshot
```

Level 2 이상에서 추가:

```text
processorResult
```

Level 3에서 추가:

```text
originalFileRefs[]
resultRefs[]
```

---

## 4. title 관련 저장 기준

```text
input.title = 사용자가 직접 입력한 제목. 없으면 null.
input.titleProvided = 사용자가 제목을 입력했는지 여부.
input.titleSource = 제목 출처.
submissionTitle = 시스템 임시 표시 제목.
displayTitle = UI 표시 제목.
processorResult.title = 프로세서 생성 최종 결과 제목.
```

표시 우선순위:

```text
processorResult.title
→ displayTitle
→ submissionTitle
```

시스템 임시 제목을 `input.title`에 저장하지 않는다.

---

## 5. 레벨별 저장 기준

### 5.1 notify_only

저장:

```text
submission 최소 로그
status
createdAt/completedAt
error 정보
emailSent 여부
retentionPolicySnapshot
```

저장하지 않음:

```text
processorResult 본문
processorResult.mdContent
originalFileRefs
resultRefs
Storage 파일 경로
검색 대상 본문
```

이메일 MD 첨부파일과 입력 원본 파일의 이메일 임시 첨부는 메일 전송용으로만 가능하다. N8Lient DB/Storage, originalFileRefs/resultRefs에는 보관하지 않는다.

### 5.2 processed_result

저장:

```text
submission 로그
Level 1 이메일 전달/첨부 기능 유지 가능
processorResult
검색 대상 메타데이터
```

저장하지 않음:

```text
originalFileRefs 기본 없음
resultRefs 기본 없음
Firebase Storage 원본 파일 기본 없음
```

MD 다운로드는 `processorResult.mdContent` 기반으로 동적 생성 가능하다.

### 5.3 full_archive

저장:

```text
submission 로그
Level 2 기능 전체
processorResult
originalFileRefs
resultRefs
Firebase Storage 원본 파일
Firebase Storage 결과 파일
```

---

## 6. processorResult 최소 구조

Level 2 이상에서 권장하는 processorResult 구조:

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

워크플로우별 확장 필드는 `structuredData` 안에 넣는 것을 우선한다.

---

## 7. originalFileRefs 기준

Level 3에서 원본 파일 참조를 저장한다.

권장 구조:

```json
{
  "type": "original_audio",
  "provider": "firebase_storage",
  "fileName": "recording.webm",
  "mimeType": "audio/webm",
  "size": 123456,
  "storagePath": "clients/{clientId}/users/{uid}/submissions/{submissionId}/original/recording.webm"
}
```

원본 파일 참조는 Level 3에서만 기본 저장한다.

---

## 8. resultRefs 기준

Level 3 또는 Optional Export 결과가 있을 때 저장한다.

권장 타입:

```text
result_file
optional_export_md
optional_export_attachment
```

Firebase Storage 결과 파일 예:

```json
{
  "type": "result_file",
  "provider": "firebase_storage",
  "fileName": "result.md",
  "mimeType": "text/markdown",
  "storagePath": "clients/{clientId}/users/{uid}/submissions/{submissionId}/results/result.md"
}
```

Google Drive Optional Export 결과는 `provider: "google_drive"`로 표시한다.

---

## 9. Storage Path 기준

개인 사용자 실행 파일:

```text
clients/{clientId}/users/{uid}/submissions/{submissionId}/original/{fileName}
clients/{clientId}/users/{uid}/submissions/{submissionId}/results/{fileName}
```

회사 공용 실행 파일:

```text
clients/{clientId}/company/submissions/{submissionId}/original/{fileName}
clients/{clientId}/company/submissions/{submissionId}/results/{fileName}
```

---

## 10. 다운로드 원칙

Firebase Storage 파일은 직접 공개 URL로 노출하지 않는다.

접근은 앱 결과 상세 화면 또는 Gateway 다운로드 API를 통해 제어한다.

접근 기준:

```text
개인사용자 = 자기 submission만 접근
회사관리자 = 자기 clientId의 submission 접근
operator = 운영 목적 접근
```

---

## 11. 검색 저장 기준

Level 2 이상 결과는 검색 준비 대상이다.

초기 검색 대상:

```text
processorResult.title
processorResult.summary
processorResult.content
processorResult.mdContent
processorResult.hashtags
workflowName
companyName
authorName
createdAt
```

후가공 검색 인덱스는 별도 컬렉션으로 분리한다.

```text
knowledgeSearchIndex
embeddingIndex
```

워크플로우 실행 단계에서 무리하게 벡터화, 백링크, 지식 그래프를 생성하지 않는다.

---

## 12. 삭제 및 보존 원칙

```text
운영 submissions는 임의 삭제하지 않는다.
Draft 테스트 데이터는 명시적 테스트 플래그가 있는 경우에만 삭제 가능하다.
Storage 삭제는 submission 참조 기반으로 제한한다.
전체 버킷 삭제 금지.
Firebase Auth 계정 삭제 금지.
```

테스트 데이터 플래그:

```text
submissions.isTestExecution === true
userAutomationSettings.isTestSetting === true
```

---

## 13. 미확정/후속 항목

아래 항목은 후속 상세 규약에서 확정한다.

```text
보관 기간 정책
회사별 삭제 정책
Storage Rules 전문
검색 인덱스 설계
대용량 파일 업로드 제한
감사 로그 상세 구조
```
