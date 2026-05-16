import "./styles/app.css";

type ReactScanRender = {
  componentName: string | null;
  count: number;
  time: number | null;
  unnecessary: boolean | null;
};

type ReactScanComponentSummary = {
  componentName: string;
  renderCount: number;
  totalTime: number;
  unnecessaryCount: number;
};

declare global {
  interface Window {
    bankopsReactScan?: {
      summary: () => ReactScanComponentSummary[];
      reset: () => void;
    };
  }
}

const scanSummary = new Map<string, ReactScanComponentSummary>();

function recordRender(render: ReactScanRender) {
  const componentName = render.componentName ?? "Unknown";
  const current = scanSummary.get(componentName) ?? {
    componentName,
    renderCount: 0,
    totalTime: 0,
    unnecessaryCount: 0,
  };

  current.renderCount += render.count;
  current.totalTime += render.time ?? 0;

  if (render.unnecessary) {
    current.unnecessaryCount += render.count;
  }

  scanSummary.set(componentName, current);
}

async function enableReactScan() {
  if (!import.meta.env.DEV || import.meta.env.VITE_REACT_SCAN !== "1") {
    return;
  }

  const { scan } = await import("react-scan");

  scan({
    enabled: true,
    showToolbar: true,
    showFPS: true,
    log: true,
    animationSpeed: "slow",
    onRender: (_fiber, renders: ReactScanRender[]) => {
      for (const render of renders) {
        recordRender(render);
      }
    },
  });

  window.bankopsReactScan = {
    summary: () =>
      [...scanSummary.values()].sort(
        (left, right) =>
          right.unnecessaryCount - left.unnecessaryCount ||
          right.renderCount - left.renderCount ||
          right.totalTime - left.totalTime,
      ),
    reset: () => scanSummary.clear(),
  };
}

await enableReactScan();

const [{ StrictMode, createElement }, { createRoot }, { App }] = await Promise.all([
  import("react"),
  import("react-dom/client"),
  import("./app/App"),
]);

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(createElement(StrictMode, null, createElement(App)));
