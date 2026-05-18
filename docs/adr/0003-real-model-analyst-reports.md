# Real Model Analyst Reports

`/analyst` will use real provider-backed LLM inference for its Code Mode report generation path,
configured on the server by environment rather than selected by the browser. The model gateway is
OpenRouter, reached through TanStack AI's OpenRouter adapter for Code Mode compatibility, with a
single server-side `ANALYST_MODEL` slug and `OPENROUTER_API_KEY`. We will not add a fake or
precomputed report fallback for demo reliability; if provider credentials or inference fail, the
route should show a degraded state. Renderer and schema fixtures may exist for tests, but product
reports must come from the real model path so the demo proves the actual natural-language analysis
workflow. Code Mode should use the Node isolate driver as the primary sandbox, matching the reference
implementation, so the repo and deploy runtime should be pinned to Node 24; QuickJS can remain a
fallback for resilience, not the planned execution path.
