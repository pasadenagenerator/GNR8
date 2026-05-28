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

test("provider fleet page source: consumes canonical provider contract registry", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes("PROVIDER_CONTRACT_REGISTRY"), true);
  assert.equal(source.includes("displayName"), true);
  assert.equal(source.includes("environment"), true);
  assert.equal(source.includes("providerCategory"), true);
});

test("provider fleet view source: grouped provider category sections render", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Registrar / Domain Providers"), true);
  assert.equal(source.includes("Deployment Providers"), true);
  assert.equal(source.includes("Commerce / Billing Providers"), true);
  assert.equal(source.includes("Execution Providers"), true);
  assert.equal(source.includes("Source Control Providers"), true);
  assert.equal(source.includes("AI Providers"), true);
  assert.equal(source.includes("Storage / Data Providers"), true);
  assert.equal(source.includes("Identity Providers"), true);
  assert.equal(source.includes("groupProvidersByCategory"), true);
});

test("provider fleet view source: placeholder providers render in taxonomy sections", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Openprovider"), true);
  assert.equal(source.includes("Realtime Register"), true);
  assert.equal(source.includes("provider.category"), true);
  assert.equal(source.includes("CATEGORY_ORDER.map"), true);
});

test("provider fleet view source: realtime register contract consumed from registry", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("PROVIDER_CONTRACT_BY_ID.realtime_register"), true);
  assert.equal(source.includes("providerId:"), true);
  assert.equal(source.includes("providerType:"), true);
  assert.equal(source.includes("environment:"), true);
});

test("provider fleet view source: summary cards show providers connected read-only and execution", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  const pageSource = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes('SummaryCard label="Providers"'), true);
  assert.equal(source.includes('SummaryCard label="Connected"'), true);
  assert.equal(source.includes('SummaryCard label="Read-only Capabilities"'), true);
  assert.equal(source.includes('SummaryCard label="Execution"'), true);
  assert.equal(pageSource.includes("providers: PROVIDER_CONTRACT_REGISTRY.length"), true);
  assert.equal(pageSource.includes("connected: PROVIDER_CONTRACT_REGISTRY.filter"), true);
  assert.equal(pageSource.includes("readOnlyCapabilities: PROVIDER_CONTRACT_REGISTRY.reduce"), true);
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
  assert.equal(source.includes("execute"), false);
});
