import "./styles/app.css";

type ReactScanRender = {
  componentName: string | null;
  count: number;
  time: number | null;
  unnecessary: boolean | null;
};

type ReactScanComponentSummary = {
  componentName: string;
  lastRenderAt: number;
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
const REACT_SCAN_SUMMARY_ELEMENT_ID = "bankops-react-scan-summary";
let scanSummaryFlushTimeout: number | undefined;

function readScanSummary() {
  return Array.from(scanSummary.values()).sort(
    (left, right) =>
      right.unnecessaryCount - left.unnecessaryCount ||
      right.renderCount - left.renderCount ||
      right.totalTime - left.totalTime,
  );
}

function ensureScanSummaryElement() {
  const existing = document.getElementById(REACT_SCAN_SUMMARY_ELEMENT_ID);

  if (existing) {
    return existing;
  }

  const element = document.createElement("script");
  element.hidden = true;
  element.id = REACT_SCAN_SUMMARY_ELEMENT_ID;
  element.type = "application/json";
  document.body.append(element);

  return element;
}

function flushScanSummary() {
  scanSummaryFlushTimeout = undefined;
  ensureScanSummaryElement().textContent = JSON.stringify(readScanSummary());
}

function scheduleScanSummaryFlush() {
  if (scanSummaryFlushTimeout !== undefined) {
    return;
  }

  scanSummaryFlushTimeout = window.setTimeout(flushScanSummary, 100);
}

function resetScanSummary() {
  scanSummary.clear();
  flushScanSummary();
}

function recordRender(render: ReactScanRender) {
  const componentName = render.componentName ?? "Unknown";
  const current = scanSummary.get(componentName) ?? {
    componentName,
    lastRenderAt: 0,
    renderCount: 0,
    totalTime: 0,
    unnecessaryCount: 0,
  };

  current.lastRenderAt = Date.now();
  current.renderCount += render.count;
  current.totalTime += render.time ?? 0;

  if (render.unnecessary) {
    current.unnecessaryCount += render.count;
  }

  scanSummary.set(componentName, current);
  scheduleScanSummaryFlush();
}

async function enableReactScan() {
  if (!import.meta.env.DEV || import.meta.env.VITE_REACT_SCAN !== "1") {
    return;
  }

  const { scan } = await import("react-scan");

  scan({
    enabled: true,
    showToolbar: false,
    log: false,
    animationSpeed: "off",
    onRender: (_fiber, renders: ReactScanRender[]) => {
      for (const render of renders) {
        recordRender(render);
      }
    },
  });
  flushScanSummary();

  window.bankopsReactScan = {
    summary: readScanSummary,
    reset: resetScanSummary,
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
