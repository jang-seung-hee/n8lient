// [page.tsx]
// 이 파일은 사용자가 권한 범위 내에 있는 N8Lient DB 처리 결과를 검색하고 요약 카드를 확인하며,
// 클릭 시 서버 보안 API(/api/knowledge/submission-detail)를 통해 상세 데이터를 호출하여
// 기존 결과 상세 모달(ExecutionResultDetailModal)로 열람할 수 있도록 지원하는 통합 자료검색 화면 컴포넌트입니다.
// 디자인: Premium UI 디자인 규격을 준수하여, 세련된 HSL 블루 테마, 매끄러운 탭 전환 애니메이션, 호버 micro-animations를 제공합니다.
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

import { useRouter } from "next/navigation";

export default function IntegratedSearchPage() {
  const { user, userDoc, loading } = useAuthUser();
  const router = useRouter();

  // 검색 조건 필터 상태
  const [query, setQuery] = useState("");
  const [accessScope, setAccessScope] = useState<"all" | "mine" | "company">("all");
  const [workflowKey, setWorkflowKey] = useState("");
  const [startDateStr, setStartDateStr] = useState("");
  const [endDateStr, setEndDateStr] = useState("");
  const [sortOption, setSortOption] = useState<"latest" | "oldest" | "accuracy">("latest");
  const [groupByWorkflow, setGroupByWorkflow] = useState(false);

  // UI 바인딩용 워크플로우 목록 및 템플릿 정보
  const [automations, setAutomations] = useState<ClientAutomation[]>([]);
  const [templates, setTemplates] = useState<Record<string, WorkflowTemplate>>({});

  // 결과 데이터 상태
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // 상세 모달 상태
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 워크플로우 템플릿 이름 매핑용 캐시 로드
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
        console.error("[search-page-init-error] 워크플로우 목록 로드 중 에러:", err);
      });
  }, [userDoc?.clientId]);

  // 검색 트리거 함수
  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    if (loading || !user) return;

    const activeQuery = overrideQuery !== undefined ? overrideQuery : query;

    playAppSound("click");
    setSearching(true);
    setSearchError(null);

    try {
      const idToken = await user.getIdToken();
      // API Route를 직접 태웁니다.
      const searchUrl = "/api/knowledge/search";

      const res = await fetch(searchUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          query: activeQuery,
          accessScope,
          workflowKey,
          startDateStr,
          endDateStr,
          limit: 100, // 최대 100개 조회
          sortOption,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSearchResults(data.results || []);
        playAppSound("success");
      } else {
        setSearchError(data.error || "검색 결과를 불러오는 데 실패했습니다.");
        playAppSound("error");
      }
    } catch (err: any) {
      console.error("[search-api-network-error]", err);
      setSearchError("네트워크 오류가 발생했습니다.");
      playAppSound("error");
    } finally {
      setSearching(false);
    }
  };

  // 마운트 시 최초 자동 스캔
  useEffect(() => {
    if (!loading && user) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, accessScope, workflowKey, startDateStr, endDateStr, sortOption]);

  // 검색 결과 카드 클릭 시 새 뷰어 페이지로 라우팅 이동
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

  // 소요시간 계산 함수
  const getDurationText = (createdAt: any, completedAt: any): string | null => {
    if (!createdAt || !completedAt) return null;
    try {
      const startMs = createdAt.seconds !== undefined ? createdAt.seconds * 1000 : new Date(createdAt).getTime();
      const endMs = completedAt.seconds !== undefined ? completedAt.seconds * 1000 : new Date(completedAt).getTime();
      
      if (isNaN(startMs) || isNaN(endMs)) return null;
      
      const diffSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
      if (diffSec < 60) {
        return `소요시간 ${diffSec}초`;
      } else {
        const min = Math.floor(diffSec / 60);
        const sec = diffSec % 60;
        return `소요시간 ${min}분 ${sec}초`;
      }
    } catch {
      return null;
    }
  };

  // 검색어 하이라이트 함수 (React node split 방식, dangerouslySetInnerHTML 금지)
  const HighlightText = ({ text, search }: { text: string; search: string }) => {
    if (!text) return null;
    if (!search || !search.trim()) return <>{text}</>;

    // 정규식 특수 문자 이스케이프 처리
    const escapedSearch = search.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`(${escapedSearch})`, "gi");
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <mark key={index} className="search-highlight">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // 필터 초기화 함수
  const handleResetFilters = () => {
    playAppSound("click");
    setQuery("");
    setWorkflowKey("");
    setStartDateStr("");
    setEndDateStr("");
    setSortOption("latest");
    setGroupByWorkflow(false);
  };

  // 태그 클릭 퀵 필터링 함수
  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation(); // 카드 클릭 모달 팝업 방지
    setQuery(tag);
    handleSearch(undefined, tag);
  };

  // 개별 카드 공통 렌더링 함수
  const renderCard = (result: any) => {
    const workflowDisplayName = result.workflowName || result.workflowKey;
    const isCompany = result.accessMode === "company";
    const durationText = getDurationText(result.createdAt, result.completedAt);

    return (
      <N8lientResultCard
        key={result.submissionId}
        onClick={() => !loadingDetail && handleCardClick(result.submissionId)}
        badges={
          <>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                backgroundColor: "#f3f4f6",
                color: "#4b5563",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              📂 {workflowDisplayName}
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                backgroundColor: isCompany ? "#d1fae5" : "#eff6ff",
                color: isCompany ? "#065f46" : "#1d4ed8",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              {isCompany ? "🏢 회사 공개" : "🔒 개인 보관"}
            </span>
          </>
        }
        title={<HighlightText text={result.title} search={query} />}
        description={
          result.summary && (
            <HighlightText text={result.summary} search={query} />
          )
        }
        tags={result.keywords || []}
        onTagClick={handleTagClick}
        meta={
          <>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span>
                👤 {result.ownerName || result.ownerEmail || "알 수 없는 사용자"}
              </span>
              {durationText && (
                <span style={{ color: "#4b5563", fontWeight: 500 }}>
                  {durationText}
                </span>
              )}
            </div>
            <span>
              ⏱️ {formatDisplayDate(result.createdAt)}
            </span>
          </>
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
          🔍 통합 자료검색
        </h2>
        <p className="ux_caption" style={{ margin: 0 }}>
          자동화 실행 결과 중 내가 조회 권한을 가지고 있는 저장 문서를 쉽고 빠르게 통합 검색합니다.
        </p>
      </div>

      {/* 검색창 폼 영역 */}
      <form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            className="ux_input"
            placeholder="검색어를 입력해 주세요... (N-Gram 부분 매칭 및 키워드 매칭)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              height: "42px",
              borderRadius: "8px",
              padding: "0 14px",
              border: "1px solid #d1d5db",
              fontSize: "14px",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            }}
          />
          <button
            type="submit"
            className="ux_button ux_button_primary"
            disabled={searching}
            style={{
              height: "42px",
              padding: "0 20px",
              borderRadius: "8px",
              border: "none",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            {searching ? "검색 중..." : "검색"}
          </button>
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
            {/* 정렬 옵션 필터 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>정렬 기준</label>
              <select
                className="ux_select"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                style={{ height: "34px", fontSize: "12.5px", padding: "0 8px", borderRadius: "6px" }}
              >
                <option value="latest">최신순</option>
                <option value="oldest">오래된순</option>
                <option value="accuracy">정확도순</option>
              </select>
            </div>

            {/* 그룹핑 토글 필터 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", justifyContent: "center" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563", marginBottom: "4px" }}>보기 설정</label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "#374151" }}>
                <input
                  type="checkbox"
                  checked={groupByWorkflow}
                  onChange={(e) => setGroupByWorkflow(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <span>워크플로우별로 모아보기</span>
              </label>
            </div>
          </div>
        </div>
      </form>

      {/* 에러 발생 배너 */}
      {searchError && (
        <div className="ux_alert ux_alert_danger" style={{ marginBottom: "20px" }}>
          ⚠️ {searchError}
        </div>
      )}

      {/* 검색 결과 목록 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {searchResults.length > 0 && !searching && (
          <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#4b5563", paddingLeft: "4px" }}>
            검색 결과 총 {searchResults.length}건
          </div>
        )}

        {(() => {
          if (groupByWorkflow) {
            // 워크플로우별 그룹화 수행
            const groups: Record<string, { name: string; items: any[] }> = {};
            searchResults.forEach((item) => {
              const key = item.workflowKey || "unknown";
              const name = item.workflowName || item.workflowKey || "기타 자동화";
              if (!groups[key]) {
                groups[key] = { name, items: [] };
              }
              groups[key].items.push(item);
            });

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {Object.entries(groups).map(([key, group]) => (
                  <div key={key} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <h3
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#374151",
                        borderBottom: "2px solid #e5e7eb",
                        paddingBottom: "6px",
                        margin: "0 0 4px 0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <span>{group.name}</span>
                      <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>{group.items.length}건</span>
                    </h3>
                    <N8lientResultList
                      items={group.items}
                      loading={searching}
                      emptyTitle="검색 조건에 맞는 자료가 없습니다."
                      emptyDescription="검색어를 줄이거나 필터를 초기화해 보세요."
                      renderItem={renderCard}
                    />
                  </div>
                ))}
              </div>
            );
          } else {
            return (
              <N8lientResultList
                items={searchResults}
                loading={searching}
                emptyTitle="검색 조건에 맞는 자료가 없습니다."
                emptyDescription="검색어를 줄이거나 필터를 초기화해 보세요."
                renderItem={renderCard}
              />
            );
          }
        })()}
      </div>

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

