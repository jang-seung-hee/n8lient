// 이 파일은 n8n이 자동화 실행 완료 후 결과를 엔팔라이언트 서버에 전달하기 위한 콜백 API입니다.
// 브라우저에서 직접 호출하는 용도가 아닙니다.
// n8n 워크플로우의 HTTP Request 노드에서만 호출되어야 합니다.
//
// 보안: N8N_CALLBACK_SECRET 환경변수와 일치하는 Authorization 헤더가 있어야만 처리합니다.
// 환경변수: N8N_CALLBACK_SECRET

import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebaseAdmin";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/automation/callback
// n8n → 엔팔라이언트 서버 전용 콜백 엔드포인트
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── 1. Callback Secret 검증 ───────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const callbackSecret = process.env.N8N_CALLBACK_SECRET;

  if (!callbackSecret) {
    // 환경변수가 설정되지 않은 경우 서버 구성 오류 처리
    console.error("[callback] N8N_CALLBACK_SECRET 환경변수가 설정되지 않았습니다.");
    return NextResponse.json(
      { success: false, error: "서버 구성 오류입니다." },
      { status: 500 }
    );
  }

  if (!authHeader || authHeader !== `Bearer ${callbackSecret}`) {
    console.warn("[callback] 콜백 Secret 불일치 — 무단 접근 차단");
    return NextResponse.json(
      { success: false, error: "인증에 실패했습니다." },
      { status: 401 }
    );
  }

  // ── 2. 콜백 payload 파싱 ─────────────────────────────────────────────────
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "요청 데이터 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const { submissionId, status, result, error } = body;

  // ── 3. 필수 파라미터 검증 ─────────────────────────────────────────────────
  if (!submissionId) {
    return NextResponse.json(
      { success: false, error: "submissionId가 누락되었습니다." },
      { status: 400 }
    );
  }

  // status는 success 또는 failed만 허용
  if (status !== "success" && status !== "failed") {
    return NextResponse.json(
      { success: false, error: "status는 'success' 또는 'failed'만 허용됩니다." },
      { status: 400 }
    );
  }

  // ── 4. submissions/{submissionId} 존재 확인 ───────────────────────────────
  const db = getAdminFirestore();
  const submissionRef = db.collection("submissions").doc(submissionId);
  const submissionSnap = await submissionRef.get();

  if (!submissionSnap.exists) {
    console.warn(`[callback] 존재하지 않는 submissionId: ${submissionId}`);
    return NextResponse.json(
      { success: false, error: "존재하지 않는 실행 요청입니다." },
      { status: 404 }
    );
  }

  const existingData = submissionSnap.data()!;

  // 이미 처리 완료된 경우 중복 업데이트 방지
  if (existingData.status === "success" || existingData.status === "failed") {
    console.warn(`[callback] 이미 처리 완료된 submission: ${submissionId} (현재 상태: ${existingData.status})`);
    return NextResponse.json({
      success: true,
      message: "이미 처리가 완료된 실행 요청입니다.",
    });
  }

  // ── 5. submissions 상태 업데이트 ─────────────────────────────────────────
  const now = new Date().toISOString();

  const updateData: Record<string, any> = {
    status,
    updatedAt: now,
    completedAt: now,
  };

  if (status === "success") {
    // 성공: result 필드 업데이트
    updateData["result.summary"] = result?.summary || null;
    updateData["result.resultUrl"] = result?.resultUrl || null;
    updateData["error.code"] = null;
    updateData["error.message"] = null;
  } else {
    // 실패: error 필드 업데이트
    updateData["error.code"] = error?.code || "N8N_EXECUTION_FAILED";
    updateData["error.message"] = error?.message || "n8n 처리 실패";
    updateData["result.summary"] = null;
    updateData["result.resultUrl"] = null;
  }

  await submissionRef.update(updateData);

  console.log(`[callback] submissions 상태 업데이트 완료: ${submissionId} → ${status}`);

  return NextResponse.json({
    success: true,
    message: `실행 결과가 성공적으로 기록되었습니다. (status: ${status})`,
  });
}
