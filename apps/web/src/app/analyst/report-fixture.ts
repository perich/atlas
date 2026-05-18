import {
  ANALYST_REPORT_VERSION,
  analystReportSpecSchema,
  type AnalystReportSpec,
} from "@bankops/contracts";

export const analystReportFixture = analystReportSpecSchema.parse({
  version: ANALYST_REPORT_VERSION,
  title: "ACH return wave containment",
  subtitle:
    "Returns are elevated in payroll-originated ACH, but liquidity and rail health remain stable.",
  generatedAt: "2026-05-18T16:15:00.000Z",
  question: "Find the riskiest operating pattern in today's audit log.",
  summary:
    "ACH return activity is concentrated in a narrow originator cohort. The largest customer exposure is visible before settlement cutoffs, so operations can prioritize outreach without slowing unaffected rails.",
  blocks: [
    {
      type: "metricGrid",
      title: "Current posture",
      metrics: [
        { label: "Return rate", value: "3.8%", delta: "+90 bps", tone: "warning" },
        { label: "Flagged volume", value: "$12.4M", delta: "+18%", tone: "warning" },
        { label: "Impacted customers", value: 42, tone: "neutral" },
        { label: "Wire health", value: "99.7%", delta: "stable", tone: "good" },
      ],
    },
    {
      type: "grid",
      columns: 2,
      blocks: [
        {
          type: "lineChart",
          title: "Return pressure by hour",
          xKey: "hour",
          series: [{ key: "returnRate", label: "Return rate" }],
          data: [
            { hour: "08:00", returnRate: 1.8 },
            { hour: "09:00", returnRate: 2.4 },
            { hour: "10:00", returnRate: 3.8 },
            { hour: "11:00", returnRate: 3.5 },
            { hour: "12:00", returnRate: 2.9 },
          ],
        },
        {
          type: "railMatrix",
          title: "Rail watchlist",
          rails: ["ACH", "Wire", "RTP", "Card"],
          metrics: ["Exceptions", "Lag", "Liquidity"],
          cells: [
            { rail: "ACH", metric: "Exceptions", value: "High", tone: "warning" },
            { rail: "ACH", metric: "Lag", value: "Moderate", tone: "warning" },
            { rail: "ACH", metric: "Liquidity", value: "Stable", tone: "good" },
            { rail: "Wire", metric: "Exceptions", value: "Low", tone: "good" },
            { rail: "Wire", metric: "Lag", value: "Low", tone: "good" },
            { rail: "Wire", metric: "Liquidity", value: "Stable", tone: "good" },
          ],
        },
      ],
    },
    {
      type: "section",
      title: "Investigation queue",
      description: "Largest originators contributing to the return cluster.",
      blocks: [
        {
          type: "dataTable",
          title: "Originator exposure",
          columns: [
            { key: "customer", label: "Customer" },
            { key: "returns", label: "Returns", align: "right" },
            { key: "exposure", label: "Exposure", align: "right" },
            { key: "status", label: "Status" },
          ],
          rows: [
            {
              customer: "Northstar Payroll",
              returns: 18,
              exposure: "$4.8M",
              status: "Outreach queued",
            },
            {
              customer: "Aster Marketplace",
              returns: 11,
              exposure: "$2.9M",
              status: "Reviewing files",
            },
            {
              customer: "Civic Benefits Co.",
              returns: 8,
              exposure: "$1.7M",
              status: "Within limits",
            },
          ],
        },
      ],
    },
    {
      type: "timeline",
      title: "Observed sequence",
      events: [
        {
          ts: 1_779_122_100_000,
          title: "ACH returns crossed watch threshold",
          detail: "Return activity moved above the recent baseline in two payroll batches.",
          tone: "warning",
        },
        {
          ts: 1_779_125_400_000,
          title: "Liquidity buffer remained stable",
          detail: "Intraday balances stayed above operating floor while exceptions accumulated.",
          tone: "success",
        },
      ],
    },
    {
      type: "callout",
      title: "Recommended focus",
      body: "Prioritize the three listed originators and keep unaffected rails moving through normal cutoff handling.",
      tone: "info",
    },
  ],
  warnings: ["Fixture only: production reports must come from the OpenRouter CodeMode endpoint."],
} satisfies AnalystReportSpec);
