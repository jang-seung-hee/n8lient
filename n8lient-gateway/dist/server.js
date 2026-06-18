"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const dotenv_1 = __importDefault(require("dotenv"));
const firebase_1 = require("./lib/firebase");
const auth_1 = require("./middleware/auth");
const storage_1 = require("./lib/storage");
const validateExecution_1 = require("./shared/validateExecution");
const buildTitleContract_1 = require("./shared/buildTitleContract");
// .env 파일 로드 (로컬 개발용)
dotenv_1.default.config();
/**
 * settingsSnapshot 저장 시, 민감한 설정값을 대소문자 구분 없이 자동 감지하여 누락 처리합니다.
 * 'key' 단독 키워드는 필터 범위에서 제외됩니다.
 */
function filterSensitiveSettings(settings) {
    const filtered = {};
    const sensitiveKeywords = [
        "secret",
        "token",
        "password",
        "credential",
        "auth",
        "apikey",
        "accesstoken",
        "refreshtoken",
        "privatekey",
        "secretkey",
        "clientsecret"
    ];
    for (const [key, value] of Object.entries(settings)) {
        const keyLower = key.toLowerCase();
        const isSensitive = sensitiveKeywords.some(keyword => keyLower.includes(keyword));
        if (!isSensitive) {
            filtered[key] = value;
        }
        else {
            console.log(`[filterSensitiveSettings] 민감값 자동 감지: '${key}' 필드를 settingsSnapshot에서 누락 처리합니다.`);
        }
    }
    return filtered;
}
const app = (0, express_1.default)();
const port = process.env.PORT || 8080;
// CORS 설정
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
    : ["*"];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes("*")) {
            callback(null, true);
        }
        else {
            callback(new Error("CORS 정책에 의해 차단되었습니다."));
        }
    },
    credentials: true
}));
// JSON 및 URL-encoded 바디 파서
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Multer 임시 파일 저장소 설정 (/tmp 사용)
const upload = (0, multer_1.default)({
    dest: path_1.default.join(os_1.default.tmpdir(), "n8lient-uploads"),
    limits: {
        fileSize: parseInt(process.env.MAX_UPLOAD_MB || "10", 10) * 1024 * 1024
    }
});
/**
 * n8n Webhook URL 조립 헬퍼 함수
 */
function getWebhookConfig(serverKey, webhookSecretId) {
    // 1. n8nServerKey 및 webhookSecretId 값 유효성 및 형식 검증
    if (!serverKey || !webhookSecretId) {
        console.warn(`[getWebhookConfig] 필수 인자가 빈 문자열입니다. serverKey="${serverKey}", webhookSecretId="${webhookSecretId}"`);
        return null;
    }
    // 안전 문자 검증 정규식 (영문 소문자, 숫자, 하이픈, 언더스코어 허용)
    const webhookSecretIdRegex = /^[a-z0-9_-]+$/;
    if (!webhookSecretIdRegex.test(webhookSecretId)) {
        console.warn(`[getWebhookConfig] 유효하지 않은 webhookSecretId 형식입니다: "${webhookSecretId}". 영문 소문자, 숫자, 하이픈(-), 언더스코어(_)만 허용됩니다.`);
        return null;
    }
    // n8nServerKey는 영문, 숫자, 하이픈, 언더스코어 허용
    const serverKeyRegex = /^[a-zA-Z0-9_-]+$/;
    if (!serverKeyRegex.test(serverKey)) {
        console.warn(`[getWebhookConfig] 유효하지 않은 n8nServerKey 형식입니다: "${serverKey}". 영문, 숫자, 하이픈(-), 언더스코어(_)만 허용됩니다.`);
        return null;
    }
    const serverEnvKey = serverKey.toUpperCase().replace(/-/g, "_");
    const webhookEnvKey = webhookSecretId.toUpperCase().replace(/-/g, "_");
    const baseUrl = process.env[`N8N_SERVER_${serverEnvKey}_BASE_URL`];
    if (!baseUrl) {
        console.warn(`[getWebhookConfig] n8n 서버 베이스 URL 환경변수가 설정되지 않았습니다: N8N_SERVER_${serverEnvKey}_BASE_URL`);
        return null;
    }
    // Webhook Path 결정
    // 1순위: N8N_WEBHOOK_PATH_OVERRIDE_{SANITIZED_WEBHOOK_SECRET_ID}
    // 2순위: /webhook/{webhookSecretId} (기본 자동 조합)
    const overridePath = process.env[`N8N_WEBHOOK_PATH_OVERRIDE_${webhookEnvKey}`];
    const pathPart = overridePath || `/webhook/${webhookSecretId}`;
    const normalizedPath = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
    const url = `${baseUrl.replace(/\/$/, "")}${normalizedPath}`;
    return { url };
}
// 1. GET /health (헬스 체크)
app.get("/health", (req, res) => {
    res.status(200).send("OK");
});
// 2. POST /api/automation/execute (자동화 실행 요청 접수 및 n8n 위임)
app.post("/api/automation/execute", auth_1.checkAuth, upload.single("file_0"), async (req, res) => {
    const file = req.file;
    let submissionId = "";
    const gatewayTraceId = `gw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).json({ success: false, error: "인증되지 않은 사용자입니다." });
        }
        // JSON body 파싱 (FormData 전송 시 payload 문자열로 래핑될 수 있음)
        let payloadData = {};
        if (req.body.payload) {
            try {
                payloadData = JSON.parse(req.body.payload);
            }
            catch (err) {
                return res.status(400).json({ success: false, error: "유효하지 않은 payload JSON 문자열입니다." });
            }
        }
        else {
            payloadData = req.body;
        }
        const { automationId, input } = payloadData;
        // 최소 파라미터 구조 검사
        if (!automationId || !input) {
            const dateStr = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
            const randomStr = Math.random().toString(36).substring(2, 8);
            const errRequestId = `req_err_${dateStr}_${randomStr}`;
            return res.status(400).json({
                success: false,
                code: "REQUIRED_INPUT_MISSING",
                error: "필수 파라미터(automationId, input)가 누락되었습니다.",
                source: "gateway_request_validation",
                missingFields: !automationId ? ["automationId"] : ["input"],
                received: {
                    hasAutomationId: Boolean(automationId),
                    hasInput: Boolean(input),
                    hasTitle: Boolean(input?.title),
                    inputType: input?.inputType || null,
                    hasFile: Boolean(file),
                    fileCount: file ? 1 : 0
                },
                requestId: errRequestId,
                submissionId: null
            });
        }
        const db = (0, firebase_1.getAdminFirestore)();
        // 1. 사용자 정보 및 승인 상태 검증
        const userSnap = await db.collection("users").doc(uid).get();
        if (!userSnap.exists) {
            return res.status(404).json({ success: false, error: "사용자 정보를 찾을 수 없습니다." });
        }
        const userDoc = userSnap.data();
        if (userDoc.approvalStatus !== "approved") {
            return res.status(403).json({ success: false, error: "승인 완료된 사용자만 실행 요청이 가능합니다." });
        }
        const clientId = userDoc.clientId;
        // 2. clientAutomations/{automationId} 검증
        const autoSnap = await db.collection("clientAutomations").doc(automationId).get();
        if (!autoSnap.exists) {
            return res.status(404).json({ success: false, error: "자동화 설정을 찾을 수 없습니다." });
        }
        const autoDoc = autoSnap.data();
        if (autoDoc.clientId !== clientId) {
            return res.status(403).json({ success: false, error: "접근 권한이 없는 자동화 설정입니다." });
        }
        if (!autoDoc.enabled) {
            return res.status(400).json({ success: false, error: "비활성화 상태의 자동화입니다." });
        }
        if (autoDoc.configStatus !== "configured") {
            return res.status(400).json({ success: false, error: "설정이 미완료된 자동화입니다." });
        }
        const workflowKey = autoDoc.workflowKey;
        const companySettings = autoDoc.settings || {};
        // 3. userAutomationSettings 개인 설정 조회 및 병합
        const finalSettings = { ...companySettings };
        const userSettingId = `${uid}_${automationId}`;
        const userSettingSnap = await db.collection("userAutomationSettings").doc(userSettingId).get();
        let hasUserSetting = false;
        const mergedKeys = [];
        let userPreference = null;
        if (userSettingSnap.exists) {
            const userSettingDoc = userSettingSnap.data();
            const isValid = (!userSettingDoc.uid || userSettingDoc.uid === uid) &&
                (!userSettingDoc.clientId || userSettingDoc.clientId === clientId) &&
                (!userSettingDoc.automationId || userSettingDoc.automationId === automationId) &&
                (!userSettingDoc.workflowKey || userSettingDoc.workflowKey === workflowKey);
            if (isValid) {
                hasUserSetting = true;
                for (const [key, val] of Object.entries(userSettingDoc.settings || {})) {
                    const isInvalid = val === null || val === undefined || (typeof val === "string" && val.trim() === "");
                    if (!isInvalid) {
                        finalSettings[key] = val;
                        mergedKeys.push(key);
                    }
                }
                if (userSettingDoc.userRetentionPreference) {
                    userPreference = userSettingDoc.userRetentionPreference;
                }
            }
        }
        const fallbackKeys = Object.keys(finalSettings).filter((k) => !mergedKeys.includes(k));
        const settingsMergeSummary = { hasUserSetting, mergedKeys, fallbackKeys };
        // 4. workflowTemplates 조회 및 n8n Webhook 정보 획득
        const templateSnap = await db.collection("workflowTemplates").doc(workflowKey).get();
        if (!templateSnap.exists) {
            return res.status(404).json({ success: false, error: "자동화 명세(Template)를 찾을 수 없습니다." });
        }
        const templateDoc = templateSnap.data();
        const n8nServerKey = templateDoc.n8nServerKey || "main";
        const webhookSecretId = templateDoc.webhookSecretId || workflowKey;
        const webhookConfig = getWebhookConfig(n8nServerKey, webhookSecretId);
        if (!webhookConfig) {
            return res.status(500).json({ success: false, error: "n8n Webhook 연동 정보가 서버에 설정되지 않았습니다." });
        }
        // ── 4.2. 공통 validation 헬퍼 구동 ──────────────────
        const workflowName = templateDoc.name || workflowKey;
        const titleContract = (0, buildTitleContract_1.buildExecutionTitleContract)({
            inputTitle: input.title,
            titleProvided: input.titleProvided,
            titleSource: input.titleSource,
            workflowName,
        });
        const fileList = file ? [{
                name: file.originalname,
                size: file.size,
                type: file.mimetype
            }] : [];
        const validationResult = (0, validateExecution_1.validateExecution)({
            automationId,
            input: {
                title: titleContract.title,
                text: input.text || undefined,
                inputType: input.inputType || undefined
            },
            files: fileList,
            inputSchema: templateDoc.inputSchema || {},
            configSchema: templateDoc.configSchema || [],
            settings: finalSettings
        });
        if (!validationResult.isValid) {
            const dateStr = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
            const randomStr = Math.random().toString(36).substring(2, 8);
            const errRequestId = `req_err_${dateStr}_${randomStr}`;
            // 임시 업로드 파일 삭제 (메모리 누수 방지)
            if (file && fs_1.default.existsSync(file.path)) {
                fs_1.default.promises.unlink(file.path).catch(err => {
                    console.error(`[execute] 임시 파일 제거 실패: path=${file.path}`, err);
                });
            }
            return res.status(400).json({
                success: false,
                code: "EXECUTION_VALIDATION_FAILED",
                error: "실행에 필요한 입력값이 부족합니다.",
                source: "gateway_execution_validation",
                missingFields: validationResult.missingFields,
                received: {
                    hasAutomationId: validationResult.received.hasAutomationId,
                    hasTitle: validationResult.received.hasTitle,
                    hasText: validationResult.received.hasText,
                    fileCount: validationResult.received.fileCount,
                    providedInputTypes: validationResult.received.providedInputTypes
                },
                requestId: errRequestId,
                submissionId: null
            });
        }
        // ── 5. submissions 문서 queued 상태로 생성 (사전 등록) ──
        // 1. 레벨 가중치 오더 정의
        const RETENTION_LEVEL_ORDER = {
            notify_only: 1,
            processed_result: 2,
            full_archive: 3,
        };
        // 2. 워크플로우 및 계약 한도 획득
        const capabilities = templateDoc.retentionCapabilities || {
            maxLevel: "full_archive",
            supportedLevels: ["notify_only", "processed_result", "full_archive"],
            defaultLevel: "full_archive",
        };
        const opPolicy = templateDoc.operatorRetentionPolicy || {
            allowedLevels: ["notify_only", "processed_result", "full_archive"],
            defaultLevel: "full_archive",
            allowCompanyOverride: true,
            allowUserOverride: true,
        };
        // 회사별 계약 한도 획득 (clientAutomations/autoDoc의 contractRetentionLimit 우선, 없으면 operatorRetentionPolicy에서 추출)
        const contractRetentionLimit = autoDoc.contractRetentionLimit || {
            maxLevel: opPolicy.defaultLevel || "full_archive",
            allowedLevels: opPolicy.allowedLevels || ["notify_only", "processed_result", "full_archive"]
        };
        const coPolicy = autoDoc.companyRetentionPolicy || {
            recommendedLevel: autoDoc.companyRetentionPolicy?.defaultLevel || contractRetentionLimit.maxLevel || "full_archive",
            defaultLevel: autoDoc.companyRetentionPolicy?.defaultLevel || contractRetentionLimit.maxLevel || "full_archive",
            allowedUserLevels: contractRetentionLimit.allowedLevels || ["notify_only", "processed_result", "full_archive"],
            allowUserOverride: opPolicy.allowUserOverride,
        };
        // 3. 허용 가능한 교집합(선택가능 범위) 계산
        const supportedLevels = capabilities.supportedLevels || [];
        const contractAllowedLevels = contractRetentionLimit.allowedLevels || [];
        const selectableLevels = supportedLevels.filter((lvl) => contractAllowedLevels.includes(lvl));
        // 4. 개인 선호값 및 회사 권장값 획득
        const userPreferredLevel = userPreference?.preferredLevel || null;
        const companyRecommendedLevel = coPolicy.recommendedLevel || coPolicy.defaultLevel || capabilities.defaultLevel || "full_archive";
        // 5. 요청 레벨 결정 (개인 설정 우선, 없으면 회사 권장)
        let requestedLevel = userPreferredLevel || companyRecommendedLevel;
        let finalLevel = requestedLevel;
        let reason = userPreferredLevel
            ? "user_preference_applied_within_contract_limit"
            : "company_recommended_level_applied";
        // 6. clampToMaxAllowedLevel 구현 및 적용
        if (!selectableLevels.includes(finalLevel)) {
            // 요청 레벨이 허용 범위에 없는 경우 조정
            const reqVal = RETENTION_LEVEL_ORDER[finalLevel] || 3;
            // 1) 허용 범위 중 요청한 레벨보다 작거나 같으면서 가장 큰 레벨 탐색
            const lowerOrEqualLevels = selectableLevels
                .filter((lvl) => (RETENTION_LEVEL_ORDER[lvl] || 1) <= reqVal)
                .sort((a, b) => (RETENTION_LEVEL_ORDER[b] || 0) - (RETENTION_LEVEL_ORDER[a] || 0));
            if (lowerOrEqualLevels.length > 0) {
                finalLevel = lowerOrEqualLevels[0];
                reason = userPreferredLevel
                    ? "user_preference_clamped_to_max_allowed"
                    : "company_recommended_clamped_to_max_allowed";
            }
            else {
                // 2) 더 낮은 허용 레벨이 전혀 없는 경우, 허용 레벨 중 최솟값 적용
                const sortedSelectable = [...selectableLevels].sort((a, b) => (RETENTION_LEVEL_ORDER[a] || 0) - (RETENTION_LEVEL_ORDER[b] || 0));
                finalLevel = sortedSelectable[0] || capabilities.defaultLevel || "full_archive";
                reason = "requested_level_out_of_bounds_fallback_to_minimum_allowed";
            }
        }
        const storeProc = finalLevel !== "notify_only";
        const storeOrig = finalLevel === "full_archive";
        // [v2.8.1] 이메일 전송 옵션과 Storage 보관 옵션 분리 (PATCH)
        const emailEnabled = Boolean(finalSettings.reportEmailTo) && finalSettings.emailEnabled !== false;
        const emailAttachResult = emailEnabled && finalSettings.emailAttachResult === true;
        // 원본 입력 존재 여부 (audio, image, file 타입이면서 실제 파일이나 URL이 있는 경우)
        const hasOriginalInput = ["audio", "image", "file"].includes(input.inputType) &&
            Boolean(input.fileName || file || input.fileUrl);
        const emailAttachOriginal = emailEnabled && finalSettings.emailAttachOriginal === true && hasOriginalInput;
        const retentionPolicy = {
            level: finalLevel,
            emailEnabled,
            emailAttachResult,
            emailAttachOriginal,
            storeProcessorResult: storeProc,
            storeOriginalFiles: storeOrig,
            storageProvider: storeOrig ? "firebase_storage" : "none",
            optionalExportProvider: "none",
            resolvedFrom: {
                workflowDefault: capabilities.defaultLevel || null,
                operatorDefault: opPolicy.defaultLevel || null,
                companyDefault: companyRecommendedLevel || null,
                userPreference: userPreferredLevel || null,
                reason,
            }
        };
        // 5. submissions 문서 queued 상태로 생성 (사전 등록)
        const now = new Date();
        const dateStr = now.toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
        const randomStr = Math.random().toString(36).substring(2, 8);
        submissionId = `sub_${dateStr}_${randomStr}`;
        // 파일 메타데이터 준비
        const fileMetadata = file ? {
            fileName: file.originalname || "attached_file",
            mimeType: file.mimetype || "application/octet-stream",
            sizeBytes: file.size,
            inputType: input.inputType || "file"
        } : null;
        // [v2] Firebase Storage 원본 파일 업로드 (retentionPolicy.storeOriginalFiles 가 true일 때만 저장)
        let originalFileRefs = [];
        if (file) {
            if (retentionPolicy.storeOriginalFiles) {
                try {
                    console.log(`[execute] Firebase Storage 원본 파일 업로드 시작. submissionId=${submissionId}`);
                    const fileRef = await (0, storage_1.uploadFileToStorage)({
                        localPath: file.path,
                        originalFileName: file.originalname,
                        mimeType: file.mimetype,
                        submissionId,
                        clientId,
                        uid,
                        workflowKey,
                        inputType: input.inputType || "file",
                    });
                    originalFileRefs = [fileRef];
                    console.log(`[execute] Storage 업로드 완료. storagePath=${fileRef.storagePath}`);
                }
                catch (uploadErr) {
                    console.error(`[execute] Firebase Storage 업로드 실패. submissionId=${submissionId}:`, uploadErr.message);
                    const failedAt = new Date().toISOString();
                    try {
                        await db.collection("submissions").doc(submissionId).set({
                            submissionId,
                            clientId,
                            uid,
                            workflowKey,
                            automationId,
                            trigger: input.trigger || "manual",
                            status: "failed",
                            input: {
                                title: titleContract.title,
                                submissionTitle: titleContract.submissionTitle,
                                titleProvided: titleContract.titleProvided,
                                titleSource: titleContract.titleSource,
                                text: input.text || null,
                                fileUrl: null,
                                fileName: file.originalname || null,
                                mimeType: file.mimetype || null,
                                sizeBytes: file.size || null,
                                inputType: input.inputType || "file",
                            },
                            originalFileRefs: [],
                            processorResult: null,
                            resultRefs: [],
                            settingsSnapshot: filterSensitiveSettings(finalSettings),
                            retentionPolicySnapshot: retentionPolicy,
                            result: { resultUrl: null, summary: null },
                            error: {
                                code: "STORAGE_UPLOAD_FAILED",
                                message: uploadErr.message || "Firebase Storage 원본 파일 저장 실패",
                            },
                            errorDetails: {
                                phase: "GATEWAY_STORAGE",
                                source: "gateway",
                                occurredAt: failedAt,
                                gatewayTraceId,
                                hint: "Firebase Storage 업로드 중 오류가 발생했습니다. 권한 또는 네트워크 상태를 확인하세요.",
                            },
                            retryOf: null,
                            settingsMergeSummary,
                            createdAt: now.toISOString(),
                            updatedAt: failedAt,
                            completedAt: failedAt,
                        });
                    }
                    catch (dbErr) {
                        console.error("[execute] Storage 실패 상태 Firestore 기록 오류:", dbErr);
                    }
                    return res.status(500).json({
                        success: false,
                        submissionId,
                        error: "파일 저장 실패: Firebase Storage 업로드 중 오류가 발생했습니다.",
                    });
                }
            }
            else {
                console.log(`[execute] retentionPolicy 정책(level=${retentionPolicy.level})에 의해 Storage 파일 업로드를 생략합니다.`);
            }
        }
        // [v2] settingsSnapshot: 민감값 필터링 후 저장
        const settingsSnapshot = filterSensitiveSettings(finalSettings);
        // [v2] input.inputType 판별 (파일/텍스트)
        const resolvedInputType = fileMetadata?.inputType || (input.text ? "text" : "unknown");
        const submissionData = {
            submissionId,
            clientId,
            uid,
            workflowKey,
            automationId,
            trigger: input.trigger || "manual",
            status: "queued",
            displayTitle: titleContract.displayTitle,
            input: {
                title: titleContract.title,
                submissionTitle: titleContract.submissionTitle,
                titleProvided: titleContract.titleProvided,
                titleSource: titleContract.titleSource,
                text: input.text || null,
                fileUrl: null,
                fileName: fileMetadata?.fileName || null,
                mimeType: fileMetadata?.mimeType || null,
                sizeBytes: fileMetadata?.sizeBytes || null,
                inputType: resolvedInputType,
            },
            originalFileRefs,
            processorResult: null,
            resultRefs: [],
            settingsSnapshot,
            retentionPolicySnapshot: retentionPolicy,
            result: { resultUrl: null, summary: null },
            error: { code: null, message: null },
            retryOf: null,
            settingsMergeSummary,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            completedAt: null,
        };
        await db.collection("submissions").doc(submissionId).set(submissionData);
        // 6. n8n Webhook 서버 간 요청 전송
        const gatewayBaseUrl = process.env.GATEWAY_BASE_URL || "http://localhost:8080";
        const n8nPayload = {
            submissionId,
            clientId,
            uid,
            workflowKey,
            automationId,
            settings: finalSettings,
            input: submissionData.input,
            originalFileRefs,
            retentionPolicy,
            requestedAt: now.toISOString(),
            callbackUrl: `${gatewayBaseUrl.replace(/\/$/, "")}/api/automation/callback`,
        };
        const n8nServerToken = process.env[`N8N_SERVER_${n8nServerKey.toUpperCase().replace(/-/g, "_")}_TOKEN`] || "";
        const form = new form_data_1.default();
        form.append("submissionId", submissionId);
        form.append("payload", JSON.stringify(n8nPayload));
        if (file) {
            // 로컬 디렉토리의 임시 파일을 읽어 n8n으로 파이프 전송
            form.append("file_0", fs_1.default.createReadStream(file.path), {
                filename: file.originalname,
                contentType: file.mimetype,
            });
        }
        const n8nHeaders = {
            ...form.getHeaders(),
            "X-N8N-TOKEN": n8nServerToken,
        };
        console.log(`[execute] n8n Webhook 호출 시작. URL: ${webhookConfig.url}`);
        // axios를 사용하여 n8n 호출 실행
        try {
            const n8nResponse = await axios_1.default.post(webhookConfig.url, form, {
                headers: n8nHeaders,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 120000 // 2분 타임아웃
            });
            if (n8nResponse.status >= 200 && n8nResponse.status < 300) {
                console.log(`[execute] n8n Webhook 호출 성공. Status: ${n8nResponse.status}`);
                return res.status(200).json({ success: true, submissionId });
            }
            else {
                throw new Error(`n8n 서버 응답 실패 (HTTP ${n8nResponse.status})`);
            }
        }
        catch (n8nErr) {
            const httpStatus = n8nErr.response?.status;
            let hint = "n8n 서버 내부 오류 또는 워크플로우 런타임 오류 확인";
            if (httpStatus === 404) {
                hint = "n8n Webhook Path, 워크플로우 Active 상태, production/test webhook URL, Gateway n8n base URL 설정을 확인하세요.";
            }
            else if (httpStatus === 401 || httpStatus === 403) {
                hint = "n8n Header Auth, X-N8N-TOKEN, Credential 연결 상태 확인";
            }
            else if (n8nErr.code === "ECONNABORTED" || n8nErr.message?.includes("timeout")) {
                hint = "n8n 응답 지연, 파일 크기, 외부 API 처리 시간, Cloud Run timeout 확인";
            }
            else if (!httpStatus) {
                hint = "n8n base URL, DNS, Cloud Run/터널, 방화벽 확인 (Network Error)";
            }
            const errorDetails = {
                phase: "GATEWAY_N8N_CALL",
                source: "gateway",
                httpStatus,
                occurredAt: new Date().toISOString(),
                gatewayTraceId,
                n8nServerKey,
                n8nWebhookPath: webhookSecretId,
                safeTarget: `${n8nServerKey}/${webhookSecretId}`,
                hint,
                sanitizedMessage: n8nErr.message,
            };
            if (submissionId) {
                await db.collection("submissions").doc(submissionId).update({
                    status: "failed",
                    updatedAt: new Date().toISOString(),
                    error: {
                        code: "GATEWAY_EXECUTE_FAILED",
                        message: n8nErr.message || "게이트웨이 통신 실패"
                    },
                    errorDetails
                });
            }
            return res.status(httpStatus || 500).json({
                success: false,
                error: `실행 실패: ${n8nErr.message}`,
                errorDetails
            });
        }
    }
    catch (error) {
        console.error("[execute] 처리 중 에러 발생:", error);
        // 에러 발생 시 submissions 상태 failed로 업데이트 (고착 방지)
        if (submissionId) {
            try {
                const db = (0, firebase_1.getAdminFirestore)();
                await db.collection("submissions").doc(submissionId).update({
                    status: "failed",
                    updatedAt: new Date().toISOString(),
                    error: {
                        code: "GATEWAY_INTERNAL_ERROR",
                        message: error.message || "게이트웨이 내부 오류"
                    },
                    errorDetails: {
                        phase: "UNKNOWN",
                        source: "gateway",
                        occurredAt: new Date().toISOString(),
                        gatewayTraceId,
                        hint: "게이트웨이 서버 내부 처리 중 예외가 발생했습니다.",
                    }
                });
            }
            catch (dbErr) {
                console.error("[execute] 에러 마킹 업데이트 실패:", dbErr);
            }
        }
        return res.status(500).json({ success: false, error: `실행 실패: ${error.message}` });
    }
    finally {
        // 7. 임시 파일 영구 삭제
        if (file && fs_1.default.existsSync(file.path)) {
            fs_1.default.promises.unlink(file.path).catch(err => {
                console.error(`[execute] 임시 파일 제거 실패: path=${file.path}`, err);
            });
        }
    }
});
// 3. POST /api/automation/callback (n8n 완료 콜백 수신 및 submission 결과 갱신)
app.post("/api/automation/callback", async (req, res) => {
    try {
        // 1. Authorization: Bearer N8N_CALLBACK_SECRET 보안 검증
        const authHeader = req.headers.authorization;
        const callbackSecret = process.env.N8N_CALLBACK_SECRET;
        if (!authHeader || !authHeader.startsWith("Bearer ") || !callbackSecret) {
            return res.status(401).json({ success: false, error: "인증 자격증명이 없거나 유효하지 않습니다." });
        }
        const receivedSecret = authHeader.replace("Bearer ", "");
        if (receivedSecret !== callbackSecret) {
            return res.status(401).json({ success: false, error: "잘못된 Callback Secret 자격증명입니다." });
        }
        // [v2] processorResult, resultRefs 필드도 선택적으로 수신
        const { submissionId, status, result, error, processorResult, resultRefs } = req.body;
        if (!submissionId || !status) {
            return res.status(400).json({ success: false, error: "필수 파라미터가 누락되었습니다." });
        }
        const db = (0, firebase_1.getAdminFirestore)();
        const docRef = db.collection("submissions").doc(submissionId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return res.status(404).json({ success: false, error: "해당 실행 이력(submission)을 찾을 수 없습니다." });
        }
        const subDoc = docSnap.data();
        // 기존 데이터 호환용 fallback: retentionPolicySnapshot이 없으면 기본 'full_archive' 정책으로 간주
        const policy = subDoc.retentionPolicySnapshot || { level: "full_archive", storeProcessorResult: true, storeOriginalFiles: true };
        const level = policy.level || "full_archive";
        // 2. 최종 상태(success/failed) 및 메타데이터 업데이트
        const completedAt = new Date().toISOString();
        const updateData = {
            status: status === "success" ? "success" : "failed",
            updatedAt: completedAt,
            completedAt,
        };
        if (status === "success") {
            // 공통: result.summary, result.resultUrl 정도는 모든 레벨에서 기본 저장 허용
            updateData.result = {
                resultUrl: result?.resultUrl || null,
                summary: result?.summary || null,
            };
            if (level === "full_archive") {
                if (processorResult !== undefined && processorResult !== null) {
                    updateData.processorResult = processorResult;
                }
                if (Array.isArray(resultRefs) && resultRefs.length > 0) {
                    updateData.resultRefs = resultRefs;
                }
            }
            else if (level === "processed_result") {
                if (processorResult !== undefined && processorResult !== null) {
                    updateData.processorResult = processorResult;
                }
                // processed_result 에서는 결과 파일 참조를 저장하지 않음
                updateData.resultRefs = [];
            }
            else if (level === "notify_only") {
                // notify_only 에서는 processorResult와 결과 파일 참조 모두 비우거나 저장하지 않음
                updateData.processorResult = null;
                updateData.resultRefs = [];
            }
            const resolvedDisplayTitle = (0, buildTitleContract_1.resolveDisplayTitleAfterCallback)({
                processorResultTitle: processorResult?.title,
                existingDisplayTitle: subDoc.displayTitle,
                submissionTitle: subDoc.input?.submissionTitle,
            });
            if (resolvedDisplayTitle) {
                updateData.displayTitle = resolvedDisplayTitle;
            }
        }
        else {
            updateData.error = {
                code: error?.code || "N8N_WORKFLOW_FAILED",
                message: error?.message || "n8n 워크플로우 수행 오류",
            };
        }
        await docRef.update(updateData);
        console.log(`[callback] submissionId=${submissionId} (level=${level}) 업데이트 완료. Status: ${updateData.status}, processorResult=${!!updateData.processorResult}, resultRefs=${updateData.resultRefs?.length ?? 0}건`);
        return res.status(200).json({ success: true });
    }
    catch (error) {
        console.error("[callback] 처리 중 서버 오류:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
});
// 4. GET /api/automation/download (보안 격리 파일 다운로드 API)
app.get("/api/automation/download", auth_1.checkAuth, async (req, res) => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).json({ success: false, error: "인증되지 않은 사용자입니다." });
        }
        const { submissionId, refType, index } = req.query;
        if (!submissionId || !refType || index === undefined) {
            return res.status(400).json({ success: false, error: "필수 파라미터(submissionId, refType, index)가 누락되었습니다." });
        }
        const idx = parseInt(index, 10);
        if (isNaN(idx)) {
            return res.status(400).json({ success: false, error: "index 파라미터는 숫자 형식이어야 합니다." });
        }
        if (refType !== "original" && refType !== "result") {
            return res.status(400).json({ success: false, error: "refType은 'original' 또는 'result'만 허용됩니다." });
        }
        const db = (0, firebase_1.getAdminFirestore)();
        // 1. 사용자 정보 조회 (권한 검증용)
        const userSnap = await db.collection("users").doc(uid).get();
        if (!userSnap.exists) {
            return res.status(404).json({ success: false, error: "사용자 정보를 찾을 수 없습니다." });
        }
        const userDoc = userSnap.data();
        const userRole = userDoc.role;
        const userClientId = userDoc.clientId;
        // 2. submissions/{submissionId} 조회
        const subSnap = await db.collection("submissions").doc(submissionId).get();
        if (!subSnap.exists) {
            return res.status(404).json({ success: false, error: "해당 실행 이력(submission)을 찾을 수 없습니다." });
        }
        const subDoc = subSnap.data();
        // 3. 권한 매핑 검증
        // operator: 무조건 허용
        // company_admin: submission.clientId === user.clientId 이면 허용
        // user: submission.uid === uid 이면 허용
        let isAllowed = false;
        if (userRole === "operator") {
            isAllowed = true;
        }
        else if (userRole === "company_admin") {
            if (subDoc.clientId === userClientId) {
                isAllowed = true;
            }
        }
        else if (userRole === "user") {
            if (subDoc.uid === uid) {
                isAllowed = true;
            }
        }
        if (!isAllowed) {
            return res.status(403).json({ success: false, error: "해당 파일에 대한 접근 권한이 없습니다." });
        }
        // 4. refType에 따른 ref 획득
        let targetRef = null;
        if (refType === "original") {
            const refs = subDoc.originalFileRefs || [];
            if (idx >= 0 && idx < refs.length) {
                targetRef = refs[idx];
            }
        }
        else if (refType === "result") {
            const refs = subDoc.resultRefs || [];
            if (idx >= 0 && idx < refs.length) {
                targetRef = refs[idx];
            }
        }
        if (!targetRef || !targetRef.storagePath) {
            return res.status(404).json({ success: false, error: "지정한 인덱스에 해당하는 파일 정보를 찾을 수 없습니다." });
        }
        const { storagePath, fileName, mimeType } = targetRef;
        // 5. Firebase Storage 파일 검증 및 스트리밍 다운로드
        const bucket = (0, firebase_1.getAdminStorage)().bucket();
        const file = bucket.file(storagePath);
        const [exists] = await file.exists();
        if (!exists) {
            return res.status(404).json({ success: false, error: "실제 저장소(Storage) 내 파일이 존재하지 않습니다." });
        }
        // 파일명 인코딩 보완 (헤더 인코딩 깨짐 방지 RFC 5987 호환)
        const encodedFileName = encodeURIComponent(fileName).replace(/['()]/g, escape).replace(/\*/g, "%2A");
        res.setHeader("Content-Type", mimeType || "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodedFileName}`);
        const readStream = file.createReadStream();
        readStream.on("error", (streamErr) => {
            console.error("[download] 파일 스트림 읽기 실패:", streamErr);
            if (!res.headersSent) {
                res.status(500).json({ success: false, error: "파일 전송 중 서버 오류가 발생했습니다." });
            }
        });
        readStream.pipe(res);
    }
    catch (error) {
        console.error("[download] 처리 중 예외 발생:", error);
        return res.status(500).json({ success: false, error: error.message || "파일 다운로드 실패" });
    }
});
// 4. GET /api/translate (무료 구글 번역기 프록시 API)
app.get("/api/translate", async (req, res) => {
    const text = req.query.q;
    if (!text || typeof text !== "string") {
        return res.status(400).json({ success: false, error: "번역할 텍스트('q')가 누락되었습니다." });
    }
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=${encodeURIComponent(text)}`;
        const response = await axios_1.default.get(url, {
            timeout: 5000,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        });
        if (response.data && response.data[0] && response.data[0][0] && response.data[0][0][0]) {
            const translatedText = response.data[0][0][0];
            return res.status(200).json({ success: true, translatedText });
        }
        else {
            throw new Error("구글 번역기 응답 포맷이 올바르지 않습니다.");
        }
    }
    catch (err) {
        console.error("[translate] 번역 중 오류:", err.message);
        return res.status(500).json({ success: false, error: err.message || "번역에 실패했습니다." });
    }
});
// 서버 가동
app.listen(port, () => {
    console.log(`[n8lient-gateway] 서버가 포트 ${port}에서 정상 기동 중입니다.`);
});
