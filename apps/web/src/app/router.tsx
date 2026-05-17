import React from "react";
import { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";

import { auditFacetsOptions, auditWindowOptions } from "./audit/audit-query-options";
import { auditSearchToQueryState, validateAuditSearch } from "./audit/audit-query-state";
import { AppShell } from "./AppShell";
import { AnalystRoute } from "./routes/AnalystRoute";
import { AuditRoute } from "./routes/AuditRoute";
import { OpsRoute } from "./routes/OpsRoute";

export const queryClient = new QueryClient();

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: AppShell,
});

const indexRoute = createRoute({
  component: OpsRoute,
  getParentRoute: () => rootRoute,
  path: "/",
});

const opsRoute = createRoute({
  component: OpsRoute,
  getParentRoute: () => rootRoute,
  path: "/ops",
});

const auditRoute = createRoute({
  component: AuditRoute,
  getParentRoute: () => rootRoute,
  loaderDeps: ({ search }) => auditSearchToQueryState(search),
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(auditWindowOptions(deps, { direction: "initial" }));
    void context.queryClient.prefetchQuery(auditFacetsOptions(deps));
  },
  path: "/audit",
  validateSearch: validateAuditSearch,
});

const analystRoute = createRoute({
  component: AnalystRoute,
  getParentRoute: () => rootRoute,
  path: "/analyst",
});

const routeTree = rootRoute.addChildren([indexRoute, opsRoute, auditRoute, analystRoute]);

const router = createRouter({
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  context: {
    queryClient,
  },
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
