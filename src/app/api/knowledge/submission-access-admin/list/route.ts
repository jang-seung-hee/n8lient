// [route.ts]
// 이 파일은 회사 관리자 및 운영자가 회사 자료의 공개 상태를 안전하게 목록 조회하는 API Route입니다.
// 보안 규정: 타인 소유의 private 자료는 제목을 "개인 보관 자료"로 강제 마스킹하고 본문은 일절 제외합니다.
// 한국어 주석 표준을 준수합니다.

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebaseAdmin";

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
      return NextResponse.json({ success: false, error: "회사 관리자 또는 시스템 운영자만 조회할 수 있습니다." }, { status: 403 });
    }

    const userClientId = userDoc.clientId || null;

    // 3. knowledgeSearchIndex 조회
    let indexQuery = db.collection("knowledgeSearchIndex") as FirebaseFirestore.Query;
    if (isCompanyAdmin) {
      if (!userClientId) {
        return NextResponse.json({ success: false, error: "소속 회사 정보가 없어 조회할 수 없습니다." }, { status: 400 });
      }
      indexQuery = indexQuery.where("clientId", "==", userClientId);
    }

    const snap = await indexQuery.get();
    const rawItems: any[] = [];
    snap.forEach((doc) => {
      rawItems.push({ docId: doc.id, ...doc.data() });
    });

    // 4. 정책 데이터 조회를 위한 배치 캐시 준비 (성능 최적화)
    const automationIds = Array.from(new Set(rawItems.map(item => item.automationId).filter(Boolean))) as string[];
    const workflowKeys = Array.from(new Set(rawItems.map(item => item.workflowKey).filter(Boolean))) as string[];

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

    // 5. 항목 가공 및 보안 마스킹 / 권한 계산 처리
    const items = rawItems.map((item) => {
      const isOwner = item.ownerUid === uid;
      const isCompanyAccess = item.accessMode === "company";
      const isPrivateAccess = item.accessMode === "private";

      // 5.1. private 자료 마스킹 및 노출 제어 정책
      let displayTitle = item.title || "제목 없음";
      let viewerUrl: string | null = null;

      if (isPrivateAccess) {
        if (!isOwner && !isOperator) {
          // 타인 소유의 private인 경우 제목 마스킹
          displayTitle = "개인 보관 자료";
        }
        if (isOwner || isOperator) {
          viewerUrl = `/user/data/view/${item.submissionId}`;
        }
      } else {
        // company인 경우 전체 열람 및 보기 링크 제공
        viewerUrl = `/user/data/view/${item.submissionId}`;
      }

      // 5.2. adminCanChangeAccess 정책 우선순위 계산
      let adminCanChangeAccess = true;
      const autoData = item.automationId ? clientAutomationsMap.get(item.automationId) : null;
      if (autoData?.resultAccessPolicy?.adminCanChangeAccess !== undefined) {
        adminCanChangeAccess = autoData.resultAccessPolicy.adminCanChangeAccess;
      } else {
        const tplData = item.workflowKey ? templatesMap.get(item.workflowKey) : null;
        if (tplData?.resultAccessPolicy?.adminCanChangeAccess !== undefined) {
          adminCanChangeAccess = tplData.resultAccessPolicy.adminCanChangeAccess;
        }
      }

      // 5.3. canAdminRevokeCompanyAccess 권한 조건 계산
      // 관리자 공개 철회는: company 상태이며 + 정책상 허용될 때만 가능
      const canAdminRevokeCompanyAccess = Boolean(isCompanyAccess && adminCanChangeAccess);

      return {
        submissionId: item.submissionId,
        title: displayTitle,
        ownerEmail: item.ownerEmail || "",
        ownerName: item.ownerName || "작성자",
        workflowName: item.workflowName || "",
        automationId: item.automationId || "",
        createdAt: item.createdAt || "",
        accessMode: item.accessMode || "private",
        accessModeUpdatedAt: item.accessModeUpdatedAt || item.createdAt || "",
        canAdminRevokeCompanyAccess,
        viewerUrl,
      };
    });

    // 최근 순 정렬
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      items
    });

  } catch (error: any) {
    console.error("[submission-access-admin-list-error] 목록 조회 중 내부 오류 발생:", error);
    return NextResponse.json({ success: false, error: "공개 자료 목록을 가져오는 도중 서버 내부 오류가 발생했습니다." }, { status: 500 });
  }
}
