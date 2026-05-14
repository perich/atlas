# BankOps Mission Control Spec

Status: draft, implementation-guiding.

BankOps Mission Control is a staff-level frontend/product engineering portfolio project. It should
demonstrate that complex bank operations can be turned into a fast, legible, safe internal product
surface without reducing the domain to generic fintech dashboard chrome.

## Core Thesis

Build a three-route product prototype over one coherent bank-operations theme. The routes should
feel related, but they do not need to share one strict canonical event history.

1. `/ops` centers on a blisteringly fast worker-backed Canvas Balance Sheet Tape, supported by live
   rail, liquidity, reconciliation, and system health context.
2. `/audit` showcases an exceptional server-backed virtualized table over hundreds of thousands of
   Bank Core Audit Log rows, with filtering, sorting, facets, and draggable columns.
3. `/analyst` is reserved for a future constrained CodeMode-style analysis surface.

Route data boundary:

- `/ops` and `/audit` use separate synthetic datasets and stores.
- They may share Customers, Rails, Assets, statuses, and naming conventions so the product feels
  coherent.
- A Balance Sheet Movement in `/ops` is not required to correspond to an Audit Entry in `/audit`.
- No `/ops` -> `/audit` drilldown is required in the first cut.

## Goals

- Show high-volume realtime UI without coupling event rate to React render rate.
- Model bank-domain semantics: rails, settlement, journals, reconciliation, liquidity, cutoff
  behavior, and invariants.
- Demonstrate production-fluent frontend architecture: workers, snapshots, virtualization, typed
  protocols, perf telemetry, accessibility, and deterministic tests.
- Preserve a path for AI-assisted operations without making it part of the first implementation
  focus.
- Keep the build small enough to finish and polish within a focused week.

## Non-Goals

- No auth, onboarding, KYC, customer-facing banking UI, real money movement, real blockchain calls,
  real compliance advice, or real customer data.
- No full backend platform or database service unless it directly supports the demo.
- No arbitrary LLM-generated React in the browser.

## Users

**Primary user**: an internal bank Operator responsible for understanding and acting on rail,
ledger, liquidity, or reconciliation conditions.


## Product Routes

First build route priority:

- Real route: `/ops`.
- Real route: `/audit`.
- Placeholder route: `/analyst`.
- Do not expand `/analyst` until `/ops` and `/audit` are polished.

Viewport support:

- The app is desktop-only for the first cut.
- Below the supported breakpoint, render a simple message asking the user to open the app on a
  desktop-sized screen.
- Do not spend first-cut scope adapting dense `/ops` or `/audit` surfaces to mobile.

### `/ops`: God Mode Operations View

Purpose: create a beautiful, high-performance "god mode" view of a modern bank core. This route is
allowed to be more atmospheric and demonstrative than strictly workflow-driven, as long as it still
looks relevant to bank operations.

Required surfaces:

- At least one OffscreenCanvas component rendered by a worker, fed by a server-owned firehose of
  balance sheet movements.
- A dense scrolling Balance Sheet Tape as the primary hero component: a trade-history-like stream
  of credits and debits against high-level bank balance sheet buckets, with customer, rail, asset,
  amount, status, and risk metadata.
- Rail and system health components for ACH, wire, instant payments, card, internal ledger, and
  stablecoin rails.
- Realtime charts or sparklines for throughput, latency, queue depth, failure rate, liquidity, and
  event volume.
- Performance HUD that makes the architecture measurable: event rate, decode latency, FPS, worker
  queue depth, rendered rows/sec, worker frame cost, and React snapshot cadence.
- Optional status/anomaly components if they strengthen the product feel, without requiring
  cross-route drilldowns.

Required controls:

- Stream rate selector: 50/s, 2k/s, 10k/s.
- Default stream rate is 2k/s.
- All three stream-rate options are normal supported demo modes, not special stress or meltdown
  modes.
- Stream rate changes are live. The worker sends a control message on the existing WebSocket, and
  the server adjusts that connection's event rate without reconnecting.
- Stream rates are target throughputs, not exact guarantees. The server emits movement batches from
  a fixed tick loop, and the HUD reports measured actual rates.
- Hot binary movement batches are emitted at 60 Hz.
- Automatic reconnect with connection status: connected, reconnecting, disconnected.
- `/ops` auto-connects to `/stream` on page load so the Balance Sheet Tape is alive immediately.

Target layout:

- Top band: rail health, event rate, total credits, total debits, liquidity reserve, and exception
  queue depth.
- Main center: large full-width OffscreenCanvas Balance Sheet Tape.
- Right rail: stream controls and performance HUD.
- Bottom band: compact sparklines for throughput, latency, failure rate, and bucket totals.

Metric semantics:

- Top-band total credits and debits are cumulative since the current `/ops` connection started.
- Top-band event rate, liquidity reserve, and exception queue depth represent current state.
- Sparklines and health charts use rolling windows, initially last 60 seconds.
- Because `/ops` streams are per connection, connection-scoped cumulative totals are acceptable for
  the first cut.

### `/audit`: Bank Core Audit Log

Purpose: demonstrate a genuinely excellent table over bank-shaped data. The route renders a
server-backed Bank Core Audit Log: operational entries that may reference payments, rails,
journals, customers, accounts, stablecoin settlement observations, exceptions, configuration
changes, or operator actions. It does not need to be constantly updated by the `/ops` firehose.

Required surfaces:

- 100k+ synthetic rows in the first complete version; target 250k+ after server-side filtering,
  sorting, cursor windowing, and sparse facets are polished.
- `/audit` is a table-only demo. Do not add summary charts above or around the table in the first
  cut.
- TanStack Virtual table.
- Sorting, column resize, and column visibility.
- Drag-and-drop column reordering.
- Column visibility should use a simple dropdown with checkboxes, not a full management modal.
- Server-backed cursor windowing so the browser does not need to hold every row in memory at once.
- Client-side pruning or cache-window management as the user scrolls.
- Filters and sorting that feel instant and remain URL-addressable.
- Sparse faceted filters for time range, severity, rail, and status.
- Render trace panel showing visible range, rows mounted, filter latency, and main-thread blocking.
- No expandable rows or detail drawer in the first cut; the table should carry the important audit
  context directly in columns.
- First-cut visible columns should include `ts`, `severity`, `kind`, `actor`, `action`, `subject`,
  `customer`, `rail`, `status`, `amount`, and `traceId`.
- No row selection or bulk actions in the first cut; `/audit` is a read-only investigation table.
- Use one dense table mode. Do not add row-density controls in the first cut.
- Rows have a fixed height. Cells are single-line and do not wrap.
- Long values should truncate with accessible full text on hover or focus where useful.
- Identifier cells such as `traceId` may include a small copy affordance.
- Do not add a general context menu, copy mode, or row action system in the first cut.

Audit query semantics:

- `/api/audit` owns filtering, sorting, and cursor-based windowing.
- `/api/audit/facets` returns count breakdowns for filter dimensions under the current query
  context, without returning rows.
- The browser owns virtualized rendering, column state, URL state, and a bounded row cache around the
  visible range.
- The browser should not fetch the full audit dataset just to filter or sort it.
- The API should not expose page-number or offset pagination as the primary table model.
- Default sort is `ts desc`, then `id desc`.
- The first `/audit` UI opens at the newest rows and treats downward scrolling as the primary path
  toward older entries.
- The browser row cache must remain bounded and should not grow to the full dataset as the user
  scrolls.
- `useAuditWindow()` should maintain a bidirectional cache around the viewport, pruning rows far
  above or below the visible range.
- If the user scrolls back into a pruned region, `useAuditWindow()` should refetch that nearby
  window using cursor metadata.
- `/api/audit` should return exact `totalMatched` for the active filters and sort context.
- Exact `totalMatched` is used for result-count UI and trace metrics, not as a promise of perfect
  full-dataset scroll height.
- Filters or sort changes reset the table to the top of the result set.
- Arbitrary jump-to-index, perfect scroll-thumb-to-row mapping, and Excel-like full-result scrolling
  are not required in the first cut.
- Every cursor must include a stable tie-breaker id so repeated timestamps do not produce skipped or
  duplicated rows.
- The first cut supports one visible sort column at a time; the server always appends `id` as an
  implicit tie-breaker.
- URL query params persist shareable investigation state: filters and sort.
- URL query params do not preserve scroll position, cursor anchors, or row cache state. Reloading or
  opening a shared URL starts at the top of the filtered result set.
- Local browser storage persists personal table layout preferences: column order, column width, and
  column visibility.
- Column layout preferences are not encoded in URLs and are not persisted on the server.
- Use TanStack Query for `/api/audit` and `/api/audit/facets` request lifecycle, cancellation,
  retries, stale timing, and cache keys.
- Keep virtualization-window behavior in a purpose-built `useAuditWindow()` hook that owns visible
  range, cursor direction, loaded row windows, cache pruning, and URL state.
- Prototype the TanStack Query plus `useAuditWindow()` integration during implementation and revisit
  the split if cursor-window scrolling or table UX fights the design.
- First-cut query implementation should use direct in-memory scans over the shared audit dataset,
  with simple filter, sort, and cursor slicing per request.
- Do not build audit indexes up front. Add indexes only if measured query latency conflicts with the
  product experience.
- `/api/audit` should return `queryMs`, and the `/audit` render trace should expose it.

Audit cursors are opaque strings to the browser. Internally, a cursor can encode the active sort
position plus a stable tie-breaker row id:

```ts
type AuditCursorPayload = {
  sort: { field: "ts" | "severity" | "rail" | "status" | "kind"; dir: "asc" | "desc" };
  last: {
    sortValues: Array<string | number | boolean | null>;
    id: string;
  };
};
```

```ts
type AuditQuery = {
  filters?: {
    tsFrom?: number;
    tsTo?: number;
    severity?: AuditEntry["severity"][];
    rail?: Rail[];
    status?: AuditEntry["status"][];
  };
  sort?: { field: "ts" | "severity" | "rail" | "status" | "kind"; dir: "asc" | "desc" };
  after?: string;
  before?: string;
  limit: number;
};

type AuditPage = {
  rows: AuditEntry[];
  nextCursor?: string;
  prevCursor?: string;
  totalMatched: number;
  queryMs: number;
};

type AuditFacets = {
  severity: Record<string, number>;
  rail: Record<string, number>;
  status: Record<string, number>;
};
```

Audit entries use a common envelope with type-specific details:

```ts
type AuditEntryKind =
  | "payment"
  | "journal"
  | "settlement"
  | "reconciliation"
  | "risk"
  | "liquidity"
  | "rail_health"
  | "cutoff"
  | "configuration"
  | "operator_action";

type AuditSubjectType =
  | "payment"
  | "journal"
  | "customer"
  | "account"
  | "rail"
  | "settlement"
  | "exception"
  | "configuration"
  | "cutoff"
  | "operator";

type AuditEntry = {
  id: string;
  ts: number;
  severity: "info" | "notice" | "warning" | "critical";
  kind: AuditEntryKind;
  actor: "system" | "operator" | "rail" | "api" | "scheduler" | "risk_engine";
  action: string;
  subjectType: AuditSubjectType;
  subjectId: string;
  customerId?: string;
  accountId?: string;
  rail?: Rail;
  asset?: Asset;
  amountMinor?: bigint;
  status: "accepted" | "pending" | "posted" | "settled" | "failed" | "reversed";
  riskTier?: 0 | 1 | 2 | 3;
  traceId: string;
  idempotencyKey?: string;
  summary: string;
  detail: Record<string, unknown>;
};
```

### `/analyst`: CodeMode Analyst

Purpose: reserve space for a future route that connects AI devx experience to an internal banking
operations workflow.

First-cut scope:

- Route exists in navigation.
- Page may be an intentional placeholder.
- No live model integration, sandbox, generated UI, or analyst workflow is required until `/ops` and
  `/audit` are excellent.

Future direction:

- The model must not render arbitrary React.
- It may eventually produce a declarative dashboard schema after calling typed, read-only tools.
- Any future generated UI must be validated before rendering.

## Domain Model

Canonical terms live in `CONTEXT.md`. The implementation should preserve these distinctions where
they apply, but no route is required to expose every term:

- A Customer owns Accounts.
- A Payment Rail emits or receives Bank Core Events.
- Bank Core Events are sequenced realtime activity records used by the firehose.
- Journals are balanced double-entry ledger records.
- Settlement is rail finality.
- Reconciliation matches rail finality to internal Journal finality.
- Incidents are investigable conditions, not just visual warnings.
- Cutoff is a precise timestamp that changes post-cutoff classification and execution behavior.

## Event Model

The `/ops` simulator should emit deterministic Balance Sheet Movements rather than unrelated random
points. Movements should be semantically plausible, but the firehose is primarily a realtime
rendering and systems demo.

```ts
type Rail = "ach" | "wire" | "instant" | "card" | "internal_ledger" | "stablecoin";
type Asset = "USD" | "USDC" | "USDT" | "PYUSD" | "EURC";

type EventKind =
  | "deposit_credit"
  | "wire_debit"
  | "ach_debit"
  | "instant_payment_credit"
  | "stablecoin_credit"
  | "stablecoin_debit"
  | "fee_credit"
  | "reversal_credit"
  | "reserve_transfer"
  | "exception_hold";

type BalanceSheetBucket =
  | "customer_deposits"
  | "settlement_cash"
  | "reserve_cash"
  | "rail_clearing"
  | "stablecoin_treasury"
  | "fee_income"
  | "exception_queue";

type BalanceSheetMovement = {
  seq: bigint;
  serverTs: number;
  kind: EventKind;
  side: "debit" | "credit";
  bucket: BalanceSheetBucket;
  rail: Rail;
  asset: Asset;
  customerId: string;
  customerName: string;
  accountId: string;
  amountMinor: bigint;
  latencyMs: number;
  status: "accepted" | "pending" | "posted" | "settled" | "failed" | "held";
  riskTier: 0 | 1 | 2 | 3;
  traceId: string;
  flags: number;
};
```

Debit and credit are labeled from the bank balance sheet bucket point of view:

- `credit` increases the referenced `bucket`.
- `debit` decreases the referenced `bucket`.
- A `BalanceSheetMovement` is a single visible tape row, not a full balanced `Journal`.
- A row may reference a `journalId`, `offsetBucket`, or type-specific detail payload when the UI
  needs to show the balanced accounting context.

Example tape rows:

```txt
credit  +$2,400,000  customer_deposits   USDC  Acme Robotics       stablecoin  settled
debit     -$850,000  settlement_cash     USD   Northstar AI        wire        posted
credit     +$12,400  fee_income          USD   Vector Defense      ach         posted
debit     -$310,000  exception_queue     USD   Orbital Systems     instant     held
```

## System Architecture

The product needs server-side logic. That code should live in this repo.

The first implementation should prioritize protocol and server correctness before visual polish.
Once the stream contracts, server endpoints, and query behavior are stable, polish the product UI.

Target repo shape:

```txt
apps/
  web/                 @bankops/web React/Vite app
  server/              @bankops/server Node/Fastify server for local and demo deploy
packages/
  contracts/           @bankops/contracts stream frame contracts and API types
  ops-tape-sim/        @bankops/ops-tape-sim Balance Sheet Movement generation
  audit-log-model/     @bankops/audit-log-model Audit Entry generation and query logic
```

Workspace package names should be private and npm-scoped:

```txt
@bankops/web
@bankops/server
@bankops/contracts
@bankops/ops-tape-sim
@bankops/audit-log-model
```

Do not create `packages/ui` in the initial restructure. Keep design primitives in `apps/web/src/design`
until real duplication justifies extraction.

`@bankops/contracts` should be dependency-free:

- Use platform primitives such as `DataView`, `ArrayBuffer`, and typed arrays for binary frames.
- Export TypeScript API types for `/api/audit`.
- Do not pull validation libraries or framework types into shared contracts.
- Runtime validation, if needed, belongs at app boundaries such as `apps/server`.

Package runtime boundaries:

- `@bankops/contracts` is shared by browser, workers, server, and tests.
- `@bankops/ops-tape-sim` is server-only.
- `@bankops/audit-log-model` is server-only.
- `apps/web` must not import simulation/model packages.

The current scaffold is still single-app. The first implementation refactor should move the
existing Vite app to `apps/web` and introduce pnpm workspaces before adding server logic.

### Local Development

Local development should not require Docker Compose, PM2, nginx, or manual multi-terminal process
management.

Root scripts after the workspace restructure:

```json
{
  "dev": "concurrently -n web,server pnpm:dev:web pnpm:dev:server",
  "dev:web": "pnpm --filter @bankops/web dev",
  "dev:server": "pnpm --filter @bankops/server dev",
  "build": "pnpm -r build",
  "typecheck": "pnpm -r typecheck",
  "lint": "pnpm -r lint",
  "test:run": "pnpm -r test:run"
}
```

In development, Vite serves `apps/web` and proxies `/api/*` plus `/stream` to `apps/server`. In
production, `apps/server` serves the built SPA and handles those same routes directly.

### Server Responsibilities

`apps/server` owns:

- deterministic Balance Sheet Movement generation using an internal default seed
- connection-local sequence numbers for `/ops` streams
- per-connection `/ops` stream sessions with isolated sequence numbers, stream rate, aggregate
  counters, and client performance telemetry
- aggregate metric computation for the React dashboard panels
- `/stream` WebSocket endpoint
- `/api/audit` cursor-windowed audit entry endpoint
- `/api/audit/facets` audit filter facet endpoint
- `/healthz` health endpoint
- optional static serving of the built web app for single-service deploys
- client control handling for target rate and client performance telemetry

Server framework:

- Use Fastify on Node for the first cut.
- Use `@fastify/websocket` for `/stream`.
- Use `@fastify/static` for serving the built SPA in production.
- Do not introduce Bun/Elysia unless we deliberately make that runtime/framework part of a later
  technical story.

The first build should use one Node process, not separate services. Keep internal modules separate
for clarity:

- `ops-stream` for per-connection WebSocket firehose sessions and aggregate snapshots.
- `audit-query` for cursor-windowed audit entries, filtering, sorting, and facets.
- `ops-tape-sim` for deterministic synthetic Customers, Accounts, Balance Sheet Movements, and
  `/ops` aggregates.
- `audit-log-model` for deterministic Audit Entries, sparse filters, single-column sorting, cursor
  windows, and facets.

### Browser Responsibilities

`apps/web` owns:

- route shell and product UI
- `ops-tape.worker.ts` for WebSocket connection, binary decode, ring buffer, aggregate snapshots,
  telemetry, and OffscreenCanvas rendering
- coalesced external store snapshots consumed by React
- minimal `useSyncExternalStore` wrappers for worker-authored `/ops` snapshots
- virtualized high-scale table
- placeholder analyst route

Backend availability behavior:

- The app should not block first render on backend availability.
- `/ops` and `/audit` should render quickly into loading, connecting, or degraded states and then
  transition when server responses arrive.
- If `apps/server` is unreachable, show graceful route-level connection or error states.
- Do not build a fake browser-only backend fallback for the real routes.

State management boundary:

- `/ops` stream state uses a minimal external store around `useSyncExternalStore`.
- The worker remains the owner of stream, tape, and performance state; React only consumes compact
  snapshots.
- Do not introduce Zustand, Redux, or another app-wide state library for the first cut.
- Consider a state library later only if app-owned UI state becomes meaningfully complex.

## SettlementStream Protocol

Transport:

- WebSocket for the hot path.
- Binary event batches for Balance Sheet Movements.
- Hot binary movement batches at 60 Hz.
- JSON aggregate snapshots at roughly 4 Hz for React dashboard panels.
- JSON control messages for stream rate and client performance telemetry.
- One logical stream with channel identifiers.

The hot and warm paths serve different consumers:

- Hot path: binary movement batches feed `ops-tape.worker.ts`, which owns decode and OffscreenCanvas
  rendering.
- Warm path: server-authored aggregate snapshots feed React-owned metrics, rail health, controls,
  status panels, and sparklines.
- The warm path is authoritative for bank-domain dashboard metrics. Worker-derived values are used
  for tape rendering and client performance telemetry, not for recomputing business truth in React.
- Hot and warm paths are logical stream channels over the worker-owned WebSocket, not separate
  browser connections in the first cut.

Channels:

```txt
1 raw event batches
2 aggregate metric snapshots
3 incidents and invariant failures
4 client control and performance telemetry
```

Frame shape:

```txt
Frame header
-----------
magic          u32
version        u16
channel        u16
fromSeq        u64
toSeq          u64
serverTsMs     f64
eventCount     u32

Movement record
---------------
seqDelta       u32
dtMs           u16
kind           u8
side           u8
bucket         u8
rail           u8
asset          u8
customerId     u32
accountId      u32
amountMinor    i64
latencyMs      u16
status         u8
riskTier       u8
flags          u16
```

React must not subscribe to every Balance Sheet Movement. `ops-tape.worker.ts` should decode
batches, update a recent-movement ring buffer, render the tape, and post compact snapshots to React
at roughly 4-10 Hz.

## Rendering Model

The Balance Sheet Tape should be a bounded dense scrolling list, not a market-depth ladder and not
a DOM rendering of every movement.

Required behavior:

- OffscreenCanvas renderer receives decoded movement batches and aggregate bucket totals.
- The visible tape row pool is bounded and recycles rows as new movements arrive.
- Rows render in a fixed-column terminal style, not as cards.
- The Canvas tape is non-interactive in the first cut: no row hover, hit testing, selection, click
  inspect, or drilldown behavior.
- Newest movements are rendered as discrete batched tape updates, not per-row animations.
- Newest movements appear at the top of the tape, and older visible rows move downward through the
  bounded row pool.
- The tape shows only the latest visible movement window. It has no scrollback, scrollbar, history
  search, row selection, or inspect mode.
- The tape should repaint efficiently after decoded hot batches and preserve stable columns for
  time, side, amount, bucket, asset, customer, rail, and status.
- Column widths are stable and use tabular/monospace metrics so the tape feels like a serious
  financial terminal.
- Supported stream-rate modes render raw individual movements, not summarized or sampled rows.
- "No sampling" means every movement is decoded and accounted for in sequence, totals, rates, and
  pressure metrics.
- The Canvas only renders the latest visible row window. At high rates, some decoded movements may
  advance through the bounded tape model without remaining visibly inspectable.
- If the renderer cannot keep up, the system should expose backlog and frame-cost pressure rather
  than silently sampling the tape.
- The server should not silently auto-throttle in the first cut. The selected stream rate is
  authoritative; stream pressure is reported in the HUD so the user can choose a lower rate.
- Bucket totals, side totals, and throughput indicators should remain accurate because they are
  derived from decoded movement batches, not React render state.

Performance HUD must show:

- server event rate
- decoded event rate
- rendered tape row rate
- worker backlog depth
- worker frame p95
- client sequence lag
- decode p95
- render FPS
- React snapshot cadence
- stream pressure state derived from backlog, frame cost, sequence lag, and FPS

## Data and Persistence

Synthetic data classes:

- Customers grouped by AI, defense, robotics, hardware, crypto, fintech, and venture funds.
- Accounts for customer deposits, bank settlement, rail clearing, liquidity reserve, and exception
  queues.
- Balance Sheet Movements for the `/ops` live stream.
- Bank Core Audit Log entries for `/audit`, modeled as heterogeneous Audit Entry envelopes.
- Journal entries for double-entry finality.
- Incidents and invariant failures.

Persistence:

- No server database required for the first build.
- The generated audit dataset lives in memory in `apps/server` for the first cut.
- 100k-250k Audit Entries should be generated deterministically at server startup or lazy
  initialization.
- The audit dataset is shared once per server process, not generated per browser session.
- The audit dataset is static for the lifetime of the server process. `/audit` does not receive
  live inserts from `/ops`, and no "new rows available" behavior is required.
- `/ops` stream sessions are per WebSocket connection, so one viewer changing stream rate does not
  affect other viewers.
- Per-connection `/ops` state should stay small: sequence cursor, selected rate, aggregate counters,
  and client performance telemetry.
- Reconnect does not need exact event continuity. A reconnected `/ops` client can receive a fresh
  stream session and current aggregate snapshot.
- Query results are computed per request and returned; the server should not retain large per-client
  result sets.
- First deploy uses one Render instance, so the in-memory dataset exists once in production. If the
  app is horizontally scaled later, each instance will have its own dataset copy.
- Synthetic data generation should use one internal default seed, such as `bankops-demo`, for stable
  tests, screenshots, and demo reproduction.
- Seed selection is not a visible product control; any seed override should be dev/test-only.
- `/audit` column layout preferences can use localStorage because they are small, local, and
  user-specific.
- Generated table data should be deterministic by seed so tests and demos are reproducible.

## Deployment and Hosting

Recommended first deploy: one Render Web Service running one long-running Node process that serves
the built SPA, `/stream` WebSocket endpoint, and `/api/audit` endpoints from the same origin.

```txt
https://bankops-demo.example.com/          static SPA
https://bankops-demo.example.com/stream    WebSocket upgrade
https://bankops-demo.example.com/api/audit cursor-windowed audit entries
https://bankops-demo.example.com/healthz   health check
```

Why:

- A real WebSocket server is central to the Route 1 story.
- Same-origin deploy avoids CORS, mixed-content, and split-preview complexity.
- A long-running service maps directly to the local architecture.
- One Node process is enough for the portfolio build; splitting services would add platform
  complexity without strengthening the product demo.
- Render Web Services support inbound WebSocket connections and map naturally to a Node HTTP server
  extended with WebSocket support.
- Render handles public HTTPS, custom domains, deploys from Git, logs, restarts, and health checks
  without requiring PM2, nginx, systemd, or VM maintenance.
- It is easy to explain in a portfolio README and walkthrough.

Render deployment requirements:

- Server must bind to `0.0.0.0` and `process.env.PORT`.
- Public traffic uses one exposed HTTP port; HTTP requests and WebSocket upgrades share that port.
- Production clients should use same-origin `https://...` and `wss://...` URLs.
- WebSocket clients should implement reconnect because platform maintenance or deploys can close
  long-lived connections.

Alternative deploys:

- Fly.io if we later want container semantics and more control.
- Cloudflare Workers + Durable Objects if we later want an edge-native WebSocket architecture.
- Static web on Vercel or Cloudflare Pages.
- Server on Render, Fly.io, Railway, or Cloudflare Durable Objects.
- `VITE_STREAM_URL` points the browser at the stream origin.

Do not make Vercel Functions the primary WebSocket server. Vercel's current realtime guidance
points WebSocket-style integrations toward external realtime providers rather than using Vercel
Functions as the long-lived WebSocket endpoint.

Cloudflare Durable Objects are a strong production-hardening alternative because they are designed
to coordinate stateful WebSocket connections, but they require a Worker/Durable Object runtime
shape rather than a normal Node server. Keep that as a documented future migration, not the first
implementation path.

Sources checked May 12, 2026:

- Render WebSocket support:
  https://render.com/docs/websocket
- Render Web Services:
  https://render.com/docs/web-services
- Vercel WebSocket Functions guidance:
  https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections
- Cloudflare Durable Objects WebSockets:
  https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- Fly deploy docs: https://fly.io/docs/launch/deploy/

## Boilerplate to Add

Near-term repo boilerplate:

- `pnpm-workspace.yaml`
- `apps/web` move for existing Vite app
- `apps/server` with TypeScript, `tsx` dev runner, WebSocket dependency, audit API routes,
  and health route
- `packages/contracts` with stream frame encoder/decoder tests and audit API contract tests
- `packages/ops-tape-sim` with deterministic Balance Sheet Movement and aggregate tests
- `packages/audit-log-model` with Audit Entry generation and query fixture tests
- root scripts for `dev`, `dev:web`, `dev:server`, `build`, `typecheck`, `lint`, and tests
- `.env.example` with `VITE_STREAM_URL` and stream rate defaults
- Playwright config updated for the workspace app

Later boilerplate:

- `render.yaml` blueprint after the server start/build commands are stable
- Dockerfile only if we move away from Render's native Node build path
- worker test helpers for protocol decode and OffscreenCanvas fallback
- performance benchmark script
- GitHub Actions only after local checks are stable

## Quality Bar

Testing:

- Unit tests for protocol encode/decode round trips.
- Property tests for simulator invariants where cheap.
- Unit tests for audit URL query-state serialization.
- Component tests for route-level smoke states.
- Playwright flow for `/audit` filter, sort, facet, and column reorder.
- Playwright smoke flow for `/analyst` placeholder route.

Performance:

- Publish only measured numbers.
- Target 2k events/sec early; 10k events/sec polished; higher rates labeled synthetic stress.
- Keep React updates coalesced to roughly 4-10 Hz for live dashboard state.
- Keep table visible mounted rows under 100 in normal viewport.
- Avoid main-thread long tasks over 100 ms during steady-state stream.

Accessibility:

- Keyboard-accessible route navigation, table focus, dialogs, and controls.
- No custom data-grid keyboard navigation is required for `/audit` in the first cut.
- No information conveyed by color alone.
- The Canvas tape should avoid animation-oriented motion in the first cut.
- Text must fit on mobile and desktop without overlap.

## Implementation Milestones

1. Spec and repo decisions.
2. Workspace restructure.
3. Contracts package with binary frame encode/decode tests and audit API contracts.
4. Deterministic bank simulator package.
5. Node server with health route, `/stream`, stream controls, aggregate snapshots, and audit API.
6. `/ops` route shell with static rail/liquidity/invariant panels.
7. `ops-tape.worker.ts` and external snapshot store.
8. OffscreenCanvas Balance Sheet Tape.
9. Virtualized `/audit` table.
10. `/analyst` placeholder route.
11. Deployment, README polish, screenshots, and walkthrough.

## Open Decisions

No unresolved architecture decisions for the current first-cut spec.
