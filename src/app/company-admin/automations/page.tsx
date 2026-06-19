// 이 파일은 회사 관리자가 계약한 N8N 워크플로우 목록을 조회하고 상세 확인 및 편집을 제어하는 조립용 허브 화면입니다.

"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { useAuthUser } from "@/features/auth/useAuthUser";
import {
  getCompanyContracts,
  getCompanyAutomations,
  setCompanyAutomationCompanyDisabled,
} from "@/features/admin/companyAdminService";
import { fetchWorkflowTemplatesByKeys } from "@/common/workflow/fetchWorkflowTemplatesByKeys";
import type { ClientContract, ClientAutomation, WorkflowTemplate } from "@/types/n8lient";
import { siteConfig } from "@/config/siteConfig";

// 분리된 UI 컴포넌트 임포트
import CompanyAutomationList from "@/components/custom/CompanyAutomationList";
import CompanyAutomationDetail from "@/components/custom/CompanyAutomationDetail";
import CompanyAutomationForm from "@/components/custom/CompanyAutomationForm";

export default function AdminAutomations() {
  const { user, userDoc } = useAuthUser();
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [automations, setAutomations] = useState<ClientAutomation[]>([]);
  const [templates, setTemplates] = useState<Record<string, WorkflowTemplate>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 뷰 상태 제어 ("list" | "detail" | "form")
  const [viewMode, setViewMode] = useState<"list" | "detail" | "form">("list");
  const [selectedContract, setSelectedContract] = useState<ClientContract | null>(null);

  const loadData = async () => {
    if (!userDoc?.clientId) return;
    try {
      setLoading(true);
      setError(null);

      // 1. 계약 및 기존 설정 목록 로드
      const contractList = await getCompanyContracts(db, userDoc.clientId);
      const automationList = await getCompanyAutomations(db, userDoc.clientId);

      setContracts(contractList);
      setAutomations(automationList);

      // 2. 계약된 자동화의 템플릿(명세서) 데이터 로드
      const tempMap = await fetchWorkflowTemplatesByKeys(
        db,
        contractList.map((contract) => contract.workflowKey)
      );
      setTemplates(tempMap);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "데이터를 로드하는 도중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userDoc?.clientId) {
      loadData();
    }
  }, [userDoc]);

  if (loading && contracts.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <h2 className="ux_page_title" style={{ fontSize: "18px", margin: "0 0 4px 0" }}>
            ⚙️ N8N 워크플로우 설정 관리
          </h2>
          <p className="ux_caption" style={{ margin: 0 }}>
            회사별 계약된 N8N 워크플로우의 기본 설정값을 관리합니다.
          </p>
        </div>
        <p style={{ fontSize: "13px", color: "#6b7280" }}>{siteConfig.messages.loading}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 className="ux_page_title" style={{ fontSize: "18px", margin: "0 0 4px 0" }}>
          ⚙️ N8N 워크플로우 설정 관리
        </h2>
        <p className="ux_caption" style={{ margin: 0 }}>
          회사별 계약된 N8N 워크플로우의 Google Drive 폴더 ID, 시트 ID 등의 회사 공용 기본값(Fallback)을 관리합니다.
        </p>
      </div>

      {error && (
        <div className="ux_alert ux_alert_danger">
          ⚠️ {error}
        </div>
      )}

      {/* 뷰 라우팅 */}
      {viewMode === "list" && (
        <CompanyAutomationList
          contracts={contracts}
          automations={automations}
          templates={templates}
          onSelectContract={(contract) => {
            setSelectedContract(contract);
            setViewMode("detail");
          }}
        />
      )}

      {viewMode === "detail" && selectedContract && (
        <CompanyAutomationDetail
          contract={selectedContract}
          automation={automations.find((a) => a.workflowKey === selectedContract.workflowKey) || null}
          template={templates[selectedContract.workflowKey] || null}
          onBack={() => {
            setSelectedContract(null);
            setViewMode("list");
          }}
          onEdit={() => {
            setViewMode("form");
          }}
          onToggleEmployeeAccess={async (disabled, reason) => {
            if (!userDoc?.clientId || !user) {
              return { success: false, message: "로그인 정보를 확인할 수 없습니다." };
            }
            const result = await setCompanyAutomationCompanyDisabled(db, {
              clientId: userDoc.clientId,
              workflowKey: selectedContract.workflowKey,
              adminUid: user.uid,
              disabled,
              reason,
            });
            if (result.success) {
              await loadData();
            }
            return result;
          }}
        />
      )}

      {viewMode === "form" && selectedContract && templates[selectedContract.workflowKey] && user && (
        <CompanyAutomationForm
          db={db}
          uid={user.uid}
          clientId={userDoc?.clientId || ""}
          contract={selectedContract}
          automation={automations.find((a) => a.workflowKey === selectedContract.workflowKey) || null}
          template={templates[selectedContract.workflowKey]}
          onSuccess={async () => {
            await loadData();
            setViewMode("detail"); // 저장 성공 시 상세 보기 화면으로 복귀
          }}
          onCancel={() => {
            setViewMode("detail"); // 취소 시 상세 보기 화면으로 복귀
          }}
        />
      )}
    </div>
  );
}
