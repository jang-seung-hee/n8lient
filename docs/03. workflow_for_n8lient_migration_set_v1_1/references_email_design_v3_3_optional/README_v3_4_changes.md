# Email Design Pattern-Locked Set v3.4

## 변경 요약
- `02_Email_Report_Design_v3_4_optional.md`
  - 본문 `CONTENT_HTML` 내부 테이블 사용을 전면 금지했다.
  - 최종 사용 가능한 HTML 구조 기준을 `04_Content_Pattern_Examples_v3_4_optional.html`로 고정했다.
  - 표 데이터는 순번 목록, 블릿 목록, 메타 정보, 키-값 텍스트로 대체하도록 명시했다.
  - 태그, 상태 배지, 순번/블릿 목록, 수평바 사용 규칙을 추가했다.

- `03_Email_Design_Work_Request_Prompt_v3_4_optional.md`
  - 샘플 패턴에 없는 디자인 요소 생성 금지 규칙을 추가했다.
  - 테이블/박스/카드/멀티컬럼 생성 금지를 명시했다.
  - 표 형태 데이터를 목록과 문단으로 변환하는 작업 방식을 추가했다.

- `04_Content_Pattern_Examples_v3_4_optional.html`
  - 기존 테이블 예시를 삭제했다.
  - 순번 목록, 블릿 목록, 키-값 텍스트, 여러 색상의 태그, NEW/IMPORTANT/WARNING/REQUIRED/OPTIONAL 배지, 굵은 수평바 스타일을 추가했다.
  - 모든 예시는 인라인 스타일 기반이며, 테이블/박스/카드 없이 사용할 수 있도록 구성했다.

- `01_Email_Frame_Template_v3_4_optional_dansoft_footer.html`
  - Dansoft 푸터는 유지했다.
  - 주석과 모바일 CSS 힌트를 v3.4 기준으로 정리했다.
  - 프레임 내부 이메일 호환용 table 구조는 유지했다.
