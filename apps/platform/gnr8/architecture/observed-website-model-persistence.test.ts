import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { buildCodexTaskProviderPayload } from "./codex-task-provider-payload-builder";
import {
  type GeneratedWebsiteProposalArtifact,
  type GeneratedWebsiteProposalOperatorAttestation,
  type GeneratedWebsiteProposalOutputBundle,
} from "./generated-website-proposal-contract";
import { buildGeneratedWebsiteProposalFromManualOutput } from "./generated-website-proposal-import";
import { buildObservedWebsiteModel, type ObservedWebsiteModelOutputMetadata } from "./observed-website-model-builder";
import type { ObservedWebsiteModelArtifact } from "./observed-website-model-contract";
import {
  loadLatestObservedWebsiteModel,
  loadObservedWebsiteModelById,
  OBSERVED_WEBSITE_MODEL_ARTIFACT_KIND,
  ObservedWebsiteModelPersistenceValidationError,
  persistObservedWebsiteModel,
  type ObservedWebsiteModelProvenanceSummary,
} from "./observed-website-model-persistence";
import { buildWebsiteDesignBrief } from "./website-design-brief-builder";
import {
  alignedDigitalBusinessTwinFixture,
  businessAlignmentFixture,
  WDB_TEST_CREATED_AT,
  WDB_TEST_DRY_RUN_ID,
  WDB_TEST_SITE_VERSION_ID,
} from "./website-design-brief-test-fixtures";
import { buildWebsiteGenerationPackage } from "./website-generation-package-builder";

const SOURCE_WGP_ARTIFACT_ID = "website_generation_package_test_artifact_1";
const SOURCE_PAYLOAD_ARTIFACT_ID = "provider_generation_payload_test_artifact_1";
const SOURCE_PROPOSAL_ARTIFACT_ID = "generated_website_proposal_test_artifact_1";
const OUTPUT_BUNDLE_ID = "manual_codex_output_bundle_test_1";

function sources() {
  const dbt = alignedDigitalBusinessTwinFixture();
  const wdb = buildWebsiteDesignBrief({
    alignedDigitalBusinessTwin: dbt,
    businessAlignment: businessAlignmentFixture(dbt.digitalBusinessTwinId),
    createdAt: WDB_TEST_CREATED_AT,
  });
  const wgp = buildWebsiteGenerationPackage({
    websiteDesignBrief: wdb,
    createdAt: WDB_TEST_CREATED_AT,
  });
  const payload = buildCodexTaskProviderPayload({
    websiteGenerationPackage: wgp,
    sourceWebsiteGenerationPackageArtifactId: SOURCE_WGP_ARTIFACT_ID,
    createdAt: WDB_TEST_CREATED_AT,
  });
  return { payload, wgp };
}

function outputBundle(input: Partial<GeneratedWebsiteProposalOutputBundle> = {}): GeneratedWebsiteProposalOutputBundle {
  return {
    outputBundleId: OUTPUT_BUNDLE_ID,
    bundleKind: "manual_codex_output_bundle",
    classification: "implementation_proposal_only",
    storageReference: "object://manual-codex-output/test-bundle",
    contentReference: "object://manual-codex-output/test-bundle/archive.zip",
    submittedAt: WDB_TEST_CREATED_AT,
    submittedBy: "operator:test",
    entrypoints: [],
    containsPublishingArtifact: false,
    containsDeploymentArtifact: false,
    containsDnsMutationArtifact: false,
    containsRuntimeMutationArtifact: false,
    containsComplianceReport: false,
    containsBusinessApproval: false,
    diagnostics: ["OUTPUT_BUNDLE_METADATA_ONLY"],
    ...input,
  };
}

function attestation(
  source: ReturnType<typeof sources>,
  input: Partial<GeneratedWebsiteProposalOperatorAttestation> = {},
): GeneratedWebsiteProposalOperatorAttestation {
  return {
    attestationId: "operator_attestation_test_1",
    operatorId: "operator:test",
    attestedAt: WDB_TEST_CREATED_AT,
    sourceProviderGenerationPayloadId: source.payload.providerGenerationPayloadId,
    sourceProviderGenerationPayloadArtifactId: SOURCE_PAYLOAD_ARTIFACT_ID,
    sourceWebsiteGenerationPackageId: source.wgp.websiteGenerationPackageId,
    sourceWebsiteGenerationPackageArtifactId: SOURCE_WGP_ARTIFACT_ID,
    outputBundleId: OUTPUT_BUNDLE_ID,
    implementationProposalOnly: true,
    outputNotExecutedByGnr8: true,
    noGnr8ProviderCall: true,
    noGnr8AiExecution: true,
    noPublishing: true,
    noDeployment: true,
    noDnsMutation: true,
    noProductionMutation: true,
    noRuntimeMutation: true,
    noComplianceExecution: true,
    noBusinessApproval: true,
    noCanonicalTruthUpdate: true,
    generatedOutputReferencedOnly: true,
    statement: "Manual Codex output is an implementation proposal only and remains quarantined.",
    diagnostics: [],
    ...input,
  };
}

function proposal(input: { status?: GeneratedWebsiteProposalArtifact["status"] } = {}): GeneratedWebsiteProposalArtifact {
  const source = sources();
  const value = buildGeneratedWebsiteProposalFromManualOutput({
    sourceProviderGenerationPayload: source.payload,
    sourceProviderGenerationPayloadArtifactId: SOURCE_PAYLOAD_ARTIFACT_ID,
    sourceWebsiteGenerationPackage: source.wgp,
    sourceWebsiteGenerationPackageArtifactId: SOURCE_WGP_ARTIFACT_ID,
    source: {
      executionProviderName: "manual_codex",
      executedAt: WDB_TEST_CREATED_AT,
      operatorReference: "operator:test",
      sourcePayloadReference: "object://provider-payload/test.json",
      copiedPayloadIntegrity: "attested",
      diagnostics: ["MANUAL_CODEX_EXECUTION_METADATA_PRESENT"],
    },
    outputBundle: outputBundle(),
    operatorAttestation: attestation(source),
    providerNotes: [],
    implementationAssumptions: [],
    knownLimitations: [],
    createdAt: WDB_TEST_CREATED_AT,
  });
  return input.status ? { ...value, status: input.status } : value;
}

const metadata: ObservedWebsiteModelOutputMetadata = {
  routes: [{ routePath: "/", title: "Home" }],
  fileInventory: [{ path: "src/main.tsx", kind: "entrypoint" }],
  messages: [{ routePath: "/", textSummary: "Welcome message exists." }],
  technicalSignals: [{ signalType: "framework", value: "react" }],
};

function artifact(input: {
  metadata?: ObservedWebsiteModelOutputMetadata;
  createdAt?: string;
  status?: ObservedWebsiteModelArtifact["status"];
  readinessStatus?: ObservedWebsiteModelArtifact["readiness"]["status"];
} = {}): ObservedWebsiteModelArtifact {
  const value = buildObservedWebsiteModel({
    sourceGeneratedWebsiteProposal: proposal(),
    sourceGeneratedWebsiteProposalArtifactId: SOURCE_PROPOSAL_ARTIFACT_ID,
    outputMetadata: input.metadata ?? metadata,
    createdAt: input.createdAt ?? WDB_TEST_CREATED_AT,
  });
  return {
    ...value,
    ...(input.status ? { status: input.status } : {}),
    readiness: input.readinessStatus
      ? { ...value.readiness, status: input.readinessStatus }
      : value.readiness,
  };
}

function memoryStore() {
  let summary = { kind: "runtime_import_provenance_summary_v1" } as RuntimeImportProvenanceSummary;
  let writes = 0;
  return {
    get summary() { return summary as ObservedWebsiteModelProvenanceSummary; },
    get writes() { return writes; },
    options: {
      persistedAt: "2026-07-05T13:30:00.000Z",
      getSiteVersion: async (siteVersionId: string) =>
        siteVersionId === WDB_TEST_SITE_VERSION_ID ? { importProvenanceSummary: summary } : null,
      setSiteVersionImportProvenanceSummary: async (input: {
        siteVersionId: string;
        importProvenanceSummary: RuntimeImportProvenanceSummary;
      }) => {
        assert.equal(input.siteVersionId, WDB_TEST_SITE_VERSION_ID);
        summary = input.importProvenanceSummary;
        writes += 1;
        return { affectedRows: 1 };
      },
    },
  };
}

async function persist(
  store: ReturnType<typeof memoryStore>,
  value = artifact(),
  persistedAt?: string,
) {
  return persistObservedWebsiteModel({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    dryRunId: WDB_TEST_DRY_RUN_ID,
    artifact: value,
    options: { ...store.options, persistedAt: persistedAt ?? store.options.persistedAt },
  });
}

test("observable Observed Website Model persists with complete metadata", async () => {
  const store = memoryStore();
  const value = artifact();
  const ref = await persist(store, value);

  assert.equal(ref.kind, OBSERVED_WEBSITE_MODEL_ARTIFACT_KIND);
  assert.equal(ref.artifactKind, OBSERVED_WEBSITE_MODEL_ARTIFACT_KIND);
  assert.equal(ref.siteVersionId, WDB_TEST_SITE_VERSION_ID);
  assert.equal(ref.dryRunId, WDB_TEST_DRY_RUN_ID);
  assert.equal(ref.observedWebsiteModelId, value.observedWebsiteModelId);
  assert.equal(ref.sourceGeneratedWebsiteProposalId, value.sourceGeneratedWebsiteProposalId);
  assert.equal(ref.sourceGeneratedWebsiteProposalArtifactId, SOURCE_PROPOSAL_ARTIFACT_ID);
  assert.equal(ref.sourceProviderGenerationPayloadId, value.sourceProviderGenerationPayloadId);
  assert.equal(ref.sourceWebsiteGenerationPackageId, value.sourceWebsiteGenerationPackageId);
  assert.equal(ref.status, "observable");
  assert.equal(ref.pageCount, 1);
  assert.equal(ref.runtimeVersion, "MVP-1K-3");
  assert.deepEqual(ref.validation, { valid: true, errors: [], warnings: [] });
  assert.deepEqual(store.summary.observedWebsiteModelArtifacts?.[0]?.artifact, value);
});

test("latest and by-id loads return cloned full Observed Website Model records", async () => {
  const store = memoryStore();
  const ref = await persist(store);
  const latest = await loadLatestObservedWebsiteModel({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    options: store.options,
  });
  const byId = await loadObservedWebsiteModelById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: ref.artifactId,
    options: store.options,
  });

  assert.equal(latest?.artifactId, ref.artifactId);
  assert.deepEqual(byId, latest);
  latest!.artifact.diagnostics[0] = "MUTATED";
  assert.notEqual((await loadLatestObservedWebsiteModel({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    options: store.options,
  }))?.artifact.diagnostics[0], "MUTATED");
  assert.equal(await loadObservedWebsiteModelById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: "missing",
    options: store.options,
  }), null);
});

test("equivalent latest Observed Website Model reuses existing record", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const equivalent = artifact({ createdAt: "2026-07-05T14:00:00.000Z" });
  const second = await persist(store, equivalent, "2026-07-05T14:30:00.000Z");

  assert.equal(second.artifactId, first.artifactId);
  assert.equal(store.writes, 1);
  assert.equal(store.summary.observedWebsiteModelArtifacts?.length, 1);
  assert.equal(store.summary.latestObservedWebsiteModelArtifact?.artifactId, first.artifactId);
});

test("changed Observed Website Model appends history and advances latest", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const changed = artifact({
    metadata: {
      ...metadata,
      routes: [{ routePath: "/", title: "Home" }, { routePath: "/about", title: "About" }],
    },
  });
  const second = await persist(store, changed, "2026-07-05T13:35:00.000Z");

  assert.notEqual(second.artifactId, first.artifactId);
  assert.equal(store.writes, 2);
  assert.equal(store.summary.observedWebsiteModelArtifacts?.length, 2);
  assert.equal(store.summary.latestObservedWebsiteModelArtifact?.artifactId, second.artifactId);
  assert.equal((await loadLatestObservedWebsiteModel({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    dryRunId: WDB_TEST_DRY_RUN_ID,
    options: store.options,
  }))?.artifactId, second.artifactId);
  assert.equal((await loadObservedWebsiteModelById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: first.artifactId,
    options: store.options,
  }))?.artifactId, first.artifactId);
});

test("invalid and stale observations reject while blocked observations persist", async () => {
  const store = memoryStore();
  await assert.rejects(() => persist(store, artifact({
    status: "invalid",
    readinessStatus: "not_observable",
  })), (error: unknown) => {
    assert.ok(error instanceof ObservedWebsiteModelPersistenceValidationError);
    assert.ok(error.validation.errors.includes(
      "Observed Website Model status must not be invalid or stale for persistence",
    ));
    return true;
  });
  await assert.rejects(() => persist(store, artifact({
    status: "stale",
    readinessStatus: "not_observable",
  })), (error: unknown) => {
    assert.ok(error instanceof ObservedWebsiteModelPersistenceValidationError);
    assert.ok(error.validation.errors.includes(
      "Observed Website Model status must not be invalid or stale for persistence",
    ));
    return true;
  });

  const blocked = buildObservedWebsiteModel({
    sourceGeneratedWebsiteProposal: proposal({ status: "blocked" }),
    sourceGeneratedWebsiteProposalArtifactId: SOURCE_PROPOSAL_ARTIFACT_ID,
    outputMetadata: metadata,
  });
  const ref = await persist(store, blocked);
  assert.equal(ref.status, "blocked");
  assert.equal((await loadObservedWebsiteModelById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: ref.artifactId,
    options: store.options,
  }))?.status, "blocked");
});
