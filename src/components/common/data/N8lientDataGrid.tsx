// [N8lientDataGrid.tsx]
// 이 파일은 N8Lient 전체 어드민 화면에서 재사용되는 테이블 표준 그리드 컴포넌트입니다.
// TanStack Table v8 헤드리스 로직 기반으로 정렬, 행 선택 및 클라이언트 사이드 페이지네이션을 지원합니다.
// 한국어 주석 표준을 준수합니다.

import React, { useState, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  RowSelectionState,
} from "@tanstack/react-table";
import { N8lientEmptyState } from "./N8lientEmptyState";
import { N8lientLoadingState } from "./N8lientLoadingState";

interface N8lientDataGridProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  getRowId: (row: TData) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  
  // 체크박스 선택 관련
  showCheckbox?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  isRowSelectable?: (row: TData) => boolean;
  
  // 행 클릭 관련
  onRowClick?: (row: TData) => void;
}

export function N8lientDataGrid<TData>({
  data,
  columns,
  getRowId,
  loading = false,
  emptyTitle = "조회된 데이터가 없습니다.",
  emptyDescription = "조회 조건을 변경해 보세요.",
  showCheckbox = false,
  selectedIds = [],
  onSelectionChange,
  isRowSelectable,
  onRowClick,
}: N8lientDataGridProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  
  // 페이지네이션 로컬 상태 설정 (기본값: pageSize = 20)
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  });

  // 외부 selectedIds 프로퍼티 변화와 TanStack 로컬 rowSelection 상태 동기화 (무한 루프 방어)
  useEffect(() => {
    const currentKeys = Object.keys(rowSelection);
    const isSameSelection =
      currentKeys.length === selectedIds.length &&
      selectedIds.every((id) => rowSelection[id]);

    if (isSameSelection) {
      return;
    }

    const nextSelection: RowSelectionState = {};
    selectedIds.forEach((id) => {
      nextSelection[id] = true;
    });
    setRowSelection(nextSelection);
  }, [selectedIds, rowSelection]);

  // 체크박스 컬럼 동적 정의
  const finalColumns = React.useMemo(() => {
    if (!showCheckbox) return columns;

    const checkboxColumn: ColumnDef<TData, any> = {
      id: "select",
      header: ({ table }) => {
        // 전체 선택은 "현재 페이지에 표시된 row 중 선택 가능한 항목"만 선택/해제합니다. (안전성 조치)
        const selectableRows = table.getRowModel().rows.filter((r) => {
          return isRowSelectable ? isRowSelectable(r.original) : true;
        });
        
        const isAllSelected =
          selectableRows.length > 0 &&
          selectableRows.every((r) => r.getIsSelected());

        return (
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={(e) => {
              const checked = e.target.checked;
              const next: RowSelectionState = { ...rowSelection };
              
              selectableRows.forEach((r) => {
                const id = r.id;
                if (checked) {
                  next[id] = true;
                } else {
                  delete next[id];
                }
              });

              setRowSelection(next);
              if (onSelectionChange) {
                onSelectionChange(Object.keys(next));
              }
            }}
            disabled={selectableRows.length === 0}
          />
        );
      },
      cell: ({ row }) => {
        const selectable = isRowSelectable ? isRowSelectable(row.original) : true;
        return (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            disabled={!selectable}
            onChange={(e) => {
              const checked = e.target.checked;
              const next = { ...rowSelection };
              if (checked) {
                next[row.id] = true;
              } else {
                delete next[row.id];
              }
              setRowSelection(next);
              if (onSelectionChange) {
                onSelectionChange(Object.keys(next));
              }
            }}
          />
        );
      },
    };

    return [checkboxColumn, ...columns];
  }, [columns, showCheckbox, isRowSelectable, rowSelection, onSelectionChange]);

  const table = useReactTable({
    data,
    columns: finalColumns,
    state: {
      sorting,
      rowSelection,
      pagination,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: (updater) => {
      const nextSelection = typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(nextSelection);
      if (onSelectionChange) {
        onSelectionChange(Object.keys(nextSelection));
      }
    },
    onPaginationChange: setPagination,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: (row) => (isRowSelectable ? isRowSelectable(row.original) : true),
  });

  if (loading) {
    return <N8lientLoadingState />;
  }

  if (data.length === 0) {
    return (
      <N8lientEmptyState
        title={emptyTitle}
        description={emptyDescription}
        style={{ border: "none", boxShadow: "none" }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* 1. 테이블 wrap 영역 */}
      <div className="ux_table_wrap">
        <table className="ux_table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isSortable = header.column.getCanSort() && header.column.id !== "select";
                  const size = header.column.columnDef.size; // 컬럼 sizing 확장 대응
                  const align = (header.column.columnDef.meta as any)?.align;
                  const alignClass = align === "center" ? "ux_table_th_center" : "";
                  const combinedClass = [isSortable ? "ux_table_th_sortable" : "", alignClass].filter(Boolean).join(" ");
                  
                  return (
                    <th
                      key={header.id}
                      onClick={isSortable ? header.column.getToggleSortingHandler() : undefined}
                      className={combinedClass}
                      style={{
                        userSelect: "none",
                        width: header.column.id === "select" ? "40px" : (size ? `${size}px` : undefined),
                        textAlign: header.column.id === "select" ? "center" : (align ? undefined : "left"),
                      }}
                    >
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {isSortable && (
                          <span style={{ fontSize: "10px", color: "var(--ux-text-color-muted)" }}>
                            {{
                              asc: " 🔼",
                              desc: " 🔽",
                            }[header.column.getIsSorted() as string] ?? " ↕"}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const isSelected = row.getIsSelected();
              return (
                <tr
                  key={row.id}
                  className={`ux_table_row_hover ${onRowClick ? "ux_table_row_clickable" : ""}`}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  style={{
                    backgroundColor: isSelected ? "#eff6ff" : "transparent",
                  }}
                >
                  {row.getVisibleCells().map((cell) => {
                    const size = cell.column.columnDef.size;
                    const align = (cell.column.columnDef.meta as any)?.align;
                    const alignClass = align === "center" ? "ux_table_cell_center" : "";
                    
                    return (
                      <td
                        key={cell.id}
                        className={alignClass}
                        style={{
                          textAlign: cell.column.id === "select" ? "center" : (align ? undefined : "left"),
                          width: cell.column.id === "select" ? "40px" : (size ? `${size}px` : undefined),
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 2. 표준 페이지네이션 & 페이지당 개수 선택기 영역 */}
      <div className="ux_pagination" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: "var(--ux-card-radius)", border: "var(--ux-card-border)", backgroundColor: "var(--ux-card-bg)" }}>
        {/* 왼쪽: 페이지 크기(pageSize) 선택 */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="ux_caption">페이지당 행:</span>
          <select
            className="ux_select_compact"
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              table.setPageSize(newSize);
            }}
            style={{ width: "70px", padding: "2px 4px", fontSize: "12px" }}
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}개
              </option>
            ))}
          </select>
        </div>

        {/* 오른쪽: 이전/다음 컨트롤 및 카운터 */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="ux_caption">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </span>
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              className="ux_button_compact ux_button_secondary"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              style={{ fontSize: "11px", padding: "2px 8px" }}
            >
              이전
            </button>
            <button
              className="ux_button_compact ux_button_secondary"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              style={{ fontSize: "11px", padding: "2px 8px" }}
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
