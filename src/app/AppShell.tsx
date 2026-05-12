import React from "react";
import { Outlet } from "@tanstack/react-router";
import { Home, Info, Landmark } from "lucide-react";
import { Toaster } from "sonner";

import { NavLink } from "../design/components";

export function AppShell() {
  return (
    <div className="min-h-screen bg-bankops-bg text-bankops-text">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r border-white/[0.075] bg-bankops-sidebar px-3 py-4 lg:block">
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
          <NavLink icon={Home} to="/">
            Home
          </NavLink>
          <NavLink icon={Info} to="/about">
            About
          </NavLink>
        </nav>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-10 border-b border-white/[0.075] bg-bankops-bg/95 px-4 py-3 backdrop-blur-xl lg:px-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-white">BankOps Mission Control</p>
            <p className="text-xs text-bankops-muted">Realtime rails · Audit · Analyst</p>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-6">
          <Outlet />
        </main>
      </div>

      <Toaster theme="dark" />
    </div>
  );
}
