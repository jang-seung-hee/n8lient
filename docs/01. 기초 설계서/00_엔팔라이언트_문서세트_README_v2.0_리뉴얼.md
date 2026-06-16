# 엔팔라이언트 기초설계서 세트 v2.0 — README

- 문서명: 엔팔라이언트 기초설계서 세트 적용 안내
- 버전: v2.0 리뉴얼
- 작성일: 2026-06-16
- 문서 상태: 현행 기준 통합본
- 적용 범위: N8Lient 앱, Gateway, n8n 워크플로우, Firestore, Firebase Storage, Optional Export

---

## 1. 리뉴얼 목적

본 문서세트는 기존 보존형 문서에 누적되어 있던 개정 메모, 중복 설명, 폐기된 필드명, 구형 설계 내용을 제거하고, 현재 확정된 정책을 기준으로 다시 정리한 현행 기준 설계 문서다.

이번 리뉴얼의 핵심은 다음과 같다.

```text
1. 보존형 누적 메모 제거
2. 결과 보관 레벨 정책 재정의
3. Gateway 중심 실행 계약 정리
4. DB/Storage/Optional Export 역할 분리
5. Level 2 지식 DB화와 검색 기준 정리
6. n8n 프로세서 전환 기준 정리
7. 구형 필드명과 폐기 정책 제거
```

---

## 2. 문서 구성

```text
00_엔팔라이언트_문서세트_README_v2.0_리뉴얼.md
01_엔팔라이언트_솔루션_헌법_v2.0_리뉴얼.md
02_엔팔라이언트_아키텍처_명세서_v2.0_리뉴얼.md
03_엔팔라이언트_결과_보관_레벨_계약_v2.0_리뉴얼.md
04_엔팔라이언트_DB_Storage_계약_v2.0_리뉴얼.md
05_엔팔라이언트_Gateway_n8n_실행_계약_v2.0_리뉴얼.md
06_엔팔라이언트_n8n_프로세서_전환_체크리스트_v2.0_리뉴얼.md
07_엔팔라이언트_결과_DB화_지식검색_계약_v2.0_리뉴얼.md
08_엔팔라이언트_Google_Drive_Optional_Export_계약_v2.0_리뉴얼.md
```

---

## 3. 문서 우선순위

설계 판단이 충돌할 경우 아래 순서로 해석한다.

```text
1. 01 솔루션 헌법
2. 02 아키텍처 명세서
3. 03 결과/보관 레벨 계약
4. 04 DB/Storage 계약
5. 05 Gateway ↔ n8n 실행 계약
6. 06 n8n 프로세서 전환 체크리스트
7. 07 결과 DB화/지식검색 계약
8. 08 Google Drive Optional Export 계약
```

세부 구현은 코드가 우선할 수 있으나, 구조 정책이 어긋나는 경우 문서 기준으로 재검토한다.

---

## 4. 현재 핵심 정책 요약

### 4.1 결과 보관 레벨

```text
Level 1 notify_only
= 이메일 중심 경량형. N8Lient에는 생성 지식 본문/파일을 보관하지 않는다.
= 단, 이메일 본문 또는 MD 첨부파일 전송은 가능하다.

Level 2 processed_result
= 1단계 + 생성 지식 DB 저장 + 결과 열람/공유/검색.
= MD 다운로드는 저장된 processorResult.mdContent 기반으로 동적 생성 가능하다.

Level 3 full_archive
= 2단계 + 원본/첨부파일/결과파일 참조 저장.
= Firebase Storage를 통해 원본성과 재검증을 지원한다.
```

### 4.2 저장소 구분

```text
Firestore = 상태, 설정, 권한, 실행 로그, processorResult
Firebase Storage = 원본 파일, 결과 파일, 다운로드 대상 파일
Google Drive = 기본 저장소가 아니라 Optional Export
```

### 4.3 Gateway 원칙

```text
브라우저는 n8n을 직접 호출하지 않는다.
Gateway가 인증, 권한, 설정 병합, retentionPolicy 계산, 실행 로그 생성, n8n 호출을 담당한다.
n8n은 Gateway가 전달한 canonicalPayload만 사용한다.
```

### 4.4 title 계약

```text
input.title = 사용자가 직접 입력한 제목만. 없으면 null.
submissionTitle/displayTitle = 시스템 임시 표시 제목.
processorResult.title = 최종 결과 제목.
Gateway는 input.title을 고정 필수로 검사하지 않는다.
```

---

## 5. 폐기된 주요 내용

아래 내용은 현행 설계에서 폐기한다.

```text
raw n8n JSON을 앱이 직접 분석하는 방식
Google Drive를 기본 저장소로 보는 방식
n8n이 Firestore를 직접 수정하는 방식
모든 원본 파일을 무조건 영구 보관하는 방식
input.title을 모든 워크플로우의 고정 필수값으로 보는 방식
구형 resultRetentionLevel 중심 설명
구형 retentionPolicyOverride 필드명 중심 설명
보존형 개정 메모 누적 방식
```

---

## 6. 업데이트 원칙

문서를 다시 수정할 때는 아래 원칙을 따른다.

```text
1. 기존 원문을 계속 아래에 보존하지 않는다.
2. 중복 내용은 관련 문서 하나로 병합한다.
3. 폐기된 정책은 제거하거나 “폐기”로 명확히 표시한다.
4. 변경 이력보다 현재 정책을 우선한다.
5. 상세 디버깅 로그, 배포 리비전, 테스트 출력 전문은 별도 changelog/debug-notes로 분리한다.
6. 본 문서세트에는 솔루션 정책과 백본 설계에 필요한 내용만 남긴다.
```
