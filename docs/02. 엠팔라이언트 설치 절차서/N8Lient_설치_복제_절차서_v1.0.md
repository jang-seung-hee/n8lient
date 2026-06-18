# 엔팔라이언트 설치·복제 절차서 v1.0

- 문서명: 엔팔라이언트 설치·복제 절차서
- 버전: v1.0
- 작성일: 2026-06-18
- 문서 상태: 기준 설치 매뉴얼
- 적용 범위: N8Lient App, N8Lient Gateway, Firebase, Google Cloud Run, Firestore, Firebase Storage, n8n, Optional Export
- 목적: 기존 N8Lient를 재설치하거나, 신규 고객사/신규 프로젝트로 복제 구축할 때 동일한 절차로 안정적으로 재현하기 위한 운영 기준 문서

---

## 0. 핵심 원칙

엔팔라이언트는 단순히 소스 코드만 복사한다고 동일하게 재현되지 않는다.

정상 복제를 위해서는 아래 5개가 함께 준비되어야 한다.

```text
1. GitHub 기준 원본 소스
2. Firebase / Google Cloud 프로젝트 설정
3. Cloud Run Gateway 배포 설정
4. 환경변수 / Secret / Credential 구조
5. n8n 워크플로우 JSON 및 Credential 재연결 절차
```

운영 기준은 다음과 같다.

```text
PC 소스 = 작업본
GitHub 저장소 = 기준 원본
Firebase / Google Cloud / Netlify / n8n = 배포 대상
```

따라서 운영자는 PC에 있는 파일만 믿지 말고, 반드시 GitHub 또는 별도 형상관리 저장소를 기준 원본으로 관리해야 한다.

---

## 0.1 설치 유형 구분

설치 작업은 목적에 따라 3가지로 나뉜다.

### A. 기존 N8Lient 유지보수

기존 프로젝트에 코드 수정사항을 반영한다.

```text
PC 소스 수정
→ Git commit
→ Firebase / Cloud Run / Frontend 재배포
→ 테스트
```

예:

```text
Gateway retentionPolicy 계산 버그 수정
Firestore Rules 수정
프론트 UI 수정
n8n workflow PATCH 버전 배포
```

### B. 기존 플랫폼에 고객사 추가

N8Lient 플랫폼 자체는 그대로 두고, 새 고객사만 추가한다.

```text
소스 복제 불필요
→ clients 등록
→ companyCode 등록
→ workflowTemplates 확인
→ clientContracts / clientAutomations 등록
→ 회사관리자 승인
→ 실행 테스트
```

### C. 신규 N8Lient 프로젝트 복제 구축

새 Firebase 프로젝트, 새 Google Cloud 프로젝트, 새 Cloud Run Gateway, 새 Frontend 배포 환경으로 독립 서비스를 만든다.

```text
GitHub 저장소 clone
→ Firebase 새 프로젝트 생성
→ Google Cloud / Cloud Run 설정
→ env / Secret 구성
→ Gateway 배포
→ Frontend 배포
→ n8n workflow import
→ Credential 재연결
→ 운영자 / 고객사 / 워크플로우 등록
→ 전체 실행 테스트
```

본 문서는 주로 **C. 신규 프로젝트 복제 구축**을 기준으로 작성한다.

---

## 0.2 설치 전 전제 조건

아래 조건이 준비되어 있어야 한다.

```text
1. 회사 전용 또는 공용 n8n self-hosted 서버가 준비되어 있다.
2. n8n 도메인이 준비되어 있다.
3. n8n 워크플로우 JSON export 파일이 준비되어 있다.
4. n8n 워크플로우의 Webhook path가 확인되어 있다.
5. n8n Google Drive, Gmail, Gemini 등 필요한 Credential을 재연결할 수 있다.
6. n8n Webhook Header Auth Credential 설정이 가능하다.
7. N8Lient 소스코드 Git 저장소에 접근할 수 있다.
8. Google Cloud Console 접근 권한이 있다.
9. Firebase Console 접근 권한이 있다.
10. Frontend 배포 환경에 접근할 수 있다. 예: Netlify, Vercel, Firebase Hosting 등
11. 운영자 이메일과 회사 관리자 이메일이 확정되어 있다.
```

---

## 0.3 보안 전제

아래 값은 절대 Git에 올리지 않는다.

```text
.env.local
.env
env.yaml
serviceAccount*.json
*.pem
Firebase Admin SDK Private Key
N8N_SERVER_MAIN_TOKEN
N8N_CALLBACK_SECRET
Gemini API Key
Google OAuth Client Secret
Google Refresh Token
Google Access Token
```

저장 방식 권장:

```text
개발/초기 테스트: 로컬 .env.local / env.yaml 사용 가능
운영 배포: Google Secret Manager 권장
문서화: 실제 값이 아니라 필요한 변수명과 용도만 기록
```

---

# 1. 전체 설치 흐름 요약

```text
1. 회사/프로젝트 기본 정보 정리
2. GitHub 기준 원본 저장소 확인
3. Firebase 프로젝트 생성 및 설정
4. Firestore / Storage Rules 준비 및 배포
5. N8Lient 소스 복제 및 기본 빌드 확인
6. 환경변수 / Secret 목록 작성
7. Cloud Run Gateway 기존 설정 백업 또는 신규 배포 준비
8. Cloud Run Gateway 배포
9. Frontend 배포
10. Firebase Auth 승인 도메인 등록
11. n8n 워크플로우 import
12. n8n Header Auth / Callback Credential 연결
13. 운영자 계정 생성
14. 고객사 등록
15. workflowTemplates 등록
16. clientContracts / clientAutomations 등록
17. 회사 관리자 계정 승인
18. 회사 공용 설정 등록
19. 일반 사용자 승인 및 개인 설정
20. 텍스트 실행 테스트
21. 파일/음성 실행 테스트
22. callback 및 실행 로그 확인
23. 보관 레벨별 결과 확인
24. Optional Export 확인
25. 운영 전 보안 점검
26. 완료 판정
```

---

# 2. 회사/프로젝트 기본 정보 정리

## 목적

설치 대상 회사의 식별값, Firebase/GCP 프로젝트, n8n 서버, 배포 도메인 정보를 먼저 확정한다.

## 정리 항목

```text
회사명:
회사 코드:
clientId:
Firebase Project ID:
Google Cloud Project ID:
n8n 서버 주소:
n8nServerKey:
Gateway Service Name:
Gateway Region:
Gateway URL:
Frontend URL:
운영자 이메일:
회사 관리자 이메일:
기본 시간대:
기본 보고 이메일:
```

예시:

```text
회사명: 렌탈톡톡
회사 코드: RTT2026
clientId: client_rentaltoktok_001
Firebase Project ID: n8lient-rentaltoktok
Google Cloud Project ID: n8lient-rentaltoktok
n8n 서버 주소: https://n8n.rentaltalk.kr
n8nServerKey: main
Gateway Service Name: n8lient-gateway
Gateway Region: asia-northeast3
Gateway URL: 배포 후 확정
Frontend URL: 배포 후 확정
운영자 이메일: operator@example.com
회사 관리자 이메일: admin@company.com
기본 시간대: Asia/Seoul
기본 보고 이메일: report@company.com
```

## 주의사항

```text
1. clientId는 한 번 정하면 중간에 바꾸지 않는다.
2. companyCode는 가입 요청 때 사용되므로 고유해야 한다.
3. companyCode는 너무 예측하기 쉬운 값은 피한다.
4. n8nServerKey는 단일 서버면 main을 기본으로 사용한다.
5. 여러 n8n 서버를 운영할 때만 sub, clientA 같은 키를 추가한다.
```

---

# 3. GitHub 기준 원본 저장소 확인

## 목적

PC 소스와 운영 배포본이 서로 어긋나지 않도록 기준 원본을 명확히 한다.

## 기본 원칙

```text
GitHub 저장소 = 기준 원본
PC 로컬 소스 = 작업본
Cloud Run / Firebase / Frontend = 배포 대상
```

## 작업

```powershell
git clone 저장소_URL
cd 프로젝트_폴더
git status
git branch
git log --oneline -5
```

## 확인할 것

```text
1. 현재 branch가 main 또는 release branch인지 확인
2. 미커밋 변경사항이 없는지 확인
3. 최신 커밋이 운영 기준인지 확인
4. package-lock.json 또는 pnpm-lock.yaml 같은 lock 파일이 있는지 확인
5. .gitignore에 민감파일이 포함되어 있는지 확인
```

## 권장 .gitignore

```gitignore
.env
.env.local
.env.*.local
env.yaml
serviceAccount*.json
*.pem
*.key
node_modules
.next
dist
coverage
```

## 주의사항

PC 한 대에만 있는 소스를 기준으로 삼으면 안 된다.  
운영 가능한 제품으로 만들려면 반드시 GitHub 또는 그에 준하는 형상관리 저장소를 기준 원본으로 둔다.

---

# 4. Firebase 프로젝트 생성 및 설정

## 목적

N8Lient의 로그인, 사용자 정보, 회사 설정, 실행 로그, 검색 데이터, 보관 메타데이터를 관리할 Firebase 프로젝트를 준비한다.

## 작업

Firebase Console에서 프로젝트를 생성한다.

필수 설정:

```text
1. Firebase Project 생성
2. Authentication 활성화
3. Google 로그인 Provider 활성화
4. Firestore Database 생성
5. Firebase Storage 활성화
6. Web App 추가
7. Firebase Web SDK 설정값 확보
8. Firebase Admin SDK 서비스 계정 생성
```

## 프론트용 공개값

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Gateway 서버용 비밀값

```yaml
FIREBASE_ADMIN_PROJECT_ID:
FIREBASE_ADMIN_CLIENT_EMAIL:
FIREBASE_ADMIN_PRIVATE_KEY:
```

## 주의사항

```text
1. Firebase Web SDK 값은 프론트에 노출되어도 되는 공개 설정값이다.
2. Firebase Admin SDK 값은 서버 비밀값이다.
3. FIREBASE_ADMIN_PRIVATE_KEY는 절대 Git에 올리지 않는다.
4. Authentication 승인 도메인에 실제 프론트 도메인을 추가해야 한다.
5. Netlify를 사용하면 *.netlify.app 도메인도 승인 도메인에 추가한다.
```

---

# 5. Firestore / Storage Rules 준비 및 배포

## 목적

일반 사용자, 회사 관리자, 운영자가 허용된 데이터만 볼 수 있게 제한한다.

## 기본 권한 원칙

```text
user:
- 자기 users 문서
- 자기 submissions
- 자기 userAutomationSettings

company_admin:
- 자기 clientId의 users
- 자기 clientId의 submissions
- 자기 clientId의 clientAutomations
- 자기 clientId의 client settings

operator:
- 전체 운영 데이터 접근 가능
```

## 배포 명령

```powershell
firebase deploy --only firestore:rules --project FIREBASE_PROJECT_ID
firebase deploy --only firestore:indexes --project FIREBASE_PROJECT_ID
firebase deploy --only storage --project FIREBASE_PROJECT_ID
```

또는 한 번에:

```powershell
firebase deploy --only firestore:rules,firestore:indexes,storage --project FIREBASE_PROJECT_ID
```

## 확인 항목

```text
1. firestore.rules 존재 여부
2. firestore.indexes.json 존재 여부
3. storage.rules 존재 여부
4. firebase.json에서 project alias가 맞는지 확인
5. 테스트 중 열어둔 allow read/write가 없는지 확인
```

## 주의사항

```text
1. Gateway는 Firebase Admin SDK를 쓰므로 Firestore Rules 제한을 받지 않는다.
2. 프론트 직접 조회 화면은 Rules 영향을 받는다.
3. 테스트 편의를 위해 allow read, write: if true 같은 규칙을 운영에 남기면 안 된다.
4. submissions에는 개인정보와 실행 내용이 들어가므로 타인 조회를 차단한다.
```

---

# 6. N8Lient 소스 복제 및 기본 빌드 확인

## 목적

프론트와 Gateway가 정상 빌드되는지 확인한다.

## 프론트 빌드

```powershell
cd 프로젝트_루트
npm install
npm run build
```

## Gateway 빌드

```powershell
cd n8lient-gateway
npm install
npm run build
```

## Gateway 공유 파일 동기화

Gateway가 App의 공통 validation 파일을 공유하는 구조라면 배포 전 반드시 동기화한다.

```powershell
cd 프로젝트_루트
npm run sync:gateway
npm run check:gateway-sync
cd n8lient-gateway
npm run build
```

## 주의사항

```text
1. 빌드 성공 전 배포하지 않는다.
2. Node.js 버전 차이로 빌드 에러가 날 수 있다.
3. Dockerfile 또는 package.json의 engines 기준을 확인한다.
4. Gateway는 Cloud Run 배포 환경에서 상위 디렉토리를 참조할 수 없으므로 필요한 파일은 배포 전 동기화되어야 한다.
```

---

# 7. 환경변수 / Secret 목록 작성

## 목적

프론트 공개 설정과 Gateway 서버 비밀 설정을 분리한다.

## 파일 구분

```text
.env.local
= 프론트엔드용 공개 설정

env.yaml
= Cloud Run Gateway 서버용 설정
= 초기 설치에서는 사용 가능
= 운영에서는 Secret Manager 전환 권장
```

## .env.local 예시

```env
NEXT_PUBLIC_GATEWAY_BASE_URL=https://회사-gateway-url.run.app

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## env.yaml 예시

```yaml
FIREBASE_ADMIN_PROJECT_ID: "firebase_project_id"
FIREBASE_ADMIN_CLIENT_EMAIL: "firebase_admin_client_email"
FIREBASE_ADMIN_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"

N8N_SERVER_MAIN_BASE_URL: "https://회사-n8n-domain.com"
N8N_SERVER_MAIN_TOKEN: "n8n_header_auth_token"

N8N_CALLBACK_SECRET: "callback_secret"

GATEWAY_BASE_URL: "https://회사-gateway-url.run.app"

MAX_UPLOAD_MB: "10"

ALLOWED_ORIGINS: "https://회사-frontend-domain.com,http://localhost:3000"
```

## Secret Manager 전환 권장값

아래 값은 운영 단계에서 Secret Manager 사용을 권장한다.

```text
FIREBASE_ADMIN_PRIVATE_KEY
N8N_SERVER_MAIN_TOKEN
N8N_CALLBACK_SECRET
GEMINI_API_KEY
Google OAuth Client Secret
Google Service Account Key
```

## 주의사항

```text
1. .env.local은 프론트 공개값만 둔다.
2. N8N_SERVER_MAIN_TOKEN은 .env.local에 넣지 않는다.
3. FIREBASE_ADMIN_PRIVATE_KEY는 .env.local에 넣지 않는다.
4. env.yaml은 Git에 올리지 않는다.
5. Cloud Run 환경변수는 배포 시 덮어쓰기될 수 있으므로 배포 전 백업한다.
```

---

# 8. Cloud Run Gateway 기존 설정 백업

## 목적

기존 Gateway를 수정하거나 재배포하기 전에 현재 운영 설정을 백업한다.

신규 설치라면 이 단계는 최초 배포 후부터 운영 절차로 적용한다.

## 현재 서비스 확인

```powershell
gcloud run services list `
  --project PROJECT_ID
```

## 서비스 상세 백업

```powershell
gcloud run services describe n8lient-gateway `
  --region asia-northeast3 `
  --project PROJECT_ID `
  --format export > cloudrun-service.backup.yaml
```

## Revision 목록 확인

```powershell
gcloud run revisions list `
  --service n8lient-gateway `
  --region asia-northeast3 `
  --project PROJECT_ID
```

## 백업해야 할 항목

```text
1. Service Name
2. Region
3. Container Image 또는 Source Deploy 정보
4. 환경변수 이름 목록
5. Secret 연결 여부
6. Service Account
7. CPU / Memory
8. min instances / max instances
9. ingress 설정
10. authentication 설정
11. latest ready revision
```

## 주의사항

```text
1. 백업 파일에 민감값이 들어갈 수 있으므로 Git에 올리지 않는다.
2. Cloud Run Console에서 환경변수를 직접 수정하기 전에 반드시 describe 백업을 남긴다.
3. 운영 장애 시 이전 Revision으로 롤백할 수 있어야 한다.
```

---

# 9. Cloud Run Gateway 배포

## 목적

파일 업로드와 실행 요청을 처리하는 Gateway API 서버를 Cloud Run에 배포한다.

## 배포 전 필수 확인

```powershell
cd 프로젝트_루트
npm run sync:gateway
npm run check:gateway-sync
cd n8lient-gateway
npm run build
```

## 배포 명령

프로젝트 루트에서 실행한다.

```powershell
gcloud run deploy n8lient-gateway `
  --source ./n8lient-gateway `
  --port 8080 `
  --env-vars-file ./env.yaml `
  --allow-unauthenticated `
  --min-instances 1 `
  --region asia-northeast3 `
  --project PROJECT_ID
```

## 배포 후 URL 확인

```text
https://n8lient-gateway-xxxxx.run.app
```

## Health Check

```powershell
curl https://회사-gateway-url.run.app/health
```

정상 응답:

```text
OK
```

## 첫 배포 후 재배포

첫 배포 후 Gateway URL이 확정되면 `env.yaml`의 `GATEWAY_BASE_URL`에 반영하고 다시 배포한다.

```yaml
GATEWAY_BASE_URL: "https://확정된-gateway-url.run.app"
```

## 주의사항

```text
1. --env-vars-file은 Cloud Run 환경변수를 파일 기준으로 덮어쓸 수 있다.
2. env.yaml에 값이 빠지면 기존 값도 사라질 수 있다.
3. 민감값은 Cloud Audit Log 또는 로컬 히스토리에 남을 수 있으므로 주의한다.
4. --allow-unauthenticated를 쓰더라도 Gateway 내부 인증과 n8n Header Auth 검증은 반드시 작동해야 한다.
5. 장기 운영은 Secret Manager로 이전하는 것을 권장한다.
```

---

# 10. Frontend 배포

## 목적

사용자가 접속할 N8Lient 웹 화면을 배포한다.

## Netlify 사용 시 환경변수

```env
NEXT_PUBLIC_GATEWAY_BASE_URL=https://회사-gateway-url.run.app
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## 작업

```text
1. Netlify 프로젝트 생성 또는 기존 사이트 연결
2. GitHub 저장소 연결
3. Build command 설정
4. Publish directory 설정
5. 환경변수 등록
6. Deploy 실행
7. 배포 URL 확인
```

## 주의사항

```text
1. Netlify에 서버 비밀값을 넣지 않는다.
2. N8N_SERVER_MAIN_TOKEN, N8N_CALLBACK_SECRET, FIREBASE_ADMIN_PRIVATE_KEY는 절대 프론트 배포 환경에 넣지 않는다.
3. 환경변수 수정 후에는 재배포해야 반영된다.
4. Frontend URL을 Gateway ALLOWED_ORIGINS에 추가해야 한다.
5. Frontend URL을 Firebase Auth 승인 도메인에 추가해야 한다.
```

---

# 11. Firebase Auth 승인 도메인 등록

## 목적

Google 로그인 오류를 방지한다.

## 작업

Firebase Console에서 Authentication 설정으로 이동한다.

```text
Firebase Console
→ Authentication
→ Settings
→ Authorized domains
→ Frontend 도메인 추가
```

등록 대상 예시:

```text
localhost
localhost:3000
회사서비스.netlify.app
app.company-domain.com
```

## 주의사항

```text
1. 배포 도메인을 등록하지 않으면 Google 로그인이 실패한다.
2. 커스텀 도메인을 연결하면 커스텀 도메인도 추가해야 한다.
3. Netlify 기본 도메인과 커스텀 도메인을 모두 사용할 경우 둘 다 등록한다.
```

---

# 12. n8n 워크플로우 import

## 목적

N8Lient에서 호출할 n8n 워크플로우를 등록한다.

## 작업

```text
1. n8n 접속
2. Workflows → Import from File
3. 워크플로우 JSON import
4. 워크플로우명에 버전 포함 여부 확인
5. Webhook path 확인
6. Credential 재연결
7. Active 상태 전환
```

## 워크플로우명 권장 규칙

```text
n8lient_{워크플로우 표시명} {workflowVersion}
```

예:

```text
n8lient_JANG'S 아이디어 캐처 0.9.0
n8lient_통화 자동 요약 1.0.0
```

## Webhook path 권장 규칙

버전별 워크플로우를 병행 운영할 수 있도록 path에 버전을 포함하는 것을 권장한다.

```text
n8lient-idea-catcher-v0-9-0
n8lient-call-summary-v1-0-0
```

단, 기존 운영 구조가 버전 없는 path를 사용한다면 Gateway routing 및 workflowTemplates와 반드시 일치시킨다.

## 주의사항

```text
1. 동일 Webhook path를 가진 서로 다른 버전의 n8n 워크플로우를 동시에 Active로 두지 않는다.
2. Credential은 import 후 반드시 재연결한다.
3. import된 워크플로우의 Webhook test URL과 production URL을 혼동하지 않는다.
4. 운영 실행은 Active 상태의 production webhook 기준이다.
```

---

# 13. n8n Header Auth / Callback Credential 연결

## 목적

Gateway와 n8n 사이의 서버 간 호출을 안전하게 검증한다.

## Gateway → n8n Webhook Header Auth

n8n Webhook 노드 또는 인증 설정에서 Header Auth를 설정한다.

```text
Credential Type: Header Auth
Header Name: X-N8N-TOKEN
Header Value: Gateway env의 N8N_SERVER_MAIN_TOKEN 값
```

## n8n → Gateway Callback Header Auth

Callback HTTP Request 노드에서 Header Auth를 설정한다.

```text
Header Name: Authorization
Header Value: Bearer {Gateway env의 N8N_CALLBACK_SECRET}
```

## Callback URL

가능하면 하드코딩하지 않고 Gateway payload의 값을 사용한다.

```text
payload.callbackUrl
```

## 확인 항목

```text
1. Webhook path가 workflowTemplates.webhookSecretId와 일치하는가
2. Header Name이 X-N8N-TOKEN인가
3. Header Value가 Gateway의 N8N_SERVER_MAIN_TOKEN과 같은가
4. Callback HTTP Request가 payload.callbackUrl을 사용하는가
5. Callback Authorization Bearer 값이 N8N_CALLBACK_SECRET과 같은가
6. n8n 실행 후 Gateway callback 로그가 찍히는가
```

## 주의사항

```text
1. n8n 서버 .env에 의존하는 구조는 피한다.
2. n8n Cloud 또는 self-hosted 모두 Credential 기반 Header Auth를 우선한다.
3. Secret 값은 문서, 로그, 캡처, AI 대화창에 노출하지 않는다.
```

---

# 14. 운영자 계정 생성

## 목적

N8Lient 운영자 콘솔에 접근할 첫 번째 operator 계정을 만든다.

## 작업

```text
1. 운영자 이메일로 프론트에 Google 로그인
2. Firestore users/{uid} 문서 확인
3. 해당 사용자를 operator로 승격
```

예시:

```json
{
  "uid": "운영자_uid",
  "email": "operator@example.com",
  "displayName": "운영자",
  "role": "operator",
  "approvalStatus": "approved",
  "clientId": null,
  "createdAt": "ISO_8601",
  "updatedAt": "ISO_8601"
}
```

## 주의사항

```text
1. operator는 전체 데이터를 볼 수 있으므로 최소 인원만 부여한다.
2. 테스트 계정을 operator로 둔 채 운영하지 않는다.
3. operator 권한 부여 후 /operator 접근을 확인한다.
```

---

# 15. 고객사 등록

## 목적

자동화를 사용할 회사를 N8Lient에 등록한다.

## 등록 필드

```text
clientId
companyName
companyCode
status
ownerAdminUid
defaultTimezone
defaultReportEmail
createdAt
updatedAt
```

예시:

```json
{
  "clientId": "client_company_001",
  "companyName": "회사명",
  "companyCode": "ABC2026",
  "status": "active",
  "ownerAdminUid": "회사관리자_uid",
  "defaultTimezone": "Asia/Seoul",
  "defaultReportEmail": "report@company.com"
}
```

## 주의사항

```text
1. clientId는 다른 컬렉션에서 계속 참조하므로 중간에 변경하지 않는다.
2. companyCode는 고유해야 한다.
3. companyCodeLookups 구조가 있다면 companyCode와 clientId 매핑을 함께 생성한다.
```

---

# 16. workflowTemplates 등록

## 목적

운영자가 사용할 수 있는 n8n 워크플로우 명세를 N8Lient에 등록한다.

## 버전관리 필수 원칙

워크플로우는 반드시 버전 단위로 관리한다.

```text
workflowKey = 자동화 제품군 식별자
workflowVersion = 실제 배포 버전
```

예:

```json
{
  "workflowKey": "idea-catcher",
  "workflowVersion": "0.9.0"
}
```

## 필수 등록값

```text
workflowKey
workflowVersion
name
shortName
status 또는 releaseStatus
n8nServerKey
webhookSecretId 또는 webhookPath
n8nWorkflowId
inputSchema
configSchema
retentionCapabilities
operatorRetentionPolicy
migrationRequired
rollbackTarget
createdAt
updatedAt
```

## 예시

```json
{
  "workflowKey": "idea-catcher",
  "workflowVersion": "0.9.0",
  "name": "아이디어 캐처",
  "shortName": "캐처",
  "releaseStatus": "stable",
  "n8nServerKey": "main",
  "webhookSecretId": "n8lient-idea-catcher-v0-9-0",
  "n8nWorkflowId": "n8n_workflow_id",
  "inputSchema": {
    "acceptedInputTypes": ["text", "audio"],
    "allowedFileTypes": ["txt", "md", "webm", "mp3", "m4a", "wav"],
    "maxFileSizeMB": 10,
    "titleRequired": false
  },
  "configSchema": [
    {
      "key": "reportEmailTo",
      "label": "결과 보고 수신 이메일",
      "type": "email",
      "required": false
    },
    {
      "key": "emailEnabled",
      "label": "이메일 보고 사용",
      "type": "boolean",
      "required": false,
      "defaultValue": true
    },
    {
      "key": "emailAttachResult",
      "label": "결과 MD 첨부",
      "type": "boolean",
      "required": false,
      "defaultValue": true
    },
    {
      "key": "emailAttachOriginal",
      "label": "원본 파일 이메일 임시 첨부",
      "type": "boolean",
      "required": false,
      "defaultValue": false
    },
    {
      "key": "optionalExportProvider",
      "label": "외부 내보내기",
      "type": "select",
      "required": false,
      "options": ["none", "google_drive"],
      "defaultValue": "none"
    }
  ],
  "retentionCapabilities": {
    "supportedLevels": ["notify_only", "processed_result", "full_archive"],
    "defaultLevel": "processed_result"
  },
  "operatorRetentionPolicy": {
    "defaultLevel": "processed_result"
  },
  "migrationRequired": false,
  "rollbackTarget": null
}
```

## releaseStatus 기준

```text
draft       : 작성 중
testing     : 내부 테스트 중
stable      : 배포 가능
deprecated  : 기존 고객 유지 가능, 신규 배포 비권장
retired     : 사용 중단
```

## 주의사항

```text
1. 신규 고객에게는 stable 버전만 배포한다.
2. 기존 고객의 workflowVersion은 자동 변경하지 않는다.
3. PATCH라도 운영자 테스트 후 clientAutomation.workflowVersion을 전환한다.
4. 동일 workflowKey라도 workflowVersion이 다르면 별도 실행 대상으로 관리한다.
```

---

# 17. clientContracts / clientAutomations 등록

## 목적

특정 고객사가 어떤 워크플로우 버전을 사용할 수 있는지 배정한다.

## clientContracts

계약 또는 노출 권한을 의미한다.

예시:

```json
{
  "contractId": "client_company_001_idea-catcher",
  "clientId": "client_company_001",
  "workflowKey": "idea-catcher",
  "status": "active",
  "startDate": "2026-06-18",
  "endDate": null,
  "contractRetentionLimit": {
    "allowedLevels": ["notify_only", "processed_result"]
  }
}
```

## clientAutomations

고객사별 실제 사용 설정과 버전 고정을 의미한다.

예시:

```json
{
  "automationId": "client_company_001_idea-catcher_0_9_0",
  "clientId": "client_company_001",
  "workflowKey": "idea-catcher",
  "workflowVersion": "0.9.0",
  "enabled": true,
  "configStatus": "configured",
  "companyRetentionPolicy": {
    "recommendedLevel": "processed_result"
  },
  "settings": {
    "reportEmailTo": "report@company.com",
    "emailEnabled": true,
    "emailAttachResult": true,
    "emailAttachOriginal": false,
    "optionalExportProvider": "none"
  }
}
```

## 주의사항

```text
1. clientContracts만 있다고 실행 화면에 노출되는 것은 아니다.
2. clientAutomations.enabled=true와 configStatus=configured가 필요하다.
3. clientAutomation.workflowVersion을 기준으로 Gateway가 실제 n8n 호출 대상을 결정한다.
4. 새 버전이 등록되어도 기존 clientAutomation.workflowVersion은 자동 변경하지 않는다.
```

---

# 18. 회사 관리자 계정 승인

## 목적

회사 관리자가 회사 사용자 승인과 회사 공용 설정을 관리할 수 있게 한다.

## 작업

```text
1. 회사 관리자 사용자가 Google 로그인
2. 회사코드 입력
3. 가입 요청 생성
4. 운영자 또는 기존 관리자가 승인
5. role = company_admin 설정
6. approvalStatus = approved 설정
7. clientId 정확성 확인
```

예시:

```json
{
  "uid": "회사관리자_uid",
  "email": "admin@company.com",
  "clientId": "client_company_001",
  "role": "company_admin",
  "approvalStatus": "approved"
}
```

## 주의사항

```text
1. 회사 관리자에게 operator 권한을 주지 않는다.
2. clientId가 잘못 들어가면 다른 회사 데이터가 보일 수 있다.
3. 승인 후 /company-admin 접근이 가능한지 확인한다.
```

---

# 19. 회사 공용 설정 등록

## 목적

회사 단위 기본 설정값을 등록하여 일반 사용자가 바로 실행할 수 있게 한다.

## 작업

회사 관리자가 `/company-admin/automations`에서 워크플로우별 설정값을 입력한다.

예시:

```json
{
  "automationId": "client_company_001_idea-catcher_0_9_0",
  "clientId": "client_company_001",
  "workflowKey": "idea-catcher",
  "workflowVersion": "0.9.0",
  "enabled": true,
  "configStatus": "configured",
  "settings": {
    "reportEmailTo": "report@company.com",
    "emailEnabled": true,
    "emailAttachResult": true,
    "emailAttachOriginal": false,
    "optionalExportProvider": "none"
  }
}
```

## 설정 우선순위

```text
사용자 개인 설정
→ 회사 공용 설정
→ 워크플로우 기본값
→ 시스템 기본값
```

## 주의사항

```text
1. 빈 값은 회사 공용 설정 또는 기본값으로 fallback되어야 한다.
2. 사용자 설정에 API Key, Token, Credential ID 같은 비밀값을 넣지 않는다.
3. Google Drive Optional Export를 사용할 경우 대상 폴더는 n8n 공용 Google 계정에 쓰기 권한이 있어야 한다.
```

---

# 20. 일반 사용자 승인 및 개인 설정

## 목적

일반 사용자가 회사가 제공한 워크플로우를 자기 업무 환경에 맞게 실행할 수 있게 한다.

## 작업

```text
1. 일반 사용자 Google 로그인
2. 회사코드로 가입 요청
3. 회사 관리자가 승인
4. approvalStatus = approved 확인
5. role = user 확인
6. clientId 일치 확인
7. /user/execute에서 워크플로우 노출 확인
8. 필요 시 개인 설정 등록
```

## 개인 설정 예시

```json
{
  "reportEmailTo": "user@example.com",
  "emailEnabled": true,
  "emailAttachResult": true,
  "emailAttachOriginal": true,
  "optionalExportProvider": "none"
}
```

## 주의사항

```text
1. 개인 설정을 비워도 회사 공용 설정으로 실행 가능해야 한다.
2. 개인 설정은 회사 공용 설정보다 우선한다.
3. 개인 설정에 민감 Credential을 넣지 않는다.
```

---

# 21. 보관 레벨 정책 확인

## 목적

실행 결과를 어떤 수준으로 저장하고 전달할지 확인한다.

## 표준 레벨

```text
notify_only
processed_result
full_archive
```

## Level 1 — notify_only

```text
이메일 중심 경량형
N8Lient DB에 processorResult 본문 저장 안 함
Firebase Storage 원본 파일 저장 안 함
이메일 본문, MD 첨부, 원본 파일 이메일 임시 첨부 가능
```

## Level 2 — processed_result

```text
Level 1 이메일 전달 기능 전체 상속
processorResult를 Firestore에 저장
원본 파일은 기본적으로 Storage에 영구 저장하지 않음
원본 파일 이메일 임시 첨부 가능
```

## Level 3 — full_archive

```text
Level 2 기능 전체 상속
originalFileRefs 저장
resultRefs 저장
Firebase Storage 원본 파일 저장
Firebase Storage 결과 파일 저장
```

## 중요 분리 원칙

```text
emailAttachOriginal ≠ storeOriginalFiles
```

의미:

```text
emailAttachOriginal:
- 이메일에 원본 파일을 일회성 임시 첨부할지 여부

storeOriginalFiles:
- Firebase Storage에 원본 파일을 영구 보관할지 여부
```

예:

```text
processed_result + emailAttachOriginal=true + storeOriginalFiles=false
= 원본 파일을 이메일에는 첨부하지만 Storage에는 보관하지 않는다.
```

## 주의사항

보관 레벨과 이메일 첨부 정책을 혼동하지 않는다.  
processed_result에서 원본 파일이 Storage에 없다고 해서 장애가 아니다.

---

# 22. Google Drive Optional Export 확인

## 목적

Google Drive를 기본 저장소가 아니라 외부 내보내기 기능으로 관리한다.

## 원칙

```text
기본 DB = Firestore
기본 파일 저장소 = Firebase Storage
Google Drive = Optional Export
```

## optionalExportProvider

```text
none
google_drive
```

## Google Drive 설정값

```text
googleDriveMdFolderName
googleDriveMdFolderId
googleDriveAttachmentFolderName
googleDriveAttachmentFolderId
```

## 조건부 필수

```text
optionalExportProvider = none
→ Google Drive 관련 필드 없어도 됨

optionalExportProvider = google_drive
→ googleDriveMdFolderName 필수
→ googleDriveMdFolderId 필수
→ googleDriveAttachmentFolderName 필수
→ googleDriveAttachmentFolderId 필수
```

## 주의사항

```text
1. Google Drive는 N8Lient의 기본 저장소가 아니다.
2. processed_result에서 Google Drive에 원본 파일이 없어도 정상일 수 있다.
3. Google Drive 업로드는 Optional Export가 켜진 경우에만 확인한다.
4. Google Drive 폴더는 n8n 공용 Google 계정에 쓰기 권한이 있어야 한다.
```

---

# 23. 텍스트 실행 테스트

## 목적

파일 없이 기본 실행 흐름이 정상 작동하는지 확인한다.

## 작업

```text
1. /user/execute 접속
2. 워크플로우 선택
3. 텍스트 입력
4. 실행 요청
5. Gateway 로그 확인
6. n8n 실행 이력 확인
7. Gateway callback 확인
8. Firestore submissions 확인
```

## Gateway 로그 확인

```powershell
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="n8lient-gateway" AND (logName="projects/PROJECT_ID/logs/run.googleapis.com%2Fstderr" OR logName="projects/PROJECT_ID/logs/run.googleapis.com%2Fstdout")' `
  --limit 50 `
  --format="value(timestamp,textPayload)" `
  --project PROJECT_ID
```

## 정상 로그 예시

```text
[execute] n8n Webhook 호출 시작
[execute] n8n Webhook 호출 성공. Status: 200
[callback] submissionId=... 업데이트 완료. Status: success
```

## 확인 항목

```text
1. Gateway가 n8n 호출 성공했는가
2. n8n workflow가 success로 종료되었는가
3. callback이 Gateway로 들어왔는가
4. Firestore submissions.status가 success로 바뀌었는가
5. processorResult가 processed_result 이상에서 저장되었는가
6. 이메일 설정이 켜진 경우 이메일이 도착했는가
```

---

# 24. 파일/음성 실행 테스트

## 목적

파일 업로드, Gateway 임시 처리, n8n 전달, 이메일 첨부, callback까지 확인한다.

## 작업

```text
1. 1~2MB 음성 파일로 먼저 테스트
2. 성공하면 7~10MB 파일로 테스트
3. Firestore submissions.input 확인
4. n8n binary file_0 또는 실제 binary property 확인
5. 이메일 첨부 확인
6. 보관 레벨에 따른 Storage/Refs 확인
7. callback success 확인
```

## Firestore input 예시

```json
{
  "fileName": "audio.webm",
  "mimeType": "audio/webm",
  "sizeBytes": 8234412,
  "inputType": "audio"
}
```

## processed_result 테스트 기대값

```json
{
  "level": "processed_result",
  "emailEnabled": true,
  "emailAttachResult": true,
  "emailAttachOriginal": true,
  "storeProcessorResult": true,
  "storeOriginalFiles": false,
  "storeOriginalFileRefs": false,
  "storeResultRefs": false
}
```

## 확인 기준

```text
1. emailAttachResult=true이면 결과 MD가 이메일에 첨부되어야 한다.
2. emailAttachOriginal=true이고 원본 파일이 있으면 원본 파일이 이메일에 임시 첨부되어야 한다.
3. processed_result에서는 원본 파일이 Storage에 영구 저장되지 않아도 정상이다.
4. full_archive에서는 originalFileRefs와 Firebase Storage 원본 파일 저장을 확인한다.
5. optionalExportProvider=google_drive이면 Google Drive 외부 복사 결과를 확인한다.
```

## 주의사항

```text
1. 처음부터 큰 파일로 테스트하지 않는다.
2. MAX_UPLOAD_MB와 inputSchema.maxFileSizeMB를 맞춘다.
3. Gateway /tmp 파일은 n8n 전송 후 삭제되어야 한다.
4. Gmail 첨부 용량 제한에 걸릴 수 있다.
5. n8n에서 binary property 이름이 file_0인지 확인한다.
```

---

# 25. callback 및 실행 로그 확인

## 목적

n8n 처리는 성공했지만 앱 결과가 갱신되지 않는 문제를 방지한다.

## 확인 항목

```text
1. payload.callbackUrl이 존재하는가
2. n8n Callback HTTP Request가 payload.callbackUrl을 사용하는가
3. Authorization Bearer Secret이 Gateway와 일치하는가
4. callback payload에 submissionId가 포함되는가
5. callback payload에 status가 포함되는가
6. processed_result 이상에서 processorResult가 포함되는가
7. Gateway callback route 로그가 성공인가
8. Firestore submissions가 업데이트되었는가
```

## 문제 분기

```text
n8n 성공 + 앱 processing 유지
→ N8N_CALLBACK 또는 GATEWAY_CALLBACK 문제

이메일 도착 + 앱 결과 없음
→ retentionPolicy 또는 callback processorResult 문제

callback 401/403
→ N8N_CALLBACK_SECRET 불일치

callback 404
→ GATEWAY_BASE_URL 또는 callbackUrl 문제
```

---

# 26. 운영 전 보안 점검

## 목적

실제 고객사 운영 전에 키, Credential, 권한, 배포 설정을 점검한다.

## Git 노출 점검

```powershell
git status
git ls-files | findstr /i "env yaml pem key serviceAccount"
git log --all -- .env.local env.yaml serviceAccount*.json
```

## 점검 항목

```text
1. env.yaml이 Git에 올라가지 않았는가
2. .env.local이 Git에 올라가지 않았는가
3. Firebase Admin Key가 노출되지 않았는가
4. N8N_SERVER_MAIN_TOKEN이 노출되지 않았는가
5. N8N_CALLBACK_SECRET이 노출되지 않았는가
6. operator 권한 사용자가 최소 인원인가
7. Firestore Rules가 완화되어 있지 않은가
8. Storage Rules가 완화되어 있지 않은가
9. n8n Credential이 올바르게 재연결되었는가
10. Google Drive 공유 권한이 필요한 폴더에만 부여되었는가
11. Cloud Run Service Account 권한이 과도하지 않은가
12. Frontend 환경변수에 비밀값이 섞이지 않았는가
```

## 운영 전 교체 권장

테스트 중 대화창, 로그, 캡처, 문서에 노출된 가능성이 있는 값은 운영 전에 교체한다.

```text
Firebase Admin Key
N8N_SERVER_MAIN_TOKEN
N8N_CALLBACK_SECRET
Gemini API Key
Google OAuth Secret
```

---

# 27. 완료 기준

아래 항목이 모두 통과되면 설치 완료로 본다.

```text
1. Gateway /health 200 OK
2. Frontend 접속 정상
3. Google 로그인 정상
4. 운영자 콘솔 접근 정상
5. 고객사 등록 정상
6. companyCode 가입 요청 정상
7. company_admin 승인 정상
8. workflowTemplates 등록 정상
9. clientContracts 등록 정상
10. clientAutomations 설정 정상
11. 회사 공용 설정 저장 정상
12. 일반 사용자 승인 정상
13. 사용자 실행 화면에 워크플로우 노출
14. 텍스트 실행 성공
15. 파일/음성 실행 성공
16. n8n Webhook 수신 성공
17. n8n Processor 성공
18. Gmail 보고 성공
19. Gateway callback 성공
20. Firestore submissions.status success 반영
21. processed_result에서 processorResult 저장 확인
22. full_archive에서 Firebase Storage originalFileRefs/resultRefs 확인
23. Optional Export 사용 시 Google Drive 외부 복사 확인
24. 민감정보 Git 미노출 확인
25. rollback 가능한 이전 Cloud Run Revision 확인
```

---

# 28. 문제 발생 시 빠른 분기표

## Gateway /health 실패

확인:

```text
Cloud Run 배포 상태
서비스 URL
port 8080
컨테이너 기동 로그
env.yaml 누락
Firebase Admin Key 파싱 오류
```

## 로그인 실패

확인:

```text
Firebase Auth Provider
승인 도메인
.env.local Firebase Web SDK 값
Frontend 환경변수 반영 여부
재배포 여부
```

## 실행 화면에 워크플로우가 안 보임

확인:

```text
clientContracts 매핑 여부
clientAutomations 존재 여부
enabled = true
configStatus = configured
사용자 approvalStatus = approved
사용자 clientId 일치
workflowTemplate releaseStatus
```

## Gateway가 n8n 호출 실패

확인:

```text
N8N_SERVER_MAIN_BASE_URL
N8N_SERVER_MAIN_TOKEN
workflowTemplates.n8nServerKey
workflowTemplates.webhookSecretId
n8n Webhook path
n8n Active 여부
Header Auth Credential
production/test webhook URL 혼동 여부
```

## n8n은 성공했는데 앱 결과가 안 바뀜

확인:

```text
callbackUrl
N8N_CALLBACK_SECRET
Callback HTTP Request Credential
Gateway /api/automation/callback 로그
submissionId 일치 여부
Firestore submissions 업데이트 여부
```

## 이메일은 왔는데 결과 목록이 비어 있음

확인:

```text
retentionPolicy.level
notify_only이면 결과 본문 미저장이 정상
processed_result 이상이면 processorResult callback 포함 여부
Gateway callback 저장 여부
Firestore Rules 또는 UI 필터 문제
```

## MD 첨부 누락

확인:

```text
emailAttachResult
MD binary 생성 노드
Email 노드 attachmentBinaryProperty
retentionPolicy와 settings 불일치
```

## 원본 음성/이미지/파일 이메일 첨부 누락

확인:

```text
emailAttachOriginal
storeOriginalFiles와 혼동 여부
processed_result에서 emailAttachOriginal이 false로 강제되는지 여부
Webhook multipart binary 수신 여부
원본 binary가 Email 브랜치까지 유지되는지 여부
Email Original Attachment Prepare 노드
Gmail attachmentBinaryProperty
파일 크기 제한
```

## 파일만 실패

확인:

```text
MAX_UPLOAD_MB
inputSchema.maxFileSizeMB
파일 확장자
mimeType
n8n binary file_0
Gateway /tmp 파일 삭제 여부
Gmail 첨부 제한
Google Drive Optional Export 권한
Firebase Storage Rules
```

---

# 29. Cloud Run 롤백 절차

## 목적

새 Revision 배포 후 문제가 생기면 이전 안정 Revision으로 되돌린다.

## Revision 목록 확인

```powershell
gcloud run revisions list `
  --service n8lient-gateway `
  --region asia-northeast3 `
  --project PROJECT_ID
```

## 트래픽 이전

```powershell
gcloud run services update-traffic n8lient-gateway `
  --to-revisions REVISION_NAME=100 `
  --region asia-northeast3 `
  --project PROJECT_ID
```

## 주의사항

```text
1. 롤백 전 현재 실패 Revision 이름을 기록한다.
2. 롤백 후 /health 확인한다.
3. 동일 실행 테스트를 다시 수행한다.
4. Firestore 데이터 구조 변경이 포함된 배포는 단순 롤백이 어려울 수 있다.
```

---

# 30. 버전관리 운영 기준

## SemVer 기준

```text
MAJOR.MINOR.PATCH
```

## PATCH

기존 계약을 깨지 않는 버그 수정이다.

예:

```text
null 방어
undefined 방어
이메일 첨부 누락 수정
retentionPolicy 계산 오류 수정
오타 수정
기존 의미를 바꾸지 않는 HTML 수정
```

운영:

```text
기존 고객 적용 가능
운영자 테스트 후 clientAutomation.workflowVersion 전환
문제 시 이전 PATCH로 롤백
```

## MINOR

기존 구조와 호환되는 선택 기능 추가다.

예:

```text
선택 설정 추가
Optional Export 추가
기본값 off 신규 기능
이메일 첨부 옵션 추가
```

운영:

```text
신규 버전 등록
신규 고객 기본 배포 가능
기존 고객 자동 적용 금지
기존 고객은 선택 업그레이드
```

## MAJOR

기존 고객 설정, 입력 구조, callback 구조, 보관 정책 구조와 호환되지 않는 변경이다.

예:

```text
inputSchema 구조 변경
callback payload 구조 변경
필수 설정값 추가
retentionPolicy 구조 변경
기존 결과 저장 구조 변경
```

운영:

```text
기존 고객 자동 적용 금지
별도 마이그레이션 필요
rollbackTarget 지정
migrationRequired=true
```

---

# 31. 새 프로젝트 복제 체크리스트

아래 체크리스트를 위에서부터 순서대로 처리한다.

```text
[ ] 회사/프로젝트 기본 정보 정리
[ ] GitHub 기준 저장소 확인
[ ] 신규 Firebase 프로젝트 생성
[ ] Firebase Auth Google Provider 활성화
[ ] Firestore 생성
[ ] Firebase Storage 생성
[ ] Web App 생성 및 SDK 값 확보
[ ] Admin SDK 값 확보
[ ] firestore.rules 배포
[ ] firestore.indexes.json 배포
[ ] storage.rules 배포
[ ] .env.local 작성
[ ] env.yaml 또는 Secret Manager 구성
[ ] Gateway 빌드 성공
[ ] Gateway Cloud Run 배포
[ ] Gateway /health OK
[ ] Gateway URL을 env에 반영 후 재배포
[ ] Frontend 배포
[ ] Firebase Auth 승인 도메인 등록
[ ] ALLOWED_ORIGINS에 Frontend URL 추가
[ ] n8n workflow JSON import
[ ] n8n Credential 재연결
[ ] n8n Header Auth 연결
[ ] n8n Callback Authorization 연결
[ ] n8n workflow Active 전환
[ ] 운영자 로그인
[ ] operator 권한 부여
[ ] 고객사 등록
[ ] 회사관리자 가입 및 승인
[ ] workflowTemplates 등록
[ ] clientContracts 등록
[ ] clientAutomations 등록
[ ] 회사 공용 설정 등록
[ ] 일반 사용자 가입 및 승인
[ ] 텍스트 실행 테스트
[ ] 파일/음성 실행 테스트
[ ] 이메일 MD 첨부 확인
[ ] 원본 파일 이메일 임시 첨부 확인
[ ] processed_result processorResult 저장 확인
[ ] full_archive Storage 저장 확인
[ ] Optional Export 사용 시 Google Drive 복사 확인
[ ] callback success 확인
[ ] Firestore submissions success 확인
[ ] 민감정보 Git 미노출 확인
[ ] Cloud Run rollback 가능 Revision 확인
[ ] 설치 완료 보고서 작성
```

---

# 32. 설치 완료 보고서 양식

```text
프로젝트명:
회사명:
clientId:
companyCode:
Firebase Project ID:
Google Cloud Project ID:
Gateway Service:
Gateway Region:
Gateway URL:
Frontend URL:
n8n Server:
n8nServerKey:
설치일:
설치자:
운영자 이메일:
회사관리자 이메일:

배포 결과:
- Gateway /health:
- Frontend 로그인:
- Firestore Rules:
- Storage Rules:
- workflowTemplates:
- clientAutomations:
- 텍스트 실행:
- 파일/음성 실행:
- 이메일 보고:
- callback:
- 보안 점검:

사용 워크플로우:
1. workflowKey:
   workflowVersion:
   n8nWorkflowId:
   webhookSecretId:
   releaseStatus:

남은 이슈:
1.
2.
3.

최종 판정:
[ ] 설치 완료
[ ] 조건부 완료
[ ] 보류
```

---

# 33. AI 작업 요청 템플릿

## 설치 변수 정리 요청

```text
아래 회사 정보를 기준으로 N8Lient 신규 설치에 필요한 변수 목록을 정리해줘.
프론트 .env.local, Gateway env.yaml, Firebase 설정, n8n 설정, N8Lient DB 등록값으로 나눠서 표로 만들어줘.

회사명:
회사코드:
clientId:
Firebase Project ID:
Google Cloud Project ID:
n8n 서버 주소:
Frontend URL:
Gateway URL:
운영자 이메일:
회사관리자 이메일:
```

## Gateway 배포 점검 요청

```text
N8Lient Gateway를 Cloud Run에 배포하려고 한다.
현재 프로젝트 루트에 env.yaml이 있고, Gateway 소스는 ./n8lient-gateway 폴더에 있다.
아래 조건으로 gcloud 배포 명령어를 만들고, 배포 전/후 확인 명령까지 알려줘.

project:
region:
service name:
source:
env file:
```

## n8n 연동 점검 요청

```text
n8n 워크플로우가 N8Lient Gateway와 연동 가능한지 확인하려고 한다.
아래 항목을 기준으로 점검 체크리스트를 만들어줘.

workflowKey:
workflowVersion:
Webhook path:
Header Auth:
Callback URL:
Callback Authorization:
필요 Credential:
```

## 실행 오류 분석 요청

```text
N8Lient 실행 오류를 분석해줘.
아래 정보를 기준으로 실패 구간을 APP_UI, GATEWAY, N8N, CALLBACK, FIRESTORE_UI 중 어디인지 분류하고 원인 후보와 확인 순서를 제시해줘.

submissionId:
workflowKey:
workflowVersion:
automationId:
status:
retentionLevel:
errorCode:
errorMessage:
input:
settingsSnapshot:
retentionPolicySnapshot:
Gateway 로그:
n8n 로그:
```

---

# 34. v1.0 변경 이력

v0.1 초안 대비 v1.0에서 보강한 내용:

```text
1. GitHub 기준 원본 관리 원칙 추가
2. 설치 유형 A/B/C 구분 추가
3. Cloud Run 기존 설정 백업 절차 추가
4. Cloud Run 롤백 절차 추가
5. Secret Manager 운영 전환 기준 추가
6. Firebase Storage Rules 배포 절차 추가
7. workflowVersion 기반 버전관리 절차 추가
8. releaseStatus / migrationRequired / rollbackTarget 기준 추가
9. Google Drive를 기본 저장소가 아닌 Optional Export로 재정의
10. 보관 레벨별 테스트 기준 보강
11. emailAttachOriginal과 storeOriginalFiles 분리 원칙 명시
12. 파일/음성 실행 테스트 기준 보강
13. 새 프로젝트 복제 체크리스트 추가
14. 설치 완료 보고서 양식 추가
15. AI 작업 요청 템플릿 추가
```

---

# 35. 최종 메모

이 문서는 설치 담당자가 순서대로 따라가면 신규 N8Lient 프로젝트를 재현할 수 있도록 작성된 기준 절차서다.

다만 실제 설치 시에는 아래 값들이 프로젝트마다 달라진다.

```text
Firebase Project ID
Google Cloud Project ID
Gateway URL
Frontend URL
n8n 서버 주소
n8n Credential
N8N_SERVER_MAIN_TOKEN
N8N_CALLBACK_SECRET
Firebase Admin SDK
workflowKey / workflowVersion
clientId / companyCode
```

따라서 문서를 그대로 복사하되, 실제 값은 설치 대상 프로젝트에 맞게 교체해야 한다.

민감값은 절대 문서 본문에 기록하지 말고, Secret Manager 또는 운영자 보안 저장소에 보관한다.
