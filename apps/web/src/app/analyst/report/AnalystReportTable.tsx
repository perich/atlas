import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsLeftRight } from "lucide-react";
import type { AnalystReportBlock } from "@bankops/contracts";

import { cn } from "../../../design/utils";

type DataTableBlock = Extract<AnalystReportBlock, { type: "dataTable" }>;
type SortState = { key: string; direction: "asc" | "desc" } | null;

const PAGE_SIZE = 10;

export function AnalystReportTable({ block }: { block: DataTableBlock }) {
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(0);
  const rows = useMemo(() => sortRows(block.rows, sort), [block.rows, sort]);
  const pageCount = Math.max(Math.ceil(rows.length / PAGE_SIZE), 1);
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRows = rows.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <section className="rounded-md border border-white/[0.08] bg-bankops-panel p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.13em] text-bankops-muted">
          {block.title}
        </h3>
        <div className="flex items-center gap-2 font-mono text-[10px] text-bankops-muted">
          <ChevronsLeftRight className="size-3" />
          {rows.length} rows
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[720px] table-fixed border-separate border-spacing-0 text-left text-xs">
          <thead className="text-[10px] uppercase tracking-[0.12em] text-bankops-muted">
            <tr>
              {block.columns.map((column) => (
                <th
                  className={cn(
                    "w-44 border-b border-white/[0.08] px-3 py-2",
                    column.align === "right" && "text-right",
                  )}
                  key={column.key}
                >
                  <button
                    className={cn(
                      "inline-flex max-w-full items-center gap-1 truncate hover:text-white",
                      column.align === "right" && "justify-end",
                    )}
                    onClick={() => {
                      setSort(nextSort(sort, column.key));
                      setPage(0);
                    }}
                    type="button"
                  >
                    <span className="truncate">{column.label}</span>
                    <SortIcon active={sort?.key === column.key} direction={sort?.direction} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr
                className="text-bankops-text"
                key={rowKey(row, rowIndex + currentPage * PAGE_SIZE)}
              >
                {block.columns.map((column) => (
                  <td
                    className={cn(
                      "max-w-44 truncate border-b border-white/[0.055] px-3 py-2",
                      column.align === "right" && "text-right font-mono",
                    )}
                    key={column.key}
                    title={String(row[column.key] ?? "")}
                  >
                    {String(row[column.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > PAGE_SIZE ? (
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-bankops-muted">
          <span>
            Page {currentPage + 1} of {pageCount}
          </span>
          <div className="flex gap-2">
            <button
              className="border border-white/[0.08] px-2 py-1 disabled:opacity-40"
              disabled={currentPage === 0}
              onClick={() => setPage((current) => Math.max(current - 1, 0))}
              type="button"
            >
              Previous
            </button>
            <button
              className="border border-white/[0.08] px-2 py-1 disabled:opacity-40"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage((current) => Math.min(current + 1, pageCount - 1))}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SortIcon({ active, direction }: { active: boolean; direction?: "asc" | "desc" }) {
  if (!active) {
    return <ArrowDown className="size-3 opacity-25" />;
  }
  return direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />;
}

function nextSort(current: SortState, key: string): SortState {
  if (current?.key !== key) {
    return { direction: "asc", key };
  }
  return { direction: current.direction === "asc" ? "desc" : "asc", key };
}

function sortRows(rows: DataTableBlock["rows"], sort: SortState) {
  if (!sort) {
    return rows;
  }

  return Array.from(rows).sort((left, right) =>
    compareTableValues(left[sort.key], right[sort.key], sort.direction),
  );
}

function compareTableValues(
  left: string | number | boolean | null | undefined,
  right: string | number | boolean | null | undefined,
  direction: "asc" | "desc",
) {
  const directionMultiplier = direction === "asc" ? 1 : -1;
  if (typeof left === "number" && typeof right === "number") {
    return (left - right) * directionMultiplier;
  }
  return String(left ?? "").localeCompare(String(right ?? "")) * directionMultiplier;
}

function rowKey(row: Record<string, unknown>, index: number) {
  if (typeof row.id === "string" || typeof row.id === "number") {
    return String(row.id);
  }
  if (typeof row.traceId === "string" || typeof row.traceId === "number") {
    return String(row.traceId);
  }
  return `row-${index}`;
}
