# Validated Analyst Report Specs

`/analyst` will let Code Mode write sandboxed TypeScript for analysis, but the UI boundary is a
complete validated `AnalystReportSpec` submitted through a single server-owned
`external_submit_report` binding. We will not accept generated React, reference-style procedural UI
mutation events, generated handlers, watchers, subscriptions, or post-render data sources in v1. This
keeps the model useful for querying and shaping BankOps data while leaving rendering, layout polish,
validation, and interactivity under application control.
