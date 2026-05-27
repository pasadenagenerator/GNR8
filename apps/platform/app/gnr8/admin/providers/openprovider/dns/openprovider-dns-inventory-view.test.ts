import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const VIEW_FILE = new URL("./openprovider-dns-inventory-view.tsx", import.meta.url);

test("openprovider dns inventory view source: empty inventory render", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("No DNS records found in current Openprovider sandbox account."), true);
});

test("openprovider dns inventory view source: loaded inventory table render", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("domain"), true);
  assert.equal(source.includes("name"), true);
  assert.equal(source.includes("type"), true);
  assert.equal(source.includes("value"), true);
  assert.equal(source.includes("ttl"), true);
});

test("openprovider dns inventory view source: diagnostics collapse", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("<details"), true);
  assert.equal(source.includes(">Diagnostics<"), true);
  assert.equal(source.includes(">Raw payload<"), true);
  assert.equal(source.includes("<details open"), false);
});

test("openprovider dns inventory view source: summary cards", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes("Provider"), true);
  assert.equal(source.includes("openprovider"), true);
  assert.equal(source.includes("Mode"), true);
  assert.equal(source.includes("read only"), true);
  assert.equal(source.includes("Execution"), true);
  assert.equal(source.includes("blocked"), true);
  assert.equal(source.includes("Domains"), true);
  assert.equal(source.includes("Records"), true);
});

test("openprovider dns inventory view source: badge rendering states", async () => {
  const source = await readFile(VIEW_FILE, "utf8");
  assert.equal(source.includes('if (status === "loaded") return { level: "success", text: "loaded" };'), true);
  assert.equal(source.includes('if (status === "empty") return { level: "warning", text: "empty" };'), true);
  assert.equal(source.includes('return { level: "critical", text: "failed_closed" };'), true);
});
