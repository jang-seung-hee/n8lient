# 엔팔라이언트(N8Lient) MVP 기획 설계서 v0.1

## 1. 문서 목적

이 문서는 n8n 솔루션 사업화를 위한 클라이언트용 웹/앱 서비스 **엔팔라이언트(N8Lient)** 의 MVP 백본 설계를 정리한 문서이다.

이 문서는 상세 PRD가 아니다. 개발 전에 반드시 고정해야 하는 제품 구조, 역할 구분, 핵심 플로우, UI 방향, 보안 기준, DB/n8n 연동 원칙을 정리하는 백본 설계서이다.

세부 화면, 데이터 분석, 보고서, 통계, 과금, 고급 검색 기능은 MVP 이후 실제 구현 과정에서 확장한다.

---

## 2. 제품 개요

### 2.1 제품명

- 한글명: 엔팔라이언트
- 영문명: N8Lient
- 의미: N8 + Client
- 내부 개념: n8n 자동화 리모콘

### 2.2 제품 정의

엔팔라이언트는 고객사가 n8n 기반 자동화 워크플로우를 직접 설정하고 실행하며, 처리 결과를 확인할 수 있도록 돕는 웹 기반 자동화 클라이언트이다.

엔팔라이언트는 n8n 워크플로우를 직접 포함하지 않는다. n8n은 자동화 실행 엔진으로 동작하고, 엔팔라이언트는 사용자 인증, 회사 승인, 자동화 설정, 실행 요청, 실행 결과 확인을 담당한다.

```text
엔팔라이언트 = 인증 / 승인 / 설정 / 실행요청 / 결과확인
n8n = 자동화 실행 엔진
Firebase = 회사 / 사용자 / 설정 / 실행상태 기준 DB
```

### 2.3 기본 기술 방향

```text
프론트엔드: 웹앱, PWA 확장 가능 구조
배포: GitHub + Netlify
인증/DB: Firebase Auth + Firestore
자동화: n8n Webhook
외부 도구: Google Drive, Gmail, Google Calendar, Gemini API
```

초기에는 네이티브 앱이 아니라 모바일/PC 반응형 웹앱으로 개발한다.

---

## 3. 서비스 전체 구조

```text
사용자 / 회사 관리자 / 운영자
        ↓
엔팔라이언트 웹앱
        ↓
Firebase Auth / Firestore / Storage
        ↓
n8n Webhook
        ↓
Google Drive / Gmail / Google Calendar / Gemini API
```

### 3.1 역할 분리

- 엔팔라이언트는 n8n과 독립적으로 운영한다.
- n8n은 실행 엔진으로만 사용한다.
- 엔팔라이언트와 n8n은 Firebase DB의 설정값과 표준 payload를 통해 연결한다.
- 워크플로우 내부 하드코딩값은 점진적으로 Firebase 설정값 조회 방식으로 변경한다.

---

## 4. 권한 구조

엔팔라이언트는 3개 역할로 구분한다.

| 구분 | 역할 | 주요 기능 |
|---|---|---|
| 운영자 | 엔팔라이언트 사업자 | 회사 등록, 자동화 템플릿 등록, 계약 자동화 부여, Webhook 관리 |
| 회사 관리자 | 고객사 관리자 | 사용자 승인, 회사 설정, 자동화 설정, 실행 결과 관리 |
| 일반 사용자 | 고객사 소속 사용자 | 자동화 실행, 실행 결과 확인, 실패 건 재전송 |

실제 구현은 하나의 웹앱 안에서 권한별 라우트를 분리한다.

```text
/user
/company-admin
/operator
```

로그인은 하나로 통일하고, 로그인 후 role에 따라 별도 영역으로 이동한다.

---

## 5. MVP 핵심 플로우

### 5.1 회원가입 및 회사 승인

```text
1. 사용자가 Google Auth로 로그인한다.
2. 최초 로그인 시 사용자 프로필이 생성된다.
3. 사용자가 회사코드를 입력한다.
4. 회사코드가 유효하면 승인 요청이 생성된다.
5. 회사 관리자에게 승인 요청이 전달된다.
6. 회사 관리자가 승인하면 사용자는 해당 회사 소속으로 등록된다.
7. 승인된 사용자만 회사가 계약한 자동화를 사용할 수 있다.
```

회원가입만으로는 자동화를 사용할 수 없다. 회사 승인 완료 후 사용 가능하다.

### 5.2 자동화 계약 및 설정

```text
1. 운영자가 회사 계정을 생성한다.
2. 운영자가 회사에 사용 가능한 자동화를 부여한다.
3. 회사 관리자는 계약된 자동화 목록을 확인한다.
4. 회사 관리자는 자동화 인스턴스를 생성한다.
5. 자동화 명세서에 정의된 필수 설정값을 입력한다.
6. 입력된 설정값은 clientAutomations.settings에 저장된다.
7. 설정이 완료된 자동화만 사용자 실행 메뉴에 표시된다.
```

### 5.3 자동화 실행

```text
1. 사용자가 실행 메뉴에서 자동화를 선택한다.
2. 사용자가 텍스트, 파일, 이미지, 음성 등을 입력한다.
3. 엔팔라이언트가 submission을 생성한다.
4. 엔팔라이언트가 n8n Webhook으로 표준 payload를 보낸다.
5. n8n은 automationId 기준으로 Firebase에서 설정값을 조회한다.
6. n8n은 설정값을 검증한다.
7. n8n은 기존 자동화 로직을 실행한다.
8. n8n은 처리 결과를 submissions에 업데이트한다.
9. 사용자는 실행 결과 메뉴에서 상태를 확인한다.
```

### 5.4 실패 재전송

실패한 실행 건은 기존 submissionId를 재사용하지 않는다. 새 submissionId를 생성하고 기존 실패 건을 retryOf로 연결한다.

```json
{
  "submissionId": "sub_20260607_0002",
  "retryOf": "sub_20260607_0001"
}
```

---

## 6. MVP 범위

### 6.1 1차 MVP 포함 기능

```text
1. Google Auth 로그인
2. 회사코드 입력
3. 회사 관리자 승인
4. 운영자 회사 등록
5. 운영자 자동화 템플릿 등록
6. 운영자 계약 자동화 부여
7. 회사 관리자 자동화 인스턴스 생성
8. 자동화별 필수 설정값 입력
9. 일반 사용자 자동화 실행
10. n8n Webhook 호출
11. n8n의 Firebase 설정 조회
12. 실행 결과 상태 확인
13. 실패/처리제외 사유 확인
14. 실패 건 재전송
```

### 6.2 MVP 제외 기능

```text
1. 고급 데이터 분석
2. 통합 검색
3. 월간 보고서 대시보드
4. 과금/결제 관리
5. 네이티브 모바일 앱
6. 푸시 알림
7. Google Drive 결과물 전체 DB 마이그레이션
8. AI 기반 지식 검색
9. 세부 팀/부서 권한
10. 사용량 기반 과금 계산
```

MVP는 승인, 설정, 실행, 결과 확인에 집중한다.

---

## 7. 화면 구조

### 7.1 사용자용 UI

사용자용 UI는 모바일과 PC의 기본 구조를 유사하게 유지한다.

#### 모바일 사용자용

```text
하단 바텀 메뉴 중심
- 홈
- 실행
- 결과
- 내정보
```

모바일은 빠른 실행과 결과 확인 중심이다.

#### PC 사용자용

PC에서도 하단 바텀 메뉴를 유지한다. 다만 왼쪽에 데이터 분석활용 패널을 추가한다.

```text
[데이터 분석활용]

* 통자요
* 회의록
* 아이디어 캐치
* 업무위키
```

왼쪽 패널은 실행 메뉴가 아니다. 해당 자동화에서 축적된 데이터를 검색, 분석, 히스토리 확인하는 확장 기능 진입 영역이다.

자동화 실행은 하단 메뉴의 실행에서 처리한다.

### 7.2 회사 관리자용 UI

회사 관리자용은 사용자용과 별도 페이지로 분리한다.

```text
/company-admin
```

주요 메뉴:

```text
- 회사 정보
- 사용자 승인 관리
- 사용자 목록
- 계약 자동화 목록
- 자동화 설정
- 실행 결과
- 실패/처리제외 관리
```

### 7.3 운영자용 UI

운영자용은 별도 운영 콘솔로 분리한다.

```text
/operator
```

주요 메뉴:

```text
- 회사 관리
- 자동화 템플릿 관리
- 회사별 계약 자동화 관리
- Webhook 관리
- 전체 실행 로그
- 시스템 설정
```

---

## 8. 보안 기준

### 8.1 보안 목표

엔팔라이언트 MVP는 소기업·자영업자용 실사용 서비스 수준의 보안을 목표로 한다.

방어 대상:

```text
- 일반 사용자 조작
- 개발자도구 요청 변조
- 승인 전 접근
- 타 회사 데이터 접근
- Webhook 직접 호출
- API Key 노출
- Firestore Rules 오픈 사고
```

방어 제외:

```text
- 국가급 공격
- 관리자 계정 탈취
- 사용자 PC 감염
- 내부자 악용
- 클라우드 계정 자체 탈취
- 전문 모의해킹 수준의 지속 공격
```

### 8.2 핵심 보안 원칙

```text
1. 프론트엔드 값은 신뢰하지 않는다.
2. clientId, uid, role은 서버 또는 DB에서 재검증한다.
3. n8n Webhook URL은 브라우저 코드에 노출하지 않는다.
4. API Key와 내부 토큰은 프론트에 노출하지 않는다.
5. Firestore Rules를 완화해서 오류를 해결하지 않는다.
6. 일반 사용자는 자기 회사와 자기 실행 결과만 접근 가능해야 한다.
7. 회사 관리자는 같은 clientId 데이터만 접근 가능해야 한다.
8. 운영자 기능은 operator role만 접근 가능해야 한다.
```

### 8.3 권장 호출 구조

```text
브라우저
  ↓
Firebase Auth
  ↓
Netlify Function 또는 Firebase Function
  ↓
권한 검증
  ↓
n8n Webhook 호출
```

피해야 할 구조:

```text
브라우저
  ↓
n8n Webhook 직접 호출
```

---

## 9. n8n 연동 원칙

n8n과 엔팔라이언트가 반드시 맞춰야 하는 기본 키는 다음이다.

```text
clientId
uid
workflowKey
automationId
submissionId
```

n8n은 실행 시 다음 순서로 처리한다.

```text
1. Webhook payload 수신
2. 필수값 검증
3. clientAutomations/{automationId} 조회
4. clientId 일치 확인
5. workflowKey 일치 확인
6. enabled 확인
7. configStatus 확인
8. workflowTemplates/{workflowKey}.configSchema 조회
9. required=true인 key가 settings에 모두 있는지 확인
10. settings 값으로 자동화 실행
11. submissions에 결과 업데이트
```

가장 중요한 규칙은 다음이다.

```text
workflowTemplates.configSchema.key
=
clientAutomations.settings.key
=
n8n에서 읽는 settings.key
```

---

## 10. DB 백본 요약

MVP 기준 컬렉션은 다음으로 확정한다.

```text
clients
users
companyJoinRequests
workflowTemplates
clientContracts
clientAutomations
submissions
secrets
```

데이터 분석 기능은 나중에 추가한다.

---

## 11. 자동화 명세서 개념

새 자동화를 등록할 때는 자동화 명세서를 반드시 함께 등록한다.

자동화 명세서에는 다음 정보가 들어간다.

```text
- workflowKey
- 자동화 이름
- 설명
- 버전
- 입력 방식
- 필수 설정값
- 선택 설정값
- Webhook Secret 참조값
- 상태
```

자동화 명세서가 없으면 고객사에 공개하지 않는다.

상태 흐름:

```text
draft → schema_ready → test_passed → published
```

MVP에서는 다음 3개 상태만 사용해도 된다.

```text
draft
published
disabled
```

---

## 12. 지결자 예시

새 자동화 예시:

```text
자동화명: 지출결의서 자동 정리
줄임말: 지결자
workflowKey: expense-report
```

필수 항목:

```text
- 구글드라이브 ID
- 구글시트 ID
- 회계담당 이메일
- 사용자 이메일
```

이 값들은 SQL 컬럼처럼 미리 DB 테이블에 만드는 것이 아니다. 자동화 명세서의 key를 기준으로 `clientAutomations.settings` 객체에 저장한다.

예:

```json
{
  "automationId": "auto_expense_001",
  "clientId": "client_rentaltoktok_001",
  "workflowKey": "expense-report",
  "automationName": "지결자",
  "settings": {
    "googleDriveId": "google_drive_folder_id",
    "googleSheetId": "google_sheet_id",
    "accountantEmail": "accounting@company.com",
    "userEmail": "user@gmail.com"
  }
}
```

---

## 13. 백본 설계 원칙

```text
1. DB는 문서형으로 유연하게 관리한다.
2. key 이름은 자동화 명세서 기준으로 엄격하게 관리한다.
3. n8n은 automationId 기준으로 설정값을 조회한다.
4. 회사별 설정값은 clientAutomations.settings에 저장한다.
5. 민감정보는 secrets에 저장하고 secretId로 참조한다.
6. 상세 기능은 만들면서 조정하되, 연결 규격은 고정한다.
```

---

## 14. 다음 단계

이 문서 이후 바로 진행할 수 있는 작업은 다음이다.

```text
1. Firebase 프로젝트 생성
2. Google Auth 로그인 구현
3. Firestore 기본 컬렉션 생성
4. users / clients 구조 구현
5. 회사코드 승인 플로우 구현
6. workflowTemplates 등록 화면 구현
7. clientAutomations 설정 저장 구현
8. n8n 테스트 Webhook 연결
9. 지결자 또는 통자요 샘플 자동화로 end-to-end 테스트
```

상세 기획은 이 단계 이후 실제 구현을 보면서 보완한다.
