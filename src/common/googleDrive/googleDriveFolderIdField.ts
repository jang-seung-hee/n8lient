// configSchema 설정 키 중 Google Drive folderId 필드 판별 및 settings 일괄 정규화

import {
  normalizeGoogleDriveFolderIdInput,
  GOOGLE_DRIVE_FOLDER_ID_INVALID_MESSAGE,
} from "./extractGoogleDriveFolderId";

/** Google Drive 폴더 ID 성격의 configSchema key 여부 */
export function isGoogleDriveFolderIdConfigKey(key: string): boolean {
  return /folderid/i.test(key.replace(/_/g, ""));
}

type SchemaFieldRef = {
  key: string;
  label?: string;
  required?: boolean;
};

/**
 * settings 객체 내 Google Drive folderId 필드를 저장 전 정규화합니다.
 * @param allowEmptyForOptional - true면 required가 아닌 필드의 빈 값은 그대로 허용
 */
export function normalizeSettingsDriveFolderIds(
  settings: Record<string, string | number | boolean>,
  schemaFields: SchemaFieldRef[],
  options?: { allowEmptyForOptional?: boolean }
): { settings: Record<string, string | number | boolean>; error?: string } {
  const allowEmptyForOptional = options?.allowEmptyForOptional ?? false;
  const next = { ...settings };

  for (const field of schemaFields) {
    if (!isGoogleDriveFolderIdConfigKey(field.key)) continue;

    const raw = settings[field.key];
    if (raw === undefined || raw === null || typeof raw === "boolean") continue;

    const rawStr = String(raw).trim();
    const allowEmpty = allowEmptyForOptional ? true : !field.required;

    const result = normalizeGoogleDriveFolderIdInput(rawStr, { allowEmpty });
    if (!result.ok) {
      const label = field.label || field.key;
      return {
        settings: next,
        error: `[${label}] ${result.error || GOOGLE_DRIVE_FOLDER_ID_INVALID_MESSAGE}`,
      };
    }

    if (result.isEmpty) {
      next[field.key] = "";
    } else {
      next[field.key] = result.folderId;
    }
  }

  return { settings: next };
}
