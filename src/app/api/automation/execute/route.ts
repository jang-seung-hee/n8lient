// 서버리스 API 게이트웨이: Firebase ID Token 검증 → Firestore 확인 → n8n Webhook 전송
// 환경변수: N8N_SERVER_{KEY}_BASE_URL, N8N_SERVER_{KEY}_TOKEN, N8N_WEBHOOK_PATH_{ID}

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebaseAdmin";
import { validateExecution } from "@/common/validation/validateExecution";

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
    if (!autoDoc.enabled) {
      return NextResponse.json({ success: false, error: "비활성화된 자동화입니다." }, { status: 400 });
    }
    if (autoDoc.configStatus !== "configured") {
      return NextResponse.json({ success: false, error: "설정이 완료되지 않은 자동화입니다." }, { status: 400 });
    }

    const workflowKey: string = autoDoc.workflowKey;
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

    // ── 5.5. 실행 제목 및 데이터 검증 ──────────────────
    const titleProvided = typeof input.title === "string" && input.title.trim() !== "";
    const titleSource = input.titleSource || (titleProvided ? "user" : "empty");
    let finalTitle = titleProvided ? input.title.trim() : undefined;

    // ── 5.6. 공통 validation 헬퍼 구동 ──────────────────
    const validationResult = validateExecution({
      automationId,
      input: {
        title: finalTitle,
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

    if (!validationResult.isValid) {
      const dateStr = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
      const randomStr = Math.random().toString(36).substring(2, 8);
      const errRequestId = `req_err_${dateStr}_${randomStr}`;

      return NextResponse.json(
        {
          success: false,
          code: "EXECUTION_VALIDATION_FAILED",
          error: "실행에 필요한 입력값이 부족합니다.",
          source: "api_route_execution_validation",
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
        },
        { status: 400 }
      );
    }

    const resolvedInputType = validationResult.received.providedInputTypes[0] || "unknown";

    // 내부 시스템 관리 및 정렬용 submissionTitle 별도 생성
    const nowFormatted = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false })
      .replace(/\. /g, "-").replace(/\./g, "").slice(0, 16);
    const workflowName = templateDoc.name || workflowKey;
    const submissionTitle = finalTitle || `[${workflowName}] ${nowFormatted} 실행`;

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
      input: {
        title: finalTitle || null,
        submissionTitle,
        titleProvided,
        titleSource,
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
      });
    } else {
      // 실패: status → failed, error 저장
      await db.collection("submissions").doc(submissionId).update({
        status: "failed",
        "error.code": n8nError!.code,
        "error.message": n8nError!.message,
        updatedAt,
        completedAt: updatedAt,
      });
      console.error(`[execute] n8n 호출 실패 — ${n8nError!.code}: ${n8nError!.message}`);

      return NextResponse.json(
        {
          success: false,
          submissionId,
          error: "자동화 실행 요청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주십시오.",
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
