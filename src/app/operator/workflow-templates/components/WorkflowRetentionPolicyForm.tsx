"use client";

import React from "react";
import type { RetentionLevel } from "@/types/n8lient";
import type { WorkflowImportDiagnostics } from "@/features/operator/workflowAnalyzer";
import {
  getDiagnosticStyles,
  getFieldDiagnosticLevel,
  getFieldDiagnosticMessage,
  getDiagnosticMessageStyle
} from "@/features/operator/workflowAnalyzer";

export interface WorkflowRetentionPolicyFormProps {
  maxLevel: RetentionLevel;
  setMaxLevel: (val: RetentionLevel) => void;
  supportedLevels: RetentionLevel[];
  setSupportedLevels: (val: RetentionLevel[]) => void;
  capsDefaultLevel: RetentionLevel;
  setCapsDefaultLevel: (val: RetentionLevel) => void;
  supportsProcessorResult: boolean;
  setSupportsProcessorResult: (val: boolean) => void;
  supportsOriginalFileRefs: boolean;
  setSupportsOriginalFileRefs: (val: boolean) => void;
  supportsResultRefs: boolean;
  setSupportsResultRefs: (val: boolean) => void;
  supportsResultPolicyRouter: boolean;
  setSupportsResultPolicyRouter: (val: boolean) => void;

  opAllowedLevels: RetentionLevel[];
  setOpAllowedLevels: (val: RetentionLevel[]) => void;
  opDefaultLevel: RetentionLevel;
  setOpDefaultLevel: (val: RetentionLevel) => void;
  allowCompanyOverride: boolean;
  setAllowCompanyOverride: (val: boolean) => void;
  allowUserOverride: boolean;
  setAllowUserOverride: (val: boolean) => void;
  diagnostics?: WorkflowImportDiagnostics | null;
}

export default function WorkflowRetentionPolicyForm({
  maxLevel,
  setMaxLevel,
  supportedLevels,
  setSupportedLevels,
  capsDefaultLevel,
  setCapsDefaultLevel,
  supportsProcessorResult,
  setSupportsProcessorResult,
  supportsOriginalFileRefs,
  setSupportsOriginalFileRefs,
  supportsResultRefs,
  setSupportsResultRefs,
  supportsResultPolicyRouter,
  setSupportsResultPolicyRouter,
  opAllowedLevels,
  setOpAllowedLevels,
  opDefaultLevel,
  setOpDefaultLevel,
  allowCompanyOverride,
  setAllowCompanyOverride,
  allowUserOverride,
  setAllowUserOverride,
  diagnostics = null,
}: WorkflowRetentionPolicyFormProps) {
  return (
    <>
      {/* [v2.6] retentionCapabilities (워크플로우 보관 지원 범위) */}
      <div
        style={{
          backgroundColor: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          ...getDiagnosticStyles("retentionCapabilities.maxLevel", diagnostics)
        }}
      >
        <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#111111", margin: 0 }}>
          ⚙️ 워크플로우 보관 지원 범위 (Capabilities)
        </h4>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>
              워크플로우 최대 보관 지원 단계 (maxLevel) *
            </label>
            <select
              value={maxLevel}
              onChange={(e: any) => setMaxLevel(e.target.value)}
              style={{
                height: "32px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                padding: "0 6px",
                fontSize: "12px",
                outline: "none",
                backgroundColor: "#ffffff",
                color: "#111111",
              }}
            >
              <option value="notify_only">1단계: 알림/로그형 (notify_only)</option>
              <option value="processed_result">2단계: 가공지식 저장형 (processed_result)</option>
              <option value="full_archive">3단계: 원본 포함 지식보관형 (full_archive)</option>
            </select>
            <span style={{ fontSize: "10.5px", color: "#6b7280" }}>
              💡 이 워크플로우가 기술적으로 지원 가능한 최대 보관 수준입니다. 고객사 계약 또는 회사 설정은 이 범위를 초과할 수 없습니다.
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>기본 지원 레벨</label>
            <select
              value={capsDefaultLevel}
              onChange={(e: any) => setCapsDefaultLevel(e.target.value)}
              style={{
                height: "32px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                padding: "0 6px",
                fontSize: "12px",
                outline: "none",
                backgroundColor: "#ffffff",
                color: "#111111",
                ...getDiagnosticStyles("retentionCapabilities.defaultLevel", diagnostics)
              }}
            >
              {supportedLevels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
            {getFieldDiagnosticMessage("retentionCapabilities.defaultLevel", diagnostics) && (
              <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel("retentionCapabilities.defaultLevel", diagnostics)!)}>
                {getFieldDiagnosticMessage("retentionCapabilities.defaultLevel", diagnostics)}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>
            기술적 지원 레벨 (다중 선택)
          </span>
          <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
            {["notify_only", "processed_result", "full_archive"].map((lvl) => (
              <label key={lvl} style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", color: "#111111" }}>
                <input
                  type="checkbox"
                  checked={supportedLevels.includes(lvl as any)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSupportedLevels([...supportedLevels, lvl as any]);
                    } else {
                      setSupportedLevels(supportedLevels.filter((l) => l !== lvl));
                    }
                  }}
                />
                {lvl === "notify_only" && "알림/로그형"}
                {lvl === "processed_result" && "가공지식 저장형"}
                {lvl === "full_archive" && "원본 포함 지식보관형"}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px", marginTop: "4px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", color: "#111111" }}>
            <input
              type="checkbox"
              checked={supportsProcessorResult}
              onChange={(e) => setSupportsProcessorResult(e.target.checked)}
            />
            processorResult 생성 지원
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", color: "#111111" }}>
            <input
              type="checkbox"
              checked={supportsOriginalFileRefs}
              onChange={(e) => setSupportsOriginalFileRefs(e.target.checked)}
            />
            originalFileRefs 지원
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", color: "#111111" }}>
            <input
              type="checkbox"
              checked={supportsResultRefs}
              onChange={(e) => setSupportsResultRefs(e.target.checked)}
            />
            resultRefs 지원
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", color: "#111111" }}>
            <input
              type="checkbox"
              checked={supportsResultPolicyRouter}
              onChange={(e) => setSupportsResultPolicyRouter(e.target.checked)}
            />
            Result Policy Router 지원
          </label>
        </div>
        
        {getFieldDiagnosticMessage("retentionCapabilities.maxLevel", diagnostics) && (
          <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel("retentionCapabilities.maxLevel", diagnostics)!)}>
            {getFieldDiagnosticMessage("retentionCapabilities.maxLevel", diagnostics)}
          </span>
        )}
      </div>

      {/* [v2.6] operatorRetentionPolicy (오퍼레이터 허용 보관 정책) */}
      <div
        style={{
          backgroundColor: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "8px",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          ...getDiagnosticStyles("operatorRetentionPolicy.allowedLevels", diagnostics)
        }}
      >
        <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#166534", margin: 0 }}>
          🛡️ 오퍼레이터 허용 보관 정책 (Operator Policy)
        </h4>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#14532d" }}>고객사에 허용할 레벨 (다중 선택)</span>
          <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
            {supportedLevels.map((lvl) => (
              <label
                key={lvl}
                style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", color: "#14532d" }}
              >
                <input
                  type="checkbox"
                  checked={opAllowedLevels.includes(lvl)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setOpAllowedLevels([...opAllowedLevels, lvl]);
                    } else {
                      setOpAllowedLevels(opAllowedLevels.filter((l) => l !== lvl));
                    }
                  }}
                />
                {lvl === "notify_only" && "알림/로그형"}
                {lvl === "processed_result" && "가공지식 저장형"}
                {lvl === "full_archive" && "원본 포함 지식보관형"}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#14532d" }}>오퍼레이터 기본 지정 레벨</label>
            <select
              value={opDefaultLevel}
              onChange={(e: any) => setOpDefaultLevel(e.target.value)}
              style={{
                height: "32px",
                border: "1px solid #bbf7d0",
                borderRadius: "6px",
                padding: "0 6px",
                fontSize: "12px",
                outline: "none",
                backgroundColor: "#ffffff",
                color: "#111111",
                ...getDiagnosticStyles("operatorRetentionPolicy.defaultLevel", diagnostics)
              }}
            >
              {opAllowedLevels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
            {getFieldDiagnosticMessage("operatorRetentionPolicy.defaultLevel", diagnostics) && (
              <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel("operatorRetentionPolicy.defaultLevel", diagnostics)!)}>
                {getFieldDiagnosticMessage("operatorRetentionPolicy.defaultLevel", diagnostics)}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#14532d", marginTop: "4px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={allowCompanyOverride}
              onChange={(e) => setAllowCompanyOverride(e.target.checked)}
            />
            회사 관리자의 정책 수정 허용
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={allowUserOverride}
              onChange={(e) => setAllowUserOverride(e.target.checked)}
            />
            일반 사용자의 개인 보관 선호 수정 허용
          </label>
        </div>

        {getFieldDiagnosticMessage("operatorRetentionPolicy.allowedLevels", diagnostics) && (
          <span style={getDiagnosticMessageStyle(getFieldDiagnosticLevel("operatorRetentionPolicy.allowedLevels", diagnostics)!)}>
            {getFieldDiagnosticMessage("operatorRetentionPolicy.allowedLevels", diagnostics)}
          </span>
        )}
      </div>
    </>
  );
}
