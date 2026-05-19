import React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Columns3 } from "lucide-react";

import {
  AUDIT_COLUMNS,
  defaultAuditColumnLayout,
  setAuditColumnVisible,
  type AuditColumnLayout,
} from "./audit-columns";

export type ColumnLayoutUpdate =
  | AuditColumnLayout
  | ((layout: AuditColumnLayout) => AuditColumnLayout);

export function AuditColumnLayoutMenu({
  layout,
  onChange,
}: {
  layout: AuditColumnLayout;
  onChange: (update: ColumnLayoutUpdate) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="inline-flex h-7 items-center justify-center gap-1.5 rounded-[3px] border border-white/[0.06] bg-transparent px-3 font-mono text-[11px] font-medium text-bankops-muted transition-colors hover:bg-white/[0.035] hover:text-bankops-text focus:outline-none focus:ring-2 focus:ring-bankops-accent/30"
          type="button"
        >
          <Columns3 aria-hidden="true" className="size-3.5" />
          Columns
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-50 max-h-[70vh] w-72 overflow-y-auto rounded-[4px] border border-white/[0.1] bg-bankops-sidebar p-2 text-sm text-bankops-text shadow-2xl shadow-black/45"
          sideOffset={8}
        >
          <DropdownMenu.Label className="px-2 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-bankops-muted">
            Visible columns
          </DropdownMenu.Label>
          {AUDIT_COLUMNS.map((column) => (
            <DropdownMenu.CheckboxItem
              checked={!layout.hidden.includes(column.id)}
              className="flex cursor-default items-center gap-2 rounded-[3px] px-2 py-1.5 text-xs outline-none hover:bg-white/[0.055] focus:bg-white/[0.075] data-[disabled]:opacity-40"
              disabled={
                !layout.hidden.includes(column.id) &&
                AUDIT_COLUMNS.length - layout.hidden.length <= 1
              }
              key={column.id}
              onCheckedChange={(checked) =>
                onChange((current) => setAuditColumnVisible(current, column.id, checked))
              }
              onSelect={(event) => event.preventDefault()}
            >
              <span className="w-4 text-bankops-accent">
                <DropdownMenu.ItemIndicator>✓</DropdownMenu.ItemIndicator>
              </span>
              Show {column.label}
            </DropdownMenu.CheckboxItem>
          ))}
          <DropdownMenu.Separator className="my-2 h-px bg-white/[0.08]" />
          <DropdownMenu.Item
            className="cursor-pointer rounded-[3px] px-2 py-1.5 text-xs text-bankops-muted outline-none hover:bg-white/[0.055] hover:text-bankops-text focus:bg-white/[0.075] focus:text-bankops-text"
            onSelect={() => onChange(defaultAuditColumnLayout())}
          >
            Reset layout
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
