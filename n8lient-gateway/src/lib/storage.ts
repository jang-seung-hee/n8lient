import fs from "fs";
import { getAdminStorage } from "./firebase";

export interface FileRef {
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  inputType: string;
}

/**
 * 업로드 대상 파일명을 안전하게 정제합니다 (파일명 sanitizing).
 * slash, backslash, .., 제어 문자, 특수문자, 과다 공백 등을 언더스코어(_) 등으로 치환합니다.
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) {
    return `uploaded_file_${Date.now()}`;
  }

  // 1. 디렉토리 구분자 및 상위 이동 문자 제거
  let clean = fileName.replace(/[/\\]/g, "_");
  clean = clean.replace(/\.\.+/g, ".");

  // 2. 제어 문자 제거 (\x00-\x1F, \x7F)
  clean = clean.replace(/[\x00-\x1F\x7F]/g, "");

  // 3. 허용 가능한 안전 문자(영문, 숫자, 한글, 하이픈, 언더스코어, 점) 이외는 언더스코어로 치환
  clean = clean.replace(/[^a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣_.-]/g, "_");

  // 4. 공백 및 중복 언더스코어 치환
  clean = clean.replace(/\s+/g, "_");
  clean = clean.replace(/__+/g, "_");

  // 5. 비어있거나 부적합한 명칭 보정
  if (!clean || clean === "." || clean === "..") {
    clean = `uploaded_file_${Date.now()}`;
  }

  return clean;
}

/**
 * 로컬 임시 경로의 단일 파일을 Firebase Storage에 비공개 업로드합니다.
 * 추후 다중 파일 확장이 용이하도록 함수명을 일반화하였습니다.
 * 
 * @param localFilePath 로컬 임시 디렉토리에 저장된 물리 파일 경로
 * @param clientId 고객사 ID
 * @param uid 요청자 UID
 * @param submissionId 실행 요청 ID
 * @param workflowKey 자동화 워크플로우 템플릿 Key
 * @param originalFileName 클라이언트에서 제출한 실제 원본 파일명
 * @param mimeType 파일 MIME 타입
 * @param inputType 입력 타입 (예: audio, image, file 등)
 * @returns Promise<FileRef> Firestore submissions.originalFileRefs 에 기록할 파일 메타데이터 객체
 */
/**
 * 업로드 옵션 타입 (객체 방식 호출을 위한 인터페이스)
 * - 운영 배포 전에는 env.yaml에 FIREBASE_STORAGE_BUCKET을 명시하는 것을 권장합니다.
 */
export interface UploadOptions {
  localPath: string;
  originalFileName: string;
  mimeType: string;
  submissionId: string;
  clientId: string;
  uid: string;
  workflowKey: string;
  inputType: string;
}

export async function uploadFileToStorage(options: UploadOptions): Promise<FileRef> {
  const {
    localPath: localFilePath,
    originalFileName,
    mimeType,
    submissionId,
    clientId,
    uid,
    workflowKey,
    inputType,
  } = options;
  // 1. 안전한 물리 파일명 추출
  const safeFileName = sanitizeFileName(originalFileName);

  // 2. v2 표준 업로드 저장소 경로 지정
  // 기본: clients/{clientId}/users/{uid}/submissions/{submissionId}/original/{fileName}
  // TODO: 회사 공용 실행 또는 시스템 실행의 경우 별도 스토리지 경로(clients/{clientId}/company/submissions/...)를
  // 사용하도록 추후 확장 대응 필요
  const storagePath = `clients/${clientId}/users/${uid}/submissions/${submissionId}/original/${safeFileName}`;

  // 3. 로컬 파일 메타 정보 (크기 등) 확인
  if (!fs.existsSync(localFilePath)) {
    throw new Error(`[storage] 업로드할 로컬 임시 파일이 경로에 존재하지 않습니다: ${localFilePath}`);
  }
  const stats = fs.statSync(localFilePath);
  const sizeBytes = stats.size;

  // 4. Firebase Storage SDK 버킷 및 파일 업로드 처리
  const bucket = getAdminStorage().bucket();
  
  await bucket.upload(localFilePath, {
    destination: storagePath,
    metadata: {
      contentType: mimeType,
      metadata: {
        submissionId,
        clientId,
        uid,
        workflowKey,
        inputType,
        originalFileName, // 원본 파일명 보관
        uploadedAt: new Date().toISOString()
      }
    }
  });

  console.log(
    `[storage] Firebase Storage 업로드 성공. path: ${storagePath}, originalName: ${originalFileName}`
  );

  return {
    storagePath,
    fileName: originalFileName, // 원본 파일명
    mimeType,
    sizeBytes,
    inputType
  };
}
