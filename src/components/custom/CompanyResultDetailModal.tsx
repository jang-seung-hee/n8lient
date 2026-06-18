"use client";

// 회사 관리자/오퍼레이터 결과 상세 thin wrapper — 공통 ExecutionResultDetailModal 위임

import type { Submission } from "@/types/n8lient";
import type { UserDisplaySource } from "@/common/user/formatUserDisplayName";
import { ExecutionResultDetailModal } from "@/components/results/ExecutionResultDetailModal";
import type { ViewerRole } from "@/components/results/resultDetailTypes";

/** @deprecated 직접 ExecutionResultDetailModal 사용을 권장합니다. 하위 호환 thin wrapper입니다. */
interface CompanyResultDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: Submission | null;
  viewerRole?: ViewerRole;
  onDownloadFile?: (
    refType: "original" | "result",
    index: number,
    fileName: string
  ) => Promise<void>;
  actorDisplaySource?: UserDisplaySource | null;
}

export function CompanyResultDetailModal({
  isOpen,
  onClose,
  submission,
  viewerRole = "companyAdmin",
  onDownloadFile,
  actorDisplaySource,
}: CompanyResultDetailModalProps) {
  if (!isOpen || !submission) return null;

  return (
    <ExecutionResultDetailModal
      isOpen={isOpen}
      onClose={onClose}
      submission={submission}
      viewerRole={viewerRole}
      onDownloadFile={onDownloadFile}
      actorDisplaySource={actorDisplaySource}
    />
  );
}
