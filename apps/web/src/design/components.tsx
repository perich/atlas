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
        "inline-flex min-h-8 items-center justify-center gap-2 rounded-[3px] border px-3 text-xs font-semibold uppercase tracking-[0.06em] transition-colors focus:outline-none focus:ring-2 focus:ring-bankops-accent/35 disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" &&
          "border-bankops-accent/70 bg-bankops-accent text-bankops-bg hover:bg-cyan-300",
        variant === "secondary" &&
          "border-white/[0.08] bg-bankops-surface text-bankops-muted hover:border-white/18 hover:bg-white/[0.06] hover:text-bankops-text",
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

export function PageHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header>
      <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-bankops-subtle">
        {eyebrow}
      </p>
      <h1 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-bankops-text">
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
    <article className="rounded-[4px] border border-white/[0.06] bg-bankops-panel p-3.5">
      <div className="mb-3 flex items-center gap-2 text-bankops-muted">
        <Icon aria-hidden="true" className="size-4 text-bankops-accent" />
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</p>
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
      activeProps={{
        className: "border-white/[0.14] bg-bankops-surface font-semibold text-bankops-text",
      }}
      className="inline-flex h-9 items-center gap-2 rounded-[2px] border border-transparent px-3 text-[13px] font-medium text-bankops-muted transition-colors hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-bankops-text"
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
