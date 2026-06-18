# 첨부파일 이메일 임시 전송 및 보관 레벨 상속 보강 변경 내역

## 변경 목적

결과 보관 Level 1 `notify_only`에서 기존 MD 첨부파일뿐 아니라 입력 원본 파일(file/image/audio 등)도 이메일 전송용 임시 첨부로 전달할 수 있음을 명확히 했다.

또한 Level 2와 Level 3이 각각 하위 레벨의 기능을 상속해 확장되는 구조임을 문서에 보강했다.

## 반영 원칙

```text
Level 1 = 이메일 본문 + MD 첨부파일 + 입력 원본 파일 임시 첨부 가능. 단, N8Lient DB/Storage 보관 없음.
Level 2 = Level 1 기능 전체 상속 + processorResult DB 저장.
Level 3 = Level 2 기능 전체 상속 + originalFileRefs/resultRefs 및 Storage 보관.
```

## 수정 범위

- 01 솔루션 헌법: Level 1/2/3 철학 문구 최소 보강
- 02 아키텍처 명세서: 결과 보관 아키텍처 문구 최소 보강
- 03 결과/보관 레벨 계약: 핵심 정책 보강
- 04 DB/Storage 계약: 이메일 임시 첨부와 보관의 경계 보강
- 05 Gateway ↔ n8n 실행 계약: retentionPolicy/emailAttachOriginal 해석 보강
- 06 n8n 프로세서 전환 체크리스트: 전환 기준 보강
- 07 결과 DB화/지식검색 계약: Level 2/3 상속 관계와 Level 1 임시 첨부 경계 보강
- 08 Google Drive Optional Export 계약: 변경 없음

## 유지한 경계

- 이메일 임시 첨부는 N8Lient 보관이 아니다.
- Level 1에서는 processorResult 본문, originalFileRefs, resultRefs, Storage 파일 경로를 저장하지 않는다.
- 원본 파일을 N8Lient에 보관하는 것은 Level 3의 영역이다.
- Google Drive Optional Export와 이메일 임시 첨부는 별개다.
