# [Google Drive Optional Export 고도화 개정 메모]

이 문서는 2026-06-13 기준으로 확정된 Google Drive Optional Export 패키지 정책을 추가 반영한 보존형 개정본이다.

기존 원문은 삭제하지 않는다.  
다만 Google Drive Export가 사용되는 경우에는 아래 정책을 우선 해석 기준으로 삼는다.

## 핵심 원칙

```text
엔팔라이언트 기본 저장소 = Firestore + Firebase Storage
Google Drive = 기본 저장소가 아니라 Optional Export
Optional Export = 사용자가 선택한 외부 복사/내보내기 패키지
```

Google Drive Optional Export는 결과/보관 레벨을 대체하지 않는다.  
`retentionPolicy.level`은 여전히 Gateway가 결정하고, n8n은 Gateway가 내려준 정책을 따른다.

## Google Drive Optional Export 폴더 분리

Google Drive Optional Export를 사용하는 워크플로우는 MD 결과 파일과 첨부파일 저장 위치를 분리한다.

```text
MD 파일 보관 폴더명
MD 파일 보관 폴더 ID
첨부파일 보관 폴더명
첨부파일 보관 폴더 ID
```

폴더명은 사용자가 이해하기 위한 표시값이다.  
실제 업로드 위치는 Google Drive Folder ID를 기준으로 한다.

## 표준 설정 키

```text
optionalExportProvider
googleDriveMdFolderName
googleDriveMdFolderId
googleDriveAttachmentFolderName
googleDriveAttachmentFolderId
```

조건부 필수 규칙은 다음과 같다.

```text
optionalExportProvider = none
→ Google Drive 관련 필드는 없어도 된다.

optionalExportProvider = google_drive
→ MD 폴더명, MD 폴더 ID, 첨부파일 폴더명, 첨부파일 폴더 ID를 모두 요구한다.
```

## 표준 동작

```text
1. n8n은 Gateway가 병합해 전달한 payload.settings를 사용한다.
2. MD 파일은 googleDriveMdFolderId에 업로드한다.
3. 원본 음성, 이미지, 첨부파일은 googleDriveAttachmentFolderId에 업로드한다.
4. MD 본문에는 업로드된 첨부파일의 Google Drive 링크를 포함한다.
5. resultRefs에는 MD export 결과와 첨부 export 결과를 구분해 기록한다.
```

권장 resultRefs 타입:

```text
optional_export_md
optional_export_attachment
```

## Level 2 / Level 3와의 관계

```text
processed_result + google_drive
→ 엔팔라이언트 DB에는 processorResult 저장
→ Firebase Storage 원본 보관은 기본적으로 없음
→ Google Drive Optional Export가 켜져 있으면 원본 첨부파일을 Google Drive 첨부 폴더에 외부 복사 가능

full_archive + google_drive
→ 엔팔라이언트 DB에는 processorResult 저장
→ Firebase Storage에는 원본 보관
→ Google Drive에도 MD 파일과 첨부파일을 외부 복사 가능
```

따라서 Google Drive Optional Export는 엔팔라이언트 기본 보관 정책과 별개의 외부 복사 동작이다.  
UI에서는 사용자가 혼동하지 않도록 아래 의미를 명확히 표시한다.

```text
Google Drive 내보내기를 사용하면 MD 결과 파일과 원본 첨부파일이 지정한 Google Drive 폴더에 복사됩니다.
```

## 보안 및 Credential 원칙

```text
Google Drive 폴더 ID는 settings로 받는다.
Google 계정, OAuth Token, Refresh Token, Credential ID는 settings로 받지 않는다.
Google Drive 접근 권한은 n8n Credential이 담당한다.
지정한 폴더 ID는 해당 n8n Google Drive Credential 계정이 접근 가능한 폴더여야 한다.
```

---


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
