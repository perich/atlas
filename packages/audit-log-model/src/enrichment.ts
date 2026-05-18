import { RAILS, type Rail } from "@bankops/contracts";

type CustomerProfile = {
  name: string;
  segment: "consumer" | "marketplace" | "payroll" | "fintech" | "treasury";
  region: "midwest" | "northeast" | "south" | "west";
  riskProfile: "low" | "standard" | "elevated" | "restricted";
  monthlyVolumeBand: "small" | "mid_market" | "enterprise";
  primaryRail: Rail;
  relationshipAgeDays: number;
};

type AccountProfile = {
  accountType: "operating" | "reserve" | "settlement" | "for_benefit_of";
  ledgerRegion: "us-east" | "us-west" | "eu-west";
};

export type OperationalPressure = {
  latencyMsDelta: number;
  errorRateBpsDelta: number;
  pendingDepth: number;
  unmatchedDelta: number;
  reserveDeltaMinor: bigint;
  riskReviewVolume: number;
  exceptionPressure: number;
  forceFailure: boolean;
};

export type EnrichedEntityContext = {
  customerId: string;
  accountId: string;
  customer: CustomerProfile;
  account: AccountProfile;
  pressure: OperationalPressure;
};

export function enrichedEntityContextFor({
  accountId,
  accountNumber,
  customerId,
  customerNumber,
  index,
  rail,
}: {
  accountId: string;
  accountNumber: number;
  customerId: string;
  customerNumber: number;
  index: number;
  rail: Rail;
}): EnrichedEntityContext {
  const customer = customerProfileFor(customerNumber);

  return {
    account: accountProfileFor(accountNumber),
    accountId,
    customer,
    customerId,
    pressure: operationalPressureFor(index, rail, customer),
  };
}

export function withAnalystContext(
  detail: Record<string, unknown>,
  context: EnrichedEntityContext,
) {
  return {
    ...detail,
    customer: {
      id: context.customerId,
      ...context.customer,
    },
    account: {
      id: context.accountId,
      ...context.account,
    },
  };
}

function customerProfileFor(customerNumber: number): CustomerProfile {
  const segments = ["consumer", "marketplace", "payroll", "fintech", "treasury"] as const;
  const regions = ["midwest", "northeast", "south", "west"] as const;
  const riskProfiles = ["low", "standard", "elevated", "restricted"] as const;
  const volumeBands = ["small", "mid_market", "enterprise"] as const;

  return {
    name: `${["Northstar", "Aster", "Civic", "Harbor", "Summit"][customerNumber % 5]} ${
      ["Payroll", "Marketplace", "Treasury", "Payments"][customerNumber % 4]
    }`,
    segment: segments[customerNumber % segments.length],
    region: regions[Math.floor(customerNumber / 3) % regions.length],
    riskProfile: riskProfiles[Math.floor(customerNumber / 5) % riskProfiles.length],
    monthlyVolumeBand: volumeBands[Math.floor(customerNumber / 7) % volumeBands.length],
    primaryRail: RAILS[Math.floor(customerNumber / 11) % RAILS.length],
    relationshipAgeDays: 45 + customerNumber * 17,
  };
}

function accountProfileFor(accountNumber: number): AccountProfile {
  const accountTypes = ["operating", "reserve", "settlement", "for_benefit_of"] as const;
  const ledgerRegions = ["us-east", "us-west", "eu-west"] as const;

  return {
    accountType: accountTypes[accountNumber % accountTypes.length],
    ledgerRegion: ledgerRegions[Math.floor(accountNumber / 4) % ledgerRegions.length],
  };
}

function operationalPressureFor(
  index: number,
  rail: Rail,
  customer: CustomerProfile,
): OperationalPressure {
  const achReturnWave =
    index >= 1_800 &&
    index < 4_800 &&
    rail === "ach" &&
    (customer.segment === "payroll" || customer.riskProfile === "elevated");
  const stablecoinFinalityLag = index >= 8_000 && index < 11_200;
  const wireCutoffCompression =
    index >= 17_000 &&
    index < 20_000 &&
    rail === "wire" &&
    customer.monthlyVolumeBand === "enterprise";
  const reconciliationBacklog =
    index >= 31_000 &&
    index < 34_500 &&
    (customer.segment === "marketplace" || customer.segment === "fintech");
  const reserveDrawdown =
    index >= 52_000 &&
    index < 55_000 &&
    (customer.primaryRail === rail || customer.riskProfile === "restricted");

  return {
    latencyMsDelta: (stablecoinFinalityLag ? 9_000 : 0) + (wireCutoffCompression ? 1_800 : 0),
    errorRateBpsDelta: achReturnWave ? 320 : stablecoinFinalityLag ? 80 : 0,
    pendingDepth:
      (wireCutoffCompression ? 190 : 0) +
      (stablecoinFinalityLag ? 90 : 0) +
      (achReturnWave ? 45 : 0),
    unmatchedDelta: reconciliationBacklog ? 38 : achReturnWave ? 9 : 0,
    reserveDeltaMinor: reserveDrawdown ? -42_000_000_00n : 0n,
    riskReviewVolume: achReturnWave ? 18 : reconciliationBacklog ? 9 : 0,
    exceptionPressure:
      (achReturnWave ? 32 : 0) +
      (stablecoinFinalityLag ? 14 : 0) +
      (wireCutoffCompression ? 18 : 0) +
      (reconciliationBacklog ? 22 : 0) +
      (reserveDrawdown ? 16 : 0),
    forceFailure: achReturnWave && index % 7 === 0,
  };
}
