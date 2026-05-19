import type { AuditEntry } from "@bankops/contracts";

import { filteredEntries } from "./filters.js";
import { capped } from "./limits.js";
import { optionalDetailNumber, optionalDetailRecord, optionalStringField } from "./shared.js";
import type { AnalystFilters } from "./types.js";

type CustomerRiskRollupOptions = {
  filters: AnalystFilters;
  limit: number;
};

export function getCustomerRiskRollup(
  entries: readonly AuditEntry[],
  { filters, limit }: CustomerRiskRollupOptions,
) {
  const grouped = new Map<
    string,
    {
      customerId: string;
      name: string;
      segment: string;
      riskProfile: string;
      entries: number;
      failedCount: number;
      amountMinor: bigint;
      exceptionPressure: number;
      riskReviewVolume: number;
    }
  >();

  for (const entry of filteredEntries(entries, filters)) {
    const customerId = entry.customerId ?? "unknown";
    const customer = optionalDetailRecord(entry, "customer");
    const current = grouped.get(customerId) ?? {
      amountMinor: 0n,
      customerId,
      entries: 0,
      exceptionPressure: 0,
      failedCount: 0,
      name: optionalStringField(customer, "name") ?? customerId,
      riskProfile: optionalStringField(customer, "riskProfile") ?? "unknown",
      riskReviewVolume: 0,
      segment: optionalStringField(customer, "segment") ?? "unknown",
    };

    current.entries += 1;
    current.failedCount += entry.status === "failed" ? 1 : 0;
    current.amountMinor += entry.amountMinor ?? 0n;
    current.exceptionPressure += optionalDetailNumber(entry, "exceptionPressure") ?? 0;
    current.riskReviewVolume += optionalDetailNumber(entry, "reviewQueueDepth") ?? 0;
    grouped.set(customerId, current);
  }

  return capped(
    [...grouped.values()]
      .sort((left, right) => right.exceptionPressure - left.exceptionPressure)
      .map((customer) => {
        const riskScore =
          customer.exceptionPressure + customer.failedCount * 10 + customer.riskReviewVolume;

        return {
          ...customer,
          amountMinor: customer.amountMinor.toString(),
          risk: riskScore,
          riskScore,
        };
      }),
    limit,
  );
}
