import { useCallback, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AuditQueryState } from "./audit-query-state";
import { auditFacetsOptions, auditQueryStateKey, auditWindowOptions } from "./audit-query-options";
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

type BackgroundWindowError = {
  queryKey: string;
  error: Error;
};

export function useAuditWindow(queryState: AuditQueryState) {
  const queryClient = useQueryClient();
  const queryKey = auditQueryStateKey(queryState);
  const requestIdRef = useRef(0);
  const [extraCache, setExtraCache] = useState<ExtraWindowCache>();
  const [backgroundWindowError, setBackgroundWindowError] = useState<BackgroundWindowError>();

  const firstPageQuery = useQuery({
    ...auditWindowOptions(queryState, { direction: "initial" }),
    placeholderData: keepPreviousData,
    retry: 1,
  });
  const facetsQuery = useQuery({ ...auditFacetsOptions(queryState), retry: 1 });
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
  const backgroundError =
    backgroundWindowError?.queryKey === queryKey ? backgroundWindowError.error : undefined;
  const cachedRowCount = useMemo(
    () => cache.windows.reduce((count, window) => count + window.rows.length, 0),
    [cache.windows],
  );

  const loadVisibleRange = useCallback(
    (visibleRange: AuditVisibleRange) => {
      const request = nextAuditWindowRequest(cache, visibleRange);

      if (request === undefined) {
        return;
      }

      const requestId = (requestIdRef.current += 1);
      setBackgroundWindowError(undefined);
      void queryClient.fetchQuery(auditWindowOptions(queryState, request)).then(
        (page) => {
          if (requestId !== requestIdRef.current) {
            return;
          }

          setExtraCache({
            cache: mergeAuditWindow(cache, request, page),
            queryKey,
          });
        },
        (error: unknown) => {
          if (requestId !== requestIdRef.current) {
            return;
          }

          setBackgroundWindowError({
            error: error instanceof Error ? error : new Error("Failed to load audit rows"),
            queryKey,
          });
        },
      );
    },
    [cache, queryClient, queryKey, queryState],
  );

  const resetWindowCache = useCallback(() => {
    requestIdRef.current += 1;
    setExtraCache(undefined);
    setBackgroundWindowError(undefined);
  }, []);

  return {
    backgroundError,
    cache,
    facets: facetsQuery.data,
    hasError: firstPageQuery.isError,
    isFetching: firstPageQuery.isFetching,
    cachedRowCount,
    loadVisibleRange,
    resetWindowCache,
  };
}

export type { AuditQueryState, AuditVisibleRange };
