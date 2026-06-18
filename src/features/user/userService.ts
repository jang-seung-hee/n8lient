// 이 파일은 일반 사용자가 자동화 인스턴스를 조회하고 실행을 요청하며 실행 이력을 실시간으로 구독하기 위한 Firestore 서비스를 제공합니다.

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
  orderBy,
  onSnapshot,
  Firestore,
} from "firebase/firestore";
import type { ClientAutomation, Submission, UserAutomationSettings } from "@/types/n8lient";
import { removeUndefinedFields as stripUndefinedDeep } from "@/common/firestore/removeUndefinedFields";

/**
 * Firestore setDoc/updateDoc 전송용 객체에서 undefined 값을 재귀적으로 제거합니다.
 * null은 유지합니다.
 */
export { stripUndefinedDeep };

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

    const templateRef = doc(db, "workflowTemplates", params.workflowKey);
    const templateSnap = await getDoc(templateRef);
    let templateStatusAtExecution: "draft" | "published" = "published";
    let isTestExecution = false;

    if (templateSnap.exists()) {
      const templateData = templateSnap.data();
      const status = templateData?.status || "published";
      templateStatusAtExecution = status === "draft" ? "draft" : "published";
      isTestExecution = status === "draft";
    }

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
      templateStatusAtExecution,
      isTestExecution,
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

import { subscribeMySubmissions as subscribeMySubmissionsNew } from "@/features/submission/submissionQueryService";

/**
 * 로그인한 사용자(uid) 본인의 submissions 목록을 실시간으로 구독합니다.
 * 보안 규정 준수: 쿼리 필터에 uid == myUid 필수 지정 (전체 조회 금지)
 * @deprecated subscribeMySubmissions in @/features/submission/submissionQueryService를 사용하세요.
 */
export const subscribeMySubmissions = subscribeMySubmissionsNew;

/**
 * 특정 사용자의 특정 자동화에 대한 개인 설정(userAutomationSettings)을 조회합니다.
 */
export async function getUserAutomationSettings(
  db: Firestore,
  uid: string,
  automationId: string
): Promise<UserAutomationSettings | null> {
  try {
    const docRef = doc(db, "userAutomationSettings", `${uid}_${automationId}`);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserAutomationSettings;
    }
    return null;
  } catch (error) {
    console.error("[userService] 개인 설정 조회 실패:", error);
    throw error;
  }
}

/**
 * 특정 사용자의 자동화 개인 설정(userAutomationSettings)을 저장(생성 또는 덮어쓰기)합니다.
 */
export async function saveUserAutomationSettings(
  db: Firestore,
  data: UserAutomationSettings
): Promise<void> {
  try {
    const docRef = doc(db, "userAutomationSettings", data.settingId);
    const payload = stripUndefinedDeep(data);
    await setDoc(docRef, payload);
  } catch (error) {
    console.error("[userService] 개인 설정 저장 실패:", error);
    throw error;
  }
}

/**
 * 특정 submission의 첨부파일 혹은 결과파일을 안전하게 다운로드합니다.
 */
export async function downloadSubmissionFile(
  auth: any,
  submissionId: string,
  refType: "original" | "result",
  index: number,
  fileName: string
): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("로그인이 필요합니다.");
    }

    const idToken = await currentUser.getIdToken();
    const gatewayBaseUrl = process.env.NEXT_PUBLIC_GATEWAY_BASE_URL || "http://localhost:8080";
    const downloadUrl = `${gatewayBaseUrl.replace(/\/$/, "")}/api/automation/download?submissionId=${submissionId}&refType=${refType}&index=${index}`;

    const res = await fetch(downloadUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `다운로드 요청 실패 (HTTP ${res.status})`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    // 정리
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error("[userService] 파일 다운로드 실패:", error);
    throw error;
  }
}

