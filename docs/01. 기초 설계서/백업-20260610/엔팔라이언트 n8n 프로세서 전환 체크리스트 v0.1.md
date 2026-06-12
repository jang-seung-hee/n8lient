# 엔팔라이언트 n8n 프로세서 전환 체크리스트 v0.1

- 문서명: 엔팔라이언트 n8n 프로세서 전환 체크리스트
    
- 버전: v0.1
    
- 상위 문서: 엔팔라이언트 솔루션 헌법 1.0, 엔팔라이언트 아키텍처 명세서 1.0
    
- 목적: 기존 n8n 워크플로우를 엔팔라이언트 표준 프로세서 구조로 전환할 때 확인할 최소 기준을 정의한다.
    

---

## 1. 기본 전환 원칙

기존 정상 동작 중인 업무 처리 로직은 불필요하게 갈아엎지 않는다.

우선 수정 대상은 다음이다.

```text
1. 입력/트리거 영역
2. 설정 해석 영역
3. 결과/보관 영역
4. callback 영역
5. 오류/예외 영역
```

Processor 영역은 하드코딩 제거와 processorInput / processorResult 정리 중심으로 수정한다.

---

## 2. 표준 영역 구분

모든 n8n 워크플로우는 다음 영역으로 구분한다.

```text
[01] Trigger / Input
[02] Payload Normalize
[03] Input Validate
[04] File Normalize

[10] Processor Start
[11] AI / Transform
[12] Parse Result
[13] Build Processor Result

[20] Optional Export
[22] Callback

[90] Error / Exception
```

노드명과 Sticky Note에서 이 구분이 보이도록 한다.

---

## 3. Sticky Note 체크

워크플로우에는 최소한 다음 Sticky Note가 있어야 한다.

```text
1. N8Lient 입력/인증 영역
2. Payload Normalize 영역
3. Processor 영역
4. Optional Export 영역
5. Callback 영역
6. Error / Exception 영역
```

Sticky Note에는 “N8Lient 연동부”와 “순수 업무 처리부”가 구분되도록 적는다.

---

## 4. 입력/트리거 전환 체크

확인할 것:

```text
- Webhook path가 workflowTemplates.webhookSecretId와 일치하는가
- Webhook 노드가 Header Auth Credential을 사용하는가
- 브라우저 직접 호출 구조가 제거되었는가
- uploadToken / verify-upload-token 구조가 제거되었는가
- multipart file_0 입력을 받을 수 있는가
- JSON payload와 multipart payload를 모두 처리할 수 있는가
```

---

## 5. Payload Normalize 체크

확인할 것:

```text
- canonicalPayload를 추출하는가
- settings를 Gateway 최종 설정값으로 신뢰하는가
- input을 실행 입력값으로 분리하는가
- callbackUrl을 payload에서 가져오는가
- submissionId를 payload에서 가져오는가
- old 구조의 $env 토큰 비교가 제거되었는가
```

n8n은 settings를 다시 병합하지 않는다.

---

## 6. Input Validate 체크

확인할 것:

```text
- 필수 input이 누락되면 config_error 또는 failed 처리하는가
- 필수 settings가 누락되면 config_error 처리하는가
- 파일이 필요한 워크플로우에서 file_0 또는 file reference를 확인하는가
- 지원하지 않는 파일 형식에 대해 명확한 error.code를 만드는가
```

---

## 7. File Normalize 체크

확인할 것:

```text
- binary file_0를 표준 primaryFile로 해석하는가
- 파일명, MIME 타입, 크기 정보를 정리하는가
- Processor 영역이 n8n binary 구조에 과도하게 직접 의존하지 않도록 중간 정리값을 만드는가
```

초기 구현에서는 binary file_0 사용을 허용한다.  
장기적으로는 originalFileRefs 또는 signed reference 기반 처리를 고려한다.

---

## 8. Processor 체크

확인할 것:

```text
- processorInput을 기준으로 처리하는가
- 입력 출처가 manual인지 watch인지에 직접 의존하지 않는가
- Google Drive 폴더 ID 같은 저장 정책값에 의존하지 않는가
- LLM 프롬프트나 변환 로직이 Processor 영역에 집중되어 있는가
- 기존 하드코딩 값을 settings 후보 또는 Local Config로 분리했는가
```

Processor 영역은 자동화별 핵심 업무 로직이다.  
불필요하게 플랫폼 책임을 넣지 않는다.

---

## 9. Build Processor Result 체크

확인할 것:

```text
- 결과를 processorResult로 정리하는가
- title 또는 summary를 반환하는가
- content, mdContent, structuredData, keywords, warnings를 필요에 따라 정리하는가
- Optional Export 결과와 processorResult를 구분하는가
```

예시:

```json
{
  "title": "결과 제목",
  "summary": "결과 요약",
  "content": "본문",
  "mdContent": "# Markdown",
  "structuredData": {},
  "keywords": [],
  "warnings": []
}
```

---

## 10. Optional Export 체크

확인할 것:

```text
- Google Drive 저장이 기본 보관이 아니라 Optional Export로 분리되어 있는가
- Gmail 발송이 기본 결과 저장과 분리되어 있는가
- Sheets 기록이 Processor Result와 분리되어 있는가
- Export 실패를 warning으로 처리할 수 있는가
```

초기 호환을 위해 Google Drive 저장을 유지할 수 있다.  
단, Sticky Note와 노드명에서 Optional Export임을 표시한다.

---

## 11. Callback 체크

확인할 것:

```text
- callbackUrl을 하드코딩하지 않는가
- payload.callbackUrl을 사용하는가
- success callback에 processorResult를 포함하는가
- failed callback에 error.code와 error.message를 포함하는가
- config_error를 구분할 수 있는가
- Callback HTTP Request 노드가 Header Auth Credential을 사용하는가
```

---

## 12. Error / Exception 체크

확인할 것:

```text
- 필수 설정 누락
- 필수 입력 누락
- 파일 누락
- 외부 API 실패
- LLM 실패
- Drive/Export 실패
- Callback 실패
```

오류는 가능한 한 표준 error.code로 정리한다.

---

## 13. 제거해야 할 구형 구조

아래 구조는 제거하거나 비활성화한다.

```text
- 브라우저 직접 n8n 업로드
- uploadToken 검증
- verify-upload-token HTTP Request 노드
- uploadSessions 전제
- n8n CORS 운영 의존
- Code 노드 내부 X-N8N-TOKEN 직접 비교
- $env.N8N_SERVER_MAIN_TOKEN 직접 참조
- $env.N8N_CALLBACK_SECRET 직접 참조
- Firestore 직접 수정 노드
- 사용자별 Credential 동적 전환
```

---

## 14. settings 후보 추출

기존 워크플로우에서 하드코딩된 값은 settings 후보로 분류한다.

후보 예시:

```text
mdFolderId
originalFileFolderId
googleSheetId
reportEmailTo
modelName
language
timezone
exportEnabled
```

단, 아래 값은 settings 후보가 아니다.

```text
Google Access Token
Google Refresh Token
n8n Credential ID
Gemini API Key
Webhook URL
Secret
Token
API Key
```

---

## 15. 전환 결과 보고 항목

전환 후 보고에는 아래만 포함한다.

```text
1. 수정/추가/삭제한 노드
2. Sticky Note 영역 구분 여부
3. Processor 영역 보존 여부
4. settings/input/payload/credentials 분류 결과
5. 제거한 구형 구조
6. processorInput 구조
7. processorResult 구조
8. Optional Export 유지 여부
9. callback 구조
10. 남은 위험 요소
11. import 가능성 점검 결과
```

---

## 16. 최종 완료 기준

아래가 충족되면 1차 전환 완료로 본다.

```text
- Header Auth Webhook 사용
- Payload Normalize 존재
- processorInput 존재
- processorResult 존재
- callbackUrl 기반 callback 사용
- Firestore 직접 수정 없음
- settings 병합 없음
- Sticky Note 4단계 구분 존재
- Optional Export가 기본 보관과 구분됨
```