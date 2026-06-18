// 파일/이미지/음성 실행 요청 준비 API: ID Token 및 설정 병합 검증 후 일회성 uploadToken 발급
import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebaseAdmin";
import crypto from "crypto";
import { validateExecution } from "@/common/validation/validateExecution";
import { buildExecutionTitleContract } from "@/common/execution/buildTitleContract";

function getWebhookConfig(serverKey: string, webhookSecretId: string): { url: string } | null {
  const serverEnvKey = serverKey.toUpperCase().replace(/-/g, "_");
  const webhookEnvKey = webhookSecretId.toUpperCase().replace(/-/g, "_");
  const baseUrl = process.env[`N8N_SERVER_${serverEnvKey}_BASE_URL`];
  const path = process.env[`N8N_WEBHOOK_PATH_${webhookEnvKey}`];

  if (!baseUrl || !path) {
    console.warn(`[prepare-upload] 환경변수 미설정: serverKey=${serverKey}, webhookSecretId=${webhookSecretId}`);
    return null;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl.replace(/\/$/, "")}${normalizedPath}`;
  return { url };
}

export async function POST(req: NextRequest) {
  try {
    // 1. Firebase ID Token 검증
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "인증 토큰이 없습니다." }, { status: 401 });
    }

    const idToken = authHeader.replace("Bearer ", "");
    let decodedToken;
    try {
      decodedToken = await getAdminAuth().verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ success: false, error: "유효하지 않은 인증 토큰입니다." }, { status: 401 });
    }

    const uid = decodedToken.uid;
    const db = getAdminFirestore();

    // 2. 요청 body 파싱
    const body = await req.json();
    const { automationId, input } = body;
    if (!automationId || !input) {
      return NextResponse.json({ success: false, error: "필수 파라미터(automationId, input)가 누락되었습니다." }, { status: 400 });
    }

    // 3. 사용자 승인 상태 및 clientId 검증
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ success: false, error: "사용자 정보를 찾을 수 없습니다." }, { status: 404 });
    }
    const userDoc = userSnap.data()!;
    if (userDoc.approvalStatus !== "approved") {
      return NextResponse.json({ success: false, error: "승인된 사용자만 실행 요청이 가능합니다." }, { status: 403 });
    }
    const clientId: string = userDoc.clientId;

    // 4. clientAutomations/{automationId} 검증
    const autoSnap = await db.collection("clientAutomations").doc(automationId).get();
    if (!autoSnap.exists) {
      return NextResponse.json({ success: false, error: "자동화 설정을 찾을 수 없습니다." }, { status: 404 });
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

    // 4.5. userAutomationSettings 조회 및 병합
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
      }
    }
    const fallbackKeys = Object.keys(finalSettings).filter((k) => !mergedKeys.includes(k));
    const settingsMergeSummary = { hasUserSetting, mergedKeys, fallbackKeys };

    // 5. workflowTemplates 조회 및 Webhook Config 획득
    const templateSnap = await db.collection("workflowTemplates").doc(workflowKey).get();
    if (!templateSnap.exists) {
      return NextResponse.json({ success: false, error: "자동화 명세를 찾을 수 없습니다." }, { status: 404 });
    }
    const templateDoc = templateSnap.data()!;
    const n8nServerKey: string = templateDoc.n8nServerKey || "main";
    const webhookSecretId: string = templateDoc.webhookSecretId || workflowKey;

    const webhookConfig = getWebhookConfig(n8nServerKey, webhookSecretId);
    if (!webhookConfig) {
      return NextResponse.json({ success: false, error: "n8n Webhook 연동 정보가 설정되지 않았습니다." }, { status: 500 });
    }

    // 파일 메타데이터 정보 정제 및 validation 적용
    const firstFile = input.files?.[0];
    const fileMetadata = firstFile ? {
      fileName: firstFile.fileName || firstFile.name || null,
      mimeType: firstFile.mimeType || firstFile.type || null,
      sizeBytes: firstFile.sizeBytes || firstFile.size || null,
      inputType: firstFile.inputType || firstFile.type || "file"
    } : null;

    const fileList = fileMetadata ? [{
      name: fileMetadata.fileName || undefined,
      size: fileMetadata.sizeBytes || undefined,
      type: fileMetadata.mimeType || undefined
    }] : [];

    const workflowName = templateDoc.name || workflowKey;
    const titleContract = buildExecutionTitleContract({
      inputTitle: input.title,
      titleProvided: input.titleProvided,
      titleSource: input.titleSource,
      workflowName,
    });

    const validationResult = validateExecution({
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
      return NextResponse.json({
        success: false,
        code: "EXECUTION_VALIDATION_FAILED",
        error: "실행에 필요한 입력값이 부족합니다.",
        source: "api_prepare_upload_validation",
        missingFields: validationResult.missingFields,
        received: {
          hasAutomationId: validationResult.received.hasAutomationId,
          hasTitle: validationResult.received.hasTitle,
          hasText: validationResult.received.hasText,
          fileCount: validationResult.received.fileCount,
          providedInputTypes: validationResult.received.providedInputTypes
        }
      }, { status: 400 });
    }

    // 6. submission 생성 (status: queued로 사전 등록)
    const now = new Date();
    const dateStr = now.toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
    const randomStr = Math.random().toString(36).substring(2, 8);
    const submissionId = `sub_${dateStr}_${randomStr}`;

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
        fileUrl: null,
        fileName: fileMetadata?.fileName || null,
        mimeType: fileMetadata?.mimeType || null,
        sizeBytes: fileMetadata?.sizeBytes || null,
        inputType: fileMetadata?.inputType || null,
      },
      result: { resultUrl: null, summary: null },
      error: { code: null, message: null },
      retryOf: null,
      settingsMergeSummary,
      templateStatusAtExecution: templateDoc.status === "draft" ? "draft" : "published",
      isTestExecution: templateDoc.status === "draft",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      completedAt: null,
    };
    await db.collection("submissions").doc(submissionId).set(submissionData);

    // 7. 1회성 uploadToken 발급 및 세션 생성
    const uploadToken = crypto.randomUUID();
    const tokenHash = crypto.createHash("sha256").update(uploadToken).digest("hex");

    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5분 뒤 만료
    const maxUploadMB = process.env.MAX_DIRECT_UPLOAD_MB || process.env.MAX_UPLOAD_MB || "10";
    const maxUploadBytes = parseInt(maxUploadMB, 10) * 1024 * 1024;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:3000";
    const n8nPayload = {
      submissionId,
      clientId,
      uid,
      workflowKey,
      automationId,
      settings: finalSettings,
      input: submissionData.input,
      requestedAt: now.toISOString(),
      callbackUrl: `${baseUrl}/api/automation/callback`,
    };

    const sessionData = {
      submissionId,
      uid,
      clientId,
      automationId,
      workflowKey,
      tokenHash,
      expiresAt,
      maxUploadBytes,
      status: "prepared",
      n8nPayload,
      createdAt: now.toISOString(),
      verifiedAt: null,
    };
    await db.collection("uploadSessions").doc(submissionId).set(sessionData);

    return NextResponse.json({
      success: true,
      submissionId,
      uploadToken, // 원문은 딱 한 번만 반환
      n8nUploadUrl: webhookConfig.url, // 공통 n8n 토큰이 미포함된 순수 Webhook URL
      expiresAt,
      maxUploadBytes
    });

  } catch (error: any) {
    console.error("[prepare-upload] 내부 서버 오류:", error);
    return NextResponse.json({ success: false, error: "업로드 준비 중 서버 내부 오류가 발생했습니다." }, { status: 500 });
  }
}
