// [route.ts]
// 이 파일은 사용자가 입력한 검색 조건과 검색 범위를 기반으로 knowledgeSearchIndex를 안전하게 조회하는
// 보안이 적용된 API Route 엔드포인트입니다.
// 보안 규정: 클라이언트의 uid/clientId 파라미터를 신뢰하지 않고, 현재 세션 ID 토큰을 검증하여
// Firestore의 users 문서 기준으로 권한을 확인한 뒤 권한 영역 내의 데이터만 반환합니다.
// 한국어 주석 표준을 준수합니다.

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebaseAdmin";
import { buildSearchTokens } from "@/common/knowledge/knowledgeSearchIndex";

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

    // 2. 사용자 승인 상태 및 clientId 획득
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ success: false, error: "사용자 정보를 찾을 수 없습니다." }, { status: 404 });
    }
    const userDoc = userSnap.data()!;
    if (userDoc.approvalStatus !== "approved") {
      return NextResponse.json({ success: false, error: "승인된 사용자만 검색이 가능합니다." }, { status: 403 });
    }
    const clientId = userDoc.clientId;

    // 3. 요청 바디 파싱
    const body = await req.json();
    const { query = "", accessScope = "all", workflowKey = "", startDateStr = "", endDateStr = "", limit = 50 } = body;

    // 4. 검색 토큰 추출 (Firestore array-contains-any 용도)
    const searchTokens = buildSearchTokens(query);

    // 5. 권한별 조회 쿼리 구성
    // Firestore 쿼리 구조상 OR 조회가 불가능하므로, accessScope === "all"일 경우 병렬 쿼리 후 머지합니다.
    const runQuery = async (scopeMode: "mine" | "company") => {
      let queryRef = db.collection("knowledgeSearchIndex").where("clientId", "==", clientId);

      if (scopeMode === "mine") {
        queryRef = queryRef.where("ownerUid", "==", uid);
      } else {
        queryRef = queryRef.where("accessMode", "==", "company");
      }

      // 검색어 기반 array-contains-any 추가 (최대 10개 키워드만 지원)
      if (searchTokens.length > 0) {
        queryRef = queryRef.where("searchTokens", "array-contains-any", searchTokens.slice(0, 10));
      }

      const snap = await queryRef.get();
      const list: any[] = [];
      snap.forEach((doc) => {
        list.push(doc.data());
      });
      return list;
    };

    let rawResults: any[] = [];

    if (accessScope === "mine") {
      rawResults = await runQuery("mine");
    } else if (accessScope === "company") {
      rawResults = await runQuery("company");
    } else {
      // "all" 인 경우: 내 문서 전체와 회사 공개 문서를 병렬 조회 후 머지
      const [mineDocs, companyDocs] = await Promise.all([
        runQuery("mine"),
        runQuery("company")
      ]);

      // 중복 제거 머지 (submissionId 기준)
      const mergedMap = new Map<string, any>();
      mineDocs.forEach((d) => mergedMap.set(d.submissionId, d));
      companyDocs.forEach((d) => mergedMap.set(d.submissionId, d));
      rawResults = Array.from(mergedMap.values());
    }

    // 6. 서버 메모리 내 추가 필터링 (워플키, 날짜) 및 정렬
    let filtered = rawResults;

    if (workflowKey) {
      filtered = filtered.filter((d) => d.workflowKey === workflowKey);
    }

    if (startDateStr) {
      const startMs = new Date(startDateStr).getTime();
      filtered = filtered.filter((d) => {
        const time = d.createdAt?.seconds ? d.createdAt.seconds * 1000 : new Date(d.createdAt).getTime();
        return time >= startMs;
      });
    }

    if (endDateStr) {
      // 종료일은 하루 전체를 포괄하도록 23:59:59Ms 처리
      const endMs = new Date(endDateStr).getTime() + (24 * 60 * 60 * 1000 - 1);
      filtered = filtered.filter((d) => {
        const time = d.createdAt?.seconds ? d.createdAt.seconds * 1000 : new Date(d.createdAt).getTime();
        return time <= endMs;
      });
    }

    // 최신순 정렬
    filtered.sort((a, b) => {
      const timeA = a.createdAt?.seconds ? a.createdAt.seconds : new Date(a.createdAt).getTime() / 1000;
      const timeB = b.createdAt?.seconds ? b.createdAt.seconds : new Date(b.createdAt).getTime() / 1000;
      return timeB - timeA;
    });

    // limit 적용
    const finalResults = filtered.slice(0, limit);

    return NextResponse.json({
      success: true,
      results: finalResults
    });

  } catch (error: any) {
    console.error("[search-api-error] 검색 처리 중 내부 오류 발생:", error);
    return NextResponse.json({ success: false, error: "검색 중 서버 내부 오류가 발생했습니다." }, { status: 500 });
  }
}
