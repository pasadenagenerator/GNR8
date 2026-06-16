import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const PAGE_FILE = new URL("./first-limited-dry-run/[siteVersionId]/page.tsx", import.meta.url);

test("first limited dry-run page source: file exists", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.length > 0, true);
});

test("first limited dry-run page contains title and guarded page access", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  assert.equal(source.includes("First Limited Dry Run"), true);
  assert.equal(source.includes("requireSuperadminUserIdForPage"), true);
  assert.equal(source.includes("loadLatestFirstLimitedDryRunSurfaceProjection"), true);
});

test("first limited dry-run page displays overview labels", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  for (const label of [
    "Overview",
    "artifact status/ref",
    "artifact kind",
    "output status",
    "validation status",
    "route model count",
    "navigation model count",
    "section model count",
    "limitations/blockers",
    "diagnostics",
  ]) {
    assert.equal(source.includes(label), true, `missing ${label}`);
  }
});

test("first limited dry-run page displays route navigation and section labels", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  for (const label of [
    "Route Models",
    "routePath",
    "sourceUrl",
    "section count",
    "navigation refs",
    "Navigation Models",
    "item count",
    "labels",
    "hrefs",
    "evidence refs",
    "Section Models",
    "ordered section",
    "region type",
    "selector",
    "bounding box",
    "confidence",
    "limitations",
  ]) {
    assert.equal(source.includes(label), true, `missing ${label}`);
  }
});

test("first limited dry-run page contains empty states", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  assert.equal(
    source.includes("No First Limited Dry Run output has been created for this site version yet."),
    true,
  );
  assert.equal(source.includes("Latest output is invalid."), true);
  assert.equal(source.includes("Latest output is blocked."), true);
  assert.equal(source.includes("No route models were produced."), true);
  assert.equal(source.includes("No limitations."), true);
});

test("first limited dry-run page source excludes forbidden action text and controls", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  for (const tag of ["<button", "<form", "<input", "<textarea", "<select"]) {
    assert.equal(source.includes(tag), false, `unexpected control tag ${tag}`);
  }

  for (const phrase of [
    "trigger button",
    "rebuild button",
    "approve button",
    "publish button",
    "edit controls",
    "AI action",
  ]) {
    assert.equal(source.includes(phrase), false, `unexpected phrase ${phrase}`);
  }
});
