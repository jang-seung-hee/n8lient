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
import type { DownloadTarget } from "./downloadTarget";
import { getDownloadTargetId } from "./downloadTarget";

export interface ExecutionResultDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: Submission;
  viewerRole: ViewerRole;
  /** Storage 파일 다운로드 커스텀 핸들러 (companyAdmin/operator 주입) */
  onDownloadTarget?: (target: DownloadTarget) => Promise<void>;
  /** @deprecated onDownloadTarget 사용을 권장합니다. */
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
  onDownloadTarget: onDownloadTargetProp,
  onDownloadFile: onDownloadFileProp,
  actorDisplaySource: actorDisplaySourceProp,
}: ExecutionResultDetailModalProps) {
  const { user, userDoc } = useAuthUser();
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
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

  const handleDownloadTargetDefault = async (target: DownloadTarget) => {
    const targetId = getDownloadTargetId(target);
    playAppSound("click");

    if (target.kind === "unavailable") {
      addDelayedAlert(target.reason ?? "다운로드 가능한 파일 참조가 없습니다.");
      return;
    }

    if (target.kind === "optional_export") {
      if (!target.url?.trim()) {
        playAppSound("error");
        addDelayedAlert("열 수 있는 Drive 링크가 없습니다.");
        return;
      }
      window.open(target.url, "_blank", "noopener,noreferrer");
      playAppSound("success");
      return;
    }

    if (target.kind === "dynamic_md") {
      handleMarkdownExport();
      return;
    }

    if (target.kind !== "original_storage" && target.kind !== "result_storage") {
      return;
    }

    const refType = target.refType;
    const refIndex = target.refIndex;
    if (refType === undefined || refIndex === undefined) {
      playAppSound("error");
      addDelayedAlert("다운로드 가능한 파일 참조가 없습니다.");
      return;
    }

    try {
      setActiveTargetId(targetId);
      await downloadSubmissionFile(
        auth,
        submission.submissionId,
        refType,
        refIndex,
        target.fileName
      );
      playAppSound("success");
    } catch (err: unknown) {
      playAppSound("error");
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      addDelayedAlert(`다운로드 실패: ${message}`);
    } finally {
      setActiveTargetId(null);
    }
  };

  const handleDownloadTargetLegacy = async (target: DownloadTarget) => {
    if (target.kind !== "original_storage" && target.kind !== "result_storage") {
      return handleDownloadTargetDefault(target);
    }
    if (!onDownloadFileProp || target.refType === undefined || target.refIndex === undefined) {
      return handleDownloadTargetDefault(target);
    }

    const targetId = getDownloadTargetId(target);
    playAppSound("click");
    try {
      setActiveTargetId(targetId);
      await onDownloadFileProp(target.refType, target.refIndex, target.fileName);
      playAppSound("success");
    } catch (err: unknown) {
      playAppSound("error");
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      addDelayedAlert(`다운로드 실패: ${message}`);
    } finally {
      setActiveTargetId(null);
    }
  };

  const handleDownloadTarget =
    onDownloadTargetProp ?? (onDownloadFileProp ? handleDownloadTargetLegacy : handleDownloadTargetDefault);

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
    <div className="ux_modal_overlay" role="dialog" aria-modal="true">
      <div
        className="ux_modal_panel"
        style={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          padding: 0,
          backgroundColor: "#ffffff",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
        }}
      >
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
            className="ux_button ux_button_secondary ml-2 shrink-0 p-1 text-lg"
            style={{ height: "auto", background: "transparent", border: "none", color: "#9ca3af" }}
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
            onDownloadTarget={handleDownloadTarget}
            activeTargetId={activeTargetId}
            onMarkdownExport={handleMarkdownExport}
          />
        </div>

        {/* 푸터 */}
        <div className="shrink-0 border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="ux_button ux_button_secondary w-full"
            style={{
              height: "36px",
              backgroundColor: "#f3f4f6",
              borderRadius: "6px",
              fontSize: "12px",
            }}
          >
            창 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
