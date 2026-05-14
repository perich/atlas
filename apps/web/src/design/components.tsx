import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Link } from "@tanstack/react-router";
import { Info, type LucideIcon } from "lucide-react";

import { cn } from "./utils";

export function Button({
  children,
  className,
  disabled,
  onClick,
  type = "button",
  variant = "primary",
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button
      className={cn(
        "inline-flex min-h-8 items-center justify-center gap-2 rounded-none border px-3 text-xs font-semibold uppercase tracking-[0.06em] transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300/35 disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" && "border-white/18 bg-[#f0f2f5] text-[#0c0d0e] hover:bg-white",
        variant === "secondary" &&
          "border-white/[0.08] bg-[#1a1c1f] text-bankops-muted hover:border-white/18 hover:bg-white/[0.06] hover:text-bankops-text",
        variant === "ghost" &&
          "border-transparent text-bankops-muted hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-bankops-text",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

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
        "rounded-md border border-white/[0.08] bg-bankops-panel p-4 shadow-[0_1px_0_rgba(255,255,255,0.018)_inset]",
        className,
      )}
    >
      {title ? (
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.13em] text-bankops-muted">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

export function PageHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#5a6272]">
        {eyebrow}
      </p>
      <h1 className="text-2xl font-semibold leading-tight tracking-tight text-bankops-text">
        {title}
      </h1>
    </header>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <article className="rounded-md border border-white/[0.08] bg-bankops-panel p-3.5">
      <div className="mb-3 flex items-center gap-2 text-bankops-muted">
        <Icon aria-hidden="true" className="size-4 text-sky-300/85" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">{label}</p>
      </div>
      <p className="text-[1.45rem] font-semibold leading-none tracking-tight text-white">{value}</p>
    </article>
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
      activeProps={{ className: "border-white/[0.14] bg-white/[0.055] text-bankops-text" }}
      className="inline-flex h-9 items-center gap-2 border border-transparent px-3 text-xs font-medium text-bankops-muted transition-colors hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-bankops-text"
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
        className="z-50 max-w-80 border border-white/[0.12] bg-[#111315] px-3 py-2.5 text-left text-xs leading-5 text-bankops-muted shadow-xl shadow-black/35"
        sideOffset={8}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-[#111315]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export function InfoTooltip({ children, label }: { children: string; label: string }) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        <button
          aria-label={label}
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-white/[0.12] text-bankops-muted transition-colors hover:border-white/25 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
          type="button"
        >
          <Info aria-hidden="true" className="size-3" />
        </button>
      </TooltipPrimitive.Trigger>
      <TooltipContent>{children}</TooltipContent>
    </TooltipPrimitive.Root>
  );
}
