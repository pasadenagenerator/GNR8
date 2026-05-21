import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  callReadinessSeedRoute,
  parseReadinessSeedResult,
  READINESS_SEED_ROUTE,
} from "@/app/gnr8/admin/provider-handoffs/readiness-test/readiness-test-presenter";

const clientPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "readiness-test-client.tsx",
);

function loadClientSource(): string {
  return readFileSync(clientPath, "utf8");
}

test("readiness test ui: renders admin-only and execution-blocked boundary copy", () => {
  const source = loadClientSource();

  assert.equal(source.includes("Admin-only readiness test"), true);
  assert.equal(source.includes("Execution blocked"), true);
  assert.equal(source.includes("Control-plane review / dry-run artifact inspection only"), true);
  assert.equal(source.includes("GNR8_ADMIN_PROVIDER_HANDOFF_READINESS_SEED_ENABLED=1"), true);
});

test("readiness test ui: safe action calls readiness seed route", async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    calls.push({ input, init });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  await callReadinessSeedRoute(fetchImpl);

  assert.equal(calls.length, 1);
  assert.equal(String(calls[0]?.input), READINESS_SEED_ROUTE);
  assert.equal(calls[0]?.init?.method, "POST");
});

test("readiness test ui: success response displays handoffId and readinessUrl fields", () => {
  const result = parseReadinessSeedResult({
    status: 200,
    body: {
      ok: true,
      handoffId: "handoff_seed_1",
      readinessUrl: "/gnr8/admin/provider-handoffs/handoff_seed_1/readiness",
      reusedExisting: true,
      executionBlocked: true,
      nextAllowedAction: "control_plane_review_and_dry_run_artifact_inspection_only",
      diagnostics: ["PROVIDER_WORKER_PICKUP_EVIDENCE_CREATED:EVIDENCE_CREATED"],
      warning: "Admin-only dev/test readiness seed.",
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.handoffId, "handoff_seed_1");
  assert.equal(result.readinessUrl, "/gnr8/admin/provider-handoffs/handoff_seed_1/readiness");
});

test("readiness test ui: readiness inspection link uses returned readinessUrl", () => {
  const source = loadClientSource();
  assert.equal(source.includes("Open readiness inspection"), true);

  const result = parseReadinessSeedResult({
    status: 200,
    body: {
      ok: true,
      handoffId: "handoff_seed_2",
      readinessUrl: "/gnr8/admin/provider-handoffs/handoff_seed_2/readiness",
      reusedExisting: false,
      executionBlocked: true,
      nextAllowedAction: "control_plane_review_and_dry_run_artifact_inspection_only",
      diagnostics: [],
      warning: "boundary",
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.readinessUrl, "/gnr8/admin/provider-handoffs/handoff_seed_2/readiness");
});

test("readiness test ui: 401/403 show clear admin/auth message", () => {
  const unauthorized = parseReadinessSeedResult({ status: 401, body: { ok: false, error: "Unauthorized" } });
  const forbidden = parseReadinessSeedResult({ status: 403, body: { ok: false, error: "Forbidden: superadmin only" } });

  assert.equal(unauthorized.ok, false);
  assert.equal(forbidden.ok, false);
  if (unauthorized.ok || forbidden.ok) return;
  assert.equal(unauthorized.message, "Admin authentication required. This page is superadmin-only.");
  assert.equal(forbidden.message, "Admin authentication required. This page is superadmin-only.");
});

test("readiness test ui: missing env flag shows setup message", () => {
  const result = parseReadinessSeedResult({
    status: 403,
    body: {
      ok: false,
      error: "Forbidden: readiness seed route is disabled in production",
      requiredEnvFlag: "GNR8_ADMIN_PROVIDER_HANDOFF_READINESS_SEED_ENABLED=1",
    },
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.setupMessage.includes("GNR8_ADMIN_PROVIDER_HANDOFF_READINESS_SEED_ENABLED=1"), true);
});

test("readiness test ui: database/schema or route failure shows fail-closed setup guidance", () => {
  const result = parseReadinessSeedResult({
    status: 500,
    body: {
      ok: false,
      error: "DATABASE_URL missing",
    },
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.setupMessage, "Check DATABASE_URL/schema and route health, then retry.");
});

test("readiness test ui: no execute or worker/provider mutation controls are rendered", () => {
  const source = loadClientSource();

  assert.equal(source.includes("Create or reuse deterministic readiness test handoff"), true);
  assert.equal(source.includes("Forbidden controls are intentionally absent:"), true);
  assert.equal(source.includes("dispatch"), true);
  assert.equal(source.includes("run worker"), true);
  assert.equal(source.includes("provider call"), true);
  assert.equal(source.includes("Retry execution now"), false);
  assert.equal(source.includes("Dispatch to worker"), false);
  assert.equal(source.includes("Execute provider"), false);
  assert.equal(source.includes("DNS write now"), false);
});

test("readiness test ui: secret-like mocked response fields are redacted", () => {
  const result = parseReadinessSeedResult({
    status: 200,
    body: {
      ok: true,
      handoffId: "handoff_seed_1",
      readinessUrl: "/gnr8/admin/provider-handoffs/handoff_seed_1/readiness",
      reusedExisting: true,
      executionBlocked: true,
      nextAllowedAction: "control_plane_review_and_dry_run_artifact_inspection_only",
      diagnostics: ["token=secret_token_value", "apiKey=sk_abc1234567890", "SAFE_DIAGNOSTIC"],
      warning: "credential payload hidden",
      apiToken: "never_render_me",
      providerPayloadCredentials: "never_render_me_either",
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("secret_token_value"), false);
  assert.equal(serialized.includes("sk_abc1234567890"), false);
  assert.equal(serialized.includes("never_render_me"), false);
  assert.equal(serialized.includes("credential"), false);
  assert.equal(serialized.includes("[redacted]"), true);
});
