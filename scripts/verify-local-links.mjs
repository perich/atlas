import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const markdownFiles = [
  ...(await rootMarkdownFiles()),
  ...(await markdownFilesUnder(path.join(repoRoot, "docs"))),
];
const missingLinks = (await Promise.all(markdownFiles.map(verifyMarkdownLinks))).flat();

if (missingLinks.length > 0) {
  console.error("Missing local Markdown links:");

  for (const link of missingLinks) {
    console.error(`- ${link}`);
  }

  process.exitCode = 1;
}

async function verifyMarkdownLinks(file) {
  const markdown = await readFile(file, "utf8");
  const linkPattern = /!?\[[^\]]*]\(([^)]+)\)/g;
  const links = [];
  let match;

  while ((match = linkPattern.exec(markdown)) !== null) {
    const target = normalizeMarkdownTarget(match[1]);

    if (target === undefined) {
      continue;
    }

    links.push({ rawTarget: match[1], target });
  }

  const results = await Promise.all(
    links.map(async ({ rawTarget, target }) => {
      const resolved = path.resolve(path.dirname(file), target);

      try {
        await access(resolved);
        return undefined;
      } catch {
        return `${path.relative(repoRoot, file)} -> ${rawTarget}`;
      }
    }),
  );

  return results.filter((result) => result !== undefined);
}

async function rootMarkdownFiles() {
  const entries = await readdir(repoRoot, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(repoRoot, entry.name));
}

async function markdownFilesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return markdownFilesUnder(fullPath);
      }

      if (entry.isFile() && entry.name.endsWith(".md")) {
        return [fullPath];
      }

      return [];
    }),
  );

  return files.flat();
}

function normalizeMarkdownTarget(rawTarget) {
  const target = rawTarget.trim().replace(/^<|>$/g, "");

  if (
    target.length === 0 ||
    target.startsWith("#") ||
    target.startsWith("http://") ||
    target.startsWith("https://") ||
    target.startsWith("mailto:") ||
    target.includes("://")
  ) {
    return undefined;
  }

  const [pathPart] = target.split("#");

  return decodeURIComponent(pathPart);
}
