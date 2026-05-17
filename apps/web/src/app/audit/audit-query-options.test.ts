import { describe, expect, it } from "vitest";

import {
  AUDIT_QUERY_STALE_MS,
  auditFacetsOptions,
  auditQueryStateKey,
  auditWindowOptions,
} from "./audit-query-options";
import type { AuditQueryState } from "./audit-query-state";

const queryState = {
  filters: {
    rail: ["wire"],
    status: ["failed"],
  },
  sort: {
    dir: "asc",
    field: "status",
  },
} satisfies AuditQueryState;

describe("audit query options", () => {
  it("co-locates the Audit Entry window key and stale policy", () => {
    const options = auditWindowOptions(queryState, { direction: "after", cursor: "cursor-1" });

    expect(options.queryKey).toEqual([
      "audit-window",
      "?rail=wire&status=failed&sortField=status&sortDir=asc",
      { direction: "after", cursor: "cursor-1" },
    ]);
    expect(options.staleTime).toBe(AUDIT_QUERY_STALE_MS);
  });

  it("shares the same query-context key between windows and Facets", () => {
    expect(auditQueryStateKey(queryState)).toBe(
      "?rail=wire&status=failed&sortField=status&sortDir=asc",
    );
    expect(auditFacetsOptions(queryState).queryKey).toEqual([
      "audit-facets",
      "?rail=wire&status=failed&sortField=status&sortDir=asc",
    ]);
  });
});
