# N8Lient n8n 마이그레이션 프롬프트 보강 메모: Google Drive Optional Export v0.1

n8n 워크플로우가 Google Drive Optional Export를 지원하는 경우, 단일 폴더 ID 하나로 MD 결과와 첨부파일을 섞지 않는다.

## 표준 설정 키

```text
optionalExportProvider
googleDriveMdFolderName
googleDriveMdFolderId
googleDriveAttachmentFolderName
googleDriveAttachmentFolderId
```

## 조건부 필수

```text
optionalExportProvider = none
→ Google Drive 필드 불필요

optionalExportProvider = google_drive
→ MD 폴더명, MD 폴더 ID, 첨부파일 폴더명, 첨부파일 폴더 ID 모두 필요
```

## n8n Optional Export 표준 흐름

```text
1. optionalExportProvider == google_drive 확인
2. googleDriveMdFolderId 확인
3. googleDriveAttachmentFolderId 확인
4. 원본 음성/이미지/첨부파일을 attachment folder에 업로드
5. 업로드된 첨부파일 webViewLink 확보
6. 첨부파일 링크가 포함된 MD 생성 또는 MD 재생성
7. MD 파일을 md folder에 업로드
8. resultRefs에 optional_export_md / optional_export_attachment 기록
9. Gateway callback
```

## resultRefs 타입

```text
optional_export_md
optional_export_attachment
```

## 주의

```text
Google Drive는 기본 저장소가 아니라 Optional Export다.
Google Drive Credential 값은 settings에 넣지 않는다.
Folder ID만 settings로 받는다.
폴더명은 사용자 이해용 표시값이다.
Optional Export 실패는 기본 processorResult 성공을 무조건 실패시키지 않고 warnings로 처리하는 것을 우선한다.
```
