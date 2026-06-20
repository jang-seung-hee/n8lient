# JANG'S AI Automation Email Report Design.md v3.3

## 1. 목적
이 문서는 AI가 n8n 워크플로우의 이메일 본문을 생성하거나 수정할 때 따라야 하는 공통 디자인 규칙이다.

중요한 전제:
- 실제 워크플로우의 데이터 처리 로직은 변경하지 않는다.
- 헤더, 상태바, 푸터는 HTML 프레임 템플릿이 담당한다.
- 본문은 이 문서의 규칙에 따라 AI가 생성한다.
- 사용자가 예시로 언급한 실제 제목명은 고정 규칙이 아니다. 이 문서에서는 보편적인 명칭인 `본문 제목`, `설명문`, `섹션 표제`, `항목 제목`, `본문 역할 라벨`, `메타 정보`, `태그`, `텍스트 링크` 등을 사용한다.

---

## 2. 전체 방향
이메일 본문은 카드형 뉴스레터가 아니라 문서형 리포트로 구성한다.

다만 문서형이라고 해서 디자인을 포기하지 않는다. 다음 요소로 시각적 완성도를 만든다.

- 공통 프레임 헤더
- 상태바
- 스타일이 있는 섹션 표제
- 명확한 항목 제목
- 본문 역할 라벨
- 메타 정보
- 작은 태그 배지
- 텍스트 링크
- 얇은 구분선
- 충분한 줄간격

---

## 3. 금지 규칙
본문에서 다음 요소는 사용하지 않는다.

1. 큰 카드 박스
2. 기사별 둥근 테두리 박스
3. 그림자 박스
4. 링크 URL을 감싸는 큰 박스
5. URL 전체 문자열 노출
6. 섹션명 앞의 장식용 아이콘 또는 이모지
   - 예: 시계, 지구, 톱니바퀴, 나침반, 불꽃 등
7. 2단/3단 멀티컬럼 레이아웃
8. 모바일에서 폭을 좁히는 중첩 테이블
9. 큰 외곽 여백이 있는 본문 테이블
10. 공통 프레임 헤더와 같은 제목을 본문 최상단에서 반복 표시하는 것
11. 기타 모든 2열 또는 2행 이상의 테이블은 사용 금지이다.

---

## 4. 배경과 폭
- 이메일 전체 배경은 흰색을 기본으로 한다.
- PC에서는 왼쪽 정렬, 최대 폭 900px을 기준으로 한다.
- 모바일에서는 가능한 한 전체 폭을 사용한다.
- 모바일 본문 좌우 여백은 최소화한다.
- 외곽 회색 배경은 사용하지 않는다.

---

## 5. 본문 제목 사용 규칙
본문 제목은 리포트의 최상위 표제이다. 단, 공통 프레임 헤더에 이미 동일한 제목이 표시되는 경우 본문 제목을 다시 출력하지 않는다.

권장 판단:
- 프레임 헤더 제목과 본문 제목이 같으면 본문 제목은 생략한다.
- 본문은 바로 `요약`, `흐름`, `상세 내용` 같은 첫 섹션으로 시작한다.
- 프레임 헤더가 없는 독립 HTML에서만 본문 제목을 사용한다.

프레임 헤더가 없는 경우의 권장 스타일:
```html
<h1 style="font-size:26px;line-height:1.34;margin:0 0 10px;color:#111827;font-weight:800;letter-spacing:-0.03em;text-align:left;">
  본문 제목
</h1>
```

---

## 6. 설명문 / 슬로건 사용 규칙
설명문 또는 슬로건도 공통 프레임 헤더의 부제와 중복되면 본문에서 생략한다.

프레임 헤더가 없는 경우의 권장 스타일:
```html
<p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.65;font-style:italic;text-align:left;">
  리포트의 성격을 설명하는 짧은 문장입니다.
</p>
```

---

## 7. 섹션 표제
섹션 표제는 `요약`, `주요 항목`, `상세 내용`, `대화 흐름`, `오류 정보` 같은 큰 구역의 제목이다.

PC에서 너무 밋밋해 보이지 않도록 섹션 표제에는 얇은 상단 라인과 포인트 색상을 사용할 수 있다. 단, 큰 박스는 사용하지 않는다.

권장 스타일:
```html
<div style="border-top:2px solid #0f766e;padding-top:12px;margin:30px 0 14px;text-align:left;">
  <p style="margin:0 0 6px;font-size:12px;line-height:1.4;color:#0f766e;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">
    SECTION
  </p>
  <h2 style="font-size:21px;line-height:1.4;margin:0;color:#111827;font-weight:800;letter-spacing:-0.02em;text-align:left;">
    섹션 표제
  </h2>
</div>
```

규칙:
- 섹션 표제 앞에 장식용 아이콘을 붙이지 않는다.
- 상단 라인, 작은 영문/한글 라벨, 굵은 제목으로 위계를 만든다.
- 배경색이 있는 큰 박스형 섹션 헤더는 피한다.
- 섹션 표제 바로 위에 별도의 회색 구분선을 중복 배치하지 않는다.

---

## 8. 항목 제목
항목 제목은 각 기사, 통화 흐름 항목, 오류 항목, 세부 요약 항목의 제목이다.

권장 스타일:
```html
<h3 style="font-size:18px;line-height:1.45;margin:0 0 8px;color:#111827;font-weight:800;letter-spacing:-0.01em;text-align:left;">
  항목 제목
</h3>
```

규칙:
- 항목 제목은 섹션 표제보다 작게 둔다.
- 번호는 필요할 때만 사용한다.
- 제목 앞 장식용 아이콘은 사용하지 않는다.

---

## 9. 본문 역할 라벨
`핵심 포인트`, `요약`, `원문`, `비즈니스 관점`, `한계점`, `실행 결과`처럼 문단의 역할을 알려주는 표지는 태그보다 한 단계 높은 본문 역할 라벨로 처리한다.

권장 스타일:
```html
<p style="margin:0 0 8px;text-align:left;">
  <span style="display:inline-block;padding:5px 10px;font-size:12px;line-height:1.35;color:#ffffff;background:#0f766e;border:1px solid #0f766e;border-radius:4px;font-weight:800;letter-spacing:-0.01em;">
    본문 역할 라벨
  </span>
</p>
```

규칙:
- 태그와 같은 연한 pill 스타일을 사용하지 않는다.
- 진한 녹청색 계열을 사용한다.
- 모서리 곡선은 최소화한다.
- 큰 박스나 큰 배경 영역을 만들지 않는다.
- 라벨 앞에 장식용 아이콘을 붙이지 않는다.

---

## 10. 메타 정보
출처, 중요도, 게시일, 통화일시, 실행 시간, 워크플로우명 같은 보조 데이터는 메타 정보로 처리한다.

권장 스타일:
```html
<p style="margin:0 0 12px;font-size:13px;color:#6b7280;line-height:1.6;text-align:left;">
  출처: Example · 중요도: 80점 · 게시일: 2026-05-29
</p>
```

규칙:
- 본문보다 작고 옅게 표현한다.
- 중요한 데이터는 숨기지 않는다.
- 데이터가 많은 경우 상태바 또는 메타 정보로 분산한다.

---

## 11. 태그
태그는 작은 인라인 배지로만 사용한다.

권장 스타일:
```html
<span style="display:inline-block;margin:0 6px 6px 0;padding:4px 10px;font-size:12px;line-height:1.4;color:#0f766e;background:#f0fdfa;border:1px solid #99f6e4;border-radius:999px;">
  태그명
</span>
```

규칙:
- 태그는 작게 유지한다.
- 태그를 큰 박스 영역으로 만들지 않는다.
- 태그가 많으면 여러 줄로 자연스럽게 흐르게 둔다.
- `핵심 포인트`, `요약`, `원문` 같은 본문 역할 라벨과 같은 스타일을 쓰지 않는다.

---

## 12. 링크
링크는 URL 문자열을 그대로 노출하지 않는다. 링크 색상은 푸른색 계열을 기본으로 한다.

권장 스타일:
```html
<p style="margin:0;text-align:left;">
  <span style="display:inline-block;padding:5px 10px;font-size:12px;line-height:1.35;color:#ffffff;background:#0f766e;border:1px solid #0f766e;border-radius:4px;font-weight:800;letter-spacing:-0.01em;">
    원문
  </span><br>
  <a href="{{URL}}" target="_blank" style="display:inline-block;margin-top:7px;color:#2563eb;text-decoration:underline;font-weight:700;">
    원문 링크 보기
  </a>
</p>
```

규칙:
- 링크 텍스트는 의미 있게 작성한다.
  - 예: `원문 링크 보기`, `Google Drive 원본 열기`, `상세 보고서 열기`, `캘린더 일정 열기`
- URL 전체 문자열은 본문에 노출하지 않는다.
- 링크 박스를 만들지 않는다.
- 본문 링크 색상은 `#2563eb`을 기본으로 한다.

---

## 13. 구분선
섹션과 항목 사이에는 얇은 구분선을 사용할 수 있다. 다만 섹션 표제 상단 라인과 구분선이 겹치지 않게 한다.

권장 스타일:
```html
<hr style="border:none;border-top:1px solid #e5e7eb;margin:26px 0;">
```

규칙:
- 큰 박스보다 구분선과 여백을 우선한다.
- 같은 섹션 안의 항목 사이에는 얇은 회색 구분선을 사용할 수 있다.
- 섹션의 마지막 항목 뒤에는 회색 구분선을 넣지 않는다.
- 다음 섹션 표제의 녹청색 상단 라인이 있으면 그 라인 하나만 섹션 구분선으로 사용한다.

---

## 14. 표 사용 규칙
본문에서는 표를 지양한다. 다만 숫자 비교표, 정산표, 오류 로그처럼 표 자체가 의미를 갖는 경우는 허용한다.

표 사용 시 필수 규칙:
```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin:12px 0;border-radius:0;">
  <tr>
    <th style="padding:7px 6px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:13px;color:#334155;">항목</th>
    <th style="padding:7px 6px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:13px;color:#334155;">값</th>
  </tr>
  <tr>
    <td style="padding:7px 6px;border-bottom:1px solid #f1f5f9;text-align:left;font-size:13px;color:#334155;">예시</td>
    <td style="padding:7px 6px;border-bottom:1px solid #f1f5f9;text-align:left;font-size:13px;color:#334155;">내용</td>
  </tr>
</table>
```

규칙:
- 외곽 공백 최소화
- 모서리 곡선 금지
- 큰 셀 padding 금지
- `border-collapse:collapse` 사용
- 모바일에서 폭을 좁히는 중첩 테이블 금지

---

## 15. 콘텐츠 유형별 패턴
### 15.1 뉴스/이슈 리포트
권장 순서:
1. 공통 프레임 헤더
2. 상태바
3. 흐름 요약 섹션
4. 카테고리별 섹션
5. 각 항목: 항목 제목 → 메타 정보 → 본문 역할 라벨/본문 → 요약 목록 → 태그 → 텍스트 링크
6. 아카이브/원본 링크

주의:
- 공통 프레임 헤더와 같은 본문 제목을 다시 출력하지 않는다.
- 섹션 마지막 항목 뒤에는 회색 구분선을 넣지 않는다.

### 15.2 통화 요약
권장 순서:
1. 공통 프레임 헤더
2. 상태바
3. 통화 정보
4. 한 줄 요약
5. 대화 흐름
6. 한계점
7. 원본 파일 링크

### 15.3 회의록
권장 순서:
1. 공통 프레임 헤더
2. 상태바
3. 문서 정보
4. 요약
5. 안건별 내용
6. 결정사항
7. 후속 액션

### 15.4 오류 리포트
권장 순서:
1. 공통 프레임 헤더
2. 상태바
3. 발생 시각 / 워크플로우명
4. 오류 메시지
5. 영향 범위
6. 확인 링크 / 로그 링크

---

## 16. AI 적용 지침
AI는 다음을 반드시 지킨다.

1. 기존 워크플로우의 데이터 처리 로직은 수정하지 않는다.
2. 기존 본문의 의미와 데이터는 유지한다.
3. HTML 프레임은 `01_APPLY_THIS_Email_Frame_Template_v3_3.html`을 사용한다.
4. 본문은 이 Design.md 기준으로 재구성한다.
5. 예시의 실제 제목명을 고정하지 말고, 보편적인 역할명 기준으로 디자인을 적용한다.
6. 공통 프레임 헤더와 동일한 본문 제목은 반복하지 않는다.
7. 섹션명 앞 장식용 아이콘은 제거한다.
8. `핵심 포인트`, `요약`, `원문`은 태그가 아니라 본문 역할 라벨로 처리한다.
9. 긴 URL은 의미 있는 텍스트 링크로 감춘다.
10. 본문 링크 색상은 푸른색 계열로 처리한다.
11. 모바일 여백을 줄이기 위해 큰 카드, 큰 박스, 중첩 테이블을 만들지 않는다.
12. 섹션 표제 바로 위에 회색 구분선과 녹청색 상단 라인이 중복되지 않게 한다.
