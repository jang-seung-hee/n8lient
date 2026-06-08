# N8Lient MVP 구조 개요서

이 문서는 n8n 워크플로우 개발자 및 협업 AI 에이전트가 엔팔라이언트(N8Lient)의 서비스 전체 아키텍처와 역할 분리 모델을 이해하기 위한 구조 개요서입니다.

---

## 1. N8Lient의 목적 및 철학

### 1.1 제품의 목적
엔팔라이언트(N8Lient)는 고객사(Client)가 n8n 기반의 자동화 워크플로우를 직접 제어(설정, 실행, 결과 확인)할 수 있도록 돕는 **웹 기반 자동화 클라이언트(자동화 리모컨)**입니다.
기존 n8n의 복잡한 에디터 화면을 고객에게 노출하지 않고, 정돈된 B2B SaaS 형태의 컴팩트한 사용자 환경을 제공하는 것을 목적으로 합니다.

### 1.2 개인화 업무 자동화 철학 (🚨 핵심 사상)
N8Lient는 단순한 회사 단위 공용 자동화 포털이 아니라, **회사가 지원하는 개인화 업무 자동화 포털**입니다.
*   **회사의 역할**: 자동화 사용권(계약)을 획득하고, 전체 사용자를 위해 초기 '회사 공용 기본 설정값'을 제공하고 지원합니다.
*   **사용자의 역할**: 자신의 구체적인 실무 환경에 맞춰 개인 업무 환경값(개인 이메일, 개인 Google Drive 폴더 ID 등)을 '개인 설정값'으로 직접 등록하고 관리합니다.
*   **우선순위 원칙**: 자동화 실행 시 **사용자 개인 설정이 회사 공용 설정보다 항상 우선하여 적용**됩니다. 회사 공용 설정은 개인 설정이 등록되어 있지 않은 경우에 한해 **Fallback(기본값)**으로 동작합니다.

---

## 2. N8Lient와 n8n의 역할 분리
엔팔라이언트와 n8n은 물리적 및 기능적으로 철저히 격리됩니다.

*   **엔팔라이언트 (Client WebApp & Gateway API)**
    *   사용자 인증(Google 로그인) 및 회사 승인 처리
    *   회사 공용 및 사용자 개인 자동화 환경설정 관리 및 저장
    *   사용자 자동화 실행 요청(입력값 수집, 파일 업로드 등)
    *   실행 게이트웨이(`execute API`) 및 콜백 수신(`callback API`) 제공
    *   자동화 실행 이력(submissions) 상태 추적 및 노출
*   **n8n (Automation Engine)**
    *   실제 비즈니스 로직(자동화 워크플로우) 수행
    *   자동화 실행 시, 기본적으로 `execute API`로부터 전달받은 **병합 완료된 최종 실행 설정값(`payload.settings`)**을 사용하여 작동함 (Firestore 직접 조회는 예외적 고급 모드 또는 특수 자동화에서만 제한적으로 수행)
    *   완료 후 엔팔라이언트 `callback API`를 호출하여 실행 결과 보고
*   **Firebase (Backend & Database)**
    *   회사 정보, 사용자 프로필, 계약 내역, 설정값 및 이력을 실시간 공유하는 매개체

---

## 3. 사용자 역할 (User Roles)
서비스 권한은 3가지로 분리되며, 웹앱 내부에서 권한별 라우트가 분리됩니다.

| 역할 (Role) | 설명 | 주요 담당 기능 |
| :--- | :--- | :--- |
| **일반 사용자 (`user`)** | 고객사 소속 직원 | * 자동화 실행 요청 (`/user/execute`) 및 실행 결과 확인<br>* **자신의 개인 자동화 설정 관리** (개인 이메일, 개인 Google Drive 폴더 ID 등 개인 업무 환경값 등록) |
| **회사 관리자 (`company_admin`)** | 고객사 내 총괄 관리자 | * 회사 소속 사용자 승인/거절<br>* **회사가 계약한 자동화의 공용 기본 설정 관리**<br>* 개인 설정이 없는 사용자를 위한 **Fallback 설정 제공** |
| **운영자 (`operator`)** | 엔팔라이언트 서비스 사업자 | 고객사(회사) 등록, 자동화 템플릿 설계, 회사별 자동화 계약 배정 |

---

## 4. 핵심 서비스 흐름 (Core Flow)

1.  **Google 로그인**: 사용자는 Google Auth를 통해 최초 로그인 및 사용자 프로필을 생성합니다. (기본 역할: `user`, 승인 상태: `no_company`)
2.  **회사코드 입력**: 가입하고자 하는 회사의 고유 코드(예: `RTT2026`)를 입력하여 승인을 요청합니다. (상태: `pending`)
3.  **가입 승인 요청**: `companyJoinRequests`에 승인 요청 문서가 기록됩니다.
4.  **회사 관리자 승인**: 해당 회사의 `company_admin`이 요청을 확인하고 승인하면, 사용자의 `clientId`가 세팅되며 상태가 `approved`로 변경됩니다.
5.  **운영자 N8N 워크플로우 등록**: 운영자가 `workflowTemplates`에 n8n 연동 규약을 정의한 N8N 워크플로우를 등록합니다. (예: `expense-report`, `idea-catcher`)
6.  **운영자 회사별 자동화 배정**: 운영자가 특정 회사(`clientId`)와 N8N 워크플로우 Key(`workflowKey`)를 묶어 `clientContracts`를 생성합니다.
7.  **회사 관리자 자동화 환경설정**: 회사 관리자는 계약된 자동화 목록을 확인하고, 회사에 필요한 공용 기본 설정값(구글 드라이브 폴더 ID, 대표 이메일 등)을 입력하여 `clientAutomations`를 생성 및 `configStatus`를 `configured`로 변경합니다. **이 공용 설정은 회사 전체의 기본값(Fallback) 역할을 하며, 개별 사용자 설정이 존재하는 경우 사용자 개인 설정이 우선 적용됩니다.**
8.  **사용자 개인 자동화 환경설정 (선택/필수)**: 일반 사용자는 본인의 업무 흐름에 맞추어 개인용 폴더 ID 나 수신 이메일 등을 `userAutomationSettings`에 개인설정으로 등록합니다.
9.  **사용자 자동화 실행 요청**: 일반 사용자가 입력창에서 값과 파일을 전달하여 실행을 요청하면, N8Lient API 게이트웨이(`execute API`)가 **개인 설정과 회사 설정을 우선순위에 따라 병합하여 n8n Webhook을 호출**합니다. (submissions에 `queued` -> `processing` 상태 기록)
10. **submissions 결과 확인**: n8n 완료 후 `callback API`를 거쳐 submissions의 상태가 `success` 또는 `failed`로 변경되며, 사용자는 UI를 통해 최종 결과를 확인합니다.

---

## 5. 주요 화면과 라우트
*   **일반 사용자 영역 (`/user`)**: 모바일/PC 반응형 하단 바텀 메뉴 기반
    *   `/user` (홈 화면)
    *   `/user/execute` (자동화 실행 요청 및 개인 설정 관리 화면)
    *   `/user/results` (실행 결과 목록 및 상세 보기)
    *   `/user/profile` (내 정보 확인)
    *   `/user/data/*` (자동화 축적 데이터 조회 및 분석활용 패널 - PC 화면에서 좌측에 상시 노출)
*   **회사 관리자 영역 (`/company-admin`)**: 사이드바 구조의 대시보드
    *   `/company-admin/users` (사용자 목록 및 가입 승인 대기 목록 관리)
    *   `/company-admin/automations` (계약 자동화 확인 및 회사 공용 기본 설정 관리)
    *   `/company-admin/results` (회사 소속 사용자의 실행 결과 모니터링)
*   **운영자 영역 (`/operator`)**: 통합 관리를 위한 별도 운영 콘솔
    *   `/operator/clients` (고객사 생성 및 관리)
    *   `/operator/workflow-templates` (N8N 워크플로우 신규 등록, 수정, 복제)
    *   `/operator/contracts` (회사별 자동화 계약 부여)

---

## 6. MVP 범위 내 구현 현황

### [구현 완료 사항]
*   **인증 및 가입**: Google Auth 연동, `companyCodeLookups`를 거쳐 `companyJoinRequests` 트랜잭션 단위 가입 승인 요청 및 관리자 승인 처리 완료.
*   **운영자 콘솔**: N8N 워크플로우 등록/수정/복제 인터페이스 구축 (수정 시 `workflowKey` 및 스키마 키 잠금 기능 적용). 회사 계약 배정 처리 완료.
*   **회사 관리자 설정**: 계약된 N8N 워크플로우의 `configSchema`를 읽어 동적 설정 폼 빌드 및 `clientAutomations.settings` 저장 기능 구현 완료.
*   **사용자 실행**: submission 생성 및 클라이언트 전용 ID Token 기반의 실행 게이트웨이 연동 완료.
*   **서버리스 API**: `/api/automation/execute` (n8n Webhook 호출 및 타임아웃 방어) 및 `/api/automation/callback` (콜백 수신 및 Firestore Admin 권한 상태 갱신) 구현 완료.
*   **보안 규칙**: Firestore 보안 규칙(`firestore.rules`)을 통한 중요 필드 임의 수정 원천 차단 및 사용자별/회사별 조회 범위 통제 적용.

### [MVP 제외 사항 (향후 확장 예정)]
*   고급 통계 및 데이터 시각화 분석 대시보드
*   과금 및 결제 모듈 연동
*   네이티브 모바일 앱 패키징 및 푸시 알림 기능
*   Google Drive 결과물 전체 DB 마이그레이션 및 동기화 도구
*   사용자 상세 권한 설정 (부서별, 팀별 세분화 권한)

---

## 7. n8n 워크플로우 수정 시 반드시 지켜야 할 원칙 (🚨 필수 준수)

n8n 워크플로우를 수정하거나 새로 연동할 때 아래 보안 및 아키텍처 규칙을 위반해서는 안 됩니다.

1.  **브라우저에서 n8n Webhook 직접 호출 금지**:
    클라이언트 코드나 브라우저 상에서 n8n의 Webhook URL을 직접 Fetch하여 호출하는 아키텍처는 절대로 금지됩니다. 모든 호출은 엔팔라이언트 `/api/automation/execute` 게이트웨이를 경유해야 합니다.
2.  **Webhook URL과 Token 클라이언트 노출 금지**:
    n8n의 Base URL, Token, Webhook Path 등은 Firestore `workflowTemplates` 또는 프론트엔드 코드에 직접 입력하지 않습니다. 서버 사이드의 비공개 환경변수(`.env.local`)에 보관하고 논리 키(`webhookSecretId`)를 통해서만 물리 경로를 매핑합니다.
3.  **execute API와 callback API를 통해서만 연결**:
    엔팔라이언트와 n8n의 인터페이스는 오직 `execute API`에서 전달하는 **병합 완료된 최종 실행 설정값 (`payload.settings`)**을 수신하는 것과 실행 완료 시 `callback API` 규약에 맞춰 Bearer Token(N8N_CALLBACK_SECRET)과 함께 POST 요청을 되돌려 주는 방식으로만 설계되어야 합니다.
4.  **공용 Google 계정 Credential 정책**:
    *   n8n의 Google Drive, Google Sheets, Gmail 노드는 사용자별 OAuth Credential을 런타임에 동적으로 교체하지 않습니다.
    *   n8n 내부에는 시스템 전체가 공용으로 쓰는 **단일 구글 계정 Credential**만 고정 연결합니다.
    *   사용자 개인 폴더, 개인 시트, 회사 공용 폴더, 회사 공용 시트를 작동하게 하려면, 대상 Google Drive 리소스(폴더/시트)가 **n8n의 공용 Google 계정 이메일에 쓰기(편집자) 권한으로 사전 공유**되어 있어야 합니다.
    *   수신 이메일 주소(`reportEmailTo`)는 결과 메일 수신처일 뿐이며, 메일을 실제 발신하는 주체는 n8n 공용 Gmail 계정입니다.
5.  **자격증명 전송 금지 및 대상 리소스 ID만 전달**:
    *   N8Lient의 `settings`에는 대상 리소스의 식별 ID(예: `googleDriveFolderId`, `originalFileFolderId`, `googleSheetId`, `reportEmailTo`)만 저장하고 전달합니다.
    *   `settings`에 Google Access/Refresh Token, n8n Credential ID, Gemini API Key 등 보안상 민감한 자격증명 정보를 절대 저장하거나 노출하지 않습니다.
    *   Gemini API Key 역시 N8Lient의 settings로 받지 않고 n8n 내부의 Credential 또는 n8n 서버의 환경변수 영역에서 안전하게 관리합니다.
6.  **권한 누락 시의 비즈니스 예외 처리**:
    *   n8n이 워크플로우 실행 중 권한이 공유되지 않은 폴더/시트에 접근해 실패한 경우, n8n은 이를 무시하지 않고 오류 분기 처리를 작동시켜 엔팔라이언트에 `callback failed` 또는 `config_error` 상태를 정확히 보고해야 합니다.
