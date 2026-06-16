// Google Drive 폴더 ID 문자열 정규화 및 URL에서 folderId 추출 유틸입니다.

/** 추출된 Google Drive folderId 형식 검증 */
export const GOOGLE_DRIVE_FOLDER_ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/;

export const GOOGLE_DRIVE_FOLDER_ID_INVALID_MESSAGE =
  "Google Drive 폴더 ID 또는 폴더 링크 형식이 올바르지 않습니다. 폴더 ID 또는 공유 링크를 입력해 주세요.";

export const GOOGLE_DRIVE_FOLDER_ID_EXTRACTED_HINT =
  "Google Drive 링크에서 폴더 ID만 추출했습니다.";

export type ExtractGoogleDriveFolderIdResult = {
  folderId: string | null;
  /** URL에서 추출했는지 여부 (입력값과 folderId가 다르면 true) */
  extractedFromUrl: boolean;
};

/**
 * Google Drive 폴더 URL 또는 순수 folderId에서 ID를 추출합니다.
 */
export function extractGoogleDriveFolderId(raw: string): ExtractGoogleDriveFolderIdResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { folderId: null, extractedFromUrl: false };
  }

  const folderPathMatch = trimmed.match(/drive\.google\.com\/drive(?:\/u\/\d+)?\/folders\/([A-Za-z0-9_-]+)/i);
  if (folderPathMatch?.[1]) {
    return { folderId: folderPathMatch[1], extractedFromUrl: true };
  }

  const openIdMatch = trimmed.match(/drive\.google\.com\/open\?id=([A-Za-z0-9_-]+)/i);
  if (openIdMatch?.[1]) {
    return { folderId: openIdMatch[1], extractedFromUrl: true };
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("drive.google.com")) {
      const idParam = url.searchParams.get("id");
      if (idParam) {
        return { folderId: idParam, extractedFromUrl: true };
      }
      const pathFolder = url.pathname.match(/\/folders\/([A-Za-z0-9_-]+)/i);
      if (pathFolder?.[1]) {
        return { folderId: pathFolder[1], extractedFromUrl: true };
      }
    }
  } catch {
    // URL 파싱 실패 시 순수 ID로 처리
  }

  return { folderId: trimmed, extractedFromUrl: false };
}

export type NormalizeGoogleDriveFolderIdResult =
  | { ok: true; folderId: string; extractedFromUrl: boolean; isEmpty: false }
  | { ok: true; folderId: ""; extractedFromUrl: false; isEmpty: true }
  | { ok: false; error: string };

/**
 * 입력값을 trim 후 folderId로 정규화하고 형식을 검증합니다.
 * allowEmpty=true이고 빈 값이면 isEmpty 결과를 반환합니다.
 */
export function normalizeGoogleDriveFolderIdInput(
  raw: string,
  options?: { allowEmpty?: boolean }
): NormalizeGoogleDriveFolderIdResult {
  const allowEmpty = options?.allowEmpty ?? false;
  const trimmed = raw.trim();

  if (!trimmed) {
    if (allowEmpty) {
      return { ok: true, folderId: "", extractedFromUrl: false, isEmpty: true };
    }
    return { ok: false, error: GOOGLE_DRIVE_FOLDER_ID_INVALID_MESSAGE };
  }

  const { folderId, extractedFromUrl } = extractGoogleDriveFolderId(trimmed);
  if (!folderId || !GOOGLE_DRIVE_FOLDER_ID_PATTERN.test(folderId)) {
    return { ok: false, error: GOOGLE_DRIVE_FOLDER_ID_INVALID_MESSAGE };
  }

  const wasUrlInput = extractedFromUrl || trimmed !== folderId;
  return { ok: true, folderId, extractedFromUrl: wasUrlInput, isEmpty: false };
}
