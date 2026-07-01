// [WorkflowMultiSelectFilter.tsx]
// 이 파일은 실행 로그 검색바에서 워크플로우를 다중 선택할 수 있도록 체크박스 드롭다운 UI를 제공합니다.
// 한국어 주석 표준을 준수합니다.

"use client";

import React, { useState, useRef, useEffect } from "react";

export type WorkflowFilterOption = {
  value: string;
  label: string;
  status?: string;
};

export type WorkflowMultiSelectFilterProps = {
  options: WorkflowFilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
};

export function WorkflowMultiSelectFilter({
  options,
  selectedValues,
  onChange,
  placeholder = "전체 워크플로우",
}: WorkflowMultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 감지하여 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleCheckboxChange = (value: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, value]);
    } else {
      onChange(selectedValues.filter((v) => v !== value));
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  // 버튼에 표시할 텍스트 결정
  const getButtonText = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    }
    if (selectedValues.length === 1) {
      const selectedOpt = options.find((opt) => opt.value === selectedValues[0]);
      return selectedOpt ? selectedOpt.label : selectedValues[0];
    }
    return `워크플로우 ${selectedValues.length}개 선택`;
  };

  return (
    <div className="ux_dropdown_container" ref={containerRef}>
      <button
        type="button"
        className="ux_dropdown_button"
        onClick={handleToggle}
        title={getButtonText()}
      >
        <span
          className="ux_table_text_ellipsis"
          style={{ maxWidth: "calc(100% - 20px)", display: "inline-block" }}
        >
          {getButtonText()}
        </span>
        <span style={{ fontSize: "10px", marginLeft: "4px", color: "#6b7280" }}>
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
        <div className="ux_dropdown_menu">
          <div className="ux_dropdown_header">
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>워크플로우 선택</span>
            {selectedValues.length > 0 && (
              <button
                type="button"
                className="ux_dropdown_clear_btn"
                onClick={handleClear}
              >
                초기화
              </button>
            )}
          </div>
          {options.length === 0 ? (
            <div style={{ padding: "8px", fontSize: "12px", color: "#9ca3af", textAlign: "center" }}>
              등록된 워크플로우가 없습니다.
            </div>
          ) : (
            options.map((opt) => {
              const isChecked = selectedValues.includes(opt.value);
              return (
                <label key={opt.value} className="ux_dropdown_item">
                  <input
                    type="checkbox"
                    className="ux_dropdown_item_checkbox"
                    checked={isChecked}
                    onChange={(e) => handleCheckboxChange(opt.value, e.target.checked)}
                  />
                  <span
                    className="ux_table_text_ellipsis"
                    style={{ fontSize: "12.5px" }}
                    title={opt.label}
                  >
                    {opt.label}
                  </span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
