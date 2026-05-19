# BankOps Mission Control

BankOps Mission Control is a greenfield internal-ops demo for a modern bank core.

It is built to feel like a real back-office tool: dense, fast, operationally specific, and technical
enough that an engineer could imagine using it during a real incident. The app shows live
balance-sheet movement, rail health, liquidity pressure, a high-scale audit log, and an experimental
LLM CodeMode analyst workspace.

This is not a consumer banking mockup. The goal is to demonstrate product taste and engineering
depth in the same project: a polished operator experience, strong runtime boundaries, thoughtful
data modeling, and a codebase that is meant to be read.

- Live demo: https://bankops-mission-control.onrender.com
- Product/spec: [SPEC.md](./SPEC.md)
- Domain language: [CONTEXT.md](./CONTEXT.md)
- Architecture decisions: [docs/adr](./docs/adr)
- Deployment notes: [docs/deployment.md](./docs/deployment.md)

## What To Notice

The core design choice is that high-volume financial activity should not be coupled to React render
frequency.

The server owns the synthetic bank core. The browser receives a realtime WebSocket firehose, decodes
fixed-width binary movement batches in a worker, renders the busiest visual path with
OffscreenCanvas, and gives React compact state snapshots for the rest of the product UI.

That split keeps the app responsive even when the demo is pushing thousands of bank-core movements
per second. It also gives the codebase a clean shape: protocol code, domain simulation, server APIs,
workers, and React surfaces each have their own job.

The newer `/analyst` route adds a second kind of technical demo: real model-backed generative UI.
The model can write sandboxed TypeScript to analyze BankOps data, but it cannot generate arbitrary
React. It submits a validated report spec, and the app renders that spec with BankOps-owned
components. That keeps the impressive part of CodeMode without giving up product control.

## Product Tour

### `/ops` — Operations Control Plane

This is the realtime mission-control view.

The main surface is the Balance Sheet Tape, a terminal-style feed of debits and credits across bank
balance-sheet buckets: customer deposits, settlement cash, reserve cash, rail clearing, stablecoin
treasury, fee income, and exception queues.

What it demonstrates:

- A server-owned WebSocket firehose with adjustable rates from `1/s` to `10k/s`
- Fixed-width binary frames shared by server and browser worker
- Worker-owned socket ingest, binary decode, reconnect state, rolling windows, and tape rendering
- OffscreenCanvas rendering for the dense movement feed
- React subscribing through `useSyncExternalStore`, not rerendering once per event
- Live rail health across ACH, wire, instant payments, cards, internal ledger, and stablecoin rails
- A performance HUD showing FPS, frame cost, sequence lag, decode rate, row render rate, and backlog
  pressure
- Rolling sparklines and a rail-by-bucket heatmap for the last few seconds of activity

The short version: React owns the operator shell. The worker owns the hot path.

### `/audit` — Bank Core Audit Log

This is the table-engineering route.

It works over a deterministic 100k-row bank-core audit log with payments, journals, settlements,
reconciliation events, risk events, liquidity events, rail-health changes, cutoff events,
configuration changes, and operator actions.

What it demonstrates:

- Server-side filtering by time range, severity, rail, and status
- Stable server-side sorting with cursor and offset-backed window fetching
- TanStack Virtual for a large logical table with a small mounted row count
- A bounded client-side window cache so scrolling does not pull the full dataset into memory
- URL-persisted filters and sort for shareable investigations
- Local column preferences for order, width, and visibility
- Draggable, resizable, sortable column headers
- Loading skeletons and a render trace that makes table behavior observable

The important part is that the route behaves like a real internal investigation tool, not a small
in-memory sample table.

### `/analyst` — Experimental CodeMode Analyst

This is the most experimental part of the app.

An operator asks a plain-English question. The server runs real OpenRouter-backed CodeMode inference
against bounded BankOps analyst tools. The model analyzes enriched audit-log data, writes sandboxed
TypeScript, and submits a complete `AnalystReportSpec`. The browser renders only that validated
report snapshot.

What it demonstrates:

- Real model inference through OpenRouter, configured entirely on the server
- A Node isolate as the primary CodeMode sandbox
- Bounded analyst tools that return compact rollups and capped samples, not unbounded row dumps
- SSE streaming for run status, observable execution facts, validation attempts, and raw model trace
  snippets
- A report renderer that supports metrics, charts, tables, timelines, rail matrices, customer lists,
  and callouts
- Recharts wrapped behind BankOps-owned report primitives
- Local table sorting and pagination over embedded report rows
- Validation before rendering, with no fake product fallback

The constraint is the point: the model can do analysis work, but the app still owns the UI system.
There is no generated React, no generated event handlers, no browser subscriptions, and no hidden
post-render data sources.

The copy in the route calls this out as a work-in-progress experiment. That is intentional. It is
showing where on-demand generated frontend UIs can go while still keeping the engineering guardrails
visible.

## Architecture In Plain English

BankOps is one deployable app, but internally it is split by responsibility.

```txt
apps/
  web/                 React/Vite app, routes, workers, and design primitives
  server/              Fastify server for local dev and production

packages/
  contracts/           shared schemas, domain types, and binary frame codec
  ops-tape-sim/        server-only realtime balance-sheet simulator
  audit-log-model/     server-only audit log generation, filtering, sorting, and facets
  analyst-model/       server-only analyst rollups and report-facing data views

docs/
  adr/                 architecture decision records
  deployment.md        Render deployment shape and smoke commands
```

The runtime boundaries are deliberate:

- `@bankops/contracts` is shared by browser, worker, server, and tests.
- `@bankops/ops-tape-sim`, `@bankops/audit-log-model`, and `@bankops/analyst-model` are server-only.
- `@bankops/web` does not import server-only model packages.
- The Analyst route renders validated report specs, not model-authored React.

That structure makes the monorepo easy to navigate and keeps expensive or sensitive logic out of the
browser.

## Technical Choices

The stack is intentionally modern, but not novelty-driven.

- **Fastify** runs the server, API, static SPA, WebSocket upgrade, health check, and Analyst SSE
  endpoint.
- **WebSocket + binary frames** carry the high-volume Ops stream with lower overhead than
  JSON-per-event.
- **Web Worker + OffscreenCanvas** keep hot-path decode and rendering away from the main thread.
- **React + `useSyncExternalStore`** provide a clean bridge from worker-authored snapshots into the
  UI.
- **TanStack Query, Router, and Virtual** handle data fetching, URL state, and large-table rendering.
- **OpenRouter + TanStack AI CodeMode** power the real Analyst workflow with a server-selected model.
- **Node 24 isolate runtime** is the primary sandbox path for model-authored analysis code.
- **Zod contracts** validate shared API, stream, and report shapes.
- **Recharts** provides chart primitives, but the app owns the report rendering layer.
- **Tailwind CSS + Radix primitives** support a dense desktop-console style without a heavy design
  system.
- **Render Web Service** deploys the whole app as one same-origin Node service.

The quality bar is also part of the demo: typed package boundaries, ADRs for major decisions,
server-owned data, focused tests, pre-commit verification, and a code structure designed to survive
more than one demo session.

## How The Data Flows

```txt
Render Web Service
  -> @bankops/server
       /                  built React SPA
       /ops               SPA fallback
       /audit             SPA fallback
       /analyst           SPA fallback
       /api/audit          cursor-windowed audit API
       /api/audit/facets   audit filter facets
       /api/analyst/runs   SSE CodeMode analyst runs
       /stream             WebSocket realtime ops firehose
       /healthz            health check

Browser
  -> React shell
  -> ops-stream.worker.ts
       WebSocket connection
       fixed-width binary decode
       rolling movement windows
       OffscreenCanvas tape renderer
       compact snapshots to React
  -> TanStack Virtual audit table
       bounded window cache
       URL query state
       local column preferences
  -> Analyst report renderer
       validated report snapshots
       BankOps-owned chart, table, metric, timeline, and card primitives
```

The hot and warm paths are separate:

- Hot path: binary movement batches feed the worker and OffscreenCanvas tape.
- Warm path: compact JSON snapshots feed React dashboard panels.
- Control path: JSON messages change stream rate on the existing WebSocket.
- Analyst path: SSE streams CodeMode progress, then a validated report spec.

At `10k` movements/sec, the hot stream is roughly `332 kB/s` before WebSocket/TLS overhead:
`10,000 * 33-byte records + 60 * 36-byte headers`. Batching keeps the protocol overhead small.

## Local Development

Requirements:

- Node `24`
- pnpm `11.1.0`

Install dependencies:

```bash
pnpm install
```

Run the web app and server together:

```bash
pnpm dev
```

Local URLs:

- Web app: `http://127.0.0.1:5173`
- Fastify server: `http://127.0.0.1:8787`

The Vite dev server proxies API and stream traffic to Fastify.

### Analyst Model Configuration

The Analyst route uses real model inference. For local development, copy `.env.example` to `.env`
and set:

```bash
OPENROUTER_API_KEY=...
ANALYST_MODEL=openai/gpt-5.5
```

Both values are read by the server. Do not prefix them with `VITE_`; the browser should not receive
provider credentials or choose the model.

Useful scripts:

```bash
pnpm build
pnpm start
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test:run
pnpm test:e2e
```

`pnpm test:e2e` includes a real `/analyst` CodeMode happy-path test. It is skipped unless
`OPENROUTER_API_KEY` and `ANALYST_MODEL` are present in the Playwright process environment.

## Production Shape

Production runs as one Render Web Service using `@bankops/server`.

`render.yaml` defines the deploy contract:

```txt
buildCommand: npm install -g pnpm@11.1.0 && pnpm install --frozen-lockfile && pnpm build
startCommand: pnpm start
healthCheckPath: /healthz
NODE_VERSION: 24
OPENROUTER_API_KEY: set in Render dashboard
ANALYST_MODEL: set in Render dashboard
```

Render terminates public TLS. The app, HTTP API, SSE Analyst runs, and WebSocket stream all stay
same-origin:

- `https://<host>/` for the SPA and HTTP API
- `https://<host>/api/analyst/runs` for Analyst SSE
- `wss://<host>/stream` for the realtime Ops firehose
