// 이 파일은 탭 방식의 레이아웃 전환을 지원하는 공통 탭 컴포넌트입니다.
// WAI-ARIA 접근성 지침 및 N8Lient UX_Design_Setting 기준 스타일을 준수합니다.

"use client";

import React from "react";

export type SectionTabItem = {
  key: string;
  label: string;
  badge?: string | number;
  disabled?: boolean;
};

interface SectionTabsProps {
  items: SectionTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  ariaLabel?: string;
}

export function SectionTabs({
  items,
  activeKey,
  onChange,
  ariaLabel = "섹션 선택 탭",
}: SectionTabsProps) {
  return (
    <div
      className="ux_section_tabs"
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${item.key}`}
            id={`tab-${item.key}`}
            tabIndex={isActive ? 0 : -1}
            disabled={item.disabled}
            className={`ux_section_tab ${isActive ? "ux_section_tab_active" : ""}`}
            onClick={() => onChange(item.key)}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge !== "" && (
                <span
                  className="ux_badge"
                  style={{
                    fontSize: "10px",
                    height: "16px",
                    padding: "0 5px",
                    borderRadius: "8px",
                    backgroundColor: isActive ? "#111827" : "#e5e7eb",
                    color: isActive ? "#ffffff" : "#374151",
                    marginLeft: "2px",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
