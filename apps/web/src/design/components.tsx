import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Link } from "@tanstack/react-router";
import { Info, type LucideIcon } from "lucide-react";

import { cn } from "./utils";

export function Panel({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[4px] border border-white/[0.06] bg-bankops-panel p-4 shadow-[0_8px_40px_rgba(0,0,0,0.18)]",
        className,
      )}
    >
      {title ? (
        <h2 className="mb-3 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-bankops-subtle">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

export function NavLink({
  children,
  icon: Icon,
  to,
}: {
  children: React.ReactNode;
  icon: LucideIcon;
  to: string;
}) {
  return (
    <Link
      activeProps={{
        className: "border-white/[0.14] bg-bankops-surface font-semibold text-bankops-text",
      }}
      className="inline-flex h-full items-center gap-2 border border-transparent px-3 text-[13px] font-medium text-bankops-muted transition-colors hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-bankops-text"
      to={to}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span className="font-medium">{children}</span>
    </Link>
  );
}

export const TooltipProvider = TooltipPrimitive.Provider;

function TooltipContent({ children }: { children: string }) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        className="z-50 max-w-80 border border-white/[0.12] bg-bankops-sidebar px-3 py-2.5 text-left text-xs leading-5 text-bankops-muted shadow-xl shadow-black/35"
        sideOffset={8}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-bankops-sidebar" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export const InfoTooltip = React.memo(function InfoTooltip({
  children,
  label,
}: {
  children: string;
  label: string;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        <button
          aria-label={label}
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-white/[0.10] text-bankops-muted transition-colors hover:border-bankops-accent/45 hover:text-bankops-text focus:outline-none focus:ring-2 focus:ring-bankops-accent/30"
          type="button"
        >
          <Info aria-hidden="true" className="size-3" />
        </button>
      </TooltipPrimitive.Trigger>
      <TooltipContent>{children}</TooltipContent>
    </TooltipPrimitive.Root>
  );
});
