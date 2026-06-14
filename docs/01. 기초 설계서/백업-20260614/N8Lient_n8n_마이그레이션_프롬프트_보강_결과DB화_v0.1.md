# N8Lient n8n 마이그레이션 프롬프트 보강 메모: 결과 DB화/지식검색 최소 계약 v0.1

n8n 워크플로우를 엔팔라이언트로 마이그레이션할 때, Level 2 이상 결과는 최소 공통 processorResult 구조를 맞춘다.

## 적용 원칙

```text
Level 1 notify_only = 이메일/알림 중심. 자유 포맷 허용.
Level 2 processed_result 이상 = 최소 공통 DB 포맷 적용.
Level 3 full_archive = 최소 공통 DB 포맷 + 원본/결과 파일 참조 보관.
```

## processorResult 최소 구조

```json
{
  "title": "결과 제목",
  "summary": "짧은 요약",
  "content": "본문 텍스트",
  "mdContent": "마크다운 본문",
  "hashtags": ["태그1", "태그2"],
  "attachments": [],
  "structuredData": {},
  "warnings": []
}
```

## 하지 말 것

```text
n8n 실행 중 벡터라이징하지 말 것
knowledgeSearchIndex를 직접 만들지 말 것
백링크/지식 그래프를 생성하지 말 것
과도한 자동 분류를 원본 결과처럼 저장하지 말 것
Obsidian/Google Drive를 기본 지식 저장소로 간주하지 말 것
```

n8n은 원본성 실행 결과를 callback으로 반환한다.  
검색 인덱스, 벡터 인덱스, 백링크는 나중에 별도 인덱싱/마이그레이션 워크플로우가 처리한다.
