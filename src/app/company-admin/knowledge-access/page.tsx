// [page.tsx]
// 이 파일은 회사 관리자가 소속 구성원들의 모든 실행 데이터의 공개 여부를 일괄 조회하고 철회 제어할 수 있는 화면입니다.
// 보안 규정: private 자료 본문 및 제목 마스킹, 인라인 스타일 지양 및 중앙 CSS 사용.
// 한국어 주석 표준을 준수합니다.

"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { playAppSound } from "@/lib/appSound";
import { N8lientFilterBar } from "@/components/common/data/N8lientFilterBar";
import { N8lientBulkActionBar } from "@/components/common/data/N8lientBulkActionBar";
import { N8lientLoadingState } from "@/components/common/data/N8lientLoadingState";
import { N8lientEmptyState } from "@/components/common/data/N8lientEmptyState";
import { N8lientStatusBadge } from "@/components/common/data/N8lientStatusBadge";

interface AdminKnowledgeItem {
  submissionId: string;
  title: string;
  ownerEmail: string;
  ownerName: string;
  workflowName: string;
  automationId: string;
  createdAt: string;
  accessMode: "private" | "company";
  accessModeUpdatedAt: string;
  canAdminRevokeCompanyAccess: boolean;
  viewerUrl: string | null;
}

export default function KnowledgeAccessPage() {
  const { user, loading: authLoading } = useAuthUser();

  // 목록 데이터 상태
  const [items, setItems] = useState<AdminKnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 검색/필터 상태
  const [searchTitle, setSearchTitle] = useState("");
  const [searchOwner, setSearchOwner] = useState("");
  const [filterAccessMode, setFilterAccessMode] = useState<"all" | "company" | "private">("all");
  const [filterWorkflow, setFilterWorkflow] = useState("all");

  // 선택된 항목들의 submissionId 목록
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // 데이터 조회 함수
  const fetchItems = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/knowledge/submission-access-admin/list", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setItems(result.items || []);
      } else {
        setError(result.error || "자료 공개 목록을 불러오지 못했습니다.");
      }
    } catch (err) {
      console.error("[fetch-knowledge-access-list-error]", err);
      setError("네트워크 통신 오류로 데이터를 조회할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchItems();
    }
  }, [user, authLoading]);

  // 자동화 분류 목록 동적 추출
  const workflowOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.workflowName) set.add(item.workflowName);
    });
    return Array.from(set);
  }, [items]);

  // 검색 및 필터 가공 처리
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(searchTitle.toLowerCase());
      const matchOwner =
        item.ownerName.toLowerCase().includes(searchOwner.toLowerCase()) ||
        item.ownerEmail.toLowerCase().includes(searchOwner.toLowerCase());
      const matchAccess = filterAccessMode === "all" || item.accessMode === filterAccessMode;
      const matchWork = filterWorkflow === "all" || item.workflowName === filterWorkflow;

      return matchTitle && matchOwner && matchAccess && matchWork;
    });
  }, [items, searchTitle, searchOwner, filterAccessMode, filterWorkflow]);

  // 체크박스 선택 처리
  const handleSelectAll = (checked: boolean) => {
    playAppSound("click");
    if (checked) {
      // 체크박스 활성 조건 충족하는 항목들만 자동 수집
      const revokableIds = filteredItems
        .filter((item) => item.accessMode === "company" && item.canAdminRevokeCompanyAccess)
        .map((item) => item.submissionId);
      setSelectedIds(revokableIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (submissionId: string, checked: boolean) => {
    playAppSound("click");
    if (checked) {
      setSelectedIds((prev) => [...prev, submissionId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== submissionId));
    }
  };

  // 일괄 공개 철회 처리
  const handleBulkRevoke = async () => {
    if (selectedIds.length === 0 || actionLoading || !user) return;

    const confirmMsg = `선택한 ${selectedIds.length}개의 회사 공개 자료를 개인 보관으로 철회하시겠습니까?`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    playAppSound("click");
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/knowledge/submission-access-admin/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          submissionIds: selectedIds,
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        playAppSound("success");
        // 실패 상세 메시지 수집 고지
        if (result.failureCount > 0) {
          const failReasons = result.results
            .filter((r: any) => !r.success)
            .map((r: any) => `- ID: ${r.submissionId} (${r.error || "권한 또는 정책 불가"})`)
            .join("\n");
          alert(`일괄 철회 결과:\n성공: ${result.successCount}건\n실패: ${result.failureCount}건\n\n[실패 원인 상세]\n${failReasons}`);
        } else {
          alert(`선택한 ${result.successCount}건의 자료가 성공적으로 개인 보관 철회 처리되었습니다.`);
        }
        // 선택 해제 및 목록 새로고침
        setSelectedIds([]);
        fetchItems();
      } else {
        alert(result.error || "일괄 철회 처리 중 오류가 발생했습니다.");
        playAppSound("error");
      }
    } catch (err) {
      console.error("[bulk-revoke-error]", err);
      alert("일괄 철회 API 호출 도중 네트워크 에러가 발생했습니다.");
      playAppSound("error");
    } finally {
      setActionLoading(false);
    }
  };

  // 포맷팅 헬퍼
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 체크박스 활성/비활성 판정
  const isCheckboxSelectable = (item: AdminKnowledgeItem) => {
    return item.accessMode === "company" && item.canAdminRevokeCompanyAccess;
  };

  const selectableFilteredCount = filteredItems.filter(isCheckboxSelectable).length;
  const isAllSelected =
    selectableFilteredCount > 0 &&
    filteredItems.filter(isCheckboxSelectable).every((item) => selectedIds.includes(item.submissionId));

  return (
    <div className="ux_page_layout">
      {/* 타이틀 영역 */}
      <div className="ux_page_header" style={{ marginBottom: "20px" }}>
        <h2 className="ux_page_title" style={{ fontSize: "18px", margin: "0 0 4px 0" }}>
          🛡️ 자료 공개 관리
        </h2>
        <p className="ux_caption" style={{ margin: 0 }}>
          소속 구성원들이 공개한 회사 지식 자료의 공개 상태를 확인하고, 정책에 맞춰 일괄 격리 철회(company ➔ private) 처리합니다.
        </p>
      </div>

      {/* 검색 및 필터 카드 */}
      <N8lientFilterBar style={{ marginBottom: "20px" }}>
        <div style={{ flex: "1 1 200px" }}>
          <label className="ux_input_label" style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 600 }}>자료 제목 검색</label>
          <input
            type="text"
            placeholder="제목 검색..."
            className="ux_input"
            value={searchTitle}
            onChange={(e) => setSearchTitle(e.target.value)}
          />
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <label className="ux_input_label" style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 600 }}>작성자 이름/이메일 검색</label>
          <input
            type="text"
            placeholder="작성자 검색..."
            className="ux_input"
            value={searchOwner}
            onChange={(e) => setSearchOwner(e.target.value)}
          />
        </div>
        <div style={{ flex: "1 1 150px" }}>
          <label className="ux_input_label" style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 600 }}>공개 상태 필터</label>
          <select
            className="ux_select"
            value={filterAccessMode}
            onChange={(e) => setFilterAccessMode(e.target.value as any)}
          >
            <option value="all">전체</option>
            <option value="company">🏢 회사 공개</option>
            <option value="private">🔒 개인 보관</option>
          </select>
        </div>
        <div style={{ flex: "1 1 150px" }}>
          <label className="ux_input_label" style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 600 }}>자동화 필터</label>
          <select
            className="ux_select"
            value={filterWorkflow}
            onChange={(e) => setFilterWorkflow(e.target.value)}
          >
            <option value="all">전체 자동화</option>
            {workflowOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </N8lientFilterBar>

      {/* 벌크 조작 컨트롤러 */}
      <N8lientBulkActionBar
        selectedCount={selectedIds.length}
        totalCount={filteredItems.length}
        style={{ marginBottom: "12px" }}
        actions={
          <button
            onClick={handleBulkRevoke}
            disabled={selectedIds.length === 0 || actionLoading}
            className="ux_button ux_button_danger"
            style={{ height: "32px", fontSize: "12.5px" }}
          >
            {actionLoading ? "철회 중..." : "선택 항목 회사 공개 철회"}
          </button>
        }
      />

      {error && (
        <div className="ux_alert ux_alert_danger" style={{ marginBottom: "20px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* 목록 테이블 카드 */}
      <div className="ux_table_wrap">
        {loading ? (
          <N8lientLoadingState message="자료 공개 목록을 불러오는 중..." />
        ) : filteredItems.length === 0 ? (
          <N8lientEmptyState
            title="조회된 공개 자료 내역이 없습니다."
            description="필터 및 검색 조건을 조정하거나 신규 공개 등록을 대기해 주세요."
            style={{ border: "none", boxShadow: "none" }}
          />
        ) : (
          <table className="ux_table">
            <thead>
              <tr>
                <th style={{ width: "40px", padding: "12px 16px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    disabled={selectableFilteredCount === 0}
                  />
                </th>
                <th>자료 제목</th>
                <th>작성자</th>
                <th>자동화 분류</th>
                <th>생성 시각</th>
                <th>공개상태</th>
                <th>공개범위 변경일</th>
                <th style={{ textAlign: "center", width: "80px" }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const selectable = isCheckboxSelectable(item);
                const isSelected = selectedIds.includes(item.submissionId);

                return (
                  <tr
                    key={item.submissionId}
                    className="ux_table_row_hover"
                    style={{
                      backgroundColor: isSelected ? "#eff6ff" : "transparent",
                    }}
                  >
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!selectable}
                        onChange={(e) => handleSelectRow(item.submissionId, e.target.checked)}
                        title={
                          item.accessMode === "private"
                            ? "이미 개인 보관 상태입니다."
                            : !item.canAdminRevokeCompanyAccess
                            ? "정책상 관리자 공개 철회가 비활성화된 항목입니다."
                            : ""
                        }
                      />
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {item.viewerUrl ? (
                        <a
                          href={item.viewerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ux_link"
                          style={{ fontWeight: 600 }}
                        >
                          {item.title}
                        </a>
                      ) : (
                        <span style={{ color: "#6b7280", fontStyle: "italic" }}>
                          🔒 {item.title}
                        </span>
                      )}
                    </td>
                    <td>
                      {item.ownerName} <span style={{ fontSize: "11px", color: "#9ca3af" }}>({item.ownerEmail})</span>
                    </td>
                    <td>
                      {item.workflowName}
                    </td>
                    <td>
                      {formatDate(item.createdAt)}
                    </td>
                    <td>
                      <N8lientStatusBadge type={item.accessMode}>
                        {item.accessMode === "company" ? "🏢 회사 공개" : "🔒 개인 보관"}
                      </N8lientStatusBadge>
                    </td>
                    <td>
                      {formatDate(item.accessModeUpdatedAt)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {item.viewerUrl ? (
                        <a
                          href={item.viewerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ux_button ux_button_secondary ux_button_compact"
                          style={{ fontSize: "11.5px", textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                        >
                          보기 ↗
                        </a>
                      ) : (
                        <span
                          className="ux_caption"
                          style={{ fontSize: "11px", color: "#9ca3af", cursor: "not-allowed" }}
                          title="비공개 자료이므로 열람할 수 없습니다."
                        >
                          🔒 차단
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
