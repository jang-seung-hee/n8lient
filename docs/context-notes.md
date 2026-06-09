# 개발 컨텍스트 및 의사결정 기록

## 2026-06-07: Next.js React TypeScript 초기 환경 구축

### 1. 임시 프로젝트(`temp-next-app`)를 통한 세팅 결정
* **배경**: 현재 작업 루트 디렉터리에 `.agents`, `.doc`, `AI 개발 표준 및 바이브 코딩 규정 V1.0` 파일이 이미 존재했습니다. `create-next-app` 명령어는 대상 디렉터리가 비어 있지 않으면 생성을 중단하거나 덮어쓸 위험이 있습니다.
* **의사결정**: 충돌을 미연에 방지하기 위해 임시 디렉터리(`temp-next-app`)에 우선 프로젝트를 빌드한 후, 수동으로 파일 목록을 대조하며 루트 디렉터리로 이동 및 병합하는 방식을 도입했습니다.

### 2. .gitignore 파일의 점검 및 병합
* **배경**: 기존 루트에 `.gitignore`가 없었으나 새로 생성된 `.gitignore`에는 보안 규정이 미흡할 수 있었습니다.
* **의사결정**: 임시 폴더에서 이동된 `.gitignore` 파일에 바이브 코딩 규정 v1.0의 보안 규칙(환경변수 세부 파일, 키 파일, 인증 자격 증명서 및 `.zip`, `.rar`, `.7z` 등 모든 압축 파일들의 원천 차단)을 하단에 명시적으로 덧붙여 병합했습니다.

### 3. AGENTS.md 및 CLAUDE.md의 분석 및 보존
* **배경**: `create-next-app`이 AI 에이전트 전용 가이드 파일인 `AGENTS.md`와 `CLAUDE.md`를 생성했습니다.
* **의사결정**: 이 파일들은 AI 에이전트가 최신 Next.js 규칙을 준수하도록 유도하므로, 기존의 로컬 `AI 개발 표준 및 바이브 코딩 규정 V1.0` 문서와 서로 보완 역할을 합니다. 따라서 기존 규칙 파일과 함께 모두 보존하며, 다른 에이전트도 로컬 규정을 함께 읽을 수 있도록 `AGENTS.md`에 안내 문구를 추가 통합했습니다.

## 2026-06-07: Firebase SDK 초기 연동 및 방어 로직 구현

### 1. Firebase 에이전트 스킬 활용 결정
* **배경**: Firebase 연동 작업을 진행하기 위해 `npx skills`를 통해 `firebase/agent-skills@firebase-basics`를 탐색 및 설치하여 공식 개발 모범 사양을 적용했습니다.
* **의사결정**: 이번 단계에서는 `firebase-basics`만 사용하여 기본적인 SDK 구성과 환경변수 파일 배치만 진행하며, Auth나 Firestore 등 상세 비즈니스 기능의 모듈과 스킬은 후속 단계로 분리하여 최소 구현 원칙을 지켰습니다.

### 2. Firebase SDK 환경변수 누락 대비 방어 로직 구축
* **배경**: Firebase의 인증 키 및 설정값은 하드코딩이 엄격히 금지됩니다. 그러나 환경변수 파일이 누락되거나 로드되지 않을 경우 프로젝트 빌드나 런타임 시 치명적인 에러가 발생하여 전체 서비스가 정지될 수 있습니다.
* **의사결정**: `src/lib/firebase.ts`에 필수 환경변수 목록을 사전에 정의하고, 누락 여부를 검사하여 런타임 경고(`console.warn`)를 띄우며, 빈 값으로 발생할 수 있는 초기화 에러를 방지하기 위해 싱글톤 패턴(`getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()`)과 에러 발생 시 임시 더미 객체로 복구하는 방어 로직을 구현했습니다.

## 2026-06-07: N8Lient MVP Phase 1A — TypeScript 타입 정의 및 목(Mock) 데이터 구성

### 1. 타입 정의를 DB 규약 문서 기준으로 먼저 작성하는 이유
* **배경**: MVP 기획설계서와 DB/n8n 연동규약이 `clientId`, `uid`, `workflowKey`, `submissionId` 등의 핵심 ID 체계와 `configSchema.key === clientAutomations.settings.key === n8n.settings.key` 동치 규칙을 명확하게 정의하고 있습니다.
* **의사결정**: 이 핵심 규약을 TypeScript 인터페이스로 먼저 고정하고, 이후 Firestore 연동(Phase 1C), n8n 실행(Phase 3) 단계에서 타입 기반으로 개발하면 잘못된 필드명이나 구조적 오류를 컴파일 단계에서 차단할 수 있습니다.

### 2. Phase 1A에서 실제 Firebase 연동을 배제하는 이유
* **배경**: Firebase 프로젝트의 실제 API 키가 아직 `.env.local`에 입력되지 않은 상태입니다.
* **의사결정**: 타입 정의와 mock 데이터 구성은 Firebase 의존성 없이 빌드 검증이 가능합니다. 실제 Auth/Firestore 연동은 Phase 1B ~ 1C에서 단계적으로 진행하여 작업 범위를 최소화하고 각 단계별 빌드 안정성을 독립적으로 확인합니다.

### 3. Webhook 보안 계층 결정
* **결정**: 브라우저에서 n8n Webhook URL을 직접 호출하거나 코드에 노출하는 구조는 금지합니다. Phase 3 이전에 Netlify Function 또는 서버리스 게이트웨이를 먼저 구현하는 것을 확정합니다.

## 2026-06-07: N8Lient MVP Phase 1B — Google Auth 로그인/로그아웃/상태감지 구현

### 1. Phase 1B 구현 범위를 Auth 전용으로 제한하는 이유
* **배경**: Google Auth 로그인, 로그아웃, 상태감지는 Firestore 컬렉션 없이도 독립적으로 구현하고 테스트할 수 있습니다.
* **결정**: Phase 1B는 `firebase/auth`의 `onAuthStateChanged`, `signInWithPopup(GoogleAuthProvider)`, `signOut`만 구현합니다. Firestore `users` 컬렉션 생성 및 저장은 Phase 1C로 분리하여 단계별 빌드 안정성을 유지합니다.

### 2. 로그인 후 role/approvalStatus 처리
* **결정**: Firebase Auth에서는 `displayName`, `email`, `photoURL`만 읽습니다. `role`과 `approvalStatus`는 Phase 1B에서 Firestore를 조회하지 않으며, Phase 1C에서 Firestore `users` 컬렉션과 연동할 때까지 mockData 구조를 참고 기준으로만 유지합니다.

### 3. Auth 컨텍스트 구조 설계 방향
* **결정**: `AuthProvider.tsx`(Context 제공자)와 `useAuthUser.ts`(훅)를 `src/features/auth/`에 분리하여, 이후 Phase 1C의 Firestore 연동 시 `useAuthUser.ts` 내부만 확장하면 기존 컴포넌트 코드를 건드리지 않아도 되는 구조를 만듭니다.

## 2026-06-07: Firebase Google Auth 로컬 테스트 및 이미지 로딩 오류 해결

### 1. Next.js Image 컴포넌트의 외부 도메인 허용 설정
* **배경**: Google 로그인 후 받아온 프로필 이미지(`lh3.googleusercontent.com` 호스트)를 `next/image` 컴포넌트로 렌더링 시, 보안 및 최적화 정책에 의해 호스트 등록 오류가 발생했습니다.
* **의사결정**: `next.config.ts` 파일의 `images.remotePatterns` 배열에 해당 호스트(`lh3.googleusercontent.com`)를 추가하고, 프로토콜(`https`)을 명시하여 정상적으로 이미지를 원격에서 불러올 수 있도록 해결했습니다.

## 2026-06-07: N8Lient MVP Phase 1C — Firestore 사용자 문서 생성 및 회사코드 승인요청 플로우

### 1. 회사코드 조회 전용의 룩업 컬렉션 분리 (`companyCodeLookups`)
* **배경**: 일반 사용자가 `clients` 컬렉션 전체를 쿼리할 수 있도록 허용하는 것은 기업 보안상 취약할 수 있습니다.
* **결정**: 회사코드 검증을 위해 `companyCodeLookups/{normalizedCompanyCode}` 문서 조회를 수행하도록 아키텍처를 변경했습니다. 이 룩업 테이블은 `{ clientId, companyName, companyCode, status }` 만을 포함하여 보안 위협을 원천 차단합니다.

### 2. 결정형 문서 ID 기반의 승인 요청 관리
* **배경**: 동일한 사용자가 특정 회사로의 가입 승인 요청을 중복해서 제출하는 오동작을 컴팩트하게 걸러내야 했습니다.
* **결정**: `companyJoinRequests` 문서 ID를 `{uid}_{clientId}`로 고정하여 동일한 사용자가 특정 회사에 대해 이미 보낸 요청이 있는지 빠르게 1회 단일 조회로 파악하며, `writeBatch`를 통해 `users` 업데이트와 `companyJoinRequests` 생성을 트랜잭션 단위로 안전하게 묶어 처리합니다.

### 3. 서비스 로직의 격리 (`authUserService`, `companyJoinService`)
* **배경**: Firestore CRUD 로직이 React 컨텍스트 제공자(`AuthProvider.tsx`)에 난잡하게 구현될 경우, 파일 크기가 400줄 규칙을 어길 우려가 있고 결합도가 과하게 올라갑니다.
* **결정**: Firestore 연동 함수를 `authUserService.ts` 및 `companyJoinService.ts`와 같이 별도 파일로 분리하고, `AuthProvider.tsx`는 컨텍스트 상태 관리 및 이벤트를 바인딩하여 뷰 계층과 비즈니스 로직을 완벽하게 분리했습니다.

### 4. users.clientId의 null 초기화
* **배경**: 빈 문자열(`""`)은 타입스크립트 및 데이터 명세서에서 유효하지 않은 포맷을 띄거나 혼선을 빚을 수 있습니다.
* **결정**: 초기 사용자의 `clientId` 속성은 `null`로 세팅하여 명확한 누락 상태를 표기하며, 이에 따라 TypeScript `UserDoc` 정의에서도 `clientId?: ClientId | null`로 타입을 완화했습니다.

## 2026-06-07: N8Lient MVP 알파 스프린트 (통합 개발)

### 1. 일련의 피처(Feature) 동시 개발 결정
* **배경**: 프로젝트를 지나치게 잘게 쪼개는 방식 대신, 백본 아키텍처와 라우팅 구조가 잡힌 상태이므로 한 번에 알파 버전 전체 플로우를 구성하여 수동 연계 검증 속도를 높입니다.
* **결정**: 사용자, 회사 관리자, 운영자 총 3가지 권한의 라우트 및 콘솔 레이아웃을 동시에 구현하며, 실제 데이터 검증이 필요한 회사 관리자 승인 기능(writeBatch 처리)을 완성하고 나머지 관리/운영 및 실행 결과 화면은 Mock 또는 기본 뷰 형태로 구성합니다.

### 2. 사용자용 PC 레이아웃 내 하단 메뉴 보존
* **배경**: UI 디자인 가이드에 따르면 PC에서도 사용자 화면은 관리자형 사이드바가 아니라, 하단 메뉴와 좌측 [데이터 분석활용] 패널을 병행하는 컴팩트 구조를 유지하도록 가이드되어 있습니다.
* **결정**: 반응형 중단점(1024px)에 맞춰 PC 화면인 경우 좌측 데이터 패널(통자요, 회의록 등)을 노출하고, 하단 내비게이션 바(홈, 실행, 결과, 내정보)는 모바일과 동일하게 유지해 디자인 일관성을 지킵니다.

## 2026-06-07: N8Lient MVP 베타 스프린트 (자동화 설정 및 요청 저장)

### 1. Firestore Rules 조건 강화 및 일반 사용자 쓰기 제한
* **배경**: 일반 사용자가 클라이언트 SDK 조작을 통해 본인의 `role`이나 `approvalStatus`, `clientId`를 임의로 조작하거나, 다른 회사 또는 타인의 자동화 실행 이력을 조회/생성하는 위협을 방지해야 합니다.
* **결정**: `users/{uid}`의 update 시 `role`, `clientId`, `approvalStatus`의 임의 변조를 차단하고, `submissions` 생성 시 `uid`와 `clientId`를 로그인 세션 정보(`request.auth.uid`, `getMyUser().clientId`)와 엄격하게 대조 검증하며 `status`는 무조건 `"queued"`로 세팅되게끔 Rules를 구성했습니다.

### 2. 동적 설정 입력 폼 생성 설계
* **배경**: 각 자동화 종류(`workflowTemplates`)는 각기 다른 설정값(Settings)을 요구합니다.
* **결정**: 하드코딩 폼을 탈피하고, 계약된 템플릿의 `configSchema` 목록을 조회하여 각 key 타입에 따라 렌더러를 동적으로 전환하며 필수 항목을 런타임에서 엄격하게 검증하여 `clientAutomations`에 settings를 저장하는 구조를 수립했습니다.

## 2026-06-07: N8Lient MVP 베타-2 스프린트 (운영자 자동화 등록 및 배정)

### 1. 운영자 입력값 검증 패턴 설계
* **배경**: 운영자가 템플릿의 `workflowKey` 및 `configSchema.key`를 잘못 등록할 경우(예: 한글 포함, 공백 포함 등) n8n 연동이나 회사별 설정 세팅 과정에서 치명적인 런타임 매핑 오류가 발생할 수 있습니다.
* **결정**: 
  - `workflowKey`는 영문 소문자, 숫자, 하이픈만 허용하는 `/^[a-z0-9-]+$/` 정규식 검증과 Firestore 중복 등록 금지 검사 적용.
  - `configSchema.key`는 lowerCamelCase 권장 및 공백/한글/특수문자 금지 정규식 `/^[a-zA-Z0-9]+$/` 검증을 런타임에 강제 적용하여 휴먼 에러를 방지했습니다.

### 2. clients 직접 조회 권한의 분리
* **배경**: 일반 사용자가 가입 신청 시에는 회사 정보 노출 최소화를 위해 `companyCodeLookups`를 거칩니다. 반면 운영자는 계약 배정을 위해 전체 회사 목록이 필요합니다.
* **결정**: `clients` 목록의 직접 대량 조회(list)는 `/operator` 화면 영역으로만 한정하고 일반 사용자의 진입 라우트에서는 절대 수행되지 않도록 화면 조회를 완벽히 격리했습니다.

## 2026-06-07: N8Lient MVP 베타-3 스프린트 (템플릿 수정/복제 및 Webhook 참조)

### 1. 배포된 템플릿 수정 정책 (Key Lock) 수립
* **배경**: 운영자가 이미 고객사에 배정되어 실사용 중인 자동화 템플릿의 `workflowKey`나 기존 `configSchema.key`를 임의로 수정/삭제해버릴 경우, Firestore의 기존 회사 설정(`clientAutomations.settings`) 데이터 구조와 매핑이 깨져 자동화 작동 불능 오류가 연쇄적으로 발생할 수 있습니다.
* **결정**: 
  - 수정 모드 시 `workflowKey` 변경 창을 `disabled`로 봉인하고, 기존 스키마 필드의 `key` 수정 및 삭제 버튼을 완전히 감추는 Key Lock 정책을 수립했습니다.
  - 근본적으로 큰 구조 변화를 원할 시에는 `수정`이 아닌 `복제` 기능을 이용해 새로운 `workflowKey`를 부여한 신규 자동화로 파생 등록하도록 가이드하여 호환성을 보호했습니다.

### 2. Webhook 정보의 물리적 격리 원칙 유지
* **배경**: n8n Webhook URL이나 토큰을 Firestore 문서에 노출하거나 프론트 코드에 저장하면 보안 위협이 급증합니다.
* **결정**: 
  - `workflowTemplates`에는 보안 유출을 방지하기 위해 오직 `n8nServerKey` (기본값 `"main"`)와 `webhookSecretId` (기본값은 `workflowKey`와 동일)라는 논리 참조 필드만 저장하도록 한정하고, 실제 URL 바인딩은 향후 서버리스(Serverless) 영역의 환경변수 혹은 Secret 저장소에 물리 격리하여 매핑합니다.
## 2026-06-07: N8Lient MVP 감마 스프린트 (서버리스 실행 게이트웨이 및 콜백 구조)

### 1. execute API와 callback API를 2개로 분리한 이유
* **배경**: n8n은 HTTP Request 노드로 응답을 보낼 수 있지만, 실제 긴 자동화의 경우 실행 시간이 HTTP 타임아웃(15초)'을 초과할 수 있습니다. 얼마나 오래 걸릴지 사전에 알 수 없습니다.
* **결정**: execute API는 "n8n에 실행을 의뢨하는 웹훅을 스오하는 업무"만 담당하고 (상태: processing), callback API는 "n8n이 완료 후 돌아와 결과를 올리는 업무"를 담당하는 (success/failed) 충소적 역할 분리를 했습니다. n8n이 담당하는 실제 실행 시간 동안 HTTP 커넥션을 유지하지 않아 타임아웃 위험을 완전히 제거함니다.

### 2. Webhook URL의 환경변수 보관 가이드
* **결정**: `workflowTemplates` Firestore 문서에는 `webhookSecretId` (예: `"expense-report"`).와 `n8nServerKey` (예: `"main"`) 같은 논리 참조 키만 저장합니다. 실제 Webhook URL은 서버에서 `N8N_WEBHOOK_URL_{WEBHOOK_SECRET_ID 대문자}` 패턴으로 환경변수에서 가져옵니다. MVP 보문에는 `expense-report` 자동화 1건만 실제 연결하면 칩니다.

### 3. Firebase Admin SDK를 서버 사이드에서만 사용하는 이유
* **결정**: Firestore Client SDK는 커넥션을 브라우저에 노즘하기 때문에 커넼턴 권한 제한에 결련될 수 있습니다. callback API는 n8n가 실행하는 서버 사이드 요청이며, Firestore 보안 규칙(Rules)에 자동화 실행쟚(n8n은 인증된 사용자가 아님) 영역에서의 쓰기 권한이 없습니다. 따라서 callback API는 Firebase Admin SDK를 사용하여 Firestore에 직접 쓰는 권한이 필요합니다.

### 4. getIdToken()을 사용한 커똄트 인증 전달 이유
* **결정**: 브라우저에서 `/api/automation/execute` 호출 시 `user.getIdToken()`을 통해 Firebase ID Token을 획득하고 Authorization Bearer 헤더로 전달합니다. 서버에서 Firebase Admin의 `verifyIdToken()`으로 검증하여 uid를 안전하게 확인합니다. 이를 통해 브라우저에서 uid, clientId를 body에 담아 보낼 필요가 없어 파라미터 위조 위험을 제거합니다.

## 2026-06-08: n8n 워크플로우 연동 가이드 문서화 작업

### 1. n8n 워크플로우 개발자를 위한 가이드라인 체계화
* **배경**: 엔팔라이언트의 시스템 설계와 n8n 엔진 간의 인터페이스 규약이 실제 구현(게이트웨이 API, Firestore 보안 규칙) 수준과 정확히 부합하는 실무 문서가 부재했습니다.
* **의사결정**:
  * `N8Lient_MVP_구조개요서.md`: 전체 목적, 역할 격리, 핵심 라이프사이클 및 화면 구성을 총괄 정의.
  * `N8Lient_DB_연동규약서.md`: Firestore 컬렉션 필드, 문서 ID 패턴, 상태값 범위, 그리고 핵심 사상인 스키마 동치 관계(configSchema.key == clientAutomations.settings.key)를 명문화.
  * `N8Lient_Webhook_Callback_연동규약서.md`: execute/callback API의 통신 흐름, 페이로드 명세, 보안 인증 조건 및 환경변수 치환 규칙을 구체적 예시와 함께 가이드화.
* **효과**: 향후 추가 워크플로우 개발 시 이 3종 문서를 기준으로 규약을 맞추고 검증하여 불필요한 매핑 실수를 방지할 수 있게 되었습니다.

## 2026-06-09: N8Lient Gateway 환경설정 구조 단순화 및 Webhook Path 자동 조합 리팩터링

### 1. 워크플로우별 Webhook Path 환경변수 의존 제거
* **배경**: 기존에는 새로운 N8N 워크플로우를 등록할 때마다 Gateway 배포 파일인 `env.yaml`을 수정하고 Cloud Run 환경변수를 다시 배포해야 하는 복잡함이 존재했습니다.
* **의사결정**: `workflowTemplates.webhookSecretId`를 기반으로 기본 `/webhook/{webhookSecretId}` 경로를 자동 조합하도록 변경했습니다. 이를 통해 동일한 n8n 서버를 사용하는 한, 환경변수 변경 없이 새로운 워크플로우를 자유롭게 추가할 수 있는 구조를 확립했습니다.

### 2. 예외적 오버라이드 및 정규식 검증 도입
* **배경**: 일부 특수 워크플로우에서 기존의 레거시 웹훅 경로나 특수 경로를 유지해야 할 상황이 있을 수 있습니다. 또한, 사용자가 이상한 문자를 `webhookSecretId`에 주입하면 보안/URL 파싱 취약점이 생길 수 있습니다.
* **의사결정**: 
  - `N8N_WEBHOOK_PATH_OVERRIDE_{SANITIZED_SECRET_ID}` 환경변수가 있을 시 해당 경로를 1순위로 사용하게 오버라이드 설정을 지원합니다.
  - `webhookSecretId`는 정규식 `/^[a-z0-9_-]+$/`를 통해 영문 소문자, 숫자, 하이픈, 언더스코어만 허용하도록 강제 검증하고, 빈 값 또는 슬래시`/`, 공백, `https://` 등 부적절한 값은 에러로 처리하여 차단합니다.
  - `n8nServerKey`에 대해서도 `/^[a-zA-Z0-9_-]+$/` 규칙으로 영문 대소문자, 숫자, 하이픈, 언더스코어만 허용하도록 검증을 보강했습니다.

### 3. env.yaml 파일의 루트 이동 및 예시 템플릿 제공
* **배경**: 기존에는 `n8lient-gateway` 디렉토리 내에 `env.yaml`을 두고 관리하여 프로젝트 루트의 `.env.local`과 비교하거나 배포 명령을 내릴 때 경로 혼선이 있었습니다.
* **의사결정**: `env.yaml`을 프로젝트 루트로 일괄 이동하여 루트에서 `.env.local`과 나란히 상태를 볼 수 있게 하였고, 실제 자격증명 비밀값이 노출되지 않도록 주석이 포함된 `env.yaml.example` 및 `.env.local.example` 파일을 개발자용 예시로 배포하였습니다.
