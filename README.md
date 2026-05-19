# BankOps Mission Control

BankOps Mission Control is a greenfield internal-ops demo for a modern bank core.

It is meant to feel like a real back-office surface: dense, fast, operationally specific, and built
with enough care that the architecture is part of the demo. The app covers realtime balance-sheet
movement, rail health, liquidity pressure, a high-scale audit log, and an experimental LLM CodeMode
analyst workspace.

This is not a consumer banking mockup. The goal is to show product taste and engineering judgment in
the same project: a polished operator UI, clean runtime boundaries, bank-shaped domain modeling, and
a monorepo that is structured to be understood.

- Live demo: https://bankops-mission-control.onrender.com
- Product/spec: [SPEC.md](./SPEC.md)
- Domain language: [CONTEXT.md](./CONTEXT.md)
- Architecture decisions: [docs/adr](./docs/adr)
- Deployment notes: [docs/deployment.md](./docs/deployment.md)

## Why It Exists

The main engineering idea is simple: high-volume financial activity should not be tied to React
render frequency.

The server owns the synthetic bank core. The browser receives a realtime WebSocket firehose, decodes
fixed-width binary movement batches in a worker, renders the busiest visual path with
OffscreenCanvas, and gives React compact snapshots for the surrounding product UI.

The `/analyst` route pushes the demo further: it uses real OpenRouter-backed CodeMode inference to
generate analysis over BankOps data, but the model does not generate React. It writes sandboxed
TypeScript, calls bounded analyst tools, submits a validated report spec, and the app renders that
spec with BankOps-owned UI primitives.

That is the throughline of the project: use advanced tools, but keep ownership of the product
surface and runtime boundaries.

## Product Tour

### `/ops` — Operations Control Plane

The realtime view. It shows a Balance Sheet Tape of debits and credits across customer deposits,
settlement cash, reserve cash, rail clearing, stablecoin treasury, fee income, and exception queues.

Highlights:

- WebSocket firehose adjustable from `1/s` to `10k/s`
- Fixed-width binary frames shared by server and worker
- Worker-owned ingest, decode, reconnect state, rolling windows, and tape rendering
- OffscreenCanvas for the dense movement feed
- React snapshots via `useSyncExternalStore`
- Rail health, liquidity pressure, exception depth, sparklines, heatmaps, and a performance HUD

React owns the operator shell. The worker owns the hot path.

### `/audit` — Bank Core Audit Log

The table-engineering route. It works over a deterministic 100k-row bank-core audit log with
payments, journals, settlements, reconciliation, risk, liquidity, rail-health, cutoff, config, and
operator events.

Highlights:

- Server-side filtering and stable sorting
- Cursor and offset-backed window fetching
- TanStack Virtual for a large logical table with a small mounted row count
- Bounded client-side window cache
- URL-persisted investigation state
- Local column order, width, and visibility preferences
- Draggable, resizable, sortable column headers

The point is to behave like a real internal investigation tool, not a small in-memory sample table.

### `/analyst` — Experimental CodeMode Analyst

The generative UI route. An operator asks a plain-English question, the server runs CodeMode against
bounded BankOps tools, and the browser renders a complete validated `AnalystReportSpec`.

Highlights:

- Real OpenRouter model inference, configured on the server
- Node isolate sandbox for model-authored analysis code
- Bounded analyst tools returning compact rollups and capped samples
- SSE run trace with observable execution facts, validation attempts, and raw model trace snippets
- Report primitives for metrics, charts, tables, timelines, rail matrices, customer lists, and
  callouts
- Validation before rendering, with no fake product fallback

The constraint matters: the model can perform analysis, but the app still owns rendering, layout,
interactions, and data access.

## Architecture

```txt
apps/
  web/                 React/Vite app, routes, workers, design primitives
  server/              Fastify server for local dev and production

packages/
  contracts/           shared schemas, domain types, binary frame codec
  ops-tape-sim/        server-only balance-sheet movement simulator
  audit-log-model/     server-only audit generation, filtering, sorting, facets
  analyst-model/       server-only analyst rollups and report-facing views
```

The package boundaries are intentional:

- `@bankops/contracts` is shared by browser, worker, server, and tests.
- `@bankops/ops-tape-sim`, `@bankops/audit-log-model`, and `@bankops/analyst-model` are server-only.
- `@bankops/web` does not import server-only model packages.
- `/analyst` renders validated report specs, not model-authored React.

## Technical Choices

- **Fastify** for the Node server, API routes, static SPA serving, WebSocket upgrade, health check,
  and Analyst SSE endpoint.
- **WebSocket + binary frames** for the high-volume Ops stream.
- **Web Worker + OffscreenCanvas** for hot-path decode and rendering off the main thread.
- **React + `useSyncExternalStore`** for a clean bridge from worker-authored snapshots into UI.
- **TanStack Query, Router, and Virtual** for data fetching, URL state, and large-table rendering.
- **OpenRouter + TanStack AI CodeMode** for real model-backed Analyst runs.
- **Node 24 isolate runtime** for sandboxed model-authored TypeScript.
- **Zod contracts** for shared API, stream, and report validation.
- **Tailwind CSS + Radix primitives** for a dense desktop-console UI without a heavyweight design
  system.
- **Render Web Service** for a single same-origin deploy: SPA, HTTP API, SSE, WebSocket, and health
  check.

The quality bar is part of the point: typed package boundaries, ADRs for major decisions,
server-owned data, focused tests, pre-commit verification, and code organization that is meant to
hold up after the demo.

## Local Development

Requirements:

- Node `24`
- pnpm `11.1.0`

```bash
pnpm install
pnpm dev
```

Local URLs:

- Web app: `http://127.0.0.1:5173`
- Fastify server: `http://127.0.0.1:8787`

The Analyst route uses real model inference. Copy `.env.example` to `.env` and set:

```bash
OPENROUTER_API_KEY=...
ANALYST_MODEL=openai/gpt-5.5
```

Both values are server-only. Do not prefix them with `VITE_`.

Useful scripts:

```bash
pnpm build
pnpm start
pnpm typecheck
pnpm lint
pnpm test:env
pnpm test:secrets
pnpm test:spelling
pnpm test:sherif
pnpm test:knip
pnpm test:deps
pnpm test:size
pnpm test:run
pnpm test:e2e
```

## Production

Production runs as one Render Web Service using `@bankops/server`.

`render.yaml` defines the deploy contract: Node `24`, `pnpm build`, `pnpm start`, `/healthz`, and
server-side `OPENROUTER_API_KEY` / `ANALYST_MODEL` environment variables.

Render terminates public TLS. The SPA, HTTP API, Analyst SSE, and realtime Ops WebSocket all run
same-origin.
