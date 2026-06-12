# 엔팔라이언트 DB/Storage 최소 계약 v0.1

- 문서명: 엔팔라이언트 DB/Storage 최소 계약
    
- 버전: v0.1
    
- 상위 문서: 엔팔라이언트 솔루션 헌법 1.0, 엔팔라이언트 아키텍처 명세서 1.0
    
- 목적: 엔팔라이언트 실행 이력, 원본 파일, 결과 데이터의 최소 저장 기준을 정의한다.
    

---

## 1. 기본 원칙

엔팔라이언트의 기본 데이터 저장소는 Firestore와 Firebase Storage다.

```text
Firestore = 상태, 권한, 설정, 실행 이력, 결과 메타데이터
Firebase Storage = 원본 파일, 결과 파일, 다운로드 대상 파일
```

Google Drive는 기본 저장소가 아니다.  
Google Drive는 Watch 입력 또는 Optional Export 저장소로만 본다.

Firestore에는 파일 원본, base64, binary, Blob을 저장하지 않는다.

---

## 2. Firestore의 최소 책임

Firestore는 다음 데이터를 관리한다.

```text
users
clients
workflowTemplates
clientContracts
clientAutomations
userAutomationSettings
submissions
```

각 컬렉션의 상세 필드는 별도 DB 규약서에서 정의한다.  
본 문서에서는 submissions의 최소 구조만 정의한다.

---

## 3. submissions 최소 구조

submission은 자동화 실행 1건의 기준 기록이다.

최소 필드는 다음과 같다.

```json
{
  "submissionId": "sub_xxx",
  "clientId": "client_xxx",
  "uid": "user_uid",
  "workflowKey": "idea-catcher",
  "automationId": "auto_xxx",
  "status": "queued",
  "trigger": {
    "type": "manual"
  },
  "input": {
    "title": "입력 제목",
    "text": "입력 텍스트",
    "inputType": "text"
  },
  "originalFileRefs": [],
  "processorResult": null,
  "result": {
    "title": null,
    "summary": null,
    "resultUrl": null
  },
  "resultRefs": [],
  "error": null,
  "createdAt": "ISO_8601",
  "updatedAt": "ISO_8601",
  "completedAt": null
}
```

---

## 4. status 표준

submission의 상태는 최소한 아래 값을 사용한다.

```text
queued
processing
success
failed
skipped
config_error
```

의미:

```text
queued = 실행 요청 접수
processing = 프로세서 처리 중
success = 정상 완료
failed = 처리 실패
skipped = 처리 제외
config_error = 설정 누락 또는 설정 오류
```

---

## 5. originalFileRefs 최소 구조

원본 파일이 있는 실행은 Firebase Storage에 파일을 저장하고, Firestore에는 참조 정보만 남긴다.

```json
{
  "storagePath": "clients/client_xxx/users/user_uid/submissions/sub_xxx/original/audio.webm",
  "fileName": "audio.webm",
  "mimeType": "audio/webm",
  "sizeBytes": 8234412,
  "inputType": "audio"
}
```

원본 파일이 여러 개면 배열로 저장한다.

---

## 6. resultRefs 최소 구조

프로세서 결과로 생성된 파일이 있으면 Firebase Storage에 저장하고, Firestore에는 참조 정보만 남긴다.

```json
{
  "storagePath": "clients/client_xxx/users/user_uid/submissions/sub_xxx/results/result.md",
  "fileName": "result.md",
  "mimeType": "text/markdown",
  "sizeBytes": 12000,
  "resultType": "markdown"
}
```

---

## 7. processorResult 저장 원칙

n8n 프로세서가 callback으로 반환한 결과는 `processorResult`에 보관한다.

최소 구조는 다음과 같다.

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

프로세서별 상세 결과 구조는 workflowTemplates 또는 별도 워크플로우 규약에서 정의한다.

---

## 8. Storage Path 최소 원칙

Firebase Storage 경로는 clientId, uid, submissionId 기준으로 구분한다.

개인 사용자 실행 파일:

```text
clients/{clientId}/users/{uid}/submissions/{submissionId}/original/{fileName}
clients/{clientId}/users/{uid}/submissions/{submissionId}/results/{fileName}
```

회사 공용 실행 파일 또는 시스템 실행 파일:

```text
clients/{clientId}/company/submissions/{submissionId}/original/{fileName}
clients/{clientId}/company/submissions/{submissionId}/results/{fileName}
```

---

## 9. 다운로드 원칙

Firebase Storage 파일은 직접 공개 URL로 노출하지 않는다.

사용자는 엔팔라이언트 애플리케이션의 결과 상세 화면 또는 Gateway 다운로드 API를 통해 파일에 접근한다.

권한 확인 기준은 다음과 같다.

```text
개인사용자 = 자기 submission만 접근
회사관리자 = 자기 clientId의 submission 접근
오퍼레이터 = 운영 목적 접근
```

---

## 10. 금지 사항

아래 구조는 금지한다.

```text
- Firestore에 파일 원본 저장
- Firestore에 base64 저장
- Firestore에 Google Access Token 저장
- Firestore에 Google Refresh Token 저장
- 사용자 설정에 Credential ID 저장
- Firebase Storage 공개 URL을 이메일에 직접 삽입
- Google Drive를 기본 원본 저장소로 전제
```

---

## 11. 미확정 항목

아래 항목은 후속 DB/Storage 정식 규약서에서 확정한다.

```text
- 컬렉션별 전체 필드
- 인덱스 설계
- Firestore Rules 전문
- Storage Rules 전문
- 보관 기간 정책
- 삭제 정책
- archive 정책
```