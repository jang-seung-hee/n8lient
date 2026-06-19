// 이 파일은 승인된 일반 사용자의 홈 화면을 나타냅니다.
// 회사 정보, 자주 쓰는 N8N 워크플로우 카드, 최근 실행 결과를 조밀하게 표시합니다.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { useAuthUser } from "@/features/auth/useAuthUser";
import { getActiveAutomations, subscribeMySubmissions } from "@/features/user/userService";
import { getMyCompanyPublicProfile } from "@/features/user/companyProfileService";
import { CompanyInfoModal } from "@/components/custom/CompanyInfoModal";
import type { ClientAutomation, Submission, ClientPublicProfile, WorkflowTemplate } from "@/types/n8lient";
import { getSubmissionDisplayTitle } from "@/common/submission/getSubmissionDisplayTitle";
import { fetchWorkflowTemplatesByKeys } from "@/common/workflow/fetchWorkflowTemplatesByKeys";
import { resolveWorkflowDisplayName } from "@/common/workflow/resolveWorkflowDisplayName";

export default function UserHome() {
  const { user, userDoc } = useAuthUser();
  const [automations, setAutomations] = useState<ClientAutomation[]>([]);
  const [templates, setTemplates] = useState<Record<string, WorkflowTemplate>>({});
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // 회사 공개 프로필 상태 추가
  const [profile, setProfile] = useState<ClientPublicProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [errorProfile, setErrorProfile] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !userDoc?.clientId) {
      setLoading(false);
      setLoadingProfile(false);
      return;
    }

    // 1. 활성 N8N 워크플로우 설정 조회
    getActiveAutomations(db, userDoc.clientId)
      .then(async (list) => {
        setAutomations(list.slice(0, 3));
        const templateMap = await fetchWorkflowTemplatesByKeys(
          db,
          list.map((auto) => auto.workflowKey)
        );
        setTemplates(templateMap);
      })
      .catch((err) => console.error("워크플로우 로드 실패:", err));

    // 2. 본인의 실행 결과 실시간 구독 (최근 3개)
    const unsubscribe = subscribeMySubmissions(
      db,
      user.uid,
      (list) => {
        setSubmissions(list.slice(0, 3));
        setLoading(false);
      },
      (err) => {
        console.error("실행결과 구독 에러:", err);
        setLoading(false);
      }
    );

    // 3. 회사 공개 프로필 조회
    setLoadingProfile(true);
    setErrorProfile(null);
    getMyCompanyPublicProfile(db, userDoc.clientId)
      .then((data) => {
        setProfile(data);
      })
      .catch((err) => {
        console.error("공개 프로필 로드 에러:", err);
        setErrorProfile("회사 정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        setLoadingProfile(false);
      });

    return () => unsubscribe();
  }, [user, userDoc]);

  return (
    <div style={{ boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>
      {/* 회사 및 승인 상태 카드 */}
      <section
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#111111", marginBottom: "2px" }}>
              소속 회사
            </h2>
            <div style={{ fontSize: "13px", color: "#4b5563", marginTop: "4px" }}>
              <button
                onClick={() => setModalOpen(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontWeight: 600,
                  padding: 0,
                  fontSize: "13px",
                  textAlign: "left",
                }}
              >
                {profile ? (profile.companyDisplayName || profile.companyName) : (loadingProfile ? "회사 정보를 불러오는 중입니다." : "표시 가능한 회사 정보가 아직 등록되지 않았습니다.")}
              </button>
            </div>
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              backgroundColor: "#d1fae5",
              color: "#065f46",
              padding: "4px 8px",
              borderRadius: "999px",
            }}
          >
            정상 승인됨
          </span>
        </div>
      </section>

      {/* 자주 쓰는 N8N 워크플로우 섹션 */}
      <section>
        <h3
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#4b5563",
            marginBottom: "8px",
          }}
        >
          배정된 N8N 워크플로우
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {loading ? (
            <div style={{ padding: "16px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
              불러오는 중...
            </div>
          ) : automations.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", color: "#6b7280", fontSize: "13px" }}>
              배정되거나 활성화된 N8N 워크플로우가 없습니다.
            </div>
          ) : (
            automations.map((auto) => (
              <div
                key={auto.automationId}
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#111111", marginBottom: "2px" }}>
                    {resolveWorkflowDisplayName({
                      template: templates[auto.workflowKey],
                      automation: auto,
                      workflowKey: auto.workflowKey,
                    })}
                  </h4>
                  <p style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.3, wordBreak: "break-word" }}>
                    Key: {auto.workflowKey}
                  </p>
                </div>
                <Link
                  href={`/user/execute?automationId=${encodeURIComponent(auto.automationId)}`}
                  style={{
                    height: "30px",
                    padding: "0 10px",
                    backgroundColor: "#111111",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 600,
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    textDecoration: "none",
                  }}
                >
                  이동
                </Link>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 최근 실행 결과 목록 */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#4b5563" }}>최근 실행 로그</h3>
          <Link href="/user/results" style={{ fontSize: "12px", color: "#4b5563", textDecoration: "none" }}>
            더보기 &gt;
          </Link>
        </div>
        
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <div style={{ padding: "16px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
              로딩 중...
            </div>
          ) : submissions.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
              실행 이력이 없습니다.
            </div>
          ) : (
            submissions.map((sub, idx) => {
              const isSuccess = sub.status === "success";
              const isProcessing = sub.status === "processing";
              const isFailed = sub.status === "failed";
              
              let badgeBg = "#f3f4f6";
              let badgeColor = "#4b5563";
              let statusText = "대기";
              
              if (isSuccess) {
                badgeBg = "#d1fae5";
                badgeColor = "#065f46";
                statusText = "성공";
              } else if (isProcessing) {
                badgeBg = "#dbeafe";
                badgeColor = "#1e40af";
                statusText = "진행중";
              } else if (isFailed) {
                badgeBg = "#fde8e8";
                badgeColor = "#9b1c1c";
                statusText = "실패";
              }

              return (
                <div
                  key={sub.submissionId}
                  style={{
                    padding: "10px 12px",
                    borderBottom: idx < submissions.length - 1 ? "1px solid #f3f4f6" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        backgroundColor: badgeBg,
                        color: badgeColor,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        flexShrink: 0,
                      }}
                    >
                      {statusText}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "#111111",
                          margin: 0,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {getSubmissionDisplayTitle(sub)}
                      </p>
                      <p style={{ fontSize: "11px", color: "#9ca3af", margin: "2px 0 0 0" }}>
                        {sub.workflowKey} · {new Date(sub.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  
                  {isSuccess && sub.result.resultUrl && (
                    <a
                      href={sub.result.resultUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: "11px",
                        color: "#3b82f6",
                        textDecoration: "none",
                        marginLeft: "8px",
                        flexShrink: 0,
                      }}
                    >
                      결과보기
                    </a>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 회사 정보 모달 추가 */}
      <CompanyInfoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        profile={profile}
        department={userDoc?.department}
        loading={loadingProfile}
        error={errorProfile}
      />
    </div>
  );
}
