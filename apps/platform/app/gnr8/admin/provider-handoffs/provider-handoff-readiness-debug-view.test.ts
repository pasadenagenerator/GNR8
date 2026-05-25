import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { createOperatorReviewIntentEndpoint, submitOperatorReviewIntent } from "@/app/gnr8/admin/provider-handoffs/[handoffId]/readiness/operator-review-intent-submit";

const VIEW_FILE = new URL("./[handoffId]/readiness/provider-handoff-readiness-debug-view.tsx", import.meta.url);
const FORM_FILE = new URL("./[handoffId]/readiness/operator-review-intent-form.tsx", import.meta.url);
const PAGE_FILE = new URL("./[handoffId]/readiness/page.tsx", import.meta.url);

test("provider handoff readiness view source: renders form and intent-only warning", async () => {
  const [viewSource, formSource] = await Promise.all([readFile(VIEW_FILE, "utf8"), readFile(FORM_FILE, "utf8")]);
  const combined = `${viewSource}\n${formSource}`;

  assert.equal(combined.includes("Create operator review"), true);
  assert.equal(combined.includes("Save review intent"), true);
  assert.equal(combined.includes("Saving review intent does not execute provider actions."), true);
  assert.equal(combined.includes("Operator Review Summary"), true);
  assert.equal(combined.includes("Operator review fetch error:"), true);
  assert.equal(combined.includes("summary status"), true);
  assert.equal(combined.includes("latest timestamp"), true);
  assert.equal(combined.includes("Review intent only. Execution remains blocked."), true);
  assert.equal(combined.includes("Authorization is intent only. Execution remains blocked."), true);
  assert.equal(combined.includes("Execution Readiness Gate"), true);
  assert.equal(combined.includes("Execution gate is evaluative only. Execution remains disabled."), true);
  assert.equal(combined.includes("Execution Preconditions Ledger"), true);
  assert.equal(combined.includes("Preconditions are evidence only. Execution remains disabled."), true);
  assert.equal(combined.includes("Execution Remediation Plan"), true);
  assert.equal(combined.includes("Remediation guidance is advisory only. Execution remains disabled."), true);
  assert.equal(combined.includes("Dry-run Job Plan"), true);
  assert.equal(combined.includes("Job plan is simulated only. Execution remains disabled."), true);
  assert.equal(combined.includes("Execution job preview is evidence only. Execution remains disabled."), true);
  assert.equal(combined.includes("jobCount"), true);
  assert.equal(combined.includes("jobType"), true);
  assert.equal(combined.includes("No dry-run jobs available."), true);
  assert.equal(combined.includes("Execution Job Preview"), true);
  assert.equal(combined.includes("queueTarget"), true);
  assert.equal(combined.includes("workerTarget"), true);
  assert.equal(combined.includes("simulatedStatus"), true);
  assert.equal(combined.includes("payloadShape"), true);
  assert.equal(combined.includes("No execution job previews available."), true);
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

test("provider handoff readiness page source: separates readiness and operator review fetch errors", async () => {
  const pageSource = await readFile(PAGE_FILE, "utf8");

  assert.equal(pageSource.includes("operatorReviewFetchError"), true);
  assert.equal(pageSource.includes("fetchError: null"), true);
  assert.equal(pageSource.includes("if (!response.ok)"), true);
  assert.equal(pageSource.includes("if (!reviewsResponse.ok)"), true);
  assert.equal(pageSource.includes("execution-remediation-plan"), true);
  assert.equal(pageSource.includes("dryrun-job-plan"), true);
  assert.equal(pageSource.includes("execution-job-preview"), true);
  assert.equal(pageSource.includes("<ProviderHandoffReadinessDebugView model={model} fetchError={fetchError} operatorReviewFetchError={operatorReviewFetchError} />"), true);
  assert.equal(pageSource.includes("const cookie = normalizeToken(incomingHeaders.get(\"cookie\"));"), true);
});

test("provider handoff readiness page source: authorization fallback is fail-safe", async () => {
  const pageSource = await readFile(PAGE_FILE, "utf8");

  assert.equal(pageSource.includes("authorizationStatus: \"not_requested\""), true);
  assert.equal(pageSource.includes("intentOnly: true"), true);
  assert.equal(pageSource.includes("executionBlocked: true"), true);
  assert.equal(pageSource.includes("GOVERNANCE_AUTHORIZATION_INTENT_ONLY"), true);
  assert.equal(pageSource.includes("normalizeGovernanceAuthorization(\n        authorizationPayload.authorization,\n        authorizationPayload.authorizationSummary,\n      )"), true);
  assert.equal(pageSource.includes("GOVERNANCE_AUTHORIZATION_FETCH_ERROR:"), true);
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
