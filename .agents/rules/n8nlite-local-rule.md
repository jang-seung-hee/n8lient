---
trigger: always_on
---

# N8Lient Gateway 동시 점검 필수 룰

## 목적

N8Lient는 프론트엔드/Next.js API Route만으로 실행이 끝나는 구조가 아니다.
실제 실행, 설정 병합, 보관 정책, 이메일 발송, Storage, Google Drive Optional Export, n8n 호출은 `n8lient-gateway` 경로와 강하게 연결되어 있다.

따라서 실행/보관/이메일/파일/콜백/결과 안내와 관련된 작업에서는 반드시 Gateway까지 함께 확인해야 한다.

---

## 반드시 함께 확인할 경로

아래 파일 또는 디렉터리가 작업 영향권에 포함될 수 있다.

```text
src/app/user/execute/page.tsx
src/app/api/automation/execute/route.ts
src/app/api/automation/prepare-upload/route.ts
src/common/validation/validateExecution.ts
src/types/n8lient.ts

n8lient-gateway/src/server.ts
n8lient-gateway/src/shared/validateExecution.ts
n8lient-gateway/src/shared/resolveRetentionPolicy.ts
n8lient-gateway/src/shared/resolveEffectiveRetentionLevel.ts
```

`src/common/validation/validateExecution.ts`는 prebuild 단계에서 Gateway로 sync되는 파일이므로, 이 파일 수정 시 Gateway 쪽 반영 여부도 반드시 확인한다.

---

## Gateway 확인이 필수인 작업

아래 주제는 프론트만 수정하고 완료 처리하면 안 된다.

```text
- 실행하기 버튼 / 실행 요청 처리
- completionNotice / 실행 완료 안내 모달
- 결과보고 이메일
- emailEnabled / emailAttachOriginal / emailAttachResult
- reportEmailTo / resultEmailTo / emailTo 등 이메일 설정값
- retentionPolicy / 보관 레벨
- notify_only / processed_result / full_archive
- Firebase Storage 저장
- Google Drive Optional Export
- 파일 업로드 제한 / maxFileSizeMB / allowedFileTypes
- prepare-upload
- validateExecution
- callback 처리
- submission 저장
- 결과 파일 다운로드
- 실행 로그 / 결과 상세
```

---

## 핵심 원칙

### 1. 프론트 추정 금지

프론트에서 실행 결과, 이메일 발송 여부, 보관 정책, Storage/Drive 저장 여부를 임의 추정하지 않는다.

나쁜 예:

```text
page.tsx에서 currentSettings만 보고 결과보고 이메일을 판단
page.tsx에서 DEFAULT_RETENTION_POLICY만 보고 보관 정책 판단
template schema에서 type=email 필드만 추정해서 안내 문구 생성
```

좋은 예:

```text
Gateway 또는 execute route가 실제 finalSettings / retentionPolicy 기준으로 계산한 값을 응답
프론트는 응답받은 구조값을 표시만 함
```

---

### 2. 실제 실행 기준은 Gateway finalSettings

화면 안내, 완료 모달, 결과 저장 안내는 반드시 실제 실행에 사용되는 최종값 기준이어야 한다.

기준값:

```text
finalSettings
retentionPolicy
optionalExportProvider
reportEmailTo
emailEnabled
emailAttachOriginal
emailAttachResult
storageEnabled
googleDriveEnabled
```

완료 안내나 결과 안내는 아래 흐름을 우선한다.

```text
Gateway finalSettings
→ Gateway completionNotice 또는 execute API response
→ page.tsx 표시
```

---

### 3. Next.js route.ts와 n8lient-gateway는 함께 본다

`src/app/api/automation/execute/route.ts`만 수정했다고 실제 운영 실행 흐름이 바뀐다고 단정하지 않는다.

반드시 확인한다.

```text
- 로컬 개발이 Next.js route.ts를 타는지
- 실제 도메인/운영 실행이 n8lient-gateway를 타는지
- Cloud Run Gateway에 같은 로직이 반영되어야 하는지
- Gateway 배포가 필요한지
```

실제 운영 Gateway 변경이 필요한 경우, 로컬 수정만으로 완료 처리하지 않는다.

---

## 필수 점검 체크리스트

실행/보관/이메일 관련 작업 완료 전 아래를 반드시 확인한다.

```text
1. page.tsx만 수정한 것은 아닌가?
2. route.ts도 봤는가?
3. n8lient-gateway/src/server.ts도 봤는가?
4. Gateway shared 파일 sync 대상인지 확인했는가?
5. 실제 Gateway로 전달되는 finalSettings를 확인했는가?
6. 화면 표시값과 Gateway 실행값이 같은 출처인가?
7. completionNotice가 프론트 추정값이 아닌 Gateway/execute 응답 기준인가?
8. reportEmailTo 값의 key 존재 여부가 아니라 실제 value를 확인했는가?
9. emailConfigured와 emailWillSend를 구분했는가?
10. retentionPolicy 원본값이 아니라 effective policy 기준인지 확인했는가?
11. optionalExportProvider가 실제 실행값 기준인지 확인했는가?
12. Gateway payload 구조를 불필요하게 바꾸지 않았는가?
13. Firestore 저장 구조를 불필요하게 바꾸지 않았는가?
14. n8n workflow 입력 구조를 깨뜨리지 않았는가?
15. 로컬 테스트와 운영 Cloud Run Gateway 반영 범위를 구분했는가?
```

---

## 이메일/보관 정책 작업 시 필수 규칙

이메일 관련 안내나 실행 로직에서는 아래를 반드시 구분한다.

```text
emailConfigured = 이메일 주소가 실제 finalSettings 안에 존재하는가
emailWillSend = 실제 정책상 이메일이 발송될 예정인가
```

금지:

```text
emailEnabled === false 라는 이유만으로 “이메일이 설정되어 있지 않다”고 안내 금지
```

올바른 분기:

```text
이메일 주소 없음
→ 결과보고 이메일이 설정되어 있지 않음

이메일 주소 있음 + 발송 정책 꺼짐
→ 이메일 주소는 있으나 이메일 전송 정책 비활성

이메일 주소 있음 + 발송 예정
→ 실제 이메일 주소로 결과 전송 예정
```

---

## 디버그 기준

문제가 재현되면 key 목록만 보지 말고 value를 확인한다.

나쁜 확인:

```text
finalSettingsKeys에 reportEmailTo가 있음
```

좋은 확인:

```text
finalSettings.reportEmailTo === "user@example.com"
completionNotice.emailTo === "user@example.com"
```

필요 시 development 조건에서만 아래 로그를 사용한다.

```ts
if (process.env.NODE_ENV === "development") {
  console.debug("[execute-final-settings-email-value]", {
    userId,
    clientId,
    workflowKey,
    reportEmailTo: finalSettings?.reportEmailTo,
    resultEmailTo: finalSettings?.resultEmailTo,
    emailTo: finalSettings?.emailTo,
    emailEnabled: finalSettings?.emailEnabled,
    optionalExportProvider: finalSettings?.optionalExportProvider,
    retentionLevel: retentionPolicy?.level,
  });
}
```

최종 배포 전에는 과도한 로그를 제거하거나 `NODE_ENV === "development"` 조건을 유지한다.

---

## 수정 금지 원칙

Gateway 관련 작업에서도 아래는 함부로 바꾸지 않는다.

```text
- Gateway payload 구조
- n8n webhook 입력 구조
- Firestore 저장 구조
- submissions schema
- clientAutomations schema
- userAutomationSettings schema
- retentionPolicy 계산 규칙
```

구조 변경이 필요하면 먼저 영향 범위를 보고하고 승인받는다.

---

## 완료 보고 필수 형식

Gateway 영향 가능성이 있는 작업의 완료 보고에는 반드시 아래 항목을 포함한다.

```text
## Gateway 동시 점검 결과

### 1. 프론트 수정 파일
-

### 2. Next.js API Route 확인
-

### 3. Gateway 확인 파일
-

### 4. 실제 finalSettings 기준 확인
-

### 5. Gateway 응답 / completionNotice 확인
-

### 6. 로컬/운영 반영 범위
- 로컬:
- 운영 Gateway:
- Cloud Run 배포 필요 여부:

### 7. 영향 없음
- Gateway payload:
- n8n:
- Firestore:
- submissions:

### 8. 검증
- npx tsc --noEmit:
- npm run build:
- Gateway build/tsc:
```

---

## 최종 원칙

N8Lient에서 실행 관련 버그를 볼 때는 항상 아래 순서로 판단한다.

```text
UI 표시값
→ Next.js page.tsx
→ Next.js execute route
→ Gateway finalSettings
→ n8n payload
→ callback/submission result
```

이 순서 중 하나라도 확인하지 않으면 완료로 보고하지 않는다.
