# BankOps Mission Control

A real-time control plane prototype for modern chartered banking operations: payment rails,
ledger reconciliation, liquidity, and stablecoin settlement.

This repo is a pnpm workspace scaffold for a small, high-polish product demo. The target is not a
consumer banking clone. The target is an internal operator surface that makes bank-core complexity
legible under live operational pressure.

## Spec

The implementation target is tracked in [SPEC.md](./SPEC.md). Domain language is tracked in
[CONTEXT.md](./CONTEXT.md), and architectural decisions live in [docs/adr](./docs/adr).

## Product Shape

- `/ops` — real-time bank operations dashboard centered on a worker-rendered Balance Sheet Tape,
  with rail health, liquidity, system health, and stream performance context.
- `/audit` — high-scale bank-core audit log with virtualized rows, sparse facets, URL-persisted
  filters, and advanced column controls.
- `/analyst` — placeholder for a future constrained CodeMode analyst surface.

The routes are independent product surfaces over shared bank-operations vocabulary. `/ops` and
`/audit` do not require row-level data consistency or cross-route drilldowns in the first cut.

## Route 1: Ops Dashboard

The dashboard should be backed by a real local Node server, not by timers buried in React
components.

```txt
apps/server
  -> WebSocket binary event batches
  -> ops-tape.worker.ts
  -> bounded ring buffer, aggregate snapshots, and OffscreenCanvas Balance Sheet Tape
  -> React shell for controls, metrics, sparklines, and status panels
```

React should receive coalesced snapshots for product UI state at roughly 4-10 Hz. The firehose path
can run far faster because binary decode, ring-buffer writes, and Canvas rendering stay outside the
React render loop.

### SettlementStream Targets

- Server-owned deterministic Balance Sheet Movement stream.
- Binary event batches over WebSocket for the hot path.
- JSON aggregate snapshots at roughly 4 Hz for the React dashboard panels.
- JSON control messages for stream rate and client performance telemetry.
- `ops-tape.worker.ts` owns the socket, decode path, recent-event ring buffer, aggregate snapshots,
  perf telemetry, and high-rate OffscreenCanvas tape visualization.
- Performance HUD shows event rate, client sequence lag, FPS, decode latency, rendered rows/sec,
  worker backlog, and React snapshot cadence.

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

- pnpm workspaces
- React + TypeScript
- Vite
- Fastify
- TanStack Router
- TanStack Virtual
- Tailwind CSS
- Radix-ready component primitives
- Vitest + Playwright
- oxlint + oxfmt

Seeded workspace shape:

```txt
apps/web                  React/Vite app
apps/server               Fastify server shell
packages/contracts        shared API and stream contracts
packages/ops-tape-sim     server-only tape simulator package
packages/audit-log-model  server-only audit data/query package
```

Still to implement as the product surfaces require them:

- real WebSocket stream and audit API behavior
- worker-backed protocol decoder
- OffscreenCanvas renderer
- TanStack Table
- dnd-kit
- Zod

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
