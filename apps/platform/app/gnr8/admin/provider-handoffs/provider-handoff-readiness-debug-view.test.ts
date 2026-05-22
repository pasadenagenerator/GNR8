import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { createOperatorReviewIntentEndpoint, submitOperatorReviewIntent } from "@/app/gnr8/admin/provider-handoffs/[handoffId]/readiness/operator-review-intent-submit";

const VIEW_FILE = new URL("./[handoffId]/readiness/provider-handoff-readiness-debug-view.tsx", import.meta.url);
const FORM_FILE = new URL("./[handoffId]/readiness/operator-review-intent-form.tsx", import.meta.url);

test("provider handoff readiness view source: renders form and intent-only warning", async () => {
  const [viewSource, formSource] = await Promise.all([readFile(VIEW_FILE, "utf8"), readFile(FORM_FILE, "utf8")]);
  const combined = `${viewSource}\n${formSource}`;

  assert.equal(combined.includes("Create operator review"), true);
  assert.equal(combined.includes("Save review intent"), true);
  assert.equal(combined.includes("Saving review intent does not execute provider actions."), true);
  assert.equal(combined.includes("Operator Review Summary"), true);
  assert.equal(combined.includes("summary status"), true);
  assert.equal(combined.includes("latest timestamp"), true);
  assert.equal(combined.includes("Review intent only. Execution remains blocked."), true);
});

test("provider handoff readiness view source: no execution controls rendered", async () => {
  const [viewSource, formSource] = await Promise.all([readFile(VIEW_FILE, "utf8"), readFile(FORM_FILE, "utf8")]);
  const combined = `${viewSource}\n${formSource}`;

  assert.equal(combined.includes(">Execute<"), false);
  assert.equal(combined.includes(">Dispatch<"), false);
  assert.equal(combined.includes(">Run worker<"), false);
  assert.equal(combined.includes(">Retry execution<"), false);
  assert.equal(combined.includes(">DNS write<"), false);
  assert.equal(combined.includes(">Provider call<"), false);
});

test("operator review intent submit: posts to route and refreshes on success", async () => {
  const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
  let reloaded = false;

  const result = await submitOperatorReviewIntent({
    handoffId: "handoff_123",
    reviewStatus: "pending_review",
    reviewReason: "intent note",
    fetchImpl: (async (url: string | URL | globalThis.Request, init?: RequestInit) => {
      fetchCalls.push({ url: String(url), init });
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch,
    reload: () => {
      reloaded = true;
    },
  });

  assert.equal(createOperatorReviewIntentEndpoint("handoff_123"), "/api/gnr8/admin/provider-handoffs/handoff_123/reviews");
  assert.deepEqual(result, { ok: true });
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0]?.url, "/api/gnr8/admin/provider-handoffs/handoff_123/reviews");
  assert.equal(fetchCalls[0]?.init?.method, "POST");
  assert.equal(reloaded, true);
});
