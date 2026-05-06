import { promises as fs } from "node:fs";
import path from "node:path";

const ROUTE_ROOT = path.resolve("apps/platform/app");
const ALLOWED_EXPORTS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "runtime",
  "dynamic",
  "dynamicParams",
  "revalidate",
  "fetchCache",
  "preferredRegion",
  "maxDuration",
  "generateStaticParams",
]);

async function collectRouteFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectRouteFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name === "route.ts") {
      files.push(fullPath);
    }
  }
  return files;
}

function normalizeSpecifier(raw) {
  return raw.replace(/\s+as\s+.+$/u, "").trim();
}

function collectExportNames(sourceText) {
  const names = [];
  const namedDeclarationPattern = /export\s+(?:async\s+)?(?:function|const|let|var|class|interface|type)\s+([A-Za-z_$][\w$]*)/gu;
  for (const match of sourceText.matchAll(namedDeclarationPattern)) {
    names.push(match[1]);
  }

  const namedListPattern = /export\s*\{([^}]+)\}/gu;
  for (const match of sourceText.matchAll(namedListPattern)) {
    const specifiers = match[1].split(",");
    for (const specifier of specifiers) {
      const normalized = normalizeSpecifier(specifier);
      if (!normalized) continue;
      names.push(normalized);
    }
  }

  return names;
}

async function main() {
  const routeFiles = await collectRouteFiles(ROUTE_ROOT);
  const violations = [];

  for (const routeFile of routeFiles) {
    const sourceText = await fs.readFile(routeFile, "utf8");
    const exportNames = collectExportNames(sourceText);
    for (const exportName of exportNames) {
      if (!ALLOWED_EXPORTS.has(exportName)) {
        violations.push({
          file: path.relative(process.cwd(), routeFile),
          exportName,
        });
      }
    }
  }

  if (violations.length > 0) {
    console.error("Invalid export(s) found in Next.js route files:");
    for (const violation of violations) {
      console.error(`- ${violation.file}: export "${violation.exportName}" is not allowed`);
    }
    process.exit(1);
  }

  console.log(`check-next-route-exports: OK (${routeFiles.length} route.ts files scanned)`);
}

await main();
