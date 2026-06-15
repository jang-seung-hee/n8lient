/**
 * 이 파일은 회사 관리자가 소속 고객사의 프로필을 조회 및 수정하는 화면입니다.
 * 한국어 주석 표준을 준수합니다.
 */

"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { useAuthUser } from "@/features/auth/useAuthUser";
import {
  getCompanyInfo,
  updateCompanyProfile,
  getCompanyContracts,
  getCompanyAutomations,
} from "@/features/admin/companyAdminService";
import type { ClientDoc } from "@/types/n8lient";

export default function CompanyInfoPage() {
  const { userDoc } = useAuthUser();
  const [info, setInfo] = useState<ClientDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 통계 요약 상태
  const [contractCount, setContractCount] = useState<number>(0);
  const [activeAutomationCount, setActiveAutomationCount] = useState<number>(0);

  // 수정용 폼 필드 상태
  const [form, setForm] = useState({
    companyDisplayName: "",
    contactName: "",
    contactPhone: "",
    address: "",
    homepageUrl: "",
    description: "",
    defaultTimezone: "Asia/Seoul",
    defaultReportEmail: "",
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 데이터 로드
  const loadCompanyInfo = async () => {
    if (!userDoc?.clientId) return;
    setLoading(true);
    setError(null);
    try {
      const [clientData, contracts, automations] = await Promise.all([
        getCompanyInfo(db, userDoc.clientId),
        getCompanyContracts(db, userDoc.clientId),
        getCompanyAutomations(db, userDoc.clientId),
      ]);

      if (clientData) {
        setInfo(clientData);
        setForm({
          companyDisplayName: clientData.companyDisplayName || "",
          contactName: clientData.contactName || "",
          contactPhone: clientData.contactPhone || "",
          address: clientData.address || "",
          homepageUrl: clientData.homepageUrl || "",
          description: clientData.description || "",
          defaultTimezone: clientData.defaultTimezone || "Asia/Seoul",
          defaultReportEmail: clientData.defaultReportEmail || "",
        });
        setContractCount(contracts.length);
        setActiveAutomationCount(automations.filter((a) => a.enabled).length);
      } else {
        setError("회사 정보를 불러오지 못했습니다.");
      }
    } catch (err: any) {
      console.error(err);
      setError("회사 정보를 조회하는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanyInfo();
  }, [userDoc]);

  // 입력값 검증 및 저장 처리
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDoc?.clientId) return;

    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    // 1. 길이 검증
    if (form.companyDisplayName.length > 80) {
      setSaveError("회사 표시명은 80자 이하여야 합니다.");
      setSaving(false);
      return;
    }
    if (form.contactName.length > 50) {
      setSaveError("담당자 이름은 50자 이하여야 합니다.");
      setSaving(false);
      return;
    }
    if (form.contactPhone.length > 30) {
      setSaveError("담당자 연락처는 30자 이하여야 합니다.");
      setSaving(false);
      return;
    }
    if (form.address.length > 200) {
      setSaveError("주소는 200자 이하여야 합니다.");
      setSaving(false);
      return;
    }
    if (form.homepageUrl.length > 200) {
      setSaveError("홈페이지 URL은 200자 이하여야 합니다.");
      setSaving(false);
      return;
    }
    if (form.description.length > 500) {
      setSaveError("회사 소개는 500자 이하여야 합니다.");
      setSaving(false);
      return;
    }
    if (form.defaultReportEmail.length > 120) {
      setSaveError("기본 리포트 이메일은 120자 이하여야 합니다.");
      setSaving(false);
      return;
    }

    // 2. 형식 검증
    if (form.homepageUrl && !/^https?:\/\//.test(form.homepageUrl)) {
      setSaveError("홈페이지 URL은 http:// 또는 https://로 시작해야 합니다.");
      setSaving(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.defaultReportEmail && !emailRegex.test(form.defaultReportEmail)) {
      setSaveError("올바른 이메일 형식이 아닙니다.");
      setSaving(false);
      return;
    }

    try {
      const res = await updateCompanyProfile(db, userDoc.clientId, form);
      if (res.success) {
        setSaveSuccess("회사 정보가 성공적으로 저장되었습니다.");
        loadCompanyInfo(); // 실시간 데이터 재로딩
      } else {
        setSaveError(res.message || "회사 정보를 저장하지 못했습니다. 입력값과 권한을 확인해 주세요.");
      }
    } catch (err: any) {
      setSaveError("저장 중 시스템 에러가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (!userDoc?.clientId) {
    return (
      <div style={{ padding: "24px", color: "#ef4444", fontWeight: 600 }}>
        ⚠️ 회사 정보를 조회할 권한이 없습니다. (clientId 누락)
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>
        🔄 회사 정보를 불러오는 중입니다...
      </div>
    );
  }

  if (error || !info) {
    return (
      <div style={{ padding: "24px", color: "#ef4444", fontWeight: 600 }}>
        ⚠️ {error || "회사 정보를 조회할 권한이 없습니다."}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 타이틀 영역 */}
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111111", margin: "0 0 4px 0" }}>
          🏢 회사 프로필 관리
        </h2>
        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
          소속 회사의 대외 정보 및 알림 수신 설정을 안전하게 관리합니다.
        </p>
      </div>

      {/* 상태 메시지 배너 */}
      {saveSuccess && (
        <div style={{ backgroundColor: "#d1fae5", border: "1px solid #10b981", color: "#065f46", padding: "12px", borderRadius: "6px", fontSize: "13px" }}>
          ✅ {saveSuccess}
        </div>
      )}
      {saveError && (
        <div style={{ backgroundColor: "#fee2e2", border: "1px solid #ef4444", color: "#991b1b", padding: "12px", borderRadius: "6px", fontSize: "13px" }}>
          ⚠️ {saveError}
        </div>
      )}

      {/* 메인 콘텐츠 그리드 레이아웃 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        
        {/* 왼쪽 영역: 기본 및 관리자 정보 (읽기 전용 카드군) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* 1. 회사 기본 정보 카드 */}
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#111111", margin: "0 0 16px 0", borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
              🏢 회사 기본 정보 (읽기 전용)
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>회사 공식 명칭</span>
                <span style={{ fontWeight: 600, color: "#111111" }}>{info.companyName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>회사코드</span>
                <span style={{ fontWeight: 600, color: "#2563eb", fontFamily: "monospace" }}>{info.companyCode}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>상태</span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    backgroundColor: info.status === "active" ? "#d1fae5" : "#fee2e2",
                    color: info.status === "active" ? "#065f46" : "#991b1b",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  {info.status === "active" ? "정상 가동 (active)" : info.status}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>최초 등록일</span>
                <span style={{ color: "#4b5563" }}>
                  {info.createdAt ? new Date(info.createdAt).toLocaleString() : "-"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>최종 수정일</span>
                <span style={{ color: "#4b5563" }}>
                  {info.updatedAt ? new Date(info.updatedAt).toLocaleString() : "-"}
                </span>
              </div>
            </div>
            
            {/* 내부식별자 아코디언/작은 텍스트 */}
            <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px dashed #f3f4f6", fontSize: "11px", color: "#9ca3af" }}>
              내부 시스템 식별자(clientId): <span style={{ fontFamily: "monospace" }}>{info.clientId}</span>
            </div>
          </div>

          {/* 2. 회사 관리자 정보 카드 */}
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#111111", margin: "0 0 16px 0", borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
              🔑 소유 관리자 정보
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>관리자 성명</span>
                <span style={{ fontWeight: 600, color: "#111111" }}>{info.ownerAdminDisplayName || "-"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>이메일</span>
                <span style={{ fontWeight: 600, color: "#111111" }}>{info.ownerAdminEmail || "-"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>초기 셋업 상태</span>
                <span style={{ color: "#4b5563", fontWeight: 600 }}>
                  {info.adminBootstrapStatus === "completed" ? "✅ 설정 완료 (completed)" : "⏳ 셋업 대기 (pending)"}
                </span>
              </div>
            </div>
          </div>

          {/* 3. 시스템/계약 정보 읽기 전용 카드 */}
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#111111", margin: "0 0 16px 0", borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
              📊 서비스 라이선스 및 자동화 계약 현황
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>체결된 자동화 계약 수</span>
                <span style={{ fontWeight: 600, color: "#111111" }}>{contractCount} 건</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>사용 설정 중인 자동화 수</span>
                <span style={{ fontWeight: 600, color: "#10b981" }}>{activeAutomationCount} 개</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>데이터 보관 수준 한도</span>
                <span style={{ color: "#3b82f6", fontWeight: 600 }}>계약 범위 요약만 지원</span>
              </div>
            </div>
          </div>

        </div>

        {/* 오른쪽 영역: 프로필 수정 카드 폼 */}
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#111111", margin: "0 0 16px 0", borderBottom: "1px solid #f3f4f6", paddingBottom: "8px" }}>
            ⚙️ 프로필 정보 수정
          </h3>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* 회사 표시명 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151" }}>회사 표시 별칭 (displayName)</label>
              <input
                type="text"
                value={form.companyDisplayName}
                onChange={(e) => setForm({ ...form, companyDisplayName: e.target.value })}
                placeholder="예: 렌탈톡톡 부산지사"
                style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 10px", fontSize: "13px", outline: "none" }}
              />
              <span style={{ fontSize: "11px", color: "#9ca3af" }}>실 가입 검증과 무관한 UI 상의 별칭입니다. (최대 80자)</span>
            </div>

            {/* 대표 담당자 이름 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151" }}>업무 대표 담당자명</label>
              <input
                type="text"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                placeholder="대표 담당자의 성함을 입력하세요"
                style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 10px", fontSize: "13px", outline: "none" }}
              />
            </div>

            {/* 대표 담당자 연락처 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151" }}>담당자 연락처</label>
              <input
                type="text"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                placeholder="예: 010-1234-5678"
                style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 10px", fontSize: "13px", outline: "none" }}
              />
            </div>

            {/* 회사 주소 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151" }}>회사 주소</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="회사 사업장 주소"
                style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 10px", fontSize: "13px", outline: "none" }}
              />
            </div>

            {/* 홈페이지 URL */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151" }}>공식 홈페이지</label>
              <input
                type="text"
                value={form.homepageUrl}
                onChange={(e) => setForm({ ...form, homepageUrl: e.target.value })}
                placeholder="https://example.com"
                style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 10px", fontSize: "13px", outline: "none" }}
              />
            </div>

            {/* 기본 알림 리포트 이메일 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151" }}>회사 기본 알림 수신 이메일</label>
              <input
                type="email"
                value={form.defaultReportEmail}
                onChange={(e) => setForm({ ...form, defaultReportEmail: e.target.value })}
                placeholder="report@example.com"
                style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 10px", fontSize: "13px", outline: "none" }}
              />
              <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                회사 공용 기본 리포트 이메일입니다. 워크플로우별 설정이 따로 있으면 해당 설정이 우선될 수 있습니다.
              </span>
            </div>

            {/* 타임존 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151" }}>기본 타임존</label>
              <select
                value={form.defaultTimezone}
                onChange={(e) => setForm({ ...form, defaultTimezone: e.target.value })}
                style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 6px", fontSize: "13px", outline: "none", backgroundColor: "#ffffff" }}
              >
                <option value="Asia/Seoul">Asia/Seoul (KST)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>

            {/* 회사 소개 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151" }}>회사 소개 및 메모</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="소속 회사에 대한 메모 또는 소개 내용"
                style={{ height: "80px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "10px", fontSize: "13px", outline: "none", resize: "none" }}
              />
            </div>

            {/* 저장 버튼 */}
            <button
              type="submit"
              disabled={saving}
              style={{
                height: "38px",
                backgroundColor: saving ? "#9ca3af" : "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "13.5px",
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                transition: "background-color 0.15s ease",
                marginTop: "8px",
              }}
              onMouseEnter={(e) => { if (!saving) e.currentTarget.style.backgroundColor = "#1d4ed8"; }}
              onMouseLeave={(e) => { if (!saving) e.currentTarget.style.backgroundColor = "#2563eb"; }}
            >
              {saving ? "저장 중..." : "💾 변경사항 저장"}
            </button>

          </form>
        </div>

      </div>

    </div>
  );
}
