# N8Lient_HANDOFF_CONTEXT.md

> 목적: ChatGPT와 같은 외부 LLM AI의 새 대화창에서 N8Lient 개발을 이어가기 위한 인수인계 컨텍스트 문서.
> 사용법: 새 채팅 첫 메시지에 이 파일을 붙이거나, `docs/N8Lient_HANDOFF_CONTEXT.md를 먼저 읽고 현재 정책을 기준으로 답변하라`고 지시한다.
> 주의: 이 문서는 개발 AI(예: Antigravity, Codex 등)가 자동으로 따라야 하는 실행 지시서가 아니다. 개발 AI가 이 문서를 참고해야 할 경우에는 사용자가 명시적으로 참조를 지시한다.
> 운영 방식: 중요한 프로젝트 정책 변경, 구조 변경, 권한 정책 변경, 데이터 모델 변경이 발생하면 이 문서에 핵심 결정만 요약해 기록한다.

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

