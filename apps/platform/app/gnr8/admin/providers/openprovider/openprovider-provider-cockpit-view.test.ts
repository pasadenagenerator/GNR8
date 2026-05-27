import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const VIEW_FILE = new URL("./openprovider-provider-cockpit-view.tsx", import.meta.url);

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

test("openprovider provider cockpit view source: required sections", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Provider Status"), true);
  assert.equal(source.includes("Domain Inventory"), true);
  assert.equal(source.includes("DNS Inventory"), true);
  assert.equal(source.includes("Availability Intelligence"), true);
  assert.equal(source.includes("Safety Boundary"), true);
  assert.equal(source.includes("executionAllowed"), true);
  assert.equal(source.includes("executionBlocked"), true);
  assert.equal(source.includes("Read-only boundary active"), true);
});

test("openprovider provider cockpit view source: availability details", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("levi-testis.com"), true);
  assert.equal(source.includes("checkedAt"), true);
  assert.equal(source.includes("available"), true);
  assert.equal(source.includes("status"), true);
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
