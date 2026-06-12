# 개발 작업 체크리스트

## 2026-06-07: Next.js React TypeScript 초기 환경 구축
- [x] 기존 디렉터리 구조 조사 및 파일 백업
- [x] npx create-next-app을 활용한 임시 프로젝트 생성
- [x] 루트 디렉터리와 임시 프로젝트 파일 간 충돌 검증
- [x] 임시 디렉터리에서 루트로 파일 안전 병합 (기존 규정 파일 보존)
- [x] 보안 가이드라인 준수를 위한 .gitignore 파일 병합
- [x] AI 에이전트 표준 가이드 문서(AGENTS.md) 로컬 통합 및 업데이트
- [x] 임시 폴더 삭제 및 환경 정리
- [x] 작업 기록 문서(dev-checklist.md, context-notes.md) 및 공통 설정 파일(siteConfig.ts) 작성
- [x] npm run build 실행을 통한 전체 프로젝트 빌드 검증 및 보고

## 2026-06-07: Firebase SDK 초기 연동 및 방어 로직 구현
- [x] npx skills를 활용하여 `firebase/agent-skills@firebase-basics` 탐색 및 설치
- [x] firebase 라이브러리 설치 (`npm install firebase`)
- [x] 환경변수 템플릿 파일(.env.local.example) 생성 (키 이름만 포함)
- [x] 로컬 환경변수 파일(.env.local) 생성 (더미값 포함 및 Git 추적 제외 확인)
- [x] Firebase SDK 초기화 파일(src/lib/firebase.ts) 생성 (방어 로직 및 한국어 파일 주석 작성)
- [x] .gitignore 보안 차단 규칙 최종 검증
- [x] docs/dev-checklist.md 및 docs/context-notes.md에 작업 기록 작성
- [x] npm run build 실행을 통한 빌드 안정성 재검증 및 최종 보고

## 2026-06-07: N8Lient MVP Phase 1A — TypeScript 타입 정의 및 목(Mock) 데이터 구성
- [x] DB/n8n 연동규약 v0.1 기반 TypeScript 타입 정의 파일 생성 (`src/types/n8lient.ts`)
- [x] mock 사용자, mock 자동화, mock submission 데이터 생성 (`src/mocks/mockData.ts`)
- [x] `npm run build` 실행 및 빌드 성공 검증

## 2026-06-07: N8Lient MVP Phase 1B — Google Auth 로그인/로그아웃/상태감지 구현
- [x] `src/lib/firebase.ts`에 Auth 인스턴스 및 GoogleAuthProvider 추가
- [x] `src/features/auth/useAuthUser.ts` 생성 (onAuthStateChanged 기반 훅)
- [x] `src/features/auth/AuthProvider.tsx` 생성 (앱 전체 Auth 컨텍스트)
- [x] `src/features/auth/LoginButton.tsx` 생성 (Google 로그인 버튼)
- [x] `src/features/auth/LogoutButton.tsx` 생성 (로그아웃 버튼)
- [x] `src/app/layout.tsx` 수정 (AuthProvider 래핑, 메타데이터 N8Lient로 변경)
- [x] `src/app/page.tsx` 수정 (로그인/로그아웃 상태에 따른 조건부 렌더링)
- [x] `npm run build` 실행 및 빌드 성공 검증
38: 
39: ## 2026-06-07: Firebase Google Auth 로컬 테스트 및 이미지 로딩 오류 해결
40: - [x] `next.config.ts`에 `images.remotePatterns` 설정 추가 (`lh3.googleusercontent.com`)
41: - [x] `npm run build` 실행을 통해 설정 파일 수정 후 빌드 안정성 재검증 및 보고
41: 
42: ## 2026-06-07: N8Lient MVP Phase 1C — Firestore 사용자 문서 생성 및 회사코드 승인요청 플로우
43: - [x] `src/lib/firebase.ts`에 Firestore `db` 인스턴스 초기화 및 export 추가
44: - [x] `src/types/n8lient.ts`에서 UserDoc의 `clientId` 타입을 `ClientId | null`로 조정
45: - [x] Firestore 연동을 비즈니스 로직에서 분리하여 서비스 파일 생성
46:   - [x] `src/features/auth/authUserService.ts` (사용자 조회, 생성, 실시간 구독)

## 2026-06-07: Firebase Google Auth 로컬 테스트 및 이미지 로딩 오류 해결
- [x] `next.config.ts`에 `images.remotePatterns` 설정 추가 (`lh3.googleusercontent.com`)
- [x] `npm run build` 실행을 통해 설정 파일 수정 후 빌드 안정성 재검증 및 보고

## 2026-06-07: N8Lient MVP Phase 1C — Firestore 사용자 문서 생성 및 회사코드 승인요청 플로우
- [x] `src/lib/firebase.ts`에 Firestore `db` 인스턴스 초기화 및 export 추가
- [x] `src/types/n8lient.ts`에서 UserDoc의 `clientId` 타입을 `ClientId | null`로 조정
- [x] Firestore 연동을 비즈니스 로직에서 분리하여 서비스 파일 생성
  - [x] `src/features/auth/authUserService.ts` (사용자 조회, 생성, 실시간 구독)
  - [x] `src/features/auth/companyJoinService.ts` (회사코드 검증, 중복요청 체크, batch 원자적 쓰기)
- [x] `src/config/siteConfig.ts`에 회사코드 입력폼 및 승인 대기 화면용 중앙 제어 문구 추가
- [x] `src/features/auth/AuthProvider.tsx`에 `userDoc` 상태 추가 및 실시간 구독/자동생성 연동
- [x] Compact UI 디자인 규칙을 따르는 `CompanyCodeForm.tsx` 컴포넌트 구현
- [x] 승인대기 안내 및 로그아웃이 연동된 `PendingApproval.tsx` 컴포넌트 구현
- [x] `src/app/page.tsx` 메인 화면을 userDoc의 `approvalStatus`에 따라 조건부 렌더링되도록 조립
- [x] `npm run build` 실행 및 빌드 오류 0개 검증 완료

## 2026-06-07: N8Lient MVP 알파 스프린트 (통합 개발)
- [x] docs/dev-checklist.md 및 docs/context-notes.md에 스프린트 계획 기록
- [x] `/company-admin` 승인 처리 기능 및 서비스 구현
- [x] 사용자용 전체 라우트 구현 (`/user`, `/user/execute`, `/user/results`, `/user/profile`)
- [x] 사용자용 데이터 분석활용 페이지 구현 (`/user/data/*`)
- [x] 사용자용 모바일/PC 통합 레이아웃 및 하단 바텀 메뉴 구현
- [x] 회사 관리자용 콘솔 레이아웃 및 페이지 구현 (`/company-admin/*`)
- [x] 운영자용 콘솔 레이아웃 및 페이지 구현 (`/operator/*`)
- [x] 메인 라우트(`/`)의 역할 및 승인 상태별 라우팅 처리
- [x] `npm run build` 검증 및 수동 테스트 진행

## 2026-06-07: N8Lient MVP 베타 스프린트 (자동화 설정 및 요청 저장)
- [x] docs/dev-checklist.md 및 docs/context-notes.md에 베타 스프린트 계획 기록
- [x] 서비스 레이어 구현 (`userService.ts`, `operatorService.ts` 생성 및 `companyAdminService.ts` 확장)
- [x] Firestore 보안 규칙 (`firestore.rules`) 권한 조건 강화 및 배포
- [x] 운영자 페이지 자동화 템플릿 및 계약 목록 연동
- [x] 회사 관리자용 계약 자동화 동적 설정 폼 및 검증 저장 연동
- [x] 사용자용 실행 요청 및 submissions 적재 연동
- [x] 사용자용 결과 내역 실시간 구독 및 6가지 상태 매핑 연동
- [x] 서버리스 API placeholder (`src/app/api/automation/execute/route.ts`) 구현
- [x] `npm run build` 빌드 검증 및 전체 시나리오 수동 테스트 진행

## 2026-06-07: N8Lient MVP 베타-2 스프린트 (운영자 자동화 등록 및 배정)
- [x] docs/dev-checklist.md 및 docs/context-notes.md에 베타-2 스프린트 계획 기록
- [x] 운영자 자동화 템플릿 수동 등록 폼 개발 (`workflowKey` 정규식 및 중복 방지, `configSchema` 키 규칙 검증 적용)
- [x] 운영자 계약 배정 폼 개발 (clients 및 templates 조회 바인딩, 중복 계약 방지)
- [x] 개발용 샘플 데이터 생성 버튼 격리 패널 이동
- [x] `npm run build` 빌드 검증 및 전체 시나리오 수동 테스트 진행

## 2026-06-07: N8Lient MVP 베타-3 스프린트 (템플릿 수정/복제 및 Webhook 참조)
- [x] docs/dev-checklist.md 및 docs/context-notes.md에 베타-3 스프린트 계획 기록
- [x] operatorService.ts에 템플릿 수정(updateWorkflowTemplate / updateDoc) 기능 연동
- [x] 템플릿 수정 폼 고도화 (published 상태 한정 Key Lock 정책: workflowKey 비활성화, 기존 configSchema.key 비활성화/삭제 불가)
- [x] 템플릿 신규 필수 필드 추가 시 UI 경고 메시지 노출 기능 추가 (isEditMode && !isExistingField && field.required 조건)
- [x] 템플릿 복제 기능 추가 (workflowKey 빈 값 로드, originalStatus=null 리셋, 복제 안내 가이드)
- [x] webhookSecretId(workflowKey 기반 자동 채움) 및 n8nServerKey(기본값 "main") 필드 추가 및 Firestore 저장 연동
- [x] n8lient.ts 타입에 n8nServerKey?: string 옵션 필드 추가
- [x] UI 내 보안 가이드 문구 명세 (Webhook 물리 격리, published 제한, 복제 유도 안내)
- [x] `npm run build` 빌드 검증 통과 (에러 0건, 24/24 페이지 정상 생성)

## 2026-06-07: N8Lient MVP 감마 스프린트 (서버리스 실행 게이트웨이 및 콜백 API)
- [x] docs/dev-checklist.md 및 docs/context-notes.md에 감마 스프린트 계획 및 의사결정 기록
- [x] `firebase-admin` 패키지 설치 (`npm install firebase-admin`)
- [x] `src/lib/firebaseAdmin.ts` 신규 생성 (Admin SDK 싱글톤 초기화, Auth/Firestore 인스턴스 반환)
- [x] `/api/automation/execute` 실제 구현 (ID Token 검증 → users 조회 → clientAutomations 검증 → workflowTemplates 조회 → submissions 생성 → n8n Webhook 전송 → status 업데이트)
- [x] `/api/automation/callback` 신규 생성 (N8N_CALLBACK_SECRET 검증 → submissions success/failed 업데이트)
- [x] `/user/execute` 프론트 수정 (createSubmission 직접 호출 제거, getIdToken()으로 ID Token 획득 후 API 호출로 전환)
- [x] `.env.local.example` 및 `.env.local`에 서버 전용 환경변수 항목 추가 (FIREBASE_ADMIN_*, N8N_WEBHOOK_*, N8N_CALLBACK_SECRET)
- [x] `npm run build` 빌드 검증 통과 (에러 0건, 25/25 페이지 정상 생성, callback/execute 모두 ƒ Dynamic 라우트로 등록)

## 2026-06-08: n8n 워크플로우 연동 가이드 문서화 작업
- [x] e2e 연동 구조 파악 및 `N8Lient_MVP_구조개요서.md` 생성
- [x] Firestore 컬렉션 및 동치 규칙 `N8Lient_DB_연동규약서.md` 생성
- [x] execute/callback API 명세 및 환경변수 매핑 가이드 `N8Lient_Webhook_Callback_연동규약서.md` 생성
- [x] `docs/dev-checklist.md` 및 `docs/context-notes.md` 작업 기록 갱신

## 2026-06-09: N8Lient Gateway 환경설정 구조 단순화 및 Webhook Path 자동 조합 리팩터링
- [x] Gateway `getWebhookConfig` 리팩터링 및 안전 문자 검증 구현 (`server.ts` 수정)
- [x] 프로젝트 루트에 `env.yaml` 생성 및 서버 단위 설정만 남기기
- [x] `.env.local` 정리 (프론트 공개 환경변수만 남기기)
- [x] `env.yaml.example` 및 `.env.local.example` 템플릿 파일 생성
- [x] `.gitignore` 확인 및 보완 (템플릿 예외 항목 및 serviceAccount*.json 추가)
- [x] 로컬 컴파일 검증 (`n8lient-gateway` 및 프론트엔드 빌드 실행)
- [x] Cloud Run 재배포 (루트 env.yaml 기준) 및 이전 `n8lient-gateway/env.yaml` 제거
- [x] 재배포 후 환경변수 제거 확인 (`gcloud run services describe` 확인)
- [x] 개발 가이드 문서 업데이트 및 정리

## 2026-06-12: 오퍼레이터 관리자 매핑 승인 동기화 및 파일 검증 로직 개선
- [x] **고객사 마스터 관리자 매핑 동기화**:
  - `operatorService.ts`의 `createClient` 및 `updateClient` 함수 수정 (매핑된 `ownerAdminUid`를 지닌 사용자의 `role`을 `"company_admin"`, `approvalStatus`를 `"approved"`로 자동 갱신)
  - `companyJoinRequests` 중 해당 고객사 코드로 생성된 대기(`pending`) 요청이 있을 시 `status = "approved"` 및 `reviewedBy/At`을 기록하는 자동 클린업 및 승인 로직 구현
  - 이미 타 회사에 승인 소속된 사용자를 관리자로 지정하려 할 시 수정을 사전에 차단하는 중복 제약 기능 추가
- [x] **운영자 전용 Firestore 규칙 보안 강화**: `firestore.rules`에서 `users` 및 `companyJoinRequests` 컬렉션의 update 조건에 `operator` 역할 권한을 명시적으로 추가 및 배포 완료
- [x] **ClientForm 로딩 고도화**: 고객사 정보 수정 진입 시 기존 관리자 `ownerAdminUid`가 있을 경우, 사용자의 이름/이메일을 Firestore에서 자동으로 조회해 폼 매핑 필드에 표시되도록 개선
- [x] **오디오(mp3, webm, m4a, wav) 검증 및 UI 개선**:
  - `WorkflowInputPanel.tsx` 내 확장자(`.`) 및 MIME 검증 분리 구현 및 브라우저별 오디오 MIME 매핑 후보군 추가 적용
  - 일반 파일 첨부 input 태그에 동적으로 `accept` 속성이 부여되도록 기능 보완
  - 파일 용량 제한 메시지가 하드코딩 용량이 아닌 템플릿의 `maxFileSizeMB`와 동적 연동되도록 수정
- [x] **E2E 실행 및 빌드 검증**: `sub_20260612065844_08jxfn` 성공 케이스(mp3 업로드 및 callback 수신 완료)를 기준으로 E2E 전 흐름 작동 및 Next.js 프로덕션 빌드 통과 완료
