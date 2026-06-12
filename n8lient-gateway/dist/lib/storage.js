"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeFileName = sanitizeFileName;
exports.uploadFileToStorage = uploadFileToStorage;
const fs_1 = __importDefault(require("fs"));
const firebase_1 = require("./firebase");
/**
 * 업로드 대상 파일명을 안전하게 정제합니다 (파일명 sanitizing).
 * slash, backslash, .., 제어 문자, 특수문자, 과다 공백 등을 언더스코어(_) 등으로 치환합니다.
 */
function sanitizeFileName(fileName) {
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
async function uploadFileToStorage(options) {
    const { localPath: localFilePath, originalFileName, mimeType, submissionId, clientId, uid, workflowKey, inputType, } = options;
    // 1. 안전한 물리 파일명 추출
    const safeFileName = sanitizeFileName(originalFileName);
    // 2. v2 표준 업로드 저장소 경로 지정
    // 기본: clients/{clientId}/users/{uid}/submissions/{submissionId}/original/{fileName}
    // TODO: 회사 공용 실행 또는 시스템 실행의 경우 별도 스토리지 경로(clients/{clientId}/company/submissions/...)를
    // 사용하도록 추후 확장 대응 필요
    const storagePath = `clients/${clientId}/users/${uid}/submissions/${submissionId}/original/${safeFileName}`;
    // 3. 로컬 파일 메타 정보 (크기 등) 확인
    if (!fs_1.default.existsSync(localFilePath)) {
        throw new Error(`[storage] 업로드할 로컬 임시 파일이 경로에 존재하지 않습니다: ${localFilePath}`);
    }
    const stats = fs_1.default.statSync(localFilePath);
    const sizeBytes = stats.size;
    // 4. Firebase Storage SDK 버킷 및 파일 업로드 처리
    const bucket = (0, firebase_1.getAdminStorage)().bucket();
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
    console.log(`[storage] Firebase Storage 업로드 성공. path: ${storagePath}, originalName: ${originalFileName}`);
    return {
        storagePath,
        fileName: originalFileName, // 원본 파일명
        mimeType,
        sizeBytes,
        inputType
    };
}
