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
import {
  GENERATED_WEBSITE_PROPOSAL_ARTIFACT_KIND,
  GeneratedWebsiteProposalPersistenceValidationError,
  loadGeneratedWebsiteProposalById,
  loadLatestGeneratedWebsiteProposal,
  persistGeneratedWebsiteProposal,
  type GeneratedWebsiteProposalProvenanceSummary,
} from "./generated-website-proposal-persistence";
import { buildWebsiteDesignBrief } from "./website-design-brief-builder";
import { buildWebsiteGenerationPackage } from "./website-generation-package-builder";
import {
  alignedDigitalBusinessTwinFixture,
  businessAlignmentFixture,
  WDB_TEST_CREATED_AT,
  WDB_TEST_DRY_RUN_ID,
  WDB_TEST_SITE_VERSION_ID,
} from "./website-design-brief-test-fixtures";

const SOURCE_WGP_ARTIFACT_ID = "website_generation_package_test_artifact_1";
const SOURCE_PAYLOAD_ARTIFACT_ID = "provider_generation_payload_test_artifact_1";
const OUTPUT_BUNDLE_ID = "manual_codex_output_bundle_test_1";

function sourceArtifacts() {
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
    contentHash: "sha256:testhash",
    submittedAt: WDB_TEST_CREATED_AT,
    submittedBy: "operator:test",
    fileCount: 4,
    byteSize: 2048,
    entrypoints: ["README.md", "src/main.tsx"],
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
  sources: ReturnType<typeof sourceArtifacts>,
  input: Partial<GeneratedWebsiteProposalOperatorAttestation> = {},
): GeneratedWebsiteProposalOperatorAttestation {
  return {
    attestationId: "operator_attestation_test_1",
    operatorId: "operator:test",
    attestedAt: WDB_TEST_CREATED_AT,
    sourceProviderGenerationPayloadId: sources.payload.providerGenerationPayloadId,
    sourceProviderGenerationPayloadArtifactId: SOURCE_PAYLOAD_ARTIFACT_ID,
    sourceWebsiteGenerationPackageId: sources.wgp.websiteGenerationPackageId,
    sourceWebsiteGenerationPackageArtifactId: SOURCE_WGP_ARTIFACT_ID,
    outputBundleId: input.outputBundleId ?? OUTPUT_BUNDLE_ID,
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
    diagnostics: ["OPERATOR_ATTESTED_PROPOSAL_ONLY"],
    ...input,
  };
}

function artifact(input: {
  createdAt?: string;
  outputBundleId?: string;
  extraDiagnostic?: string;
  status?: GeneratedWebsiteProposalArtifact["status"];
  readiness?: Partial<GeneratedWebsiteProposalArtifact["validationReadiness"]>;
} = {}): GeneratedWebsiteProposalArtifact {
  const sources = sourceArtifacts();
  const bundle = outputBundle(input.outputBundleId ? { outputBundleId: input.outputBundleId } : {});
  const value = buildGeneratedWebsiteProposalFromManualOutput({
    sourceProviderGenerationPayload: sources.payload,
    sourceProviderGenerationPayloadArtifactId: SOURCE_PAYLOAD_ARTIFACT_ID,
    sourceWebsiteGenerationPackage: sources.wgp,
    sourceWebsiteGenerationPackageArtifactId: SOURCE_WGP_ARTIFACT_ID,
    source: {
      executionProviderName: "manual_codex",
      executedAt: WDB_TEST_CREATED_AT,
      operatorReference: "operator:test",
      sourcePayloadReference: "object://provider-payload/test.json",
      copiedPayloadIntegrity: "attested",
      diagnostics: ["MANUAL_CODEX_EXECUTION_METADATA_PRESENT"],
    },
    outputBundle: bundle,
    operatorAttestation: attestation(sources, { outputBundleId: bundle.outputBundleId }),
    providerNotes: ["Manual provider notes are quarantined proposal material only."],
    implementationAssumptions: ["Future observation must inspect the output before compliance."],
    knownLimitations: ["No generated content has been executed by GNR8."],
    createdAt: input.createdAt ?? WDB_TEST_CREATED_AT,
  });
  return {
    ...value,
    ...(input.status ? { status: input.status } : {}),
    validationReadiness: input.readiness
      ? { ...value.validationReadiness, ...input.readiness }
      : value.validationReadiness,
    diagnostics: input.extraDiagnostic
      ? [...value.diagnostics, input.extraDiagnostic]
      : value.diagnostics,
  };
}

function memoryStore() {
  let summary = { kind: "runtime_import_provenance_summary_v1" } as RuntimeImportProvenanceSummary;
  let writes = 0;
  return {
    get summary() { return summary as GeneratedWebsiteProposalProvenanceSummary; },
    get writes() { return writes; },
    options: {
      persistedAt: "2026-07-05T12:30:00.000Z",
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
  return persistGeneratedWebsiteProposal({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    dryRunId: WDB_TEST_DRY_RUN_ID,
    artifact: value,
    options: { ...store.options, persistedAt: persistedAt ?? store.options.persistedAt },
  });
}

test("quarantined Generated Website Proposal persists with complete metadata", async () => {
  const store = memoryStore();
  const value = artifact();
  const ref = await persist(store, value);

  assert.equal(ref.kind, GENERATED_WEBSITE_PROPOSAL_ARTIFACT_KIND);
  assert.equal(ref.artifactKind, GENERATED_WEBSITE_PROPOSAL_ARTIFACT_KIND);
  assert.equal(ref.siteVersionId, WDB_TEST_SITE_VERSION_ID);
  assert.equal(ref.dryRunId, WDB_TEST_DRY_RUN_ID);
  assert.equal(ref.generatedWebsiteProposalId, value.generatedWebsiteProposalId);
  assert.equal(ref.sourceProviderGenerationPayloadId, value.sourceProviderGenerationPayloadId);
  assert.equal(ref.sourceProviderGenerationPayloadArtifactId, SOURCE_PAYLOAD_ARTIFACT_ID);
  assert.equal(ref.sourceWebsiteGenerationPackageId, value.sourceWebsiteGenerationPackageId);
  assert.equal(ref.sourceWebsiteGenerationPackageArtifactId, SOURCE_WGP_ARTIFACT_ID);
  assert.equal(ref.outputBundleId, OUTPUT_BUNDLE_ID);
  assert.equal(ref.operatorAttestationId, value.operatorAttestation.attestationId);
  assert.equal(ref.status, "quarantined");
  assert.equal(ref.readiness, "ready");
  assert.equal(ref.readyForCompliance, true);
  assert.equal(ref.runtimeVersion, "MVP-1K-1");
  assert.deepEqual(ref.validation, { valid: true, errors: [], warnings: [] });
  assert.deepEqual(ref.diagnostics, ["GENERATED_WEBSITE_PROPOSAL_ARTIFACT_VALIDATION_PASSED"]);
  assert.deepEqual(store.summary.generatedWebsiteProposalArtifacts?.[0]?.artifact, value);
});

test("latest and by-id loads return cloned full Generated Website Proposal records", async () => {
  const store = memoryStore();
  const ref = await persist(store);
  const latest = await loadLatestGeneratedWebsiteProposal({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    options: store.options,
  });
  const byId = await loadGeneratedWebsiteProposalById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: ref.artifactId,
    options: store.options,
  });

  assert.equal(latest?.artifactId, ref.artifactId);
  assert.deepEqual(byId, latest);
  latest!.artifact.diagnostics[0] = "MUTATED";
  assert.notEqual((await loadLatestGeneratedWebsiteProposal({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    options: store.options,
  }))?.artifact.diagnostics[0], "MUTATED");
  assert.equal(await loadGeneratedWebsiteProposalById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: "missing",
    options: store.options,
  }), null);
});

test("equivalent latest Generated Website Proposal reuses existing record", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const equivalent = artifact({ createdAt: "2026-07-05T13:00:00.000Z" });
  const second = await persist(store, equivalent, "2026-07-05T13:30:00.000Z");

  assert.equal(second.artifactId, first.artifactId);
  assert.equal(store.writes, 1);
  assert.equal(store.summary.generatedWebsiteProposalArtifacts?.length, 1);
  assert.equal(store.summary.latestGeneratedWebsiteProposalArtifact?.artifactId, first.artifactId);
});

test("changed Generated Website Proposal appends history and advances latest", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const changed = artifact({
    outputBundleId: "manual_codex_output_bundle_test_2",
    extraDiagnostic: "GENERATED_WEBSITE_PROPOSAL_CHANGED",
  });
  const second = await persist(store, changed, "2026-07-05T12:35:00.000Z");

  assert.notEqual(second.artifactId, first.artifactId);
  assert.equal(store.writes, 2);
  assert.equal(store.summary.generatedWebsiteProposalArtifacts?.length, 2);
  assert.equal(store.summary.latestGeneratedWebsiteProposalArtifact?.artifactId, second.artifactId);
  assert.equal((await loadLatestGeneratedWebsiteProposal({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    dryRunId: WDB_TEST_DRY_RUN_ID,
    options: store.options,
  }))?.artifactId, second.artifactId);
  assert.equal((await loadGeneratedWebsiteProposalById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: first.artifactId,
    options: store.options,
  }))?.artifactId, first.artifactId);
});

test("invalid proposal rejects while blocked and superseded proposals remain persistable and loadable", async () => {
  const store = memoryStore();
  await assert.rejects(() => persist(store, artifact({ status: "invalid" })), (error: unknown) => {
    assert.ok(error instanceof GeneratedWebsiteProposalPersistenceValidationError);
    assert.ok(error.validation.errors.includes("Generated Website Proposal status must not be invalid for persistence"));
    return true;
  });

  const blocked = artifact({
    status: "blocked",
    readiness: {
      readiness: "blocked",
      readyForCompliance: false,
      blockers: ["OPERATOR_REVIEW_BLOCKED"],
    },
  });
  const blockedRef = await persist(store, blocked);
  const superseded = artifact({
    outputBundleId: "manual_codex_output_bundle_test_superseded",
    status: "superseded",
  });
  const supersededRef = await persist(store, superseded, "2026-07-05T12:40:00.000Z");

  assert.equal(blockedRef.status, "blocked");
  assert.equal(supersededRef.status, "superseded");
  assert.equal((await loadGeneratedWebsiteProposalById({
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    artifactId: supersededRef.artifactId,
    options: store.options,
  }))?.status, "superseded");
});

test("compliance_ready persistence requires validation readiness to allow it", async () => {
  const store = memoryStore();
  await assert.rejects(() => persist(store, artifact({
    status: "compliance_ready",
    readiness: {
      readiness: "blocked",
      readyForCompliance: false,
      blockers: ["OBSERVATION_NOT_AUTHORIZED"],
    },
  })), (error: unknown) => {
    assert.ok(error instanceof GeneratedWebsiteProposalPersistenceValidationError);
    assert.ok(error.validation.errors.includes(
      "validationReadiness.readiness must be ready when status is compliance_ready",
    ));
    return true;
  });

  const ready = artifact({ status: "compliance_ready" });
  const ref = await persist(store, ready);
  assert.equal(ref.status, "compliance_ready");
  assert.equal(ref.readyForCompliance, true);
});
