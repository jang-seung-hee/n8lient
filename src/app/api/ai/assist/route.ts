// AI Assist 호출을 수신하는 Next.js Route Handler입니다.
// Firebase ID Token을 받아 운영자(Operator) 권한을 지녔는지 확인하며,
// 민감 정보 제거(sanitize)를 수행한 뒤 안전하게 Gemini API를 호출합니다.
// 한국어 주석 표준을 준수합니다.

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebaseAdmin";
import { sanitizeAiContext } from "@/features/aiAssist/sanitizeAiContext";
import { callGemini } from "@/features/aiAssist/server/callGemini";
import type { AiAssistRequest } from "@/features/aiAssist/aiAssistTypes";

export async function POST(req: NextRequest) {
  try {
    // 1. Firebase ID Token 인증 및 오퍼레이터 권한 검증
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, errorCode: "UNAUTHORIZED", message: "인증 토큰이 누락되었습니다." },
        { status: 401 }
      );
    }

    const idToken = authHeader.replace("Bearer ", "");
    let decodedToken;
    try {
      decodedToken = await getAdminAuth().verifyIdToken(idToken);
    } catch (err) {
      return NextResponse.json(
        { ok: false, errorCode: "UNAUTHORIZED", message: "유효하지 않은 인증 토큰입니다." },
        { status: 401 }
      );
    }

    const uid = decodedToken.uid;
    const db = getAdminFirestore();

    // 사용자 정보 및 오퍼레이터 역할 확인
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json(
        { ok: false, errorCode: "USER_NOT_FOUND", message: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const userDoc = userSnap.data()!;
    if (userDoc.role !== "operator") {
      return NextResponse.json(
        { ok: false, errorCode: "FORBIDDEN", message: "이 기능을 사용할 권한이 없습니다. (운영자 전용)" },
        { status: 403 }
      );
    }

    // 2. 요청 Body 파싱 및 유효성 검증
    let body: AiAssistRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, errorCode: "BAD_REQUEST", message: "요청 바디가 올바른 JSON 형식이 아닙니다." },
        { status: 400 }
      );
    }

    const { purpose, instruction, context, outputFormat } = body;
    if (!purpose || !instruction || !context) {
      return NextResponse.json(
        { ok: false, errorCode: "BAD_REQUEST", message: "필수 파라미터(purpose, instruction, context)가 누락되었습니다." },
        { status: 400 }
      );
    }

    const allowedPurposes = ["workflow_template_copy", "config_field_copy", "general_text_assist"];
    if (!allowedPurposes.includes(purpose)) {
      return NextResponse.json(
        { ok: false, errorCode: "BAD_REQUEST", message: "지원하지 않는 AI Assist purpose 목적입니다." },
        { status: 400 }
      );
    }

    // 3. GEMINI_API_KEY 서버 설정 여부 확인 (미설정 시 LOCKED 정상 응답)
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json({
        ok: false,
        locked: true,
        errorCode: "AI_ASSIST_LOCKED",
        message: "AI API 키 값이 등록되어 있지 않아 AI 지원 기능은 잠겨 있습니다. 현재는 기본 분석 방식으로 권장값을 제안합니다.",
        warnings: ["GEMINI_API_KEY가 서버 환경변수에 설정되어 있지 않습니다."]
      });
    }

    // 4. 컨텍스트 내 민감정보 사전 제거 및 마스킹
    const { sanitizedContext, warnings: sanitizeWarnings } = sanitizeAiContext(context);

    // 5. callGemini 서비스 모듈 호출
    const aiResponse = await callGemini({
      purpose,
      instruction,
      context: sanitizedContext,
      outputFormat,
    });

    // 6. 마스킹 관련 보안 경고 및 API 경고 병합
    const mergedWarnings = [
      ...(sanitizeWarnings || []),
      ...(aiResponse.warnings || []),
    ];

    return NextResponse.json({
      ...aiResponse,
      warnings: mergedWarnings,
    });

  } catch (error: any) {
    console.error("[AI Assist API Route Error]:", error);
    return NextResponse.json(
      { ok: false, errorCode: "INTERNAL_SERVER_ERROR", message: "서버 처리 도중 내부 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
