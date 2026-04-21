import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const PLATFORM_ROOT = path.resolve(process.cwd(), "apps/platform");
const SOURCE_ROOTS = ["app", "gnr8", "src"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const THIS_TEST_ABS = path.resolve(process.cwd(), "apps/platform/gnr8/platform-does-not-import-worker.test.ts");
const ILLEGAL_IMPORT_PATTERN =
  /(?:from\s*["']([^"']+)["'])|(?:require\(\s*["']([^"']+)["']\s*\))/g;

function walkFiles(rootAbs: string): string[] {
  if (!fs.existsSync(rootAbs)) return [];
  const result: string[] = [];
  const entries = fs.readdirSync(rootAbs, { withFileTypes: true });
  for (const entry of entries) {
    const entryAbs = path.join(rootAbs, entry.name);
    if (entry.isDirectory()) {
      result.push(...walkFiles(entryAbs));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;
    result.push(entryAbs);
  }
  return result;
}

function isWorkerBoundaryImport(specifier: string): boolean {
  return (
    specifier.includes("apps/worker") ||
    specifier.includes("../worker") ||
    specifier.includes("../../worker")
  );
}

test("platform does not import worker application code", () => {
  const files = SOURCE_ROOTS.flatMap((dir) => walkFiles(path.resolve(PLATFORM_ROOT, dir)));
  const violations: string[] = [];

  for (const fileAbs of files) {
    if (fileAbs === THIS_TEST_ABS) continue;
    const source = fs.readFileSync(fileAbs, "utf8");
    ILLEGAL_IMPORT_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null = ILLEGAL_IMPORT_PATTERN.exec(source);
    while (match) {
      const specifier = String(match[1] ?? match[2] ?? "");
      if (isWorkerBoundaryImport(specifier)) {
        const relativePath = path.relative(PLATFORM_ROOT, fileAbs);
        violations.push(`${relativePath}: ${specifier}`);
      }
      match = ILLEGAL_IMPORT_PATTERN.exec(source);
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Platform must not import Worker code. Violations:\n${violations.join("\n")}`,
  );
});
