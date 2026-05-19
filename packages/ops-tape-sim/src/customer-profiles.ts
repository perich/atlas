export type CustomerIndustry =
  | "ai"
  | "defense"
  | "robotics"
  | "hardware"
  | "crypto"
  | "fintech"
  | "venture";

export const INDUSTRIES: readonly CustomerIndustry[] = [
  "ai",
  "defense",
  "robotics",
  "hardware",
  "crypto",
  "fintech",
  "venture",
];

export const CUSTOMER_NAMES = [
  "Northstar AI",
  "Vector Defense",
  "Orbital Systems",
  "Acme Robotics",
  "Helios Hardware",
  "Keystone Crypto",
  "Riverbank Fintech",
  "Foundry Ventures",
  "Apex Autonomy",
  "Sentry Dynamics",
  "Atlas Compute",
  "Forge Labs",
  "Cobalt Robotics",
  "Nova Devices",
  "Meridian Capital",
  "Frontier Payments",
] as const;

export const ACCOUNT_LABELS = [
  "operating",
  "payroll",
  "stablecoin",
  "reserve",
  "settlement",
] as const;
