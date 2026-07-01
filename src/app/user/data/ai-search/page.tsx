// [page.tsx]
// 이 파일은 사용자가 자연어 질문을 입력하여 열람 권한 범위 내에 있는 문서를 근거로
// AI의 답변을 확인하고 인용 출처 카드 목록을 열람하는 AI 지식검색 페이지 컴포넌트입니다.
// 보안 규정: 비로그인 상태 및 로딩 시 API 차단을 보장하며, dangerouslySetInnerHTML를 지양하는
// 안전한 마크다운 파서 및 출처 카드 상세 모달(ExecutionResultDetailModal) 연동 구조를 채택합니다.
// 한국어 주석 표준을 준수합니다.

"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { getActiveAutomations } from "@/features/user/userService";
import { fetchWorkflowTemplatesByKeys } from "@/common/workflow/fetchWorkflowTemplatesByKeys";
import { resolveWorkflowDisplayName } from "@/common/workflow/resolveWorkflowDisplayName";
import type { ClientAutomation, WorkflowTemplate, Submission } from "@/types/n8lient";
import { ExecutionResultDetailModal } from "@/components/results/ExecutionResultDetailModal";
import { playAppSound } from "@/lib/appSound";
import { N8lientResultList } from "@/components/common/data/N8lientResultList";
import { N8lientResultCard } from "@/components/common/data/N8lientResultCard";

// 단순 마크다운 Subset 렌더러 컴포넌트 (dangerouslySetInnerHTML 금지 규칙 준수)
function SafeMarkdownRenderer({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", lineHeight: 1.6, fontSize: "14px", color: "#374151" }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Headers
        if (trimmed.startsWith("### ")) {
          return <h5 key={idx} style={{ fontSize: "15px", fontWeight: 700, margin: "12px 0 4px 0", color: "#111827" }}>{trimmed.slice(4)}</h5>;
        }
        if (trimmed.startsWith("## ")) {
          return <h4 key={idx} style={{ fontSize: "16px", fontWeight: 700, margin: "16px 0 6px 0", color: "#111827" }}>{trimmed.slice(3)}</h4>;
        }
        if (trimmed.startsWith("# ")) {
          return <h3 key={idx} style={{ fontSize: "18px", fontWeight: 700, margin: "20px 0 8px 0", color: "#111827" }}>{trimmed.slice(2)}</h3>;
        }

        // List items
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={idx} style={{ display: "flex", gap: "6px", paddingLeft: "12px" }}>
              <span>•</span>
              <span>{renderBoldTokens(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Plain line (with potential bold rendering)
        return <p key={idx} style={{ margin: 0 }}>{renderBoldTokens(trimmed)}</p>;
      })}
    </div>
  );
}

// 굵은 글씨 (**text**) 토큰 렌더링 유틸
function renderBoldTokens(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index} style={{ fontWeight: 700, color: "#111827" }}>{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </>
  );
}

import { useRouter } from "next/navigation";

export default function AIKnowledgeSearchPage() {
  const { user, userDoc, loading } = useAuthUser();
  const router = useRouter();

  // 검색 조건 필터 상태
  const [query, setQuery] = useState("");
  const [accessScope, setAccessScope] = useState<"all" | "mine" | "company">("all");
  const [workflowKey, setWorkflowKey] = useState("");
  const [startDateStr, setStartDateStr] = useState("");
  const [endDateStr, setEndDateStr] = useState("");
  const [maxSources, setMaxSources] = useState(5);

  // UI 바인딩용 워크플로우 목록 및 템플릿 정보
  const [automations, setAutomations] = useState<ClientAutomation[]>([]);
  const [templates, setTemplates] = useState<Record<string, WorkflowTemplate>>({});

  // AI 응답 결과 상태
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // 상세 모달 상태
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 워크플로우 템플릿 캐시 로딩
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
        console.error("[ai-search-init-error] 워크플로우 목록 로드 실패:", err);
      });
  }, [userDoc?.clientId]);

  // AI 지식검색 실행 핸들러
  const handleAISearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !user || searching) return;

    if (!query.trim()) {
      alert("질문을 입력해 주세요.");
      return;
    }

    playAppSound("click");
    setSearching(true);
    setSearchError(null);
    setAiAnswer(null);
    setSources([]);
    setUsage(null);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/knowledge/ai-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          query,
          accessScope,
          workflowKey,
          startDateStr,
          endDateStr,
          maxSources,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAiAnswer(data.answer);
        setSources(data.sources || []);
        setUsage(data.usage || null);
        playAppSound("success");
      } else {
        setSearchError(data.error || "AI 답변 생성 중 오류가 발생했습니다.");
        playAppSound("error");
      }
    } catch (err) {
      console.error("[ai-search-fetch-error]", err);
      setSearchError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      playAppSound("error");
    } finally {
      setSearching(false);
    }
  };

  // 필터 리셋
  const handleResetFilters = () => {
    playAppSound("click");
    setQuery("");
    setWorkflowKey("");
    setStartDateStr("");
    setEndDateStr("");
    setMaxSources(5);
    setAccessScope("all");
  };

  // 출처 카드 클릭 상세 모달 조회 대신 새 뷰어로 이동
  const handleCardClick = (submissionId: string) => {
    playAppSound("click");
    router.push(`/user/data/view/${submissionId}`);
  };

  const formatDisplayDate = (createdAt: any) => {
    if (!createdAt) return "";
    let date: Date;
    if (createdAt.seconds !== undefined) {
      date = new Date(createdAt.seconds * 1000);
    } else {
      date = new Date(createdAt);
    }
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 개별 출처 카드 렌더러 함수
  const renderSourceCard = (srcDoc: any, idx: number) => {
    const isCompany = srcDoc.accessMode === "company";
    const workflowDisplayName = srcDoc.workflowName || srcDoc.workflowKey || "알 수 없는 자동화";

    return (
      <N8lientResultCard
        key={srcDoc.submissionId}
        onClick={() => !loadingDetail && handleCardClick(srcDoc.submissionId)}
        badges={
          <>
            <span style={{ fontSize: "11px", fontWeight: 700, backgroundColor: "#f3f4f6", color: "#4b5563", padding: "2px 6px", borderRadius: "4px" }}>
              [자료번호 {idx + 1}] {workflowDisplayName}
            </span>
            <span style={{ fontSize: "11px", fontWeight: 700, backgroundColor: isCompany ? "#d1fae5" : "#eff6ff", color: isCompany ? "#065f46" : "#1d4ed8", padding: "2px 6px", borderRadius: "4px" }}>
              {isCompany ? "🏢 회사 공개" : "🔒 개인 보관"}
            </span>
          </>
        }
        title={
          <div className="ux_table_text_ellipsis" title={srcDoc.title || ""}>
            {srcDoc.title}
          </div>
        }
        description={srcDoc.summary}
        meta={
          <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
            <span>⏱️ {formatDisplayDate(srcDoc.createdAt)}</span>
          </div>
        }
      />
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
        <span>사용자 인증 정보를 불러오는 중입니다...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#ef4444" }}>
        <span>⚠️ 로그인 후 이용할 수 있습니다.</span>
      </div>
    );
  }

  return (
    <div style={{ boxSizing: "border-box", minWidth: 0, paddingBottom: "40px" }}>
      {/* 타이틀 및 소개 헤더 */}
      <div style={{ marginBottom: "20px" }}>
        <h2 className="ux_page_title" style={{ fontSize: "18px", margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: "8px" }}>
          🧠 AI 지식검색 (MVP)
        </h2>
        <p className="ux_caption" style={{ margin: 0 }}>
          내가 보유한 권한 범위의 실행 결과 자료를 기반으로 자연어 질문에 대한 근거 있는 답변을 얻습니다.
        </p>
      </div>

      {/* 비용 안내 공지 */}
      <div
        className="ux_alert ux_alert_warning"
        style={{
          fontSize: "12px",
          marginBottom: "16px",
          backgroundColor: "#fffbeb",
          border: "1px solid #fde68a",
          color: "#b45309",
          padding: "10px 14px",
          borderRadius: "8px",
        }}
      >
        ℹ️ AI 지식검색은 선택된 자료를 바탕으로 답변을 생성하며, 사용량에 따라 AI 비용이 발생할 수 있습니다.
      </div>

      {/* 질문 입력 및 필터 영역 */}
      <form onSubmit={handleAISearch} style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <textarea
            className="ux_input"
            rows={3}
            maxLength={500}
            placeholder="자료에 대해 궁금한 점을 질문해 보세요... (최대 500자)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              fontSize: "14px",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
              resize: "vertical",
              lineHeight: 1.45,
            }}
          />
        </div>

        {/* 세부 필터 (탭, 날짜, 카테고리) 영역 */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
          }}
        >
          {/* 탭 스타일의 권한 범위 선택 UI */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>공개 범위 설정</span>
            <div style={{ display: "flex", gap: "6px", backgroundColor: "#f3f4f6", padding: "3px", borderRadius: "8px", width: "fit-content" }}>
              {[
                { key: "all", label: "전체 나열" },
                { key: "mine", label: "나만의 결과" },
                { key: "company", label: "회사 공개자료" },
              ].map((scope) => {
                const isSelected = accessScope === scope.key;
                return (
                  <button
                    key={scope.key}
                    type="button"
                    onClick={() => {
                      playAppSound("click");
                      setAccessScope(scope.key as any);
                    }}
                    style={{
                      border: "none",
                      backgroundColor: isSelected ? "#ffffff" : "transparent",
                      color: isSelected ? "#1e3a8a" : "#4b5563",
                      fontWeight: isSelected ? 700 : 500,
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      cursor: "pointer",
                      boxShadow: isSelected ? "0 1px 3px 0 rgba(0, 0, 0, 0.08)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {scope.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* 워크플로우 분류 필터 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>워크플로우 분류</label>
              <select
                className="ux_select"
                value={workflowKey}
                onChange={(e) => setWorkflowKey(e.target.value)}
                style={{ height: "34px", fontSize: "12.5px", padding: "0 8px", borderRadius: "6px" }}
              >
                <option value="">전체 워크플로우</option>
                {automations.map((a) => (
                  <option key={a.automationId} value={a.workflowKey}>
                    {resolveWorkflowDisplayName({
                      template: templates[a.workflowKey],
                      automation: a,
                      workflowKey: a.workflowKey,
                    })}
                  </option>
                ))}
              </select>
            </div>

            {/* 기간 검색 필터 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>실행 완료일 범위</label>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  type="date"
                  className="ux_input"
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  style={{ height: "34px", fontSize: "12px", padding: "0 8px", borderRadius: "6px", flex: 1 }}
                />
                <span style={{ fontSize: "12px", color: "#9ca3af" }}>~</span>
                <input
                  type="date"
                  className="ux_input"
                  value={endDateStr}
                  onChange={(e) => setEndDateStr(e.target.value)}
                  style={{ height: "34px", fontSize: "12px", padding: "0 8px", borderRadius: "6px", flex: 1 }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", borderTop: "1px solid #f3f4f6", paddingTop: "12px" }}>
            {/* 참고 자료 개수 설정 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>참고 자료 한도 (최대)</label>
              <select
                className="ux_select"
                value={maxSources}
                onChange={(e) => setMaxSources(parseInt(e.target.value, 10))}
                style={{ height: "34px", fontSize: "12.5px", padding: "0 8px", borderRadius: "6px" }}
              >
                <option value={3}>3개</option>
                <option value={5}>5개</option>
                <option value={8}>8개</option>
              </select>
            </div>

            {/* 초기화 및 실행 버튼 */}
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="ux_button ux_button_secondary"
                onClick={handleResetFilters}
                style={{ height: "34px", padding: "0 14px", borderRadius: "6px", fontSize: "13px" }}
              >
                필터 초기화
              </button>
              <button
                type="submit"
                className="ux_button ux_button_primary"
                disabled={searching || !query.trim()}
                style={{ height: "34px", padding: "0 18px", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}
              >
                {searching ? "답변 생성 중..." : "AI로 답변 받기"}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* 에러 메시지 알림 */}
      {searchError && (
        <div className="ux_alert ux_alert_danger" style={{ marginBottom: "20px" }}>
          ⚠️ {searchError}
        </div>
      )}

      {/* 로딩 인디케이터 */}
      {searching && (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "#6b7280" }}>
          <span style={{ fontSize: "13.5px", fontWeight: 500 }}>
            질문과 관련된 근거 문서를 탐색하고 AI 요약 답변을 생성하고 있습니다. 잠시만 기다려 주세요...
          </span>
        </div>
      )}

      {/* AI 답변 영역 */}
      {!searching && aiAnswer && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "12px" }}>
          {/* 답변 본문 */}
          <div
            className="ux_card"
            style={{
              padding: "20px",
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 700, borderBottom: "1px solid #f3f4f6", paddingBottom: "10px", margin: "0 0 14px 0", color: "#111827" }}>
              💡 AI 답변 결과
            </h3>
            <SafeMarkdownRenderer text={aiAnswer} />
          </div>

          {/* 인용 출처 리스트 */}
          {sources.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#4b5563", paddingLeft: "4px", margin: 0 }}>
                📄 인용된 출처 자료 ({sources.length}건)
              </h3>
              <N8lientResultList
                items={sources}
                loading={false}
                renderItem={(item, idx) => renderSourceCard(item, idx)}
              />
            </div>
          )}
        </div>
      )}

      {/* 결과 상세 보기 모달 */}
      {showDetailModal && selectedSubmission && (
        <ExecutionResultDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedSubmission(null);
          }}
          submission={selectedSubmission}
          viewerRole="user"
        />
      )}
    </div>
  );
}

