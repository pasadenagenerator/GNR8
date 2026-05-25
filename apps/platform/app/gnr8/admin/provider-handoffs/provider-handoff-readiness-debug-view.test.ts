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
  assert.equal(combined.includes("Execution impossible. Control-plane simulation only."), true);
  assert.equal(combined.includes("Executive Summary"), true);
  assert.equal(combined.includes("Current Situation"), true);
  assert.equal(combined.includes("Primary Blockers"), true);
  assert.equal(combined.includes("Verified Positives"), true);
  assert.equal(combined.includes("Recommended Next Step"), true);
  assert.equal(combined.includes("Evidence Sources"), true);
  assert.equal(combined.includes("EvidenceSourceChip"), true);
  assert.equal(combined.includes("Readiness"), true);
  assert.equal(combined.includes("Safety Manifest"), true);
  assert.equal(combined.includes("Execution Preconditions Ledger"), true);
  assert.equal(combined.includes("Execution Readiness Gate"), true);
  assert.equal(combined.includes("Execution Remediation Plan"), true);
  assert.equal(combined.includes("Governance Decision Package"), true);
  assert.equal(combined.includes("No summary available."), true);
  assert.equal(combined.includes("Critical:"), true);
  assert.equal(combined.includes("Warnings:"), true);
  assert.equal(combined.includes("Success:"), true);
  assert.equal(combined.includes("Evidence Strip"), true);
  assert.equal(combined.includes("Execution"), true);
  assert.equal(combined.includes("Governance"), true);
  assert.equal(combined.includes("Readiness"), true);
  assert.equal(combined.includes("Safety"), true);
  assert.equal(combined.includes("{props.label}:{props.value}"), true);
  assert.equal(combined.includes('label: "executionBlocked"'), true);
  assert.equal(combined.includes('label: "executionAllowed"'), true);
  assert.equal(combined.includes('label: "review status"'), true);
  assert.equal(combined.includes('label: "authorization status"'), true);
  assert.equal(combined.includes('label: "readinessStatus"'), true);
  assert.equal(combined.includes('label: "gateStatus"'), true);
  assert.equal(combined.includes('label: "preconditions status"'), true);
  assert.equal(combined.includes('label: "execution_impossible"'), true);
  assert.equal(combined.includes("Execution State"), true);
  assert.equal(combined.includes("Governance State"), true);
  assert.equal(combined.includes("Readiness State"), true);
  assert.equal(combined.includes("Safety State"), true);
  assert.equal(combined.includes("overall execution state"), true);
  assert.equal(combined.includes("active barrier count"), true);
  assert.equal(combined.includes("Governance"), true);
  assert.equal(combined.includes("Execution Analysis"), true);
  assert.equal(combined.includes("Execution Simulation"), true);
  assert.equal(combined.includes("Safety"), true);
  assert.equal(combined.includes("Timelines"), true);
  assert.equal(combined.includes("State Progress Timeline"), true);
  assert.equal(combined.includes("->"), true);
  assert.equal(combined.includes("unchanged"), true);
  assert.equal(combined.includes("TimelineStatusBadge"), true);
  assert.equal(combined.includes("resolveTimelineBadgeLevel"), true);
  assert.equal(combined.includes("pickup_not_ready"), true);
  assert.equal(combined.includes("approved_for_future_execution"), true);
  assert.equal(combined.includes("pending_review"), true);
  assert.equal(combined.includes("Original evidence"), true);
  assert.equal(combined.includes("Payload JSON Blocks"), true);
  assert.equal(combined.includes("Diagnostics"), true);
  assert.equal(combined.includes("Decision Package"), true);
  assert.equal(combined.includes("Reviews"), true);
  assert.equal(combined.includes("Execution Readiness Gate"), true);
  assert.equal(combined.includes("Execution Preconditions Ledger"), true);
  assert.equal(combined.includes("Execution Remediation Plan"), true);
  assert.equal(combined.includes("Dry-run Job Plan"), true);
  assert.equal(combined.includes("jobCount"), true);
  assert.equal(combined.includes("jobType"), true);
  assert.equal(combined.includes("No dry-run jobs available."), true);
  assert.equal(combined.includes("Execution Job Preview"), true);
  assert.equal(combined.includes("queueTarget"), true);
  assert.equal(combined.includes("workerTarget"), true);
  assert.equal(combined.includes("simulatedStatus"), true);
  assert.equal(combined.includes("payloadShape"), true);
  assert.equal(combined.includes("No execution job previews available."), true);
  assert.equal(combined.includes("Provider Worker Envelope Preview"), true);
  assert.equal(combined.includes("Provider Execution Safety Manifest"), true);
  assert.equal(combined.includes("barrierId"), true);
  assert.equal(combined.includes("No execution safety barriers available."), true);
  assert.equal(combined.includes("payloadVersion"), true);
  assert.equal(combined.includes("payload"), true);
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
  assert.equal(pageSource.includes("worker-envelope-preview"), true);
  assert.equal(pageSource.includes("execution-safety-manifest"), true);
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
