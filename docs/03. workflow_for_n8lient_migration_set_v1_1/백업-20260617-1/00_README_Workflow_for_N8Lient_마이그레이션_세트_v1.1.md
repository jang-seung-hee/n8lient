# Workflow for N8Lient 마이그레이션 세트 1.1

이 문서 세트는 일반 n8n 워크플로우를 N8Lient 운영 구조에 맞게 다루기 위한 작업 세트다.

v1.1에서는 Level 1 `notify_only`의 기존 이메일 MD 임시 첨부 정책은 유지하면서, Webhook multipart로 넘어온 입력 원본 파일(file/image/audio 등)을 이메일에 임시 첨부할 수 있는 선택 규칙을 추가했다. 이 원본 첨부는 이메일 전송용일 뿐이며 N8Lient DB/Storage/originalFileRefs/resultRefs에는 보관하지 않는다.
기초설계서 8종은 이 세트에 포함하지 않는다. 실제 작업 시 최신 N8Lient 기초설계서 문서세트를 별도로 첨부한다.

## 작업 모드

1. **커스터마이징 + 이메일 디자인 개선 동시**
   - n8n 워크플로우를 N8Lient 표준으로 마이그레이션하면서 이메일 리포트 디자인도 함께 개선한다.
   - 신규 또는 대규모 전환 작업의 기본 권장 모드다.

2. **커스터마이징만 실시**
   - n8n 워크플로우를 N8Lient 표준으로만 마이그레이션한다.
   - 이메일 디자인은 기존 구조를 유지한다.

3. **이메일 디자인 개선만 수행**
   - 이미 동작 검증된 워크플로우의 Notify / Email 영역만 수정한다.
   - 업무 처리 로직, Processor, callback, retentionPolicy, DB/Storage 정책은 변경하지 않는다.

4. **워크플로우 등록 가이드 생성**
   - 최종 n8n JSON을 분석해 N8Lient 워크플로우 마스터 등록용 HTML 가이드와 Import JSON을 만든다.
   - n8n JSON 자체는 수정하지 않는다.

## 파일 구성

```text
00_README_Workflow_for_N8Lient_마이그레이션_세트_v1.1.md
01_START_작업모드_선택_프롬프트_v1.1.md
02A_MODE1_커스터마이징_디자인동시_프롬프트_v1.1.md
02B_MODE2_커스터마이징_only_프롬프트_v1.1.md
02C_MODE3_이메일디자인_only_프롬프트_v1.1.md
03_MODE4_워크플로우_등록가이드_ImportJSON_생성_프롬프트_v1.1.md
references_email_design_v3_3_optional/
```

## 사용 방식

먼저 `01_START_작업모드_선택_프롬프트_v1.1.md`를 새 대화창 첫 메시지로 넣는다.
AI는 즉시 작업을 시작하지 않고, 사용자에게 4가지 작업 모드 중 하나를 선택하게 해야 한다.
선택 후 해당 모드에 필요한 파일만 요청한다.

## 이메일 디자인 참고 파일

이 세트에는 현재 사용 중인 이메일 디자인 v3.3 참고 파일을 `references_email_design_v3_3_optional` 폴더에 포함했다.
다만 디자인 버전은 추후 교체 가능하다. 실제 작업 시 사용자가 더 최신 버전의 템플릿 HTML, Design.md, 디자인 작업 프롬프트를 제공하면 그 최신 파일을 우선한다.

## 공통 안전 원칙

- 기존 정상 동작 중인 업무 처리 로직은 최대한 보존한다.
- 수정 전 변경 대상 노드와 이유를 먼저 보고한다.
- 승인 전 1차 보고에는 전체 노드 검토표를 **.xlsx(우선)** 또는 **.html**로 제공한다. (불가 시 채팅 표)
- 승인 전에는 JSON을 수정하거나 새 JSON을 생성하지 않는다.
- Credential, Token, Secret, API Key, Access Token, Refresh Token, Private Key, Service Account 값은 출력하지 않는다.
- 문서 간 충돌이 있으면 최신 N8Lient 기초설계서의 현재 정책을 우선한다.
