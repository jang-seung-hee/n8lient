# CHANGELOG v1.2 — Workflow for N8Lient 마이그레이션 세트

- 작성일: 2026-06-17
- 변경 목적: `09_엔팔라이언트_워크플로우_버전관리_운영_계약_v1.0` 기준을 n8n 커스터마이징/디자인/등록가이드 프롬프트 세트에 반영

## 변경 요약

```text
1. START 문서에서 최신 기초설계서 세트 기준을 01~09로 확장
2. MODE 1 / MODE 2에 워크플로우 버전관리 운영 계약 준수 규칙 추가
3. MODE 1 / MODE 2의 1차 보고와 최종 보고에 버전관리 검토 항목 추가
4. MODE 3 이메일 디자인 Only 작업을 일반적으로 PATCH 후보로 판단하도록 기준 추가
5. MODE 4 Import JSON 생성 시 workflowVersion, n8n 워크플로우명 버전 표기, webhookPath/n8nWorkflowId 확인, releaseType 후보 확인 기준 추가
```

## 유지한 정책

```text
- v1.1의 notify_only MD 첨부 정책 유지
- v1.1의 입력 원본파일 이메일 임시 첨부 정책 유지
- 기존 4개 작업 모드 구조 유지
- 이메일 디자인 Only 모드의 수정 금지 범위 유지
- n8n JSON, 앱 코드, DB 스키마, Firestore Rules 변경 없음
```

## 버전관리 반영 핵심

```text
워크플로우 JSON을 수정하거나 신규 산출물을 생성할 때는 09번 버전관리 운영 계약을 따른다.
변경 유형을 PATCH / MINOR / MAJOR 중 하나로 판단하고, 권장 workflowVersion, 기존 고객 적용 가능 여부, migrationRequired 여부, rollbackTarget을 함께 보고한다.
```
