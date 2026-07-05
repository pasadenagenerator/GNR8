import assert from "node:assert/strict";
import test from "node:test";

import { buildCodexTaskProviderPayload } from "./codex-task-provider-payload-builder";
import {
  type GeneratedWebsiteProposalOperatorAttestation,
  type GeneratedWebsiteProposalOutputBundle,
} from "./generated-website-proposal-contract";
import { buildGeneratedWebsiteProposalFromManualOutput } from "./generated-website-proposal-import";
import { buildObservedWebsiteModel } from "./observed-website-model-builder";
import {
  OBSERVED_WEBSITE_MODEL_CONTRACT_VERSION,
  OBSERVED_WEBSITE_STATUSES,
  validateObservedWebsiteModel,
  type ObservedWebsiteModelArtifact,
} from "./observed-website-model-contract";
import { buildWebsiteDesignBrief } from "./website-design-brief-builder";
import {
  alignedDigitalBusinessTwinFixture,
  businessAlignmentFixture,
  WDB_TEST_CREATED_AT,
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

function proposal() {
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
    providerNotes: ["Provider note observed as proposal metadata only."],
    implementationAssumptions: ["Future compliance is outside this observation phase."],
    knownLimitations: ["Generated output has not been executed by GNR8."],
    createdAt: WDB_TEST_CREATED_AT,
  });
}

function model(): ObservedWebsiteModelArtifact {
  return buildObservedWebsiteModel({
    sourceGeneratedWebsiteProposal: proposal(),
    sourceGeneratedWebsiteProposalArtifactId: SOURCE_PROPOSAL_ARTIFACT_ID,
    outputMetadata: {
      routes: [{ routePath: "/", title: "Home" }],
      fileInventory: [{ path: "src/main.tsx", kind: "entrypoint" }],
      sections: [{ routePath: "/", sectionType: "hero", contentSummary: "Hero section exists." }],
      messages: [{ routePath: "/", textSummary: "Welcome message exists." }],
      technicalSignals: [{ signalType: "framework", value: "react" }],
    },
  });
}

test("Observed Website Model contract accepts observation shape and statuses", () => {
  const value = model();
  const validation = validateObservedWebsiteModel(value);

  assert.equal(validation.valid, true);
  assert.equal(value.contractVersion, OBSERVED_WEBSITE_MODEL_CONTRACT_VERSION);
  assert.deepEqual([...OBSERVED_WEBSITE_STATUSES], [
    "not_observable",
    "partially_observable",
    "observable",
    "blocked",
    "invalid",
    "stale",
  ]);
  assert.equal(value.sourceGeneratedWebsiteProposalId, value.lineage.sourceGeneratedWebsiteProposalId);
  assert.equal(value.sourceProviderGenerationPayloadId, value.lineage.sourceProviderGenerationPayloadId);
  assert.equal(value.sourceWebsiteGenerationPackageId, value.lineage.sourceWebsiteGenerationPackageId);
});

test("Observed Website Model rejects compliance judgments and downstream mutation fields recursively", () => {
  const value = model();
  const forbiddenCompliance = {
    ...value,
    sections: [
      {
        ...value.sections[0],
        complianceResult: { score: 1 },
      },
    ],
  } as unknown as ObservedWebsiteModelArtifact;
  const forbiddenDownstream = {
    ...value,
    evidence: [
      {
        ...value.evidence[0],
        publishingArtifact: { id: "not-allowed" },
        runtimeMutation: { id: "not-allowed" },
      },
    ],
  } as unknown as ObservedWebsiteModelArtifact;

  assert.ok(validateObservedWebsiteModel(forbiddenCompliance).errors.some((error) =>
    error.includes("complianceResult is forbidden")));
  assert.ok(validateObservedWebsiteModel(forbiddenDownstream).errors.some((error) =>
    error.includes("publishingArtifact is forbidden")));
  assert.ok(validateObservedWebsiteModel(forbiddenDownstream).errors.some((error) =>
    error.includes("runtimeMutation is forbidden")));
});

test("Observed Website Model validates unique observed IDs", () => {
  const value = model();
  const duplicate = {
    ...value,
    sections: [
      {
        ...value.sections[0],
        observedSectionId: value.pages[0].observedPageId,
      },
    ],
  } as ObservedWebsiteModelArtifact;

  assert.ok(validateObservedWebsiteModel(duplicate).errors.some((error) =>
    error.includes(`observed id must be unique: ${value.pages[0].observedPageId}`)));
});
