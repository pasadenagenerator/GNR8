import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ValidationFixtureId } from "../validation-contract";

export type FirstRealSiteFixtureSpec = {
  fixtureId: ValidationFixtureId;
  kind: "static_marketing_site_v1";
  entryHtmlPath: string;
  assetsDirPath: string | null;
};

export function firstRealSiteFixtureDirAbs(): string {
  /**
   * Runtime-safe fixture resolution strategy (works locally + on Vercel):
   *
   * - Prefer resolving from `process.cwd()` (app root in dev, and bundle root in standalone runtime).
   * - Fall back to monorepo-root relative path (common for running tests from repo root).
   * - Fall back to module-relative path for local authoring, but do not depend on it in production,
   *   since Next server bundling can relocate this module into chunk files.
   *
   * IMPORTANT: `apps/platform/next.config.mjs` includes the fixture directory via
   * `outputFileTracingIncludes` so it is copied into the deployed runtime bundle.
   */
  const candidates = [
    path.resolve(process.cwd(), "gnr8/validation/fixtures/real-site-01"),
    path.resolve(process.cwd(), "apps/platform/gnr8/validation/fixtures/real-site-01"),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/real-site-01"),
  ];

  for (const dir of candidates) {
    try {
      if (fs.existsSync(path.resolve(dir, "fixture.json"))) return dir;
    } catch {
      // ignore and continue
    }
  }

  // Last-resort: keep deterministic error messaging downstream.
  return candidates[0]!;
}

export function readFirstRealSiteFixtureSpec(): FirstRealSiteFixtureSpec {
  const root = firstRealSiteFixtureDirAbs();
  const jsonPath = path.resolve(root, "fixture.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(
      [
        "validation_fixture_not_found: real-site-01",
        `expected fixture.json at: ${jsonPath}`,
        "ensure the fixture directory is present in the runtime bundle (see apps/platform/next.config.mjs outputFileTracingIncludes).",
      ].join("\n"),
    );
  }
  const raw = fs.readFileSync(jsonPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!parsed || typeof parsed !== "object") {
    throw new Error("fixture.json must contain an object");
  }

  const fixtureId = (parsed as { fixtureId?: unknown }).fixtureId;
  const kind = (parsed as { kind?: unknown }).kind;
  const entryHtmlPath = (parsed as { entryHtmlPath?: unknown }).entryHtmlPath;
  const assetsDirPath = (parsed as { assetsDirPath?: unknown }).assetsDirPath;

  if (fixtureId !== "real-site-01") throw new Error(`unexpected fixtureId: ${String(fixtureId)}`);
  if (kind !== "static_marketing_site_v1") throw new Error(`unexpected fixture kind: ${String(kind)}`);
  if (typeof entryHtmlPath !== "string" || entryHtmlPath.length === 0) throw new Error("entryHtmlPath must be a string");
  if (!(assetsDirPath === null || (typeof assetsDirPath === "string" && assetsDirPath.length > 0))) {
    throw new Error("assetsDirPath must be a string or null");
  }

  return {
    fixtureId,
    kind,
    entryHtmlPath,
    assetsDirPath,
  };
}
