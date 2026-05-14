# Helper Glossary

This document audits authored TypeScript and TSX files under `apps/` and `packages/`, excluding generated `dist/` output. It records every top-level helper function, class-like utility, and notable local constant group, then classifies whether it should remain local, move to a domain module, or be consolidated.

## Summary

### Consolidated In This Pass

- `AUDIT_SEVERITIES`, `AUDIT_STATUSES`, `AUDIT_SORT_FIELDS`, and `AUDIT_SORT_DIRECTIONS` now live in `packages/contracts/src/audit.ts`.
  - Previously duplicated in `apps/server/src/audit-api.ts` and `apps/web/src/app/audit/audit-query-state.ts`.
  - These are protocol/domain constants, not app-local UI constants.
- `RISK_TIERS` now lives in `packages/contracts/src/domain.ts`.
  - Previously duplicated in `packages/ops-tape-sim/src/constants.ts` and `packages/audit-log-model/src/index.ts`.
  - This is shared bank-domain vocabulary because both audit data and ops tape data use the same risk-tier scale.

### God-File Findings

- `apps/web/src/app/ops/ops-stream.worker.ts` is still large, but rolling movement/heatmap aggregation has been extracted to `ops-movement-window.ts`.
  - It now primarily owns worker connection state, canvas rendering, and warm snapshot validation.
  - Recommended next extraction: `ops-tape-renderer.ts` for canvas drawing and `ops-worker-protocol.ts` for websocket message parsing.
- `packages/ops-tape-sim/src/index.ts` is ~553 lines.
  - It is a simulator engine with data generation, rolling aggregation, rail health, and random helpers.
  - Recommended next extraction: `random.ts`, `movement-flags.ts`, and `rail-counters.ts`.
- `packages/audit-log-model/src/index.ts` is ~366 lines.
  - It is primarily synthetic dataset generation. Current helpers are tightly coupled to the generator.
  - Recommended next extraction only if this file grows: `audit-entry-builders.ts`.
- `apps/web/src/app/audit/AuditTableCells.tsx` is ~277 lines.
  - It is acceptable for now because the file owns one concept: audit table cells/header behavior.
  - If it grows, split value formatting into `AuditCellValue.tsx`.

### Helpers That Should Stay Local

Helpers should stay local when they encode one file's rendering mechanics, parser invariants, or test setup. Examples:

- `AuditLoadingCell`, `ResizeHandle`, `TextCell`, `streamPressure`, `HeatmapCell`, `movementCellColor`, `drawRow`.
- Assertion helpers that validate one protocol boundary, such as `assertWarmSnapshot`, `assertCursor`, and `assertMovementBatchFrame`.
- Test factories such as `makeEntry`, `page`, `opsSnapshot`, and `movementPair`.

### Generic Helpers Worth Revisiting Later

- `randomInt` exists in both `packages/audit-log-model/src/random.ts` and `packages/ops-tape-sim/src/index.ts`.
  - Consolidation would require a new shared package or a contracts-adjacent utility module. That is not worth adding yet.
- `rawDataToText` exists in `apps/server/src/ops-stream.ts` and `apps/server/src/ops-stream.test.ts`.
  - The test copy avoids exporting server internals only for tests. Keep local unless more server modules need it.
- Percentile helpers exist as `percentile95` and `percentile`.
  - They operate on different domains and return different semantics. Keep local until a third production use appears.

## File-By-File Glossary

### `apps/server/src/audit-api.ts`

- `registerAuditApi`: Public route registration for audit API endpoints.
  - Classification: keep exported.
- `parseAuditQuery`: Converts Fastify query params into `AuditQuery`.
  - Classification: local. Coupled to HTTP query shape and server error behavior.
- `parseAuditFilters`: Converts query params into audit filters.
  - Classification: local. Uses contract constants for allowed values after this pass.
- `parseLimit`: Validates and clamps the audit page limit.
  - Classification: local. Server API policy, not generic pagination.
- `assertOneOf`: Runtime enum membership assertion.
  - Classification: local for now. Could become shared only if another server parser needs hard-fail behavior.
- `list`: Parses repeated/comma-separated query params into strings.
  - Classification: local. Server-specific because invalid input throws.
- `single`: Parses a single query param and rejects arrays/empty values.
  - Classification: local. Server-specific because invalid input throws.
- `sendJson`: Sends JSON with bigint-safe serialization.
  - Classification: local. Could move to server utility if another route needs bigint JSON.
- `jsonReplacer`: Converts `bigint` values into strings during JSON serialization.
  - Classification: local to `sendJson`.
- `errorResponse`: Normalizes bad-request errors.
  - Classification: local. Endpoint-specific copy and status semantics.

### `apps/server/src/audit-api.test.ts`

- `getAuditPage`: Test helper for calling `/api/audit`.
  - Classification: test-local.
- `getAuditFacets`: Test helper for calling `/api/audit/facets`.
  - Classification: test-local.
- `assertJsonAuditPage`: Test runtime assertion for page response shape.
  - Classification: test-local.
- `assertJsonAuditFacets`: Test runtime assertion for facets response shape.
  - Classification: test-local.

### `apps/server/src/deployment-smoke.test.ts`

- No named top-level helpers.

### `apps/server/src/main.ts`

- `buildServer`: Public server factory used by runtime and tests.
  - Classification: keep exported.
- `resolveListenOptions`: Parses deployment env into Fastify listen options.
  - Classification: keep exported because tests exercise deploy behavior directly.
- `start`: Runtime entrypoint wrapper.
  - Classification: local.
- `defaultWebDistDir`: Resolves the web build output path.
  - Classification: local. Server runtime detail.

### `apps/server/src/ops-stream.ts`

- `startOpsStreamSession`: Public websocket session entrypoint.
  - Classification: keep exported.
- `sendHotBatch`: Local closure inside session lifecycle.
  - Classification: keep inline. It closes over one socket/session.
- `sendWarmSnapshot`: Local closure inside session lifecycle.
  - Classification: keep inline. It closes over one socket/session.
- `readControlMessage`: Parses client websocket control messages.
  - Classification: local. Boundary parser for one websocket route.
- `rawDataToText`: Converts `ws` raw data to text.
  - Classification: local for now. Duplicate exists in tests but exporting internals solely for tests is worse.
- `assertStreamRateMessage`: Runtime assertion for stream control messages.
  - Classification: local. Coupled to websocket protocol.
- `isStreamRate`: Runtime guard against `STREAM_RATES`.
  - Classification: local. Could move to contracts if a second production caller needs it.
- `toWarmMessage`: Converts simulator snapshot into browser warm snapshot shape.
  - Classification: local. Server/browser mapping logic.

### `apps/server/src/ops-stream.test.ts`

- `connect`: Test websocket connection helper.
  - Classification: test-local.
- `nextBinary`: Test helper that waits for the next binary frame.
  - Classification: test-local.
- `onMessage`: Local promise callback inside websocket test helpers.
  - Classification: keep inline.
- `nextSnapshot`: Test helper that waits for warm snapshot JSON.
  - Classification: test-local.
- `rawDataToBuffer`: Converts `ws` raw data to `Buffer` for tests.
  - Classification: test-local.
- `rawDataToText`: Converts `ws` raw data to text for tests.
  - Classification: test-local; duplicate with server implementation is acceptable.
- `assertWarmOpsSnapshotMessage`: Test assertion for warm snapshot shape.
  - Classification: test-local.

### `apps/web/src/app/App.tsx`

- `App`: Root app component.
  - Classification: keep exported.
- `queryClient`: App-level singleton.
  - Classification: keep local to app root.

### `apps/web/src/app/AppShell.tsx`

- `AppShell`: Layout shell component.
  - Classification: keep exported.

### `apps/web/src/app/router.tsx`

- `rootRoute`, `indexRoute`, `opsRoute`, `auditRoute`, `analystRoute`, `routeTree`, `router`: Route construction constants.
  - Classification: keep local. They are declarative router setup, not helpers.
- `AppRouter`: Router provider component.
  - Classification: keep exported.

### `apps/web/src/app/routes/AnalystRoute.tsx`

- `AnalystRoute`: Placeholder route component.
  - Classification: keep exported.

### `apps/web/src/app/routes/AuditRoute.tsx`

- `AuditRoute`: Route-level orchestration component.
  - Classification: keep exported.
- `ROW_HEIGHT`, `AUDIT_SCROLL_LOAD_DEBOUNCE_MS`, `auditRouteApi`: Route constants.
  - Classification: keep local. They are route behavior knobs.

### `apps/web/src/app/routes/OpsRoute.tsx`

- `OpsRoute`: Route-level orchestration component.
  - Classification: keep exported.

### `apps/web/src/app/audit/AuditColumnLayoutMenu.tsx`

- `AuditColumnLayoutMenu`: Column visibility dropdown.
  - Classification: keep exported.
- `ColumnLayoutUpdate`: Shared type for column layout setters.
  - Classification: keep exported from this feature module.

### `apps/web/src/app/audit/AuditFilterPanel.tsx`

- `AuditFilterPanel`: Audit filters and column layout controls.
  - Classification: keep exported.
- `FilterSelect`: Local select control used only inside audit filters.
  - Classification: keep local. It is not a design-system component.
- `TIME_OPTIONS`, `SEVERITY_OPTIONS`, `RAIL_OPTIONS`, `STATUS_OPTIONS`: UI option arrays.
  - Classification: keep local. They adapt contract constants for this filter UI.

### `apps/web/src/app/audit/AuditRenderTracePanel.tsx`

- `useMainThreadBlockingP95`: Hook for long-task p95 telemetry.
  - Classification: keep exported for audit route diagnostics.
- `AuditRenderTracePanel`: Render trace panel component.
  - Classification: keep exported.
- `TraceMetric`: Small local metric cell component.
  - Classification: keep local.
- `subscribeToLongTasks`: Local subscription wrapper around global long-task samples.
  - Classification: keep local. Coupled to this telemetry module.
- `readLongTaskP95`: Reads current long-task p95.
  - Classification: keep local.
- `startLongTaskObserver`: Starts the browser `PerformanceObserver`.
  - Classification: keep local.
- `percentile`: Generic percentile calculation.
  - Classification: local for now. Do not extract until a production caller needs general percentile semantics.

### `apps/web/src/app/audit/AuditTableCells.tsx`

- `AuditHeaderCell`: Sortable, draggable, resizable table header cell.
  - Classification: keep exported within audit feature.
- `AuditRowCell`: Shared fixed-width row cell shell.
  - Classification: keep exported within audit feature.
- `AuditCellValue`: Renders a typed audit row value for one column.
  - Classification: keep exported within audit feature.
- `ResizeHandle`: Pointer-driven resize control.
  - Classification: keep local. Coupled to `AuditHeaderCell`.
- `TextCell`: Truncated text shell for audit cells.
  - Classification: keep local.
- `columnStyle`: Builds fixed-width style object from column layout.
  - Classification: keep local. It only makes sense with `SizedAuditColumn`.
- `resizeHandleWasClicked`: Prevents sort clicks when interacting with resize handle.
  - Classification: keep local.
- `formatTimestamp`: UTC timestamp formatter for audit cells.
  - Classification: keep local unless another feature needs identical fixed-width UTC text.
- `severityClass`: Maps audit severity to UI text class.
  - Classification: keep local. Presentation-specific.
- `formatMinor`: Formats optional string minor units for audit table amount cells.
  - Classification: keep local; differs from shared ops/dashboard formatters.

### `apps/web/src/app/audit/AuditTablePanel.tsx`

- `AuditTablePanel`: Virtualized audit table frame.
  - Classification: keep exported.
- `AuditVirtualRow`: Renders real or placeholder row at a virtual offset.
  - Classification: keep local. Coupled to virtualizer layout.
- `AuditLoadingCell`: Loading skeleton cell.
  - Classification: keep local. Coupled to audit table loading UI.
- `SORT_FIELD_BY_COLUMN_ID`, `LOADING_CELL_WIDTH_CLASSES_BY_COLUMN`: Table mapping constants.
  - Classification: keep local. Presentation/table behavior details.

### `apps/web/src/app/audit/audit-api.ts`

- `fetchAuditPage`: Browser API fetcher for audit pages.
  - Classification: keep exported.
- `assertAuditPage`: Runtime response assertion.
  - Classification: local. It protects one fetcher boundary.

### `apps/web/src/app/audit/audit-column-layout.ts`

- `defaultAuditColumnLayout`: Builds default persisted table layout.
  - Classification: keep exported.
- `readAuditColumnLayout`: Reads and normalizes layout from storage.
  - Classification: keep exported.
- `writeAuditColumnLayout`: Persists layout.
  - Classification: keep exported.
- `visibleAuditColumns`: Computes visible sized columns.
  - Classification: keep exported.
- `resizeAuditColumn`: Updates one column width.
  - Classification: keep exported.
- `moveAuditColumn`: Reorders columns.
  - Classification: keep exported.
- `setAuditColumnVisible`: Toggles column visibility.
  - Classification: keep exported.
- `normalizeAuditColumnLayout`: Runtime normalizer for unknown storage data.
  - Classification: keep exported for tests and storage boundary.
- `clampWidth`: Clamps a width to one column's min/max.
  - Classification: keep local.
- `knownIds`: Filters unknown column ids.
  - Classification: keep local.

### `apps/web/src/app/audit/audit-column-layout.test.ts`

- No named helpers beyond test cases.

### `apps/web/src/app/audit/audit-query-state.ts`

- `validateAuditSearch`: Sanitizes route search input for TanStack Router.
  - Classification: keep exported.
- `auditSearchToQueryState`: Converts URL search into table query state.
  - Classification: keep exported.
- `queryStateToAuditSearch`: Converts query state back into route search params.
  - Classification: keep exported.
- `readAuditQueryState`: Legacy/direct URL parser for tests and non-router callers.
  - Classification: keep exported for now.
- `serializeAuditQueryState`: Serializes query state to a query string.
  - Classification: keep exported for tests and share links.
- `appendList`: URLSearchParams list writer.
  - Classification: keep local.
- `enumList`: URL/search enum parser.
  - Classification: keep local. It silently drops invalid browser URL values, unlike server parsers that throw.
- `parseNumber`: Lenient browser number parser.
  - Classification: keep local.
- `toSearchStrings`: Normalizes route search values into strings.
  - Classification: keep local.

### `apps/web/src/app/audit/audit-query-state.test.ts`

- No named helpers beyond test cases.

### `apps/web/src/app/audit/audit-time-range.ts`

- `TIME_RANGES`: Shared time filter definitions.
  - Classification: keep exported in audit feature.
- `timeRangeValue`: Maps current range timestamps back to a dropdown value.
  - Classification: keep exported from a non-React module to preserve Fast Refresh hygiene.

### `apps/web/src/app/audit/audit-window.ts`

- `mergeAuditWindow`: Adds a fetched page window to the bounded cache.
  - Classification: keep exported.
- `nextAuditWindowRequest`: Determines the next page/window fetch.
  - Classification: keep exported.
- `AUDIT_PAGE_SIZE`, `AUDIT_MAX_WINDOWS`, `EMPTY_AUDIT_WINDOW_CACHE`, `PREFETCH_DISTANCE`: Audit windowing constants.
  - Classification: keep in this domain module.

### `apps/web/src/app/audit/audit-window.test.ts`

- `page`: Test factory for audit pages.
  - Classification: test-local.
- `makeRow`: Test factory for audit rows.
  - Classification: test-local.

### `apps/web/src/app/audit/use-audit-window.ts`

- `useAuditWindow`: Hook coordinating audit page fetching and window cache updates.
  - Classification: keep exported.

### `apps/web/src/app/ops/BalanceSheetTape.tsx`

- `BalanceSheetTape`: Canvas host component for the worker-rendered tape.
  - Classification: keep exported.
- `readTapeCanvasLayout`: Reads CSS size and device pixel ratio.
  - Classification: keep local. Coupled to this canvas element.
- `sizeCanvasElement`: Applies backing-store canvas size.
  - Classification: keep local.

### `apps/web/src/app/ops/OpsBottomBand.tsx`

- `OpsBottomBand`: Bottom sparkline metric band.
  - Classification: keep exported.
- `SparklinePanel`: Local metric card with sparkline.
  - Classification: keep local.
- `Sparkline`: SVG sparkline renderer.
  - Classification: keep local for now. Do not move to design until another feature needs sparklines.
- `lastChartPoint`: Reads latest chart point.
  - Classification: keep local. Too small and contextual to extract.

### `apps/web/src/app/ops/OpsSideRail.tsx`

- `OpsSideRail`: Stream controls, performance HUD, and rail health sidebar.
  - Classification: keep exported.
- `RendererMetrics`: Local renderer metric grid.
  - Classification: keep local.
- `RailHealthList`: Local rail status list.
  - Classification: keep local.
- `streamPressure`: Derives UI pressure label from renderer metrics.
  - Classification: keep local. Presentation policy, not a stream protocol rule.

### `apps/web/src/app/ops/OpsTopBand.tsx`

- `OpsTopBand`: Top KPI band.
  - Classification: keep exported.
- `OpsMetricCard`: Local metric-card variant specific to ops KPIs.
  - Classification: keep local unless the design system gains a generalized compact metric card.

### `apps/web/src/app/ops/RailBucketHeatmap.tsx`

- `RailBucketHeatmap`: Ops flow concentration grid.
  - Classification: keep exported.
- `HeatmapSignalSummary`: Local summary for hottest heatmap cell.
  - Classification: keep local.
- `HeatmapLegend`: Local legend.
  - Classification: keep local.
- `LegendItem`: Local legend swatch.
  - Classification: keep local.
- `HeatmapCell`: Local cell renderer.
  - Classification: keep local.
- `emptyHeatmapCell`: Fills missing rail/bucket combinations.
  - Classification: keep local.
- `formatHeatmapRate`: Heatmap-specific compact movement-rate formatter.
  - Classification: keep local.
- `heatmapKey`: Builds rail/bucket map keys.
  - Classification: keep local. Only one heatmap uses this key.

### `apps/web/src/app/ops/ops-format.ts`

- `titleize`: Converts underscore identifiers into title case.
  - Classification: exported feature helper. Keep under ops until another app area needs it.

### `apps/web/src/app/ops/ops-rail-health.ts`

- `railStatusLabel`: Formats rail status copy.
  - Classification: exported ops helper.
- `railHealthClassNames`, `railHealthLabels`, `railHealthSeverity`: Rail health presentation/severity maps.
  - Classification: keep in ops helper module.

### `apps/web/src/app/ops/ops-stream-messages.ts`

- No helper functions. This is a message/type and initial snapshot module.

### `apps/web/src/app/ops/ops-movement-window.ts`

- `OpsMovementWindow`: Rolling five-second movement window used by the worker for amount scaling and heatmap snapshots.
  - Classification: keep exported within ops feature. Extracted from `ops-stream.worker.ts` because it is aggregation state, not canvas or websocket lifecycle.
- `record`: Adds movement batches to rolling bins.
  - Classification: class method, cohesive with `OpsMovementWindow`.
- `rollingAmountScaleMinor`: Computes max recent movement amount for tape magnitude bars.
  - Classification: class method, cohesive with `OpsMovementWindow`.
- `heatmapSnapshot`: Builds warm heatmap cells from rolling bins.
  - Classification: class method, cohesive with `OpsMovementWindow`.
- `windowCutoff`: Computes active rolling-window cutoff.
  - Classification: private class helper.
- `movementBinFor`: Finds or resets the rolling bin for a timestamp.
  - Classification: private class helper.

### `apps/web/src/app/ops/ops-stream-store.ts`

- `createOpsStreamStore`: Creates the worker-backed external store.
  - Classification: keep exported for tests.
- `emit`: Local store snapshot broadcaster.
  - Classification: keep nested; closes over listeners.
- `start`: Local worker lifecycle initializer.
  - Classification: keep nested.
- `stop`: Local worker lifecycle teardown.
  - Classification: keep nested.
- `post`: Local command sender.
  - Classification: keep nested.
- `attachPendingTapeCanvas`: Local pending canvas handoff.
  - Classification: keep nested.
- `opsStreamStore`: App singleton.
  - Classification: keep exported.
- `useOpsStream`: React hook around the store.
  - Classification: keep exported.

### `apps/web/src/app/ops/ops-stream-store.test.tsx`

- `MockWorker`: Test double for Worker.
  - Classification: test-local class.
- `latestWorker`: Reads most recent mock worker.
  - Classification: test-local.
- `findButton`: Test DOM query helper.
  - Classification: test-local.
- `renderOpsRoute`: Test renderer setup.
  - Classification: test-local.
- `opsSnapshot`: Test snapshot factory.
  - Classification: test-local.
- `MockOffscreenCanvas`: Inline test double.
  - Classification: keep inline.

### `apps/web/src/app/ops/ops-stream.worker.ts`

- `connect`: Opens/reopens the websocket and publishes connection status.
  - Classification: local worker lifecycle helper.
- `disconnect`: Closes websocket and clears reconnect state.
  - Classification: local worker lifecycle helper.
- `attachCanvas`: Receives transferred `OffscreenCanvas`.
  - Classification: local canvas lifecycle helper.
- `resizeCanvas`: Applies new layout and schedules repaint.
  - Classification: local canvas lifecycle helper.
- `draw`: Main canvas render pass.
  - Classification: local renderer function.
- `scheduleDraw`: Coalesces repaint requests.
  - Classification: local renderer function.
- `drawBackdrop`: Draws canvas background.
  - Classification: local renderer function.
- `drawHeader`: Draws tape header row.
  - Classification: local renderer function.
- `drawRow`: Draws one movement row.
  - Classification: local renderer function.
- `drawCells`: Draws text cells for one row.
  - Classification: local renderer function.
- `drawMovementCells`: Draws amount and side-specific movement cells.
  - Classification: local renderer function.
- `drawMagnitudeBar`: Draws relative amount bar.
  - Classification: local renderer function.
- `drawColumnRules`: Draws column separators.
  - Classification: local renderer function.
- `movementCellColor`: Computes row/cell text colors.
  - Classification: local renderer policy.
- `movementSideColor`: Maps debit/credit side to color.
  - Classification: local renderer policy.
- `columnX`: Computes tape column x-position.
  - Classification: local renderer helper.
- `pushRows`: Adds decoded movements to visible tape buffer.
  - Classification: local state helper.
- `movementCells`: Converts one movement into fixed tape cell strings.
  - Classification: local renderer helper.
- `formatMinorUsd`: Worker-local money formatter for bigint minor units.
  - Classification: keep local. It avoids importing UI formatters into worker hot path and uses bigint.
- `publish`: Posts snapshot to main thread.
  - Classification: local worker messaging helper.
- `streamUrl`: Resolves websocket URL.
  - Classification: local environment helper.
- `readWarmSnapshot`: Parses warm snapshot JSON.
  - Classification: local worker protocol parser.
- `assertWarmSnapshot`: Runtime assertion for warm snapshot.
  - Classification: local worker protocol parser.

### `apps/web/src/design/components.tsx`

- `Button`, `Panel`, `PageHeader`, `StatCard`, `NavLink`, `InfoTooltip`: Design components.
  - Classification: keep exported.
- `TooltipContent`: Local tooltip content wrapper.
  - Classification: keep local.
- `TooltipProvider`: Re-export of Radix provider.
  - Classification: keep exported.

### `apps/web/src/design/format.ts`

- `formatMinorUsd`: Compact USD formatter from numeric minor units.
  - Classification: keep exported design formatter.
- `formatMinorUsdString`: Compact USD formatter from string minor units.
  - Classification: keep exported design formatter.
- `formatCount`: Locale count formatter.
  - Classification: keep exported design formatter.
- `formatMilliseconds`: Millisecond formatter.
  - Classification: keep exported design formatter.
- `formatSecondsFromMs`: Seconds formatter.
  - Classification: keep exported design formatter.
- `formatPercent`: Percent formatter.
  - Classification: keep exported design formatter.

### `apps/web/src/design/utils.ts`

- `cn`: Class name merge helper.
  - Classification: keep exported design utility.

### `apps/web/src/main.tsx`

- `rootElement`: DOM root lookup.
  - Classification: app bootstrap constant.

### `apps/web/src/test/e2e/smoke.spec.ts`

- `hasVariedPngBytes`: Checks PNG pixel variation for canvas smoke tests.
  - Classification: test-local.
- `readPngChunks`: Parses PNG chunks.
  - Classification: test-local.

### `apps/web/src/test/unit/smoke.test.tsx`

- No named helpers.

### `apps/web/vite.config.ts`

- No named helpers.

### `apps/web/vitest.config.ts`

- No named helpers.

### `packages/audit-log-model/src/index.ts`

- `getAuditLogEntries`: Returns memoized synthetic audit dataset.
  - Classification: keep exported.
- `createAuditEntries`: Creates deterministic synthetic audit entries.
  - Classification: keep exported.
- `createAuditEntry`: Creates one synthetic audit entry.
  - Classification: local generator helper.
- `amountFor`: Derives optional amount for one audit kind.
  - Classification: local generator helper.
- `riskTierFor`: Derives optional risk tier for one audit kind.
  - Classification: local generator helper; now uses contract `RISK_TIERS`.
- `severityFor`: Derives severity from profile/index.
  - Classification: local generator helper.
- `statusFor`: Derives status from profile/index.
  - Classification: local generator helper.
- `idempotencyKeyFor`: Creates synthetic idempotency keys.
  - Classification: local generator helper.
- `customerIdFor`: Formats synthetic customer IDs.
  - Classification: local generator helper.
- `accountIdFor`: Formats synthetic account IDs.
  - Classification: local generator helper.
- `traceIdFor`: Formats synthetic trace IDs.
  - Classification: local generator helper.

### `packages/audit-log-model/src/index.test.ts`

- No named helpers beyond test cases.

### `packages/audit-log-model/src/query.ts`

- `queryAuditEntries`: Public query engine for audit entries.
  - Classification: keep exported.
- `getAuditFacets`: Public facets engine.
  - Classification: keep exported.
- `filterEntries`: Applies audit filters.
  - Classification: local query helper.
- `pageStart`: Computes cursor/offset start index.
  - Classification: local query helper.
- `cursorIndex`: Finds a cursor position.
  - Classification: local query helper.
- `compareEntries`: Sort comparator with implicit id tiebreaker.
  - Classification: local query helper.
- `sortValue`: Reads a sortable value from an entry.
  - Classification: local query helper.
- `compareValues`: Generic string/number comparator.
  - Classification: local for now. Do not move until another query module needs it.
- `encodeCursor`: Encodes cursor payload.
  - Classification: local query helper.
- `decodeCursor`: Decodes cursor payload.
  - Classification: local query helper.
- `assertCursor`: Runtime cursor assertion.
  - Classification: local query helper.
- `increment`: Facet counter helper.
  - Classification: local query helper.

### `packages/audit-log-model/src/query.test.ts`

- `entries`: Test fixture builder.
  - Classification: test-local.
- `makeEntry`: Test entry factory.
  - Classification: test-local.

### `packages/audit-log-model/src/random.ts`

- `randomInt`: Deterministic integer RNG helper.
  - Classification: exported package-local utility. Similar helper exists in `ops-tape-sim`, but sharing it would require a new package; keep local for now.

### `packages/contracts/src/audit.ts`

- No helper functions.
- `AUDIT_SEVERITIES`, `AUDIT_STATUSES`, `AUDIT_SORT_FIELDS`, `AUDIT_SORT_DIRECTIONS`: Shared audit protocol constants.
  - Classification: canonical source.

### `packages/contracts/src/domain.ts`

- No helper functions.
- `STREAM_RATES`, `RAILS`, `ASSETS`, `MOVEMENT_KINDS`, `MOVEMENT_SIDES`, `BALANCE_SHEET_BUCKETS`, `MOVEMENT_STATUSES`, `RISK_TIERS`: Shared domain constants.
  - Classification: canonical source.

### `packages/contracts/src/index.ts`

- No helper functions. Barrel export only.

### `packages/contracts/src/settlement-stream.ts`

- `encodeMovementBatch`: Binary movement frame encoder.
  - Classification: keep exported protocol API.
- `decodeMovementBatch`: Binary movement frame decoder.
  - Classification: keep exported protocol API.
- `SettlementStreamDecodeError`: Protocol decode error type.
  - Classification: keep exported.
- `assertMovementBatchFrame`: Validates encoder input.
  - Classification: local protocol assertion.
- `assertUint`: Integer range assertion.
  - Classification: local protocol assertion.
- `assertBigUint32`: BigInt unsigned 32-bit assertion.
  - Classification: local protocol assertion.
- `assertInt64`: BigInt signed 64-bit assertion.
  - Classification: local protocol assertion.

### `packages/contracts/src/settlement-stream.test.ts`

- `expectDecodeError`: Test assertion helper for protocol decode failures.
  - Classification: test-local.

### `packages/ops-tape-sim/src/constants.ts`

- No helper functions.
- `INDUSTRIES`, `CUSTOMER_NAMES`, `ACCOUNT_LABELS`, `RISK_TIERS`, `MOVEMENT_PROFILES`, `TOTAL_PROFILE_WEIGHT`: Simulator data/config.
  - Classification: keep here except `RISK_TIERS`, which is now re-exported from contracts.

### `packages/ops-tape-sim/src/index.ts`

- `OpsTapeSimulator`: Stateful synthetic balance-sheet movement simulator.
  - Classification: keep exported.
- `createOpsTapeSimulator`: Factory for the simulator.
  - Classification: keep exported.
- `createCustomers`: Builds deterministic synthetic customers/accounts.
  - Classification: local simulator helper.
- `nextRandom`: Deterministic PRNG step.
  - Classification: local for now.
- `randomInt`: Deterministic integer helper.
  - Classification: local for now; similar to audit random helper but cross-package extraction is not yet worth the package/API cost.
- `movementFlags`: Builds bitmask flags for one movement.
  - Classification: local simulator helper.
- `traceId`: Formats synthetic movement trace id.
  - Classification: local simulator helper.
- `percentile95`: Computes p95 latency.
  - Classification: local simulator helper.
- `createRailCounters`: Builds rail counter map.
  - Classification: local simulator helper.

### `packages/ops-tape-sim/src/index.test.ts`

- `tickTs`: Test timestamp helper.
  - Classification: test-local.
- `abs`: Test bigint absolute-value helper.
  - Classification: test-local.
- `movementPair`: Test rail/bucket pair formatter.
  - Classification: test-local.
- `amountSignMatchesSide`: Test invariant helper.
  - Classification: test-local.
