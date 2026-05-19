export const ANALYST_PROMPT_CHIPS = [
  {
    label: "Rail mix by volume",
    prompt: "Summarize entries by rail and status.",
  },
  {
    label: "ACH failure rate",
    prompt: "Analyze ACH failure rate, failure causes, and customer or status concentrations.",
  },
  {
    label: "Liquidity pressure",
    prompt:
      "Find liquidity pressure signals across reserve, settlement, and rail-clearing activity.",
  },
  {
    label: "Wire settlement lag",
    prompt: "Identify wire settlement lag, pending depth, and the highest-risk affected customers.",
  },
  {
    label: "High-risk customers",
    prompt: "Rank high-risk customers by failed, pending, critical, and exception-heavy activity.",
  },
  {
    label: "Exception queue depth",
    prompt: "Which customers or rails should operations investigate first, and why?",
  },
];
