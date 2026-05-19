import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = path.join(repoRoot, "apps/web/dist/assets");
const budgets = {
  totalJsGzip: kib(425),
  largestJsGzip: kib(175),
  totalCssGzip: kib(16),
  workerJsGzip: kib(40),
};

const assets = await readAssets();
const jsAssets = assets.filter((asset) => asset.file.endsWith(".js"));
const cssAssets = assets.filter((asset) => asset.file.endsWith(".css"));
const workerAssets = jsAssets.filter((asset) => asset.file.includes(".worker-"));
const totalJsGzip = sum(jsAssets.map((asset) => asset.gzipBytes));
const totalCssGzip = sum(cssAssets.map((asset) => asset.gzipBytes));
const largestJs = largest(jsAssets);
const largestWorker = largest(workerAssets);
const failures = [];

checkBudget("total JS gzip", totalJsGzip, budgets.totalJsGzip);
checkBudget("largest JS gzip", largestJs?.gzipBytes ?? 0, budgets.largestJsGzip, largestJs?.file);
checkBudget("total CSS gzip", totalCssGzip, budgets.totalCssGzip);
checkBudget(
  "worker JS gzip",
  largestWorker?.gzipBytes ?? 0,
  budgets.workerJsGzip,
  largestWorker?.file,
);

console.log(
  [
    `Web bundle budget: ${formatBytes(totalJsGzip)} total JS gzip`,
    `${formatBytes(largestJs?.gzipBytes ?? 0)} largest JS gzip (${largestJs?.file ?? "none"})`,
    `${formatBytes(totalCssGzip)} total CSS gzip`,
    `${formatBytes(largestWorker?.gzipBytes ?? 0)} worker JS gzip (${largestWorker?.file ?? "none"})`,
  ].join("; "),
);

if (failures.length > 0) {
  console.error("Web bundle budget failed:");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exitCode = 1;
}

async function readAssets() {
  const entries = await readdir(assetsDir, { withFileTypes: true });
  const fileNames = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);

  return Promise.all(
    fileNames.map(async (file) => {
      const bytes = await readFile(path.join(assetsDir, file));

      return {
        file,
        bytes: bytes.length,
        gzipBytes: gzipSync(bytes).length,
      };
    }),
  );
}

function checkBudget(label, actual, budget, file) {
  if (actual <= budget) {
    return;
  }

  failures.push(
    `${label}${file === undefined ? "" : ` (${file})`} is ${formatBytes(actual)}, above ${formatBytes(budget)}`,
  );
}

function largest(assetList) {
  return assetList.reduce(
    (largestAsset, asset) =>
      largestAsset === undefined || asset.gzipBytes > largestAsset.gzipBytes ? asset : largestAsset,
    undefined,
  );
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function kib(value) {
  return value * 1024;
}

function formatBytes(value) {
  return `${(value / 1024).toFixed(1)} KiB`;
}
