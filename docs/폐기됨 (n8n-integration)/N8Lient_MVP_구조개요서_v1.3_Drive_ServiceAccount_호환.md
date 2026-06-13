# N8Lient MVP 구조 개요서 v1.3

이 문서는 n8n 워크플로우 개발자 및 협업 AI 에이전트가 엔팔라이언트(N8Lient)의 서비스 전체 아키텍처와 역할 분리 모델을 이해하기 위한 구조 개요서이다.

> 업데이트 기준: **Cloud Run Gateway API 경유 구조 및 Drive/Service Account 호환 정책 반영**  
> 이전의 `브라우저 → n8n 직접 업로드`, `uploadToken`, `verify-upload-token`, `upload-failed`, `uploadSessions` 구조는 표준 구조에서 제외한다.

---

## 1. N8Lient의 목적 및 철학

### 1.1 제품의 목적

엔팔라이언트(N8Lient)는 고객사(Client)가 n8n 기반의 자동화 워크플로우를 직접 제어(설정, 실행, 결과 확인)할 수 있도록 돕는 **웹 기반 자동화 클라이언트(자동화 리모컨)**이다. 기존 n8n의 복잡한 에디터 화면을 고객에게 노출하지 않고, 정돈된 B2B SaaS 형태의 컴팩트한 사용자 환경을 제공하는 것을 목적으로 한다.

### 1.2 개인화 업무 자동화 철학

N8Lient는 단순한 회사 단위 공용 자동화 포털이 아니라, **회사가 지원하는 개인화 업무 자동화 포털**이다.

* **회사의 역할**: 자동화 사용권(계약)을 획득하고, 전체 사용자를 위해 초기 회사 공용 기본 설정값을 제공하고 지원한다.
* **사용자의 역할**: 자신의 구체적인 실무 환경에 맞춰 개인 업무 환경값(개인 이메일, 개인 Google Drive 폴더 ID 등)을 개인 설정값으로 직접 등록하고 관리한다.
* **우선순위 원칙**: 자동화 실행 시 사용자 개인 설정이 회사 공용 설정보다 항상 우선하여 적용된다. 회사 공용 설정은 개인 설정이 등록되어 있지 않은 경우에 한해 fallback으로 동작한다.

### 1.3 구조 단순화 원칙

N8Lient는 n8n을 대체하지 않는다. N8Lient는 n8n 워크플로우의 **입력, 설정, 실행 접수, 결과 추적**만 관리한다. 실제 업무 처리 본체는 n8n 워크플로우가 담당한다.

```text
N8Lient Frontend = 사용자 화면
Cloud Run Gateway = 인증, 설정 병합, 파일 수신, n8n 서버 간 호출
n8n = 자동화 처리 본체
Firestore = 설정 및 실행 로그
Google Drive = 파일 원본 및 결과물 저장소(My Drive 또는 Shared Drive)
```

---

## 2. N8Lient와 n8n의 역할 분리

엔팔라이언트와 n8n은 물리적 및 기능적으로 분리된다.

### 2.1 N8Lient Client WebApp

* Google 로그인 및 사용자 승인 흐름 제공
* 회사 공용 설정값과 사용자 개인 설정값 관리 UI 제공
* 사용자 실행 입력값 수집(text/file/image/audio)
* 실행 결과 목록 및 상세 조회 제공
* 브라우저에는 n8n URL, n8n 토큰, callback secret, Firebase Admin Key를 노출하지 않는다.

### 2.2 Cloud Run Gateway API (`n8lient-gateway`)

* `POST /api/automation/execute` 제공
* `POST /api/automation/callback` 제공
* `GET /health` 제공
* Firebase ID Token 검증
* 사용자 승인 상태 및 clientId 검증
* `clientAutomations` 회사 공용 설정과 `userAutomationSettings` 개인 설정 병합
* JSON 및 multipart/form-data 요청 수신
* 파일 수신 시 `/tmp` 임시 저장 또는 스트림 처리 후 n8n 전송
* n8n Webhook 서버 간 호출
* n8n 호출 시 `X-N8N-TOKEN` 주입
* `submissions` 생성 및 상태 갱신
* callback 수신 후 `submissions` 최종 상태 반영

### 2.3 n8n Automation Engine

* 실제 비즈니스 로직 수행
* Gateway가 전달한 `payload.settings`를 최종 실행 설정값으로 사용
* `input.text`, `input.files`, binary `file_0` 처리
* Google Drive/Gmail/Sheets/Gemini 등 실제 외부 서비스 작업 수행
* Google Drive/Sheets는 운영용 OAuth 계정 Credential 또는 Google Service Account Credential을 사용할 수 있음
* Gmail 발송은 별도 공용 Gmail OAuth Credential을 사용할 수 있음
* 작업 완료 후 `callbackUrl`로 성공/실패 결과 보고
* Firestore를 직접 조회하거나 수정하지 않는다.

### 2.4 Firebase Backend & Database

* 회사 정보, 사용자 프로필, 계약 내역, 설정값, 실행 이력 보관
* 파일 원본, Blob, base64, binary는 Firestore에 저장하지 않는다.
* Firebase Storage는 기본 파일 저장소로 사용하지 않는다.

---

## 3. 사용자 역할(User Roles)

| 역할 | 설명 | 주요 담당 기능 |
| :--- | :--- | :--- |
| `user` | 고객사 소속 일반 사용자 | N8N 워크플로우 실행 요청, 실행 결과 확인, 개인 자동화 설정 관리 |
| `company_admin` | 고객사 관리자 | 회사 소속 사용자 승인/거절, 회사 공용 기본 설정 관리 |
| `operator` | 엔팔라이언트 운영자 | 고객사 등록, N8N 워크플로우 마스터 등록, 회사별 워크플로우 배정 |

---

## 4. 핵심 서비스 흐름(Core Flow)

1. 사용자는 Google Auth로 로그인한다.
2. 회사코드를 입력하고 가입 승인을 요청한다.
3. 회사 관리자가 사용자를 승인한다.
4. 운영자가 `workflowTemplates`에 N8N 워크플로우 마스터 명세를 등록한다.
5. 운영자가 `clientContracts`로 고객사와 워크플로우를 배정한다.
6. 회사 관리자가 `clientAutomations`에 회사 공용 기본 설정값을 등록한다.
7. 일반 사용자는 필요 시 `userAutomationSettings`에 개인 설정값을 등록한다.
8. 사용자가 워크플로우를 실행한다.
9. 브라우저는 Cloud Run Gateway의 `/api/automation/execute`로 요청을 보낸다.
10. Gateway가 인증, 권한, 설정 병합, 파일 수신, n8n 호출을 담당한다.
11. n8n이 업무 처리 후 Gateway callback API로 결과를 반환한다.
12. Gateway가 `submissions` 상태를 최종 갱신한다.

### 4.1 텍스트 전용 실행 흐름

```mermaid
sequenceDiagram
    autonumber
    actor User as 사용자
    participant FE as N8Lient Frontend
    participant GW as Cloud Run Gateway
    participant FS as Firestore
    participant N8N as n8n

    User->>FE: 텍스트 입력 후 실행
    FE->>GW: POST /api/automation/execute (ID Token + JSON 또는 FormData)
    GW->>FS: 사용자/계약/설정 검증
    GW->>FS: 회사 설정 + 개인 설정 병합
    GW->>FS: submissions 생성(status: queued)
    GW->>N8N: X-N8N-TOKEN + payload 서버 간 호출
    N8N-->>GW: HTTP 200 OK(onReceived)
    GW-->>FE: 실행 접수 응답(submissionId)
    N8N->>GW: POST /api/automation/callback
    GW->>FS: submissions 최종 상태 갱신
```

### 4.2 파일 포함 실행 흐름

파일이 있는 실행도 브라우저가 n8n으로 직접 업로드하지 않는다. 브라우저는 항상 Cloud Run Gateway로만 요청한다.

```mermaid
sequenceDiagram
    autonumber
    actor User as 사용자
    participant FE as N8Lient Frontend
    participant GW as Cloud Run Gateway
    participant FS as Firestore
    participant N8N as n8n

    User->>FE: 파일/녹음 포함 실행
    FE->>GW: POST /api/automation/execute (multipart/form-data: payload + file_0)
    GW->>FS: 사용자/계약/설정 검증
    GW->>FS: 회사 설정 + 개인 설정 병합
    GW->>FS: submissions 생성(status: queued, 파일 메타데이터만 저장)
    GW->>GW: 파일을 /tmp 임시 저장 또는 스트림 처리
    GW->>N8N: multipart/form-data 서버 간 호출(X-N8N-TOKEN + payload + file_0)
    GW->>GW: 임시 파일 즉시 삭제
    N8N-->>GW: HTTP 200 OK(onReceived)
    GW-->>FE: 실행 접수 응답(submissionId)
    N8N->>N8N: Google Drive 저장 및 자동화 처리
    N8N->>GW: POST /api/automation/callback
    GW->>FS: submissions 최종 상태 갱신
```

---

## 5. 주요 화면과 라우트

* **일반 사용자 영역(`/user`)**
  * `/user`: 홈 화면
  * `/user/execute`: N8N 워크플로우 실행 요청, 개인 설정, text/file/image/audio 입력
  * `/user/results`: 실행 결과 목록 및 상세 보기
  * `/user/profile`: 내 정보 확인
* **회사 관리자 영역(`/company-admin`)**
  * `/company-admin/users`: 사용자 목록 및 가입 승인 관리
  * `/company-admin/automations`: 계약된 N8N 워크플로우의 회사 공용 설정 관리
  * `/company-admin/results`: 회사 소속 사용자의 실행 결과 모니터링
* **운영자 영역(`/operator`)**
  * `/operator/clients`: 고객사 마스터
  * `/operator/workflow-templates`: N8N 워크플로우 마스터
  * `/operator/contracts`: N8N 워크플로우 배정/매핑
* **Gateway 영역(Cloud Run)**
  * `GET /health`: 헬스체크
  * `POST /api/automation/execute`: 실행 요청 통합 접수
  * `POST /api/automation/callback`: n8n 결과 콜백 수신

---

## 6. MVP 범위 내 구현 현황

### 구현 완료 사항

* Google Auth 기반 로그인
* 회사코드 기반 가입 요청 및 회사 관리자 승인
* 운영자 콘솔의 고객사/N8N 워크플로우/매핑 관리
* 회사 관리자 콘솔의 회사 공용 설정 관리
* 사용자 개인 설정(`userAutomationSettings`) 관리
* 사용자 입력 UI(text/file/image/audio)
* Cloud Run Gateway 기반 `/api/automation/execute` 통합 실행
* Cloud Run Gateway 기반 `/api/automation/callback` 결과 반영
* Gateway 서버 간 n8n Webhook 호출
* n8n 공용 Google Credential 정책
* My Drive / Shared Drive 선택 저장소 정책
* Google Service Account 기반 Shared Drive 저장소 호환 정책
* Firestore 보안 규칙 기반 사용자/회사 범위 통제

### 표준 구조에서 제외된 항목

* 브라우저에서 n8n Webhook 직접 호출
* `prepare-upload`
* `verify-upload-token`
* `upload-failed`
* `uploadSessions`
* n8n Webhook CORS에 의존하는 직접 업로드 구조
* n8n의 `N8LIENT_BASE_URL` 의존 구조

### MVP 제외 사항(향후 확장 예정)

* 결제 및 과금 모듈
* 네이티브 앱 패키징 및 푸시 알림
* 대용량 업로드 재시도 큐
* Gateway 작업 큐/비동기 잡 분리
* Google Drive 결과물 전체 DB 마이그레이션 및 동기화 도구
* 부서/팀 단위 세분화 권한
* Secret Manager 기반 비밀값 운영 고도화

---

## 7. n8n 워크플로우 수정 시 반드시 지켜야 할 원칙

1. **전체 구조 최소 변경**
   * 기존 n8n 워크플로우는 필요한 노드만 최소 수정한다.
   * 기존 정상 동작 중인 비즈니스 처리 노드는 함부로 갈아엎지 않는다.

2. **호출 경로 단일화 원칙**
   * 텍스트와 파일 실행 모두 Cloud Run Gateway가 n8n Webhook을 서버 간 호출한다.
   * 브라우저가 n8n Webhook을 직접 호출하지 않는다.

3. **브라우저 토큰 노출 금지**
   * 브라우저에는 `N8N_SERVER_MAIN_TOKEN`, `X-N8N-TOKEN`, n8n 공통 토큰, API Key를 절대 노출하지 않는다.
   * 브라우저는 Gateway URL만 안다.

4. **settings 병합 책임 분리**
   * n8n은 Firestore를 직접 조회하거나 개인/회사 설정을 병합하지 않는다.
   * n8n은 Gateway가 전달한 `payload.settings`를 최종 실행 설정값으로 사용한다.

5. **Webhook URL/Secret 하드코딩 금지**
   * Webhook URL, Token, Secret, API Key는 노드 코드에 하드코딩하지 않는다.
   * n8n에서 필요한 서버 토큰과 callback secret은 n8n 서버 환경변수로 관리한다.

6. **공용 Google Credential 및 저장소 정책**
   * Google Drive, Google Sheets, Gmail 노드는 사용자별 Credential을 런타임에 동적으로 바꾸지 않는다.
   * n8n에는 자동화 실행용 공용 Credential을 고정 연결한다.
   * Google Drive/Sheets 저장용 Credential은 운영용 OAuth 계정 Credential 또는 Google Service Account Credential을 사용할 수 있다.
   * Gmail 발송은 일반적으로 공용 Gmail OAuth Credential을 사용한다.
   * My Drive 사용 시 `driveId`는 비워두거나 기본값 `My Drive`를 사용한다.
   * Shared Drive 사용 시 `driveId`에는 Shared Drive ID를 넣고, `mdFolderId`와 `originalFileFolderId`에는 해당 Drive 내부 폴더 ID를 넣는다.
   * Service Account Credential을 사용하는 경우 Shared Drive 사용을 기본 권장한다.
   * 대상 Drive/Folder/Sheet는 해당 OAuth 계정 또는 서비스 계정 이메일에 쓰기 권한으로 공유되어 있어야 한다.

7. **자격증명 전송 금지**
   * settings에는 폴더 ID, 시트 ID, 수신 이메일 등 대상 리소스 값만 넣는다.
   * Google Access Token, Refresh Token, n8n Credential ID, Gemini API Key는 settings에 넣지 않는다.

8. **파일 원본 저장소 원칙**
   * Firestore/Firebase Storage에 파일 원본, Blob, base64, binary를 저장하지 않는다.
   * Gateway는 임시 수신한 파일을 n8n으로 전달하고 즉시 삭제한다.
   * 파일 원본은 n8n이 Google Drive에 저장한다.
   * Firestore에는 파일명, MIME, 크기, 상태, result URL 같은 메타데이터만 저장한다.

9. **Webhook binary 처리 원칙**
   * 파일 입력 워크플로우는 Webhook 노드가 multipart/form-data와 binary `file_0`를 받을 수 있게 구성한다.
   * 입력 정리 노드는 `file_0` 또는 워크플로우 내부 표준 binary 필드로 변환한다.

10. **CORS 원칙**
    * n8n은 브라우저에서 직접 호출되지 않는다.
    * 따라서 n8n Webhook의 CORS는 표준 운영 구조의 핵심 요구사항이 아니다.
    * 브라우저 CORS는 Frontend ↔ Gateway 구간에서만 관리한다.

11. **즉시 응답 의미 구분**
    * n8n Webhook의 즉시 응답(onReceived)은 처리 완료가 아니라 실행 접수 의미다.
    * 실제 완료 여부는 callback API로 갱신된 submissions 상태를 기준으로 판단한다.

12. **callback 원칙**
    * 작업 성공 시 `callbackUrl`로 success payload를 전송한다.
    * 작업 실패 시 failed 또는 config_error payload를 전송한다.
    * n8n이 Firestore `submissions`를 직접 수정하지 않고, Gateway callback API가 상태를 갱신한다.

13. **권한 누락 예외 처리**
    * Google Drive/Sheet 권한 미공유, 필수 settings 누락, 리소스 접근 실패는 무시하지 않는다.
    * callback failed 또는 config_error로 명확히 반환한다.

14. **Sticky Note 갱신**
    * n8n 워크플로우 내부 Sticky Note는 실제 입력 방식, settings, Gateway, callback 구조와 일치해야 한다.


15. **Drive 저장소 운영 정책**
   * N8Lient의 Drive 저장 설정은 `driveId`, `mdFolderId`, `originalFileFolderId`로 분리한다.
   * `driveId`는 선택값이며, My Drive 사용 시 생략할 수 있다.
   * Shared Drive 사용 시 `driveId`는 Shared Drive ID를 의미한다.
   * 회사 공용 자료는 Shared Drive의 회사 공용 폴더를 권장한다.
   * 개인별 비공개 자료는 Shared Drive 안의 개인 제한 폴더를 권장한다.
   * Shared Drive를 사용하지 않는 고객사는 OAuth 계정 Credential 기반 My Drive 폴더 공유를 예외 구조로 사용할 수 있다.
   * 이 차이는 프로그램 로직보다 운영 정책과 권한 정책의 영역이다.
