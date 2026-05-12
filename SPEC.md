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
3. `/analyst` demonstrates constrained CodeMode-style analysis that generates typed, validated UI
   from read-only bank data tools.

Candidate cross-route flow, if it stays valuable after the surfaces exist:

```txt
/ops highlights an unusual bank-core condition
  -> /audit opens a matching filtered table view
  -> /analyst explains impact and renders a generated mini-dashboard
```

This flow should not force the implementation into one shared source of truth prematurely. It is a
product integration target, not a constraint on every data path.

## Goals

- Show high-volume realtime UI without coupling event rate to React render rate.
- Model bank-domain semantics: rails, settlement, journals, reconciliation, liquidity, cutoff
  behavior, and invariants.
- Demonstrate production-fluent frontend architecture: workers, snapshots, virtualization, typed
  protocols, perf telemetry, deep links, accessibility, and deterministic tests.
- Make AI-assisted operations feel safe enough for a regulated-product imagination: constrained
  tools, auditable traces, deterministic fallback, and Zod-validated UI schemas.
- Keep the build small enough to finish and polish within a focused week.

## Non-Goals

- No auth, onboarding, KYC, customer-facing banking UI, real money movement, real blockchain calls,
  real compliance advice, or real customer data.
- No full backend platform or database service unless it directly supports the demo.
- No arbitrary LLM-generated React in the browser.
- No public Erebor branding or use of non-public recruiter claims in the repo.

## Users

**Primary user**: an internal bank Operator responsible for understanding and acting on rail,
ledger, liquidity, or reconciliation conditions.

**Secondary user**: the engineering reviewer evaluating whether the project reflects strong product
judgment, financial-domain fluency, and modern frontend systems work.

## Product Routes

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
- Optional alert or anomaly components if they strengthen the product feel.

Required controls:

- Scenario selector: normal operations, stablecoin activity spike, liquidity stress, rail
  degradation, cutoff simulation.
- Stream rate selector: 500/s, 2k/s, 10k/s, synthetic stress.
- Pause/resume, reconnect, and reset seed.
- Backpressure mode indicator.

Target layout:

- Top band: rail health, event rate, total credits, total debits, liquidity reserve, and exception
  queue depth.
- Main center: large full-width OffscreenCanvas Balance Sheet Tape.
- Right rail: scenario controls, stream controls, and performance HUD.
- Bottom band: compact sparklines for throughput, latency, failure rate, and bucket totals.

### `/audit`: Bank Core Audit Log

Purpose: demonstrate a genuinely excellent table over bank-shaped data. The route renders a
server-backed Bank Core Audit Log: operational entries that may reference payments, rails,
journals, customers, accounts, stablecoin settlement observations, exceptions, configuration
changes, or operator actions. It does not need to be constantly updated by the `/ops` firehose.

Required surfaces:

- 100k+ synthetic rows in the first complete version; target 250k+ after server-side filtering,
  sorting, cursor windowing, and sparse facets are polished.
- TanStack Virtual table.
- Sorting, column resize, column visibility, and column pinning.
- Drag-and-drop column reordering.
- Server-backed cursor windowing so the browser does not need to hold every row in memory at once.
- Client-side pruning or cache-window management as the user scrolls.
- Filters and sorting that feel instant and remain URL-addressable.
- Saved views with URL-persisted filters.
- Sparse faceted filters for time range, severity, rail, and status.
- Row details drawer with domain-specific audit-entry detail.
- Command palette for saved views and common investigations.
- Render trace panel showing visible range, rows mounted, filter latency, and main-thread blocking.

Audit query semantics:

- `/api/audit` owns filtering, sorting, and cursor-based windowing.
- `/api/audit/facets` returns count breakdowns for filter dimensions under the current query
  context, without returning rows.
- `/api/audit/:id` returns type-specific detail for the row details drawer.
- The browser owns virtualized rendering, column state, URL state, and a bounded row cache around the
  visible range.
- The browser should not fetch the full audit dataset just to filter or sort it.
- The API should not expose page-number or offset pagination as the primary table model.
- Default sort is `ts desc`, then `id desc`.
- Every cursor must include a stable tie-breaker id so repeated timestamps do not produce skipped or
  duplicated rows.

Audit cursors are opaque strings to the browser. Internally, a cursor can encode the active sort
position plus a stable tie-breaker row id:

```ts
type AuditCursorPayload = {
  sort: Array<{ field: keyof AuditEntry; dir: "asc" | "desc" }>;
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
  sort?: Array<{ field: "ts" | "severity" | "rail" | "status" | "kind"; dir: "asc" | "desc" }>;
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

Candidate saved views:

- Stablecoin activity over threshold.
- ACH returns over threshold.
- Wire queue above p95 latency.
- Ledger imbalance candidates.
- Customer exposure over threshold.
- Events after cutoff timestamp.
- Idempotency collisions.

### `/analyst`: CodeMode Analyst

Purpose: connect AI devx experience to an internal banking operations workflow.

Required surfaces:

- Prompt input with canned operational prompts.
- Generated analysis plan.
- Generated TypeScript program or deterministic fallback program.
- Tool-call trace.
- Validated UI schema.
- Rendered generated dashboard.
- Deep links back to `/audit`.

The model must not render arbitrary React. It may produce a declarative dashboard schema only after
calling typed, read-only tools.

Example generated UI schema:

```ts
type GeneratedDashboard = {
  title: string;
  summary: string;
  blocks: Array<
    | { type: "metric"; title: string; value: string; delta?: string }
    | { type: "table"; title: string; queryResultId: string }
    | { type: "barChart"; title: string; data: Array<{ label: string; value: number }> }
    | { type: "auditLink"; label: string; href: string }
  >;
};
```

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

Target repo shape:

```txt
apps/
  web/                 React/Vite app
  stream-server/       One Node TypeScript server for local and demo deploy
packages/
  protocol/            shared frame definitions, encoders, decoders, message types
  bank-sim/            deterministic scenario engine and synthetic data generation
  table-model/         row generation, saved-view definitions, query fixtures
  ui/                  only if shared UI primitives become large enough to justify it
```

The current scaffold is still single-app. The first implementation refactor should move the
existing Vite app to `apps/web` and introduce pnpm workspaces before adding server logic.

### Server Responsibilities

`apps/stream-server` owns:

- deterministic seeded Balance Sheet Movement generation
- global sequence numbers
- scenario state
- aggregate metric computation for the React dashboard panels
- replay buffer
- `/stream` WebSocket endpoint
- `/api/audit` cursor-windowed audit entry endpoint
- `/api/audit/facets` audit filter facet endpoint
- `/api/audit/:id` audit entry detail endpoint
- `/healthz` health endpoint
- optional static serving of the built web app for single-service deploys
- client control handling for scenario, target rate, pause/resume, and backpressure

The first build should use one Node process, not separate services. Keep internal modules separate
for clarity:

- `ops-stream` for WebSocket firehose, scenarios, and aggregate snapshots.
- `audit-query` for cursor-windowed audit entries, filtering, sorting, facets, and row detail.
- `scenario-engine` for deterministic synthetic Customers, Accounts, Balance Sheet Movements, Audit
  Entries, and related fixtures.

### Browser Responsibilities

`apps/web` owns:

- route shell and product UI
- `ingress.worker.ts` for WebSocket connection, binary decode, ring buffer, and telemetry
- `balance-sheet-tape.worker.ts` for OffscreenCanvas rendering
- coalesced external store snapshots consumed by React
- virtualized high-scale table
- local workspace sync via IndexedDB and BroadcastChannel
- constrained analyst UI and deterministic fallback analysis programs

## SettlementStream Protocol

Transport:

- WebSocket for the hot path.
- Binary event batches for Balance Sheet Movements.
- JSON aggregate snapshots at roughly 4 Hz for React dashboard panels.
- JSON control messages for scenario, stream rate, pause/resume, reconnect, and backpressure.
- One logical stream with channel identifiers.

The hot and warm paths serve different consumers:

- Hot path: binary movement batches feed the ingress worker and OffscreenCanvas tape renderer.
- Warm path: aggregate snapshots feed React-owned metrics, rail health, controls, alerts, and
  sparklines.

Channels:

```txt
1 raw event batches
2 aggregate metric snapshots
3 incidents and invariant failures
4 client control and backpressure
5 snapshot and replay response
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

React must not subscribe to every Balance Sheet Movement. The ingress worker should decode batches,
update a recent-movement ring buffer, and post compact snapshots to React at roughly 4-10 Hz.

## Rendering Model

The Balance Sheet Tape should be a bounded dense scrolling list, not a market-depth ladder and not
a DOM rendering of every movement.

Required behavior:

- OffscreenCanvas renderer receives decoded movement batches and aggregate bucket totals.
- The visible tape row pool is bounded and recycles rows as new movements arrive.
- Rows render in a fixed-column terminal style, not as cards.
- Newest movements stream into the tape in one direction with stable columns for time, side, amount,
  bucket, asset, customer, rail, and status.
- Column widths are stable and use tabular/monospace metrics so the tape feels like a serious
  financial terminal.
- Supported stream-rate modes render raw individual movements, not summarized or sampled rows.
- If the renderer cannot keep up, the system should expose backlog and frame-cost pressure rather
  than silently sampling the tape.
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

## Data and Persistence

Synthetic data classes:

- Customers grouped by AI, defense, robotics, hardware, crypto, fintech, and venture funds.
- Accounts for customer deposits, bank settlement, rail clearing, liquidity reserve, and exception
  queues.
- Balance Sheet Movements for the `/ops` live stream.
- Bank Core Audit Log entries for `/audit`, modeled as heterogeneous Audit Entry envelopes.
- Journal entries for double-entry finality.
- Incidents and invariant failures.
- Saved views and operator annotations.

Persistence:

- No server database required for the first build.
- Stream server keeps a bounded in-memory replay buffer.
- Web app stores workspace state in IndexedDB.
- BroadcastChannel syncs workspace state across tabs.
- Generated table data should be deterministic by seed so tests and demos are reproducible.

## Deployment and Hosting

Recommended first deploy: one long-running Node service that serves the built SPA, `/stream`
WebSocket endpoint, and `/api/audit` endpoints from the same origin.

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
- It is easy to explain in a portfolio README and walkthrough.

Recommended first host class:

- Fly.io, Render, Railway, or any container-friendly Node host.
- Fly.io is a good default candidate for the first public demo because it deploys source with
  `fly deploy` into Fly Machines.

Alternative split deploy:

- Static web on Vercel or Cloudflare Pages.
- Stream server on Fly.io, Render, Railway, or Cloudflare Durable Objects.
- `VITE_STREAM_URL` points the browser at the stream origin.

Do not make Vercel Functions the primary WebSocket server. Vercel's current realtime guidance
points WebSocket-style integrations toward external realtime providers rather than using Vercel
Functions as the long-lived WebSocket endpoint.

Cloudflare Durable Objects are a strong production-hardening alternative because they are designed
to coordinate stateful WebSocket connections, but they require a Worker/Durable Object runtime
shape rather than a normal Node server. Keep that as a documented future migration, not the first
implementation path.

Sources checked May 12, 2026:

- Vercel WebSocket Functions guidance:
  https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections
- Cloudflare Durable Objects WebSockets:
  https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- Fly deploy docs: https://fly.io/docs/launch/deploy/

## Boilerplate to Add

Near-term repo boilerplate:

- `pnpm-workspace.yaml`
- `apps/web` move for existing Vite app
- `apps/stream-server` with TypeScript, `tsx` dev runner, WebSocket dependency, audit API routes,
  and health route
- `packages/protocol` with shared encoder/decoder tests
- `packages/bank-sim` with deterministic seed tests
- `packages/table-model` with row generation, saved-view definitions, and query fixtures
- root scripts for `dev`, `dev:web`, `dev:server`, `build`, `typecheck`, `lint`, and tests
- `.env.example` with `VITE_STREAM_URL` and stream rate defaults
- Playwright config updated for the workspace app

Later boilerplate:

- Dockerfile for single-service deployment
- `fly.toml` after choosing Fly.io
- worker test helpers for protocol decode and OffscreenCanvas fallback
- performance benchmark script
- GitHub Actions only after local checks are stable

## Quality Bar

Testing:

- Unit tests for protocol encode/decode round trips.
- Property tests for simulator invariants where cheap.
- Unit tests for saved-view URL serialization.
- Component tests for route-level smoke states.
- Playwright flow for `/audit` filter, sort, facet, and column reorder.
- Optional Playwright flow for `/ops` condition -> `/audit` deep link if that integration remains
  useful.
- Playwright flow for `/analyst` deterministic generated dashboard.

Performance:

- Publish only measured numbers.
- Target 2k events/sec early; 10k events/sec polished; higher rates labeled synthetic stress.
- Keep React updates coalesced to roughly 4-10 Hz for live dashboard state.
- Keep table visible mounted rows under 100 in normal viewport.
- Avoid main-thread long tasks over 100 ms during steady-state stream.

Accessibility:

- Keyboard-accessible route navigation, table focus, command palette, dialogs, and controls.
- No information conveyed by color alone.
- Respect reduced motion by lowering tape animation cadence.
- Text must fit on mobile and desktop without overlap.

## Implementation Milestones

1. Spec and repo decisions.
2. Workspace restructure.
3. Protocol package with binary frame encode/decode tests.
4. Deterministic bank simulator package.
5. Stream server with health route, `/stream`, scenarios, and aggregate snapshots.
6. `/ops` route shell with static rail/liquidity/invariant panels.
7. Browser ingress worker and external snapshot store.
8. OffscreenCanvas Balance Sheet Tape.
9. Virtualized `/audit` table and saved views.
10. Optional `/ops` condition deep link into `/audit`.
11. Analyst deterministic CodeMode fallback.
12. Optional live model path.
13. Deployment, README polish, screenshots, and walkthrough.

## Open Decisions

- Exact first hosting provider: recommended default is Fly.io, but defer `fly.toml` until after the
  Node server exists.
- Whether DuckDB-WASM is necessary for the first public cut or should wait until the table route is
  already strong.
- Whether the analyst sandbox executes generated TypeScript in a server-side isolated context or a
  deterministic local interpreter for the first version.
- Whether the final public demo runs one shared global simulation or one seeded simulation per
  browser session.
