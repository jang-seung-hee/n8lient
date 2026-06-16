# N8Lient 마이그레이션 프롬프트 v2.5 세트

이 세트는 일반 n8n 워크플로우를 N8Lient 표준 구조로 마이그레이션할 때 사용하는 프롬프트 문서다.

## 포함 파일

1. `01_시작프롬프트_v1.3_결과DB화_GoogleDriveOptionalExport_MD첨부.md`
2. `02_N8Lient_n8n_마이그레이션_프롬프트_v2.5_입력Validation계약_결과DB화_GoogleDriveOptionalExport_MD첨부.md`
3. `03_N8Lient_workflow_master_html_guide_import_json_prompt_v2.5_MD첨부.md`

## v2.5 핵심 변경

- 보존형 기초설계서 표현을 최신/리뉴얼 기초설계서 기준으로 정리했다.
- v2.4의 입력 Validation 계약은 유지한다.
- `notify_only`는 이메일 중심 경량형으로 정의한다.
- `notify_only`에서도 Markdown 결과 파일을 임시 생성해 이메일에 첨부할 수 있다.
- 단, `notify_only`의 MD 첨부파일은 DB/Storage/resultRefs에 보관하지 않는다.
- `processed_result`는 DB 저장/검색/조회 중심이다.
- `full_archive`는 DB 저장에 더해 원본/첨부파일 및 결과 파일 참조를 Storage와 연결한다.

## 사용 순서

1. 최신 기초설계서 세트와 대상 n8n JSON을 준비한다.
2. `01_시작프롬프트`로 대화 흐름을 시작한다.
3. `02_마이그레이션_프롬프트`로 1차 분석/수정 승인/최종 JSON 생성을 진행한다.
4. 수정된 최종 n8n JSON을 기준으로 `03_Import_JSON_가이드_프롬프트`를 사용해 N8Lient 워크플로우 마스터 등록 HTML 및 Import JSON을 생성한다.
