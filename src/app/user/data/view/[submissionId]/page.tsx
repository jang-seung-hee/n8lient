// [page.tsx]
// 이 파일은 /user/data/view/[submissionId] 경로로 들어오는 실행 기록 본문 열람용 전용 페이지 컴포넌트입니다.
// 보안 규정: 서버 API를 통해 권한을 완벽히 점검하며, DTO 매핑을 통해 중요 정보가 노출되지 않도록 필터링합니다.
// 한국어 주석 표준을 준수합니다.

"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { getActiveAutomations } from "@/features/user/userService";
import { fetchWorkflowTemplatesByKeys } from "@/common/workflow/fetchWorkflowTemplatesByKeys";
import { resolveWorkflowDisplayName } from "@/common/workflow/resolveWorkflowDisplayName";
import { playAppSound } from "@/lib/appSound";
import { ResultDataViewerMeta } from "../../components/ResultDataViewerMeta";
import { ResultDataViewer } from "../../components/ResultDataViewer";
import type { SafeSubmissionViewDTO } from "../../components/ResultDataViewerMeta";
import { ExecutionResultDetailModal } from "@/components/results/ExecutionResultDetailModal";
import type { Submission, ClientAutomation, WorkflowTemplate } from "@/types/n8lient";

export default function SubmissionDataViewPage() {
  const { submissionId } = useParams() as { submissionId: string };
  const router = useRouter();
  const { user, userDoc, loading: authLoading } = useAuthUser();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [safeData, setSafeData] = useState<SafeSubmissionViewDTO | null>(null);

  // 워크플로우 템플릿 정보 조회용
  const [automations, setAutomations] = useState<ClientAutomation[]>([]);
  const [templates, setTemplates] = useState<Record<string, WorkflowTemplate>>({});

  // 기존 실행 리포트 상세 모달 표시 상태
  const [showReportModal, setShowReportModal] = useState(false);

  // 워크플로우 이름 매핑용 리스트 캐싱
  useEffect(() => {
    if (!userDoc?.clientId) return;

    getActiveAutomations(db, userDoc.clientId)
      .then(async (autos) => {
        setAutomations(autos);
        const tempMap = await fetchWorkflowTemplatesByKeys(
          db,
          autos.map((a) => a.workflowKey)
        );
        setTemplates(tempMap);
      })
      .catch((err) => {
        console.error("[data-view-init-error] 워크플로우 목록 로딩 오류:", err);
      });
  }, [userDoc?.clientId]);

  // 상세 데이터 조회 및 보안 DTO 매핑
  useEffect(() => {
    const fetchSubmissionDetail = async () => {
      if (authLoading) return;
      if (!user) {
        setError("로그인이 필요한 서비스입니다.");
        setLoading(false);
        return;
      }

      try {
        const idToken = await user.getIdToken();
        const detailUrl = `/api/knowledge/submission-detail?submissionId=${submissionId}`;

        const res = await fetch(detailUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        const data = await res.json();
        if (res.ok && data.success) {
          const rawSub: Submission = data.submission;
          setSubmission(rawSub);

          // 1. 소요 시간 텍스트 산출
          let durationText: string | null = null;
          const rawCreatedAt: any = rawSub.createdAt;
          const rawCompletedAt: any = rawSub.completedAt;
          if (rawCreatedAt && rawCompletedAt) {
            const startMs = rawCreatedAt.seconds !== undefined ? rawCreatedAt.seconds * 1000 : new Date(rawCreatedAt).getTime();
            const endMs = rawCompletedAt.seconds !== undefined ? rawCompletedAt.seconds * 1000 : new Date(rawCompletedAt).getTime();
            if (!isNaN(startMs) && !isNaN(endMs)) {
              const diffSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
              durationText = diffSec < 60 ? `소요시간 ${diffSec}초` : `소요시간 ${Math.floor(diffSec / 60)}분 ${diffSec % 60}초`;
            }
          }

          // 2. 제목 우선순위
          const title =
            rawSub.processorResult?.title ||
            rawSub.displayTitle ||
            rawSub.input?.submissionTitle ||
            "제목 없는 실행 결과";

          // 3. 요약 우선순위
          const summary = rawSub.processorResult?.summary || rawSub.result?.summary || "";

          // 4. 본문 우선순위
          const content = rawSub.processorResult?.content || rawSub.result?.summary || "";
          const mdContent = rawSub.processorResult?.mdContent || "";

          // 5. 해시태그 우선순위
          const hashtags = (rawSub.processorResult as any)?.hashtags || (rawSub as any)?.keywords || [];

          // 6. 액션 링크 구성
          const actionLinks: Array<{ label: string; url: string }> = [];
          if (rawSub.result?.resultUrl) {
            actionLinks.push({ label: "결과 확인 페이지", url: rawSub.result.resultUrl });
          }
          if (rawSub.processorResult?.structuredData?.actionLinks) {
            const links = rawSub.processorResult.structuredData.actionLinks;
            if (Array.isArray(links)) {
              links.forEach((l: any) => {
                if (l && l.url) {
                  actionLinks.push({ label: l.label || "참고 링크", url: l.url });
                }
              });
            }
          }

          // 7. 첨부 파일 구성 (물리 Storage 경로는 철저히 숨기고, index와 이름만 매핑)
          const originalFiles = (rawSub.originalFileRefs ?? []).map((ref, idx) => ({
            name: ref.fileName,
            index: idx,
          }));

          const resultFiles = (rawSub.resultRefs ?? []).map((ref: any, idx) => {
            const isDriveUrl = Boolean(ref.provider === "google_drive" || ref.type?.startsWith("optional_export") || ref.url);
            return {
              name: ref.fileName || `결과 파일_${idx}`,
              index: idx,
              isDriveUrl,
              url: ref.url || undefined,
            };
          });

          // DTO 생성
          const mappedDTO: SafeSubmissionViewDTO = {
            submissionId: rawSub.submissionId,
            workflowKey: rawSub.workflowKey || "",
            workflowName: "", // 아래에서 갱신 예정
            accessMode: (rawSub.accessMode as any) || "private",
            createdAt: rawSub.createdAt,
            ownerName: (rawSub as any).ownerName || (rawSub as any).ownerEmail || "작성자",
            ownerEmail: (rawSub as any).ownerEmail || "",
            title,
            summary,
            content,
            mdContent,
            hashtags,
            actionLinks,
            originalFiles,
            resultFiles,
            durationText,
            canChangeAccessMode: data.canChangeAccessMode || false, // 추가: 서버 최종 권한 연동
          };

          setSafeData(mappedDTO);
          playAppSound("success");
        } else {
          setError(data.error || "상세 데이터를 불러오지 못했습니다.");
          playAppSound("error");
        }
      } catch (err) {
        console.error("[fetch-submission-error]", err);
        setError("서버와의 통신 도중 에러가 발생했습니다.");
        playAppSound("error");
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissionDetail();
  }, [submissionId, authLoading, user]);

  // 워크플로우 이름 매핑 갱신
  useEffect(() => {
    if (safeData && automations.length > 0) {
      const matchAuto = automations.find((a) => a.workflowKey === safeData.workflowKey);
      const displayName = resolveWorkflowDisplayName({
        template: templates[safeData.workflowKey],
        automation: matchAuto,
        workflowKey: safeData.workflowKey,
      });
      setSafeData((prev) => prev ? { ...prev, workflowName: displayName } : null);
    }
  }, [safeData?.workflowKey, automations, templates]);

  // 공개범위 변경 API 호출 상태 핸들러
  const handleUpdateAccessMode = async (newMode: "private" | "company") => {
    if (!user || !safeData) return;

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/knowledge/submission-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          submissionId,
          accessMode: newMode,
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        // 성공 시 로컬 상태의 DTO 공개범위를 갱신하여 배지 즉시 교체
        setSafeData((prev) => prev ? { ...prev, accessMode: newMode } : null);
        playAppSound("success");
      } else {
        alert(result.error || "공개범위 변경에 실패했습니다.");
        playAppSound("error");
      }
    } catch (err) {
      console.error("[update-access-mode-error]", err);
      alert("네트워크 오류로 공개범위를 변경하지 못했습니다.");
      playAppSound("error");
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
        <span>자료의 보안 권한 및 본문을 안전하게 불러오고 있습니다...</span>
      </div>
    );
  }

  if (error || !safeData) {
    return (
      <div style={{ boxSizing: "border-box", paddingBottom: "40px" }}>
        <div className="ux_alert ux_alert_danger" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <h4 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>⚠️ 접근할 수 없는 데이터입니다</h4>
          <p style={{ margin: 0, fontSize: "13.5px", lineHeight: 1.5 }}>
            {error || "요청하신 자료가 없거나, 접근할 수 있는 권한(작성자 또는 동일 소속사 등)이 없습니다."}
          </p>
          <button
            onClick={() => {
              playAppSound("click");
              router.back();
            }}
            className="ux_button ux_button_secondary"
            style={{ width: "fit-content", marginTop: "8px", fontSize: "13px" }}
          >
            뒤로 가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ boxSizing: "border-box", paddingBottom: "40px" }}>
      {/* 뒤로가기 버튼 */}
      <div style={{ marginBottom: "16px" }}>
        <button
          onClick={() => {
            playAppSound("click");
            router.back();
          }}
          className="ux_button ux_button_secondary ux_button_compact"
          style={{ fontSize: "12.5px" }}
        >
          ◀ 목록으로 돌아가기
        </button>
      </div>

      {/* 상단 메타데이터 카드 및 디버그 토글 영역 */}
      <ResultDataViewerMeta
        data={safeData}
        onOpenReport={() => setShowReportModal(true)}
        onUpdateAccessMode={handleUpdateAccessMode} // 콜백 바인딩
      />

      {/* 본문 렌더링 영역 */}
      <ResultDataViewer data={safeData} />

      {/* 운영 리포트/디버그 상세 모달 (보조 링크 연동) */}
      {showReportModal && submission && (
        <ExecutionResultDetailModal
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false);
          }}
          submission={submission}
          viewerRole="user"
        />
      )}
    </div>
  );
}
