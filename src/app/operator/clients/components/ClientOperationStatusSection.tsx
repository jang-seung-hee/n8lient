/**
 * 이 파일은 오퍼레이터가 특정 고객사의 운영 현황을 한눈에 모니터링할 수 있도록 돕는 UI 컴포넌트입니다.
 * 한국어 주석 표준을 준수합니다.
 */

"use client";

import { useEffect, useState } from "react";
import type { Firestore } from "firebase/firestore";
import {
  getClientOperationStatus,
  type ClientOperationStatus,
} from "@/features/operator/clientOperationStatusService";

interface ClientOperationStatusSectionProps {
  clientId: string;
  db: Firestore;
}

export function ClientOperationStatusSection({
  clientId,
  db,
}: ClientOperationStatusSectionProps) {
  const [data, setData] = useState<ClientOperationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 데이터 로드 함수
  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getClientOperationStatus(db, clientId);
      setData(result);
    } catch (err: any) {
      console.error("[ClientOperationStatusSection] 데이터 로드 실패:", err);
      setError("운영 현황을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [clientId, db]);

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "32px",
          marginTop: "16px",
          textAlign: "center",
          color: "#4b5563",
          fontSize: "13.5px",
        }}
      >
        🔄 고객사 운영 현황 데이터를 분석 및 집계하는 중입니다...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          backgroundColor: "#fef2f2",
          border: "1px solid #fca5a5",
          borderRadius: "8px",
          padding: "20px",
          marginTop: "16px",
          color: "#b91c1c",
          fontSize: "13px",
        }}
      >
        <h4 style={{ fontWeight: 700, margin: "0 0 8px 0" }}>⚠️ 오류가 발생했습니다.</h4>
        <p style={{ margin: 0 }}>{error || "운영 현황을 불러오지 못했습니다."}</p>
        <button
          onClick={loadStatus}
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
          다시 시도
        </button>
      </div>
    );
  }

  const { userSummary, contractSummary, submissionSummary, recentErrors } = data;

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "20px",
        marginTop: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {/* 타이틀 및 가이드 */}
      <div
        style={{
          borderBottom: "1px solid #f3f4f6",
          paddingBottom: "12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#111111", margin: 0 }}>
            📊 운영 현황
          </h3>
          <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0 0" }}>
            고객사 운영 상태를 확인하기 위한 요약 정보입니다. 개인정보와 실행 결과 본문은 표시하지 않습니다.
          </p>
        </div>
        <button
          onClick={loadStatus}
          style={{
            backgroundColor: "#f3f4f6",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "11px",
            color: "#374151",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          🔄 새로고침
        </button>
      </div>

      {/* 4분할 통계 요약 카드 그리드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        
        {/* 1. 사용자 현황 카드 */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "16px", backgroundColor: "#f9fafb" }}>
          <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#4b5563", margin: "0 0 12px 0" }}>👥 사용자 현황</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12.5px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>전체 사용자</span>
              <span style={{ fontWeight: 600, color: "#111111" }}>{userSummary.totalUsers} 명</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>승인 완료</span>
              <span style={{ fontWeight: 600, color: "#10b981" }}>{userSummary.approvedUsers} 명</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>승인 대기</span>
              <span style={{ fontWeight: 600, color: "#d97706" }}>{userSummary.pendingUsers} 명</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>관리자 지정</span>
              <span style={{ fontWeight: 600, color: userSummary.hasCompanyAdmin ? "#2563eb" : "#dc2626" }}>
                {userSummary.hasCompanyAdmin ? "완료" : "미지정"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #e5e7eb", paddingTop: "6px", marginTop: "2px" }}>
              <span style={{ color: "#6b7280" }}>가입요청 대기</span>
              <span style={{ fontWeight: 600, color: "#111111" }}>{userSummary.recentJoinRequests} 건</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>취소/반려</span>
              <span style={{ fontWeight: 600, color: "#6b7280" }}>{userSummary.cancelledOrRejectedRequests} 건</span>
            </div>
          </div>
        </div>

        {/* 2. 계약 자동화 현황 카드 */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "16px", backgroundColor: "#f9fafb" }}>
          <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#4b5563", margin: "0 0 12px 0" }}>📜 계약 자동화 현황</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12.5px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>전체 계약</span>
              <span style={{ fontWeight: 600, color: "#111111" }}>{contractSummary.totalContracts} 건</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>운영 계약</span>
              <span style={{ fontWeight: 600, color: "#111111" }}>{contractSummary.productionContracts} 건</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>테스트 계약</span>
              <span style={{ fontWeight: 600, color: "#6b7280" }}>{contractSummary.testContracts} 건</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #e5e7eb", paddingTop: "6px", marginTop: "2px" }}>
              <span style={{ color: "#6b7280" }}>활성 자동화</span>
              <span style={{ fontWeight: 600, color: "#10b981" }}>{contractSummary.activeAutomations} 건</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>비활성 자동화</span>
              <span style={{ fontWeight: 600, color: "#dc2626" }}>{contractSummary.inactiveAutomations} 건</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>설정 미완료</span>
              <span style={{ fontWeight: 600, color: "#d97706" }}>{contractSummary.incompleteAutomations} 건</span>
            </div>
          </div>
        </div>

        {/* 3. 최근 300건 실행 현황 카드 */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "16px", backgroundColor: "#f9fafb" }}>
          <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#4b5563", margin: "0 0 12px 0" }}>⚡ 실행 현황</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12.5px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>최근 7일 실행</span>
              <span style={{ fontWeight: 600, color: "#111111" }}>{submissionSummary.recent7Days} 건</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>최근 30일 실행</span>
              <span style={{ fontWeight: 600, color: "#111111" }}>{submissionSummary.recent30Days} 건</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #e5e7eb", paddingTop: "6px", marginTop: "2px" }}>
              <span style={{ color: "#6b7280" }}>성공 / 실패 / 처리중</span>
              <span style={{ fontWeight: 600, color: "#111111" }}>
                <span style={{ color: "#10b981" }}>{submissionSummary.successCount}</span> /{" "}
                <span style={{ color: "#ef4444" }}>{submissionSummary.failedCount}</span> /{" "}
                <span style={{ color: "#3b82f6" }}>{submissionSummary.processingCount}</span>
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>성공률</span>
              <span style={{ fontWeight: 700, color: submissionSummary.successRate !== null && submissionSummary.successRate >= 90 ? "#10b981" : "#d97706" }}>
                {submissionSummary.successRate !== null ? `${submissionSummary.successRate}%` : "-"}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", borderTop: "1px dashed #e5e7eb", paddingTop: "6px", marginTop: "2px" }}>
              <span style={{ color: "#6b7280", fontSize: "11px" }}>최근 실행: {submissionSummary.lastSubmittedAt ? new Date(submissionSummary.lastSubmittedAt).toLocaleString() : "-"}</span>
              <span style={{ color: "#ef4444", fontSize: "11px" }}>최근 실패: {submissionSummary.lastFailedAt ? new Date(submissionSummary.lastFailedAt).toLocaleString() : "-"}</span>
            </div>
          </div>
        </div>

      </div>

      {/* 쿼리 제약 설명 하단 문구 */}
      <div style={{ fontSize: "11px", color: "#9ca3af", textAlign: "right", marginTop: "-12px" }}>
        ℹ️ {submissionSummary.basisLabel}
      </div>

      {/* 사내 사용자 및 계약 세부 목록 (2열 구성) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "4px" }}>
        
        {/* 사용자 목록 패널 */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "16px" }}>
          <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#111111", margin: "0 0 10px 0", borderBottom: "1px solid #f3f4f6", paddingBottom: "6px" }}>
            👥 소속 사용자 목록
          </h4>
          {userSummary.usersList.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0, padding: "8px 0" }}>사용자 없음</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "150px", overflowY: "auto" }}>
              {userSummary.usersList.slice(0, 10).map((user) => (
                <div key={user.uid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", padding: "4px 0" }}>
                  <span style={{ fontWeight: 600, color: "#374151" }}>
                    {user.maskedName} ({user.maskedEmail})
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      backgroundColor: user.role === "company_admin" ? "#dbeafe" : "#f3f4f6",
                      color: user.role === "company_admin" ? "#1e40af" : "#4b5563",
                    }}
                  >
                    {user.role === "company_admin" ? "관리자" : "일반"}
                  </span>
                </div>
              ))}
              {userSummary.usersList.length > 10 && (
                <div style={{ fontSize: "11px", color: "#9ca3af", textAlign: "center", paddingTop: "4px" }}>
                  ...외 {userSummary.usersList.length - 10}명의 사용자가 더 존재합니다. (최대 10명 표시)
                </div>
              )}
            </div>
          )}
        </div>

        {/* 활성 자동화 목록 패널 */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "16px" }}>
          <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#111111", margin: "0 0 10px 0", borderBottom: "1px solid #f3f4f6", paddingBottom: "6px" }}>
            ⚙️ 설정된 자동화 목록
          </h4>
          {contractSummary.automationsList.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0, padding: "8px 0" }}>계약된 자동화 없음</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "150px", overflowY: "auto" }}>
              {contractSummary.automationsList.slice(0, 10).map((auto) => (
                <div key={auto.automationId} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: "12px", padding: "4px 0" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 600, color: "#374151" }}>{auto.automationName}</span>
                    <span style={{ fontSize: "11px", color: "#9ca3af" }}>Key: {auto.workflowKey}</span>
                  </div>
                  <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: "9.5px",
                        fontWeight: 600,
                        padding: "1px 4px",
                        borderRadius: "3px",
                        backgroundColor: auto.enabled ? "#d1fae5" : "#fee2e2",
                        color: auto.enabled ? "#065f46" : "#991b1b",
                      }}
                    >
                      {auto.enabled ? "활성" : "비활성"}
                    </span>
                    <span
                      style={{
                        fontSize: "9.5px",
                        fontWeight: 600,
                        padding: "1px 4px",
                        borderRadius: "3px",
                        backgroundColor: auto.contractMode === "production" ? "#e0f2fe" : "#fef3c7",
                        color: auto.contractMode === "production" ? "#0369a1" : "#d97706",
                      }}
                    >
                      {auto.contractMode === "production" ? "운영" : "테스트"}
                    </span>
                  </div>
                </div>
              ))}
              {contractSummary.automationsList.length > 10 && (
                <div style={{ fontSize: "11px", color: "#9ca3af", textAlign: "center", paddingTop: "4px" }}>
                  ...외 {contractSummary.automationsList.length - 10}개의 자동화가 더 존재합니다. (최대 10개 표시)
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* 4. 최근 오류 목록 (테이블) */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "16px", marginTop: "4px" }}>
        <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#111111", margin: "0 0 10px 0", borderBottom: "1px solid #f3f4f6", paddingBottom: "6px" }}>
          🚨 최근 오류 발생 내역 (최대 5건)
        </h4>
        {recentErrors.length === 0 ? (
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0, padding: "8px 0", textAlign: "center" }}>
            최근 오류 없음
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#4b5563", fontWeight: 600 }}>
                  <th style={{ padding: "6px 8px" }}>발생 시각</th>
                  <th style={{ padding: "6px 8px" }}>워크플로우명</th>
                  <th style={{ padding: "6px 8px" }}>에러코드</th>
                  <th style={{ padding: "6px 8px" }}>에러 메시지</th>
                  <th style={{ padding: "6px 8px" }}>실행 사용자</th>
                </tr>
              </thead>
              <tbody>
                {recentErrors.map((err) => (
                  <tr key={err.submissionId} style={{ borderBottom: "1px solid #f3f4f6", color: "#374151" }}>
                    <td style={{ padding: "8px 8px", whiteSpace: "nowrap" }}>
                      {err.createdAt ? new Date(err.createdAt).toLocaleString() : "-"}
                    </td>
                    <td style={{ padding: "8px 8px" }}>
                      <div style={{ fontWeight: 600 }}>{err.workflowName}</div>
                      <div style={{ fontSize: "10.5px", color: "#9ca3af" }}>{err.workflowKey}</div>
                    </td>
                    <td style={{ padding: "8px 8px", fontFamily: "monospace", color: "#b91c1c", fontWeight: 600 }}>
                      {err.errorCode}
                    </td>
                    <td style={{ padding: "8px 8px", color: "#4b5563", maxWidth: "250px", wordBreak: "break-all" }}>
                      {err.errorMessage}
                    </td>
                    <td style={{ padding: "8px 8px", color: "#4b5563" }}>
                      {err.maskedUser}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
