import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const VIEW_FILE = new URL("./provider-fleet-view.tsx", import.meta.url);
const PAGE_FILE = new URL("./page.tsx", import.meta.url);

test("provider fleet view source: renders title and subtitle", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Provider Fleet Cockpit"), true);
  assert.equal(source.includes("Global provider control plane"), true);
});

test("provider fleet page source: renders all four providers", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes('name: "Openprovider"'), true);
  assert.equal(source.includes('name: "Realtime Register"'), true);
  assert.equal(source.includes('name: "INWX"'), true);
  assert.equal(source.includes('name: "Netim"'), true);
});

test("provider fleet page source: openprovider is connected", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes('name: "Openprovider"'), true);
  assert.equal(source.includes('status: "connected"'), true);
  assert.equal(source.includes('mode: "sandbox"'), true);
});

test("provider fleet page source: other providers are not_configured", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  const matchCount = source.match(/status: "not_configured"/g)?.length ?? 0;
  assert.equal(matchCount, 3);
});

test("provider fleet view source: summary cards show 4 / 1 / 3 / blocked", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  const pageSource = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes('SummaryCard label="Providers"'), true);
  assert.equal(source.includes('SummaryCard label="Connected"'), true);
  assert.equal(source.includes('SummaryCard label="Read-only Capabilities"'), true);
  assert.equal(source.includes('SummaryCard label="Execution"'), true);
  assert.equal(pageSource.includes("providers: 4"), true);
  assert.equal(pageSource.includes("connected: 1"), true);
  assert.equal(pageSource.includes("readOnlyCapabilities: 3"), true);
  assert.equal(pageSource.includes('execution: "blocked"'), true);
});

test("provider fleet view source: capability chips render", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes('"domains"'), true);
  assert.equal(source.includes('"dns"'), true);
  assert.equal(source.includes('"availability"'), true);
  assert.equal(source.includes('"registration"'), true);
  assert.equal(source.includes('"execution"'), true);
  assert.equal(source.includes("CAPABILITY_KEYS.map"), true);
});

test("provider fleet view source: read-only note", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Fleet cockpit is read-only. Provider execution remains disabled."), true);
});

test("provider fleet view source: openprovider row is linked to provider cockpit", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes('href="/gnr8/admin/providers/openprovider"'), true);
  assert.equal(source.includes('provider.name === "Openprovider"'), true);
});

test("provider fleet view source: not configured providers remain non-navigable text", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes('href="/gnr8/admin/providers/realtime_register"'), false);
  assert.equal(source.includes('href="/gnr8/admin/providers/inwx"'), false);
  assert.equal(source.includes('href="/gnr8/admin/providers/netim"'), false);
});

test("provider fleet view source: no action buttons or forms are present", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("<button"), false);
  assert.equal(source.includes("<form"), false);
  assert.equal(source.includes("onClick"), false);
});

test("provider fleet view source: provider capability status cards render", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Provider Capability Status"), true);
  assert.equal(source.includes("Status:"), true);
  assert.equal(source.includes("Explanation:"), true);
  assert.equal(source.includes("Readiness:"), true);
  assert.equal(source.includes("Availability"), true);
  assert.equal(source.includes("Registration"), true);
  assert.equal(source.includes("Execution"), true);
});

test("provider fleet view source: readiness and explanations render", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("sandbox_verified"), true);
  assert.equal(source.includes("not_enabled"), true);
  assert.equal(source.includes("control_plane_only"), true);
  assert.equal(source.includes("Real provider availability lookups are operational through Openprovider read-only APIs."), true);
  assert.equal(source.includes("Provider registration flows are intentionally blocked by execution boundaries."), true);
  assert.equal(source.includes("Queue, worker, and provider execution layers remain intentionally disabled."), true);
});

test("provider fleet view source: registration and execution capability statuses", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes('status: "disabled"'), true);
  assert.equal(source.includes('readiness: "not_enabled"'), true);
  assert.equal(source.includes('status: "blocked"'), true);
  assert.equal(source.includes('readiness: "control_plane_only"'), true);
});
