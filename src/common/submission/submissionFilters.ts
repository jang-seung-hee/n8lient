/**
 * 이 파일은 자동화 실행 이력(submissions)에 대한 클라이언트 사이드 필터링 로직을 제공합니다.
 * 한국어 주석 표준을 준수합니다.
 */

import type { 
  Submission, 
  SubmissionStatus, 
  ExecutionFailurePhase, 
  ExecutionFailureSource 
} from "@/types/n8lient";
import { getSubmissionDisplayTitle } from "./getSubmissionDisplayTitle";

export interface SubmissionListFilters {
  searchQuery?: string;
  status?: SubmissionStatus | "all";
  errorPhase?: ExecutionFailurePhase | "all";
  errorSource?: ExecutionFailureSource | "all";
  httpStatus?: string;
  gatewayTraceId?: string;
  n8nWebhookPath?: string;
  workflowKeys?: string[];
}

/**
 * 주어진 필터 조건에 따라 Submission 목록을 필터링합니다.
 */
export function filterSubmissions(list: Submission[], filters: SubmissionListFilters): Submission[] {
  return list.filter((sub) => {
    // 1. 상태 필터
    if (filters.status && filters.status !== "all" && sub.status !== filters.status) {
      return false;
    }

    // 1.5 워크플로우 다중 선택 필터 (OR 조건)
    if (filters.workflowKeys && filters.workflowKeys.length > 0) {
      if (!filters.workflowKeys.includes(sub.workflowKey)) {
        return false;
      }
    }

    // 2. 검색어 필터 (ID, Key, 실행명, 에러코드 등)
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const displayTitle = getSubmissionDisplayTitle(sub).toLowerCase();
      const matches = 
        sub.submissionId.toLowerCase().includes(q) ||
        sub.workflowKey.toLowerCase().includes(q) ||
        displayTitle.includes(q) ||
        (sub.error?.code?.toLowerCase().includes(q)) ||
        (sub.clientId?.toLowerCase().includes(q)) ||
        (sub.uid?.toLowerCase().includes(q));
      
      if (!matches) return false;
    }

    // 3. 에러 상세 필터 (Operator 전용)
    if (sub.errorDetails) {
      if (filters.errorPhase && filters.errorPhase !== "all" && sub.errorDetails.phase !== filters.errorPhase) {
        return false;
      }
      if (filters.errorSource && filters.errorSource !== "all" && sub.errorDetails.source !== filters.errorSource) {
        return false;
      }
      if (filters.httpStatus && sub.errorDetails.httpStatus?.toString() !== filters.httpStatus) {
        return false;
      }
      if (filters.gatewayTraceId && !sub.errorDetails.gatewayTraceId?.toLowerCase().includes(filters.gatewayTraceId.toLowerCase())) {
        return false;
      }
      if (filters.n8nWebhookPath && !sub.errorDetails.n8nWebhookPath?.toLowerCase().includes(filters.n8nWebhookPath.toLowerCase())) {
        return false;
      }
    } else {
      // errorDetails가 없는 레거시 문서인데 에러 상세 필터가 걸려있다면 제외
      if (
        (filters.errorPhase && filters.errorPhase !== "all") ||
        (filters.errorSource && filters.errorSource !== "all") ||
        filters.httpStatus ||
        filters.gatewayTraceId ||
        filters.n8nWebhookPath
      ) {
        return false;
      }
    }

    return true;
  });
}
