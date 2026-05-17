import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { AppRouter, queryClient } from "./router";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
    </QueryClientProvider>
  );
}
