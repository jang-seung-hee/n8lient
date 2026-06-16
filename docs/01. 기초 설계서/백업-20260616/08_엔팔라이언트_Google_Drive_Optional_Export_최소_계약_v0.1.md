# 엔팔라이언트 Google Drive Optional Export 최소 계약 v0.1

- 문서명: 엔팔라이언트 Google Drive Optional Export 최소 계약
- 버전: v0.1
- 상위 문서: 엔팔라이언트 솔루션 헌법, 아키텍처 명세서, 결과/보관 레벨 최소 계약, DB/Storage 최소 계약, Gateway ↔ n8n 실행 계약
- 작성일: 2026-06-13
- 목적: Google Drive Optional Export를 MD 결과 파일과 첨부파일 패키지 내보내기 구조로 표준화한다.

---

## 1. 기본 원칙

Google Drive는 엔팔라이언트의 기본 저장소가 아니다.

```text
기본 DB = Firestore
기본 파일 저장소 = Firebase Storage
Optional Export = Google Drive, Obsidian, Markdown 다운로드 등 외부 활용 경로
```

Google Drive Optional Export는 사용자가 별도로 선택한 외부 복사 기능이다.  
이 기능은 결과/보관 정책을 대체하지 않고, 결과/보관 정책 위에 붙는 선택 기능이다.

---

## 2. 정책 위치

Google Drive Optional Export는 다음 영역에 속한다.

```text
결과/보관 영역
Optional Export 영역
n8n Result Policy Router 이후 영역
```

기본 보관 정책은 여전히 다음 계층에서 결정된다.

```text
워크플로우 마스터 = 기술적 최대치
회사별 계약/매핑 = 계약 한도
회사관리자 설정 = 회사 권장값
개인사용자 설정 = 개인 선택
Gateway = 최종 계산 및 방어
n8n = Gateway가 내려준 retentionPolicy에 따른 분기 처리
```

---

## 3. 표준 설정 키

Google Drive Optional Export는 아래 설정 키를 사용한다.

```text
optionalExportProvider
googleDriveMdFolderName
googleDriveMdFolderId
googleDriveAttachmentFolderName
googleDriveAttachmentFolderId
```

### 3.1 optionalExportProvider

```text
타입: select
권장 옵션: none, google_drive
기본값: none
설명: 외부 내보내기 방식을 선택한다.
```

### 3.2 googleDriveMdFolderName

```text
타입: text
설명: MD 결과 파일을 저장할 Google Drive 폴더의 표시명이다.
예: N8Lient Notes
```

### 3.3 googleDriveMdFolderId

```text
타입: text
설명: MD 결과 파일을 저장할 Google Drive 폴더 ID다.
```

### 3.4 googleDriveAttachmentFolderName

```text
타입: text
설명: 원본 음성, 이미지, 첨부파일을 저장할 Google Drive 폴더의 표시명이다.
예: Attachments
```

### 3.5 googleDriveAttachmentFolderId

```text
타입: text
설명: 원본 음성, 이미지, 첨부파일을 저장할 Google Drive 폴더 ID다.
```

---

## 4. 조건부 필수 규칙

```text
optionalExportProvider = none
→ Google Drive 관련 필드는 없어도 된다.

optionalExportProvider = google_drive
→ googleDriveMdFolderName 필수
→ googleDriveMdFolderId 필수
→ googleDriveAttachmentFolderName 필수
→ googleDriveAttachmentFolderId 필수
```

앱 UI가 조건부 필수 표시를 지원하지 않는 경우, 최소한 가이드 설명에 위 규칙을 표시한다.  
n8n 워크플로우는 google_drive 선택 상태에서 필수 폴더 값이 없으면 Optional Export를 실패로 처리하되, processorResult 생성 자체는 실패시키지 않는 것을 원칙으로 한다.

---

## 5. 폴더명과 폴더 ID의 역할

```text
폴더명 = 사람이 이해하기 위한 표시값
폴더 ID = 실제 Google Drive 업로드 대상
```

업로드는 반드시 폴더 ID 기준으로 수행한다.  
폴더명이 실제 Google Drive 폴더명과 다르더라도 업로드는 폴더 ID 기준으로 성공할 수 있다.

다만 MD 본문이나 UI 안내에는 폴더명을 사용해 사용자가 직관적으로 이해할 수 있게 한다.

---

## 6. 표준 저장 구조

Google Drive Optional Export가 켜져 있으면 아래 구조로 저장한다.

```text
MD 파일 보관 폴더/
├─ 결과노트.md

첨부파일 보관 폴더/
├─ 원본음성.webm
├─ 이미지.png
└─ 첨부파일.pdf
```

MD 파일 보관 폴더와 첨부파일 보관 폴더는 서로 다른 폴더 ID일 수 있다.  
같은 폴더를 입력하는 것도 가능하지만 권장하지 않는다.

---

## 7. MD 본문 첨부파일 링크 기준

n8n은 첨부파일을 Google Drive에 업로드한 뒤, 업로드 결과에서 얻은 링크를 MD 본문에 삽입한다.

권장 섹션:

```md
## 첨부파일

- [원본음성.webm](https://drive.google.com/file/d/파일ID/view)
```

가능하면 Google Drive 업로드 결과의 `webViewLink`를 사용한다.

---

## 8. n8n Optional Export 표준 흐름

n8n 워크플로우는 Optional Export 구간에서 아래 순서를 따른다.

```text
[20] Result Policy Router
→ optionalExportProvider == google_drive 확인
→ googleDriveMdFolderId 확인
→ googleDriveAttachmentFolderId 확인
→ 원본 음성/이미지/첨부파일을 attachment folder에 업로드
→ 업로드된 첨부파일 webViewLink 확보
→ 첨부파일 링크가 포함된 MD 생성 또는 MD 재생성
→ MD 파일을 md folder에 업로드
→ resultRefs에 MD/첨부 export 결과 추가
→ Gateway callback
```

---

## 9. resultRefs 표준

Google Drive Optional Export가 성공하면 callback의 `resultRefs`에 다음 정보를 포함할 수 있다.

### 9.1 MD 파일

```json
{
  "type": "optional_export_md",
  "provider": "google_drive",
  "fileName": "idea_card.md",
  "folderName": "N8Lient Notes",
  "folderId": "google_drive_md_folder_id",
  "url": "https://drive.google.com/file/d/...",
  "exportedAt": "ISO_8601"
}
```

### 9.2 첨부파일

```json
{
  "type": "optional_export_attachment",
  "provider": "google_drive",
  "fileName": "audio.webm",
  "mimeType": "audio/webm",
  "sizeBytes": 123456,
  "folderName": "Attachments",
  "folderId": "google_drive_attachment_folder_id",
  "url": "https://drive.google.com/file/d/...",
  "exportedAt": "ISO_8601"
}
```

---

## 10. originalFileRefs와의 관계

`originalFileRefs`는 엔팔라이언트 기본 보관 계층의 원본 파일 참조다.

```text
full_archive
→ originalFileRefs가 Firebase Storage 원본을 가리킨다.

processed_result
→ originalFileRefs는 기본적으로 비어 있을 수 있다.
```

Google Drive Optional Export의 첨부파일은 `originalFileRefs`가 아니라 `resultRefs`의 `optional_export_attachment`로 기록한다.

즉, Google Drive 첨부파일 복사는 엔팔라이언트 기본 원본 보관이 아니라 외부 export 결과다.

---

## 11. Level 2 / Level 3 처리 기준

### 11.1 processed_result + google_drive

```text
processorResult는 Firestore에 저장한다.
Firebase Storage 원본 영구 보관은 하지 않는다.
단, Optional Export 설정이 있으면 원본 첨부파일을 Google Drive 첨부 폴더로 외부 복사할 수 있다.
```

이 경우 Google Drive 첨부파일은 외부 export 결과이며, 엔팔라이언트 기본 원본 보관으로 간주하지 않는다.

### 11.2 full_archive + google_drive

```text
processorResult는 Firestore에 저장한다.
원본 파일은 Firebase Storage에 보관한다.
MD와 첨부파일은 Google Drive에도 외부 복사할 수 있다.
```

이 경우 원본은 Firebase Storage와 Google Drive 양쪽에 존재할 수 있다.

---

## 12. 오류 처리 기준

Optional Export 실패는 기본 processorResult 성공을 깨지 않는 것을 원칙으로 한다.

```text
processorResult 생성 성공
Google Drive Export 실패
→ status는 success 유지 가능
→ warnings에 Optional Export 실패 사유 기록
→ resultRefs에는 성공한 export만 기록
```

단, 해당 워크플로우의 핵심 목적이 Google Drive 파일 생성 자체인 경우에는 별도 정책으로 failed 처리할 수 있다.

---

## 13. Credential 기준

Google Drive 접근 권한은 n8n Credential이 담당한다.

settings에 넣으면 안 되는 값:

```text
Google Access Token
Google Refresh Token
n8n Credential ID
Service Account private key
Google API Key
```

settings에 넣을 수 있는 값:

```text
googleDriveMdFolderName
googleDriveMdFolderId
googleDriveAttachmentFolderName
googleDriveAttachmentFolderId
optionalExportProvider
```

지정한 폴더 ID는 n8n Google Drive Credential 계정이 접근 가능한 폴더여야 한다.

---

## 14. UI 안내 기준

앱 설정 화면에는 다음 의미가 드러나야 한다.

```text
Google Drive 내보내기를 사용하면 MD 결과 파일과 원본 첨부파일이 지정한 Google Drive 폴더에 복사됩니다.
```

권장 라벨:

```text
외부 내보내기 방식
MD 파일 보관 폴더명
MD 파일 보관 폴더 ID
첨부파일 보관 폴더명
첨부파일 보관 폴더 ID
```

---

## 15. 하지 말 것

```text
Google Drive를 엔팔라이언트 기본 저장소로 간주하지 않는다.
Google Drive Folder ID 하나로 MD와 첨부파일의 의미를 섞지 않는다.
Google Credential 정보를 settings에 저장하지 않는다.
Firebase Storage storagePath를 Google Drive MD에 직접 노출하지 않는다.
Optional Export 실패를 무조건 전체 워크플로우 실패로 처리하지 않는다.
```
