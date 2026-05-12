# Monorepo with Single-Service Demo Deploy

BankOps Mission Control will keep the React app, stream server, audit API, simulator, and shared
protocol code in one pnpm workspace monorepo. The first public deployment should be a single
long-running Node service that serves the built SPA, the `/stream` WebSocket endpoint, and the
`/api/audit` endpoints from the same origin, with a split static-web plus API/stream deploy left as
a later option. This favors implementation speed, clear local development, and an honest realtime
architecture over serverless convenience.

**Considered Options**

- Keep only frontend code in this repo and mock the server: simpler, but it undercuts the central
  server-owned firehose story.
- Deploy the web app to a static host and the stream server separately: valid later, but it adds CORS
  and preview-environment complexity before the core demo works.
- Split `/stream` and `/api/audit` into separate services: unnecessary for a portfolio project and
  unlikely to improve the product narrative.
- Use Cloudflare Durable Objects immediately: strong production shape for coordinated WebSockets,
  but it would force the first server implementation into the Worker runtime instead of a normal Node
  server.

**Consequences**

The next structural change should introduce `pnpm-workspace.yaml`, move the current app to
`apps/web`, and add `apps/stream-server`, `packages/protocol`, and `packages/bank-sim`. The stream
server should expose `/healthz`, `/stream`, and `/api/audit` endpoints and should be able to serve
the built SPA for demo deploys.
