# BankOps Mission Control

A high-performance internal operations prototype for a modern chartered bank: realtime balance-sheet
movements, rail health, liquidity pressure, and a high-scale bank-core audit log.

This is not a consumer banking clone. BankOps is built as the kind of dense back-office surface an
operator or engineer would use to understand what is happening inside a bank core under live
operational pressure.

- Live demo: https://bankops-mission-control.onrender.com
- Product/spec: [SPEC.md](./SPEC.md)
- Domain language: [CONTEXT.md](./CONTEXT.md)
- Architecture decisions: [docs/adr](./docs/adr)
- Deployment notes: [docs/deployment.md](./docs/deployment.md)

## What This Demonstrates

BankOps is a staff-level frontend/product engineering portfolio project. The main technical point is
that high-volume financial activity should not be coupled to React render frequency.

The app uses a real Node/Fastify server to own the synthetic bank data. The browser receives a
WebSocket firehose, decodes binary movement batches in a worker, renders the hot path with
OffscreenCanvas, and lets React handle the operator shell, controls, metrics, and table UI.

The result is a product surface that is fast, bank-flavored, and measurable:

- server-owned realtime data over WebSocket
- fixed-width binary movement frames shared by server and worker
- worker-owned stream connection, binary decode, reconnect state, rolling windows, and canvas render
- OffscreenCanvas Balance Sheet Tape for dense live movement rendering
- React snapshots via `useSyncExternalStore`, not one React update per event
- server-backed audit API over a 100k-row synthetic bank-core log
- virtualized audit table with bounded row cache, URL filters/sort, and local column preferences
- OpenRouter-backed CodeMode analyst route that returns validated Analyst Reports over enriched
  audit-log data
- Render single-service deploy serving SPA, HTTP API, health check, and WebSocket from one origin

## Product Routes

### `/ops` — Operations Control Plane

The Ops route is the realtime "god mode" view.

The hero component is a worker-rendered Balance Sheet Tape: a dense terminal-style feed of debits
and credits against bank balance-sheet buckets such as customer deposits, settlement cash, reserve
cash, rail clearing, stablecoin treasury, fee income, and exception queue.

Implemented surfaces:

- live Balance Sheet Tape rendered with OffscreenCanvas
- stream-rate controls for `1/s`, `50/s`, `2k/s`, and `10k/s`
- rail health for ACH, wire, instant payments, card, internal ledger, and stablecoin rails
- cumulative credits/debits, event rate, liquidity reserve, and exception queue depth
- performance HUD with render FPS, frame cost, sequence lag, decoded rate, rendered row rate, and
  backlog pressure
- rolling sparklines for throughput, latency, failures, queue depth, liquidity, and flow totals
- live rail-by-bucket concentration heatmap over the last 5 seconds of decoded movements
- automatic WebSocket reconnect and visible connection status

The important architecture detail: the worker owns the WebSocket and hot rendering path. React only
receives compact snapshots for product UI state.

### `/audit` — Bank Core Audit Log

The Audit route is a table engineering showcase over bank-shaped operational data.

It renders a server-backed audit log containing payments, journals, settlements, reconciliation
events, risk events, liquidity events, rail-health changes, cutoff events, configuration changes,
and operator actions.

Implemented surfaces:

- 100k deterministic synthetic audit entries generated once per server process
- server-side filtering by time range, severity, rail, and status
- single-column server-side sort with stable id tie-breaker
- cursor and offset-backed window fetching for normal scrolling and direct scrollbar seeks
- TanStack Virtual table with fixed-height dense rows
- bounded client-side window cache so scrolling does not load the full dataset into memory
- URL-persisted filters and sort for shareable investigation views
- localStorage-backed column order, width, and visibility preferences
- draggable, resizable, sortable column headers
- column visibility menu
- row loading skeletons instead of repeated loading text
- render trace showing visible range, mounted rows, query latency, main-thread p95, cached rows,
  loaded windows, and loaded ranges

### `/analyst` — Analyst Workspace

The Analyst route is a constrained CodeMode-style analyst surface over enriched Bank Core Audit Log
data.

The flow is: an Operator asks a natural-language question, the server runs real OpenRouter-backed
CodeMode inference against bounded BankOps analyst tools, and the route renders a complete validated
Analyst Report. The model writes sandboxed TypeScript for analysis, but it does not generate React,
JSX, browser handlers, subscriptions, or post-render data sources. Rendering and layout remain owned
by the app. There is no fake or precomputed product fallback; if the server is missing model
configuration or the provider fails, `/analyst` shows an error state.

Curated prompts in the UI exercise different report shapes:

- `Find the riskiest operating pattern in today's audit log`
- `Show rail health and exception pressure by hour`
- `Which customers need operations attention before cutoff?`

## Architecture

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
       /stream             WebSocket upgrade for realtime ops firehose
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
```

The hot and warm paths are deliberately separate:

- Hot path: binary movement batches at 60 Hz feed the worker and OffscreenCanvas tape.
- Warm path: JSON aggregate snapshots at roughly 4 Hz feed React dashboard panels.
- Control path: JSON messages let the client change stream rate on the existing WebSocket.

At `10k` movements/sec, the hot stream payload is roughly `332 kB/s` before WebSocket/TLS overhead:
`10,000 * 33-byte records + 60 * 36-byte headers`. Batching keeps protocol overhead small.

## Repo Layout

```txt
apps/
  web/                 React/Vite app, routes, workers, design primitives
  server/              Fastify server for local dev and Render production

packages/
  contracts/           shared domain types, API schemas, stream frame encoder/decoder
  ops-tape-sim/        server-only realtime balance-sheet movement simulator
  audit-log-model/     server-only audit entry generation, filtering, sorting, facets, cursors
  analyst-model/       server-only analyst rollups and report-facing views

docs/
  adr/                 architecture decision records
  deployment.md        Render deployment shape and smoke commands
```

Runtime boundaries are intentional:

- `@bankops/contracts` is shared by browser, worker, server, and tests.
- `@bankops/ops-tape-sim` is server-only.
- `@bankops/audit-log-model` is server-only.
- `@bankops/analyst-model` is server-only.
- `@bankops/web` does not import simulation/model packages directly.

## Tech Choices

- **Fastify**: small, fast Node server with clean API, static hosting, and WebSocket support.
- **WebSocket**: simple long-lived transport for a real server-owned firehose.
- **Fixed-width binary frames**: lower parse overhead than JSON-per-event and a stronger protocol
  boundary for the hot stream.
- **Web Worker**: keeps socket ingest, decode, rolling-window computation, and canvas rendering off
  the main thread.
- **OffscreenCanvas**: renders the dense Balance Sheet Tape without involving the DOM or React.
- **React + `useSyncExternalStore`**: minimal bridge from worker-authored snapshots to React UI.
- **TanStack Router**: typed route/search-state model for URL-addressable audit views.
- **TanStack Query**: request lifecycle, cancellation, stale timing, and cache keys for audit windows.
- **TanStack Virtual**: small mounted row count over a large logical result set.
- **TanStack AI Code Mode + OpenRouter**: real server-side analyst inference with a
  server-configured model slug.
- **Node isolate driver**: primary CodeMode sandbox path, pinned to Node 24 for compatibility.
- **Recharts**: general chart primitives for validated Analyst Reports.
- **Tailwind CSS + Radix primitives**: fast iteration on a dense desktop console UI.
- **Render Web Service**: one deployable Node process serving SPA, API, WebSocket, and health check
  from the same origin.

## Local Development

Requirements:

- Node `24`
- pnpm `11.1.0`

Analyst route model configuration:

- `OPENROUTER_API_KEY`: OpenRouter API key used only by the Fastify server.
- `ANALYST_MODEL`: single OpenRouter model slug selected by the server.

Copy `.env.example` to `.env` for local development and set both values before using `/analyst`.
Do not prefix them with `VITE_`; the browser must not receive provider credentials or choose the
model.

Install dependencies:

```bash
pnpm install
```

Run the web app and server together:

```bash
pnpm dev
```

Development servers:

- Web: `http://127.0.0.1:5173`
- Server: `http://127.0.0.1:8787`

The Vite dev server proxies API and stream traffic to the Fastify server.

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

`pnpm test:e2e` includes a real `/analyst` CodeMode happy-path test that is skipped unless
`OPENROUTER_API_KEY` and `ANALYST_MODEL` are present in the Playwright process environment.

## Production Shape

Production uses one Render Web Service running `@bankops/server`.

`render.yaml` defines the deploy contract:

```txt
buildCommand: npm install -g pnpm@11.1.0 && pnpm install --frozen-lockfile && pnpm build
startCommand: pnpm start
healthCheckPath: /healthz
NODE_VERSION: 24
OPENROUTER_API_KEY: set in Render dashboard
ANALYST_MODEL: set in Render dashboard
```

Render terminates public TLS. The app, HTTP API, and WebSocket stream are same-origin:

- `https://<host>/` for the SPA and API
- `wss://<host>/stream` for the realtime Ops firehose

The worker derives the stream URL from `self.location`, so local HTTP uses `ws://` and production
HTTPS uses `wss://` without a separate client-side environment variable.

## Test Coverage

The test suite is aimed at the architecture and UX claims this project makes:

- stream protocol encode/decode round trips and bad-frame handling
- ops simulator aggregate behavior
- Fastify health, static serving, SPA fallback, audit API, and WebSocket upgrade
- audit query filtering, sorting, cursors, facets, and URL-state serialization
- audit window cache behavior and scroll-window request planning
- route smoke coverage for `/ops`, `/audit`, and `/analyst`
- gated real-model `/analyst` happy-path browser smoke when OpenRouter credentials are present
- nonblank Balance Sheet Tape canvas rendering
- audit virtualization, bounded cache behavior, sort/filter URL state, and column persistence
- graceful route-level backend-unavailable state

## Non-Goals

BankOps is a portfolio prototype, not a banking product.

It intentionally does not include:

- auth or user management
- KYC/onboarding
- real money movement
- real blockchain or payment-rail integrations
- real compliance advice
- real customer data
- a production database
- mobile-first layouts for the dense operator surfaces
- arbitrary LLM-generated React

Synthetic data is deterministic and bank-shaped so the product can demonstrate realistic frontend
systems work without pretending to be a real financial system.
