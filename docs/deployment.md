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
       /api/audit     audit HTTP API
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
```

The production server binds to `process.env.PORT` and `0.0.0.0`. Local dev stays on
`127.0.0.1:8787` through the `apps/server` dev script.

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
```

The automated server smoke test covers health, static asset serving, SPA fallback, `/api/audit`, and
the `/stream` WebSocket upgrade on the same Fastify app.

Do not add PM2, nginx, Docker Compose, or a database service for the first deploy.
