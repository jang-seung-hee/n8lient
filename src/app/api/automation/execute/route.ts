// 이 파일은 사용자의 자동화 실행 요청을 처리하는 서버리스 API 게이트웨이입니다.
// 브라우저에서 n8n Webhook을 직접 호출하는 것을 완전히 차단하며,
// 서버 측에서 Firebase ID Token 검증 → Firestore 유효성 확인 → n8n Webhook 전송 순으로 처리합니다.
//
// 환경변수 구조 (서버 전용, NEXT_PUBLIC_ 접두사 사용 금지):
//   FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY
//
//   n8n 서버 공통 (serverKey 기반):
//     N8N_SERVER_{SERVER_KEY}_BASE_URL  예: N8N_SERVER_MAIN_BASE_URL
//     N8N_SERVER_{SERVER_KEY}_TOKEN     예: N8N_SERVER_MAIN_TOKEN
//
//   n8n 자동화별 Path (webhookSecretId 기반):
//     N8N_WEBHOOK_PATH_{WEBHOOK_SECRET_ID}  예: N8N_WEBHOOK_PATH_EXPENSE_REPORT
//
//   최종 호출 URL = baseUrl + path

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebaseAdmin";

// ─────────────────────────────────────────────────────────────────────────────
// n8n Webhook URL/Token 조회 헬퍼 (새 구조)
//
// 조합 방식:
//   serverKey   → N8N_SERVER_{SERVER_KEY}_BASE_URL, N8N_SERVER_{SERVER_KEY}_TOKEN
//   webhookSecretId → N8N_WEBHOOK_PATH_{WEBHOOK_SECRET_ID}
//   최종 URL = baseUrl + path
//
// 예시:
//   n8nServerKey=main, webhookSecretId=expense-report
//   → N8N_SERVER_MAIN_BASE_URL + N8N_WEBHOOK_PATH_EXPENSE_REPORT
//   → https://n8n.rentaltalk.kr + /webhook/expense-report
// ─────────────────────────────────────────────────────────────────────────────
function getWebhookConfig(
  serverKey: string,
  webhookSecretId: string
): { url: string; token: string | null } | null {
  // 환경변수 suffix 변환: 소문자·하이픈 → 대문자·언더스코어
  // 예: "main" → "MAIN", "expense-report" → "EXPENSE_REPORT"
  const serverEnvKey = serverKey.toUpperCase().replace(/-/g, "_");
  const webhookEnvKey = webhookSecretId.toUpperCase().replace(/-/g, "_");

  const baseUrl = process.env[`N8N_SERVER_${serverEnvKey}_BASE_URL`];
  const token = process.env[`N8N_SERVER_${serverEnvKey}_TOKEN`] || null;
  const path = process.env[`N8N_WEBHOOK_PATH_${webhookEnvKey}`];

  if (!baseUrl) {
    console.warn(
      `[execute] n8n 서버 Base URL 환경변수 미설정: N8N_SERVER_${serverEnvKey}_BASE_URL`
    );
    return null;
  }

  if (!path) {
    console.warn(
      `[execute] n8n Webhook Path 환경변수 미설정: N8N_WEBHOOK_PATH_${webhookEnvKey}`
    );
    return null;
  }

  // Path 앞에 슬래시가 없으면 보정
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

    // ── 2. 요청 body 파싱 ─────────────────────────────────────────────────
    const body = await req.json();
    const { automationId, input } = body;

    if (!automationId || !input || !input.title) {
      return NextResponse.json(
        { success: false, error: "automationId 또는 입력 데이터(input.title)가 누락되었습니다." },
        { status: 400 }
      );
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
      return NextResponse.json(
        { success: false, error: "승인된 사용자만 자동화를 실행할 수 있습니다." },
        { status: 403 }
      );
    }

    const clientId: string = userDoc.clientId;

    // ── 4. clientAutomations/{automationId} 유효성 검증 ──────────────────
    const autoSnap = await db.collection("clientAutomations").doc(automationId).get();
    if (!autoSnap.exists) {
      return NextResponse.json(
        { success: false, error: "요청한 자동화 설정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const autoDoc = autoSnap.data()!;

    // clientId 불일치 차단 (타인 자동화 실행 방지)
    if (autoDoc.clientId !== clientId) {
      return NextResponse.json(
        { success: false, error: "접근 권한이 없는 자동화입니다." },
        { status: 403 }
      );
    }

    // 활성화 및 설정 완료 여부 확인
    if (!autoDoc.enabled) {
      return NextResponse.json(
        { success: false, error: "비활성화된 자동화입니다." },
        { status: 400 }
      );
    }

    if (autoDoc.configStatus !== "configured") {
      return NextResponse.json(
        { success: false, error: "설정이 완료되지 않은 자동화입니다. 관리자에게 문의해 주십시오." },
        { status: 400 }
      );
    }

    const workflowKey: string = autoDoc.workflowKey;
    const settings: Record<string, any> = autoDoc.settings || {};

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
        title: input.title,
        text: input.text || null,
        fileUrl: input.fileUrl || null,
        fileName: input.fileName || null,
        mimeType: input.mimeType || null,
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
    // settings에는 Secret, Token, Webhook URL을 포함하지 않음
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:3000";
    const n8nPayload = {
      submissionId,
      clientId,
      uid,
      workflowKey,
      automationId,
      settings,
      input: submissionData.input,
      requestedAt: now.toISOString(),
      callbackUrl: `${baseUrl}/api/automation/callback`,
    };

    let n8nSuccess = false;
    let n8nError: { code: string; message: string } | null = null;

    try {
      // n8n 호출 헤더 구성
      // X-N8N-TOKEN 헤더 사용 — n8n Webhook 노드에서 검증 시 해당 헤더를 확인해야 함
      // Token이 없으면 헤더를 포함하지 않음 (테스트 환경 Authentication: None 대응)
      const requestHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (webhookConfig.token) {
        requestHeaders["X-N8N-TOKEN"] = webhookConfig.token;
      }

      const n8nRes = await fetch(webhookConfig.url, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(n8nPayload),
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
