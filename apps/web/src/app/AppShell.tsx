import React from "react";
import { Outlet } from "@tanstack/react-router";
import { Bot, ClipboardList, Landmark, RadioTower } from "lucide-react";

import { NavLink } from "../design/components";

export function AppShell() {
  return (
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
        <aside className="fixed inset-y-0 left-0 z-20 w-60 border-r border-white/[0.075] bg-bankops-sidebar px-3 py-4">
          <div className="rounded-[5px] border border-white/[0.075] bg-white/[0.022] p-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-[4px] border border-white/[0.075] bg-white/[0.022] text-bankops-text">
                <Landmark aria-hidden="true" className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-white">BankOps</p>
                <p className="text-xs text-bankops-muted">Mission Control</p>
              </div>
            </div>
          </div>

          <nav className="mt-4 space-y-1">
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
        </aside>

        <div className="pl-60">
          <header className="sticky top-0 z-10 border-b border-white/[0.075] bg-bankops-bg/95 px-6 py-3 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-white">BankOps Mission Control</p>
              <p className="text-xs text-bankops-muted">Realtime rails · Audit · Analyst</p>
            </div>
          </header>

          <main className="p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
