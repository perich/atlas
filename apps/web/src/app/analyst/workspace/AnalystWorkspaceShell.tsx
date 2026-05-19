import React from "react";
import { Sparkles } from "lucide-react";

export function AnalystWorkspaceShell({
  canvas,
  controlRail,
  statusBar,
}: {
  canvas: React.ReactNode;
  controlRail: React.ReactNode;
  statusBar: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-5.25rem)] flex-col overflow-hidden rounded-[4px] border border-white/[0.06] bg-bankops-panel">
      <div className="border-b border-white/[0.06] bg-bankops-panel px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-bankops-text">
              Analyst Workspace
            </h1>
            <div className="mt-3 flex items-start gap-2.5 rounded-[4px] border border-bankops-accent/20 bg-bankops-accent/[0.055] px-3 py-2 text-sm leading-6 text-cyan-50/80">
              <Sparkles className="mt-1 size-3.5 shrink-0 text-bankops-accent" />
              <p>
                This is a demo of what an on-demand generative UI could look like. Under the hood
                we're using a real LLM to reason over structured data and compose a custom UI based
                on your prompt in real time! Inspired by{" "}
                <a
                  className="font-medium text-cyan-100 underline decoration-bankops-accent/40 underline-offset-4 hover:text-white"
                  href="https://blog.cloudflare.com/code-mode/"
                  rel="noreferrer"
                  target="_blank"
                >
                  Cloudflare&apos;s Code Mode concept
                </a>
                .
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 rounded-[2px] border border-bankops-accent/35 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-bankops-accent">
            Experimental
          </span>
        </div>
      </div>
      <div className="border-b border-white/[0.06] bg-bankops-sidebar px-6 py-0">{statusBar}</div>

      <div className="grid min-h-0 flex-1 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="overflow-y-auto border-b border-white/[0.06] bg-bankops-sidebar p-5 xl:border-b-0 xl:border-r">
          {controlRail}
        </aside>
        <main className="overflow-y-auto bg-bankops-panel p-6">{canvas}</main>
      </div>
    </div>
  );
}
