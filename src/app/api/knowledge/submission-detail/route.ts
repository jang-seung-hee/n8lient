// [route.ts]
// 이 파일은 특정 submissionId를 전달받아 현재 사용자가 해당 실행 결과 데이터에 접근할 수 있는 권한이 있는지
// 검증한 후 안전하게 Submission 전체 객체를 조회하여 반환하는 API Route입니다.
// 보안 규정: 프론트엔드의 직접 Firestore 조회를 방해하고 서버단에서 canReadSubmissionResult 헬퍼를 활용해
// 철저하게 비공개(private) 자료가 타인에게 유출되는 것을 차단합니다.
// 한국어 주석 표준을 준수합니다.

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebaseAdmin";
import { canReadSubmissionResult } from "@/common/validation/validateResultAccess";

export async function GET(req: NextRequest) {
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

    // 2. Query String 에서 submissionId 추출
    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get("submissionId");

    if (!submissionId) {
      return NextResponse.json({ success: false, error: "submissionId 파라미터가 누락되었습니다." }, { status: 400 });
    }

    // 3. 사용자 승인 상태 및 정보 조회
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ success: false, error: "사용자 정보를 찾을 수 없습니다." }, { status: 404 });
    }
    const userDoc = userSnap.data()!;
    if (userDoc.approvalStatus !== "approved") {
      return NextResponse.json({ success: false, error: "승인된 사용자만 접근이 가능합니다." }, { status: 403 });
    }

    // 4. submissions/{submissionId} 조회
    const submissionRef = db.collection("submissions").doc(submissionId);
    const submissionSnap = await submissionRef.get();
    if (!submissionSnap.exists) {
      return NextResponse.json({ success: false, error: "존재하지 않는 실행 기록입니다." }, { status: 404 });
    }

    const submissionData = submissionSnap.data()!;

    // 5. 권한 검증 구동 (canReadSubmissionResult 활용)
    const isAllowed = canReadSubmissionResult({
      user: {
        uid: uid,
        clientId: userDoc.clientId || null,
        role: userDoc.role || null
      },
      submission: {
        uid: submissionData.uid || null,
        ownerUserId: submissionData.ownerUserId || null,
        clientId: submissionData.clientId || null,
        accessMode: submissionData.accessMode || null
      }
    });

    // operator 역할의 경우 마스터 관리자이므로 강제 허용 처리 보완
    const hasAccess = isAllowed || userDoc.role === "operator";

    if (!hasAccess) {
      return NextResponse.json({ success: false, error: "해당 결과 데이터에 대한 접근 권한이 없습니다." }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      submission: {
        ...submissionData,
        submissionId // 안전 보장용 매핑
      }
    });

  } catch (error: any) {
    console.error("[submission-detail-api-error] 상세 조회 중 내부 오류 발생:", error);
    return NextResponse.json({ success: false, error: "상세 데이터를 가져오는 중 서버 오류가 발생했습니다." }, { status: 500 });
  }
}
