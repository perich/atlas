# Deployment

BankOps uses one Render Web Service for the first public demo deploy.

## Shape

```txt
Render Web Service
  -> pnpm build
  -> pnpm start
  -> @bankops/server
       /              built SPA
       /ops           SPA fallback
       /audit         SPA fallback
       /analyst       SPA fallback
       /api/audit     audit HTTP API
       /api/analyst/runs CodeMode analyst SSE API
       /stream        WebSocket upgrade
       /healthz       health check
```

Render terminates public TLS, so the browser sees one same-origin surface:

- `https://<host>/` for the SPA and HTTP API.
- `wss://<host>/stream` for the ops firehose.

The web worker derives the stream URL from `self.location`, so local `http` uses `ws` and production
`https` uses `wss` without a separate client-side environment variable.

## Render

`render.yaml` is the deploy contract:

```txt
buildCommand: npm install -g pnpm@11.1.0 && pnpm install --frozen-lockfile && pnpm build
startCommand: pnpm start
healthCheckPath: /healthz
NODE_VERSION: 24
```

The production server binds to `process.env.PORT` and `0.0.0.0`. Local dev stays on
`127.0.0.1:8787` through the `apps/server` dev script.

The deploy runtime must use Node 24 so CodeMode can use the Node isolate driver. The analyst route
also requires real server-side model configuration:

```txt
OPENROUTER_API_KEY=...
ANALYST_MODEL=openai/gpt-5.5
```

`OPENROUTER_API_KEY` is the OpenRouter API key. `ANALYST_MODEL` is the single OpenRouter model slug
used by the server. For this demo, use `openai/gpt-5.5`. The browser does not receive either value
and cannot select a model. `/analyst` has no fake or precomputed report fallback; missing or failing
model configuration should surface as an Analyst run error.

The server requests OpenRouter reasoning with `reasoning: { effort: "medium" }` for Analyst CodeMode
runs. TanStack/OpenRouter reasoning stream deltas are surfaced as raw model traces when emitted, but
the app does not replay provider-native `reasoning_details` across CodeMode tool-loop continuation
messages.

Good manual analyst prompts for Render/local smoke:

- `Find the riskiest operating pattern in today's audit log`
- `Show rail health and exception pressure by hour`
- `Which customers need operations attention before cutoff?`
- `Create a report with one bar chart, one data table, a rail matrix, and a customer carousel.`

## Live Analyst Demo Preflight

Run this checklist before a live `/analyst` walkthrough. The route stays real-only; this is operator
preparation, not a product fallback.

1. Confirm server-side model configuration is present in the target environment:
   `OPENROUTER_API_KEY` and `ANALYST_MODEL`.
2. Confirm the app and API are healthy:
   `curl -f <origin>/healthz` and `curl -f '<origin>/api/audit?limit=1'`.
3. Open `/audit`, apply `severity=critical`, and confirm the first visible slice has mixed actions
   rather than a long run of one cutoff action.
4. Open `/analyst` and use this fast prompt first:
   `Find the riskiest operating pattern in today's audit log`.
5. Wait for `Validated report ready`, then only run broader prompts if the provider latency is
   acceptable in the room.
6. If the provider or credentials fail, show the plain error state and continue the demo through
   `/ops` and `/audit`; do not switch to fixture reports.

## Smoke Checks

After `pnpm build`, run the same Node service shape locally:

```bash
NODE_ENV=production HOST=127.0.0.1 PORT=8787 pnpm start
```

Then verify:

```bash
curl -f http://127.0.0.1:8787/healthz
curl -f http://127.0.0.1:8787/api/audit?limit=1
curl -f http://127.0.0.1:8787/audit
curl -f http://127.0.0.1:8787/analyst
```

The automated server smoke test covers health, static asset serving, SPA fallback for `/audit` and
`/analyst`, `/api/audit`, and the `/stream` WebSocket upgrade on the same Fastify app.

The Playwright suite includes a real `/analyst` CodeMode happy-path test. It is skipped unless
`OPENROUTER_API_KEY` and `ANALYST_MODEL` are present in the Playwright process environment because it
does live OpenRouter inference.

Do not add PM2, nginx, Docker Compose, or a database service for the first deploy.
