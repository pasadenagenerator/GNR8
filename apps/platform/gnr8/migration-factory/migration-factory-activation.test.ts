import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { executeMigrationFactoryActivation } from "@/gnr8/migration-factory/migration-factory-activation";
import { MigrationFactory } from "@/gnr8/migration-factory/migration-factory";
import { InMemoryMigrationJobStore } from "@/gnr8/migration-factory/migration-job-store";
import type { MigrationJob } from "@/gnr8/migration-factory/migration-job-types";
import { createInitialStageStates } from "@/gnr8/migration-factory/migration-stage-machine";

let attempt = 0;

function createDeterministicClock(): () => string {
  let tick = 0;
  const base = Date.parse("2026-01-01T00:00:00.000Z");
  return () => {
    tick += 1;
    return new Date(base + tick * 1000).toISOString();
  };
}

function createCanonicalPayload() {
  return {
    kind: "migration_factory_canonical_v1",
    canonicalInput: {
      siteId: "site-activation-1",
      sourceUrl: "https://example.com",
      actor: "migration-factory",
      pages: [
        {
          pageId: "page-1",
          path: "/",
          title: "Activation Test",
          structureModel: { sections: [{ id: "hero", type: "hero", order: 0 }] },
          contentModel: { sectionProps: { hero: { heading: "Hello Activation" } } },
          styleTokens: { "color.background": "#fff" },
          assetGraph: [{ path: "/hero.png", mediaType: "image/png", required: true }],
          semanticSignals: [{ label: "migration.initial", confidence: 1, source: "migration" as const }],
          migrationGovernance: null,
          source: "migration" as const,
          actor: "migration-factory",
        },
      ],
    },
  };
}

function createArtifactPayload(input?: {
  governanceMissing?: boolean;
  lineageMismatch?: boolean;
  integrityFail?: boolean;
}) {
  return {
    kind: "migration_factory_runtime_artifact_v1",
    artifactId: "artifact-activation-1",
    siteVersionId: input?.lineageMismatch ? "sv-mismatch" : "sv-activation-1",
    publishStageCandidate: "shadow" as const,
    shadowRestricted: false,
    artifactGovernance: input?.governanceMissing
      ? {
          pageGateState: [],
          pageRolloutPolicyState: [],
          pageEnforcementState: { shadow: [], canary: [], production: [] },
          siteGateState: "",
          siteRolloutPolicyState: "",
          siteEnforcementState: { shadow: "", canary: "", production: "" },
          publishStage: "shadow" as const,
        }
      : {
          pageGateState: ["SHADOW_READY"],
          pageRolloutPolicyState: ["SHADOW_ONLY"],
          pageEnforcementState: { shadow: ["ALLOW"], canary: ["DENY"], production: ["DENY"] },
          siteGateState: "SHADOW_READY",
          siteRolloutPolicyState: "SHADOW_ONLY",
          siteEnforcementState: { shadow: "ALLOW", canary: "DENY", production: "DENY" },
          publishStage: "shadow" as const,
        },
    artifact: {
      siteId: "site-activation-1",
      siteVersionId: input?.lineageMismatch ? "sv-mismatch" : "sv-activation-1",
      rendererCompatibilityVersion: "gnr8-renderer-v1",
      htmlByPath: input?.integrityFail ? { "/": "<html><body>ok</body></html>" } : { "/": "<html><body>ok</body></html>" },
      compiledTokenStyles: "",
      assetFingerprintMap: input?.integrityFail ? {} : { "/hero.png": "sha256-hero" },
      manifest: {
        siteId: "site-activation-1",
        siteVersionId: input?.lineageMismatch ? "sv-mismatch" : "sv-activation-1",
        rendererCompatibilityVersion: "gnr8-renderer-v1",
        paths: ["/"],
      },
      bundleSha256: "sha256-activation-artifact",
    },
  };
}

async function prepareActivationFixture(
  root: string,
  options?: {
    governanceMissing?: boolean;
    lineageMismatch?: boolean;
    integrityFail?: boolean;
  },
): Promise<{ job: MigrationJob; shadowBindReadyRef: string }> {
  const canonicalPageRef = path.resolve(root, "canonical-page.json");
  const artifactRef = path.resolve(root, "runtime-artifact.json");
  const shadowBindReadyRef = path.resolve(root, "shadow-bind-ready.json");
  await fs.mkdir(root, { recursive: true });

  const canonicalPayload = createCanonicalPayload();
  const artifactPayload = createArtifactPayload(options);
  await fs.writeFile(canonicalPageRef, `${JSON.stringify(canonicalPayload, null, 2)}\n`, "utf8");
  await fs.writeFile(artifactRef, `${JSON.stringify(artifactPayload, null, 2)}\n`, "utf8");

  const shadowBindReady = {
    artifactId: "artifact-activation-1",
    siteVersionId: "sv-activation-1",
    artifactRef,
    publishStageCandidate: "shadow",
    shadowEligibilityState: "ALLOWED",
    publishCandidateState: "READY_FOR_SHADOW_BIND",
  };
  await fs.writeFile(shadowBindReadyRef, `${JSON.stringify(shadowBindReady, null, 2)}\n`, "utf8");

  const stageStates = createInitialStageStates();
  stageStates.CANONICAL.state = "SUCCEEDED";
  stageStates.CANONICAL.outputRefs = {
    canonicalPageRef,
  };
  stageStates.SHADOW_BIND_READY.state = "SUCCEEDED";
  stageStates.SHADOW_BIND_READY.outputRefs = {
    shadowBindReadyRef,
    publishCandidateRef: shadowBindReadyRef,
    artifactId: "artifact-activation-1",
    siteVersionId: "sv-activation-1",
    shadowEligibilityState: "ALLOWED",
    publishCandidateState: "READY_FOR_SHADOW_BIND",
  };

  const job: MigrationJob = {
    jobId: "job-activation-1",
    siteId: "site-activation-1",
    sourceUrl: "https://example.com",
    overallState: "COMPLETED",
    currentStage: null,
    stageStates,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    lastError: null,
    lastExecutionReport: null,
    lastActivationExecutionResult: null,
    activationExecutionHistory: [],
    executionEvents: [],
  };

  return { job, shadowBindReadyRef };
}

test("happy path shadow activation executes and persists report", async () => {
  const root = path.resolve(os.tmpdir(), "gnr8-mf-activation-tests", "happy");
  const { job, shadowBindReadyRef } = await prepareActivationFixture(root);

  const result = await executeMigrationFactoryActivation(
    { job, now: createDeterministicClock() },
    {
      upsertLineage: async () => undefined,
      executeActivation: async () => ({
        switched: true,
        previousActivePointer: null,
        newActivePointer: { siteVersionId: "sv-activation-1", artifactId: "artifact-activation-1" },
        activationOutcome: "ACTIVATED",
      }),
    },
  );

  assert.equal(result.activationOutcome, "ACTIVATED");
  assert.equal(result.switched, true);
  assert.equal(result.failureCode, undefined);
  const reportRef = path.resolve(path.dirname(shadowBindReadyRef), "activation-execution-report.json");
  const reportRaw = await fs.readFile(reportRef, "utf8");
  assert.ok(reportRaw.includes("\"activationOutcome\": \"ACTIVATED\""));
});

test("governance missing fails closed", async () => {
  const root = path.resolve(os.tmpdir(), "gnr8-mf-activation-tests", "governance-missing");
  const { job } = await prepareActivationFixture(root, { governanceMissing: true });

  const result = await executeMigrationFactoryActivation(
    { job, now: createDeterministicClock() },
    {
      upsertLineage: async () => undefined,
      executeActivation: async () => {
        throw new Error("must not execute orchestrator");
      },
    },
  );

  assert.equal(result.activationOutcome, "FAILED");
  assert.equal(result.failureCode, "PUBLISH_GOVERNANCE_MISSING");
});

test("lineage mismatch fails closed", async () => {
  const root = path.resolve(os.tmpdir(), "gnr8-mf-activation-tests", "lineage-mismatch");
  const { job } = await prepareActivationFixture(root, { lineageMismatch: true });

  const result = await executeMigrationFactoryActivation(
    { job, now: createDeterministicClock() },
    {
      upsertLineage: async () => undefined,
      executeActivation: async () => {
        throw new Error("must not execute orchestrator");
      },
    },
  );

  assert.equal(result.activationOutcome, "FAILED");
  assert.equal(result.failureCode, "PUBLISH_LINEAGE_MISMATCH");
});

test("integrity gate failure returns explicit publish payload invalid failure", async () => {
  const root = path.resolve(os.tmpdir(), "gnr8-mf-activation-tests", "integrity-fail");
  const { job } = await prepareActivationFixture(root, { integrityFail: true });

  const result = await executeMigrationFactoryActivation(
    { job, now: createDeterministicClock() },
    {
      upsertLineage: async () => undefined,
      executeActivation: async () => {
        throw new Error("must not execute orchestrator");
      },
    },
  );

  assert.equal(result.activationOutcome, "FAILED");
  assert.equal(result.failureCode, "PUBLISH_ARTIFACT_PAYLOAD_INVALID");
  assert.ok(result.reasons.some((reason) => reason.includes("ASSET_RESOLUTION_FAILED")));
});

test("already active returns SAFE_NOOP without throwing", async () => {
  const root = path.resolve(os.tmpdir(), "gnr8-mf-activation-tests", "safe-noop");
  const { job } = await prepareActivationFixture(root);

  const result = await executeMigrationFactoryActivation(
    { job, now: createDeterministicClock() },
    {
      upsertLineage: async () => undefined,
      executeActivation: async () => ({
        switched: false,
        previousActivePointer: { siteVersionId: "sv-activation-1", artifactId: "artifact-activation-1" },
        newActivePointer: { siteVersionId: "sv-activation-1", artifactId: "artifact-activation-1" },
        activationOutcome: "SAFE_NOOP",
      }),
    },
  );

  assert.equal(result.activationOutcome, "SAFE_NOOP");
  assert.equal(result.switched, false);
});

test("deterministic retry returns stable execution identity", async () => {
  const root = path.resolve(os.tmpdir(), "gnr8-mf-activation-tests", "deterministic-retry");
  const { job } = await prepareActivationFixture(root);
  const clock = createDeterministicClock();

  const deps = {
    upsertLineage: async () => undefined,
    executeActivation: async () => ({
      switched: false,
      previousActivePointer: { siteVersionId: "sv-activation-1", artifactId: "artifact-activation-1" },
      newActivePointer: { siteVersionId: "sv-activation-1", artifactId: "artifact-activation-1" },
      activationOutcome: "SAFE_NOOP" as const,
    }),
  };

  const first = await executeMigrationFactoryActivation({ job, now: clock }, deps);
  const second = await executeMigrationFactoryActivation({ job, now: clock }, deps);
  assert.equal(first.executionId, second.executionId);
  assert.equal(first.candidateRef, second.candidateRef);
  assert.equal(first.artifactId, second.artifactId);
});

test("resume after activation failure succeeds on retry through factory capability", async () => {
  const root = path.resolve(os.tmpdir(), "gnr8-mf-activation-tests", "resume-after-failure");
  const { shadowBindReadyRef } = await prepareActivationFixture(root);
  const now = createDeterministicClock();
  const store = new InMemoryMigrationJobStore({ now });
  const factory = new MigrationFactory({
    store,
    now,
    activationExecutor: async () => ({
      executionId: "resume-execution",
      candidateRef: shadowBindReadyRef,
      artifactId: "artifact-activation-1",
      siteVersionId: "sv-activation-1",
      activationOutcome: attempt++ === 0 ? "FAILED" : "ACTIVATED",
      switched: attempt > 1,
      previousActivePointer: null,
      newActivePointer: attempt > 1 ? { siteVersionId: "sv-activation-1", artifactId: "artifact-activation-1" } : null,
      enforcementState: "ALLOWED",
      publishStage: "shadow",
      failureCode: attempt === 1 ? "PUBLISH_ENFORCEMENT_DENIED" : undefined,
      reasons: attempt === 1 ? ["forced first activation failure"] : ["retry succeeded"],
    }),
  });

  const job = await factory.startMigrationJob({
    jobId: "job-activation-resume",
    siteId: "site-activation-1",
    sourceUrl: "https://example.com",
  });
  const seeded = await store.updateJob(job.jobId, {
    overallState: "COMPLETED",
    currentStage: null,
  });
  await store.updateStageState(seeded.jobId, "SHADOW_BIND_READY", {
    state: "SUCCEEDED",
    outputRefs: {
      shadowBindReadyRef,
      publishCandidateRef: shadowBindReadyRef,
      artifactId: "artifact-activation-1",
      siteVersionId: "sv-activation-1",
      shadowEligibilityState: "ALLOWED",
      publishCandidateState: "READY_FOR_SHADOW_BIND",
    },
  });
  await store.updateStageState(seeded.jobId, "CANONICAL", {
    state: "SUCCEEDED",
    outputRefs: { canonicalPageRef: path.resolve(root, "canonical-page.json") },
  });

  const first = await factory.executePublishActivation(job.jobId);
  const second = await factory.executePublishActivation(job.jobId);
  const persisted = await store.getJob(job.jobId);
  assert.ok(persisted);

  assert.equal(first.activationOutcome, "FAILED");
  assert.equal(second.activationOutcome, "ACTIVATED");
  assert.equal(persisted.activationExecutionHistory.length, 2);
  assert.equal(persisted.lastActivationExecutionResult?.activationOutcome, "ACTIVATED");
  assert.ok(persisted.executionEvents.some((event) => event.type === "ACTIVATION_EXECUTION_FAILED"));
  assert.ok(persisted.executionEvents.some((event) => event.type === "ACTIVATION_EXECUTION_SUCCEEDED"));
});
