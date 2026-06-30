// [route.ts]
// 이 파일은 회사 관리자가 여러 공개 자료를 선택하여 일괄 공개 철회(private 전환)하는 bulk API Route입니다.
// 보안 규정: 최대 100건 제한, 단방향 철회 강제, 관리 권한 및 clientId 일치를 서버 단에서 재검증합니다.
// 한국어 주석 표준을 준수합니다.

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

    // 2. 사용자 승인 상태 및 권한 조회
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ success: false, error: "사용자 정보를 찾을 수 없습니다." }, { status: 404 });
    }
    const userDoc = userSnap.data()!;
    if (userDoc.approvalStatus !== "approved") {
      return NextResponse.json({ success: false, error: "승인된 사용자만 접근이 가능합니다." }, { status: 403 });
    }

    const isCompanyAdmin = userDoc.role === "company_admin";
    const isOperator = userDoc.role === "operator";

    if (!isCompanyAdmin && !isOperator) {
      return NextResponse.json({ success: false, error: "회사 관리자 또는 시스템 운영자 권한이 필요합니다." }, { status: 403 });
    }

    const userClientId = userDoc.clientId || null;

    // Body 파라미터 파싱
    const body = await req.json().catch(() => ({}));
    const { submissionIds } = body;

    if (!submissionIds || !Array.isArray(submissionIds)) {
      return NextResponse.json({ success: false, error: "submissionIds 리스트 파라미터가 유효하지 않습니다." }, { status: 400 });
    }

    // 1회 최대 처리 제한 100건 검증
    if (submissionIds.length > 100) {
      return NextResponse.json({ success: false, error: "1회 최대 100건까지만 일괄 철회 처리가 가능합니다." }, { status: 400 });
    }

    if (submissionIds.length === 0) {
      return NextResponse.json({ success: true, successCount: 0, failureCount: 0, results: [] });
    }

    // 3. submissions 개별 문서 병렬 로드 및 캐싱
    const subRefs = submissionIds.map(id => db.collection("submissions").doc(id));
    const subSnaps = await db.getAll(...subRefs);

    // 정책 검증을 위한 관련 자동화 및 템플릿 정보 로드
    const automationIds = Array.from(new Set(subSnaps.map(s => s.exists ? s.data()?.automationId : null).filter(Boolean))) as string[];
    const workflowKeys = Array.from(new Set(subSnaps.map(s => s.exists ? s.data()?.workflowKey : null).filter(Boolean))) as string[];

    const clientAutomationsMap = new Map<string, any>();
    const templatesMap = new Map<string, any>();

    if (automationIds.length > 0) {
      const autoRefs = automationIds.map(id => db.collection("clientAutomations").doc(id));
      const autoSnaps = await db.getAll(...autoRefs);
      autoSnaps.forEach(s => {
        if (s.exists) clientAutomationsMap.set(s.id, s.data());
      });
    }

    if (workflowKeys.length > 0) {
      const tplRefs = workflowKeys.map(key => db.collection("workflowTemplates").doc(key));
      const tplSnaps = await db.getAll(...tplRefs);
      tplSnaps.forEach(s => {
        if (s.exists) templatesMap.set(s.id, s.data());
      });
    }

    const results: { submissionId: string; success: boolean; error?: string }[] = [];
    let successCount = 0;
    let failureCount = 0;

    const batch = db.batch();
    const nowStr = new Date().toISOString();

    const auditFields = {
      accessMode: "private",
      accessModeUpdatedAt: nowStr,
      accessModeUpdatedBy: uid,
      accessModeUpdatedByRole: userDoc.role,
      accessModeUpdatedReason: "admin_revoke_company_access_bulk"
    };

    // 4. 건별 권한 판정 및 batch 수집
    for (let i = 0; i < subSnaps.length; i++) {
      const subSnap = subSnaps[i];
      const subId = submissionIds[i];

      if (!subSnap.exists) {
        results.push({ submissionId: subId, success: false, error: "존재하지 않는 실행 기록입니다." });
        failureCount++;
        continue;
      }

      const subData = subSnap.data()!;

      // 4.1. clientId 불일치 검증
      if (!isOperator) {
        if (!userClientId || !subData.clientId || userClientId !== subData.clientId) {
          results.push({ submissionId: subId, success: false, error: "소속사 정보가 불일치하여 조작할 수 없습니다." });
          failureCount++;
          continue;
        }
      }

      // 4.2. 이미 private인 경우 제외
      if (subData.accessMode !== "company") {
        results.push({ submissionId: subId, success: false, error: "회사 공개 상태의 자료만 철회할 수 있습니다." });
        failureCount++;
        continue;
      }

      // 4.3. adminCanChangeAccess 정책 여부 검증
      let adminCanChangeAccess = true;
      const autoData = subData.automationId ? clientAutomationsMap.get(subData.automationId) : null;
      if (autoData?.resultAccessPolicy?.adminCanChangeAccess !== undefined) {
        adminCanChangeAccess = autoData.resultAccessPolicy.adminCanChangeAccess;
      } else {
        const tplData = subData.workflowKey ? templatesMap.get(subData.workflowKey) : null;
        if (tplData?.resultAccessPolicy?.adminCanChangeAccess !== undefined) {
          adminCanChangeAccess = tplData.resultAccessPolicy.adminCanChangeAccess;
        }
      }

      if (!adminCanChangeAccess) {
        results.push({ submissionId: subId, success: false, error: "해당 자동화는 관리자 공개 철회 정책이 비활성화되어 있습니다." });
        failureCount++;
        continue;
      }

      // 4.4. 검증 완료 건에 대해 batch 추가 수집
      batch.update(subSnap.ref, auditFields);

      // index 동기화용 수집
      const indexSnap = await db.collection("knowledgeSearchIndex")
        .where("submissionId", "==", subId)
        .get();

      if (!indexSnap.empty) {
        indexSnap.docs.forEach((indexDoc) => {
          batch.update(indexDoc.ref, {
            accessMode: "private",
            accessModeUpdatedAt: nowStr,
            accessModeUpdatedBy: uid
          });
        });
      }

      results.push({ submissionId: subId, success: true });
      successCount++;
    }

    // 5. 성공 건이 한 건이라도 존재한다면 batch 커밋 실행
    if (successCount > 0) {
      await batch.commit();
      console.info(`[submission-access-admin-bulk] 일괄 철회 batch 완료. 성공: ${successCount}건, 실패: ${failureCount}건`);
    }

    return NextResponse.json({
      success: true,
      successCount,
      failureCount,
      results
    });

  } catch (error: any) {
    console.error("[submission-access-admin-bulk-error] 일괄 철회 중 서버 내부 오류:", error);
    return NextResponse.json({ success: false, error: "일괄 공개 철회 처리 중 서버 내부 오류가 발생했습니다." }, { status: 500 });
  }
}
