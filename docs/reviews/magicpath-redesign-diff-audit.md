# MagicPath Redesign Difference Audit

Date: 2026-05-19

This document enumerates the implementation differences between the current Atlas web app and the current MagicPath designs in project `407503572054470656`.

MagicPath sources reviewed:

- `Atlas Ops Redesign`
  - Component id: `407504399955537920`
  - Generated name: `vibrant-tower-9819`
  - Current selected revision: `407507971707383808`
- `Atlas Audit Redesign`
  - Component id: `407504433145061376`
  - Generated name: `mighty-stone-5426`
  - Current selected revision: `407508028984799232`
- `Atlas Analyst Redesign`
  - Component id: `407504483812274176`
  - Generated name: `sharply-shade-2623`
  - Current selected revision: `407508091505094656`

Current app sources reviewed:

- `apps/web/src/app/AppShell.tsx`
- `apps/web/src/design/components.tsx`
- `apps/web/src/styles/app.css`
- `apps/web/src/app/routes/OpsRoute.tsx`
- `apps/web/src/app/ops/OpsTopBand.tsx`
- `apps/web/src/app/ops/OpsSideRail.tsx`
- `apps/web/src/app/ops/OpsBottomBand.tsx`
- `apps/web/src/app/ops/RailBucketHeatmap.tsx`
- `apps/web/src/app/ops/BalanceSheetTape.tsx`
- `apps/web/src/app/routes/AuditRoute.tsx`
- `apps/web/src/app/audit/AuditFilterPanel.tsx`
- `apps/web/src/app/audit/AuditRenderTracePanel.tsx`
- `apps/web/src/app/audit/AuditTablePanel.tsx`
- `apps/web/src/app/audit/AuditTableCells.tsx`
- `apps/web/src/app/audit/AuditColumnLayoutMenu.tsx`
- `apps/web/src/app/routes/AnalystRoute.tsx`
- `apps/web/src/app/analyst/workspace/AnalystWorkspaceShell.tsx`
- `apps/web/src/app/analyst/workspace/AnalystControlRail.tsx`
- `apps/web/src/app/analyst/workspace/AnalystRunStatus.tsx`
- `apps/web/src/app/analyst/workspace/AnalystCanvas.tsx`

## Global Application Shell

### Brand and Navigation

- Current app uses a `Landmark` lucide icon plus the text `Back Office`.
- Designs replace the icon with a compact `BO` monogram.
- Ops design renders the monogram as a dark outlined square with white `BO`.
- Audit and Analyst designs render the monogram as a cyan filled square with dark `BO`.
- Current app brand text is `Back Office`; designs use `BankOps`.
- Current app header height is `h-9` (36px); Audit and Analyst designs use a 44px top nav; Ops uses a 28px monogram inside a larger nav area with bottom padding.
- Current app nav uses lucide icons for all routes: `RadioTower`, `ClipboardList`, `Bot`.
- Designs remove nav icons entirely.
- Current app nav active state is a full bordered rectangular item with subtle white background.
- Ops and Audit designs use a left cyan active rule plus dark active background.
- Analyst design uses a bottom cyan active rule instead of the left rule.
- Current app inactive nav text is `text-bankops-muted`; designs use darker muted values around `#7a8899` or `#4a5768`.
- Current app route labels are title-case `Ops`, `Audit`, `Analyst`; designs keep the same labels.
- Current app nav items are `Link` components with real router navigation; MagicPath designs use inert `div`/`a href="#"` placeholders.
- Implementation must preserve real router links and active route behavior while adopting the visual treatment.

### Header Right Side

- Current app right header text is `BANKOPS MISSION CONTROL` plus a local live clock without timezone.
- Ops design replaces this with a green status dot, `CONNECTED`, and `08:15:06 UTC`.
- Audit design replaces this with a green dot and `UTC 08:15:07`.
- Analyst design replaces this with a muted status dot, `IDLE`, and a live UTC timestamp.
- Current `LiveClock` formats local time with seconds.
- Designs imply a UTC clock and route-specific system status.
- Implementation decision needed: whether the global shell should always show UTC, or Ops/Analyst should pass route-specific right-side status into the shell.
- Current app has no global connection/status API in `AppShell`; Ops connection state currently lives inside Ops route worker state.
- To match Ops design, AppShell would need either route-specific header slots or Ops-local replicated top nav.

### Page Container and Spacing

- Current shell wraps route content in `<main className="p-6">`.
- Designs use `20px` outer padding on all three screens.
- Current route panels use `rounded-md` and `border-white/[0.08]`.
- Designs use 4px radius, lower contrast `rgba(255,255,255,0.06)` borders, and stronger black shadows.
- Current app uses nested route page panels under the shell; designs make each route feel like a single workstation frame.
- Current app uses Tailwind classes and theme tokens; MagicPath designs are mostly inline styles with hardcoded colors.
- Implementation should translate design constants into shared Tailwind tokens/classes rather than copying inline styles.

### Typography

- Current app imports IBM Plex Sans and IBM Plex Mono in `app.css`.
- Designs also use IBM Plex Sans/Mono, often explicitly via inline `fontFamily`.
- Current app uses `text-bankops-text`, `text-bankops-muted`, and hardcoded `#5a6272`.
- Designs introduce a more systematic palette:
  - Page background: `#07090b`
  - Main panel: `#0c0f12`
  - Raised panel/header: `#10151a`
  - Active/dense surface: `#151c22`
  - Primary text: `#e8edf2`
  - Secondary text: `#7a8899`
  - Subtle text: `#4a5768`
  - Cyan accent: `#06b6d4`
  - Green: `#22c55e`
  - Amber: `#f59e0b`
  - Red: `#ef4444`
- Current primary text `#f0f2f5` is slightly brighter and cooler than design `#e8edf2`.
- Current muted text `#8b95a8` is lighter than design `#7a8899`.
- Current subtle text `#5a6272` sits between the design's secondary and subtle colors.

### Mobile Behavior

- Current `AppShell` hides the full app below `lg` and shows a desktop-only message.
- MagicPath designs are fixed desktop compositions and do not include the mobile-blocking view.
- Implementation should preserve the current desktop-only guard unless product direction changes.

## Operations Route

Current implementation files:

- `OpsRoute.tsx`
- `OpsTopBand.tsx`
- `BalanceSheetTape.tsx`
- `OpsSideRail.tsx`
- `OpsBottomBand.tsx`
- `RailBucketHeatmap.tsx`

MagicPath target:

- `AtlasOpsRedesign.tsx`

### Route Frame

- Current route root uses `min-h-[calc(100vh-5.25rem)] overflow-hidden rounded-md border border-white/[0.08] bg-bankops-bg`.
- Design route root uses a centered `maxWidth: 1440` workstation frame, `backgroundColor: #0c0f12`, `border: rgba(255,255,255,0.06)`, `borderRadius: 4`, and `boxShadow: 0 8px 40px rgba(0,0,0,0.6)`.
- Current route relies on shell `main` padding; design includes its own `20px` page padding.
- Current route hero top has large blank vertical area because `OpsHeroHeader` has `py-5` and sparse content.
- Design header is more compact and denser, with title, badges, and operational KPIs in one row.

### Ops Header Copy and Badges

- Current eyebrow stack:
  - `LIVE CORE` badge.
  - `LIVE` badge.
  - PageHeader eyebrow `Operations`.
  - Title `Operations Control Plane`.
- Design removes the `Operations` eyebrow entirely.
- Design title remains `Operations Control Plane`.
- Design keeps `LIVE` but styles it as smaller mono text with green border/background.
- Design adds a red `ACH INCIDENT` badge in the main header.
- Current app exposes worst rail only in the top metric card as `Ach Incident`.
- Design promotes worst rail status to the header badge as `ACH INCIDENT`.
- Current app title is `text-2xl`; design title is 24px but inside a more compact visual system.

### Header Operational Summary

- Current app has no right-side header metrics in `OpsHeroHeader`.
- Design adds three right-aligned header metrics:
  - `Pressure` = `WATCH`
  - `Backlog` = `93`
  - `Frame cost` = `1.9ms`
- Current equivalents live elsewhere:
  - Pressure is in `OpsSideRail` Performance HUD.
  - Backlog and frame cost are in `TapeHeaderStream` and side rail renderer metrics.
- Implementation must decide whether to duplicate these values in the header or move them out of existing lower panels.
- Design labels `Frame cost`; current tape header says `PACKET LATENCY`, and side HUD says `FRAME`.
- Current pressure casing is `Watch`; design uses `WATCH`.

### Top Metrics Band

- Current top band uses six `OpsMetricCard`s with icons and tooltips.
- Design top band removes all metric icons.
- Design top band removes visible info tooltip buttons.
- Current labels:
  - `Event rate`
  - `Credits`
  - `Debits`
  - `Liquidity`
  - `Open exceptions`
  - `Rail health`
- Design labels:
  - `Event Rate`
  - `Credits`
  - `Debits`
  - `Liquidity`
  - `Exceptions`
  - `Rail Health`
- Current exception value is just `132`; design value is `132 OPEN`.
- Current credits and debits both render as unsigned currency values.
- Design credits render with `+` prefix and green color: `+$12.2B`.
- Design debits render with a true minus sign and red color: `−$13.9B`.
- Current liquidity remains white; design liquidity remains white.
- Current event rate remains white; design event rate remains white.
- Current rail health value is title case `Ach Incident`; design is uppercase stacked-ish visual `ACH INCIDENT`.
- Current top band card background is `bg-bankops-panel`; design uses `#0c0f12`.
- Current card padding is `p-3`; design uses `14px 20px`.
- Current label color is `#5a6272`; design label color is `#4a5768`.
- Current label font size is `9px`; design keeps `9px`.
- Current value font size is Tailwind `text-xl`; design value is 22px.
- Current top band allows horizontal overflow with `min-w-48`; design assumes six equal grid columns.
- Current tooltips explain metric semantics; design does not show tooltip affordances. If removing tooltip icons, preserve explanations elsewhere only if product wants them.

### Live Tape Layout

- Current live tape is rendered by an offscreen canvas (`BalanceSheetTape`) inside a flexible panel.
- Design represents the tape as a DOM table.
- Current canvas includes columns visible in screenshot:
  - `SIZE`
  - `TIME`
  - `SIDE`
  - `AMOUNT`
  - `BUCKET`
  - `ASSET`
  - `CUSTOMER`
  - `RAIL`
  - `STATUS`
- Design table columns:
  - `TIME`
  - `SIDE`
  - `AMOUNT`
  - `BUCKET`
  - `CUSTOMER`
  - `RAIL`
  - `STATUS`
- Design removes the `SIZE` column.
- Design removes the `ASSET` column.
- Current tape side values are full words `credit` and `debit`.
- Design side values are abbreviated to `CR` and `DR`.
- Current tape has visual size bars in the `SIZE` column.
- Design has no amount-size bar; side color is conveyed through the row border, row tint, side abbreviation, and amount color.
- Current tape colors:
  - Credit rows use green row tint and green amount.
  - Debit rows use red row tint and red amount.
- Design preserves green/red row tint but lowers opacity and adds a 2px left border.
- Current row font appears 12px mono; design rows are 11px mono with 32px fixed height.
- Current table header labels include `SIZE` and `ASSET`; design does not.
- Current tape status uses plain colored text; design status colors are function-derived:
  - `posted` and `settled`: green.
  - `pending`, `held`, `accepted`: amber.
  - `failed`: red.
- Current `accepted` appears white in the screenshot; design makes `accepted` amber.
- Current `rail` text is bare mono lowercase; design wraps rail in a dark uppercase pill.
- Current `customer` is white-ish in table; design customer is muted `#4a5768`.
- Current `bucket` is white-ish; design bucket is secondary `#7a8899`.
- Current table header has 38px-ish height from canvas/table rendering; design header uses a 32px-ish row and fixed column widths.
- Current tape is a performance-oriented canvas; design table is presentational. Implementation must preserve canvas performance unless intentionally refactoring the renderer.

### Live Tape Header

- Current tape header text:
  - Left: `LIVE TAPE FEED`
  - Right: `PACKET LATENCY 1.9MS` and `BACKLOG 93`
- Design tape header:
  - Left: `LIVE TAPE FEED`
  - Right: `decoded 2,000/s · latency 1.9ms`
- Design removes backlog from the tape header because backlog is promoted to the route header.
- Design adds decoded rate to the tape header.
- Current header has a white vertical bar; design uses a cyan 2px left border on the whole header.
- Current right metadata is uppercase; design metadata is lowercase.

### Main Grid and Side Rail

- Current main grid columns: `minmax(0,3fr)_20rem`, side rail width 320px.
- Design main grid columns: `1fr 300px`, side rail width 300px.
- Current side rail background is `bg-bankops-sidebar`.
- Design side rail background is `#10151a`.
- Current side rail sections are `Panel`s with `title` prop and `p-4`.
- Design side rail sections are flat blocks with `16px` padding and `rgba(255,255,255,0.06)` borders.

### Stream Control

- Current section title is `Stream Control`.
- Design title is uppercase mono `STREAM CONTROL`.
- Current connection row:
  - Label `Connection`
  - Value `Open` in green.
- Design connection row:
  - Label `Connection`
  - Value `OPEN` with green dot.
- Current sequence value renders `seq 4933`.
- Design sequence value renders `seq 4,933` with thousands separator.
- Current stream rate buttons:
  - `1/s`
  - `50/s`
  - `2k/s`
  - `10k/s`
- Design stream rate buttons:
  - `50/s`
  - `2k/s`
  - `10k/s`
  - `50k/s`
- Design removes the `1/s` option.
- Design adds a `50k/s` option, which is not currently in `STREAM_RATES`.
- Current active `2k/s` button is white background with dark text.
- Design active `2k/s` button is dark `#151c22` with light text and subtle border.
- Current inactive buttons use filled dark panels.
- Design inactive buttons are transparent with subtle border.
- Implementation risk: adding `50k/s` requires changing shared contract `STREAM_RATES` and server simulator support, not just UI.

### Performance HUD

- Current side rail has a `Performance HUD` section with:
  - Stream pressure.
  - FPS.
  - Frame.
  - Backlog.
  - Lag.
  - Decoded.
  - New rows.
- Design removes the dedicated `Performance HUD` section.
- Design promotes only:
  - Pressure to header.
  - Backlog to header.
  - Frame cost to header.
  - Decoded rate to tape header.
- Design drops visible FPS, lag, and new rows.
- Implementation decision needed: whether to hide those diagnostics, move them behind an expandable diagnostics affordance, or preserve them because they are important for performance validation.

### Rail Health

- Current rail health cards are blocky cards with:
  - Rail name.
  - Rate and p95 on a separate line.
  - Status label right-aligned.
  - Left border only for degraded/incident; nominal left border transparent.
- Design rail health rows are more compact 36px rows.
- Design each rail row always has a colored left border, including nominal green.
- Current `Internal Ledger` label is full.
- Design shortens it to `Int. Ledger`.
- Current status casing is title case (`Incident`, `Degraded`, `Nominal`).
- Design status casing is uppercase (`INCIDENT`, `DEGRADED`, `NOMINAL`).
- Current rail metrics show `629/s · p95 5,656ms`.
- Design shows `ACH 629/s` on the left and status on the right; `p95` is present in source data but not visible in the preview row body.
- Design likely sacrifices p95 visibility for compactness. If p95 should remain visible, implementation needs a second-line micro label or tooltip.

### Bottom Sparkline Band

- Current app has four visible sparkline panels:
  - `Throughput`
  - `Movement p95`
  - `Exception rate`
  - `Exception queue`
- Design removes the sparkline band entirely.
- Design preserves some of those values elsewhere:
  - Throughput becomes top metric `Event Rate`.
  - Movement p95 is not shown.
  - Exception rate is not shown.
  - Exception queue becomes top metric `Exceptions`.
- Current sparkline panels include info tooltips.
- Design removes those tooltips and the trend lines.
- Implementation decision needed: whether sparklines are being intentionally cut or should be relocated.

### Flow Concentration Heatmap

- Current section title:
  - `LIVE FLOW CONCENTRATION`
  - Subtitle: `Rolling 5s amount/sec and movement rate by rail and balance-sheet bucket`
- Design title remains `LIVE FLOW CONCENTRATION`.
- Design subtitle changes to `Rolling 5s · amount/sec by rail × balance-sheet bucket`.
- Current section has an info tooltip next to title.
- Design removes the info tooltip.
- Current section has a legend row:
  - `Yellow border: 5%+ exceptions`
  - `Stronger tint means higher amount/sec in the rolling 5s window.`
- Design removes the visible legend.
- Current high signal summary label:
  - `HIGHEST AMOUNT/SEC`
  - `Wire / Settlement Cash`
  - `$1.2B/s · 100 movements/s`
- Design summary:
  - `Highest: Wire / Settlement Cash`
- Design removes dollar/sec and movements/sec from the high signal summary.
- Current heatmap column labels:
  - `Rail`
  - `Customer Deposits`
  - `Settlement Cash`
  - `Reserve Cash`
  - `Rail Clearing`
  - `Stablecoin Treasury`
  - `Fee Income`
  - `Exception Queue`
- Design column labels:
  - `Rail`
  - `Cust. Deposits`
  - `Settlement Cash`
  - `Reserve Cash`
  - `Rail Clearing`
  - `Stablecoin Tsy`
  - `Fee Income`
  - `Exception Q`
- Current rail labels are titleized:
  - `Ach`, `Wire`, `Instant`, `Card`, `Internal Ledger`, `Stablecoin`
- Design rail labels are uppercase/abbreviated:
  - `ACH`, `WIRE`, `INSTANT`, `CARD`, `LEDGER`, `STABLE`
- Current matrix column template uses `112px repeat(7, minmax(92px, 1fr))`.
- Design matrix uses `80px repeat(7, 1fr)`.
- Current heatmap cells have `min-h-[64px]`.
- Design heatmap cells have 36px height.
- Current heatmap cells show amount and rate, with exceptions label or `No flow`.
- Design heatmap cells show only amount.
- Current nonzero heatmap tint encodes side and intensity with green/red gradients.
- Design `cellHighlight` uses:
  - Zero values: dark muted text only.
  - Exception column nonzero: amber background/text.
  - Large values: `#151c22` background with primary text.
  - Other values: very subtle white background with muted text.
- Design no longer visibly encodes debit/credit side in heatmap cells.
- Current elevated exception cells have amber border and text like `100% exceptions`.
- Design exception column cells use amber treatment but no percentage text.
- Current heatmap is data-driven from `RailBucketHeatmapCell[]`.
- Design uses static bucket rows and simplified cell semantics. Implementation must preserve dynamic data and decide which data dimensions survive.

### Data Formatting Changes

- Current monetary formatter outputs examples like `$12.2B` and `$1.2B/s`.
- Design manually encodes plus/minus prefixes for credits/debits.
- Current sequence has no thousands separator; design uses one.
- Current rail names use `titleize`; design uses selective abbreviations.
- Current accepted/held/pending status colors differ from design.

## Audit Route

Current implementation files:

- `AuditRoute.tsx`
- `AuditFilterPanel.tsx`
- `AuditRenderTracePanel.tsx`
- `AuditTablePanel.tsx`
- `AuditTableCells.tsx`
- `AuditColumnLayoutMenu.tsx`

MagicPath target:

- `AtlasAuditRedesign.tsx`

### Route Title and Header

- Current page title is `Audit Entry History`.
- Design page title is `Bank Core Audit Log`.
- Current eyebrow is `BANK CORE AUDIT`.
- Design removes the eyebrow.
- Current title lives on the left with no right-side header metrics.
- Design adds right-aligned summary metrics in the header:
  - `Matched Rows` = `100,000`
  - `Cached` = `200 rows`
  - `Query Latency` = `10.0ms`
  - `Long-task p95` = `73.0ms`
- Current equivalents:
  - Matched rows exists as `cache.totalMatched` but is not displayed in the header.
  - Rows cached exists in render trace as `Rows cached`.
  - Query latency exists in render trace.
  - Long-task p95 exists in render trace.
- Design duplicates/promotes render trace metrics to the page header.
- Current header background is `bg-bankops-sidebar`; design uses `#10151a`.
- Current header padding is `px-6 py-5`; design uses `20px 24px`.

### Route Frame and Spacing

- Current route root uses `min-h-[calc(100vh-5.25rem)] rounded-md border border-white/[0.08] bg-bankops-bg`.
- Design wraps content in `padding: 20px` and a single panel with `backgroundColor: #0c0f12`, `border: rgba(255,255,255,0.06)`, `borderRadius: 4`, and hidden overflow.
- Current filter panel and table panel are separate `Panel`s with `m-4`.
- Design makes render trace, filter bar, and table feel like one continuous audit workstation inside one outer frame.

### Render Trace

- Current render trace is a horizontal flex section inside `AuditFilterPanel`.
- Current render trace height is `h-10`.
- Design render trace is an 8-column grid with height 56px.
- Current render trace begins with a standalone `Render trace` label taking horizontal space.
- Design removes the standalone `Render trace` label and treats every item as an equal grid cell.
- Current metrics:
  - `Visible range`
  - `Mounted rows`
  - `Query latency`
  - `Long-task p95`
  - `Rows cached`
  - `Windows`
  - `Loaded ranges`
- Design metrics:
  - `Visible Range`
  - `Mounted Rows`
  - `Query Latency`
  - `Long-task p95`
  - `Rows Cached`
  - `Windows`
  - `Loaded`
  - `Scroll`
- Design renames `Loaded ranges` to `Loaded`.
- Design adds `Scroll = virtual`.
- Current loaded range empty state is `-`.
- Design uses hardcoded `0–199` in loaded state.
- Current values are dynamic and can be `n/a`; design hardcodes loaded sample values.
- Current uses hyphen range `0-42`; design uses en dash `0–42`.
- Current trace labels use `#5a6272`; design uses `#4a5768`.
- Current trace values are `text-bankops-text`; design uses `#e8edf2`.

### Filters

- Current filter panel is a `Panel` with optional active filter bar, render trace, then controls.
- Design filter/query bar is a 44px dense toolbar directly below render trace.
- Current filter labels sit above native `select` controls:
  - `Time`
  - `Severity`
  - `Rail`
  - `Status`
- Design combines label and value inside a compact dropdown-shaped control:
  - `TIME All time`
  - `SEVERITY All`
  - `RAIL All`
  - `STATUS All`
- Current controls are actual `<select>` elements.
- Design controls are custom divs with `ChevronDown` icon.
- Current time dropdown includes options from `TIME_RANGES`, and loaded screenshot shows options only when select is open? The current visible select displays one value.
- Design visible filters do not show count options inline.
- Current severity/rail/status labels include facet counts in the dropdown options.
- Design visible toolbar hides counts until dropdown interaction.
- Current filter bar includes a spacer and `Columns` button on the right.
- Design right controls include:
  - `Sort: ts desc`
  - `Columns`
  - `Reset`
- Current sort is controlled by clicking sortable table headers, not by a toolbar sort control.
- Current `Reset` appears only in `ActiveFilterBar` when filters are active.
- Design always shows `Reset`, even in the all-filter state.
- Current column button uses lucide `Columns3` icon and text.
- Design `Columns` button is text-only.
- Current active filters render as a separate bar above filter controls.
- Design has no active filter chip bar in the shown state.
- Implementation needs a custom dropdown/menu treatment if matching design exactly; native selects will not match.

### Table Container

- Current table panel is a separate `Panel` with `m-4`.
- Design table section is nested inside the outer audit panel with `margin: 16px`, `border: rgba(255,255,255,0.10)`, and `borderRadius: 4`.
- Current table title bar height is `h-9`.
- Design table title bar height is 36px.
- Current table title bar:
  - White vertical pill.
  - Text `Audit Log`.
- Design table title bar:
  - Cyan 2px vertical rule.
  - Text `Audit Log`.
  - Right badges `sorted newest first` and `copy traceId enabled`.
- Current app has no visible `sorted newest first` badge.
- Current app has no visible `copy traceId enabled` badge, although trace IDs have a copy affordance in the loaded screenshot.
- Design explicitly communicates those affordances.

### Table Columns

- Current visible columns:
  - `Timestamp`
  - `Severity`
  - `Kind`
  - `Actor`
  - `Action`
  - `Subject`
  - `Customer`
  - `Rail`
  - `Status`
  - `Amount`
  - `Trace ID`
- Design columns:
  - `TS`
  - `SEVERITY`
  - `KIND`
  - `ACTOR`
  - `ACTION`
  - `CUSTOMER`
  - `RAIL`
  - `STATUS`
  - `AMOUNT`
- Design removes `Subject`.
- Design removes `Trace ID`.
- Design renames `Timestamp` to `TS`.
- Current headers include drag grips and sortable arrow controls.
- Design headers are plain text with no visible drag grip, resize handle, or sort arrow.
- Current table supports column reordering, resizing, visibility toggles, and sort toggles.
- Design does not show reordering/resizing affordances.
- Implementation must preserve behavior even if visual chrome is reduced, or explicitly decide to remove advanced column manipulation.

### Table Rows

- Current row rendering uses virtual absolutely positioned flex rows.
- Design table is a normal static `<table>`.
- Implementation must preserve virtualization.
- Current row height is `ROW_HEIGHT = 34`.
- Design row height is 32px.
- Current row text is `font-mono text-[11px]`.
- Design row text is 11px mono.
- Current alternating row backgrounds are `#0c0d0e` and `white/[0.015]`.
- Design rows use a consistent black base with hover `#151c22`.
- Current severity badges use existing `AuditColumnCellContent` styles.
- Design severity badges:
  - Critical: red text on red translucent background.
  - Warning: amber text on amber translucent background.
  - Notice: cyan text on cyan translucent background.
  - Info: muted text on muted translucent background.
- Design adds severity-based left row borders:
  - Critical: 2px red.
  - Warning: 2px amber at lower alpha.
  - Notice: 1px cyan at low alpha.
  - Info/default: 1px subtle white.
- Current screenshot does not show severity-colored left row borders.
- Current row action text is muted and can truncate.
- Design action text is brighter primary text and semi-bold.
- Current actor text is same row-muted color as other data.
- Design actor text is more subdued than kind/action.
- Current rail cell is a pill.
- Design rail cell remains a pill but uses `#151c22`, subtle border, and uppercase text.
- Current status color mapping:
  - Failed red.
  - Posted/settled green.
  - Pending yellow.
  - Accepted muted/neutral in screenshot.
- Design status mapping:
  - Failed red and semibold.
  - Pending amber.
  - Posted/settled green and semibold.
  - Others muted.
- Current amount is right aligned and white.
- Design amount is right aligned, semibold, and uses em dash muted for missing values.
- Current trace ID column includes copy controls.
- Design removes trace ID column but claims `copy traceId enabled` in table badge. Implementation needs an alternate copy target if trace ID column is hidden.
- Current subject column carries important entity detail. Design removes it, so action/customer/rail must carry enough context or subject must be accessible via row expansion/details.

### Errors and Empty States

- Current table panel includes backend unavailable and background load warning banners.
- Design does not include error banners.
- Current table has `No audit rows match these filters` empty state.
- Design does not include empty state.
- Implementation must preserve error and empty states and adapt styling.

### Column Menu

- Current column menu is a Radix dropdown with checkbox items, reset layout, and disabled last-visible behavior.
- Design only shows a compact `Columns` button.
- No menu contents are specified by MagicPath.
- Implementation should restyle the trigger and likely keep the existing dropdown content.

## Analyst Route

Current implementation files:

- `AnalystRoute.tsx`
- `AnalystWorkspaceShell.tsx`
- `AnalystControlRail.tsx`
- `AnalystRunStatus.tsx`
- `AnalystCanvas.tsx`

MagicPath target:

- `AtlasAnalystRedesign.tsx`

### Route Frame

- Current Analyst route is inside the global shell `main` padding and a bordered rounded route container.
- Design makes the Analyst workspace occupy the full screen below top nav with no outer card border around the whole route body.
- Current route root has `min-h-[calc(100vh-5.25rem)] rounded-md border border-white/[0.08] bg-bankops-bg`.
- Design root uses `display: flex`, `flexDirection: column`, full viewport height, and dark `#07090b` background.
- Current body grid minimum height is `min-h-[calc(100vh-15.25rem)]`.
- Design main body flexes to fill remaining height with `minHeight: 0` and hidden overflow.

### Header

- Current header shows:
  - Eyebrow `EXPERIMENTAL CODEMODE ANALYST`
  - Title `Analyst workspace`
  - Large informational callout explaining the Analyst and linking to Cloudflare Code Mode.
  - Right `Experimental` pill.
- Design header shows:
  - Title `Analyst Workspace`
  - Right `EXPERIMENTAL` badge.
- Design removes the eyebrow.
- Design removes the large informational callout entirely.
- Design removes the Cloudflare external link.
- Design title capitalization changes from `Analyst workspace` to `Analyst Workspace`.
- Current header uses `px-6 py-5`; design uses `14px 24px` and minimum height 80px.
- Current experimental pill is rounded-full and more prominent.
- Design experimental badge is a small squared mono badge with cyan border.

### Run Status Bar

- Current status bar is `border-b border-white/[0.08] bg-[#0d0f11] px-6 py-3`.
- Current `AnalystRunStatus` displays:
  - Label `Run status`.
  - Dynamic status copy, `Idle` when empty.
  - Optional generated duration.
  - Optional error line.
- Design status bar is 40px tall, `#10151a`, with:
  - `RUN STATUS`
  - separator rule
  - muted dot
  - `IDLE`
  - right-side `No active run`
- Current status value is title case `Idle`.
- Design uses uppercase `IDLE`.
- Current idle status has no dot.
- Design adds status dot.
- Current empty state has no right-side `No active run` copy.
- Implementation must preserve dynamic phase statuses (`Querying analyst tools`, `Validating report`, `Repairing report`, `Done`, `Error`) and map them into the new dot/status/right-copy layout.

### Control Rail Layout

- Current grid uses `xl:grid-cols-[336px_minmax(0,1fr)]`.
- Design grid uses `340px 1fr`.
- Current aside uses `p-5`, `bg-bankops-sidebar/80`, and responsive bottom border behavior.
- Design aside uses `backgroundColor: #10151a`, `borderRight: rgba(255,255,255,0.06)`, `padding: 20px`, and `overflowY: auto`.
- Current section label is `Create report` with a `Sparkles` icon.
- Design label is uppercase `CREATE REPORT` with no icon.
- Current rail description:
  - `Ask for the rail, exception, liquidity, or Customer view you want. The Analyst turns bounded audit evidence into a validated report.`
- Design rail description:
  - `Ask an operational question. The Analyst queries bounded audit data, writes sandboxed TypeScript, and renders a validated report.`
- Design copy is shorter and more implementation-specific.
- Current design uses `Customer` capitalized in the sentence; design uses no customer-specific mention in description.

### Prompt Input

- Current field label is `ASK`.
- Design field label is `QUESTION`.
- Current placeholder:
  - `Example: find the riskiest operating pattern in the current audit log...`
- Design placeholder:
  - `Describe what you want to analyze...`
- Current textarea min height is `min-h-28`.
- Design textarea min height is 120px.
- Current textarea container has `rounded-md`, `border-white/[0.08]`, `bg-black/25`.
- Design textarea container uses 4px radius, `rgba(255,255,255,0.10)` border, and `#0c0f12`.
- Current action bar grid is `grid-cols-[minmax(0,1fr)_2rem]`.
- Design action bar is flex between char count and action group.
- Current Generate button is full width in the left grid cell.
- Design Generate button is compact right-aligned, 32px tall, cyan filled, dark text.
- Current Generate button includes a `Play` icon or loading spinner.
- Design Generate button has no icon and does not model loading.
- Current reset/new analysis control is an icon-only rotate button beside Generate.
- Design includes a text `Reset` button next to Generate.
- Current reset button is disabled when empty/running and calls `onNewAnalysis`.
- Design reset button clears only local question state in MagicPath source.
- Current prompt lacks character count.
- Design adds `{question.length} chars` in the action bar.
- Current Generate button is disabled when question is empty or running.
- Design source does not disable Generate when empty.
- Implementation must preserve disabled/running behavior.

### Starter Prompts

- Current label is `STARTER PROMPTS`.
- Design label is `EXAMPLE PROMPTS`.
- Current chips:
  - `RAIL MIX`
  - `FAILURES`
  - `OPS QUEUE`
- Design chips:
  - `Rail mix by volume`
  - `ACH failure rate`
  - `Liquidity pressure`
  - `Wire settlement lag`
  - `High-risk customers`
  - `Exception queue depth`
- Current chips are uppercase, compact, rounded-full.
- Design chips are mono, sentence-ish labels, rectangular 3px radius, transparent background with subtle border.
- Current chip click uses existing prompt text from `ANALYST_PROMPT_CHIPS`.
- Design chip click sets the textarea to the label itself.
- Implementation should create real prompt strings for six new chips, not just set short labels.
- Design adds three new domains not directly visible in current chips:
  - Liquidity pressure.
  - Wire settlement lag.
  - High-risk customers.

### How It Works Disclosure

- Current empty canvas always displays the three steps `Describe`, `Generate`, `Review`.
- Design moves a `HOW IT WORKS` disclosure into the left rail.
- Design disclosure is collapsed by default.
- Design disclosure contents:
  - `1 Describe`: `Ask for patterns, risks, customers, rails, or exceptions.`
  - `2 Generate`: `Runs bounded CodeMode queries with observable progress.`
  - `3 Review`: `Validated reports render as charts, tables, and summaries.`
- Current right canvas cards:
  - `Describe`: `Ask for patterns, risks, customers, rails, exceptions, or a broad readout.`
  - `Generate`: `Runs bounded audit-log queries and streams observable progress.`
  - `Review`: `Validated reports render as charts, tables, summaries, and Customer lists.`
- Design removes the visible three-card explanation from the center canvas and replaces it with capability strips.
- Implementation will need new local state for expanding/collapsing `HOW IT WORKS`.

### Empty Canvas

- Current empty canvas:
  - Outer card: `rounded-md border border-white/[0.08] bg-bankops-panel p-6`.
  - Inner dashed box: `min-h-[472px]`, dashed border, black tint.
  - Icon: lucide `Braces`.
  - Title: `Ask for an operational analysis`.
  - Subtitle explaining plain-English request.
  - Three cards: Describe, Generate, Review with lucide icons.
- Design empty canvas:
  - No outer nested card; right section itself is `#0c0f12`.
  - Centered content max width 560px.
  - Icon is a custom bar-chart SVG inside a 48px cyan-tinted square.
  - Title: `Awaiting analysis request`.
  - Subtitle:
    - `Submit a question on the left to begin.`
    - `The Analyst runs bounded CodeMode queries and returns a validated AnalystReportSpec.`
  - Three capability strips below:
    - `Bounded data access`
    - `Sandboxed execution`
    - `Validated rendering`
- Design removes the dashed drop-zone-like inner border.
- Design removes visible route instructions from the header callout and puts operational explanation in the center/rail.
- Design title copy is more state-oriented and less imperative.
- Current empty state cards are bordered cards with icons.
- Design capability blocks are border-left cyan strips with no cards and no icons.

### Running, Report, and Error States

- Current `AnalystCanvas` has distinct running, report, error, and empty states.
- MagicPath design only represents idle/empty state.
- Current running/error state uses `AnalystRunTracePanel`.
- Current report state wraps `AnalystReportRenderer` in a bordered panel.
- Design does not specify running trace, generated report layout, validation errors, repair state, or failed run state.
- Implementation must adapt existing non-empty states into the new frame rather than replacing only the empty state.

### Interactivity Differences

- Current `AnalystControlRail` receives callbacks and state from `useAnalystRun`.
- MagicPath design owns `question`, `howItWorksOpen`, and `utcTime` local state.
- Current clock is global shell local time; design Analyst has local UTC timer in component source.
- Implementation should not duplicate clocks in multiple components; use shared clock/header strategy.
- Design Generate button lacks `onSubmit` integration.
- Design Reset button only clears question; current new-analysis behavior also resets report/error/timeline.
- Design prompt chips set short labels; current chips set full prompt templates.

## Shared Implementation Considerations

### Preserve Dynamic Data

- MagicPath designs hardcode all sample values.
- Current app values are live and dynamic:
  - Ops stream snapshot values.
  - Audit virtual windows, facets, query state, column layout.
  - Analyst run state, report state, and errors.
- Implementation must preserve current data flow and render the new visual layer over existing state.

### Preserve Performance Architecture

- Ops live tape currently uses worker + offscreen canvas.
- Audit table currently uses TanStack Virtual.
- MagicPath designs model both as static tables.
- Do not replace these with static DOM tables unless performance requirements are explicitly changed.
- Visual changes should wrap or restyle existing high-performance surfaces.

### Preserve Existing Accessibility and Controls

- Current app has keyboard/sort/drag/resize affordances in Audit table headers.
- Current app has tooltip explanations for dense Ops metrics and heatmap semantics.
- Current app has Radix dropdown menu behavior for column layout.
- Designs remove or hide many visible affordances.
- Implementation should preserve keyboard support and semantics even if visual chrome is simplified.

### Tokenization Needed

- Designs introduce a coherent but hardcoded palette.
- Recommended token additions or remaps:
  - `--color-bankops-bg`: `#07090b`
  - `--color-bankops-panel`: `#0c0f12`
  - `--color-bankops-sidebar`: `#10151a`
  - `--color-bankops-surface`: `#151c22`
  - `--color-bankops-text`: `#e8edf2`
  - `--color-bankops-muted`: `#7a8899`
  - new subtle token: `#4a5768`
  - new accent token: `#06b6d4`
  - semantic green/amber/red should map to `#22c55e`, `#f59e0b`, `#ef4444`
- Current global CSS already imports IBM Plex fonts; no new font family is needed.

### Components Likely To Change

- `AppShell.tsx`
  - Replace brand icon/text with BO/BankOps treatment.
  - Remove nav icons.
  - Add support for route-specific right header status, or keep current clock and implement status inside route headers.
  - Change active nav style.
- `design/components.tsx`
  - Update `NavLink`, `Button`, `Panel`, `PageHeader`, and possibly `InfoTooltip` styling.
  - Add compact mono badge/button primitives.
- `styles/app.css`
  - Update color tokens.
  - Add subtle/accent tokens.
- `OpsRoute.tsx`
  - Redesign route header and move selected metrics into header.
  - Adjust main grid from 320px side rail to 300px if desired.
- `OpsTopBand.tsx`
  - Remove icons/tooltips visually or restyle them.
  - Add signed credit/debit formatting.
  - Change `Open exceptions` to `Exceptions` and append `OPEN`.
- `OpsSideRail.tsx`
  - Compact stream control.
  - Reconsider stream rates.
  - Remove or relocate Performance HUD.
  - Compact rail health rows.
- `BalanceSheetTape.tsx` and `ops-tape-renderer.ts`
  - If matching design precisely, remove `SIZE` and `ASSET` from tape renderer, abbreviate side labels, add rail/status pills, and adjust row height/color.
  - If preserving canvas internals, renderer drawing code must be updated rather than replacing with DOM.
- `OpsBottomBand.tsx`
  - Remove, hide, or relocate sparklines.
- `RailBucketHeatmap.tsx`
  - Compress row height, abbreviate labels, remove legend/details, simplify cell content, or preserve details behind hover/tooltips.
- `AuditRoute.tsx`
  - Add header metrics.
  - Rename title.
- `AuditRenderTracePanel.tsx`
  - Convert flex trace to equal grid.
  - Add `Scroll` metric.
- `AuditFilterPanel.tsx`
  - Convert stacked label/select controls to compact toolbar controls.
  - Add sort control and always-visible reset if desired.
- `AuditTablePanel.tsx`
  - Restyle table shell, header bar, badges, row borders.
  - Preserve virtualization.
- `AuditTableCells.tsx`
  - Hide/reduce drag/sort/resize chrome while preserving behavior.
- `audit-columns.tsx`
  - Decide whether to remove `subject` and `traceId` from default visible layout.
  - If trace ID hidden, provide copy trace ID affordance elsewhere.
- `AuditColumnLayoutMenu.tsx`
  - Restyle trigger; likely keep menu behavior.
- `AnalystWorkspaceShell.tsx`
  - Remove header explanatory callout.
  - Update header/status/body layout.
- `AnalystRunStatus.tsx`
  - Add status dot and right-side summary text.
- `AnalystControlRail.tsx`
  - Rename labels, add char count, change buttons, expand prompt chips, add `HOW IT WORKS`.
- `AnalystCanvas.tsx`
  - Replace idle state with new centered capability design.
  - Preserve running/report/error states under the new visual frame.

## Open Product Decisions Before Implementation

- Should the global shell switch from `Back Office` to `BankOps` everywhere?
- Should the global clock switch from local time to UTC?
- Should route-specific statuses appear in the global nav, or inside route headers only?
- Should Ops remove the performance HUD entirely, or tuck FPS/lag/new rows into diagnostics?
- Should Ops support `50k/s` stream rate? This is a contract/server change, not only a UI change.
- Should Ops tape remove `SIZE` and `ASSET`, or should those remain for operator utility?
- Should Audit default visible columns remove `Subject` and `Trace ID`?
- If Audit hides `Trace ID`, where should copy-trace functionality live?
- Should Audit advanced column resize/reorder affordances remain visible?
- Should Analyst remove the Cloudflare Code Mode link from the UI entirely?
- Should Analyst prompt chips use the new six labels, and what exact prompt text should each insert?
- How should Analyst running/report/error states inherit the redesign, since MagicPath only covers idle state?
