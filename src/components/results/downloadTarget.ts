// 실행 결과 상세 화면 파일 다운로드·외부 링크 target 분류

import type { Submission } from "@/types/n8lient";

export type DownloadTargetKind =
  | "original_storage"
  | "result_storage"
  | "optional_export"
  | "dynamic_md"
  | "unavailable";

export type DownloadTarget = {
  kind: DownloadTargetKind;
  refType?: "original" | "result";
  refIndex?: number;
  fileName: string;
  storagePath?: string;
  provider?: string;
  url?: string;
  fileId?: string;
  type?: string;
  mimeType?: string;
  reason?: string;
};

export type SubmissionDownloadTargets = {
  originalTargets: DownloadTarget[];
  resultStorageTargets: DownloadTarget[];
  optionalExportTargets: DownloadTarget[];
};

export function hasStoragePath(target: DownloadTarget): boolean {
  return Boolean(target.storagePath?.trim());
}

export function hasOpenableUrl(target: DownloadTarget): boolean {
  return Boolean(target.url?.trim());
}

export function getDownloadTargetId(target: DownloadTarget): string {
  return [
    target.kind,
    target.refType ?? "",
    String(target.refIndex ?? ""),
    target.fileName,
    target.storagePath ?? "",
    target.url ?? "",
  ].join("__");
}

/** resultRefs 항목이 Google Drive optional export 메타인지 판별 */
function isOptionalExportResultRef(ref: Record<string, unknown>): boolean {
  const storagePath = typeof ref.storagePath === "string" ? ref.storagePath.trim() : "";
  if (storagePath) return false;

  const provider = typeof ref.provider === "string" ? ref.provider : "";
  const refType = typeof ref.type === "string" ? ref.type : typeof ref.resultType === "string" ? ref.resultType : "";
  const url = typeof ref.url === "string" ? ref.url.trim() : "";

  if (provider === "google_drive") return true;
  if (refType.startsWith("optional_export")) return true;
  if (url) return true;

  return false;
}

function readRefFileName(ref: Record<string, unknown>, fallbackIndex: number): string {
  if (typeof ref.fileName === "string" && ref.fileName.trim()) {
    return ref.fileName.trim();
  }
  return `file_${fallbackIndex}`;
}

/** submission 문서에서 화면 표시·다운로드용 target 목록 생성 */
export function buildSubmissionDownloadTargets(submission: Submission): SubmissionDownloadTargets {
  const originalTargets: DownloadTarget[] = [];
  const resultStorageTargets: DownloadTarget[] = [];
  const optionalExportTargets: DownloadTarget[] = [];

  (submission.originalFileRefs ?? []).forEach((ref, refIndex) => {
    const storagePath = ref.storagePath?.trim();
    if (storagePath) {
      originalTargets.push({
        kind: "original_storage",
        refType: "original",
        refIndex,
        fileName: ref.fileName,
        storagePath,
        mimeType: ref.mimeType,
      });
    } else {
      originalTargets.push({
        kind: "unavailable",
        refType: "original",
        refIndex,
        fileName: ref.fileName,
        reason: "다운로드 가능한 파일 참조가 없습니다.",
      });
    }
  });

  (submission.resultRefs ?? []).forEach((rawRef, refIndex) => {
    const ref = rawRef as unknown as Record<string, unknown>;
    const fileName = readRefFileName(ref, refIndex);
    const storagePath = typeof ref.storagePath === "string" ? ref.storagePath.trim() : "";

    if (storagePath) {
      resultStorageTargets.push({
        kind: "result_storage",
        refType: "result",
        refIndex,
        fileName,
        storagePath,
        mimeType: typeof ref.mimeType === "string" ? ref.mimeType : undefined,
        type: typeof ref.type === "string" ? ref.type : typeof ref.resultType === "string" ? ref.resultType : undefined,
      });
      return;
    }

    if (isOptionalExportResultRef(ref)) {
      optionalExportTargets.push({
        kind: "optional_export",
        refType: "result",
        refIndex,
        fileName,
        provider: typeof ref.provider === "string" ? ref.provider : undefined,
        url: typeof ref.url === "string" ? ref.url : undefined,
        fileId: typeof ref.fileId === "string" ? ref.fileId : undefined,
        type: typeof ref.type === "string" ? ref.type : typeof ref.resultType === "string" ? ref.resultType : undefined,
        mimeType: typeof ref.mimeType === "string" ? ref.mimeType : undefined,
      });
      return;
    }

    // storagePath·url 모두 없는 레거시 항목은 결과 섹션에 표시하지 않음
  });

  return { originalTargets, resultStorageTargets, optionalExportTargets };
}

export function getDownloadTargetButtonLabel(target: DownloadTarget, isLoading = false): string {
  if (isLoading) return "처리 중...";

  switch (target.kind) {
    case "original_storage":
      return "📥 원본 다운";
    case "result_storage":
      return "📥 결과 다운";
    case "optional_export":
      return "🔗 Drive 열기";
    case "dynamic_md":
      return "📝 MD 다운로드";
    case "unavailable":
      return "다운로드 불가";
    default:
      return "다운로드";
  }
}
