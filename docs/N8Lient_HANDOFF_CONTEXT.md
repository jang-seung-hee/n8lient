# N8Lient_HANDOFF_CONTEXT.md

> 목적: ChatGPT와 같은 외부 LLM AI의 새 대화창에서 N8Lient 개발을 이어가기 위한 인수인계 컨텍스트 문서.
> 사용법: 새 채팅 첫 메시지에 이 파일을 붙이거나, `docs/N8Lient_HANDOFF_CONTEXT.md를 먼저 읽고 현재 정책을 기준으로 답변하라`고 지시한다.
> 주의: 이 문서는 개발 AI(예: Antigravity, 커서AI, Codex 등)가 자동으로 따라야 하는 실행 지시서가 아니다. 개발 AI가 이 문서를 참고해야 할 경우에는 사용자가 명시적으로 참조를 지시한다.
> 운영 방식: 중요한 프로젝트 정책 변경, 구조 변경, 권한 정책 변경, 데이터 모델 변경이 발생하면 이 문서에 핵심 결정만 요약해 기록한다.


# 문서 작성 / 업데이트 원칙

이 문서는 N8Lient 개발을 새 대화창 또는 다른 개발 AI가 이어받기 위한 **핵심 인수인계 문서**다.
상세 작업 로그, 빌드 로그, 긴 디버깅 기록, 임시 실험 과정은 이 문서에 길게 남기지 않는다.

업데이트 기준:

* 중요한 정책 변경, 데이터 모델 변경, 권한 규칙 변경, 실행 계약 변경만 기록한다.
* 단순 버그 수정은 재발 방지에 필요한 핵심 원칙만 3~10줄로 요약한다.
* 기존 섹션에 합칠 수 있으면 새 섹션을 만들지 말고 기존 내용을 갱신한다.
* “최근 변경 이력”은 짧게 유지하고, 오래된 내용은 관련 정책 섹션으로 흡수한다.
* 파일 목록, 리비전 번호, 테스트 출력 전문, 긴 명령어 목록은 원칙적으로 넣지 않는다.
* 필요하면 상세 기록은 별도 문서로 분리한다.

  * 예: `docs/changelog/YYYY-MM-DD-주제.md`
  * 예: `docs/debug-notes/주제.md`
* 문서에 남길 때는 “무엇을 왜 그렇게 하기로 했는가”를 우선한다.
* “어떻게 고쳤는가”는 핵심 파일명과 검증 기준만 남긴다.
* “완벽히 해결” 같은 단정 표현은 피하고, “확인한 시나리오 기준 정상”처럼 쓴다.
* 민감정보, API Key, Token, Secret, Credential, 실제 운영 값은 절대 기록하지 않는다.

권장 기록 형식:

```text
- 결정:
- 이유:
- 관련 파일:
- 주의사항:
- 최소 검증 기준:
```

---

## 0. 응답/작업 원칙

- 언어: 한국어.
- 답변 방식: 핵심 위주, 불필요한 장문 설명 금지.
- 코드 수정 전: 관련 파일을 먼저 확인한다.
- 작업 범위: 요청받은 범위만 최소 수정한다.
- 정상 동작 중인 흐름은 함부로 갈아엎지 않는다.
- 대규모 리팩토링은 명시 지시 없이는 하지 않는다.
- 기능 변경 후 필수 검증:
  - `npx tsc --noEmit`
  - `npm run build`
- Firestore Rules 수정 후:
  - `firebase deploy --only firestore:rules`
- 삭제/리셋 기능은 반드시 dry-run 또는 confirm 안전장치를 둔다.
- 민감정보, Firebase Auth 계정, Secret, Token, Storage 전체 버킷은 절대 임의 삭제하지 않는다.

---

## 1. 프로젝트 개요

N8Lient(엔팔라이언트)는 Next.js + Firebase + n8n 기반 자동화 클라이언트 앱이다.

목표:
- n8n 워크플로우를 사용자/회사별로 실행할 수 있는 자동화 포털.
- 운영자가 워크플로우 마스터를 등록하고, 고객사와 사용자에게 배포한다.
- 회사별 설정, 사용자별 설정, 실행 로그, 결과 보관 정책을 관리한다.

역할:
- `operator`: 플랫폼 운영자. 회사 소속 없이 존재 가능.
- `company_admin`: 고객사 관리자. 회사당 1명만 허용하는 정책.
- `user`: 일반 사용자. 회사 관리자 승인 후 자동화 사용 가능.

---

## 2. 핵심 컬렉션/도메인

주요 컬렉션:
- `users`
- `clients`
- `companyCodeLookups`
- `companyJoinRequests`
- `workflowTemplates`
- `clientContracts`
- `clientAutomations`
- `userAutomationSettings`
- `submissions`

중요 개념:
- `workflowTemplate`: 워크플로우 마스터.
- `clientContract`: 회사에 특정 워크플로우를 노출/계약시키는 선행 권한 레코드.
- `clientAutomation`: 회사별 자동화 설정.
- `userAutomationSettings`: 사용자별 개인 설정.
- `submission`: 실행 요청 및 실행 로그.

---

## 3. 워크플로우 마스터 Import 정책

### 3.1 raw n8n JSON 분석 폐기

과거에는 앱에서 raw n8n JSON을 분석하려 했으나 유지보수 부담이 커서 폐기했다.

현재 정책:
- 앱은 raw n8n JSON을 직접 분석하지 않는다.
- LLM 프롬프트로 표준 Import JSON을 생성한다.
- 앱은 `n8lient.workflowTemplateImport.v1` 표준 JSON만 불러온다.
- 앱은 표준 JSON의 정합성 검증과 폼 주입만 담당한다.

### 3.2 표준 Import JSON

필수 schemaVersion:

```json
{
  "schemaVersion": "n8lient.workflowTemplateImport.v1"
}
```

앱이 수행하는 일:
- JSON 파싱.
- 필드 정합성 검증.
- diagnostics 표시.
- `WorkflowForm` initialData로 매핑.
- 저장 전 재검증.

### 3.3 Diagnostics 정책

표시 등급:
- `error`: 빨강. 저장 차단.
- `warning`: 주황. 확인 필요.
- `ok`: 파랑. 정상.

Import JSON에서 오류가 있으면 각 필드 배경/테두리/안내문이 등급별 색상으로 표시된다.

폼 수정 시 diagnostics는 실시간 재검증된다.
- 잘못된 값을 고치면 해당 필드 색상/안내문이 갱신된다.
- 저장 직전에도 다시 검증한다.

---

## 4. retentionCapabilities / operatorRetentionPolicy 검증 정책

Firestore는 `undefined`를 저장할 수 없으므로, Import JSON과 mapper 모두 주의해야 한다.

정책:
- `validateWorkflowTemplateImport.ts`: 원본 Import JSON 기준으로 엄격히 검증한다.
- `mapImportJsonToWorkflowTemplate.ts`: Firestore 저장 안전성을 위해 undefined가 남지 않도록 safe normalization만 수행한다.
- mapper가 조용히 기본값으로 오류를 숨기면 안 된다.

`retentionCapabilities` 필수 필드 8개:
- `maxLevel`: string
- `defaultLevel`: string
- `supportedLevels`: array
- `supportsProcessorResult`: boolean
- `supportsOriginalFileRefs`: boolean
- `supportsResultRefs`: boolean
- `supportsResultPolicyRouter`: boolean
- `supportsEmailNotification`: boolean

`operatorRetentionPolicy` 필수 필드 4개:
- `allowedLevels`: array
- `defaultLevel`: string
- `allowCompanyOverride`: boolean
- `allowUserOverride`: boolean

누락/타입 오류는 `warning`이 아니라 `error`다.

특히 `supportsEmailNotification` 누락으로 Firestore `setDoc()` undefined 오류가 발생했던 이력이 있다.

---

## 5. WorkflowForm 리팩토링 상태

기존 `WorkflowForm.tsx`는 702줄이었고, 다음 구조로 분리 완료했다.

파일 구조:

```text
src/app/operator/workflow-templates/
├── WorkflowForm.tsx
└── hooks/
    ├── useWorkflowForm.ts
    ├── workflowFormSubmitValidator.ts
    └── workflowTemplateAssembler.ts
```

역할:
- `WorkflowForm.tsx`: UI 조립 전용.
- `useWorkflowForm.ts`: 상태/초기화/debounce/import touched 추적.
- `workflowFormSubmitValidator.ts`: 제출 전 검증.
- `workflowTemplateAssembler.ts`: WorkflowTemplate 객체 조립 유틸.

중요 보존 로직:
- `missingImportFields`
- `touchedImportFields`
- `supportsEmailNotification` 누락 error 유지
- 사용자가 직접 체크박스를 만진 뒤 error 해소
- `onDraftChange` 300ms debounce
- 최종 저장 payload에 undefined 없음

주의:
- 추가 리팩토링은 당분간 중단.
- 이제는 실제 기능 테스트 우선.

---

## 6. Draft / Test / Production 정책

### 6.1 기본 철학

- `draft`: 테스트/검증 중인 임시 워크플로우.
- `published`: 운영 배포 가능 워크플로우.
- 테스트 참조는 draft 삭제를 막으면 안 된다.
- 운영 참조는 삭제/구조 변경을 막아야 한다.

### 6.2 테스트 참조

테스트 참조:
- test `clientContracts`
- test `clientAutomations`
- test `userAutomationSettings`
- test `submissions`

Draft 삭제 시 함께 cascade delete 가능.

### 6.3 운영 참조

운영 참조:
- production `clientContracts`
- production `clientAutomations`
- production `userAutomationSettings`
- production `submissions`

운영 참조가 있으면:
- 구조 변경 금지.
- 삭제 금지.
- 구조 변경 필요 시 복제해서 새 `workflowKey`로 등록.

### 6.4 구조 잠금 기준

```text
isStructureLocked = template.status === "published" || usageSummary.hasProductionReferences === true
```

Draft + 테스트 참조만 있으면:
- `isStructureLocked = false`
- 수정 가능
- Draft 삭제 가능

---

## 7. clientContracts 정책

`clientContracts`는 회사 관리자 화면에 자동화 목록을 노출하는 선행 조건이다.  
따라서 draft 테스트 배포에도 `clientContracts`가 필요하다.

ClientContract에 추가된 구분 필드:

```ts
contractMode?: "test" | "production";
isTestContract?: boolean;
templateStatusAtContract?: "draft" | "published";
```

Draft 템플릿에 연결된 계약:
- `contractMode = "test"`
- Draft 삭제 시 함께 삭제 가능.

Published 템플릿에 연결된 계약:
- `contractMode = "production"`
- 삭제 금지.
- 구조 변경 잠금 대상.

주의:
- 이미 `production`인 계약을 자동으로 `test`로 다운그레이드하면 안 된다.
- draft가 published로 바뀌었다고 기존 test contract를 자동 production으로 바꾸지 않는다.
- 운영 전환은 별도 플로우로 다루는 것이 안전하다.

---

## 8. Draft 삭제 정책

`deleteDraftWorkflowTemplate`는 다음 조건에서만 작동한다.

조건:
- 템플릿 status가 `draft`.
- production references가 없음.
- production clientContract가 없음.

삭제 대상:
- test `clientContracts`
- test `clientAutomations`
- test `userAutomationSettings`
- test `submissions`
- `workflowTemplates/{workflowKey}`

삭제 금지:
- production contracts
- production automations
- production submissions
- Firebase Auth 계정
- Storage 전체 버킷

Firestore batch는 400개 단위로 분할 처리한다.

---

## 9. 테스트 데이터 리셋 스크립트

파일:

```text
scripts/resetN8lientTestData.ts
```

목적:
- 깨끗한 테스트 환경으로 리셋.
- operator 계정 보존.
- 테스트 회사/워크플로우/계약/매핑/실행 로그/개인 설정 삭제.

기본은 dry-run.

실제 삭제 확인 문자열:

```text
RESET_N8LIENT_TEST_DATA
```

실행 예:

```bash
npx tsx scripts/resetN8lientTestData.ts --dry-run
npx tsx scripts/resetN8lientTestData.ts --dry-run --include-storage
npx tsx scripts/resetN8lientTestData.ts --confirm RESET_N8LIENT_TEST_DATA --include-storage
```

보존:
- `users.role === "operator"` 문서
- Firebase Auth 계정
- 전체 Storage bucket
- Secret/Token/API Key

삭제 대상:
- `submissions`
- `userAutomationSettings`
- `clientAutomations`
- `clientContracts`
- `companyJoinRequests`
- `workflowTemplates`
- `clients`
- `users` 중 non-operator 문서

Storage 삭제:
- `--include-storage` 옵션이 있을 때만 후보 수집/삭제.
- 전체 버킷 삭제 금지.
- 삭제 대상 submissions의 `originalFileRefs[].storagePath`, `resultRefs[].storagePath`만 삭제.
- 경로는 `clients/`로 시작하고 `submissions/`를 포함해야 한다.

---

## 10. 회사 생성 / 최초 회사 관리자 정책

기존 순환참조:
- 회사 등록에는 관리자 UID 필요.
- 관리자 가입에는 회사코드 필요.
- 회사코드는 회사 등록 후 생성.
- 최초 회사 관리자 등록 불가능.

해결 정책:
1. operator가 회사 먼저 생성.
2. 회사 생성 시 `ownerAdminUid`는 null 허용.
3. companyCode 발급.
4. 최초 회사 관리자 후보가 companyCode 입력.
5. 회사에 ownerAdminUid가 없으면 `company_admin` 요청 생성.
6. operator가 최초 `company_admin` 승인.
7. 이후 일반 사용자는 `company_admin`이 승인.

ClientDoc 관련 필드:

```ts
ownerAdminUid: string | null;
ownerAdminEmail?: string;
ownerAdminDisplayName?: string;
adminBootstrapStatus?: "pending" | "completed";
```

회사 관리자는 회사당 1명만 허용.

회사 관리자 제거:
- operator만 가능.
- `clients.ownerAdminUid = null`
- `adminBootstrapStatus = "pending"`
- 기존 관리자는 `role = "user"`로 강등.
- 기존 실행 이력은 삭제하지 않는다.

---

## 11. companyCodeLookups 정책

가입 전 사용자는 `clients` 문서를 직접 조회하지 않는다.

이유:
- `clients`에는 회사 설정/계약/담당자 정보가 늘어날 수 있다.
- 가입 전 사용자에게 노출하면 보안 부담이 커진다.

대신 가입자는 `companyCodeLookups/{normalizedCode}`만 `get`한다.
- `list`는 금지.
- `clients` get/list는 기존처럼 보호.

`companyCodeLookups` 최소 필드:

```ts
clientId: string;
companyCode: string;
companyName: string;
hasOwnerAdmin: boolean;
adminBootstrapStatus: "pending" | "completed";
status?: string;
```

회사코드 입력 분기:
1. `companyCodeLookups` 문서 없음
   - 유효하지 않은 회사코드.
   - companyJoinRequests 생성 금지.
2. 문서 있음 + `hasOwnerAdmin === false`
   - 고객사명 표시.
   - `company_admin` 요청 생성.
3. 문서 있음 + `hasOwnerAdmin === true`
   - 고객사명 표시.
   - `user` 요청 생성.

중요:
- 없는 회사코드는 “관리자 없는 회사”가 아니다.
- 없는 회사코드는 “잘못된 회사코드”다.

회사코드 변경 시:
- old lookup 삭제.
- new lookup 생성.
- pending join request 영향은 추후 정책 검토.
- MVP에서는 회사코드 변경을 최대한 제한하는 방향이 안전하다.

---

## 12. 가입 승인요청 취소 정책

사용자가 회사코드를 잘못 입력해 pending 상태가 되면 빠져나올 방법이 필요하다.

정책:
- 승인 대기 중 사용자는 본인의 pending companyJoinRequests를 취소할 수 있다.
- 취소 후 회사코드 입력 화면으로 돌아간다.
- cancelled 요청은 중복 요청 검사에서 제외한다.
- pending 요청만 중복 요청으로 본다.

취소 처리:

```ts
companyJoinRequests/{requestId} update {
  status: "cancelled",
  cancelledAt: now,
  cancelledBy: currentUid,
  updatedAt: now
}

users/{uid} update {
  approvalStatus: "no_company",
  clientId: null,
  companyCode: null,
  updatedAt: now
}
```

주의:
- operator 계정에는 취소/롤백 적용 금지.
- company_admin 계정에도 취소 롤백 적용 금지.
- approved/rejected/cancelled 요청은 사용자 취소 불가.

---

## 13. Firestore Rules 주의사항

### 13.1 companyCodeLookups

정책:
- 로그인 사용자는 단일 문서 `get` 가능.
- `list` 금지.
- write는 operator만.

### 13.2 clients

정책:
- 가입 전 사용자에게 `clients` 직접 get/list 허용하지 않는다.
- operator 및 소속 사용자/관리자만 접근.

### 13.3 companyJoinRequests 취소

본인 취소 허용 조건:
- `request.auth.uid == resource.data.uid`
- 기존 status가 `pending`
- 새 status가 `cancelled`
- 변경 가능 필드는 제한.

허용 변경 필드 권장:
- `status`
- `cancelledAt`
- `cancelledBy`
- `updatedAt`

변경 금지:
- `uid`
- `clientId`
- `companyCode`
- `companyName`
- `requestedRole`
- `email`
- `displayName`
- `reviewedBy`
- `reviewedAt`

가능하면 Rules에서:

```js
request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])
```

### 13.4 users 롤백

최근 에러:
- 승인 요청 취소 시 `Missing or insufficient permissions` 발생.

원인:
- `companyJoinRequests` 취소 권한은 있었지만,
- `users/{uid}`를 `pending → no_company`로 롤백하는 Rules가 없었음.

추가해야 하는 방향:
- 본인 user 문서만.
- role이 `user`일 때만.
- `approvalStatus: pending → no_company`
- `clientId: 기존값 → null`
- `companyCode: 기존값 → null`
- 변경 가능 필드는 최소화.

허용 변경 필드 권장:
- `approvalStatus`
- `clientId`
- `companyCode`
- `updatedAt`

operator/company_admin에는 적용 금지.

---

## 14. 현재 최근 이슈 상태

가장 최근 확인된 이슈:
- 가입 승인 요청 취소 시 `Missing or insufficient permissions` 발생.

원인:
- `users/{uid}` 롤백 권한 부족.

최소 해결 방향:
- `firestore.rules`의 `users` update 규칙에 본인의 pending 가입 요청 취소 롤백 케이스 추가.
- 단, diff 제한으로 변경 가능 필드를 최소화해야 한다.

개발 지시 요약:

```text
users 롤백 규칙은 pending → no_company 취소 케이스에 한정한다.
role == "user" 조건을 반드시 넣는다.
diff().affectedKeys().hasOnly(['approvalStatus','clientId','companyCode','updatedAt']) 형태로 제한한다.
수정 후 firebase deploy --only firestore:rules, npx tsc --noEmit, npm run build를 확인한다.
```

---

## 15. 테스트 우선순위

### 15.1 리셋 후 기본 플로우

1. operator만 남기고 리셋.
2. operator 로그인.
3. 고객사 신규 생성.
4. `companyCodeLookups` 생성 확인.
5. 신규 사용자로 회사코드 입력.
6. 회사 관리자 승인 요청 안내 확인.
7. `company_admin` 요청 pending 생성 확인.
8. operator 고객사 상세에서 승인.
9. `clients.ownerAdminUid` 채워짐 확인.
10. `companyCodeLookups.hasOwnerAdmin === true` 확인.
11. 다른 사용자로 회사코드 입력.
12. 일반 user 가입 요청 생성 확인.
13. company_admin이 user 승인 확인.

### 15.2 회사코드 검증

1. 없는 회사코드 입력.
2. 유효하지 않은 회사코드 안내.
3. `companyJoinRequests` 생성 안 됨.
4. 유효한 회사코드 입력.
5. 고객사명 표시.

### 15.3 승인요청 취소

1. pending 요청 생성.
2. PendingApproval에서 승인 요청 취소.
3. confirm 표시.
4. 취소 후 companyCode 입력 화면으로 복귀.
5. `companyJoinRequests.status = cancelled` 확인.
6. `users.approvalStatus = no_company` 확인.
7. 재요청 가능 확인.

### 15.4 워크플로우 마스터

1. 표준 Import JSON 등록.
2. `supportsEmailNotification` 누락 JSON에서 error 유지.
3. 체크박스 직접 클릭 후 error 해소.
4. 저장 시 undefined 오류 없음.
5. published/사용 중 마스터 수정 시 구조 잠금 정상 작동.

---

## 16. 절대 주의 사항

- raw n8n analyzer 복구하지 말 것.
- AI Assist 복구하지 말 것.
- 운영 데이터를 삭제하지 말 것.
- Firebase Auth 계정을 삭제하지 말 것.
- Storage 전체 버킷 삭제 금지.
- `clients`를 가입 전 사용자에게 공개하지 말 것.
- `operator`는 clientId/companyCode 없이 존재 가능해야 함.
- company_admin은 company_admin 요청을 승인할 수 없음.
- company_admin은 operator/company_admin 권한을 부여할 수 없음.
- 회사 관리자는 현재 정책상 회사당 1명.
- production contract는 test로 자동 다운그레이드 금지.

---

## 17. 최근 변경 이력 (v2.4 inputSchema 및 Rules 강화)

### 17.1 inputSchema 신규 필드 추가 (v2.4 표준 규격)
- `inputSchema`에 `requiredInputMode` ("none" | "at_least_one" | "all"), `requiredInputTypes` (acceptedInputTypes의 부분집합 배열), `maxFiles` (0 이상의 숫자) 필드가 추가되었습니다.
- **Hook & Assembler 연동**: `useWorkflowForm.ts` 및 `workflowTemplateAssembler.ts`에 해당 상태들을 안전하게 초기화 및 조립하도록 바인딩하고, Firestore 저장 전 undefined 유실을 방지하였습니다.
- **UI 입력 요소 배치**: `WorkflowInputSchemaForm.tsx`에 requiredInputMode 선택 select, requiredInputTypes 다중 선택 체크박스, maxFiles 숫자 인풋을 연동하고 Diagnostics의 실시간 재검증 및 스타일 처리를 연동하였습니다.

### 17.2 Import JSON 검증 규칙 및 UX 보완 (v2.4)
- **`titleRequired === false` 정책 완화**: titleRequired 속성이 명시적으로 `false`인 경우, 이제는 정상 정책(제목 선택 입력)으로 취급되어 `warning`이 아닌 **`ok`**(정상 안내 정보) 등급으로 표시됩니다. `undefined` 또는 `null`인 경우에만 누락 안내 `warning`이 뜹니다.
- **placeholder 타입별 조건부 경고**: 기존에는 모든 설정 필드에서 placeholder가 비어 있으면 warning 경고를 띄웠으나, UX 개선을 위해 `text`, `textarea`, `email`, `number`, `url`, `password` 타입에서만 필수 검토하도록 변경하였습니다 (`boolean`, `select` 등 placeholder가 필요하지 않은 필드는 비어 있어도 warning을 띄우지 않습니다).

### 17.3 Firestore Rules 테스트 및 백필 실행
- `scripts/backfillTestSettingsAndSubmissions.ts`를 실행하여 Firestore의 submissions 및 userAutomationSettings 레거시 문서 중 누락된 `isTestExecution: true/false`, `isTestSetting: true/false` 필드를 백필 완료하였습니다.
- 백필 완료 후 `firestore.rules`에서 레거시 fallback 완화 규칙(`resource.data.get(..., true) == true`)을 완전히 제거하고, 명시적으로 `resource.data.isTestExecution == true` 및 `resource.data.isTestSetting == true` 조건만 draft 템플릿에 연결된 테스트 데이터 삭제를 허용하도록 엄격하게 규칙을 원복하였습니다.
- `scripts/testFirestoreRules.ts`를 통해 이를 검증하기 위한 자동화 규칙 테스트 케이스들을 유지 및 보존하고 있습니다.

---

## 18. 최근 변경 이력 — title 계약 정리

* `input.title`은 사용자가 직접 입력한 제목만 의미한다. 제목이 없으면 `null`.
* `titleRequired=false`인 워크플로우는 제목 없이 실행 가능해야 한다.
* 시스템 임시 제목은 `submissionTitle` / `displayTitle`에만 둔다.
* n8n/Gemini는 `titleProvided=false`이면 음성·본문 기반으로 `processorResult.title`을 생성한다.
* 결과 표시 우선순위는 `processorResult.title > displayTitle > submissionTitle`.
* Gateway는 `input.title`을 고정 필수값으로 검사하지 않는다. `titleRequired=true`일 때만 필수다.
* 관련 헬퍼: `buildTitleContract.ts`, `getSubmissionDisplayTitle.ts`, `validateExecution.ts`.
* `WorkflowInputPanel`은 녹음 타이머 updater 내부에서 부모 콜백을 호출하지 않는다.
* Gateway 배포 전 `syncGatewayValidation.ts` 실행 여부를 확인한다.
* 검증 기준: 제목 없는 음성 실행 성공, `input.title=null`, `titleProvided=false`, callback 후 결과 제목 표시.
* Google Drive 폴더 ID 입력 필드는 전체 Drive 폴더 URL을 붙여넣어도 저장 전 folderId만 추출하도록 공통 유틸과 입력 컴포넌트를 적용했다.
* 개인 설정 저장 시 「내 보관 단계」 미선택이면 `userRetentionPreference` 필드를 Firestore에 쓰지 않도록 조건부 spread와 `userService.stripUndefinedDeep` 방어를 적용했다.
* 결과보관 정책을 변경했다, 1단계시 이메일 전송 + md파일 첨부 -> md파일 및 기타 파일 첨부까지 확대 (단, 이것은 저장이 아니라 이메일 첨부의 임시 저장이다)
* 실행 실패 디버깅 로그 1차 개선 완료. submissions에 errorDetails(phase/source/httpStatus/gatewayTraceId/n8nWebhookPath/hint 등)를 추가하고, 사용자/관리자 결과 상세 모달에 상세 디버그 정보 및 복사 버튼을 추가했다. 민감정보는 sanitize 후 저장/표시/복사한다. App 및 Gateway 배포가 필요하며, 404 재현 테스트로 GATEWAY_N8N_CALL 단계 표시를 검증한다.
* 실행 스냅샷 / 디버그 JSON 다운로드 1차 구현 완료. SubmissionErrorDetailsPanel을 성공/실패 공통 아코디언으로 전환하고, 실패 건은 기본 열림, 성공 건은 기본 닫힘으로 표시한다. 기존 디버그 정보 복사 기능을 유지하면서 debug_snapshot_{submissionId}.json 다운로드 기능을 추가했다. 다운로드 JSON은 submissions 문서의 settingsSnapshot, settingsMergeSummary, retentionPolicySnapshot, input, error, errorDetails를 기반으로 생성하며, 민감 키는 sanitizeDebugInfo 유틸로 마스킹한다. /user/results, /company-admin/results, /operator/logs 모두 공통 패널을 통해 동일 기능을 제공한다.
* Gateway 빌드 구조 정리 완료. n8lient-gateway/package.json의 prebuild를 제거해 Cloud Run 빌드 컨텍스트 외부 파일 참조 문제를 해소했다. Gateway build는 tsc만 수행하며, shared validation 파일 동기화는 루트 package.json의 sync:gateway/check:gateway-sync/build:gateway 명령으로 명시 관리한다. Dockerfile도 npm run build 기준으로 정리했다.

---

## 19. 최근 변경 이력 — Gateway 정책·표시명 (2026-06-18)

* **Gateway 정책 PATCH**: 프론트 `mergeAutomationSettings`로 execute validation 병합 정합. Gateway `optionalExportProvider` 하드코딩 제거(rev `00029-qsz`) → Policy Resolver Phase B `resolveRetentionPolicy` 분리(rev `00030-7kq`, `storeOriginalFileRefs`/`storeResultRefs` additive).
* **워크플로우 표시명 SSOT**: `resolveWorkflowDisplayName` + `fetchWorkflowTemplatesByKeys` — 화면 표시는 `workflowTemplates.name` 우선, `clientAutomations.automationName`은 fallback. workflowKey·webhookPath·submissions 과거 로그는 변경 없음.

## 20. 최근 변경 이력 — 실행 결과 상세 중앙화 (2026-06-18)

* **결과 상세 SSOT**: `/user/results`, `/company-admin/results`, `/operator/logs`가 공통 `ExecutionResultDetailModal` → `ExecutionResultDetailPanel`(14섹션) + `resultDetailVisibility.ts`(role별 visible/defaultOpen)로 통합. 역할별 차이는 `viewerRole`만 전달; `SubmissionDetailModal`/`CompanyResultDetailModal`은 thin wrapper(deprecated).
* **운영 디버그**: companyAdmin/operator는 `OpsDebugInfoSection`에서 debugInfo·snapshots·rawJson(operator) 병합 표시; user는 debugInfo 숨김. [01]/[02]만 defaultOpen true.
* **부가**: 세 역할 목록 20건 페이징·실행일시(`YYMMDD HH:MM`)·요청자(`이름 / 구글이메일`, admin/operator) — `SubmissionList` + 공통 유틸 재사용.

* 회사 관리자 전용 워크플로우 사용 안함 기능 구현 완료. clientAutomations에 companyDisabled/companyDisabledAt/companyDisabledBy/companyDisableReason optional 필드를 추가하고, operator 매핑 상태(clientContracts.enabled) 및 기존 clientAutomations.enabled 의미는 변경하지 않았다. /company-admin/automations에서는 회사관리자가 워크플로우별 직원 사용 여부를 토글할 수 있고, /user 및 /user/execute에서는 companyDisabled === true인 자동화를 숨긴다. 기존 submissions 실행 기록은 유지한다. Gateway, Next execute route, prepare-upload route에서 companyDisabled === true인 경우 submissions 생성 및 n8n 호출 전에 403 CLIENT_AUTOMATION_COMPANY_DISABLED로 차단한다. Gateway/n8n payload, callback, retentionPolicy, Firestore Rules는 변경하지 않았다.

* operator 계약 비활성화 후 clientAutomations 잔상으로 직원 홈/실행 화면에 자동화가 계속 표시되던 문제를 수정했다. 직원 자동화 노출 조건을 clientContracts.enabled === true, contractStatus === active, clientAutomation.enabled === true, configStatus === configured, companyDisabled !== true로 공통화했다. userService.getActiveAutomations에서 clientContracts와 join/filter 처리하며, Gateway/Next execute/prepare-upload 3곳에서 contract 비활성 시 submissions 생성 및 n8n 호출 전에 403 CONTRACT_NOT_ACTIVE로 차단한다. clientAutomations 문서는 삭제하지 않아 operator 재활성 시 기존 회사 설정을 재사용할 수 있으며, 기존 submissions 실행 기록은 유지된다.

* N8Lient UX 디자인 설정 중앙화 1차 완료. src/styles/UX_Design_Setting.css를 생성하여 PC 본문 최대 폭 900px, PC/모바일 페이지 여백, 기본 UX 토큰을 선언했다. UserLayout, CompanyAdminLayout, OperatorLayout에 ux_page_shell/ux_content_body wrapper를 적용하고, /user/execute 및 /user/profile의 480px 중앙 정렬을 제거하여 역할별 본문 폭 기준을 통일했다. Gateway, n8n, Firestore, 실행 payload 변경 없음. 후속으로 /user, /user/results의 이중 padding 여부 확인과 admin/operator sidebar 모바일 대응이 필요하다.

* N8Lient UX 디자인 중앙화 1.5차까지 완료. UX_Design_Setting.css 기반 공통 본문 wrapper를 적용했고, PC 본문 최대 폭 900px/왼쪽 정렬 기준을 user, company-admin, operator 레이아웃에 반영했다. /user 주요 화면의 padding 중복과 넓은 테이블 내부 스크롤을 정리했으며, company-admin/operator는 1024px 미만에서 sidebar를 숨기고 모바일 drawer로 전환되도록 구현되어 있다. Gateway, n8n, Firestore, 실행 payload 영향 없음. 남은 작업은 /user/data/* padding 중복 정리, 320px 이하 헤더 대응, 반복 inline style의 CSS 변수화다.

* /user/data/* 4개 페이지의 잔여 padding 정리 완료. idea-catch, meeting-note, work-wiki, tongjayo 페이지의 루트 wrapper padding: 12px을 제거하고, UserLayout의 ux_content_body padding 기준으로 통일했다. 카드/배지/input 내부 padding은 유지했다. 각 페이지 루트에 minWidth: 0 및 긴 텍스트 줄바꿈 처리를 추가해 모바일 좌우 스크롤 위험을 줄였다. Gateway, n8n, Firestore, 실행 payload, 데이터 조회 로직 변경 없음. tsc/build 통과.

* N8Lient UX 디자인 중앙화 1차 작업 완료. UX_Design_Setting.css를 기준으로 본문 폭, 페이지 여백, 모바일 폭, 모달 크기, 카드/박스, input/select/textarea, 버튼, alert/badge, typography/label 계열을 중앙 변수와 공통 클래스로 정리했다. PC 본문은 최대 900px 왼쪽 정렬, 모바일은 100% 폭 기준으로 동작한다. admin/operator는 모바일 drawer 구조가 적용되어 sidebar가 모바일 본문 폭을 침범하지 않는다. Gateway, n8n, Firestore, 실행 payload 변경 없음. 추가 테이블/리스트 토큰화 및 우선순위 밖 화면 적용은 필수 작업이 아니라 후속 개선 사항으로 보류한다.

실행 로그 상세 화면의 resultRefs 다운로드 오류 수정 완료. 원인은 resultRefs에 Firebase Storage 파일 참조가 아니라 Google Drive optional export 메타가 들어 있는데, UI가 이를 Storage 다운로드 대상으로 처리한 것이었다. downloadTarget 타입과 분류 헬퍼를 추가해 original_storage, result_storage, optional_export, dynamic_md, unavailable로 분리했다. Storage 항목은 기존 Gateway 다운로드 API를 사용하고, Google Drive optional export 항목은 “Drive 열기”로 새 창 연결하며, processorResult.mdContent는 기존 동적 MD 다운로드를 유지한다. 섹션 09 생성된 결과 파일은 Storage resultRefs가 있을 때만 표시되며, optional export는 별도 Google Drive 내보내기 섹션으로 표시된다. Gateway, n8n, Firestore, payload, callback, submissions 저장 구조 변경 없음. tsc/build 통과.

* 오퍼레이터 고객 마스터 상세 화면 탭 구조 보강 완료. 기존 기본 정보/운영 현황 2개 탭을 기본 정보, 운영 요약, 소속 사용자, 오류 로그 4개 탭으로 확장했다. 소속 사용자 탭은 사용자별 실행 통계 테이블로 전환하여 실행/성공/실패/최근 실행날짜 컬럼을 추가했고, 통계 기준은 최근 300건 submissions 기준으로 표시한다. 오류 로그 탭은 최근 5건 요약이 아니라 고객사 오류 전체를 20개씩 cursor 기반 페이징으로 조회하며, 발생시각/워크플로우명/에러코드/사용자/오류 보기 컬럼을 제공한다. 오류 보기 버튼은 기존 ExecutionResultDetailModal과 연결한다. Gateway, n8n, Firestore Rules, submissions 저장 구조 변경 없음. tsc/build 통과. Firestore 복합 인덱스(clientId, status, createdAt)는 운영 배포 후 콘솔 에러 링크 기준으로 생성 필요 가능성이 있다.

* 회사관리자 자동화 상세 실행 설정값 뷰의 기본값 표시 보강 완료. CompanyAutomationDetail에서 automation.settings[field.key]에 실제 저장값이 없을 경우 field.defaultValue를 우선 확인하고, select/radio/enum 계열은 기본 option 값을 감지해 표시하도록 했다. 실제 저장값이 없는 상태에서 기본값이 표시되는 경우 ux_key_value_default_badge로 “회사 설정값 없음 · 기본값 사용”을 함께 표시한다. 저장값도 기본값도 없을 때만 “빈값”과 ux_key_value_value_empty를 적용한다. 값 박스와 기본값 배지는 UX_Design_Setting.css 공통 클래스로 관리한다. 저장 로직, CompanyAutomationForm, Gateway, n8n, Firestore 구조 변경 없음. tsc/build 통과.

* /user/execute 업로드 제한 안내 동적화 및 확장자 SSOT 정리 완료. WorkflowInputPanel 내부에 직접 하드코딩되어 있던 audio/image 확장자 안내 문자열을 제거하고, src/common/validation/validateExecution.ts에 ALLOWED_AUDIO_EXTENSIONS, ALLOWED_IMAGE_EXTENSIONS 공통 상수를 선언했다. resolveFileType과 WorkflowInputPanel이 동일 상수를 사용하도록 정리하여 화면 안내와 실제 파일 타입 검증 기준을 일치시켰다. maxFileSizeMB는 inputSchema.maxFileSizeMB와 NEXT_PUBLIC_MAX_UPLOAD_MB 기준의 maxLimitMB를 사용한다. 일반 file 탭은 workflow allowedFileTypes를 우선 표시하고, 없을 경우 fallback 안내를 출력한다. Gateway shared validateExecution.ts는 prebuild sync로 동기화 확인 완료. Gateway/n8n/Firestore/실행 payload 구조 변경 없음. tsc/build 통과.

* /user/execute 실행 요청 완료 안내 모달 문구 동적화 및 Gateway 이식 완료. 기존 프론트 추정 방식과 Next.js route.ts 단독 처리의 한계를 제거하고, 실제 실행을 담당하는 n8lient-gateway 성공 응답에 finalSettings/retentionPolicy 기준 completionNotice를 포함하도록 변경했다. page.tsx는 API 응답의 completionNotice를 사용해 완료 안내 모달을 표시하고, 10초 후 또는 [홈으로 이동] 클릭 시 /user로 이동한다. 이메일 주소 미인식 문제는 Gateway 기준 completionNotice 응답으로 보정되었으며, Gateway payload, n8n, Firestore, submissions 저장 구조 변경 없음. tsc/build 통과. 단, 완료 모달의 핵심 단어 컬러 강조가 message plain text 출력으로 사라지지 않았는지 최종 확인 필요.

* 아이디어 캐처 마크다운(MD) 결과물 출처 보강 구현 완료. Gateway(n8lient-gateway/src/server.ts) 및 Next.js prepare-upload, execute API Routes에서 Firestore clients 컬렉션을 비동기 조회하여 실제 회사명(companyName)과 사용자 구글메일(userEmail)을 확보하고, n8nPayload에 top-level 및 meta 객체, alias 필드들로 주입했다. n8n 워크플로우의 00 환경설정, 01 입력 정리, 05 Gemini 응답 파싱 노드를 수정하여 마크다운 결과물 및 DB 저장용 mdContent의 ## 출처 섹션에 회사명과 작성자 ID가 바인딩되도록 포맷을 갱신했다. 회사명/이메일 누락 시에도 null로 처리하고 fallback 문자열이 바인딩되도록 설계하여 실패 가능성을 방지했다. tsc/build 및 Cloud Run Gateway(asia-northeast3, project: n8lient) 서비스 재배포 완료.

## 사용자 PC UI 구조 정책

- 결정:
  /user PC 화면은 모바일형 상하 구조가 아니라, operator/company-admin과 유사한 좌·우 프레임 구조를 기준으로 한다.

- 이유:
  PC 화면에서 상단 헤더, 좌측 메뉴, 하단 BottomNav가 동시에 노출되면 구조가 복잡해지고 사이드바 고정 문제가 반복된다.

- 원칙:
  PC /user = 좌측 사이드바 + 우측 본문 프레임.
  모바일 /user = 좌측 사이드바 숨김 + 기존 BottomNav 유지.

- 주의사항:
  사용자 PC UI 디자인은 operator 화면의 중앙 CSS 토큰/규칙을 우선 재사용한다.
  새 스타일이 필요하면 UX_Design_Setting.css에 추가하고, 로컬 inline style은 금지한다.

  * 디자인/CSS 작업은 기존 중앙 CSS를 먼저 찾고, 없으면 중앙 CSS에 추가한 뒤 가져다 쓴다.
로컬 스타일이 꼭 필요하면 사용자 승인 후 적용한다.

## 마이크 권한 실패 UX 정책

/user/execute 음성 녹음에서 마이크 권한 실패 시 retryable/blocked 상태를 분리한다.

- 최초 권한 거부: retryable 상태로 전환하고 “다시 시도”를 1회 제공한다.
- 다시 시도 후에도 거부: blocked 상태로 전환한다.
- blocked 상태에서는 반복 재시도를 유도하지 않고, 디바이스/브라우저별 마이크 권한 허용 가이드를 제공한다.
- blocked 상태의 버튼 문구는 “권한 허용 후 다시 확인”으로 한다.
- 파일 업로드는 마이크 권한 실패의 대체 해결책으로 안내하지 않는다.
- 최종 판정은 Permissions API가 아니라 getUserMedia({ audio: true }) 호출 결과를 기준으로 한다.

### [2026-06-20] 워크플로우 실행 및 설정 UI의 범용성 개선

* **음성 녹음 기능 고도화**

  * `/user/execute` 페이지의 음성 녹음 기능에 `일시정지` / `이어 녹음` 기능을 추가했다.
  * 사용자가 녹음 중 방해를 받거나 잠시 말을 멈춰야 하는 상황에서도 전체 녹음을 종료하지 않고 이어서 녹음할 수 있도록 개선했다.
  * 관련 파일: `src/components/custom/WorkflowInputPanel.tsx`

* **입력 및 설정 안내 UI 범용화**

  * **설정 모달**

    * `currentTemplate.configSchema`에서 Google Drive / Google Sheet 관련 필드가 존재할 때만 관련 안내 문구를 표시하도록 변경했다.
    * 관련 필드가 없는 워크플로우에서는 일반 안내 문구를 표시하여, 이미지 기반 영수증 정리기처럼 Google Drive/Sheet와 무관한 워크플로우에서 혼란이 생기지 않도록 했다.
    * Google Drive/Sheet 판단은 `field.type`의 명시 타입(`google_drive_folder_id`, `google_sheet_id`)과 명확한 key/label 패턴을 기준으로 하며, `folder` 단독 키워드만으로는 판단하지 않는다.
    * 관련 파일: `src/components/custom/UserPersonalSettingsModal.tsx`

  * **입력 패널**

    * `allowedFileTypes`가 명시되지 않은 경우에도 현재 선택된 입력 탭(`audio`, `image`, `file`)에 맞춰 안내 문구가 자연스럽게 표시되도록 개선했다.
    * 오디오, 이미지, 일반 파일 입력이 각각 다른 워크플로우에서 사용되더라도 잘못된 확장자 안내가 노출되지 않도록 했다.
    * 관련 파일: `src/components/custom/WorkflowInputPanel.tsx`

* **타입 무결성 유지**

  * 범용 설정 렌더링에 필요한 `google_drive_folder_id`, `google_sheet_id`를 `ConfigSchemaField.type` 유니온 타입에 좁게 추가했다.
  * `type: string`처럼 느슨하게 확장하지 않고, 허용 가능한 타입만 명시하여 configSchema 타입 검증이 약해지지 않도록 했다.
  * 관련 파일: `src/types/n8lient.ts`

* **운영 원칙**

  * 신규 워크플로우의 결과 수신 이메일은 기본적으로 `reportEmailTo`를 표준 key로 사용한다.
  * 복수 수신자가 필요한 경우 `reportEmailTo` 값에 콤마로 구분하여 입력한다.
  * `buildCompletionNotice` 이메일 key 일반화 작업은 현재 진행하지 않는다.

## 사용자 안내 URL 자동 링크화
  * 결과 상세의 `[06] 처리 결과 요약`을 `[02] 처리 결과 확인`으로 변경하고, 기본 펼침 상태로 표시하도록 정리했다.
  * `processorResult.summary`, `result.summary`, `result.resultUrl`, `processorResult.structuredData.actionLinks`를 사용자용 결과 메시지/링크 표시 기준으로 삼았다.
  * 결과 링크는 `LinkifiedText`와 `ux_link_chip` 기반으로 자동 링크화 및 칩 형태 표시를 적용했다.
  * 사용자에게 보여줄 완료 메시지와 링크는 앱이 만들지 않고, n8n 워크플로우가 callback payload로 생성하는 구조로 확정했다.
  * Gateway는 callback 수신 및 `submissions` 저장만 담당하고, 앱은 `[02] 처리 결과 확인` 섹션에 표시만 담당한다.
  * n8n 커스터마이징 시 AI가 처리 결과 확인 메시지 초안을 작성하고, 사용자 승인 후 callback payload에 반영하도록 절차를 보강했다.
  * 권장 노드 구조는 `[24A] Build User Result Message` → `[24B] Build Success Callback Payload` → `[24C] Gateway Callback`이다.
  * 기초설계서 10종과 커스터마이징 프롬프트 세트에 처리 결과 확인 계약을 최소 보강한 ZIP 세트를 생성했다.
  * 처리 결과 확인 메시지/링크에는 Token, Secret, API Key, OAuth Token 등 민감정보를 포함하지 않도록 보안 기준을 명시했다.

## 신규 워크플로우 배포 시 Webhook 및 Active 검증 규칙
* **n8n 워크플로우 Active 활성화**:
  * 신규 워크플로우(예: `google-calendar-scheduler`)를 배포하거나 업데이트한 경우, n8n 대시보드 우측 상단의 **Active 토글이 반드시 ON**으로 켜져 있는지 확인해야 한다.
  * Active가 켜지지 않은 경우 n8n은 해당 Production Webhook 경로에 대해 HTTP 404 Not Found를 반환하며 게이트웨이 호출 시 `N8N_WEBHOOK_NOT_FOUND` 실패를 기록한다.
* **Production Webhook 경로 확인**:
  * 워크플로우 내부 Webhook 노드의 URL Path가 Firestore `workflowTemplates` 내 `webhookSecretId` (예: `n8lient-google-calendar-scheduler-0-9-0-0`)와 정확히 대소문자 및 하이픈까지 일치하는지 대조한다.
* **자가 격리 검증 (수동 curl)**:
  * 배포 완료 후 다음 curl 명령을 이용해 n8n Production Webhook이 실제로 등록되어 리슨 중인지 외부에서 직접 진단할 수 있어야 한다.
    ```bash
    curl.exe -s -i -X POST "https://n8n.rentaltalk.kr/webhook/n8lient-{webhookSecretId}" -H "Content-Type: application/json" -d "{\"test\":true}"
    ```
  * **판정 기준**:
    * **HTTP 422 또는 정상 수신 응답**: Webhook 리스너가 정상 작동 중이고 Active 상태임 (정상) ✅
    * **HTTP 404 ("The requested webhook is not registered")**: 워크플로우가 Inactive 상태이거나 Webhook 경로 오타 발생 (오류) ❌

## [백로그] 역할별 설정 필드 숨김/고정 정책
  * **필요성 확인**: 워크플로우 종류가 증가함에 따라 하위 역할(회사관리자, 일반 사용자)에 불필요하거나 노출되면 안 되는 민감한 마스터 성향 설정 필드를 숨기거나 고정할 정책적 필요성이 대두됨.
  * **설계 분석**:
    * 현재 스키마에는 `fieldPolicies`나 `operatorFixedSettings` 구조가 정의되어 있지 않음.
    * 단순히 프론트엔드 UI 화면단에서 제외하는 수준으로는 API 직접 주입 우회 우려가 있어, 게이트웨이 `finalSettings` 병합(`mergeAutomationSettings`) 단계에서의 무시/방어 필터링 처리가 필수적임.
    * 도입 시 `clientContracts`/`clientAutomations` 다큐먼트, UI 편집 폼, 설정 병합 유틸, 그리고 필수값(`required`) 검증 유효성 예외 처리까지 공통 영역(App + Gateway + Firestore + validation) 전반에 걸친 유동적 수정이 요구됨.
  * **결정 사항**: MVP 단계에서의 실행 안전성과 회귀 위험을 배제하기 위해 **현재 구현은 보류**하고 기술 백로그로 남김. 추후 설정 고도화 또는 운영자 매핑 폼 리팩토링 진행 시 이 구조적 설계안을 재검토하여 추진할 예정임.

### [2026-06-21] 사용자 결과 메시지 및 링크 처리 UI 정합성 개선

* **결과 요약 → 처리 결과 확인**
  * `[06] 처리 결과 요약` 섹션의 제목을 `[02] 처리 결과 확인`으로 변경하고 기본적으로 펼침(expanded) 상태로 표시하도록 수정했다.
  * 이는 `result.summary` (처리 결과 요약 문구), `result.resultUrl` (구글 시트/드라이브 경로), `processorResult.structuredData.actionLinks` (AI 생성 action 링크 배열) 등 사용자에게 표시될 콘텐츠의 핵심 성격을 더 잘 반영하기 위한 조치이다.
  * 관련 파일: `src/components/custom/UserResultDetailSection.tsx`

* **결과 링크 자동 링크화 및 칩 표시**
  * `result.resultUrl`, `processorResult.summary`, `processorResult.structuredData.actionLinks`에 포함된 URL들은 `LinkifiedText` 컴포넌트를 통해 자동으로 링크화되며, `ux_link_chip` 디자인 패턴을 적용하여 시각적으로 구분되는 칩 형태로 표시되도록 구현되었다.
  * 관련 파일: `src/components/custom/UserResultDetailSection.tsx`

* **결과 데이터 제공 책임 분리 확정**
  * 사용자에게 표시될 완료 메시지 및 링크 데이터 생성 책임은 최종적으로 n8n 워크플로우가 부담하는 것으로 확정되었다.
  * 게이트웨이(`gateway/src/routes/webhook.ts`)는 callback 페이로드 수신 및 `submissions` 컬렉션 저장만 담당하며, 앱은 `[02] 처리 결과 확인` 섹션에 표시되는 내용만 담당한다.
  * n8n 워크플로우 커스터마이징 시에는 AI가 처리 결과 확인 메시지 초안을 작성하고, 사용자의 검토 및 승인 후 callback payload에 반영하는 절차를 표준으로 따르도록 하였다.
  * 권장 n8n 노드 순서는 `[24A] Build User Result Message` → `[24B] Build Success Callback Payload` → `[24C] Gateway Callback`이다.

* **기초설계서 및 프롬프트 세트 업데이트**
  * n8n 기반 기초설계서 10종 전체와 관련 프롬프트 세트에 처리 결과 확인 메시지 및 링크 생성 관련 내용을 최소한으로 보강한 ZIP 세트가 생성되었다.
  * 관련 파일: `n8n-prompt-sets/n8n-basic-design-sets-v2.1.zip`

* **보안 원칙 준수**
  * 처리 결과 확인 메시지 및 링크에 Token, Secret, API Key, OAuth Token 등 민감한 정보가 포함되지 않도록 보안 기준을 명확히 하였다.

* **형식 오류 검증**
  * `[02] 처리 결과 확인` 섹션에서 렌더링되는 `userMessage`가 텍스트가 아닌 잘못된 형식(예: HTML 태그만 있는 문자열)인 경우에도 `UserResultDetailSection` 내에서 안전하게 텍스트로 변환되어 렌더링되도록 하여 뷰어 붕괴(Viewer Collapse)나 무반응 문제를 방지했다.
  * 관련 파일: `src/components/custom/UserResultDetailSection.tsx`

### [2026-06-23] 사용자 개인설정 안내/강조 및 내 설정 상태점 정책 구현

* **개인설정 안내 정책 추가**
  - 회사관리자가 워크플로우 설정 화면(`CompanyAutomationForm.tsx`)에서 각 설정 필드별로 사용자 개인설정의 필요도를 지정할 수 있게 했다. (`없음`, `사용자 직접 설정 필수(required_override)`, `사용자 직접 설정 권고(recommended_override)`)
  - 수집된 가이드 상태는 `clientAutomations` 컬렉션의 `userSettingGuidance` 필드로 통합 저장된다. (Firestore Rules 수정 불필요 확증)
  
* **개인설정 모달 시각적 안내 보완**
  - 사용자 개인설정 모달(`UserPersonalSettingsModal.tsx`)에서 지정된 등급에 따라 배지 및 가이드 경고 문구를 동적으로 출력한다.
    - `required_override` + 누락: 🔴 빨강 `개인 설정 필수` 배지 및 경고 라벨 표시
    - `recommended_override` + 누락: 🟠 주황 `개인 설정 권장` 배지 및 안내 라벨 표시
    - 설정 완료 시: 🟢 녹색 `개인 설정 완료` 배지 표시

* **내 설정 버튼 상태점 연동**
  - 사용자가 실행 대기 화면(`page.tsx`)에서 본인의 설정 완성도를 한눈에 파악할 수 있도록 `🛠️ 내 설정` 버튼 내부에 4단계 우선순위 상태 점을 탑재했다.
    1. 필수 지정 필드 누락 시: 빨간 점 (Pulsing 애니메이션 적용)
    2. 권장 지정 필드 누락 시: 주황 점
    3. 모든 가이드 필드 설정 완료 시: 녹색 점
    4. 안내가 지정되지 않은 경우: 점 표시 없음
  
* **관련 파일**
  - `src/types/n8lient.ts`
  - `src/styles/UX_Design_Setting.css`
  - `src/features/admin/companyAdminService.ts`
  - `src/components/custom/CompanyAutomationForm.tsx`
  - `src/components/custom/UserPersonalSettingsModal.tsx`
  - `src/app/user/execute/page.tsx`

### [2026-06-23] 설정값 조건부 숨김 기능 및 어드민 레이아웃 버그 수정

* **사용자 개인설정 필드 조건부 숨김 (`hide_when_empty`)**
  - 결정: 회사관리자가 각 configSchema 필드에 `설정창 숨김(hide_when_empty)` 토글을 적용할 수 있다.
  - 숨김 조건: 관리자가 숨김 ON + 해당 사용자의 기존 개인설정값 없음 → 사용자 개인설정 모달에서 해당 필드 미표시. 이미 개인설정값이 있으면 숨기지 않고 표시(DB 잔존값이 사용자 모르게 적용되는 문제 방지).
  - 저장 구조: `clientAutomations.userSettingVisibility[fieldKey] = "hide_when_empty"` (값 없으면 보이기)
  - 안내 등급(`userSettingGuidance`)과 독립 운영. 숨김 ON 시 안내 등급은 자동 초기화.
  - Gateway/n8n/Firestore 구조 변경 없음. mergeAutomationSettings/validateExecution 영향 없음.
  - 관련 파일: `src/types/n8lient.ts`, `src/features/admin/companyAdminService.ts`, `src/components/custom/CompanyAutomationForm.tsx`, `src/components/custom/UserPersonalSettingsModal.tsx`

* **회사관리자 폼 토글 UI**
  - `보이기 [토글] 숨김` 형태로 양옆 상태 라벨 표시.
  - 숨김 ON: 주황색, 보이기: 기본 텍스트색(무채색 유지).
  - 설명 줄과 숨김 안내 줄을 동일 자리에서 교체 표시(레이아웃 높이 변화 없이 라벨만 전환).

* **어드민 레이아웃 이중 스크롤 버그 수정**
  - 원인: `body`가 `flex column`인 상태에서 `.ux_admin_app_shell`이 document flow에 포함되어 body 스크롤이 발생.
  - 수정: `.ux_admin_app_shell`을 `position: fixed; inset: 0`으로 전환하여 body flow에서 완전 분리.
  - 모바일(≤1023px)에서는 `position: static`으로 해제하여 자연 스크롤 허용.

* **토글 클릭 시 스크롤 말려 올라가는 버그 수정**
  - 원인: `.ux_toggle_switch_input`이 `position: absolute`인데 부모 `.ux_toggle_switch`에 `position: relative`가 없어 히든 input이 문서 최상단에 위치. 클릭→focus 시 브라우저가 input 위치(최상단)로 스크롤 강제 이동.
  - 수정: `.ux_toggle_switch`에 `position: relative` 추가. CSS 커스텀 체크박스 구현 시 필수 패턴.
  - 관련 파일: `src/styles/UX_Design_Setting.css`

### [2026-06-23] 사용자 실행 화면, 설정 모달 및 자동화 편집 폼 UI 리팩토링

* **물리적 UI 컴포넌트 격리 및 헬퍼 함수 추출**
  - 400줄 제한 프로젝트 룰 준수를 위해 실행 화면(`page.tsx`), 회사 관리자 자동화 편집 폼(`CompanyAutomationForm.tsx`), 사용자 개인설정 모달(`UserPersonalSettingsModal.tsx`)에서 공지 문구 조립 및 상태점 계산 로직을 순수 헬퍼(`resolveCompletionNotice`, `resolveUserSettingGuidanceStatus`)로 격리하고, 에디터 필드 및 보관 정책, 제출 버튼, 디버그 정보 영역을 신규 독립 컴포넌트로 분리하였습니다. 동작 변경 없이 라인 수 감소 및 가독성을 개선하였습니다.

### [2026-06-25] iOS / Safari 음성 녹음 포맷 호환성 보강

* **음성 녹음 포맷 자동 선택 및 명시적 확장자 매핑**
  - **결정**: iOS/Safari 등 `.webm` 녹음을 지원하지 않거나 재생 호환성이 낮은 브라우저 환경을 위해, `MediaRecorder` 생성 시 지원 포맷 후보군(`webm`, `m4a`, `aac`, `mp3` 등)을 검출해 맞춤 생성하고, Blob 및 File 객체의 확장자를 일대일 명시 매핑하여 저장 및 재생 호환성을 개선하였습니다.
  - **이유**: 기존에 `mimeType.split("/")[1]` 방식으로 확장자를 단순 추출할 때, `audio/mp4` 환경에서 `.mp4`로 파일이 생성되어 외부 재생이나 일부 호환성 상의 불이익이 있었던 문제를 해결하고, MediaRecorder 생성 과정의 안전을 도모하기 위함입니다.
  - **관련 파일**: [WorkflowInputPanel.tsx](file:///e:/05.Python_Project/34.n8n-project/%ED%81%B4%EB%9D%BC%EC%9D%B4%EC%96%B8%ED%8A%B8%20%ED%94%84%EB%A1%9C%EA%B7%B8%EB%9E%A8/src/components/custom/WorkflowInputPanel.tsx)
  - **주의사항**: `route.ts`, `n8lient-gateway`, `n8n webhook` 등 서버단 및 검증 파일(validateExecution.ts) 등은 전혀 수정되지 않았습니다. 실기기 환경(Windows Chrome, iPhone Safari 등)에서 선택된 포맷과 확장자가 정상 동작하는지 테스트가 병행되어야 합니다.
  - **최소 검증 기준**: `npx tsc --noEmit` 통과 및 `npm run build` 빌드 통과.

  ### [2026-06-29] 결과데이터 권한관리 정책 및 accessMode 반영

* **결정**

  * N8Lient DB에 저장되는 결과 데이터의 열람 범위는 `accessMode`로 관리한다.
  * 1차 값은 `private` / `company` 두 가지만 사용한다.

    * `private`: 작성자 본인만 DB 결과 열람.
    * `company`: 같은 `clientId`의 회사 구성원이 DB 결과 열람.
  * 외부 공개로 오해될 수 있으므로 `public` 명칭은 사용하지 않는다.

* **retentionPolicy와 accessMode 분리**

  * `retentionPolicy`: 이메일 전송, DB 저장, Storage 보관 여부.
  * `accessMode`: DB에 저장된 결과를 누가 볼 수 있는지.
  * 이메일, 캘린더, Google Drive Optional Export는 `accessMode` 적용 대상이 아니다.
  * `notify_only`는 DB 결과 본문이 저장되지 않으므로 accessMode가 `company`여도 사용자 화면에서는 `DB 결과: 저장 안 함`으로 표시한다.

* **구현 상태**

  * 커밋 `2a11b74`: accessMode 저장 기반 추가.

    * `ResultAccessMode`, `ResultAccessPolicy` 타입 추가.
    * `WorkflowTemplate`, `ClientAutomation`, `Submission`에 권한 필드 추가.
    * 신규 submission 생성 시 accessMode 저장.
    * 우선순위: `clientAutomation.resultAccessPolicy.defaultAccessMode` → `workflowTemplate.resultAccessPolicy.defaultAccessMode` → `private`.
    * 누락/이상값은 `private`으로 fallback.
  * 커밋 `c3d2d61`: 기본 공개값 설정 UI 및 사용자 배지 추가.

    * 오퍼레이터 워크플로우 템플릿 편집 화면에 `DB 결과 열람 범위` 설정 추가.
    * 사용자 실행 화면 워크플로우 선택 영역에 `DB 결과: 저장 안 함 / 개인 보관 / 회사 공개` 배지 표시.
    * 안내 문구: “DB 결과 공개 범위입니다. 이메일·캘린더·Google Drive는 공개 전환 대상이 아닙니다.”

* **마이그레이션**

  * `scripts/dry-run-result-access-migration.ts` 추가.
  * 기존 완료 데이터 중 `accessMode`가 없는 결과를 `company`로 전환하기 위한 대상 산정용 dry-run 스크립트다.
  * 필수 인자: `--clientId`.
  * 실제 Firestore update는 하지 않는다.
  * 실제 공개 마이그레이션은 dry-run 결과 확인 후 별도 승인으로 진행한다.

* **아직 구현하지 않은 것**

  * company 결과 실제 회사공유 조회.
  * 공개/공개취소/관리자 공개철회 UI.
  * Firestore Rules의 company 조회 개방.
  * Firebase Storage 다운로드 권한의 accessMode 연동.
  * n8n, callback payload, retentionPolicy, 이메일 정책 변경.

### [2026-06-29] N8Lient 통합 자료검색 Phase 1 및 AI 지식검색 Phase 2.1 MVP 완료
- **결정**: `knowledgeSearchIndex` 검색 인덱스 구조와 실시간/백필 인덱싱 기법을 도입하고, 지식검색 UI 개선과 함께 Gemini API를 직접 연동하는 AI 지식검색 Phase 2.1 MVP를 구현했다.
- **주요 내용**:
  * **통합 자료검색 Phase 1 완료**:
    * `knowledgeSearchIndex` 컬렉션을 신설하고 N-Gram 2-Gram 기반 `searchTokens`를 도입했다.
    * `beta_testing_company` 기준 기존 submissions 데이터 74건 백필 처리를 완료했다.
    * Cloud Run Gateway 최신화 배포(Revision: `n8lient-gateway-00037-x29`) 후 신규 callback 자동 인덱싱 실증을 완료했다.
    * `/user/data/search` 페이지 내 결과 없음 UX(필터 초기화), 정규식 split 기반 텍스트 하이라이트(제목/요약), 정렬 3종(최신순/오래된순/정확도순), 이모지 없는 워크플로우별 모아보기, 태그 퀵 필터링, 소요시간 표시 보강을 완료했다.
  * **AI 지식검색 Phase 2.1 MVP 추가**:
    * 신규 route: `POST /api/knowledge/ai-search`
    * 신규 화면: `/user/data/ai-search`
    * 사용자의 질문에 맞춰 권한 범위(`private` / `company`) 1차 및 2차 `canReadSubmissionResult` 검증을 거친 근거 문서 본문을 Gemini API에 주입하여 답변을 생성한다.
    * Gemini API 호출 시 Netlify 환경변수 `GEMINI_API_KEY` 설정이 요구되며, 모델명은 `GEMINI_MODEL` (기본값: `gemini-2.5-flash`)로 관리된다.
  * **미변경 및 미구현 영역**:
    * 임베딩(embedding), RAG, 벡터 검색(vector search)은 아직 미구현이다.
    * Firestore Rules, n8n workflow, callback payload, retentionPolicy는 변경하지 않았다.
- **관련 파일**: `src/app/user/data/search/page.tsx`, `src/app/api/knowledge/search/route.ts`, `src/app/user/data/ai-search/page.tsx`, `src/app/api/knowledge/ai-search/route.ts`, `src/components/core/DataPanel.tsx`, `src/styles/UX_Design_Setting.css`
- **커밋 해시**: `997b3bb` (AI 지식검색 MVP 기능 추가 완료)
- **다음 단계**: AI 지식검색 Phase 2.2 고도화 사전설계.
- **최소 검증 기준**: `npx tsc --noEmit` 및 `npm run build` 성공.

### [2026-06-30] N8Lient AI 지식검색 Phase 2 마감 및 Result Data Viewer 추가

* **결정**: AI 지식검색 및 통합 자료검색 결과를 깔끔한 지식 본문 단위로 조회할 수 있는 중앙화된 Result Data Viewer 화면(Phase 2.3)을 추가하고, Phase 2 AI 지식검색 과업을 최종 마감 처리했다.
* **주요 내용**:
  * **Phase 2.1 AI 지식검색 MVP 실증 완료**: `/user/data/ai-search` 및 `/api/knowledge/ai-search`를 통한 근거 기반 Gemini 답변 출력 실증 완료.
  * **Phase 2.2a queryTokens 0개 early return 완료**: 무의미한 단기 쿼리 시 Firestore 탐색 차단 (`7f800ee`).
  * **Phase 2.2b 출처 번호 안정화 완료**: AI 답변 인용 번호와 하단 출처 카드 정보의 1:1 완벽 일치 확보 (`f08446f`).
  * **Phase 2.2c 낮은 관련도 후보 차단 완료**: 불용어 필터 및 스코어 임계점 적용을 통한 무관 지식 카드 노출 차단 (`19d9d24`).
  * **Phase 2.3 중앙화 Result Data Viewer 추가 완료**:
    * 신규 화면: `/user/data/view/[submissionId]`
    * 공통 뷰어 컴포넌트 `ResultDataViewer.tsx`, `ResultDataViewerMeta.tsx`를 통해 지식 본문 뷰를 통합하고 검색 결과 카드 및 AI 출처 카드의 클릭 연결을 이전 상세 모달 대신 해당 화면으로 갱신 완료 (`e371500`).
    * Firebase Storage 물리 주소 및 기타 디버그 메타데이터 노출 방지 처리 (보안 DTO 매핑 적용).
    * 기존 실행 리포트 진입 경로 보존 및 뷰어 하단 접힘(Collapsible) 영역에 리포트 모달 호출 보조 링크 연결.
* **완료 항목 (액션 배지 보강 - Phase 2.3a)**:
  * 본문 복사, 링크 복사, 내부 공유 (권한 정책 준수) 버튼이 지식 본문 우측 상단에 최종 탑재 및 포함된 상태로 정식 유지 릴리즈 완료 (`6a45774`).
* **보류 및 추후 확장 후보 항목**:
  * 외부 공개 공유/shareToken
  * 카카오톡 공유 SDK
* **주요 커밋**:
  * `7f800ee` (2.2a)
  * `f08446f` (2.2b)
  * `19d9d24` (2.2c)
  * `e371500` (2.3)
  * `6a45774` (2.3a)
* **최소 검증 기준**: `npx tsc --noEmit` 및 `npm run build` 성공.

### [2026-06-30] N8Lient Phase 3.1 Result Access Mode UI 추가

* **결정**: Result Data Viewer에서 사용자가 본인 자료의 공개범위(`accessMode`: private <-> company)를 직접 제어하고, 소유권과 정책에 맞춰 회사 구성원 개방 및 개인 보관 전환을 수행할 수 있는 인터페이스 및 서버 검증 로직을 구현했다.
* **주요 내용**:
  * **보안 검증 및 감사 이력 (Audit)**:
    * 신규 엔드포인트 `/api/knowledge/submission-access`를 개설하여 Firebase ID Token, 사용자 승인 상태, 소속사(clientId) 일치 여부, 작성자 소유 여부, 그리고 자동화/템플릿 연계 `ownerCanChangeAccess` 정책을 서버 측에서 7단계로 교차 검증 처리 완료.
    * 공개범위 변경 시 감사 필드 `accessMode`, `accessModeUpdatedAt`, `accessModeUpdatedBy`를 Firestore `submissions` 문서에 자동 기록.
  * **정책 우선순위 조회 구현**:
    * `clientAutomations` 정책을 1차적으로 탐색하고, 없으면 `workflowTemplates` 정책을 2차 조회하며, 둘 다 정의되어 있지 않은 경우 안전 기본값(`ownerCanChangeAccess: false`)으로 강제 차단.
  * **프론트엔드 변경 단추 탑재**:
    * `ResultDataViewerMeta.tsx` 내 배지 우측에 권한 소유자에 한해 `[회사 공개로 전환]` / `[개인 보관으로 되돌리기]` 단추 노출 및 window.confirm 확인 절차 적용.
* **주요 커밋**:
  * `ea0c8df` (Phase 3.1 추가 완료)
* **최소 검증 기준**: `npx tsc --noEmit` 및 `npm run build` 성공.

### [2026-06-30] N8Lient Phase 3.2 Result Access Policy Settings UI 추가

* **결정**: Firestore 수동 백필 및 DB 개입을 거치지 않고, 회사 관리자가 브라우저 자동화 설정 화면에서 직접 각 자동화 인스턴스별 결과 데이터 공개 정책(`resultAccessPolicy`)을 조율할 수 있는 설정 UI와 상속 규칙을 구현했다.
* **주요 내용**:
  * **설정 UI 연동**:
    * 자동화 설정 편집 폼(`CompanyAutomationForm.tsx`)에 공통 정책 설정 뷰(`CompanyAccessPolicySection.tsx`)를 마운트하여 기본 공개범위(`defaultAccessMode`), 작성자 공개범위 변경 허용(`ownerCanChangeAccess`), 관리자 공개철회 허용(`adminCanChangeAccess`) 컨트롤 제공.
  * **동일 계열 상속(Inheritance) 적용**:
    * 신규 버전 자동화 설정 진입 시 동일 `clientId` 내 이전 버전 자동화 설정(버전 접미사를 제외한 `workflowKey` 계열)의 `resultAccessPolicy`를 자동으로 조회하여 1순위 계승. 계열 정책이 없을 시 마스터 템플릿 상속 및 시스템 안전 기본값으로 단계적 롤백 지원.
  * **수정 권한 격리**:
    * 오직 운영자(`operator`) 및 소속 회사 관리자(`company_admin`)만 정책을 변경할 수 있도록 `hasWritePermission` 제어 완료. 일반 사용자는 폼 접근 불가.
  * **Gateway 무수정 준수**:
    * API Route(`execute/route.ts`) 및 Gateway 서버가 이미 `clientAutomation.resultAccessPolicy.defaultAccessMode` 설정을 최우선으로 해석하여 `submissions` 및 `knowledgeSearchIndex` 최초 accessMode를 세팅하도록 구성되어 있음을 동작 실증 완료.
* **주요 커밋**:
  * `d686cb3` (Phase 3.2 추가 완료)
  * `a7719f7` (Phase 3.1a 실시간 인덱스 동기화 반영 완료)
* **최소 검증 기준**: `npx tsc --noEmit` 및 `npm run build` 성공.

---

### [2026-06-30] N8Lient Phase 3.4 관리자형 DataGrid 표준화

* **결정**: 회사 관리자 영역의 주요 5개 목록 화면 전체에 `N8lientDataGrid` 컴포넌트를 표준으로 적용하고, 테이블/헤더/셀/배지/페이지네이션 스타일을 `UX_Design_Setting.css` 중앙 CSS로 완전히 이관했다.

* **적용 범위 (Phase 3.4 A~H 전 구간 완료)**:
  * `/company-admin/knowledge-access` — 자료 공개 관리
  * `/company-admin/users` — 사용자 목록
  * `/company-admin/approvals` — 가입 승인
  * `/company-admin/automations` — 자동화 설정 목록
  * `/company-admin/results` — 실행 로그

* **DataGrid 핵심 표준 (v1)**:
  * `@tanstack/react-table` 기반 클라이언트 페이지네이션.
  * `pageSize` 선택지: 10 / 20 / 50 / 100 (기본 20).
  * 전체 선택은 현재 페이지 기준, `disabled` 행 제외.
  * `meta.headerAlign` / `meta.cellAlign` 컬럼 메타 데이터로 정렬 클래스(`ux_table_th_center` 등)를 className으로만 적용 — inline `textAlign` 사용 금지.
  * 행 hover 스타일, 셀 여백, 배지, 페이지네이션 버튼은 모두 `ux_*` 클래스로 제어.

* **날짜/표시 정책**:
  * `Invalid Date` 표시 금지.
  * `toDateSafe` 유틸로 Firestore Timestamp · string · null 방어 후 `formatCompactDateTime`으로 `YY.MM.DD HH:mm` (24시간제) 형식화.

* **워크플로우 표시명 정책**:
  * `resolveWorkflowDisplayName` + `fetchWorkflowTemplatesByKeys` 조합으로 한글 표시명 변환.
  * 표시 우선순위: `workflowTemplates.name` → `clientAutomations.automationName` → `workflowKey`.
  * 표시 글자수 25자 제한, 초과 시 `…` 말줄임, 원본 `workflowKey`는 `title` 툴팁 유지.

* **실행 로그(`/company-admin/results`) 특이사항**:
  * 소요 시간 계산 헬퍼 `formatDuration` 추가.
  * 기존 `ExecutionResultDetailModal` 유지, Result Data Viewer 이동 기능 추가 없음.

* **CSS 추가 규칙**:
  * `ux_table_text_ellipsis` 클래스 추가 (`white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`).
  * `N8lientDataGrid.tsx` 내부의 `textAlign` inline style 전량 제거.

* **오퍼레이터 링크 수정**:
  * 오퍼레이터 사이드바의 사용자 콘솔 이동 링크를 `/`에서 `/user`로 수정 (리다이렉트 루프 해결).
  * 관련 파일: `src/components/core/OperatorSidebar.tsx`

* **관련 주요 커밋 (최신 15건)**:
  * `d33a6e9` fix: update operator user-console redirect link
  * `10b9a8e` fix: map workflow labels in results grid
  * `6043e4f` fix: use friendly workflow labels in results grid
  * `5a590cd` fix: refine execution results grid columns
  * `74d9c90` fix: prevent line wrapping on automation type column
  * `c3d2d61` fix: refine knowledge access grid columns
  * `3a0f227` fix: remove inline text alignment from data grid
  * `b7ba7b4` fix: refine automation grid column alignment
  * `ee69bed` fix: adjust automation grid column widths
  * `5858357` refactor: apply data grid to admin automation and results pages
  * `000b983` refactor: apply data grid to company approvals page
  * `1c94f05` fix: resolve maximum update depth exceeded error in data grid
  * `c367e98` fix: move data grid row cursor style to CSS
  * `7a0b124` refactor: apply data grid to company users page
  * `5318555` fix: limit data grid select all to current page

* **아직 적용하지 않은 영역**:
  * 서버 사이드 페이지네이션 전환 (현재 클라이언트 페이지네이션).

* **최소 검증 기준**: `npx tsc --noEmit` 및 `npm run build` 성공.

### [2026-07-01] N8Lient Phase 3.5 오퍼레이터 화면 DataGrid 표준 적용

* **결정**: 오퍼레이터 영역의 주요 3개 테이블/리스트 화면 전체에 `N8lientDataGrid` v1 표준을 적용했다.
* **적용 범위**:
  - `/operator/clients` (고객사 관리 목록)
  - `/operator/contracts` (워크플로우 매핑 목록)
  - `/operator/workflow-templates` (워크플로우 템플릿 목록)
* **내용**:
  - 기존 수동 HTML `<table>` 레이아웃 구조를 제거하고 표준 `N8lientDataGrid` v1 공통 컴포넌트 탑재.
  - 가로폭 크기(size), 헤더 및 셀 정렬 메타(`meta.headerAlign`, `meta.cellAlign`) 설정.
  - `N8lientStatusBadge` 표준 배지 적용 및 상태값 매핑 통일.
  - 상세 탭 내부에 있는 단순 통계 및 에러 요약 등의 정보성 단순 테이블들은 기존 구조를 보존하여 불필요한 공통 컴포넌트 강제 적용을 배제함.
* **최소 검증 기준**: `npx tsc --noEmit` 성공.

### [2026-07-01] N8Lient Phase 3.6 사용자 자료 결과 UI 표준화

* **결정**: 사용자 자료 검색 및 상세 결과 뷰어 화면의 카드/본문 UI 표준화를 위해 `N8lientResultList`, `N8lientResultCard` 공통 컴포넌트를 설계하고 `UX_Design_Setting.css` 중앙화 CSS 클래스를 통해 화면 시각 통일성을 완성했다.
* **적용 범위**:
  - `/user/data/search` (통합 자료검색 결과 목록)
  - `/user/data/ai-search` (AI 지식검색 인용 출처 목록)
  - `/user/data/view/[submissionId]` (Result Data Viewer 상세 본문 뷰어)
* **내용**:
  - 템플릿명, 공개 범위 배지, 제목 하이라이팅, 요약 본문, 태그/키워드 목록, 소요시간 및 소유자, 날짜 메타 영역을 모듈화한 `N8lientResultCard` 적용.
  - `N8lientResultList`를 통해 데이터 로딩(`N8lientLoadingState`) 및 빈 상태(`N8lientEmptyState`) 구조를 통일하고, 0-based index 콜백 구조를 지원해 AI 지식검색 인용 출처 `[자료번호 N]` 순서 바인딩 유지.
  - 상세 뷰어 UI에 `N8lientStatusBadge` 표준 컴포넌트를 이식하고, 중앙 CSS에 `ux_viewer_wrap`, `ux_viewer_header`, `ux_viewer_title`, `ux_viewer_meta`, `ux_viewer_content`, `ux_viewer_actions` 클래스를 추가하여 카드형 디자인과의 시각적 연결성 구축.
  - 기존 Firebase 조회 권한 검증, accessMode 변경(공개/비공개 전환 및 관리자 강제 철회), 본문/링크 복사 및 공유 기능, `/user/data/view/[submissionId]` 이동 구조는 기존 로직 그대로 무결 보존.
* **최소 검증 기준**: `npx tsc --noEmit` 성공.


