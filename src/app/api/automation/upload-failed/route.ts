// 직접 업로드 실패 예외 처리 API: n8n 전송 중단/실패 시 상태 갱신 (queued 대기 방지)
// TODO: 사용자가 업로드 도중 브라우저 탭을 강제 종료하거나 네트워크가 완전히 단절된 경우
// API 호출 자체가 무산되므로, 차후 만료 세션(5분 초과)을 청소하는 크론 배치 스케줄러로 정리할 예정입니다.
import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebaseAdmin";

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
    const { submissionId } = body;
    if (!submissionId) {
      return NextResponse.json({ success: false, error: "submissionId가 누락되었습니다." }, { status: 400 });
    }

    // 3. uploadSessions/{submissionId} 조회 및 소유권 확인
    const sessionRef = db.collection("uploadSessions").doc(submissionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      return NextResponse.json({ success: false, error: "유효한 업로드 세션을 찾을 수 없습니다." }, { status: 404 });
    }

    const sessionData = sessionSnap.data()!;
    if (sessionData.uid !== uid) {
      return NextResponse.json({ success: false, error: "접근 권한이 없는 세션입니다." }, { status: 403 });
    }

    // 4. status가 prepared인 경우에만 실패 처리 적용
    if (sessionData.status === "prepared") {
      const now = new Date().toISOString();

      await db.runTransaction(async (transaction) => {
        // 세션 상태 변경
        transaction.update(sessionRef, {
          status: "failed",
          updatedAt: now
        });

        // submission 상태 변경 및 에러 마킹
        const submissionRef = db.collection("submissions").doc(submissionId);
        transaction.update(submissionRef, {
          status: "failed",
          error: {
            code: "UPLOAD_FAILED",
            message: "파일 업로드가 완료되지 않았습니다."
          },
          updatedAt: now,
          completedAt: now
        });
      });

      console.log(`[upload-failed] 업로드 실패 예외 처리 완료: submissionId=${submissionId}`);
      return NextResponse.json({ success: true, message: "업로드 실패 상태 갱신이 완료되었습니다." });
    }

    return NextResponse.json({ success: true, message: "이미 처리가 완료되었거나 진행 중인 세션입니다." });

  } catch (error: any) {
    console.error("[upload-failed] 내부 서버 오류:", error);
    return NextResponse.json({ success: false, error: "실패 처리 중 서버 내부 오류가 발생했습니다." }, { status: 500 });
  }
}
