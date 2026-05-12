import React from "react";
import { createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";

import { AppShell } from "./AppShell";
import { AboutRoute } from "./routes/AboutRoute";
import { HomeRoute } from "./routes/HomeRoute";

const rootRoute = createRootRoute({
  component: AppShell,
});

const indexRoute = createRoute({
  component: HomeRoute,
  getParentRoute: () => rootRoute,
  path: "/",
});

const aboutRoute = createRoute({
  component: AboutRoute,
  getParentRoute: () => rootRoute,
  path: "/about",
});

const routeTree = rootRoute.addChildren([indexRoute, aboutRoute]);

export const router = createRouter({
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
