const serverOnlyPackages = "packages/(analyst-model|audit-log-model|ops-tape-sim)/src";
const workspaces = [
  { name: "web", path: "apps/web/src" },
  { name: "server", path: "apps/server/src" },
  { name: "contracts", path: "packages/contracts/src" },
  { name: "analyst-model", path: "packages/analyst-model/src" },
  { name: "audit-log-model", path: "packages/audit-log-model/src" },
  { name: "ops-tape-sim", path: "packages/ops-tape-sim/src" },
];

module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: "web-must-not-import-server-only-packages",
      severity: "error",
      from: {
        path: "^apps/web/src",
      },
      to: {
        path: `^${serverOnlyPackages}`,
      },
    },
    {
      name: "web-must-not-import-server-app",
      severity: "error",
      from: {
        path: "^apps/web/src",
      },
      to: {
        path: "^apps/server/src",
      },
    },
    {
      name: "contracts-must-stay-shared",
      severity: "error",
      from: {
        path: "^packages/contracts/src",
      },
      to: {
        path: "^(apps|packages/(analyst-model|audit-log-model|ops-tape-sim))/",
      },
    },
    {
      name: "server-only-packages-must-not-import-web",
      severity: "error",
      from: {
        path: `^${serverOnlyPackages}`,
      },
      to: {
        path: "^apps/web/src",
      },
    },
    ...workspaces.map((workspace) => ({
      name: `${workspace.name}-must-not-use-relative-imports-to-other-workspaces`,
      severity: "error",
      from: {
        path: `^${workspace.path}`,
      },
      to: {
        dependencyTypes: ["local"],
        path: "^(apps|packages)/[^/]+/src",
        pathNot: `^${workspace.path}`,
      },
    })),
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    enhancedResolveOptions: {
      conditionNames: ["development", "import", "module", "default", "node"],
      extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"],
    },
    tsConfig: {
      fileName: "tsconfig.json",
    },
  },
};
