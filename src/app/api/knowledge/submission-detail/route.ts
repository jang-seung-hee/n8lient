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

    // 6. 정책 조회 우선순위 (clientAutomation -> workflowTemplate -> false)
    let ownerCanChangeAccess = false;
    let adminCanChangeAccess = true; // 기본값 true로 설정
    const automationId = submissionData.automationId;
    const workflowKey = submissionData.workflowKey;

    if (automationId) {
      const autoSnap = await db.collection("clientAutomations").doc(automationId).get();
      if (autoSnap.exists) {
        const autoData = autoSnap.data();
        if (autoData?.resultAccessPolicy?.ownerCanChangeAccess !== undefined) {
          ownerCanChangeAccess = autoData.resultAccessPolicy.ownerCanChangeAccess;
        }
        if (autoData?.resultAccessPolicy?.adminCanChangeAccess !== undefined) {
          adminCanChangeAccess = autoData.resultAccessPolicy.adminCanChangeAccess;
        }
      }
    }

    if (workflowKey) {
      const templateSnap = await db.collection("workflowTemplates").doc(workflowKey).get();
      if (templateSnap.exists) {
        const templateData = templateSnap.data();
        if (autoDocPolicyCheckMissing(automationId)) {
          // 자동화 문서가 없거나 결과 정책이 누락된 경우만 템플릿 상속
          if (templateData?.resultAccessPolicy?.ownerCanChangeAccess !== undefined && !ownerCanChangeAccess) {
            ownerCanChangeAccess = templateData.resultAccessPolicy.ownerCanChangeAccess;
          }
        }
        // adminCanChangeAccess의 템플릿 상속 조건 (기존 자동화 레벨에 명시적 설정이 없을 때만)
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

    // 헬퍼: 자동화 설정 내 access 정책 누락 여부
    function autoDocPolicyCheckMissing(autoId: string) {
      if (!autoId) return true;
      return false; // useEffect 계열 상속을 통해 안전 기본값이라도 항상 저장되므로 폴백 제어 가능
    }

    // 7. 서버 최종 변경 권한 canChangeAccessMode 계산 (작성자 본인이고, 정책상 허용될 때)
    const isOwner = (submissionData.uid && submissionData.uid === uid) || 
                    (submissionData.ownerUserId && submissionData.ownerUserId === uid);
    const canChangeAccessMode = Boolean(isOwner && ownerCanChangeAccess);

    // 8. 관리자 공개철회 권한 canAdminRevokeCompanyAccess 계산
    const isCompanyAdmin = userDoc.role === "company_admin";
    const isOperator = userDoc.role === "operator";
    const isCurrentModeCompany = submissionData.accessMode === "company";
    const isClientMatching = userDoc.clientId && submissionData.clientId && userDoc.clientId === submissionData.clientId;

    const canAdminRevokeCompanyAccess = Boolean(
      (isOperator || (isCompanyAdmin && isClientMatching)) &&
      isCurrentModeCompany &&
      adminCanChangeAccess
    );

    return NextResponse.json({
      success: true,
      submission: {
        ...submissionData,
        submissionId // 안전 보장용 매핑
      },
      canChangeAccessMode,
      canAdminRevokeCompanyAccess
    });

  } catch (error: any) {
    console.error("[submission-detail-api-error] 상세 조회 중 내부 오류 발생:", error);
    return NextResponse.json({ success: false, error: "상세 데이터를 가져오는 중 서버 오류가 발생했습니다." }, { status: 500 });
  }
}
