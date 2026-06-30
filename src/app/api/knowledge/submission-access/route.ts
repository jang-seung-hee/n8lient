// [route.ts]
// 이 파일은 특정 submission의 결과 공개범위(accessMode: private | company)를 변경하는 API Route입니다.
// 보안 규정: 클라이언트 데이터를 신뢰하지 않고, 서버 단에서 소유자 검증 및 정책 검증을 7단계로 철저히 수행합니다.
// 한국어 주석 표준을 준수합니다.

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    // 1. Firebase ID Token 검증 (1단계)
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

    // Body 파라미터 파싱
    const body = await req.json().catch(() => ({}));
    const { submissionId, accessMode } = body;

    if (!submissionId) {
      return NextResponse.json({ success: false, error: "submissionId 파라미터가 누락되었습니다." }, { status: 400 });
    }

    // 7. accessMode 값 enum 검증 (7단계)
    if (accessMode !== "private" && accessMode !== "company") {
      return NextResponse.json({ success: false, error: "유효하지 않은 공개범위 값입니다." }, { status: 400 });
    }

    // 2. 사용자 승인 상태 및 정보 조회 (2단계)
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ success: false, error: "사용자 정보를 찾을 수 없습니다." }, { status: 404 });
    }
    const userDoc = userSnap.data()!;
    if (userDoc.approvalStatus !== "approved") {
      return NextResponse.json({ success: false, error: "승인된 사용자만 접근이 가능합니다." }, { status: 403 });
    }

    // 3. submission 존재 확인 (3단계)
    const submissionRef = db.collection("submissions").doc(submissionId);
    const submissionSnap = await submissionRef.get();
    if (!submissionSnap.exists) {
      return NextResponse.json({ success: false, error: "존재하지 않는 실행 기록입니다." }, { status: 404 });
    }
    const submissionData = submissionSnap.data()!;

    // 4. submission.clientId와 사용자 clientId 일치 확인 (4단계)
    const userClientId = userDoc.clientId || null;
    const submissionClientId = submissionData.clientId || null;
    if (!userClientId || !submissionClientId || userClientId !== submissionClientId) {
      return NextResponse.json({ success: false, error: "해당 결과 데이터에 접근할 권한이 없습니다. (회사 불일치)" }, { status: 403 });
    }

    // 5. 작성자 본인 확인 (5단계)
    const isOwner = (submissionData.uid && submissionData.uid === uid) || 
                    (submissionData.ownerUserId && submissionData.ownerUserId === uid);
    if (!isOwner) {
      return NextResponse.json({ success: false, error: "작성자 본인만 공개범위를 변경할 수 있습니다." }, { status: 403 });
    }

    // 6. resultAccessPolicy.ownerCanChangeAccess === true 정책 검증 (6단계)
    let ownerCanChangeAccess = false;
    const automationId = submissionData.automationId;
    const workflowKey = submissionData.workflowKey;

    if (automationId) {
      const autoSnap = await db.collection("clientAutomations").doc(automationId).get();
      if (autoSnap.exists) {
        const autoData = autoSnap.data();
        if (autoData?.resultAccessPolicy?.ownerCanChangeAccess !== undefined) {
          ownerCanChangeAccess = autoData.resultAccessPolicy.ownerCanChangeAccess;
        }
      }
    }

    if (!ownerCanChangeAccess && workflowKey) {
      const templateSnap = await db.collection("workflowTemplates").doc(workflowKey).get();
      if (templateSnap.exists) {
        const templateData = templateSnap.data();
        if (templateData?.resultAccessPolicy?.ownerCanChangeAccess !== undefined) {
          ownerCanChangeAccess = templateData.resultAccessPolicy.ownerCanChangeAccess;
        }
      }
    }

    if (!ownerCanChangeAccess) {
      return NextResponse.json({ success: false, error: "이 워크플로우는 소유자의 공개범위 변경이 비활성화되어 있습니다." }, { status: 403 });
    }

    // 모든 보안 검증 통과 — knowledgeSearchIndex 동기화 대상 조회
    const indexSnap = await db.collection("knowledgeSearchIndex")
      .where("submissionId", "==", submissionId)
      .get();

    const auditFields = {
      accessMode,
      accessModeUpdatedAt: new Date().toISOString(),
      accessModeUpdatedBy: uid,
    };

    if (indexSnap.empty) {
      // 인덱스 문서가 없는 경우: submissions만 업데이트하고 경고 로그
      console.warn(`[submission-access] knowledgeSearchIndex 문서 없음 (submissionId: ${submissionId}). submissions만 업데이트합니다.`);
      await submissionRef.update(auditFields);
    } else {
      // 인덱스 문서가 존재하는 경우: batch로 원자적 동시 갱신 (보안 불일치 방지)
      const batch = db.batch();
      batch.update(submissionRef, auditFields);
      indexSnap.docs.forEach((indexDoc) => {
        batch.update(indexDoc.ref, {
          accessMode,
          accessModeUpdatedAt: auditFields.accessModeUpdatedAt,
          accessModeUpdatedBy: uid,
        });
      });
      await batch.commit();
      console.info(`[submission-access] submissions + knowledgeSearchIndex ${indexSnap.size}건 동기화 완료 (submissionId: ${submissionId}, accessMode: ${accessMode})`);
    }

    return NextResponse.json({
      success: true,
      accessMode
    });

  } catch (error: any) {
    console.error("[submission-access-api-error] 공개범위 변경 중 내부 오류 발생:", error);
    return NextResponse.json({ success: false, error: "공개범위를 변경하는 중 서버 오류가 발생했습니다." }, { status: 500 });
  }
}

