# N8Lient 워크플로우 마스터 등록 HTML 명세 추출 프롬프트 v1.4 단독형

마이그레이션이 완료된 **최종 n8n 워크플로우 JSON**을 기준으로, 이 워크플로우를 N8Lient 앱의 **N8N 워크플로우 마스터 등록 화면**에 입력하기 위한 등록 명세를 추출하라.

이 프롬프트는 **단독 사용**을 전제로 한다.  
즉, 기본적으로는 아래 2개만 첨부되어 있어도 작업을 진행해야 한다.

```text
1. 이 프롬프트 파일
2. 최종 n8n 워크플로우 JSON 파일
```

N8Lient 기초설계서, 마이그레이션 지시서, 테스트 결과가 함께 첨부되어 있으면 참고하되, 첨부되어 있지 않더라도 추가 자료를 요구하지 말고 최종 n8n JSON에서 확인 가능한 값만 사용한다.

확실하지 않은 값은 추측하지 말고 `확인 필요`로 표시한다.

Google Drive Optional Export가 n8n JSON에서 확인되거나 설정 후보로 필요하다고 판단되면, MD 파일 보관 폴더와 첨부파일 보관 폴더를 분리하는 최신 기준을 따른다.

결과물은 JSON 보고서가 아니라 **등록 화면 기준의 단일 HTML 문서**로 작성하라.  
오퍼레이터가 HTML을 보면서 필요한 값만 복사해 N8Lient 화면에 붙여넣을 수 있어야 한다.

---

## 0. 핵심 원칙

1. 등록 화면에 없는 불필요한 정보를 늘어놓지 않는다.
2. 긴 가이드 문구를 많이 넣지 않는다.
3. JSON 코드블록을 주 출력으로 사용하지 않는다.
4. 실제 N8Lient 등록 화면의 입력 항목 순서에 맞춰 출력한다.
5. 각 입력값 옆에는 반드시 `복사` 버튼 또는 복사 배지를 붙인다.
6. 체크박스 항목은 **필드명 + 체크 여부**만 간결하게 표시한다.
7. 확실하지 않은 값은 `확인 필요`로 표시한다.
8. n8n 워크플로우 JSON은 수정하지 않는다.
9. Credential, Token, Secret, API Key 값은 출력하지 않는다.
10. HTML은 외부 라이브러리 없이 단일 파일로 동작해야 한다.
11. 기초설계서, 마이그레이션 지시서, 테스트 결과가 없다는 이유로 작업을 중단하지 않는다.
12. 최종 n8n JSON만으로 판단이 어려운 값은 `확인 필요`로 표시한다.

---

## 0-1. 입력 자료 우선순위

입력 자료는 아래 우선순위로 해석한다.

```text
1순위: 최종 n8n 워크플로우 JSON
2순위: 마이그레이션 완료 보고서 또는 테스트 결과
3순위: N8Lient 기초설계서 / 마이그레이션 지시서
```

단, 2순위와 3순위 자료가 없더라도 작업을 중단하지 않는다.

최종 n8n JSON에서 확인 가능한 값은 그대로 추출하고, 확인 불가능한 값은 `확인 필요`로 표시한다.

추가 자료 요청은 하지 않는다.


## 1. 출력 형식

반드시 완전한 HTML 문서로 출력하라.

```html
<!doctype html>
<html lang="ko">
<head>
  ...
</head>
<body>
  ...
</body>
</html>
```

HTML 요구사항:

```text
CSS는 내부 <style>에 작성
JavaScript는 내부 <script>에 작성
아코디언 UI 사용
각 입력값에 복사 버튼 부착
모바일/PC 반응형
불필요한 설명 최소화
```

---

## 2. HTML 전체 구성

HTML은 아래 6개 섹션만 만든다.

```text
1. 워크플로우 기본 설정
2. 워크플로우 보관 지원 범위
3. 오퍼레이터 허용 보관 정책
4. Webhook Secret 및 설명글
5. inputSchema
6. configSchema
```

추가 섹션은 만들지 않는다.  
단, 마지막에 `확인 필요 항목`이 있으면 매우 짧게 넣을 수 있다.

---

## 3. UI 스타일 기준

등록 화면과 비슷하게 간결한 폼 카드 형태로 만든다.

권장 구조:

```html
<section class="form_section">
  <button class="accordion_header">1. 워크플로우 기본 설정</button>
  <div class="accordion_body">
    <div class="field_grid">
      <div class="field_card">
        <div class="field_label">워크플로우 Key</div>
        <div class="field_value" id="workflowKey">n8lient-idea-catcher</div>
        <button data-copy-target="workflowKey">복사</button>
      </div>
    </div>
  </div>
</section>
```

디자인 기준:

```text
배경: 연한 회색
카드: 흰색
라벨: 작고 진한 텍스트
값: input처럼 보이는 박스
복사 버튼: 작은 배지형 버튼
체크박스 항목: 체크 표시 + 라벨만
설명은 한 줄만
```

---

## 4. 복사 버튼 구현

모든 값은 아래 방식으로 복사 가능하게 한다.

```html
<button type="button" data-copy-target="fieldId">복사</button>
```

스크립트:

```html
<script>
document.querySelectorAll("[data-copy-target]").forEach((button) => {
  button.addEventListener("click", async () => {
    const target = document.getElementById(button.dataset.copyTarget);
    const text = target ? target.innerText.trim() : "";
    await navigator.clipboard.writeText(text);
    const old = button.innerText;
    button.innerText = "복사됨";
    setTimeout(() => button.innerText = old, 1000);
  });
});
</script>
```

---

## 5. 섹션 1. 워크플로우 기본 설정

아래 화면 입력값만 출력한다.

```text
워크플로우 Key
워크플로우 이름
줄임말
버전
배포 상태
```

각 항목은 다음 형태로 표시한다.

```text
필드명
입력값 예시
복사 버튼
짧은 입력 힌트
```

필드 기준:

### 워크플로우 Key

```text
영문 소문자, 숫자, 하이픈만 사용
예: n8lient-idea-catcher
```

### 워크플로우 이름

```text
사용자가 이해하기 쉬운 한글명
예: 아이디어 캐처
```

### 줄임말

```text
2~4자 이내
예: 아이디어
```

### 버전

```text
기본값: 1.0.0
```

### 배포 상태

```text
draft 또는 published
테스트 전이면 draft
테스트 완료 후 운영 가능하면 published
```

---

## 6. 섹션 2. 워크플로우 보관 지원 범위

아래 화면 입력값만 출력한다.

```text
워크플로우 최대 보관 지원 단계
기본 지원 레벨
기술적 지원 레벨 다중 선택
processorResult 생성 지원
originalFileRefs 지원
resultRefs 지원
Result Policy Router 지원
```

출력 방식:

### select 값

```text
워크플로우 최대 보관 지원 단계
값: full_archive
[복사]
```

### 체크박스 값

체크박스는 아래처럼만 보여준다.

```text
☑ 알림/로그형
☑ 가공지식 저장형
☑ 원본 포함 지식보관형
☑ processorResult 생성 지원
☑ originalFileRefs 지원
☑ resultRefs 지원
☑ Result Policy Router 지원
```

체크박스 항목에는 긴 설명을 붙이지 않는다.

레벨 표기:

```text
notify_only = 알림/로그형
processed_result = 가공지식 저장형
full_archive = 원본 포함 지식보관형
```

---

## 7. 섹션 3. 오퍼레이터 허용 보관 정책

아래 화면 입력값만 출력한다.

```text
고객사에 허용할 레벨
오퍼레이터 기본 지정 레벨
회사관리자 정책 수정 허용
일반 사용자의 개인 보관 선호 수정 허용
```

출력 방식:

```text
고객사에 허용할 레벨
☑ 알림/로그형
☑ 가공지식 저장형
☑ 원본 포함 지식보관형

오퍼레이터 기본 지정 레벨
full_archive [복사]

☑ 회사관리자 정책 수정 허용
☑ 일반 사용자의 개인 보관 선호 수정 허용
```

주의:

```text
오퍼레이터 허용 보관 정책은 워크플로우 마스터의 기술 최대치를 넘을 수 없다.
```

이 주의 문구는 한 줄만 넣는다.

---

## 8. 섹션 4. Webhook Secret 및 설명글

아래 화면 입력값만 출력한다.

```text
Webhook Secret 참조
n8n 서버 식별 Key
설명
```

출력 방식:

```text
Webhook Secret 참조
n8lient-idea-catcher [복사]

n8n 서버 식별 Key
main [복사]

설명
사용자가 업로드한 음성 아이디어를 정리해 제목, 본문, 마크다운 결과를 생성합니다. [복사]
```

설명은 너무 길게 쓰지 않는다.  
1~2문장 이내로 작성한다.

---

## 9. 섹션 5. inputSchema

등록 화면 기준으로 아래 항목만 출력한다.

```text
허용 입력 형태
허용 파일 확장자
최대 파일 크기(MB)
```

### 허용 입력 형태

체크박스 형태로 출력한다.

```text
☑ text
☐ file
☑ audio
☐ image
```

n8n JSON과 마이그레이션 결과를 보고 실제 필요한 것만 체크한다.

### 허용 파일 확장자

입력칸에 넣을 문자열 형태로 출력한다.

```text
mp3, webm, m4a, wav [복사]
```

### 최대 파일 크기

```text
10 [복사]
```

확실하지 않으면 `확인 필요`로 표시한다.

---

## 10. 섹션 6. configSchema

configSchema는 실제 화면의 설정 필드 반복 구조에 맞춘다.

각 설정 필드는 아래 7개 값만 출력한다.

```text
설정 Key
라벨 이름
인풋 타입
기본값 출처
필수 입력 항목 여부
입력 힌트
가이드 설명
```

각 설정은 카드 하나로 표시한다.

예시 출력:

```text
설정 필드 1

설정 Key
reportEmailTo [복사]

라벨 이름
결과 보고 이메일 [복사]

인풋 타입
email [복사]

기본값 출처
auth.email [복사]

필수 입력 항목
☐ 필수 입력 항목

입력 힌트
example@company.com [복사]

가이드 설명
처리 결과를 이메일로 받을 주소입니다. [복사]
```

인풋 타입은 실제 화면 선택지 중 하나로만 작성한다.

```text
text
email
number
boolean
select
textarea
secret
```

### configSchema 추출 기준

다음 값만 configSchema 후보로 뽑는다.

```text
payload.settings.xxx
settings.xxx
회사 또는 사용자별로 달라지는 값
실행에 필요한 폴더 ID
보고 이메일
언어
타임존
파일명 prefix
Optional Export 대상
Google Drive Optional Export가 있는 경우 아래 5개 표준 키
```


### Google Drive Optional Export 표준 configSchema

워크플로우가 Google Drive Optional Export를 지원하면 아래 설정 필드를 우선 추출한다.

```text
optionalExportProvider
googleDriveMdFolderName
googleDriveMdFolderId
googleDriveAttachmentFolderName
googleDriveAttachmentFolderId
```

각 필드는 실제 등록 화면 기준으로 아래처럼 출력한다.

```text
설정 Key
optionalExportProvider [복사]

라벨 이름
외부 내보내기 방식 [복사]

인풋 타입
select [복사]

기본값 출처
none [복사]

필수 입력 항목
☐ 필수 입력 항목

입력 힌트
none, google_drive [복사]

가이드 설명
Google Drive 내보내기 사용 여부를 선택합니다. [복사]
```

```text
설정 Key
googleDriveMdFolderName [복사]

라벨 이름
MD 파일 보관 폴더명 [복사]

인풋 타입
text [복사]

기본값 출처
직접 입력 [복사]

필수 입력 항목
☐ 필수 입력 항목

입력 힌트
N8Lient Notes [복사]

가이드 설명
MD 결과 파일을 저장할 Google Drive 폴더의 표시명입니다. google_drive 선택 시 필요합니다. [복사]
```

```text
설정 Key
googleDriveMdFolderId [복사]

라벨 이름
MD 파일 보관 폴더 ID [복사]

인풋 타입
text [복사]

기본값 출처
직접 입력 [복사]

필수 입력 항목
☐ 필수 입력 항목

입력 힌트
Google Drive 폴더 ID [복사]

가이드 설명
MD 결과 파일을 저장할 Google Drive 폴더 ID입니다. google_drive 선택 시 필요합니다. [복사]
```

```text
설정 Key
googleDriveAttachmentFolderName [복사]

라벨 이름
첨부파일 보관 폴더명 [복사]

인풋 타입
text [복사]

기본값 출처
직접 입력 [복사]

필수 입력 항목
☐ 필수 입력 항목

입력 힌트
Attachments [복사]

가이드 설명
원본 음성, 이미지, 첨부파일을 저장할 Google Drive 폴더의 표시명입니다. google_drive 선택 시 필요합니다. [복사]
```

```text
설정 Key
googleDriveAttachmentFolderId [복사]

라벨 이름
첨부파일 보관 폴더 ID [복사]

인풋 타입
text [복사]

기본값 출처
직접 입력 [복사]

필수 입력 항목
☐ 필수 입력 항목

입력 힌트
Google Drive 폴더 ID [복사]

가이드 설명
원본 음성, 이미지, 첨부파일을 저장할 Google Drive 폴더 ID입니다. google_drive 선택 시 필요합니다. [복사]
```

주의:

```text
앱 화면이 조건부 필수 체크박스를 지원하지 않으면 체크박스는 선택으로 두고, 가이드 설명에 “google_drive 선택 시 필요”라고 적는다.
Google Access Token, Refresh Token, Credential ID는 출력하지 않는다.
```


다음 값은 configSchema에 넣지 않는다.

```text
n8n token
callback secret
Credential ID
Google Access Token
Google Refresh Token
Gemini API Key
Firebase Admin Key
Service Account private key
```

---

## 11. 불필요한 출력 금지

아래는 출력하지 않는다.

```text
긴 아키텍처 설명
전체 JSON 덩어리
개발자용 원본 구조
callback body 전체
credential 상세 등록 가이드
검색 인덱스 설계
마이그레이션 원칙 반복 설명
테스트 로그 전문
```

단, 꼭 필요한 값이 확실하지 않은 경우 마지막에 짧게만 표시한다.

```text
확인 필요:
- maxFileSizeMB 확인 필요
- Optional Export 유지 여부 확인 필요
```

---

## 12. 최종 HTML 자체 점검

HTML 출력 전에 아래를 점검하라.

```text
1. 화면에 없는 불필요한 정보가 많은가? 많으면 제거한다.
2. JSON을 봐야만 값을 알 수 있는가? 그렇다면 필드 카드로 분해한다.
3. 모든 입력값에 복사 버튼이 있는가?
4. 체크박스는 체크 표시와 라벨만 있는가?
5. configSchema가 실제 화면의 7개 항목으로 정리되었는가?
6. 설명 문구가 한 줄 또는 두 줄 이내인가?
7. Credential/Token/Secret 값이 노출되지 않았는가?
8. n8n JSON을 수정하지 않았는가?
```

---

## 13. 최종 출력

가능하면 `.html` 파일로 제공하라.

파일명 규칙:

```text
N8Lient_워크플로우_마스터_등록명세_{workflowKey}_v1.4.html
```
