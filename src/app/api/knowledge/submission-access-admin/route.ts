// [route.ts]
// 이 파일은 회사 관리자가 회사 공개 자료(company)를 개인 보관(private)으로 강제 철회하는 API Route입니다.
// 보안 규정: 클라이언트 데이터를 신뢰하지 않고, 서버 단에서 소유 관리자 검증 및 정책 검증을 9단계로 수행합니다.
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

    // 8. 요청 accessMode는 "private"만 허용 (8단계 - 관리자 강제 공개 차단)
    if (accessMode !== "private") {
      return NextResponse.json({ success: false, error: "관리자는 자료를 개인 보관(private)으로 철회하는 작업만 수행할 수 있습니다." }, { status: 400 });
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

    // 3. role 검증 (3단계 - 관리자/운영자만 통과)
    const isCompanyAdmin = userDoc.role === "company_admin";
    const isOperator = userDoc.role === "operator";
    if (!isCompanyAdmin && !isOperator) {
      return NextResponse.json({ success: false, error: "회사 관리자 또는 시스템 운영자 권한이 필요합니다." }, { status: 403 });
    }

    // 4. submission 존재 확인 (4단계)
    const submissionRef = db.collection("submissions").doc(submissionId);
    const submissionSnap = await submissionRef.get();
    if (!submissionSnap.exists) {
      return NextResponse.json({ success: false, error: "존재하지 않는 실행 기록입니다." }, { status: 404 });
    }
    const submissionData = submissionSnap.data()!;

    // 5. operator가 아닌 경우 clientId 일치 확인 (5단계)
    if (!isOperator) {
      const userClientId = userDoc.clientId || null;
      const submissionClientId = submissionData.clientId || null;
      if (!userClientId || !submissionClientId || userClientId !== submissionClientId) {
        return NextResponse.json({ success: false, error: "해당 결과 데이터에 접근할 권한이 없습니다. (회사 불일치)" }, { status: 403 });
      }
    }

    // 6. 현재 accessMode === "company" 인지 확인 (6단계 - 이미 private인 경우 철회 무의미)
    if (submissionData.accessMode !== "company") {
      return NextResponse.json({ success: false, error: "회사 공개 자료만 철회할 수 있습니다." }, { status: 400 });
    }

    // 7. adminCanChangeAccess 정책 재검증 (7단계)
    let adminCanChangeAccess = true;
    const automationId = submissionData.automationId;
    const workflowKey = submissionData.workflowKey;

    if (automationId) {
      const autoSnap = await db.collection("clientAutomations").doc(automationId).get();
      if (autoSnap.exists) {
        const autoData = autoSnap.data();
        if (autoData?.resultAccessPolicy?.adminCanChangeAccess !== undefined) {
          adminCanChangeAccess = autoData.resultAccessPolicy.adminCanChangeAccess;
        }
      }
    }

    if (workflowKey) {
      const templateSnap = await db.collection("workflowTemplates").doc(workflowKey).get();
      if (templateSnap.exists) {
        const templateData = templateSnap.data();
        // 기존 자동화 설정 레벨에 명시적 정책 설정이 없을 때만 템플릿 상속
        if (automationId) {
          const autoSnap = await db.collection("clientAutomations").doc(automationId).get();
          const autoData = autoSnap.data();
          if (autoData?.resultAccessPolicy?.adminCanChangeAccess === undefined) {
            if (templateData?.resultAccessPolicy?.adminCanChangeAccess !== undefined) {
              adminCanChangeAccess = templateData.resultAccessPolicy.adminCanChangeAccess;
            }
          }
        } else {
          if (templateData?.resultAccessPolicy?.adminCanChangeAccess !== undefined) {
            adminCanChangeAccess = templateData.resultAccessPolicy.adminCanChangeAccess;
          }
        }
      }
    }

    if (!adminCanChangeAccess) {
      return NextResponse.json({ success: false, error: "이 자동화는 관리자의 공개 철회 기능이 비활성화되어 있습니다." }, { status: 403 });
    }

    // 9. 모든 검증 통과 시 Firestore batch를 사용해 submissions + knowledgeSearchIndex 동시 업데이트 (9단계)
    const indexSnap = await db.collection("knowledgeSearchIndex")
      .where("submissionId", "==", submissionId)
      .get();

    const auditFields = {
      accessMode: "private",
      accessModeUpdatedAt: new Date().toISOString(),
      accessModeUpdatedBy: uid,
      accessModeUpdatedByRole: userDoc.role,
      accessModeUpdatedReason: "admin_revoke_company_access"
    };

    const batch = db.batch();
    batch.update(submissionRef, auditFields);

    if (!indexSnap.empty) {
      indexSnap.docs.forEach((indexDoc) => {
        batch.update(indexDoc.ref, {
          accessMode: "private",
          accessModeUpdatedAt: auditFields.accessModeUpdatedAt,
          accessModeUpdatedBy: uid,
        });
      });
    }

    await batch.commit();
    console.info(`[submission-access-admin] 관리자 공개철회 완료 (submissionId: ${submissionId}, by: ${uid}, role: ${userDoc.role})`);

    return NextResponse.json({
      success: true,
      accessMode: "private"
    });

  } catch (error: any) {
    console.error("[submission-access-admin-error] 공개 철회 중 서버 오류 발생:", error);
    return NextResponse.json({ success: false, error: "공개 철회 처리 중 서버 오류가 발생했습니다." }, { status: 500 });
  }
}
