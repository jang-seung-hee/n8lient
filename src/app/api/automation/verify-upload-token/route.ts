// n8n Webhook 서버 전용 업로드 토큰 검증 API: 1회성 토큰을 검증하고 병합된 payload를 반환
import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebaseAdmin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { submissionId, uploadToken } = body;

    if (!submissionId || !uploadToken) {
      return NextResponse.json({ valid: false, error: "submissionId 또는 uploadToken이 누락되었습니다." }, { status: 400 });
    }

    const db = getAdminFirestore();
    const sessionRef = db.collection("uploadSessions").doc(submissionId);
    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists) {
      return NextResponse.json({ valid: false, error: "유효한 업로드 세션을 찾을 수 없습니다." }, { status: 404 });
    }

    const sessionData = sessionSnap.data()!;

    // 1. 만료 시간 검증
    const now = new Date();
    const expiresAt = new Date(sessionData.expiresAt);
    if (now > expiresAt) {
      return NextResponse.json({ valid: false, error: "업로드 토큰이 만료되었습니다. (유효시간 5분)" }, { status: 400 });
    }

    // 2. 사용 상태 검증 (1회성 검증 방어)
    if (sessionData.status !== "prepared") {
      return NextResponse.json({ valid: false, error: "이미 검증되었거나 사용된 토큰입니다." }, { status: 400 });
    }

    // 3. 토큰 해시 비교 검증
    const requestHash = crypto.createHash("sha256").update(uploadToken).digest("hex");
    if (requestHash !== sessionData.tokenHash) {
      return NextResponse.json({ valid: false, error: "올바르지 않은 업로드 토큰입니다." }, { status: 401 });
    }

    // 4. 검증 완료 처리 (세션 및 제출 상태 업데이트)
    const verifiedAt = now.toISOString();
    await db.runTransaction(async (transaction) => {
      // 세션 상태 변경
      transaction.update(sessionRef, {
        status: "verified",
        verifiedAt,
      });

      // submission 상태 변경 (status: processing)
      const submissionRef = db.collection("submissions").doc(submissionId);
      transaction.update(submissionRef, {
        status: "processing",
        updatedAt: verifiedAt,
      });
    });

    console.log(`[verify-upload-token] 토큰 검증 성공 및 상태 업데이트 완료: ${submissionId}`);

    // 5. 검증 성공 및 canonical payload 반환
    return NextResponse.json({
      valid: true,
      payload: sessionData.n8nPayload
    });

  } catch (error: any) {
    console.error("[verify-upload-token] 내부 서버 오류:", error);
    return NextResponse.json({ valid: false, error: "토큰 검증 처리 중 내부 오류가 발생했습니다." }, { status: 500 });
  }
}
