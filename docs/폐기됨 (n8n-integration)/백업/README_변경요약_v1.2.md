# N8Lient 문서 v1.2 Cloud Run Gateway 변경 요약

## 변경 핵심

기존 문서의 기준이었던 `n8n 직접 파일 업로드 + 1회성 uploadToken 검증 구조`를 제거하고, 현재 구현 구조인 `Cloud Run Gateway API 경유 구조`로 문서 전체를 갱신했다.

## 공통 제거 항목

- 브라우저 → n8n 직접 업로드
- uploadToken
- verify-upload-token
- upload-failed
- uploadSessions
- n8n CORS 의존 구조
- n8n의 N8LIENT_BASE_URL 의존 구조

## 공통 추가 항목

- Cloud Run Gateway `n8lient-gateway`
- `POST /api/automation/execute` 통합 실행 API
- `POST /api/automation/callback` Gateway 콜백 API
- Gateway에서 Firebase 인증, settings 병합, 파일 수신, n8n 서버 간 호출 처리
- n8n은 `X-N8N-TOKEN` 검증 후 `payload.settings`만 사용
- 파일 원본은 Gateway 임시 처리 후 n8n이 Google Drive에 저장
- Firestore에는 파일 메타데이터만 저장

## 산출 파일

1. N8Lient_DB_연동규약서_v1.2_Cloud_Run_Gateway.md
2. N8Lient_MVP_구조개요서_v1.2_Cloud_Run_Gateway.md
3. N8Lient_Webhook_Callback_연동규약서_v1.2_Cloud_Run_Gateway.md
4. N8Lient_n8n_워크플로우_JSON_수정_프롬프트_v1.2_Cloud_Run_Gateway.md
