import React, { useEffect, useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { Bot, ClipboardList, Landmark, RadioTower } from "lucide-react";

import { NavLink, TooltipProvider } from "../design/components";

export function AppShell() {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen bg-bankops-bg text-bankops-text">
        <div className="grid min-h-screen place-items-center px-6 text-center lg:hidden">
          <div>
            <Landmark aria-hidden="true" className="mx-auto mb-4 size-8 text-bankops-muted" />
            <h1 className="text-xl font-semibold text-white">Please open on desktop :)</h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-bankops-muted">
              BankOps is tuned for dense operator workflows on desktop-sized screens.
            </p>
          </div>
        </div>

        <div className="hidden lg:block">
          <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-bankops-sidebar">
            <div className="flex h-9 items-center justify-between px-5">
              <div className="flex h-full items-center gap-3">
                <div className="flex items-center gap-2.5 text-bankops-text">
                  <Landmark aria-hidden="true" className="size-4 shrink-0" />
                  <span className="text-[13px] font-semibold tracking-[-0.01em] text-bankops-text">
                    BankOps
                  </span>
                </div>
                <div className="h-4 w-px bg-white/[0.08]" />
                <nav className="flex h-full items-stretch gap-0">
                  <NavLink icon={RadioTower} to="/ops">
                    Ops
                  </NavLink>
                  <NavLink icon={ClipboardList} to="/audit">
                    Audit
                  </NavLink>
                  <NavLink icon={Bot} to="/analyst">
                    Analyst
                  </NavLink>
                </nav>
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-bankops-subtle">
                <span className="size-1.5 rounded-full bg-bankops-accent" />
                <UtcClock />
              </div>
            </div>
          </header>

          <main className="p-5">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

function UtcClock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1_000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <time dateTime={time.toISOString()}>
      UTC{" "}
      {time.toLocaleTimeString([], {
        hour: "2-digit",
        hour12: false,
        minute: "2-digit",
        second: "2-digit",
        timeZone: "UTC",
      })}
    </time>
  );
}
