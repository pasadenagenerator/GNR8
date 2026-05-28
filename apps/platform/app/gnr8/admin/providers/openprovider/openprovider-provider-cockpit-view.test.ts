import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const VIEW_FILE = new URL("./openprovider-provider-cockpit-view.tsx", import.meta.url);
const PAGE_FILE = new URL("./page.tsx", import.meta.url);

test("openprovider provider cockpit view source: sticky header and subtitle", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Openprovider Provider Cockpit"), true);
  assert.equal(source.includes("Provider reality surface (read-only boundary active)"), true);
  assert.equal(source.includes('position: "sticky"'), true);
});

test("openprovider provider cockpit view source: summary cards", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes('SummaryCard label="Provider" value="openprovider"'), true);
  assert.equal(source.includes('SummaryCard label="Mode"'), true);
  assert.equal(source.includes('SummaryCard label="Execution" value="blocked"'), true);
  assert.equal(source.includes('SummaryCard label="Auth"'), true);
  assert.equal(source.includes('SummaryCard label="Domains"'), true);
  assert.equal(source.includes('SummaryCard label="DNS Records"'), true);
  assert.equal(source.includes('SummaryCard label="Availability"'), true);
  assert.equal(source.includes('SummaryCard label="Boundary" value="read-only active"'), true);
});

test("openprovider provider cockpit view source: provider card renders value once", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("<span>{props.value}</span>"), false);
  assert.equal(source.includes("Badge level={resolveBadgeLevel(props.value)} text={props.value}"), false);
});

test("openprovider provider cockpit page source: mode renders sandbox when inferred", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes('if (normalizedDiagnostics.includes("sandbox")) return "sandbox";'), true);
  assert.equal(source.includes("OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT"), true);
  assert.equal(source.includes("OPENPROVIDER_SANDBOX_USERNAME"), true);
});

test("openprovider provider cockpit view source: summary cards do not duplicate value text", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("{props.value}\n        <Badge"), true);
  assert.equal(source.includes("{props.value}</span>"), false);
});

test("openprovider provider cockpit view source: required sections", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Provider Status"), true);
  assert.equal(source.includes("Provider Surfaces"), true);
  assert.equal(source.includes("Domain Inventory"), true);
  assert.equal(source.includes("DNS Inventory"), true);
  assert.equal(source.includes("Availability Search"), true);
  assert.equal(source.includes("Availability Intelligence"), true);
  assert.equal(source.includes("Safety Boundary"), true);
  assert.equal(source.includes("executionAllowed"), true);
  assert.equal(source.includes("executionBlocked"), true);
  assert.equal(source.includes("Read-only boundary active"), true);
});

test("openprovider provider cockpit view source: provider surfaces links", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes('href="/gnr8/admin/providers/openprovider/domains"'), true);
  assert.equal(source.includes('href="/gnr8/admin/providers/openprovider/dns"'), true);
  assert.equal(source.includes(">Domain Inventory<"), true);
  assert.equal(source.includes(">DNS Inventory<"), true);
});

test("openprovider provider cockpit view source: availability details", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("levi-testis.com"), true);
  assert.equal(source.includes("checkedAt"), true);
  assert.equal(source.includes("available"), true);
  assert.equal(source.includes("status"), true);
});

test("openprovider provider cockpit view source: query param domain is supported", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes('searchParams.get("domain")'), true);
  assert.equal(source.includes("domain-availability?domain="), true);
  assert.equal(source.includes('requestedDomain || "levi-testis.com"'), true);
});

test("openprovider provider cockpit view source: availability badge rules", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("resolveAvailabilityBadgeLevel"), true);
  assert.equal(source.includes("if (value === true) return \"success\";"), true);
  assert.equal(source.includes("if (value === false) return \"critical\";"), true);
  assert.equal(source.includes("return \"warning\";"), true);
});

test("openprovider provider cockpit view source: collapsed diagnostics and raw payloads", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("<details"), true);
  assert.equal(source.includes(">Diagnostics<"), true);
  assert.equal(source.includes(">Raw payloads<"), true);
  assert.equal(source.includes("<details open"), false);
});

test("openprovider provider cockpit view source: badge rules", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes('["available", "connected", "working"].includes(value)'), true);
  assert.equal(source.includes('["empty", "unknown"].includes(value)'), true);
  assert.equal(source.includes('["blocked", "failed_closed"].includes(value)'), true);
});

test("openprovider provider cockpit view source: read-only availability GET form allowed; mutations forbidden", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("<form"), true);
  assert.equal(source.includes('method="GET"'), true);
  assert.equal(source.includes('action="/gnr8/admin/providers/openprovider"'), true);
  assert.equal(source.includes('name="domain"'), true);
  assert.equal(source.includes('placeholder="example-domain.com"'), true);
  assert.equal(source.includes("Check Availability"), true);
  assert.equal(source.includes('method="POST"'), false);
  assert.equal(source.includes("Register"), false);
  assert.equal(source.includes("Delete"), false);
  assert.equal(source.includes("Update"), false);
  assert.equal(source.includes("Execute"), false);
  assert.equal(source.includes("/api/gnr8/admin/providers/openprovider/register"), false);
  assert.equal(source.includes("/api/gnr8/admin/providers/openprovider/delete"), false);
  assert.equal(source.includes("/api/gnr8/admin/providers/openprovider/update"), false);
  assert.equal(source.includes("/api/gnr8/admin/providers/openprovider/execute"), false);
});

test("openprovider provider cockpit view source: provider capability status cards render", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Provider Capability Status"), true);
  assert.equal(source.includes("Status:"), true);
  assert.equal(source.includes("Explanation:"), true);
  assert.equal(source.includes("Readiness:"), true);
  assert.equal(source.includes("Availability"), true);
  assert.equal(source.includes("Registration"), true);
  assert.equal(source.includes("Execution"), true);
});

test("openprovider provider cockpit view source: readiness and explanations render", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("sandbox_verified"), true);
  assert.equal(source.includes("not_enabled"), true);
  assert.equal(source.includes("control_plane_only"), true);
  assert.equal(source.includes("Real provider availability lookups are operational through Openprovider read-only APIs."), true);
  assert.equal(source.includes("Provider registration flows are intentionally blocked by execution boundaries."), true);
  assert.equal(source.includes("Queue, worker, and provider execution layers remain intentionally disabled."), true);
});

test("openprovider provider cockpit view source: registration and execution capability statuses", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes('status: "disabled"'), true);
  assert.equal(source.includes('readiness: "not_enabled"'), true);
  assert.equal(source.includes('status: "blocked"'), true);
  assert.equal(source.includes('readiness: "control_plane_only"'), true);
});

test("openprovider provider cockpit view source: readiness advisor section and cards render", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Readiness Advisor"), true);
  assert.equal(source.includes("Current State"), true);
  assert.equal(source.includes("Current Limitations"), true);
  assert.equal(source.includes("Missing Requirements"), true);
  assert.equal(source.includes("Recommended Next Step"), true);
});

test("openprovider provider cockpit view source: readiness advisor guidance text renders", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("availability intelligence operational"), true);
  assert.equal(source.includes("DNS inventory operational"), true);
  assert.equal(source.includes("domain inventory operational"), true);
  assert.equal(source.includes("sandbox verified"), true);
  assert.equal(source.includes("read-only boundary active"), true);
  assert.equal(source.includes("registration disabled"), true);
  assert.equal(source.includes("execution blocked"), true);
  assert.equal(source.includes("no provider writes"), true);
  assert.equal(source.includes("execution orchestration"), true);
  assert.equal(source.includes("mutation safety review"), true);
  assert.equal(source.includes("verify live environment behavior"), true);
  assert.equal(source.includes("add approval-driven registration flow"), true);
});

test("openprovider provider cockpit view source: readiness advisor badge mapping for guidance values", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes('value.includes("operational")'), true);
  assert.equal(source.includes('value.includes("verified")'), true);
  assert.equal(source.includes('value.includes("limited")'), true);
  assert.equal(source.includes('value.includes("missing")'), true);
  assert.equal(source.includes('value.includes("disabled")'), true);
});
