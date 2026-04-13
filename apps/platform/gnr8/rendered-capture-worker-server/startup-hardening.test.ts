import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const platformRoot = path.resolve(__dirname, "../..");

function readJson<T>(absolutePath: string): T {
  return JSON.parse(readFileSync(absolutePath, "utf8")) as T;
}

test("worker start script runs compiled JS with node only", () => {
  const pkg = readJson<{
    scripts?: Record<string, string>;
  }>(path.resolve(platformRoot, "package.json"));

  const startScript = String(pkg.scripts?.["start:rendered-capture-worker"] ?? "");
  assert.ok(startScript.length > 0, "start:rendered-capture-worker script must exist");
  assert.match(startScript, /^node\s+dist-rendered-capture-worker\/gnr8\/rendered-capture-worker-server\/index\.js$/);
  assert.doesNotMatch(startScript, /\btsx\b/);
  assert.doesNotMatch(startScript, /\bpnpm exec\b/);
});

test("worker build config emits deterministic output path", () => {
  const tsconfig = readJson<{
    compilerOptions?: { outDir?: string; noEmit?: boolean };
    include?: string[];
  }>(path.resolve(__dirname, "tsconfig.build.json"));

  assert.equal(tsconfig.compilerOptions?.noEmit, false);
  assert.equal(tsconfig.compilerOptions?.outDir, "../../dist-rendered-capture-worker");
  assert.deepEqual(tsconfig.include, ["index.ts"]);
});

test("docker runtime command starts compiled worker with node", () => {
  const dockerfile = readFileSync(path.resolve(__dirname, "Dockerfile"), "utf8");
  assert.match(dockerfile, /CMD \["node", "apps\/platform\/dist-rendered-capture-worker\/gnr8\/rendered-capture-worker-server\/index\.js"\]/);
  assert.doesNotMatch(dockerfile, /\btsx\b/);
  assert.doesNotMatch(dockerfile, /\bpnpm exec\b/);
});
