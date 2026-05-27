import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const AGENCY_DASHBOARD_FILE = new URL("../agencies/[agencyId]/dashboard/page.tsx", import.meta.url);

test("agency dashboard source: provider fleet card links into provider fleet cockpit", async () => {
  const source = await readFile(AGENCY_DASHBOARD_FILE, "utf8");
  assert.equal(source.includes("Provider Fleet"), true);
  assert.equal(source.includes("Manage provider readiness, domains, DNS and provider intelligence surfaces."), true);
  assert.equal(source.includes('href="/gnr8/admin/providers"'), true);
});
