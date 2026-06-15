/**
 * 이 파일은 특정 고객사의 운영 현황(사용자, 계약/자동화, 실행 통계, 최근 오류)을 Firestore에서 조회하고 집계하는 서비스를 제공합니다.
 * 한국어 주석 표준을 준수합니다.
 */

import {
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  Firestore,
} from "firebase/firestore";
import type {
  UserDoc,
  ClientContract,
  ClientAutomation,
  Submission,
  CompanyJoinRequest,
  WorkflowTemplate,
} from "@/types/n8lient";
import { maskDisplayName, maskEmail } from "./masking";

export interface ClientOperationStatus {
  userSummary: {
    totalUsers: number;
    approvedUsers: number;
    pendingUsers: number;
    hasCompanyAdmin: boolean;
    recentJoinRequests: number;
    cancelledOrRejectedRequests: number;
    usersList: Array<{
      uid: string;
      maskedName: string;
      maskedEmail: string;
      role: string;
      approvalStatus: string;
    }>;
  };
  contractSummary: {
    totalContracts: number;
    productionContracts: number;
    testContracts: number;
    activeAutomations: number;
    inactiveAutomations: number;
    incompleteAutomations: number;
    automationsList: Array<{
      automationId: string;
      automationName: string;
      workflowKey: string;
      workflowName: string;
      contractMode: "test" | "production";
      enabled: boolean;
      configStatus: string;
      retentionLimitLabel: string;
    }>;
  };
  submissionSummary: {
    recent7Days: number;
    recent30Days: number;
    successCount: number;
    failedCount: number;
    processingCount: number;
    successRate: number | null;
    lastSubmittedAt: string | null;
    lastFailedAt: string | null;
    basisLabel: string;
  };
  recentErrors: Array<{
    submissionId: string;
    createdAt: string | null;
    workflowKey: string;
    workflowName: string;
    status: string;
    errorCode?: string;
    errorMessage?: string;
    maskedUser?: string;
  }>;
}

/**
 * 특정 고객사(clientId)의 운영 현황을 집계하여 반환합니다.
 */
export async function getClientOperationStatus(
  db: Firestore,
  clientId: string
): Promise<ClientOperationStatus> {
  try {
    // 1. 공용 워크플로우 템플릿 목록 로드 (이름 매핑용)
    const templatesSnap = await getDocs(collection(db, "workflowTemplates"));
    const templatesMap = new Map<string, string>();
    templatesSnap.forEach((doc) => {
      const data = doc.data() as WorkflowTemplate;
      templatesMap.set(data.workflowKey, data.name || data.shortName || data.workflowKey);
    });

    // 2. 해당 고객사 소속 사용자(users) 조회
    const usersQuery = query(
      collection(db, "users"),
      where("clientId", "==", clientId)
    );
    const usersSnap = await getDocs(usersQuery);
    const usersList: UserDoc[] = [];
    usersSnap.forEach((doc) => {
      usersList.push(doc.data() as UserDoc);
    });

    // 3. 가입 승인 요청(companyJoinRequests) 조회
    const joinReqQuery = query(
      collection(db, "companyJoinRequests"),
      where("clientId", "==", clientId)
    );
    const joinReqSnap = await getDocs(joinReqQuery);
    const joinReqList: CompanyJoinRequest[] = [];
    joinReqSnap.forEach((doc) => {
      joinReqList.push(doc.data() as CompanyJoinRequest);
    });

    // 4. 회사 계약 자동화(clientContracts) 조회
    const contractsQuery = query(
      collection(db, "clientContracts"),
      where("clientId", "==", clientId)
    );
    const contractsSnap = await getDocs(contractsQuery);
    const contractsList: ClientContract[] = [];
    contractsSnap.forEach((doc) => {
      contractsList.push(doc.data() as ClientContract);
    });

    // 5. 실제 등록 자동화 설정(clientAutomations) 조회
    const automationsQuery = query(
      collection(db, "clientAutomations"),
      where("clientId", "==", clientId)
    );
    const automationsSnap = await getDocs(automationsQuery);
    const automationsList: ClientAutomation[] = [];
    automationsSnap.forEach((doc) => {
      automationsList.push(doc.data() as ClientAutomation);
    });

    // 6. 실행 이력(submissions) 조회 (안전장치 적용: 최대 300건 제한)
    // 복합 인덱스 미생성 시 에러가 발생할 수 있으므로, orderBy("createdAt", "desc")를 먼저 시도하고
    // 에러 발생 시 orderBy 없이 where 필터와 limit만 적용하는 방어 코드를 구현합니다.
    let submissionsList: Submission[] = [];
    let isFallbackQuery = false;

    try {
      const subQuery = query(
        collection(db, "submissions"),
        where("clientId", "==", clientId),
        orderBy("createdAt", "desc"),
        limit(300)
      );
      const subSnap = await getDocs(subQuery);
      subSnap.forEach((doc) => {
        submissionsList.push(doc.data() as Submission);
      });
    } catch (err: any) {
      console.warn(
        "[clientOperationStatusService] submissions 복합 인덱스가 없어 정렬 쿼리 실패, 인덱스 생성 전 Fallback 조회로 전환합니다.",
        err
      );
      // Fallback: orderBy 없이 where와 limit(300)으로만 조회 후 메모리에서 정렬
      submissionsList = [];
      const subFallbackQuery = query(
        collection(db, "submissions"),
        where("clientId", "==", clientId),
        limit(300)
      );
      const subSnap = await getDocs(subFallbackQuery);
      subSnap.forEach((doc) => {
        submissionsList.push(doc.data() as Submission);
      });
      
      // 메모리에서 createdAt 기준 내림차순 정렬
      submissionsList.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      isFallbackQuery = true;
    }

    // ----------------------------------------------------
    // [1] 사용자 현황 집계
    // ----------------------------------------------------
    const totalUsers = usersList.length;
    const approvedUsers = usersList.filter((u) => u.approvalStatus === "approved").length;
    const pendingUsers = usersList.filter((u) => u.approvalStatus === "pending").length;
    const hasCompanyAdmin = usersList.some((u) => u.role === "company_admin" && u.approvalStatus === "approved");

    const recentJoinRequests = joinReqList.filter((r) => r.status === "pending").length;
    const cancelledOrRejectedRequests = joinReqList.filter(
      (r) => r.status === "cancelled" || r.status === "rejected"
    ).length;

    // 사용자 목록 (마스킹 적용)
    const formattedUsersList = usersList.map((u) => ({
      uid: u.uid,
      maskedName: maskDisplayName(u.displayName),
      maskedEmail: maskEmail(u.email),
      role: u.role,
      approvalStatus: u.approvalStatus,
    }));

    // ----------------------------------------------------
    // [2] 계약 자동화 현황 집계
    // ----------------------------------------------------
    const totalContracts = contractsList.length;
    const productionContracts = contractsList.filter(
      (c) => c.contractMode === "production" || c.isTestContract === false
    ).length;
    const testContracts = contractsList.filter(
      (c) => c.contractMode === "test" || c.isTestContract === true
    ).length;

    const activeAutomations = automationsList.filter((a) => a.enabled === true).length;
    const inactiveAutomations = automationsList.filter((a) => a.enabled === false && a.configStatus !== "draft").length;
    const incompleteAutomations = automationsList.filter((a) => a.configStatus === "draft").length;

    // 자동화 리스트 포맷팅
    const formattedAutomationsList = automationsList.map((a) => {
      const contractMode: "test" | "production" = (a.deploymentMode === "test" || a.templateStatusAtBinding === "draft") ? "test" : "production";
      const workflowName = templatesMap.get(a.workflowKey) || "알 수 없는 자동화";
      
      // 보관 한도 요약 라벨 설정
      let retentionLimitLabel = "-";
      if (a.contractRetentionLimit?.maxLevel) {
        const level = a.contractRetentionLimit.maxLevel;
        if (level === "notify_only") retentionLimitLabel = "알림만 (notify_only)";
        else if (level === "processed_result") retentionLimitLabel = "결과 보관 (processed_result)";
        else if (level === "full_archive") retentionLimitLabel = "전체 보관 (full_archive)";
      }

      return {
        automationId: a.automationId,
        automationName: a.automationName,
        workflowKey: a.workflowKey,
        workflowName,
        contractMode,
        enabled: a.enabled,
        configStatus: a.configStatus,
        retentionLimitLabel,
      };
    });

    // ----------------------------------------------------
    // [3] 실행 현황 집계 (최근 300건 기준 메모리 집계)
    // ----------------------------------------------------
    const nowMs = Date.now();
    const msInDay = 24 * 60 * 60 * 1000;
    const recent7DaysThreshold = nowMs - 7 * msInDay;
    const recent30DaysThreshold = nowMs - 30 * msInDay;

    let recent7Days = 0;
    let recent30Days = 0;
    let successCount = 0;
    let failedCount = 0;
    let processingCount = 0;
    let lastSubmittedAt: string | null = null;
    let lastFailedAt: string | null = null;

    // 사용자 정보 캐시 맵 생성 (이름/이메일 매핑용)
    const userMap = new Map<string, { displayName: string; email: string }>();
    usersList.forEach((u) => {
      userMap.set(u.uid, { displayName: u.displayName, email: u.email });
    });

    submissionsList.forEach((sub, idx) => {
      const createdTime = sub.createdAt ? new Date(sub.createdAt).getTime() : 0;
      
      // 1. 기간 필터링
      if (createdTime >= recent7DaysThreshold) recent7Days++;
      if (createdTime >= recent30DaysThreshold) recent30Days++;

      // 2. 가장 최근 실행 시각
      if (idx === 0) {
        lastSubmittedAt = sub.createdAt || null;
      }

      // 3. 상태 분류 (프로젝트 규격: queued | processing | success | failed | skipped | config_error)
      const status = sub.status;
      if (status === "success") {
        successCount++;
      } else if (status === "failed" || status === "config_error") {
        failedCount++;
        if (!lastFailedAt) {
          lastFailedAt = sub.createdAt || null;
        }
      } else if (status === "processing" || status === "queued") {
        processingCount++;
      }
    });

    // 성공률 계산: success / (success + failed) * 100 (처리중, 보류 등은 제외)
    const totalFinished = successCount + failedCount;
    const successRate = totalFinished > 0 ? Math.round((successCount / totalFinished) * 1000) / 10 : null;

    const basisLabel = isFallbackQuery
      ? "실행 현황은 정렬 색인 미생성으로 인한 제한 조회(임의 300건) 기준입니다."
      : "실행 현황은 최근 300건 기준입니다.";

    // ----------------------------------------------------
    // [4] 최근 오류 집계 (최근 실패 5건 추출)
    // ----------------------------------------------------
    const failedSubmissions = submissionsList
      .filter((sub) => sub.status === "failed" || sub.status === "config_error")
      .slice(0, 5);

    const recentErrors = failedSubmissions.map((sub) => {
      const workflowName = templatesMap.get(sub.workflowKey) || "알 수 없는 자동화";
      const uInfo = userMap.get(sub.uid);
      const maskedUser = uInfo 
        ? `${maskDisplayName(uInfo.displayName)} (${maskEmail(uInfo.email)})`
        : "알 수 없는 사용자";

      // 오류 메시지 길이 제한 (80자)
      let errMsg = sub.error?.message || "상세 오류 메시지가 없습니다.";
      if (errMsg.length > 80) {
        errMsg = errMsg.slice(0, 80) + "...";
      }

      return {
        submissionId: sub.submissionId,
        createdAt: sub.createdAt || null,
        workflowKey: sub.workflowKey,
        workflowName,
        status: sub.status,
        errorCode: sub.error?.code || "N/A",
        errorMessage: errMsg,
        maskedUser,
      };
    });

    return {
      userSummary: {
        totalUsers,
        approvedUsers,
        pendingUsers,
        hasCompanyAdmin,
        recentJoinRequests,
        cancelledOrRejectedRequests,
        usersList: formattedUsersList,
      },
      contractSummary: {
        totalContracts,
        productionContracts,
        testContracts,
        activeAutomations,
        inactiveAutomations,
        incompleteAutomations,
        automationsList: formattedAutomationsList,
      },
      submissionSummary: {
        recent7Days,
        recent30Days,
        successCount,
        failedCount,
        processingCount,
        successRate,
        lastSubmittedAt,
        lastFailedAt,
        basisLabel,
      },
      recentErrors,
    };
  } catch (error) {
    console.error("[clientOperationStatusService] 고객사 운영 현황 집계 실패:", error);
    throw error;
  }
}
