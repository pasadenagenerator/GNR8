import assert from "node:assert/strict";
import test from "node:test";

import { buildCodexTaskProviderPayload } from "./codex-task-provider-payload-builder";
import {
  GENERATED_WEBSITE_PROPOSAL_CONTRACT_VERSION,
  validateGeneratedWebsiteProposal,
  type GeneratedWebsiteProposalArtifact,
  type GeneratedWebsiteProposalOperatorAttestation,
  type GeneratedWebsiteProposalOutputBundle,
} from "./generated-website-proposal-contract";
import { buildGeneratedWebsiteProposalFromManualOutput } from "./generated-website-proposal-import";
import { buildWebsiteDesignBrief } from "./website-design-brief-builder";
import { buildWebsiteGenerationPackage } from "./website-generation-package-builder";
import {
  alignedDigitalBusinessTwinFixture,
  businessAlignmentFixture,
  WDB_TEST_CREATED_AT,
} from "./website-design-brief-test-fixtures";

const SOURCE_WGP_ARTIFACT_ID = "website_generation_package_test_artifact_1";
const SOURCE_PAYLOAD_ARTIFACT_ID = "provider_generation_payload_test_artifact_1";
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
    diagnostics: ["OPERATOR_ATTESTED_PROPOSAL_ONLY"],
    ...input,
  };
}

function proposal(): GeneratedWebsiteProposalArtifact {
  const source = sources();
  return buildGeneratedWebsiteProposalFromManualOutput({
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
    providerNotes: ["Manual Codex notes are proposal material only."],
    implementationAssumptions: ["Implementation assumptions require future compliance review."],
    knownLimitations: ["Generated output has not been observed or compared."],
    createdAt: WDB_TEST_CREATED_AT,
  });
}

test("valid quarantined Generated Website Proposal contract preserves source lineage and output metadata", () => {
  const value = proposal();
  const validation = validateGeneratedWebsiteProposal(value);

  assert.equal(validation.valid, true);
  assert.equal(value.contractVersion, GENERATED_WEBSITE_PROPOSAL_CONTRACT_VERSION);
  assert.equal(value.status, "quarantined");
  assert.equal(value.sourceProviderGenerationPayloadId, value.lineage.sourceProviderGenerationPayloadId);
  assert.equal(value.sourceWebsiteGenerationPackageId, value.lineage.sourceWebsiteGenerationPackageId);
  assert.equal(value.lineage.sourceProviderGenerationPayloadArtifactId, SOURCE_PAYLOAD_ARTIFACT_ID);
  assert.equal(value.lineage.sourceWebsiteGenerationPackageArtifactId, SOURCE_WGP_ARTIFACT_ID);
  assert.equal(value.outputBundle.outputBundleId, OUTPUT_BUNDLE_ID);
  assert.equal(value.outputBundle.classification, "implementation_proposal_only");
  assert.equal(value.safety.trusted, false);
  assert.equal(value.safety.executableByGnr8, false);
});

test("forbidden canonical artifacts and mutation artifacts are rejected recursively", () => {
  const value = proposal();
  const forbiddenBusinessArtifact = {
    ...value,
    source: {
      ...value.source,
      businessDiscovery: { id: "not-allowed" },
    },
  } as unknown as GeneratedWebsiteProposalArtifact;
  const forbiddenMutation = {
    ...value,
    outputBundle: {
      ...value.outputBundle,
      deploymentArtifact: { id: "not-allowed" },
      dnsMutation: { id: "not-allowed" },
    },
  } as unknown as GeneratedWebsiteProposalArtifact;

  assert.ok(validateGeneratedWebsiteProposal(forbiddenBusinessArtifact).errors.some((error) =>
    error.includes("businessDiscovery is forbidden")));
  assert.ok(validateGeneratedWebsiteProposal(forbiddenMutation).errors.some((error) =>
    error.includes("deploymentArtifact is forbidden")));
  assert.ok(validateGeneratedWebsiteProposal(forbiddenMutation).errors.some((error) =>
    error.includes("dnsMutation is forbidden")));
});

test("compliance_ready status is gated by validation readiness", () => {
  const value = proposal();
  const notReady = {
    ...value,
    status: "compliance_ready",
    validationReadiness: {
      ...value.validationReadiness,
      readiness: "blocked",
      readyForCompliance: false,
      blockers: ["OBSERVATION_NOT_AUTHORIZED"],
    },
  } as unknown as GeneratedWebsiteProposalArtifact;
  const ready = {
    ...value,
    status: "compliance_ready",
  } as GeneratedWebsiteProposalArtifact;

  assert.ok(validateGeneratedWebsiteProposal(notReady).errors.includes(
    "validationReadiness.readiness must be ready when status is compliance_ready",
  ));
  assert.equal(validateGeneratedWebsiteProposal(ready).valid, true);
});

test("safety flags keep proposal untrusted and non-mutating", () => {
  const value = proposal();
  const unsafe = {
    ...value,
    safety: {
      ...value.safety,
      publishingAllowed: true,
      canonicalTruthUpdateAllowed: true,
    },
  } as unknown as GeneratedWebsiteProposalArtifact;

  assert.equal(value.safety.publishingAllowed, false);
  assert.equal(value.safety.deploymentAllowed, false);
  assert.equal(value.safety.dnsMutationAllowed, false);
  assert.equal(value.safety.productionMutationAllowed, false);
  assert.equal(value.safety.runtimeMutationAllowed, false);
  assert.equal(value.safety.complianceExecutionAllowed, false);
  assert.equal(value.safety.businessApprovalAllowed, false);
  assert.ok(validateGeneratedWebsiteProposal(unsafe).errors.includes("safety.publishingAllowed must be false"));
  assert.ok(validateGeneratedWebsiteProposal(unsafe).errors.includes("safety.canonicalTruthUpdateAllowed must be false"));
});
