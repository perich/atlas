# BankOps Technical Notes

Living notes for implementation details worth remembering as the portfolio app grows.

## Operations Stream

- The `/ops` hot path is intentionally server-owned and worker-rendered. The Node server emits balance-sheet movement batches; the browser worker owns the WebSocket, decodes frames, keeps the recent tape buffer, and paints the OffscreenCanvas.
- React only receives lower-frequency snapshots for controls, health widgets, and metadata. Stream rate is not coupled to React render rate.
- The balance-sheet tape canvas scales its backing store by `devicePixelRatio` so text stays sharp on Retina displays.
- Tape amount bars use a rolling max over recently observed movement amounts. That makes large spikes stand out against recent traffic instead of being normalized per frame.
- The live flow heatmap is a 5-second rolling view of amount/sec and exception share across rail and balance-sheet buckets. Yellow borders are reserved for cells with exception share at or above 5%.

## Audit Table

- `/audit` uses TanStack Virtual with a fixed row height, so mounted DOM rows stay bounded even when the backing result set has hundreds of thousands of rows.
- The audit API returns server-side windows. The client does not load the full result set into memory.
- Adjacent scrolling uses cursor requests (`after` / `before`) so normal movement extends the current bounded window.
- Large scrollbar jumps use offset requests. This matches the current static demo dataset and keeps manual scrollbar seeks responsive without walking every skipped page.
- The client keeps a bounded cache of audit windows. When it jumps far away, it replaces the old window instead of retaining everything between the old and new positions.
- Visible-range loads are debounced by a small window in the route. Dragging the scrollbar emits many virtual ranges, but those are coalesced into one server seek for the final settled range.
- `useAuditWindow` guards fetch results with a request id so stale responses from an older range cannot overwrite the latest visible window.
- Audit filters and sorting live in URL query params because they should survive refresh and be shareable. Column layout is a local preference and should live in local storage when implemented.

## API And Data Shape

- The API keeps hot stream data and audit table data as separate stores. The tape needs recent real-time movement batches; the audit table needs queryable historical windows.
- Big integer movement amounts are serialized as strings at the API boundary so JSON remains safe and browser parsing stays explicit.
- Audit sorting is single-column with an implicit id tie-breaker. That keeps cursor pagination stable without adding multi-sort UI complexity.
