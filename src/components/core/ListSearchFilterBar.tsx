// 이 파일은 운영자 콘솔 목록 화면에서 공통으로 사용되는 검색 및 필터 UI 바 컴포넌트입니다.
// Compact Density 스타일에 부합하여 36~40px 높이와 세련된 회색 톤 디자인을 제공합니다.

"use client";

import { useState, useEffect } from "react";

export interface FilterField {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface ListSearchFilterBarProps {
  searchPlaceholder?: string;
  filterFields?: FilterField[];
  onChange: (searchQuery: string, filterValues: Record<string, string>) => void;
}

export function ListSearchFilterBar({
  searchPlaceholder = "검색어를 입력하세요...",
  filterFields = [],
  onChange,
}: ListSearchFilterBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // 필터 기본값 세팅
  useEffect(() => {
    const initialValues: Record<string, string> = {};
    filterFields.forEach((field) => {
      initialValues[field.key] = "";
    });
    setFilterValues(initialValues);
  }, [filterFields]);

  // 검색어 및 필터값 변경 시 부모 컴포넌트에 즉시 콜백
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    onChange(val, filterValues);
  };

  const handleFilterChange = (key: string, val: string) => {
    const nextValues = { ...filterValues, [key]: val };
    setFilterValues(nextValues);
    onChange(searchQuery, nextValues);
  };

  // 모든 검색 및 필터 초기화
  const handleClear = () => {
    setSearchQuery("");
    const clearedValues: Record<string, string> = {};
    filterFields.forEach((field) => {
      clearedValues[field.key] = "";
    });
    setFilterValues(clearedValues);
    onChange("", clearedValues);
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        alignItems: "center",
        backgroundColor: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        padding: "8px 12px",
        marginBottom: "16px",
        flexWrap: "wrap",
      }}
    >
      {/* 텍스트 검색창 */}
      <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          style={{
            width: "100%",
            height: "36px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            padding: "0 10px",
            fontSize: "13px",
            outline: "none",
            backgroundColor: "#ffffff",
            color: "#111111",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* 동적 셀렉트 필터들 */}
      {filterFields.map((field) => (
        <div key={field.key} style={{ minWidth: "120px" }}>
          <select
            value={filterValues[field.key] || ""}
            onChange={(e) => handleFilterChange(field.key, e.target.value)}
            style={{
              width: "100%",
              height: "36px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "0 8px",
              fontSize: "13px",
              outline: "none",
              backgroundColor: "#ffffff",
              color: "#111111",
              cursor: "pointer",
            }}
          >
            <option value="">전체 ({field.label})</option>
            {field.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {/* 초기화 버튼 */}
      {(searchQuery !== "" || Object.values(filterValues).some((v) => v !== "")) && (
        <button
          onClick={handleClear}
          type="button"
          style={{
            height: "36px",
            backgroundColor: "#ffffff",
            color: "#374151",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            padding: "0 14px",
            fontSize: "12.5px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
        >
          🔄 초기화
        </button>
      )}
    </div>
  );
}
