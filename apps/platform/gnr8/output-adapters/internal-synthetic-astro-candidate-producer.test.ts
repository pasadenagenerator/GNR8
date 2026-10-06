import assert from "node:assert/strict";
import test from "node:test";

import {
  createAstroBuildExportProofEvidence,
  type AstroBuildExportProofEvidence,
  type InspectedAstroStaticExport,
} from "./astro-static-site-build-export-proof";
import type { PreparedAstroStaticSiteWorkspace } from "./astro-static-site-workspace-preparation";
import { createSyntheticAstroInternalPreviewCandidate } from "./astro-internal-preview-candidate-test-fixture";
import {
  createInternalSyntheticAstroCandidateProducer,
  INTERNAL_SYNTHETIC_ASTRO_FIXTURE_ID,
  InternalSyntheticAstroCandidateProducerError,
} from "./internal-synthetic-astro-candidate-producer";

const CANDIDATE_ID = "astro_candidate_11111111111141118111111111111111";
const SITE_VERSION_ID = "33333333-3333-4333-8333-333333333333";
const CREATED_AT = "2026-09-28T10:00:00.000Z";

test("named producer invokes prepare, build/export inspection, bridge conversion, and completed cleanup in order", async () => {
  const calls: string[] = [];
  const prepared = preparedWorkspace();
  const inspected = {} as InspectedAstroStaticExport;
  const producer = createInternalSyntheticAstroCandidateProducer({
    prepareWorkspace: async () => {
      calls.push("prepare");
      return prepared;
    },
    inspectExport: async () => {
      calls.push("inspect");
      return inspected;
    },
    convertExport: async (input) => {
      calls.push("bridge");
      assert.equal(input.inspectedExport, inspected);
      assert.equal(input.sourceSnapshotSha256, prepared.sourceSnapshot.aggregateSha256);
      assert.equal(input.candidateId, CANDIDATE_ID);
      assert.equal(input.createdAt, CREATED_AT);
      return createSyntheticAstroInternalPreviewCandidate({
        candidateId: input.candidateId,
        siteId: input.siteId,
        siteVersionId: input.siteVersionId,
        createdAt: input.createdAt,
      });
    },
    runBuildExport: async (input) => {
      calls.push("build-export");
      await input.dependencies?.prepareWorkspace?.({ content: input.content! });
      await input.dependencies?.inspectExport?.(prepared.workspacePath, input.verification);
      calls.push("cleanup");
      return completedEvidence();
    },
  });

  const candidate = await producer.produce({
    candidateId: CANDIDATE_ID,
    candidateCreatedAt: CREATED_AT,
    ownership: ownership(),
    syntheticInput: { fixtureId: INTERNAL_SYNTHETIC_ASTRO_FIXTURE_ID },
  });
  assert.equal(candidate.id, CANDIDATE_ID);
  assert.equal(candidate.createdAt, CREATED_AT);
  assert.deepEqual(calls, ["build-export", "prepare", "inspect", "bridge", "cleanup"]);
});

test("named producer rejects non-allowlisted input without invoking stages", async () => {
  let invoked = false;
  const producer = createInternalSyntheticAstroCandidateProducer({
    runBuildExport: async () => {
      invoked = true;
      return completedEvidence();
    },
  });
  assert.equal(producer.supports({ fixtureId: "arbitrary_html" }), false);
  await assert.rejects(
    () => producer.produce({
      candidateId: CANDIDATE_ID,
      candidateCreatedAt: CREATED_AT,
      ownership: ownership(),
      syntheticInput: { fixtureId: "arbitrary_html" },
    }),
    (error: unknown) => error instanceof InternalSyntheticAstroCandidateProducerError && error.code === "unsupported_input",
  );
  assert.equal(invoked, false);
});

test("named producer exposes cleanup failure and build failure only before a candidate can be registered", async (t) => {
  await t.test("incomplete cleanup evidence", async () => {
    const producer = producerWithCompletedCandidate(() => ({
      ...completedEvidence(),
      cleanup: { completed: false, errors: ["workspace:stub cleanup failed"] },
      workspace: { ...completedEvidence().workspace, removed: false },
    }));
    await assert.rejects(
      () => producer.produce(producerInput()),
      (error: unknown) =>
        error instanceof InternalSyntheticAstroCandidateProducerError && error.code === "cleanup_incomplete",
    );
  });

  await t.test("build failure with producer-owned cleanup", async () => {
    let cleanupRan = false;
    const producer = createInternalSyntheticAstroCandidateProducer({
      runBuildExport: async () => {
        cleanupRan = true;
        throw new Error("stub build failed after cleanup");
      },
    });
    await assert.rejects(
      () => producer.produce(producerInput()),
      (error: unknown) =>
        error instanceof InternalSyntheticAstroCandidateProducerError && error.code === "production_failed",
    );
    assert.equal(cleanupRan, true);
  });
});

function producerWithCompletedCandidate(evidence: () => AstroBuildExportProofEvidence) {
  const prepared = preparedWorkspace();
  return createInternalSyntheticAstroCandidateProducer({
    prepareWorkspace: async () => prepared,
    inspectExport: async () => ({} as InspectedAstroStaticExport),
    convertExport: async (input) => createSyntheticAstroInternalPreviewCandidate({
      candidateId: input.candidateId,
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      createdAt: input.createdAt,
    }),
    runBuildExport: async (input) => {
      await input.dependencies?.prepareWorkspace?.({ content: input.content! });
      await input.dependencies?.inspectExport?.(prepared.workspacePath, input.verification);
      return evidence();
    },
  });
}

function producerInput() {
  return {
    candidateId: CANDIDATE_ID,
    candidateCreatedAt: CREATED_AT,
    ownership: ownership(),
    syntheticInput: { fixtureId: INTERNAL_SYNTHETIC_ASTRO_FIXTURE_ID },
  };
}

function ownership() {
  return {
    runtimeSiteId: "runtime-site-mvp15",
    siteVersionId: SITE_VERSION_ID,
    ownershipSiteId: "55555555-5555-4555-8555-555555555555",
    organizationId: "66666666-6666-4666-8666-666666666666",
    agencyId: "77777777-7777-4777-8777-777777777777",
  };
}

function preparedWorkspace(): PreparedAstroStaticSiteWorkspace {
  return {
    adapterId: "astro-static-site",
    workspacePath: "/tmp/mvp15-synthetic-producer-stub",
    baselineCommit: "0".repeat(40),
    baselineKind: "git-commit",
    sourceSnapshot: {
      version: "gnr8-astro-source-snapshot:v1",
      files: [{ path: "package.json", bytes: 2, sha256: "a".repeat(64) }],
      aggregateSha256: "b".repeat(64),
    },
    snapshotInclusionRules: [],
    futureStepMetadata: {
      previewPort: 4321,
      devCommand: { command: "pnpm dev", cwdHint: "workspace-root" },
      buildCommand: { command: "pnpm build", cwdHint: "workspace-root" },
    },
    executionBoundaries: {
      proofOnly: true,
      dependenciesInstalled: false,
      devServerExecuted: false,
      buildExecuted: false,
      previewServerExecuted: false,
      airshipExecuted: false,
    },
  };
}

function completedEvidence(): AstroBuildExportProofEvidence {
  const evidence = createAstroBuildExportProofEvidence();
  evidence.workspace.path = "/tmp/mvp15-synthetic-producer-stub";
  evidence.workspace.removed = true;
  evidence.cleanup.completed = true;
  evidence.cleanup.errors = [];
  return evidence;
}
