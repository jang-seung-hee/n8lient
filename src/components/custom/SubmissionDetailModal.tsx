"use client";

// 사용자 실행 결과 상세 모달 thin wrapper — 공통 ExecutionResultDetailModal 위임

import type { Submission } from "@/types/n8lient";
import { ExecutionResultDetailModal } from "@/components/results/ExecutionResultDetailModal";

interface SubmissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: Submission;
}

export default function SubmissionDetailModal({
  isOpen,
  onClose,
  submission,
}: SubmissionDetailModalProps) {
  return (
    <ExecutionResultDetailModal
      isOpen={isOpen}
      onClose={onClose}
      submission={submission}
      viewerRole="user"
    />
  );
}
