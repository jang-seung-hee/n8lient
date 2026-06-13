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

# 엔팔라이언트 DB/Storage 최소 계약 v0.2

- 문서명: 엔팔라이언트 DB/Storage 최소 계약
- 버전: v0.2
- 이전 버전: v0.1
- 상위 문서: 엔팔라이언트 솔루션 헌법 1.1, 엔팔라이언트 아키텍처 명세서 1.1, 엔팔라이언트 결과/보관 레벨 최소 계약 v0.1
- 목적: 엔팔라이언트 실행 이력, 원본 파일, 결과 데이터의 최소 저장 기준을 정의한다.
- 개정 요지: resultRetentionLevel과 retentionPolicySnapshot을 반영하고, 원본 파일 영구 보관을 full_archive 기준으로 조건화한다.

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

모든 실행은 최소 submission 로그를 남긴다.  
단, processorResult 전체 저장, originalFileRefs 저장, resultRefs 저장은 보관 레벨에 따라 달라질 수 있다.

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
  "retentionPolicySnapshot": {
    "level": "processed_result"
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

## 4. retentionPolicySnapshot

`retentionPolicySnapshot`은 실행 당시 적용된 보관 정책의 스냅샷이다.

설정 변경은 이후 새 실행부터 적용된다.  
이미 생성된 submission의 `retentionPolicySnapshot`은 사후 설정 변경으로 바꾸지 않는다.

최소 구조는 다음과 같다.

```json
{
  "level": "full_archive",
  "emailEnabled": true,
  "storeProcessorResult": true,
  "storeOriginalFiles": true,
  "storeResultFiles": true,
  "storageProvider": "firebase_storage",
  "optionalExportProvider": "none"
}
```

---

## 5. status 표준

submission의 상태는 최소한 아래 값을 사용한다.

```text
queued
processing
success
failed
skipped
config_error
```

의미는 다음과 같다.

```text
queued = 실행 요청 접수
processing = 프로세서 처리 중
success = 정상 완료
failed = 처리 실패
skipped = 처리 제외
config_error = 설정 누락 또는 설정 오류
```

---

## 6. originalFileRefs 최소 구조

`originalFileRefs`는 원본 파일을 영구 보관하는 실행에서 사용한다.

기본적으로 `full_archive` 레벨에서 필수다.

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

`notify_only` 또는 `processed_result`에서는 원본 파일을 처리 중 임시로 사용할 수 있으나, 영구 보관하지 않을 수 있다. 이 경우 `originalFileRefs`는 빈 배열일 수 있다.

---

## 7. resultRefs 최소 구조

`resultRefs`는 프로세서 결과로 생성된 파일이 Firebase Storage에 저장된 경우 사용한다.

```json
{
  "storagePath": "clients/client_xxx/users/user_uid/submissions/sub_xxx/results/result.md",
  "fileName": "result.md",
  "mimeType": "text/markdown",
  "sizeBytes": 12000,
  "resultType": "markdown"
}
```

`resultRefs`는 `full_archive`에서 주로 사용한다.  
단, `processed_result`에서도 결과 파일 저장이 명시적으로 필요한 경우 사용할 수 있다.

---

## 8. processorResult 저장 원칙

n8n 프로세서가 callback으로 반환한 결과는 보관 정책에 따라 `processorResult`에 보관한다.

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

레벨별 기준은 다음과 같다.

```text
notify_only = processorResult 전체 저장 생략 가능, summary 중심 저장
processed_result = processorResult 기본 저장
full_archive = processorResult 기본 저장
```

---

## 9. Storage Path 최소 원칙

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

## 10. 다운로드 원칙

Firebase Storage 파일은 직접 공개 URL로 노출하지 않는다.

사용자는 엔팔라이언트 애플리케이션의 결과 상세 화면 또는 Gateway 다운로드 API를 통해 파일에 접근한다.

권한 확인 기준은 다음과 같다.

```text
개인사용자 = 자기 submission만 접근
회사관리자 = 자기 clientId의 submission 접근
오퍼레이터 = 운영 목적 접근
```

---

## 11. 레벨별 최소 저장 표준

```text
notify_only:
- submission 최소 로그 저장
- result.summary 저장 가능
- processorResult 전체 저장 생략 가능
- originalFileRefs 없음
- resultRefs 없음

processed_result:
- submission 저장
- processorResult 저장
- structuredData / keywords / warnings 저장 가능
- originalFileRefs 없음
- resultRefs 선택

full_archive:
- submission 저장
- processorResult 저장
- originalFileRefs 저장
- resultRefs 저장 가능
- Firebase Storage 원본/결과 파일 저장
```

---

## 12. 금지 사항

아래 구조는 금지한다.

```text
Firestore에 파일 원본 저장
Firestore에 base64 저장
Firestore에 Google Access Token 저장
Firestore에 Google Refresh Token 저장
사용자 설정에 Credential ID 저장
Firebase Storage 공개 URL을 이메일에 직접 삽입
Google Drive를 기본 원본 저장소로 전제
retentionPolicy 없이 모든 원본 파일을 무조건 영구 보관
```

---

## 13. 미확정 항목

아래 항목은 후속 DB/Storage 정식 규약서에서 확정한다.

```text
컬렉션별 전체 필드
인덱스 설계
Firestore Rules 전문
Storage Rules 전문
보관 기간 정책
삭제 정책
archive 정책
retentionPolicyOverride 허용 범위
```
