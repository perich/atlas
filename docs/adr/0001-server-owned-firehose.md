# Server-Owned Firehose for Route 1

Route 1 will use a local stream server as the owner of the live bank event firehose. The browser
will receive WebSocket binary event batches for the hot path, JSON snapshots for low-frequency
aggregate state, and control messages for scenario/rate/backpressure updates. This keeps the demo
honest: React renders the operator product surface, while workers and OffscreenCanvas handle dense
stream ingestion and visualization.

**Considered Options**

- Server-sent events: simpler, but text-oriented and a poor fit for high-rate binary visualization.
- JSON WebSocket events: fast to build, but weaker as a performance demo and more expensive to parse
  at stress rates.
- WebTransport: technically attractive, but too much deployment and browser friction for the first
  portfolio build.

**Consequences**

The protocol package should be introduced early so the server, ingress worker, and tests share the
same frame definitions. React components should consume coalesced snapshots rather than individual
events, so stream rate is not coupled to React commit rate.
