import React from "react";
import { createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";

import { validateAuditSearch } from "./audit/audit-query-state";
import { AppShell } from "./AppShell";
import { AnalystRoute } from "./routes/AnalystRoute";
import { AuditRoute } from "./routes/AuditRoute";
import { OpsRoute } from "./routes/OpsRoute";

const rootRoute = createRootRoute({
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
