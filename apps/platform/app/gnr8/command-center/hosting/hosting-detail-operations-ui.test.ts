import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const DETAIL_PAGE_FILE = new URL("./[siteId]/page.tsx", import.meta.url);
const RECHECK_BUTTON_FILE = new URL("./[siteId]/hosting-domain-recheck-button.tsx", import.meta.url);

test("hosting detail operations UI: drilldown renders", async () => {
  const source = await readFile(DETAIL_PAGE_FILE, "utf8");

  assert.equal(source.includes("Readiness Drilldown"), true);
  assert.equal(source.includes("Site Readiness"), true);
  assert.equal(source.includes("Domain Readiness"), true);
  assert.equal(source.includes("model.readinessDrilldown.site.blockers"), true);
  assert.equal(source.includes("model.readinessDrilldown.domains.warnings"), true);
});

test("hosting detail operations UI: domain section and dns instructions render", async () => {
  const source = await readFile(DETAIL_PAGE_FILE, "utf8");

  assert.equal(source.includes("Domain Operations"), true);
  assert.equal(source.includes("DNS Instructions"), true);
  assert.equal(source.includes("Expected Status"), true);
  assert.equal(source.includes("domain.dnsInstructions.map"), true);
});

test("hosting detail operations UI: recheck button calls bounded admin route", async () => {
  const source = await readFile(RECHECK_BUTTON_FILE, "utf8");

  assert.equal(source.includes('"use client"'), true);
  assert.equal(source.includes("Recheck Domain"), true);
  assert.equal(source.includes("method: \"POST\""), true);
  assert.equal(source.includes("/api/gnr8/admin/hosting-operations/"), true);
  assert.equal(source.includes("router.refresh()"), true);
});

test("hosting detail operations UI: diagnostics render existing domain evidence", async () => {
  const source = await readFile(DETAIL_PAGE_FILE, "utf8");

  assert.equal(source.includes("Last Domain Check"), true);
  assert.equal(source.includes("Last Verification Result"), true);
  assert.equal(source.includes("Verification Diagnostics"), true);
});
