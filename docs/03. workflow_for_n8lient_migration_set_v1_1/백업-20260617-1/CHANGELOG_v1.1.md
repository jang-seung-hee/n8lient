# Workflow for N8Lient 마이그레이션 세트 v1.1 변경 요약

## 변경 목적

Level 1 `notify_only`에서 기존 이메일 MD 임시 첨부 정책은 유지하면서, Webhook multipart로 넘어온 입력 원본 파일(file/image/audio 등)을 이메일에 임시 첨부할 수 있는 선택 규칙을 추가했다.

## 핵심 정책

```text
notify_only에서도 입력 원본 파일을 이메일에 임시 첨부할 수 있다.
단, N8Lient DB/Storage/originalFileRefs/resultRefs에는 저장하지 않는다.
```

## 반영 파일

- 00 README: v1.1 변경 요지 추가
- 01 START: 작업모드 공통 정책 안내 추가
- 02A MODE1: 커스터마이징+디자인 동시 프롬프트에 원본 입력파일 이메일 임시 첨부 노드 지침 추가
- 02B MODE2: 커스터마이징 only 프롬프트에 동일 지침 추가
- 02C MODE3: 디자인 only 모드에서 이미 이메일 영역에 전달되는 원본 binary 첨부 처리 가능 범위 명시
- 03 MODE4: Import JSON 판단 기준에서 이메일 원본 임시 첨부는 supportsEmailNotification으로만 보고, supportsOriginalFileRefs/resultRefs로 보지 않도록 명시

## 유지한 것

- N8Lient 앱 스키마 변경 없음
- Firestore Rules 변경 없음
- Import JSON 스키마 필드 추가 없음
- notify_only의 내부 보관 없음 원칙 유지
- full_archive와 originalFileRefs/resultRefs의 경계 유지
