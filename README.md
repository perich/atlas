# BankOps Mission Control

A real-time control plane prototype for modern chartered banking operations: payment rails,
ledger reconciliation, liquidity, and stablecoin settlement.

This repo starts from a lean React SPA scaffold and will grow into a small, high-polish product
demo. The target is not a consumer banking clone. The target is an internal operator surface that
makes bank-core complexity legible under live operational pressure.

## Spec

The implementation target is tracked in [SPEC.md](./SPEC.md). Domain language is tracked in
[CONTEXT.md](./CONTEXT.md), and architectural decisions live in [docs/adr](./docs/adr).

## Product Shape

- `/ops` — real-time bank operations dashboard with rail health, liquidity, settlement flow,
  invariant monitoring, and cutoff simulation.
- `/ledger` — high-scale ledger and payment-event investigation table with virtualized rows,
  saved views, URL-persisted filters, and alert drilldowns.
- `/analyst` — constrained CodeMode analyst that turns operational questions into validated,
  typed UI specs instead of arbitrary generated React.

The first end-to-end workflow should be:

1. `/ops` raises a stablecoin reconciliation alert.
2. The alert deep-links to `/ledger?view=unreconciled-stablecoin&batch=88412`.
3. `/ledger` shows affected events, customers, amounts, state transitions, and missing journal
   finality.
4. `/analyst` explains the incident and generates a mini-dashboard from typed read-only tools.

## Route 1: Ops Dashboard

The dashboard should be backed by a real local stream server, not by timers buried in React
components.

```txt
stream-server
  -> WebSocket binary event batches
  -> browser ingress worker
  -> bounded ring buffer and aggregate snapshots
  -> OffscreenCanvas renderer for dense settlement flow
  -> React shell for controls, cards, alerts, and drilldowns
```

React should receive coalesced snapshots for product UI state at roughly 4-10 Hz. The firehose path
can run far faster because binary decode, ring-buffer writes, and visual sampling stay outside the
React render loop.

### SettlementStream Targets

- Server-owned deterministic event stream.
- Binary event batches over WebSocket for the hot path.
- JSON control and aggregate messages for low-frequency state.
- Client-side worker owns the socket, decode path, recent-event ring buffer, and perf telemetry.
- OffscreenCanvas renderer owns particle animation and edge intensity.
- Performance HUD shows event rate, client sequence lag, FPS, decode latency, dropped visual-only
  particles, and React snapshot cadence.

## Bank-Domain Model

The synthetic data should model actual operational concepts:

- payment rail state machines
- stablecoin settlement lifecycle
- double-entry ledger journals
- reconciliation gaps
- idempotency collisions
- liquidity reserve pressure
- deposit concentration
- regulatory cutoff behavior

Do not present the cutoff simulation as legal or compliance advice. It is an engineering prototype
inspired by public themes around bank operability.

## Current Stack

- React + TypeScript
- Vite
- TanStack Router
- TanStack Virtual
- Tailwind CSS
- Radix-ready component primitives
- Vitest + Playwright
- oxlint + oxfmt

Planned additions as the product surfaces require them:

- WebSocket stream server
- worker-backed protocol decoder
- OffscreenCanvas renderer
- TanStack Table
- dnd-kit
- Zod
- Comlink
- DuckDB-WASM or an equivalent worker-side analytics path
- IndexedDB and BroadcastChannel for operator workspace sync

## Scripts

```txt
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
pnpm format
pnpm test:run
pnpm test:e2e
```

## Baseline Health

As of the initial spec pass:

- `pnpm typecheck` passes.
- `pnpm lint` passes.
- `pnpm test:run` passes.
- `pnpm build` passes.
- `pnpm test:e2e` passes when the sandbox is allowed to bind the Vite dev server to
  `127.0.0.1:5173`.
