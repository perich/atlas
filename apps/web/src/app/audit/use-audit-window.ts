import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  readAuditQueryState,
  serializeAuditQueryState,
  writeAuditQueryState,
} from "./audit-query-state";
import type { AuditQueryState } from "./audit-query-state";
import { fetchAuditFacets, fetchAuditPage } from "./audit-api";
import {
  EMPTY_AUDIT_WINDOW_CACHE,
  mergeAuditWindow,
  nextAuditWindowRequest,
  type AuditVisibleRange,
  type AuditWindowCache,
} from "./audit-window";

type ExtraWindowCache = {
  queryKey: string;
  cache: AuditWindowCache;
};

export function useAuditWindow() {
  const queryClient = useQueryClient();
  const [queryState, setQueryStateValue] = useState(() => readAuditQueryState());
  const [extraCache, setExtraCache] = useState<ExtraWindowCache>();
  const queryKey = serializeAuditQueryState(queryState);

  const firstPageQuery = useQuery({
    queryKey: ["audit-window", queryKey, "initial"],
    queryFn: ({ signal }) =>
      fetchAuditPage({ request: { direction: "initial" }, signal, state: queryState }),
    retry: 1,
    staleTime: 30_000,
  });
  const facetsQuery = useQuery({
    queryKey: ["audit-facets", queryKey],
    queryFn: ({ signal }) => fetchAuditFacets({ signal, state: queryState }),
    retry: 1,
    staleTime: 30_000,
  });

  const initialCache = useMemo(() => {
    if (!firstPageQuery.data) {
      return EMPTY_AUDIT_WINDOW_CACHE;
    }

    return mergeAuditWindow(
      EMPTY_AUDIT_WINDOW_CACHE,
      { direction: "initial" },
      firstPageQuery.data,
    );
  }, [firstPageQuery.data]);
  const cache = extraCache?.queryKey === queryKey ? extraCache.cache : initialCache;
  const rows = useMemo(() => cache.windows.flatMap((window) => window.rows), [cache]);

  async function loadVisibleRange(visibleRange: AuditVisibleRange) {
    const request = nextAuditWindowRequest(cache, visibleRange);

    if (request === undefined) {
      return;
    }

    const page = await queryClient.fetchQuery({
      queryKey: ["audit-window", queryKey, request],
      queryFn: ({ signal }) => fetchAuditPage({ request, signal, state: queryState }),
      staleTime: 30_000,
    });

    setExtraCache({
      cache: mergeAuditWindow(cache, request, page),
      queryKey,
    });
  }

  function setQueryState(nextState: AuditQueryState) {
    writeAuditQueryState(nextState);
    setQueryStateValue(nextState);
    setExtraCache(undefined);
  }

  return {
    cache,
    facets: facetsQuery.data,
    isFetching: firstPageQuery.isFetching || facetsQuery.isFetching,
    queryState,
    rows,
    loadVisibleRange,
    setQueryState,
  };
}

export type { AuditQueryState, AuditVisibleRange };
