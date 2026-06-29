// 이 파일은 n8n이 자동화 실행 완료 후 결과를 엔팔라이언트 서버에 전달하기 위한 콜백 API입니다.
// 브라우저에서 직접 호출하는 용도가 아닙니다.
// n8n 워크플로우의 HTTP Request 노드에서만 호출되어야 합니다.
//
// 보안: N8N_CALLBACK_SECRET 환경변수와 일치하는 Authorization 헤더가 있어야만 처리합니다.
// 환경변수: N8N_CALLBACK_SECRET

import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebaseAdmin";
import { resolveDisplayTitleAfterCallback } from "@/common/execution/buildTitleContract";
import type { ProcessorResult } from "@/types/n8lient";

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

  const { submissionId, status, result, error, processorResult, resultRefs } = body;

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
  const policy = existingData.retentionPolicySnapshot || {
    level: "full_archive",
    storeProcessorResult: true,
    storeOriginalFiles: true,
  };
  const level = policy.level || "full_archive";

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
    updateData["result.summary"] = result?.summary || null;
    updateData["result.resultUrl"] = result?.resultUrl || null;
    updateData["error.code"] = null;
    updateData["error.message"] = null;

    const typedProcessorResult = processorResult as ProcessorResult | null | undefined;
    if (level === "full_archive") {
      if (typedProcessorResult !== undefined && typedProcessorResult !== null) {
        updateData.processorResult = typedProcessorResult;
      }
      if (Array.isArray(resultRefs) && resultRefs.length > 0) {
        updateData.resultRefs = resultRefs;
      }
    } else if (level === "processed_result") {
      if (typedProcessorResult !== undefined && typedProcessorResult !== null) {
        updateData.processorResult = typedProcessorResult;
      }
      updateData.resultRefs = [];
    } else if (level === "notify_only") {
      updateData.processorResult = null;
      updateData.resultRefs = [];
    }

    const resolvedDisplayTitle = resolveDisplayTitleAfterCallback({
      processorResultTitle: typedProcessorResult?.title,
      existingDisplayTitle: existingData.displayTitle,
      submissionTitle: existingData.input?.submissionTitle,
    });
    if (resolvedDisplayTitle) {
      updateData.displayTitle = resolvedDisplayTitle;
    }
  } else {
    // 실패: error 필드 업데이트
    updateData["error.code"] = error?.code || "N8N_EXECUTION_FAILED";
    updateData["error.message"] = error?.message || "n8n 처리 실패";
    updateData["result.summary"] = null;
    updateData["result.resultUrl"] = null;

    // v2.8 errorDetails 추가
    updateData.errorDetails = {
      phase: error?.phase || "N8N_WORKFLOW",
      source: "n8n",
      httpStatus: error?.httpStatus,
      occurredAt: now,
      n8nExecutionId: body.n8nExecutionId || null,
      hint: error?.hint || "n8n 워크플로우 내부 실패입니다. n8n 실행 로그에서 실패 노드를 확인하세요.",
    };
  }

  await submissionRef.update(updateData);

  // [v1.0] knowledgeSearchIndex 생성 (Best-Effort)
  if (status === "success") {
    try {
      const { shouldIndexSubmission, buildKnowledgeSearchIndexDocRaw } = require("@/common/knowledge/knowledgeSearchIndex");
      const fullDocSnapForIndex = await submissionRef.get();
      if (fullDocSnapForIndex.exists) {
        const submissionDataForIndex = fullDocSnapForIndex.data();
        if (submissionDataForIndex && shouldIndexSubmission(submissionDataForIndex)) {
          // lookup 템플릿 정보 (workflowName 용도)
          const templateSnapForIndex = await db.collection("workflowTemplates").doc(submissionDataForIndex.workflowKey).get();
          const templateDataForIndex = templateSnapForIndex.exists ? templateSnapForIndex.data() : null;
          const workflowName = templateDataForIndex?.name || submissionDataForIndex.workflowKey;

          // lookup 사용자 정보 (ownerName, ownerEmail 용도)
          const userSnapForIndex = await db.collection("users").doc(submissionDataForIndex.uid).get();
          const userDataForIndex = userSnapForIndex.exists ? userSnapForIndex.data() : null;
          const ownerName = userDataForIndex?.displayName || "";
          const ownerEmail = userDataForIndex?.email || "";

          const rawIndexDoc = buildKnowledgeSearchIndexDocRaw(
            submissionDataForIndex,
            ownerName,
            ownerEmail,
            workflowName
          );

          // 시간 문자열 필드를 Firestore Timestamp 형태로 변환
          const admin = require("firebase-admin");
          const indexDoc = {
            ...rawIndexDoc,
            createdAt: admin.firestore.Timestamp.fromDate(new Date(rawIndexDoc.createdAt)),
            completedAt: rawIndexDoc.completedAt ? admin.firestore.Timestamp.fromDate(new Date(rawIndexDoc.completedAt)) : null,
            updatedAt: admin.firestore.Timestamp.fromDate(new Date(rawIndexDoc.updatedAt)),
          };

          await db.collection("knowledgeSearchIndex").doc(submissionId).set(indexDoc);
          console.log(`[callback] Next.js knowledgeSearchIndex 생성 완료. submissionId=${submissionId}`);
        }
      }
    } catch (indexErr: any) {
      console.warn(`[callback-index-error] Next.js knowledgeSearchIndex 생성 중 오류 발생(무시됨):`, indexErr.message);
    }
  }

  console.log(`[callback] submissions 상태 업데이트 완료: ${submissionId} → ${status}`);

  return NextResponse.json({
    success: true,
    message: `실행 결과가 성공적으로 기록되었습니다. (status: ${status})`,
  });
}
