// 서버리스 API 게이트웨이: Firebase ID Token 검증 → Firestore 확인 → n8n Webhook 전송
// 환경변수: N8N_SERVER_{KEY}_BASE_URL, N8N_SERVER_{KEY}_TOKEN, N8N_WEBHOOK_PATH_{ID}
//
// 보관 정책(retentionPolicy) 계산 SSOT는 n8lient-gateway /api/automation/execute 입니다.
// 사용자 실행(/user/execute)은 Gateway를 사용합니다. 본 route는 retention clamp 없이 settings를 n8n에 전달할 수 있어 레거시 경로로 취급합니다.

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebaseAdmin";
import { validateExecution } from "@/common/validation/validateExecution";
import { buildExecutionTitleContract } from "@/common/execution/buildTitleContract";
import { DEFAULT_RETENTION_POLICY } from "@/types/n8lient";

// 안내 모달용 completionNotice 조립 헬퍼 함수
function buildCompletionNotice(
  finalSettings: Record<string, any>,
  templateDoc: any,
  autoDoc: any
) {
  // 1. 이메일 주소 탐색
  let email: string | null = null;
  const emailKeys = ["reportEmailTo", "resultEmailTo", "emailTo", "reportEmail", "email", "accountantEmail"];
  for (const key of emailKeys) {
    const val = finalSettings[key];
    if (typeof val === "string" && val.trim() !== "") {
      email = val.trim();
      break;
    }
  }

  // fallback A: configSchema에서 type === "email"인 key 룩업
  if (!email && templateDoc.configSchema) {
    const emailFieldByType = templateDoc.configSchema.find((f: any) => f.type === "email");
    if (emailFieldByType) {
      const val = finalSettings[emailFieldByType.key];
      if (typeof val === "string" && val.trim() !== "") {
        email = val.trim();
      }
    }
  }

  // fallback B: configSchema에서 label에 "이메일" 포함된 field.key 룩업
  if (!email && templateDoc.configSchema) {
    const emailFieldByLabel = (templateDoc.configSchema as any[]).find(
      (f) => typeof f.label === "string" && f.label.includes("이메일") && !emailKeys.includes(f.key)
    );
    if (emailFieldByLabel) {
      const val = finalSettings[emailFieldByLabel.key];
      if (typeof val === "string" && val.trim() !== "") {
        email = val.trim();
      }
    }
  }

  // [진단] 이메일 추출 전수 로그 (development only)
  if (process.env.NODE_ENV === "development") {
    console.debug("[buildCompletionNotice-email-diagnosis]", {
      emailKeysChecked: emailKeys.map(k => ({ key: k, value: finalSettings[k] })),
      configSchemaFields: (templateDoc.configSchema || []).map((f: any) => ({ key: f.key, type: f.type, label: f.label, valueInSettings: finalSettings[f.key] })),
      resolvedEmail: email,
    });
  }

  const emailConfigured = email !== null && email !== "";

  // 2. 보관 정책 및 구글 드라이브 여부 판정
  const policy = autoDoc.retentionPolicy || DEFAULT_RETENTION_POLICY;
  const level = policy?.level || "full_archive";
  
  // emailWillSend 판정
  const emailEnabled = policy?.emailEnabled !== false;
  const emailWillSend = emailConfigured && emailEnabled;

  const isGoogleDriveEnabled =
    policy?.optionalExportProvider === "google_drive" ||
    finalSettings["googleDriveEnabled"] === true ||
    finalSettings["optionalExportProvider"] === "google_drive" ||
    (policy?.optionalExport?.enabled === true && policy?.optionalExport?.provider === "google_drive");

  let message = "";
  if (emailWillSend) {
    let messageText = "";
    if (level === "notify_only") {
      messageText = `"${email}"으로 결과가 전송될 예정입니다.`;
    } else if (level === "processed_result") {
      messageText = `"${email}"으로 결과가 전송되고, 데이터베이스에도 저장될 예정입니다.`;
    } else if (level === "full_archive") {
      if (isGoogleDriveEnabled) {
        messageText = `"${email}"으로 결과가 전송되고, 데이터베이스와 스토리지 그리고 구글 드라이브에 저장될 예정입니다.`;
      } else {
        messageText = `"${email}"으로 결과가 전송되고, 데이터베이스와 스토리지에 파일까지 저장될 예정입니다.`;
      }
    } else {
      messageText = `"${email}"으로 결과가 전송될 예정입니다.`;
    }
    message = `실행 요청이 완료되었습니다.\n${messageText}\n\n워크플로우 처리가 성공하면 설정된 결과보고 방식에 따라 결과가 전달됩니다.\n단, 워크플로우 실패 시에는 결과 화면에서만 확인할 수 있습니다.`;
  } else if (emailConfigured && !emailEnabled) {
    message = `실행 요청이 완료되었습니다.\n결과보고 이메일 주소는 설정되어 있으나, 현재 이메일 전송 정책이 비활성화되어 있습니다.\n처리 결과는 결과 화면에서 확인해 주세요.\n\n단, 워크플로우 실패 시에는 결과 화면에서만 확인할 수 있습니다.`;
  } else {
    // 이메일 주소 자체가 없음
    message = `실행 요청이 완료되었습니다.\n결과보고 이메일이 설정되어 있지 않아, 처리 결과는 결과 화면에서 확인해 주세요.\n\n단, 워크플로우 실패 시에는 결과 화면에서만 확인할 수 있습니다.`;
  }

  const debugInfo = process.env.NODE_ENV === "development"
    ? {
        finalSettingsKeys: Object.keys(finalSettings ?? {}),
        emailCandidates: emailKeys.map(k => `${k}: ${finalSettings[k]}`),
        resolvedEmail: email,
        emailConfigured,
        emailWillSend,
        retentionLevel: level,
        optionalExportProvider: policy?.optionalExportProvider || finalSettings["optionalExportProvider"] || null,
      }
    : undefined;

  if (process.env.NODE_ENV === "development") {
    console.debug("[execute-completion-notice]", debugInfo);
  }

  return {
    title: "실행 요청 완료",
    emailConfigured,
    emailWillSend,
    emailTo: email,
    retentionLevel: level,
    databaseEnabled: level !== "notify_only",
    storageEnabled: level === "full_archive",
    googleDriveEnabled: isGoogleDriveEnabled,
    message,
    ...(debugInfo ? { debugCompletionNotice: debugInfo } : {}),
  };
}

// n8n Webhook URL/Token 조회 헬퍼 (Base URL + Path 조합)
function getWebhookConfig(
  serverKey: string,
  webhookSecretId: string
): { url: string; token: string | null } | null {
  const serverEnvKey = serverKey.toUpperCase().replace(/-/g, "_");
  const webhookEnvKey = webhookSecretId.toUpperCase().replace(/-/g, "_");

  const baseUrl = process.env[`N8N_SERVER_${serverEnvKey}_BASE_URL`];
  const token = process.env[`N8N_SERVER_${serverEnvKey}_TOKEN`] || null;
  const path = process.env[`N8N_WEBHOOK_PATH_${webhookEnvKey}`];

  if (!baseUrl) {
    console.warn(`[execute] Base URL 미설정: N8N_SERVER_${serverEnvKey}_BASE_URL`);
    return null;
  }

  if (!path) {
    console.warn(`[execute] Webhook Path 미설정: N8N_WEBHOOK_PATH_${webhookEnvKey}`);
    return null;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl.replace(/\/$/, "")}${normalizedPath}`;

  return { url, token };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/automation/execute
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let submissionId: string | null = null;

  try {
    // ── 1. Firebase ID Token 검증 ──────────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "인증 토큰이 없습니다. 로그인 후 다시 시도해 주십시오." },
        { status: 401 }
      );
    }

    const idToken = authHeader.replace("Bearer ", "");
    let decodedToken;

    try {
      const adminAuth = getAdminAuth();
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json(
        { success: false, error: "유효하지 않은 인증 토큰입니다. 다시 로그인해 주십시오." },
        { status: 401 }
      );
    }

    const uid = decodedToken.uid;
    const db = getAdminFirestore();

    // ── 2. 요청 body 및 파일 파싱 ─────────────────────────────────────────
    const contentType = req.headers.get("content-type") || "";
    let body;
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const payloadStr = formData.get("payload") as string;
      if (!payloadStr) {
        return NextResponse.json(
          { success: false, error: "payload 필드가 누락되었습니다." },
          { status: 400 }
        );
      }
      body = JSON.parse(payloadStr);
      file = formData.get("file_0") as File;
    } else {
      body = await req.json();
    }

    const { automationId, input } = body;

    if (!automationId || !input) {
      return NextResponse.json(
        { success: false, error: "automationId 또는 입력 데이터(input)가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 파일 업로드 용량 제한 검증 (기본 4MB)
    if (file) {
      const maxUploadMB = process.env.MAX_UPLOAD_MB ? parseInt(process.env.MAX_UPLOAD_MB, 10) : 4;
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxUploadMB) {
        return NextResponse.json(
          { success: false, error: `파일 크기가 제한 용량(${maxUploadMB}MB)을 초과했습니다.` },
          { status: 413 }
        );
      }
    }

    // ── 3. users/{uid} 조회 및 approved 상태 확인 ─────────────────────────
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json(
        { success: false, error: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const userDoc = userSnap.data()!;
    if (userDoc.approvalStatus !== "approved") {
      return NextResponse.json({ success: false, error: "승인된 사용자만 자동화를 실행할 수 있습니다." }, { status: 403 });
    }

    const clientId: string = userDoc.clientId;

    // ── 4. clientAutomations/{automationId} 유효성 검증 ──────────────────
    const autoSnap = await db.collection("clientAutomations").doc(automationId).get();
    if (!autoSnap.exists) {
      return NextResponse.json({ success: false, error: "요청한 자동화 설정을 찾을 수 없습니다." }, { status: 404 });
    }

    const autoDoc = autoSnap.data()!;
    if (autoDoc.clientId !== clientId) {
      return NextResponse.json({ success: false, error: "접근 권한이 없는 자동화입니다." }, { status: 403 });
    }

    const workflowKey: string = autoDoc.workflowKey;
    const contractSnap = await db
      .collection("clientContracts")
      .doc(`${clientId}_${workflowKey}`)
      .get();
    const contractDoc = contractSnap.exists ? contractSnap.data() : null;
    if (
      !contractDoc ||
      contractDoc.enabled !== true ||
      contractDoc.contractStatus !== "active"
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "CONTRACT_NOT_ACTIVE",
          error: "현재 사용할 수 없는 워크플로우 계약입니다.",
        },
        { status: 403 }
      );
    }

    if (autoDoc.companyDisabled === true) {
      return NextResponse.json(
        {
          success: false,
          code: "CLIENT_AUTOMATION_COMPANY_DISABLED",
          error: "회사 관리자에 의해 사용이 중지된 워크플로우입니다.",
        },
        { status: 403 }
      );
    }
    if (!autoDoc.enabled) {
      return NextResponse.json({ success: false, error: "비활성화된 자동화입니다." }, { status: 400 });
    }
    if (autoDoc.configStatus !== "configured") {
      return NextResponse.json({ success: false, error: "설정이 완료되지 않은 자동화입니다." }, { status: 400 });
    }

    const companySettings: Record<string, any> = autoDoc.settings || {};

    // ── 4.5. userAutomationSettings/{uid}_{automationId} 조회 및 병합 ──────
    const finalSettings = { ...companySettings };
    const userSettingId = `${uid}_${automationId}`;
    const userSettingSnap = await db.collection("userAutomationSettings").doc(userSettingId).get();

    let hasUserSetting = false;
    const mergedKeys: string[] = [];

    if (userSettingSnap.exists) {
      const userSettingDoc = userSettingSnap.data()!;
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
      } else {
        console.warn(`[execute] 개인 설정 검증 실패: ${userSettingId}. 회사 설정을 사용합니다.`);
      }
    }

    const fallbackKeys = Object.keys(finalSettings).filter((k) => !mergedKeys.includes(k));
    const settingsMergeSummary = { hasUserSetting, mergedKeys, fallbackKeys };

    if (process.env.NODE_ENV === "development") {
      console.debug("[execute-final-settings-email-value]", {
        userId: uid,
        clientId,
        workflowKey,
        finalSettingsReportEmailTo: finalSettings?.reportEmailTo,
        finalSettingsResultEmailTo: finalSettings?.resultEmailTo,
        finalSettingsEmailTo: finalSettings?.emailTo,
        finalSettingsReportEmail: finalSettings?.reportEmail,
        finalSettingsEmail: finalSettings?.email,
        finalSettingsAccountantEmail: finalSettings?.accountantEmail,
        finalSettingsEmailEnabled: finalSettings?.emailEnabled,
        finalSettingsKeys: Object.keys(finalSettings ?? {}),
        // 병합 요약
        hasUserSetting,
        mergedKeys,
      });
    }

    // ── 5. workflowTemplates/{workflowKey} 조회 (Webhook 참조값 확인) ────
    const templateSnap = await db.collection("workflowTemplates").doc(workflowKey).get();
    if (!templateSnap.exists) {
      return NextResponse.json(
        { success: false, error: "자동화 명세서를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const templateDoc = templateSnap.data()!;
    // n8nServerKey 기본값: "main"
    const n8nServerKey: string = templateDoc.n8nServerKey || "main";
    const webhookSecretId: string = templateDoc.webhookSecretId || workflowKey;

    // ── 5.5. 실행 제목 계약 정규화 ──────────────────
    const workflowName = templateDoc.name || workflowKey;
    const titleContract = buildExecutionTitleContract({
      inputTitle: input.title,
      titleProvided: input.titleProvided,
      titleSource: input.titleSource,
      workflowName,
    });

    // ── 5.6. 공통 validation 헬퍼 구동 ──────────────────
    const validationResult = validateExecution({
      automationId,
      input: {
        title: titleContract.title,
        text: input.text || undefined,
        inputType: input.inputType || undefined
      },
      files: file ? [{
        name: file.name,
        size: file.size,
        type: file.type
      }] : [],
      inputSchema: templateDoc.inputSchema || {},
      configSchema: templateDoc.configSchema || [],
      settings: finalSettings
    });

    const isDebug = req.nextUrl.searchParams.get("debug") === "1";
    if (isDebug) {
      console.log("=== [DEBUG] /api/automation/execute ===");
      console.log("- automationId 존재 여부:", Boolean(automationId));
      console.log("- input 존재 여부:", Boolean(input));
      console.log("- input.title 존재 여부:", typeof input?.title === "string" ? Boolean(input.title.trim()) : false);
      console.log("- input.titleProvided:", titleContract.titleProvided);
      console.log("- input.titleSource:", titleContract.titleSource);
      console.log("- input.submissionTitle:", titleContract.submissionTitle);
      console.log("- workflowTemplate.inputSchema.titleRequired:", templateDoc.inputSchema?.titleRequired);
      console.log("- workflowTemplate.inputSchema.requiredInputMode:", templateDoc.inputSchema?.requiredInputMode);
      console.log("- workflowTemplate.inputSchema.requiredInputTypes:", templateDoc.inputSchema?.requiredInputTypes);
      console.log("- received.providedInputTypes:", validationResult.received.providedInputTypes);
      console.log("========================================");
    }

    if (!validationResult.isValid) {
      const dateStr = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
      const randomStr = Math.random().toString(36).substring(2, 8);
      const errRequestId = `req_err_${dateStr}_${randomStr}`;

      const errorPayload: any = {
        success: false,
        code: "EXECUTION_VALIDATION_FAILED",
        error: "실행에 필요한 입력값이 부족합니다.",
        source: "api_route_execution_validation",
        errorDetails: {
          phase: "API_ROUTE_VALIDATE",
          source: "api_route",
          httpStatus: 400,
          occurredAt: new Date().toISOString(),
          hint: "입력값 또는 설정값이 워크플로우 schema와 맞지 않습니다.",
        },
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
      };

      if (isDebug) {
        errorPayload.debugInfo = {
          automationIdExists: Boolean(automationId),
          inputExists: Boolean(input),
          titleExists: typeof input?.title === "string" ? Boolean(input.title.trim()) : false,
          titleProvided: titleContract.titleProvided,
          titleSource: titleContract.titleSource,
          submissionTitle: titleContract.submissionTitle,
          titleRequired: templateDoc.inputSchema?.titleRequired,
          requiredInputMode: templateDoc.inputSchema?.requiredInputMode,
          requiredInputTypes: templateDoc.inputSchema?.requiredInputTypes,
          providedInputTypes: validationResult.received.providedInputTypes
        };
      }

      return NextResponse.json(errorPayload, { status: 400 });
    }

    const resolvedInputType = validationResult.received.providedInputTypes[0] || "unknown";

    // ── 6. 환경변수에서 Webhook URL 조회 (서버 공통 Base URL + 자동화별 Path) ────
    const webhookConfig = getWebhookConfig(n8nServerKey, webhookSecretId);

    // ── 7. submissions 문서 생성 (status: queued) ─────────────────────────
    const now = new Date();
    const dateStr = now.toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
    const randomStr = Math.random().toString(36).substring(2, 8);
    submissionId = `sub_${dateStr}_${randomStr}`;

    const submissionData = {
      submissionId,
      clientId,
      uid,
      workflowKey,
      automationId,
      status: "queued",
      displayTitle: titleContract.displayTitle,
      input: {
        title: titleContract.title,
        submissionTitle: titleContract.submissionTitle,
        titleProvided: titleContract.titleProvided,
        titleSource: titleContract.titleSource,
        text: input.text || null,
        fileUrl: input.fileUrl || null,
        fileName: file ? file.name : (input.fileName || null),
        mimeType: file ? (file.type || "application/octet-stream") : (input.mimeType || null),
        sizeBytes: file ? file.size : (input.sizeBytes || null),
        inputType: resolvedInputType,
      },
      result: {
        resultUrl: null,
        summary: null,
      },
      error: {
        code: null,
        message: null,
      },
      retryOf: null,
      settingsMergeSummary,
      templateStatusAtExecution: templateDoc.status === "draft" ? "draft" : "published",
      isTestExecution: templateDoc.status === "draft",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      completedAt: null,
    };

    await db.collection("submissions").doc(submissionId).set(submissionData);
    console.log(`[execute] submissions 문서 생성 완료: ${submissionId}`);

    // ── 8. Webhook 환경변수 미설정 시 processing 없이 queued 유지 ─────────
    if (!webhookConfig) {
      console.warn(`[execute] Webhook 미설정 — submissionId=${submissionId}, workflowKey=${workflowKey}. n8n 호출을 건너뜁니다.`);
      return NextResponse.json({
        success: true,
        submissionId,
        message: "실행 요청이 접수되었습니다. (n8n Webhook 미설정 — queued 상태 유지)",
        completionNotice: buildCompletionNotice(finalSettings, templateDoc, autoDoc),
      });
    }

    // ── 9. n8n Webhook 전송 ───────────────────────────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:3000";

    // n8n 전달용 input 구성 (하위 호환 필드 보정)
    const n8nInput = {
      ...submissionData.input,
      files: file ? [
        {
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          inputType: input.files?.[0]?.inputType || "file"
        }
      ] : undefined
    };

    const n8nPayload = {
      submissionId,
      clientId,
      uid,
      workflowKey,
      automationId,
      settings: finalSettings,
      input: n8nInput,
      requestedAt: now.toISOString(),
      callbackUrl: `${baseUrl}/api/automation/callback`,
    };

    let n8nSuccess = false;
    let n8nError: { code: string; message: string } | null = null;

    try {
      const requestHeaders: Record<string, string> = {};
      if (webhookConfig.token) {
        requestHeaders["X-N8N-TOKEN"] = webhookConfig.token;
      }

      let requestBody: any;
      if (file) {
        // 파일이 있는 경우 multipart/form-data 전송
        const n8nFormData = new FormData();
        n8nFormData.append("payload", JSON.stringify(n8nPayload));
        n8nFormData.append("file_0", file);
        requestBody = n8nFormData;
      } else {
        // 파일이 없는 경우 application/json 전송
        requestHeaders["Content-Type"] = "application/json";
        requestBody = JSON.stringify(n8nPayload);
      }

      const n8nRes = await fetch(webhookConfig.url, {
        method: "POST",
        headers: requestHeaders,
        body: requestBody,
        signal: AbortSignal.timeout(15000), // 15초 타임아웃
      });

      if (n8nRes.ok) {
        n8nSuccess = true;
      } else {
        const errorBody = await n8nRes.text().catch(() => "");
        n8nError = {
          code: "N8N_HTTP_ERROR",
          message: `n8n 응답 오류 (${n8nRes.status}): ${errorBody}`,
        };
      }
    } catch (fetchErr: any) {
      n8nError = {
        code: "N8N_CONNECTION_FAILED",
        message: fetchErr.message || "n8n Webhook 연결에 실패했습니다.",
      };
    }

    // ── 10. n8n 호출 결과에 따른 submissions 상태 업데이트 ────────────────
    const updatedAt = new Date().toISOString();

    if (n8nSuccess) {
      // 성공: status → processing
      await db.collection("submissions").doc(submissionId).update({
        status: "processing",
        updatedAt,
      });
      console.log(`[execute] n8n 호출 성공 — status: processing (${submissionId})`);

      return NextResponse.json({
        success: true,
        submissionId,
        message: "자동화 실행이 시작되었습니다. 결과는 실행 결과 탭에서 확인하실 수 있습니다.",
        completionNotice: buildCompletionNotice(finalSettings, templateDoc, autoDoc),
      });
    } else {
      // 실패: status → failed, error 저장
      const errorDetails = {
        phase: "API_ROUTE_GATEWAY_CALL",
        source: "api_route",
        httpStatus: n8nError!.code === "N8N_HTTP_ERROR" ? 502 : 500,
        occurredAt: updatedAt,
        n8nServerKey,
        n8nWebhookPath: templateDoc.webhookSecretId || workflowKey,
        hint: "Gateway 호출 또는 실행 요청 전달 단계에서 실패했습니다.",
      };

      await db.collection("submissions").doc(submissionId).update({
        status: "failed",
        "error.code": n8nError!.code,
        "error.message": n8nError!.message,
        errorDetails,
        updatedAt,
        completedAt: updatedAt,
      });
      console.error(`[execute] n8n 호출 실패 — ${n8nError!.code}: ${n8nError!.message}`);

      return NextResponse.json(
        {
          success: false,
          submissionId,
          error: "자동화 실행 요청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주십시오.",
          errorDetails,
        },
        { status: 502 }
      );
    }
  } catch (error: any) {
    console.error("[execute] 내부 서버 오류:", error);

    // submissions가 이미 생성된 경우 failed로 업데이트
    if (submissionId) {
      try {
        const db = getAdminFirestore();
        await db.collection("submissions").doc(submissionId).update({
          status: "failed",
          "error.code": "INTERNAL_SERVER_ERROR",
          "error.message": error.message || "서버 내부 오류",
          updatedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        });
      } catch {
        // 상태 업데이트 실패는 무시 (로그만 기록)
      }
    }

    return NextResponse.json(
      { success: false, error: "서버 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
