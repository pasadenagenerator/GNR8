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
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../fixtures/real-site-01");
}

export function readFirstRealSiteFixtureSpec(): FirstRealSiteFixtureSpec {
  const root = firstRealSiteFixtureDirAbs();
  const jsonPath = path.resolve(root, "fixture.json");
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

