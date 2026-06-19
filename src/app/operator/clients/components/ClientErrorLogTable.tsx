// 이 파일은 고객사의 오류 로그 전체 목록을 20개씩 페이징 처리하여 표(Table) 형태로 표시하고,
// 오류 보기 버튼 클릭 시 상세 모달 연결을 위해 콜백을 호출해 주는 서브 컴포넌트입니다.
// 한국어 주석 표준을 준수합니다.

"use client";

import React, { useEffect, useState, useCallback } from "react";
import type { Firestore } from "firebase/firestore";
import {
  fetchClientErrorLogsPage,
  type ClientErrorLogItem,
} from "@/features/operator/clientOperationStatusService";

interface ClientErrorLogTableProps {
  clientId: string;
  db: Firestore;
  onViewSubmission?: (submissionId: string) => void;
}

const ERROR_PAGE_SIZE = 20;

function formatCompactDateTime(value: unknown): string {
  let date: Date | null = null;

  if (value instanceof Date) {
    date = value;
  } else if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    date = value.toDate();
  } else if (typeof value === "string" || typeof value === "number") {
    date = new Date(value);
  }

  if (!date || Number.isNaN(date.getTime())) return "-";

  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");

  return `${yy}${mm}${dd} ${hh}:${mi}`;
}

export function ClientErrorLogTable({
  clientId,
  db,
  onViewSubmission,
}: ClientErrorLogTableProps) {
  const [items, setItems] = useState<ClientErrorLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 페이징 역사 관리 (이전 페이지 이동용)
  const [cursors, setCursors] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<any>(null);
  const [hasNext, setHasNext] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);

  const loadPage = useCallback(
    async (cursorDoc: any = null) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchClientErrorLogsPage(db, clientId, ERROR_PAGE_SIZE, cursorDoc);
        setItems(result.items);
        setNextCursor(result.nextCursor);
        setHasNext(result.hasNext);
      } catch (err: any) {
        console.error("[ClientErrorLogTable] 오류 로그 로드 실패:", err);
        setError("오류 로그를 불러오는 과정에서 오류가 발생했습니다. 복합 인덱스 생성이 필요할 수 있습니다.");
      } finally {
        setLoading(false);
      }
    },
    [clientId, db]
  );

  useEffect(() => {
    // 고객사 식별 ID가 바뀌면 첫 페이지로 초기화
    setCursors([]);
    setNextCursor(null);
    setHasNext(false);
    setPageIndex(0);
    loadPage(null);
  }, [clientId, loadPage]);

  const handleNextPage = async () => {
    if (!nextCursor || loading) return;
    const currentCursorDoc = nextCursor;
    setCursors((prev) => [...prev, currentCursorDoc]);
    setPageIndex((prev) => prev + 1);
    await loadPage(currentCursorDoc);
  };

  const handlePrevPage = async () => {
    if (pageIndex === 0 || loading) return;
    const prevHistory = [...cursors];
    prevHistory.pop(); // 현재 페이지 진입 시 사용했던 커서 제거
    const targetCursorDoc = prevHistory.length > 0 ? prevHistory[prevHistory.length - 1] : null;
    
    setCursors(prevHistory);
    setPageIndex((prev) => prev - 1);
    await loadPage(targetCursorDoc);
  };

  if (loading && items.length === 0) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center", color: "#4b5563", fontSize: "13.5px" }}>
        🔄 오류 로그 데이터를 페이징 조회 중입니다...
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "20px", color: "#b91c1c", fontSize: "13px" }}>
        <h4 style={{ fontWeight: 700, margin: "0 0 8px 0" }}>⚠️ 오류가 발생했습니다.</h4>
        <p style={{ margin: 0 }}>{error}</p>
        <button
          onClick={() => loadPage(null)}
          className="ux_button"
          style={{
            marginTop: "12px",
            backgroundColor: "#dc2626",
            color: "#ffffff",
            border: "none",
            borderRadius: "4px",
            padding: "6px 12px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          첫 페이지 새로고침
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#111111", margin: 0 }}>
          🚨 오류 로그 목록 (페이지: {pageIndex + 1})
        </h3>
        <button
          onClick={() => {
            setCursors([]);
            setPageIndex(0);
            loadPage(null);
          }}
          className="ux_button_compact ux_button_secondary"
          style={{ fontSize: "11px", height: "26px", padding: "0 8px" }}
        >
          🔄 새로고침
        </button>
      </div>

      {items.length === 0 ? (
        <div style={{ border: "1px dashed #d1d5db", borderRadius: "8px", padding: "32px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
          오류 로그가 없습니다.
        </div>
      ) : (
        <>
          <div className="ux_scroll_area" style={{ border: "1px solid #e5e7eb", borderRadius: "8px", backgroundColor: "#ffffff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", textAlign: "left" }}>
              <thead>
                <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb", color: "#4b5563", fontWeight: 600 }}>
                  <th style={{ padding: "10px 12px" }}>발생시각</th>
                  <th style={{ padding: "10px 12px" }}>워크플로우명</th>
                  <th style={{ padding: "10px 12px" }}>에러코드</th>
                  <th style={{ padding: "10px 12px" }}>사용자</th>
                  <th style={{ padding: "10px 12px", textAlign: "center" }}>상세</th>
                </tr>
              </thead>
              <tbody>
                {items.map((err) => (
                  <tr key={err.submissionId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap", fontFamily: "monospace" }}>
                      {formatCompactDateTime(err.createdAt)}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 600, color: "#111111" }}>{err.workflowName}</div>
                      <div style={{ fontSize: "10.5px", color: "#9ca3af" }}>{err.workflowKey}</div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span
                        className="ux_badge"
                        style={{
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor: "#fee2e2",
                          color: "#991b1b",
                          fontWeight: 600,
                        }}
                      >
                        {err.errorCode || "-"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#374151" }}>
                      {err.googleEmail}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => onViewSubmission?.(err.submissionId)}
                        className="ux_button_compact ux_button_secondary"
                        style={{ fontSize: "11px", height: "26px", padding: "0 8px" }}
                      >
                        오류 보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 이전/다음 페이지네이션 컨트롤 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
            <button
              onClick={handlePrevPage}
              disabled={pageIndex === 0 || loading}
              className="ux_button_compact ux_button_secondary"
              style={{ minWidth: "70px" }}
            >
              이전
            </button>
            <span style={{ fontSize: "12px", color: "#4b5563" }}>
              페이지 {pageIndex + 1}
            </span>
            <button
              onClick={handleNextPage}
              disabled={!hasNext || loading}
              className="ux_button_compact ux_button_secondary"
              style={{ minWidth: "70px" }}
            >
              다음
            </button>
          </div>
        </>
      )}
    </div>
  );
}
