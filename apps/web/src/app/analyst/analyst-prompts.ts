export const ANALYST_PROMPT_CHIPS = [
  {
    label: "Rail mix",
    prompt: "Summarize entries by rail and status.",
  },
  {
    label: "Failures",
    prompt: "Show where failures, critical severity, and exception pressure are concentrated.",
  },
  {
    label: "Ops queue",
    prompt: "Which customers or rails should operations investigate first, and why?",
  },
];

export const DEFAULT_ANALYST_PROMPT = ANALYST_PROMPT_CHIPS[0]?.prompt ?? "";
