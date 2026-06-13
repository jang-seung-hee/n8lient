# 엔팔라이언트 결과/보관 레벨 정책 반영 문서 세트 적용 안내

- 문서 세트명: 엔팔라이언트 결과/보관 레벨 정책 반영 문서 세트
- 작성일: 2026-06-11
- 목적: 기존 엔팔라이언트 헌법·아키텍처·계약 문서의 책임 경계를 유지하면서, 자동화별 결과/보관 수준을 선택할 수 있는 `resultRetentionLevel` 정책을 자연스럽게 추가한다.

---

## 1. 포함 문서

```text
01_엔팔라이언트_솔루션_헌법_1.1.md
02_엔팔라이언트_아키텍처_명세서_1.1.md
03_엔팔라이언트_결과_보관_레벨_최소_계약_v0.1.md
04_엔팔라이언트_DB_Storage_최소_계약_v0.2.md
05_엔팔라이언트_Gateway_n8n_실행_계약_v0.2.md
06_엔팔라이언트_n8n_프로세서_전환_체크리스트_v0.2.md
```

---

## 2. 적용 원칙

기존 문서를 갈아엎지 않는다.  
기존 문서의 기본 철학, 서비스 책임 경계, 4단계 자동화 구조는 유지한다.

이번 문서 세트는 기존 문서에 다음 개념을 추가하는 개정안이다.

```text
결과/보관 레벨 정책
resultRetentionLevel
retentionPolicy
Result Policy Router
```

---

## 3. 버전 관계

```text
헌법 1.0 → 헌법 1.1
아키텍처 명세서 1.0 → 아키텍처 명세서 1.1
DB/Storage 최소 계약 v0.1 → v0.2
Gateway ↔ n8n 실행 계약 v0.1 → v0.2
n8n 프로세서 전환 체크리스트 v0.1 → v0.2
결과/보관 레벨 최소 계약 v0.1 → 신규
```

---

## 4. 핵심 변경 요약

### 4.1 자동화별 보관 수준 선택

자동화마다 결과와 원본을 어느 수준까지 보관할지 설정한다.

```text
notify_only        = 알림/로그형
processed_result   = 가공지식 저장형
full_archive       = 원본 포함 지식보관형
```

### 4.2 실행 로그와 지식 보관의 분리

모든 실행은 최소 submission 로그를 남긴다.  
그러나 processorResult 전체 저장, 원본 파일 저장, 결과 파일 저장은 보관 레벨에 따라 달라진다.

### 4.3 Firebase Storage의 위치 재정의

Firebase Storage는 여전히 엔팔라이언트의 기본 파일 보관 계층이다.  
다만 모든 자동화가 반드시 원본을 영구 저장해야 하는 것은 아니다.  
원본 영구 보관은 기본적으로 `full_archive` 레벨에서 수행한다.

### 4.4 Google Drive의 위치 유지

Google Drive는 기본 저장소가 아니다.  
Google Drive는 Watch 입력 또는 Optional Export 저장소다.

### 4.5 n8n 결과 처리 영역 보강

n8n 워크플로우는 결과 처리 영역에서 `retentionPolicy.level`을 확인하고 다음을 분기한다.

```text
[20] Result Policy Router
[21] Notify / Email
[22] Store Processor Result
[23] Optional Export
[24] Callback
```

---

## 5. 구현 권장 순서

```text
1. 문서 세트 검토 및 확정
2. workflowTemplates / clientAutomations에 retentionPolicy 필드 추가
3. Gateway canonicalPayload에 retentionPolicy 포함
4. Gateway 원본 저장 로직을 retentionPolicy 기준으로 조건 분기
5. n8n 워크플로우에 Result Policy Router 추가
6. 결과 상세 화면과 다운로드 API를 full_archive 중심으로 보강
7. 기존 워크플로우를 중요도순으로 v0.2 체크리스트 기준 전환
```

---

## 6. 주의 사항

`notify_only`라고 해서 아무 기록도 남기지 않는 것이 아니다.  
운영 추적을 위한 최소 submission은 항상 남긴다.

`processed_result`는 가공된 지식은 남기지만 원본 파일은 영구 보관하지 않을 수 있다.

`full_archive`는 원본 파일까지 보관하는 가장 무거운 정책이다. 원본 보관 실패는 실행 실패로 처리할 수 있다.

이 정책은 자동화별 도입 난이도와 고객사 저장 책임을 조절하기 위한 정책이다.
