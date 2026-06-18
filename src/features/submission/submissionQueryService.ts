/**
 * 이 파일은 자동화 실행 이력(submissions)에 대한 역할별 Firestore 구독 서비스를 제공합니다.
 * 보안 규정 준수: 각 역할의 Firestore Rules 범위와 일치하는 필터를 강제합니다.
 * 한국어 주석 표준을 준수합니다.
 */

import {
  Firestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import type { Submission } from "@/types/n8lient";

/**
 * 1. 사용자 본인의 실행 이력을 실시간 구독합니다. (Rules: resource.data.uid == request.auth.uid)
 */
export function subscribeMySubmissions(
  db: Firestore,
  uid: string,
  onUpdate: (submissions: Submission[]) => void,
  onError: (error: any) => void
) {
  const q = query(
    collection(db, "submissions"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as Submission);
      onUpdate(list);
    },
    (err) => {
      console.error("[submissionQueryService] 내 실행 결과 구독 실패:", err);
      onError(err);
    }
  );
}

/**
 * 2. 회사 관리자가 소속 회사의 실행 이력을 실시간 구독합니다. (Rules: isCompanyAdmin() && clientId 일치)
 */
export function subscribeCompanySubmissions(
  db: Firestore,
  clientId: string,
  onUpdate: (submissions: Submission[]) => void,
  onError: (error: any) => void
) {
  const q = query(
    collection(db, "submissions"),
    where("clientId", "==", clientId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as Submission);
      onUpdate(list);
    },
    (err) => {
      console.error("[submissionQueryService] 회사 실행 결과 구독 실패:", err);
      onError(err);
    }
  );
}

/**
 * 3. 운영자가 플랫폼 전체 실행 이력을 실시간 구독합니다. (Rules: role == 'operator')
 * 성능 및 비용을 위해 최근 500건으로 제한합니다.
 */
export function subscribeOperatorSubmissions(
  db: Firestore,
  onUpdate: (submissions: Submission[]) => void,
  onError: (error: any) => void,
  maxLimit: number = 500
) {
  const q = query(
    collection(db, "submissions"),
    orderBy("createdAt", "desc"),
    limit(maxLimit)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as Submission);
      onUpdate(list);
    },
    (err) => {
      console.error("[submissionQueryService] 전체 실행 결과 구독 실패:", err);
      onError(err);
    }
  );
}
