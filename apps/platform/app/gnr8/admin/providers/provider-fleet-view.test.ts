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

test("provider fleet view source: AI Provider Capability Matrix renders", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("AI Provider Capability Matrix"), true);
  assert.equal(source.includes("provider.providerCategory === \"ai\""), true);
  assert.equal(source.includes("AI routing metadata is advisory only. No model calls are performed."), true);
});

test("provider fleet view source: AI provider rows render for all configured AI providers", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("AI_PROVIDER_CAPABILITY_ROWS"), true);
  assert.equal(source.includes("provider.providerCategory === \"ai\""), true);
  assert.equal(source.includes("provider.displayName"), true);
  assert.equal(source.includes("provider.aiRouting?.modelFamilies"), true);
});

test("provider fleet view source: AI metadata columns render", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Model Families"), true);
  assert.equal(source.includes("Strengths"), true);
  assert.equal(source.includes("Routing Hints"), true);
  assert.equal(source.includes("Latency"), true);
  assert.equal(source.includes("Cost"), true);
  assert.equal(source.includes("Context"), true);
  assert.equal(source.includes("modelFamilies.join"), true);
  assert.equal(source.includes("strengths.join"), true);
  assert.equal(source.includes("routingHints.join"), true);
});

test("provider fleet view source: AI routing policy preview section renders", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("AI Routing Policy Preview"), true);
  assert.equal(source.includes("Task Type"), true);
  assert.equal(source.includes("Preferred Provider"), true);
  assert.equal(source.includes("Secondary Provider"), true);
  assert.equal(source.includes("Routing Strategy"), true);
  assert.equal(source.includes("Reasoning"), true);
  assert.equal(source.includes("AI_ROUTING_POLICY_PREVIEW_ROWS"), true);
});

test("provider fleet view source: AI routing policy preview task mappings render", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Site Migration Planning"), true);
  assert.equal(source.includes("Long Architecture Review"), true);
  assert.equal(source.includes("Layout / Visual Understanding"), true);
  assert.equal(source.includes("Fast Interactive Generation"), true);
  assert.equal(source.includes("EU-sensitive Workloads"), true);
  assert.equal(source.includes("Structured Tool Orchestration"), true);
  assert.equal(source.includes("OpenAI"), true);
  assert.equal(source.includes("Anthropic"), true);
  assert.equal(source.includes("Gemini"), true);
  assert.equal(source.includes("Groq"), true);
  assert.equal(source.includes("Mistral"), true);
  assert.equal(source.includes("reasoning_priority"), true);
  assert.equal(source.includes("context_priority"), true);
  assert.equal(source.includes("latency_priority"), true);
  assert.equal(source.includes("sovereignty_priority"), true);
  assert.equal(source.includes("orchestration_priority"), true);
});

test("provider fleet view source: AI routing policy preview advisory note renders", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Routing policy preview is strategic only. No live AI routing is performed."), true);
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
  assert.equal(source.includes("Run Routing"), false);
  assert.equal(source.includes("Execute Routing"), false);
});
