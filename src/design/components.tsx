import React from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

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
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-[4px] border px-4 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300/35 disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" && "border-white/18 bg-[#dce1e7] text-[#08090a] hover:bg-white",
        variant === "secondary" &&
          "border-white/[0.1] bg-white/[0.035] text-bankops-text hover:border-white/18 hover:bg-white/[0.065]",
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
        "rounded-[5px] border border-white/[0.075] bg-bankops-panel p-4 shadow-[0_1px_0_rgba(255,255,255,0.018)_inset]",
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
    <article className="rounded-[5px] border border-white/[0.075] bg-white/[0.022] p-3.5">
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
      activeProps={{ className: "border-white/[0.075] bg-white/[0.055] text-white" }}
      className="flex items-center gap-3 rounded-[4px] border border-transparent px-3 py-2.5 text-sm text-bankops-muted transition-colors hover:border-white/[0.075] hover:bg-white/[0.04] hover:text-white"
      to={to}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span className="font-medium">{children}</span>
    </Link>
  );
}
