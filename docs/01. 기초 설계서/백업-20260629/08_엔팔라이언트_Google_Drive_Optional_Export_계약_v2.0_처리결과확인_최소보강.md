# 엔팔라이언트 Google Drive Optional Export 계약 v2.0

- 문서명: 엔팔라이언트 Google Drive Optional Export 계약
- 버전: v2.0 리뉴얼
- 작성일: 2026-06-16
- 문서 상태: 현행 Optional Export 기준 문서
- 보강 메모: 2026-06-22 처리 결과 확인 메시지 계약 최소 보강
- 상위 문서: 결과/보관 레벨 계약 v2.0, DB/Storage 계약 v2.0, Gateway ↔ n8n 실행 계약 v2.0

---

## 1. 기본 원칙

Google Drive는 엔팔라이언트의 기본 저장소가 아니다.

```text
기본 DB = Firestore
기본 파일 저장소 = Firebase Storage
Google Drive = Optional Export
```

Google Drive Optional Export는 사용자가 별도로 선택한 외부 복사/내보내기 기능이다.

이 기능은 결과/보관 레벨을 대체하지 않는다. `retentionPolicy.level`은 Gateway가 결정하고, n8n은 Gateway가 내려준 정책을 따른다.

---

## 2. 적용 위치

Google Drive Optional Export는 다음 영역에 속한다.

```text
결과/보관 영역
Optional Export 영역
n8n Result Policy Router 이후 영역
```

즉, processorResult 생성이 먼저이고, Google Drive Export는 그 이후 부가 처리다.

---

## 3. 표준 설정 키

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
옵션: none, google_drive
기본값: none
```

### 3.2 googleDriveMdFolderName

```text
타입: text
설명: MD 결과 파일을 저장할 Google Drive 폴더 표시명
```

### 3.3 googleDriveMdFolderId

```text
타입: text
설명: MD 결과 파일을 저장할 Google Drive 폴더 ID
```

### 3.4 googleDriveAttachmentFolderName

```text
타입: text
설명: 원본 음성, 이미지, 첨부파일을 저장할 Google Drive 폴더 표시명
```

### 3.5 googleDriveAttachmentFolderId

```text
타입: text
설명: 원본 음성, 이미지, 첨부파일을 저장할 Google Drive 폴더 ID
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

앱과 Gateway는 이 조건을 validation해야 한다.

n8n은 google_drive 선택 상태에서 필수 폴더 값이 없으면 Optional Export를 실패 처리하되, processorResult 생성 자체를 실패시키지 않는 것을 원칙으로 한다.

---

## 5. 폴더명과 폴더 ID

```text
폴더명 = 사용자가 이해하기 위한 표시값
폴더 ID = 실제 업로드 위치
```

업로드는 반드시 폴더 ID 기준으로 수행한다.

폴더명이 실제 Google Drive 폴더명과 달라도 업로드는 폴더 ID 기준으로 진행될 수 있다.

---

## 6. 표준 저장 구조

Google Drive Optional Export가 켜져 있으면 아래 구조로 저장한다.

```text
MD 파일 보관 폴더/
└─ 결과노트.md

첨부파일 보관 폴더/
├─ 원본음성.webm
├─ 이미지.png
└─ 첨부파일.pdf
```

MD 파일 보관 폴더와 첨부파일 보관 폴더는 분리하는 것을 권장한다.

---

## 7. Level 1/2/3와의 관계

### 7.1 notify_only + google_drive

원칙적으로 권장하지 않는다.

Level 1은 이메일 중심 경량형이므로, 기본적으로 Google Drive Export를 사용하지 않는다.

예외적으로 MD 외부 복사가 필요한 경우는 별도 확장 패키지로 취급하고, 사용자에게 “N8Lient에는 보관하지 않지만 Google Drive에는 복사된다”고 명확히 안내해야 한다.

### 7.2 processed_result + google_drive

```text
N8Lient DB에는 processorResult 저장
Firebase Storage 원본 보관은 기본 없음
Google Drive에는 MD 결과 파일 또는 첨부파일 외부 복사 가능
```

이때 Google Drive 첨부파일 복사는 N8Lient Storage 보관이 아니다.

### 7.3 full_archive + google_drive

```text
N8Lient DB에는 processorResult 저장
Firebase Storage에는 원본/결과 파일 보관
Google Drive에도 MD 파일과 첨부파일 외부 복사 가능
```

원본 신뢰성과 장기 보관의 기준은 Firebase Storage에 둔다.

---

## 8. MD 본문 첨부파일 링크

n8n은 첨부파일을 Google Drive에 업로드한 뒤, 업로드 결과 링크를 MD 본문에 삽입할 수 있다.

권장 섹션:

```md
## 첨부파일

- [원본음성.webm](https://drive.google.com/file/d/파일ID/view)
```

가능하면 Google Drive 업로드 결과의 `webViewLink`를 사용한다.

## 8-1. Optional Export 링크의 처리 결과 확인 노출

Google Drive Optional Export 결과 중 사용자가 직접 열어야 하는 링크는 n8n callback의 처리 결과 확인 메타에 포함할 수 있다.

사용 기준:

```text
대표 MD 파일 링크 1개만 안내하면 result.resultUrl 사용 가능
여러 링크 또는 명확한 버튼 문구가 필요하면 processorResult.structuredData.actionLinks 사용 권장
MD 본문 내부 참조 링크는 mdContent에 포함 가능
```

예:

```json
{
  "result": {
    "summary": "Google Drive로 결과 파일을 내보냈습니다.",
    "resultUrl": "https://drive.google.com/file/d/.../view"
  },
  "processorResult": {
    "structuredData": {
      "actionLinks": [
        {
          "label": "Google Drive에서 결과 MD 보기",
          "url": "https://drive.google.com/file/d/.../view",
          "type": "primary"
        }
      ]
    }
  }
}
```

주의:

```text
Google Drive 링크는 Optional Export 결과 링크이지 N8Lient 기본 저장소 링크가 아니다.
N8Lient에 보관하지 않는 Level 1 결과라도 Google Drive에 복사했다면 사용자에게 그 의미를 명확히 안내한다.
OAuth token, refresh token, credential ID는 링크나 메시지에 포함하지 않는다.
```


---

## 9. n8n Optional Export 표준 흐름

```text
1. Result Policy Router
2. optionalExportProvider == google_drive 확인
3. googleDriveMdFolderId 확인
4. googleDriveAttachmentFolderId 확인
5. 원본/첨부파일을 attachment folder에 업로드
6. 업로드 링크 확보
7. 첨부파일 링크가 포함된 MD 생성 또는 재생성
8. MD 파일을 md folder에 업로드
9. resultRefs에 export 결과 기록
10. Gateway callback
```

Optional Export 실패는 `warnings`에 포함할 수 있다.

---

## 10. resultRefs 표준

### 10.1 MD 파일

```json
{
  "type": "optional_export_md",
  "provider": "google_drive",
  "fileName": "idea_note.md",
  "folderName": "N8Lient Notes",
  "fileUrl": "https://drive.google.com/..."
}
```

### 10.2 첨부파일

```json
{
  "type": "optional_export_attachment",
  "provider": "google_drive",
  "fileName": "recording.webm",
  "folderName": "N8Lient Attachments",
  "fileUrl": "https://drive.google.com/..."
}
```

---

## 11. 보안 및 Credential 원칙

```text
Google Drive 폴더 ID는 settings로 받는다.
Google 계정은 settings로 받지 않는다.
OAuth Token은 settings로 받지 않는다.
Refresh Token은 settings로 받지 않는다.
Credential ID는 settings로 받지 않는다.
Google Drive 접근 권한은 n8n Credential이 담당한다.
```

지정한 폴더 ID는 해당 n8n Google Drive Credential 계정이 접근 가능한 폴더여야 한다.

---

## 12. UI 안내 문구 기준

Google Drive Export를 켤 때 UI에는 아래 의미를 명확히 표시한다.

```text
Google Drive 내보내기를 사용하면 MD 결과 파일과 원본 첨부파일이 지정한 Google Drive 폴더에 복사됩니다.
이 기능은 N8Lient 기본 보관 정책과 별개의 외부 복사 기능입니다.
```

Level 2에서 Google Drive 첨부파일 Export를 사용할 경우 추가 안내한다.

```text
원본 파일은 N8Lient Storage에는 보관되지 않지만, 선택한 Google Drive 폴더에는 복사될 수 있습니다.
```

---

## 13. 금지 사항

```text
Google Drive를 기본 저장소로 설명하는 것
Google Drive Folder Name만으로 업로드 위치를 판단하는 것
Google OAuth Token을 사용자 설정으로 받는 것
Google Credential ID를 사용자 설정으로 받는 것
Optional Export 실패로 processorResult 전체를 실패 처리하는 것
N8Lient Storage 보관과 Google Drive Export를 같은 의미로 설명하는 것
```
