// 이 파일은 일반 사용자가 자동화 인스턴스를 조회하고 실행을 요청하며 실행 이력을 실시간으로 구독하기 위한 Firestore 서비스를 제공합니다.

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  orderBy,
  onSnapshot,
  Firestore,
} from "firebase/firestore";
import type { ClientAutomation, Submission } from "@/types/n8lient";

/**
 * 로그인한 사용자의 clientId 기준, 활성화되고 설정이 완료된 자동화(clientAutomations) 목록을 조회합니다.
 */
export async function getActiveAutomations(
  db: Firestore,
  clientId: string
): Promise<ClientAutomation[]> {
  try {
    const q = query(
      collection(db, "clientAutomations"),
      where("clientId", "==", clientId),
      where("enabled", "==", true),
      where("configStatus", "==", "configured")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ClientAutomation);
  } catch (error) {
    console.error("[userService] 활성 자동화 목록 조회 실패:", error);
    throw error;
  }
}

/**
 * 자동화 실행 요청(submission) 문서를 생성하여 submissions 컬렉션에 저장합니다.
 * 보안 규정 준수: uid == request.auth.uid, clientId == getMyUser().clientId, status == "queued"
 */
export async function createSubmission(
  db: Firestore,
  params: {
    clientId: string;
    uid: string;
    workflowKey: string;
    automationId: string;
    input: Submission["input"];
  }
): Promise<{ success: boolean; submissionId?: string; message?: string }> {
  try {
    const now = new Date();
    const dateStr = now.toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
    const randomStr = Math.random().toString(36).substring(2, 8);
    const submissionId = `sub_${dateStr}_${randomStr}`;

    const submissionDoc: Submission = {
      submissionId,
      clientId: params.clientId,
      uid: params.uid,
      workflowKey: params.workflowKey,
      automationId: params.automationId,
      status: "queued", // 보안 규칙에 의해 무조건 "queued" 여야 함
      input: params.input,
      result: {
        resultUrl: null,
        summary: null,
      },
      error: {
        code: null,
        message: null,
      },
      retryOf: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      completedAt: null,
    };

    const docRef = doc(db, "submissions", submissionId);
    await setDoc(docRef, submissionDoc);
    return { success: true, submissionId };
  } catch (error: any) {
    console.error("[userService] 자동화 실행 요청 생성 실패:", error);
    return { success: false, message: error.message || "실행 요청 도중 오류가 발생했습니다." };
  }
}

/**
 * 로그인한 사용자(uid) 본인의 submissions 목록을 실시간으로 구독합니다.
 * 보안 규정 준수: 쿼리 필터에 uid == myUid 필수 지정 (전체 조회 금지)
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
      console.error("[userService] 내 실행 결과 구독 실패:", err);
      onError(err);
    }
  );
}
