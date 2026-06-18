"use client";

// 실행 결과 상세 모달 — 공통 Panel + viewerRole 기반 섹션 정책

import React, { useState, useRef, useEffect } from "react";
import type { Submission } from "@/types/n8lient";
import { getSubmissionDisplayTitle } from "@/common/submission/getSubmissionDisplayTitle";
import { downloadSubmissionFile } from "@/features/user/userService";
import { auth } from "@/lib/firebase";
import { useAuthUser } from "@/features/auth/useAuthUser";
import {
  buildSubmissionMarkdownExport,
  downloadMarkdownFile,
  sanitizeMarkdownFileName,
} from "@/features/user/markdownExport";
import { playAppSound } from "@/lib/appSound";
import { SubmissionStatusBadge } from "@/components/core/submission/SubmissionStatusBadge";
import { ExecutionResultDetailPanel } from "./ExecutionResultDetailPanel";
import type { ViewerRole } from "./resultDetailTypes";
import type { UserDisplaySource } from "@/common/user/formatUserDisplayName";

export interface ExecutionResultDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: Submission;
  viewerRole: ViewerRole;
  /** 2차: companyAdmin/operator 전용 다운로드 핸들러 주입 */
  onDownloadFile?: (
    refType: "original" | "result",
    index: number,
    fileName: string
  ) => Promise<void>;
  /** 실행자 표시용 사용자 정보 (2차: admin/operator에서 users 조회 결과 주입) */
  actorDisplaySource?: UserDisplaySource | null;
}

export function ExecutionResultDetailModal({
  isOpen,
  onClose,
  submission,
  viewerRole,
  onDownloadFile: onDownloadFileProp,
  actorDisplaySource: actorDisplaySourceProp,
}: ExecutionResultDetailModalProps) {
  const { user, userDoc } = useAuthUser();
  const [downloadingIndex, setDownloadingIndex] = useState<{
    type: string;
    idx: number;
  } | null>(null);
  const timeoutIdsRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((id) => clearTimeout(id));
    };
  }, []);

  const addDelayedAlert = (message: string, delay = 150) => {
    const id = window.setTimeout(() => {
      alert(message);
    }, delay);
    timeoutIdsRef.current.push(id);
  };

  if (!isOpen) return null;

  const handleDownloadDefault = async (
    refType: "original" | "result",
    index: number,
    fileName: string
  ) => {
    playAppSound("click");
    try {
      setDownloadingIndex({ type: refType, idx: index });
      await downloadSubmissionFile(auth, submission.submissionId, refType, index, fileName);
      playAppSound("success");
    } catch (err: unknown) {
      playAppSound("error");
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      addDelayedAlert(`다운로드 실패: ${message}`);
    } finally {
      setDownloadingIndex(null);
    }
  };

  const handleDownload = onDownloadFileProp ?? handleDownloadDefault;

  const actorDisplaySource: UserDisplaySource | null =
    actorDisplaySourceProp ??
    (submission.uid === user?.uid
      ? {
          displayName: userDoc?.displayName ?? user?.displayName ?? null,
          email: userDoc?.email ?? user?.email ?? null,
          uid: submission.uid,
        }
      : null);

  const handleMarkdownExport = () => {
    playAppSound("click");
    try {
      const rawTitle = getSubmissionDisplayTitle(submission);
      const cleanTitle = sanitizeMarkdownFileName(rawTitle);
      const fileName = `${cleanTitle}.md`;
      const markdown = buildSubmissionMarkdownExport({
        submission,
        currentUserDoc: userDoc,
        currentUser: user,
      });
      downloadMarkdownFile(markdown, fileName);
    } catch (err: unknown) {
      playAppSound("error");
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      addDelayedAlert(`MD 다운로드 중 에러 발생: ${message}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-[480px] flex-col overflow-hidden rounded-xl bg-white shadow-lg">
        {/* 헤더 */}
        <div className="flex shrink-0 items-start justify-between border-b border-gray-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <SubmissionStatusBadge status={submission.status} />
              <span className="truncate text-[11px] text-gray-400">
                {submission.submissionId}
              </span>
            </div>
            <h3 className="truncate text-[15px] font-bold text-gray-900">
              {getSubmissionDisplayTitle(submission)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-2 shrink-0 border-none bg-transparent p-1 text-lg text-gray-400 hover:text-gray-600"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 본문 */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ExecutionResultDetailPanel
            submission={submission}
            viewerRole={viewerRole}
            actorDisplaySource={actorDisplaySource}
            onDownloadFile={handleDownload}
            downloadingIndex={downloadingIndex}
            onMarkdownExport={handleMarkdownExport}
          />
        </div>

        {/* 푸터 */}
        <div className="shrink-0 border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-full rounded-md border border-gray-300 bg-gray-100 text-xs font-semibold text-gray-700 hover:bg-gray-200"
          >
            창 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
