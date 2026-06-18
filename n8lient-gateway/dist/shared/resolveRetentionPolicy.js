"use strict";
/**
 * N8Lient Gateway Retention Policy Resolver
 * v2.1 핵심 최적화 규격 준수
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRetentionPolicy = resolveRetentionPolicy;
/**
 * 최종 보관 정책(Retention Policy)을 계산합니다.
 */
function resolveRetentionPolicy(params) {
    const { finalLevel, finalSettings, input, hasFile, resolvedFrom } = params;
    // 1. 기본 DB/Storage 보관 여부 결정
    // notify_only: 모두 false
    // processed_result: processorResult만 true
    // full_archive: 모두 true
    const storeProcessorResult = finalLevel !== "notify_only";
    const storeOriginalFiles = finalLevel === "full_archive";
    const storeOriginalFileRefs = finalLevel === "full_archive";
    const storeResultRefs = finalLevel === "full_archive";
    const storageProvider = storeOriginalFiles ? "firebase_storage" : "none";
    // 2. 이메일 전송 옵션 계산
    const emailEnabled = Boolean(finalSettings.reportEmailTo) && finalSettings.emailEnabled !== false;
    const emailAttachResult = emailEnabled && finalSettings.emailAttachResult === true;
    // 원본 입력 존재 여부 (audio, image, file 타입이면서 실제 파일이나 URL이 있는 경우)
    const hasOriginalInput = ["audio", "image", "file"].includes(input.inputType) &&
        Boolean(input.fileName || hasFile || input.fileUrl);
    const emailAttachOriginal = emailEnabled && finalSettings.emailAttachOriginal === true && hasOriginalInput;
    // 3. Optional Export (Google Drive 등) 계산
    const rawOptionalExport = finalSettings.optionalExportProvider;
    const optionalExportProvider = rawOptionalExport === "google_drive" ? "google_drive" : "none";
    return {
        level: finalLevel,
        emailEnabled,
        emailAttachResult,
        emailAttachOriginal,
        storeProcessorResult,
        storeOriginalFiles,
        storeOriginalFileRefs,
        storeResultRefs,
        storageProvider,
        optionalExportProvider,
        resolvedFrom
    };
}
