import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeProviderDryRunJobPlan } from "@/gnr8/runtime/providers/runtime-provider-dryrun-job-plan";

function buildHandoff(operationKind: string) {
  return {
    handoffId: "handoff_1",
    artifactId: "artifact_1",
    siteId: "site_1",
    siteVersionId: "site_version_1",
    providerId: "openprovider_sandbox",
    environment: "sandbox",
    capability: "domain_dns",
    operationKind,
    approvalStatus: "approved",
    riskLevel: "low",
    handoffStatus: "blocked" as const,
    plannedJobIds: [],
    warnings: [],
    blockers: [],
    correlationKey: "corr_1",
    createdAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z",
  };
}

test("dryrun job plan: dns upsert maps to provider_dns_upsert", () => {
  const plan = createRuntimeProviderDryRunJobPlan({
    handoffId: "handoff_1",
    handoffArtifact: buildHandoff("upsert_dns_record"),
  });
  assert.equal(plan.executionAllowed, false);
  assert.equal(plan.executionBlocked, true);
  assert.equal(plan.intentOnly, true);
  assert.equal(plan.jobCount, 1);
  assert.equal(plan.jobs[0]?.jobType, "provider_dns_upsert");
  assert.equal(plan.jobs[0]?.status, "simulated");
});

test("dryrun job plan: dns delete maps to provider_dns_delete", () => {
  const plan = createRuntimeProviderDryRunJobPlan({
    handoffId: "handoff_1",
    handoffArtifact: buildHandoff("delete_dns_record"),
  });
  assert.equal(plan.jobs[0]?.jobType, "provider_dns_delete");
});

test("dryrun job plan: domain attach maps to provider_domain_attach", () => {
  const plan = createRuntimeProviderDryRunJobPlan({
    handoffId: "handoff_1",
    handoffArtifact: buildHandoff("attach_domain"),
  });
  assert.equal(plan.jobs[0]?.jobType, "provider_domain_attach");
});

test("dryrun job plan: unknown operation maps to provider_unknown", () => {
  const plan = createRuntimeProviderDryRunJobPlan({
    handoffId: "handoff_1",
    handoffArtifact: buildHandoff("manual_instruction"),
  });
  assert.equal(plan.jobs[0]?.jobType, "provider_unknown");
});

test("dryrun job plan: without handoff creates empty deterministic summary", () => {
  const plan = createRuntimeProviderDryRunJobPlan({
    handoffId: "handoff_missing",
    handoffArtifact: null,
  });
  assert.equal(plan.executionAllowed, false);
  assert.equal(plan.executionBlocked, true);
  assert.equal(plan.intentOnly, true);
  assert.equal(plan.jobCount, 0);
  assert.equal(plan.summary, "No deterministic jobs could be generated.");
  assert.equal(plan.diagnostics.includes("PROVIDER_DRYRUN_INTENT_ONLY"), true);
});
