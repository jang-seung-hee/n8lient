# N8Lient 규약 기반 n8n 워크플로우 JSON 수정 지시 프롬프트 v1.1

첨부한 아래 4개 파일을 기준으로 n8n 워크플로우 JSON을 엔팔라이언트(N8Lient) 규약에 맞게 최적화/수정하라.

참고 문서.

1. N8Lient_MVP_구조개요서.md
2. N8Lient_DB_연동규약서.md
3. N8Lient_Webhook_Callback_연동규약서.md
4. 수정 대상 n8n 워크플로우 JSON

중요 원칙.

1. 전체를 갈아엎지 말고 필요한 노드만 최소 변경한다.
2. 수정 전 변경 대상 노드와 이유를 먼저 보고하고 승인받는다.
3. n8n은 Firestore를 직접 조회하거나 개인/회사 설정을 병합하지 않는다.
4. 서버 간 실행에서는 execute API가 전달한 `payload.settings`를 최종 실행 설정값으로 사용한다.
5. 파일 직접 업로드 실행에서는 `verify-upload-token` API가 반환한 canonical `payload.settings`를 최종 실행 설정값으로 사용한다.
6. settings.xxx는 configSchema 후보, input.xxx는 실행 입력값, payload.xxx는 시스템 메타데이터, $env.xxx는 n8n 서버 환경변수로 분류한다.
7. Webhook URL, Token, Secret, API Key는 하드코딩하지 않는다.
8. 브라우저에는 공통 `X-N8N-TOKEN` 또는 n8n 서버 토큰을 절대 노출하지 않는다.
9. 브라우저 직접 파일 업로드 경로에서는 `submissionId + uploadToken`을 사용하고, n8n은 엔팔라이언트 `/api/automation/verify-upload-token`으로 검증한 뒤 반환된 canonical payload를 사용한다.
10. Google Drive, Google Sheets, Gmail 노드는 사용자별 Credential을 동적으로 바꾸지 않고 n8n 공용 Google 계정 Credential을 고정 사용한다.
11. settings에는 폴더 ID, 시트 ID, 수신 이메일 등 대상 리소스 값만 넣고, Google Access Token, Refresh Token, n8n Credential ID, Gemini API Key는 절대 넣지 않는다.
12. 개인/회사 Google Drive 폴더나 Sheet는 n8n 공용 Google 계정에 쓰기 권한으로 공유되어 있어야 한다.
13. reportEmailTo는 수신자이며, 실제 발신자는 n8n 공용 Gmail 계정이다.
14. 작업 완료 후 callbackUrl로 success payload를 전송한다.
15. 실패 callback은 현재 워크플로우에서 처리할지, 공통 오류 리포터에서 처리할지 명확히 구분한다.
16. 권한 미공유, 필수 settings 누락, 리소스 접근 실패는 callback failed 또는 config_error로 반환하도록 설계한다.
17. 파일 입력이 있는 워크플로우는 Webhook 노드가 multipart/form-data와 binary `file_0`를 받을 수 있게 구성한다.
18. 브라우저 직접 업로드를 지원하는 워크플로우는 `00 환경설정` 노드에서 두 인증 방식을 모두 지원해야 한다.
    - 서버 간 호출: `X-N8N-TOKEN` 검증 후 payload 사용
    - 브라우저 직접 업로드: `submissionId + uploadToken` 추출 후 `/api/automation/verify-upload-token` 검증, 검증 성공 시 canonical payload 사용
19. n8n Webhook의 Allowed Origins(CORS)에는 엔팔라이언트 운영 도메인과 로컬 테스트 도메인을 지정해야 하며, 운영에서 `*` 허용은 금지한다.
20. Firestore/Firebase Storage에 파일 원본, base64, Blob을 저장하지 않는다. 파일 원본은 n8n이 Google Drive에 저장한다.
21. n8n Webhook의 즉시 응답은 처리 완료가 아니라 업로드/실행 접수 의미다. 실제 완료는 callbackUrl 결과로 판단한다.
22. Sticky Note도 문서 규약과 실제 코드 분석 결과에 맞게 갱신한다.

최종 보고에는 수정/추가/삭제한 노드, settings/input/payload/env 추출 결과, configSchema 등록 필요 항목, inputSchema 파일 입력 지원 여부, 공용 Google 계정 Credential 사용 여부, 서버 간 호출과 직접 업로드 호출의 인증 구조, Webhook binary `file_0` 처리 여부, CORS 설정 필요 여부, callback 구조, Sticky Note 갱신 여부, 남은 위험 요소, import 가능성 점검 결과만 포함하라.
