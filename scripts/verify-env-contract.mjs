import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const platformEnvKeys = new Set(["HOST", "NODE_ENV", "PORT"]);
const serverOnlyEnvKeys = new Set(["OPENROUTER_API_KEY", "ANALYST_MODEL"]);

const envExampleKeys = await readEnvExampleKeys();
const serverSourceFiles = await filesUnder(path.join(repoRoot, "apps/server/src"), ".ts");
const webProductionFiles = (
  await filesUnder(path.join(repoRoot, "apps/web/src"), [".ts", ".tsx"])
).filter((file) => !file.includes(`${path.sep}test${path.sep}`) && !file.endsWith(".test.tsx"));
const serverEnvKeys = new Set(
  (await Promise.all(serverSourceFiles.map(readEnvKeysFromProcessEnv))).flat(),
);
const appOwnedServerEnvKeys = [...serverEnvKeys]
  .map((key) => String(key))
  .filter((key) => !platformEnvKeys.has(key));
const webEnvKeys = new Set((await Promise.all(webProductionFiles.map(readEnvKeys))).flat());
const docsText = await readDocsText();
const failures = [];

for (const key of appOwnedServerEnvKeys) {
  if (!envExampleKeys.has(key)) {
    failures.push(`apps/server uses ${key}, but .env.example does not list it`);
  }

  if (!docsText.includes(key)) {
    failures.push(`${key} is not documented in README.md or docs/deployment.md`);
  }

  if (key.startsWith("VITE_")) {
    failures.push(`${key} is server-owned but uses the browser-exposed VITE_ prefix`);
  }
}

for (const rawKey of envExampleKeys) {
  const key = String(rawKey);

  if (!appOwnedServerEnvKeys.includes(key) && !webEnvKeys.has(key)) {
    failures.push(`.env.example lists ${key}, but no app-owned source reads it`);
  }
}

for (const key of serverOnlyEnvKeys) {
  if (webEnvKeys.has(key)) {
    failures.push(`browser code must not read server-only ${key}`);
  }
}

if (failures.length > 0) {
  console.error("Environment contract check failed:");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exitCode = 1;
}

async function readEnvExampleKeys() {
  const text = await readFile(path.join(repoRoot, ".env.example"), "utf8");
  const keys = new Set();

  for (const line of text.split("\n")) {
    const trimmed = line.trim();

    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    const [key] = trimmed.split("=");

    if (key !== undefined && key.length > 0) {
      keys.add(key);
    }
  }

  return keys;
}

async function readEnvKeys(file) {
  const text = await readFile(file, "utf8");

  return [
    ...envKeysFromPattern(text, /process\.env\.([A-Z][A-Z0-9_]*)/g),
    ...envKeysFromPattern(text, /process\.env\[['"]([A-Z][A-Z0-9_]*)['"]\]/g),
    ...envKeysFromPattern(text, /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g),
  ];
}

async function readEnvKeysFromProcessEnv(file) {
  const text = await readFile(file, "utf8");

  return [
    ...envKeysFromPattern(text, /process\.env\.([A-Z][A-Z0-9_]*)/g),
    ...envKeysFromPattern(text, /process\.env\[['"]([A-Z][A-Z0-9_]*)['"]\]/g),
  ];
}

function envKeysFromPattern(text, pattern) {
  const keys = [];
  let match;

  while ((match = pattern.exec(text)) !== null) {
    keys.push(match[1]);
  }

  return keys;
}

async function readDocsText() {
  const docs = await Promise.all([
    readFile(path.join(repoRoot, "README.md"), "utf8"),
    readFile(path.join(repoRoot, "docs/deployment.md"), "utf8"),
  ]);

  return docs.join("\n");
}

async function filesUnder(directory, extensions) {
  const allowedExtensions = Array.isArray(extensions) ? extensions : [extensions];
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return filesUnder(fullPath, allowedExtensions);
      }

      if (entry.isFile() && allowedExtensions.some((extension) => fullPath.endsWith(extension))) {
        return [fullPath];
      }

      return [];
    }),
  );

  return files.flat();
}
