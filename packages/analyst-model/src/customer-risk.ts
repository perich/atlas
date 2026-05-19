import type { AuditEntry } from "@bankops/contracts";

import { filteredEntries } from "./filters.js";
import { capped, DEFAULT_ROLLUP_LIMIT } from "./limits.js";
import { detailNumber, detailRecord, stringField } from "./shared.js";
import type { AnalystFilters } from "./types.js";

export function getCustomerRiskRollup(
  entries: readonly AuditEntry[],
  {
    filters = {},
    limit = DEFAULT_ROLLUP_LIMIT,
  }: {
    filters?: AnalystFilters;
    limit?: number;
  } = {},
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
    const customer = detailRecord(entry, "customer");
    const current = grouped.get(customerId) ?? {
      amountMinor: 0n,
      customerId,
      entries: 0,
      exceptionPressure: 0,
      failedCount: 0,
      name: stringField(customer, "name") ?? customerId,
      riskProfile: stringField(customer, "riskProfile") ?? "unknown",
      riskReviewVolume: 0,
      segment: stringField(customer, "segment") ?? "unknown",
    };

    current.entries += 1;
    current.failedCount += entry.status === "failed" ? 1 : 0;
    current.amountMinor += entry.amountMinor ?? 0n;
    current.exceptionPressure += detailNumber(entry, "exceptionPressure");
    current.riskReviewVolume += detailNumber(entry, "reviewQueueDepth");
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
