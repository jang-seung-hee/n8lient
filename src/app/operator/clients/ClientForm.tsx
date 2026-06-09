// 이 파일은 고객사 등록 및 수정을 처리하는 전용 폼 컴포넌트입니다.
// 수정 모드 시 핵심 식별키(clientId, companyCode)를 강력하게 잠금(disabled) 처리합니다.
// 소유자 관리자는 UID 직접 입력이 아닌 이메일 조회 → 자동 매핑 방식을 사용합니다.

"use client";

import { useEffect, useState, useCallback } from "react";
import type { ClientDoc } from "@/types/n8lient";
import { db } from "@/lib/firebase";
import { findUserByEmail } from "@/features/operator/operatorService";
import { doc, getDoc } from "firebase/firestore";

interface ClientFormProps {
  initialData: ClientDoc | null;
  isEditMode: boolean;
  onSubmit: (client: ClientDoc) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export function ClientForm({
  initialData,
  isEditMode,
  onSubmit,
  onCancel,
  loading,
}: ClientFormProps) {
  const [clientId, setClientId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [status, setStatus] = useState<"active" | "pending_setup" | "suspended" | "terminated">("active");
  const [defaultTimezone, setDefaultTimezone] = useState("Asia/Seoul");
  const [defaultReportEmail, setDefaultReportEmail] = useState("");
  const [defaultDriveRootFolderId, setDefaultDriveRootFolderId] = useState("");

  // 관리자 매핑 관련 상태
  const [adminEmail, setAdminEmail] = useState("");
  const [ownerAdminUid, setOwnerAdminUid] = useState("");
  const [adminDisplayName, setAdminDisplayName] = useState("");
  const [adminLookupStatus, setAdminLookupStatus] = useState<"idle" | "loading" | "found" | "notfound" | "error">("idle");

  // 한글 로마자 발음 표기 변환 헬퍼 (초성, 중성, 종성 조합)
  const romanizeKorean = (text: string): string => {
    const chosung = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
    const jungsung = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'ye', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
    const jongsung = ['', 'g', 'kk', 'gs', 'n', 'nj', 'nh', 'd', 'l', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'b', 'bs', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h'];

    let result = "";
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code >= 0xac00 && code <= 0xd7a3) {
        const hangulIndex = code - 0xac00;
        const cho = Math.floor(hangulIndex / 28 / 21);
        const jung = Math.floor((hangulIndex / 28) % 21);
        const jong = hangulIndex % 28;
        result += chosung[cho] + jungsung[jung] + (jongsung[jong] || "");
      } else {
        const char = text.charAt(i).toLowerCase();
        if (/[a-z0-9]/.test(char)) {
          result += char;
        } else if (/\s/.test(char)) {
          result += "-";
        }
      }
    }
    return result.replace(/-+/g, "-").replace(/^-|-$/g, "");
  };

  const [checkingId, setCheckingId] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);

  const handleRecommendId = async () => {
    if (!companyName.trim()) {
      alert("먼저 고객사명을 입력해 주세요.");
      return;
    }
    setCheckingId(true);
    try {
      let baseId = romanizeKorean(companyName.trim().toLowerCase());
      baseId = baseId.replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
      if (!baseId) {
        baseId = "client";
      }

      let checkId = baseId;
      let counter = 1;
      let isUnique = false;

      while (!isUnique) {
        const docRef = doc(db, "clients", checkId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          isUnique = true;
        } else {
          counter++;
          checkId = `${baseId}_${counter}`;
        }
      }

      setClientId(checkId);
    } catch (err: any) {
      console.error(err);
      alert("ID 추천 중 오류 발생: " + err.message);
    } finally {
      setCheckingId(false);
    }
  };

  const handleGenerateCode = async () => {
    setCheckingCode(true);
    try {
      let prefix = "";
      if (clientId) {
        prefix = clientId.slice(0, 4).toUpperCase();
      } else if (companyName.trim()) {
        prefix = romanizeKorean(companyName.trim()).slice(0, 4).toUpperCase();
      } else {
        prefix = "CLI";
      }
      
      prefix = prefix.replace(/[^A-Z0-9]/g, "");
      if (!prefix) prefix = "CLI";

      let isUnique = false;
      let finalCode = "";

      while (!isUnique) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let randomPart = "";
        for (let i = 0; i < 4; i++) {
          randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        finalCode = `${prefix}-${randomPart}`;

        const docRef = doc(db, "companyCodeLookups", finalCode);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          isUnique = true;
        }
      }

      setCompanyCode(finalCode);
    } catch (err: any) {
      console.error(err);
      alert("회사코드 생성 중 오류 발생: " + err.message);
    } finally {
      setCheckingCode(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      setClientId(initialData.clientId);
      setCompanyName(initialData.companyName);
      setCompanyCode(initialData.companyCode);
      setStatus(initialData.status);
      setDefaultTimezone(initialData.defaultTimezone || "Asia/Seoul");
      setDefaultReportEmail(initialData.defaultReportEmail || "");
      setDefaultDriveRootFolderId(initialData.defaultDriveRootFolderId || "");
      // 수정 모드: 기존 ownerAdminUid만 복원 (이메일은 별도 조회 필요)
      setOwnerAdminUid(initialData.ownerAdminUid || "");
      setAdminEmail("");
      setAdminDisplayName("");
      setAdminLookupStatus("idle");
    } else {
      setClientId("");
      setCompanyName("");
      setCompanyCode("");
      setStatus("active");
      setDefaultTimezone("Asia/Seoul");
      setDefaultReportEmail("");
      setDefaultDriveRootFolderId("");
      setOwnerAdminUid("");
      setAdminEmail("");
      setAdminDisplayName("");
      setAdminLookupStatus("idle");
    }
  }, [initialData, isEditMode]);

  // 이메일로 관리자 조회
  const handleAdminLookup = useCallback(async () => {
    if (!adminEmail.trim()) return;

    setAdminLookupStatus("loading");
    setOwnerAdminUid("");
    setAdminDisplayName("");

    try {
      const user = await findUserByEmail(db, adminEmail);
      if (user) {
        setOwnerAdminUid(user.uid);
        setAdminDisplayName(user.displayName);
        setAdminLookupStatus("found");
      } else {
        setAdminLookupStatus("notfound");
      }
    } catch {
      setAdminLookupStatus("error");
    }
  }, [adminEmail]);

  // 관리자 매핑 초기화
  const handleAdminClear = () => {
    setAdminEmail("");
    setOwnerAdminUid("");
    setAdminDisplayName("");
    setAdminLookupStatus("idle");
  };

  const handleSubmitInternal = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. clientId 식별자 포맷 검증
    const idRegex = /^[a-z0-9_]+$/;
    if (!idRegex.test(clientId)) {
      alert("고객사 식별 ID는 영문 소문자, 숫자, 언더스코어(_)만 허용합니다. (예: client_mycompany_001)");
      return;
    }

    // 2. companyCode 정규화 (trim & toUpperCase)
    const normalizedCode = companyCode.trim().toUpperCase();
    if (!normalizedCode) {
      alert("가입 회사코드를 올바르게 입력해 주십시오.");
      return;
    }

    const client: ClientDoc = {
      clientId,
      companyName: companyName.trim(),
      companyCode: normalizedCode,
      status,
      ownerAdminUid: ownerAdminUid.trim(),
      defaultTimezone,
      defaultReportEmail: defaultReportEmail.trim(),
      defaultDriveRootFolderId: defaultDriveRootFolderId.trim() || undefined,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSubmit(client);
  };

  // 관리자 매핑 안내 메시지 렌더링
  const renderAdminLookupFeedback = () => {
    if (adminLookupStatus === "loading") {
      return (
        <p style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0 0 0" }}>
          🔍 사용자를 조회 중...
        </p>
      );
    }
    if (adminLookupStatus === "found") {
      return (
        <p style={{ fontSize: "12px", color: "#065f46", margin: "4px 0 0 0", fontWeight: 600 }}>
          ✅ 관리자 매핑 완료: {adminDisplayName} ({ownerAdminUid.slice(0, 8)}...)
        </p>
      );
    }
    if (adminLookupStatus === "notfound") {
      return (
        <p style={{ fontSize: "12px", color: "#b91c1c", margin: "4px 0 0 0" }}>
          ⚠️ 아직 가입되지 않은 사용자입니다. 먼저 Google 로그인 후 다시 등록해 주세요.
        </p>
      );
    }
    if (adminLookupStatus === "error") {
      return (
        <p style={{ fontSize: "12px", color: "#b91c1c", margin: "4px 0 0 0" }}>
          ⚠️ 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      );
    }
    return null;
  };

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "20px",
      }}
    >
      <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111111", margin: "0 0 16px 0", borderBottom: "1px solid #f3f4f6", paddingBottom: "10px" }}>
        {isEditMode ? "⚙️ 고객사 정보 수정" : "➕ 새 고객사 등록"}
      </h3>
      <form onSubmit={handleSubmitInternal} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        
        {/* 고객사명 (가장 위로 이동) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>고객사명 *</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="예: 렌탈톡톡"
            required
            style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", color: "#111111" }}
          />
        </div>

        {/* 핵심 키 잠금 필드 및 일반 정보 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {/* 고객사 식별 ID */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>고객사 식별 ID * (수정 불가)</label>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="예: client_rentaltoktok"
                required
                disabled={isEditMode}
                style={{
                  flex: 1,
                  height: "36px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  padding: "0 8px",
                  fontSize: "13px",
                  outline: "none",
                  color: isEditMode ? "#9ca3af" : "#111111",
                  backgroundColor: isEditMode ? "#f3f4f6" : "#ffffff",
                }}
              />
              {!isEditMode && (
                <button
                  type="button"
                  onClick={handleRecommendId}
                  disabled={checkingId}
                  style={{
                    height: "36px",
                    backgroundColor: "#f3f4f6",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    padding: "0 10px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {checkingId ? "추천중..." : "💡 추천"}
                </button>
              )}
            </div>
          </div>

          {/* 가입 회사코드 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>가입 회사코드 * (수정 불가)</label>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                type="text"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                placeholder="예: RTT-A2B3"
                required
                disabled={isEditMode}
                style={{
                  flex: 1,
                  height: "36px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  padding: "0 8px",
                  fontSize: "13px",
                  outline: "none",
                  color: isEditMode ? "#9ca3af" : "#111111",
                  backgroundColor: isEditMode ? "#f3f4f6" : "#ffffff",
                }}
              />
              {!isEditMode && (
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  disabled={checkingCode}
                  style={{
                    height: "36px",
                    backgroundColor: "#f3f4f6",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    padding: "0 10px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {checkingCode ? "생성중..." : "🎲 랜덤"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 가동 상태 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>가동 상태 *</label>
          <select
            value={status}
            onChange={(e: any) => setStatus(e.target.value)}
            style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", backgroundColor: "#ffffff", color: "#111111" }}
          >
            <option value="active">정상 가동 (active)</option>
            <option value="pending_setup">설정 대기 (pending_setup)</option>
            <option value="suspended">가동 정지 (suspended)</option>
            <option value="terminated">계약 종료 (terminated)</option>
          </select>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "4px 0" }} />
        <h4 style={{ fontSize: "12.5px", fontWeight: 700, color: "#374151", margin: 0 }}>⚙️ 시스템 설정 및 관리자 연동</h4>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>기본 타임존 *</label>
            <input
              type="text"
              value={defaultTimezone}
              onChange={(e) => setDefaultTimezone(e.target.value)}
              placeholder="Asia/Seoul"
              required
              style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", color: "#111111" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>보고용 기본 수신메일 *</label>
            <input
              type="email"
              value={defaultReportEmail}
              onChange={(e) => setDefaultReportEmail(e.target.value)}
              placeholder="report@company.com"
              required
              style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", color: "#111111" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>공용 구글 드라이브 루트 폴더 ID</label>
          <input
            type="text"
            value={defaultDriveRootFolderId}
            onChange={(e) => setDefaultDriveRootFolderId(e.target.value)}
            placeholder="Google Drive Folder ID"
            style={{ height: "36px", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0 8px", fontSize: "13px", outline: "none", color: "#111111" }}
          />
        </div>

        {/* 관리자 이메일 조회 섹션 */}
        <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "4px 0" }} />
        <h4 style={{ fontSize: "12.5px", fontWeight: 700, color: "#374151", margin: 0 }}>👤 소유자 관리자 매핑</h4>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>관리자 이메일 (이메일로 자동 조회)</label>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => {
                setAdminEmail(e.target.value);
                // 이메일이 바뀌면 기존 조회 결과 초기화
                if (adminLookupStatus !== "idle") {
                  setOwnerAdminUid("");
                  setAdminDisplayName("");
                  setAdminLookupStatus("idle");
                }
              }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdminLookup(); } }}
              placeholder="관리자 이메일 입력 후 조회 버튼 클릭"
              style={{
                flex: 1,
                height: "36px",
                border: `1px solid ${adminLookupStatus === "found" ? "#6ee7b7" : adminLookupStatus === "notfound" || adminLookupStatus === "error" ? "#fca5a5" : "#d1d5db"}`,
                borderRadius: "6px",
                padding: "0 8px",
                fontSize: "13px",
                outline: "none",
                color: "#111111",
              }}
            />
            <button
              type="button"
              onClick={handleAdminLookup}
              disabled={!adminEmail.trim() || adminLookupStatus === "loading"}
              style={{
                height: "36px",
                backgroundColor: adminLookupStatus === "loading" ? "#6b7280" : "#1d4ed8",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                padding: "0 14px",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: !adminEmail.trim() || adminLookupStatus === "loading" ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {adminLookupStatus === "loading" ? "조회 중..." : "🔍 조회"}
            </button>
            {(adminLookupStatus === "found" || ownerAdminUid) && (
              <button
                type="button"
                onClick={handleAdminClear}
                style={{
                  height: "36px",
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  padding: "0 10px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                초기화
              </button>
            )}
          </div>
          {renderAdminLookupFeedback()}
          {isEditMode && !adminLookupStatus.startsWith("found") && ownerAdminUid && (
            <p style={{ fontSize: "11.5px", color: "#6b7280", margin: "2px 0 0 0" }}>
              💡 현재 등록된 관리자 UID: <span style={{ fontFamily: "monospace" }}>{ownerAdminUid.slice(0, 12)}...</span> (변경하려면 이메일 조회 후 적용)
            </p>
          )}
        </div>

        {isEditMode && (
          <div style={{ backgroundColor: "#f3f4f6", borderLeft: "4px solid #111111", padding: "10px", borderRadius: "4px", fontSize: "11.5px", color: "#4b5563", lineHeight: 1.4 }}>
            💡 데이터 일관성 보호 정책에 의해, 고객사 고유 식별 Key인 <strong>ID</strong> 및 <strong>회사코드</strong>는 수정 모드에서 임의로 변경할 수 없도록 자동 비활성화되어 있습니다.
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              height: "38px",
              backgroundColor: loading ? "#4b5563" : "#111111",
              color: "#ffffff",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "처리 중..." : isEditMode ? "⚙️ 고객사 정보 수정 완료" : "🚀 고객사 등록"}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            style={{
              height: "38px",
              backgroundColor: "#f3f4f6",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "0 14px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
