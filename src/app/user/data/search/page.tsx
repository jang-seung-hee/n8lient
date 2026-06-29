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

export default function IntegratedSearchPage() {
  const { user, userDoc, loading } = useAuthUser();

  // 검색 조건 필터 상태
  const [query, setQuery] = useState("");
  const [accessScope, setAccessScope] = useState<"all" | "mine" | "company">("all");
  const [workflowKey, setWorkflowKey] = useState("");
  const [startDateStr, setStartDateStr] = useState("");
  const [endDateStr, setEndDateStr] = useState("");

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
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading || !user) return;

    playAppSound("click");
    setSearching(true);
    setSearchError(null);

    try {
      const idToken = await user.getIdToken();
      const gatewayBaseUrl = process.env.NEXT_PUBLIC_GATEWAY_BASE_URL || "";
      // API Route를 직접 태웁니다.
      const searchUrl = "/api/knowledge/search";

      const res = await fetch(searchUrl, {
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
          limit: 100, // 최대 100개 조회
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
  }, [loading, user, accessScope, workflowKey, startDateStr, endDateStr]);

  // 검색 결과 카드 클릭 시 상세 조회
  const handleCardClick = async (submissionId: string) => {
    if (!user) return;

    playAppSound("click");
    setLoadingDetail(true);
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
        setSelectedSubmission(data.submission);
        setShowDetailModal(true);
        playAppSound("success");
      } else {
        alert(data.error || "상세 데이터를 불러오지 못했습니다. 권한이 없을 수 있습니다.");
        playAppSound("error");
      }
    } catch (err) {
      console.error("[detail-fetch-error]", err);
      alert("상세 데이터 조회 중 네트워크 오류가 발생했습니다.");
      playAppSound("error");
    } finally {
      setLoadingDetail(false);
    }
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
        </div>
      </form>

      {/* 에러 발생 배너 */}
      {searchError && (
        <div className="ux_alert ux_alert_danger" style={{ marginBottom: "20px" }}>
          ⚠️ {searchError}
        </div>
      )}

      {/* 로딩 인디케이터 */}
      {searching && (
        <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
          <span style={{ fontSize: "13px" }}>검색 인덱스를 스캔하는 중입니다... 잠시만 기다려주세요.</span>
        </div>
      )}

      {/* 검색 결과 목록 */}
      {!searching && (
        <>
          {searchResults.length === 0 ? (
            <div
              className="ux_card"
              style={{
                padding: "48px 24px",
                textAlign: "center",
                color: "#6b7280",
                fontSize: "13.5px",
                borderStyle: "dashed",
                backgroundColor: "#f9fafb",
              }}
            >
              검색 조건에 맞는 자료가 없습니다. 검색어를 바꾸거나 날짜 필터를 넓혀보세요.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#4b5563", paddingLeft: "4px" }}>
                검색 결과 총 {searchResults.length}건
              </div>
              {searchResults.map((result) => {
                const workflowDisplayName = result.workflowName || result.workflowKey;
                const isCompany = result.accessMode === "company";

                return (
                  <div
                    key={result.submissionId}
                    onClick={() => !loadingDetail && handleCardClick(result.submissionId)}
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      padding: "16px",
                      cursor: loadingDetail ? "not-allowed" : "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.03)",
                      transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 1px 3px 0 rgba(0, 0, 0, 0.03)";
                    }}
                  >
                    {/* 카드 상단 헤더 (분류 및 배지) */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                    </div>

                    {/* 제목 */}
                    <h4 style={{ fontSize: "14.5px", fontWeight: 700, color: "#111111", margin: 0 }}>
                      {result.title}
                    </h4>

                    {/* 요약 내용 */}
                    {result.summary && (
                      <p style={{ fontSize: "12.5px", color: "#4b5563", margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {result.summary}
                      </p>
                    )}

                    {/* 키워드/태그 목록 */}
                    {result.keywords && result.keywords.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "2px" }}>
                        {result.keywords.slice(0, 5).map((kw: string, idx: number) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: "11px",
                              color: "#6b7280",
                              backgroundColor: "#f9fafb",
                              border: "1px solid #e5e7eb",
                              padding: "1px 6px",
                              borderRadius: "4px",
                            }}
                          >
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 카드 하단 메타정보 */}
                    <div
                      style={{
                        borderTop: "1px solid #f3f4f6",
                        paddingTop: "8px",
                        marginTop: "4px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "11.5px",
                        color: "#9ca3af",
                      }}
                    >
                      <span>
                        👤 {result.ownerName || result.ownerEmail || "알 수 없는 사용자"}
                      </span>
                      <span>
                        ⏱️ {formatDisplayDate(result.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
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
