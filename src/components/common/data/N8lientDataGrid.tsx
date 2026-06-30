// [N8lientDataGrid.tsx]
// 이 파일은 N8Lient 전체 어드민 화면에서 재사용되는 테이블 표준 그리드 컴포넌트입니다.
// TanStack Table v8 헤드리스 로직 기반으로 정렬, 행 선택을 지원하며 중앙 CSS를 사용합니다.
// 한국어 주석 표준을 준수합니다.

import React, { useState, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
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
}: N8lientDataGridProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // 외부 selectedIds 프로퍼티 변화와 TanStack 로컬 rowSelection 상태 동기화
  useEffect(() => {
    const nextSelection: RowSelectionState = {};
    selectedIds.forEach((id) => {
      nextSelection[id] = true;
    });
    setRowSelection(nextSelection);
  }, [selectedIds]);

  // 체크박스 컬럼 동적 정의
  const finalColumns = React.useMemo(() => {
    if (!showCheckbox) return columns;

    const checkboxColumn: ColumnDef<TData, any> = {
      id: "select",
      header: ({ table }) => {
        // 선택 가능한 총 로우 수 계산
        const selectableRows = table.getRowModel().flatRows.filter((r) => {
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
    },
    onSortingChange: setSorting,
    onRowSelectionChange: (updater) => {
      const nextSelection = typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(nextSelection);
      if (onSelectionChange) {
        onSelectionChange(Object.keys(nextSelection));
      }
    },
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
    <div className="ux_table_wrap">
      <table className="ux_table">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const isSortable = header.column.getCanSort() && header.column.id !== "select";
                return (
                  <th
                    key={header.id}
                    onClick={isSortable ? header.column.getToggleSortingHandler() : undefined}
                    style={{
                      cursor: isSortable ? "pointer" : "default",
                      userSelect: "none",
                      width: header.column.id === "select" ? "40px" : undefined,
                      textAlign: header.column.id === "select" ? "center" : "left",
                    }}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {isSortable && (
                        <span>
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
                className="ux_table_row_hover"
                style={{
                  backgroundColor: isSelected ? "#eff6ff" : "transparent",
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{
                      textAlign: cell.column.id === "select" ? "center" : "left",
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
