import assert from "node:assert/strict";
import test from "node:test";

import { buildCodexTaskProviderPayload } from "./codex-task-provider-payload-builder";
import {
  type GeneratedWebsiteProposalOperatorAttestation,
  type GeneratedWebsiteProposalOutputBundle,
} from "./generated-website-proposal-contract";
import {
  GeneratedWebsiteProposalImportValidationError,
  buildGeneratedWebsiteProposalFromManualOutput,
  type GeneratedWebsiteProposalImportInput,
} from "./generated-website-proposal-import";
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

function importInput(): GeneratedWebsiteProposalImportInput {
  const sources = sourceArtifacts();
  return {
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
    outputBundle: outputBundle(),
    operatorAttestation: attestation(sources),
    providerNotes: ["Manual provider notes are quarantined proposal material only."],
    implementationAssumptions: ["Future observation must inspect the output before compliance."],
    knownLimitations: ["No generated content has been executed by GNR8."],
    createdAt: WDB_TEST_CREATED_AT,
  };
}

test("manual output import creates deterministic quarantined proposal without execution behavior", () => {
  const input = importInput();
  const first = buildGeneratedWebsiteProposalFromManualOutput(input);
  const second = buildGeneratedWebsiteProposalFromManualOutput({
    ...input,
    createdAt: "2026-07-05T12:00:00.000Z",
  });

  assert.equal(first.generatedWebsiteProposalId, second.generatedWebsiteProposalId);
  assert.equal(first.status, "quarantined");
  assert.equal(first.safety.gnr8ProviderExecutionAllowed, false);
  assert.equal(first.safety.gnr8AiExecutionAllowed, false);
  assert.equal(first.safety.publishingAllowed, false);
  assert.equal(first.safety.deploymentAllowed, false);
  assert.equal(first.safety.dnsMutationAllowed, false);
  assert.equal(first.safety.productionMutationAllowed, false);
  assert.equal(first.safety.runtimeMutationAllowed, false);
  assert.equal(first.validationReadiness.readyForCompliance, true);
  assert.ok(first.diagnostics.includes("GENERATED_WEBSITE_PROPOSAL_NO_PROVIDER_CALL"));
  assert.ok(first.diagnostics.includes("GENERATED_WEBSITE_PROPOSAL_NO_CODE_EXECUTION"));
});

test("missing operator attestation is rejected", () => {
  const input = {
    ...importInput(),
    operatorAttestation: undefined,
  } as unknown as GeneratedWebsiteProposalImportInput;

  assert.throws(() => buildGeneratedWebsiteProposalFromManualOutput(input), (error: unknown) => {
    assert.ok(error instanceof GeneratedWebsiteProposalImportValidationError);
    assert.ok(error.validation.errors.includes("operator attestation is required"));
    return true;
  });
});

test("missing output bundle metadata is rejected", () => {
  const input = {
    ...importInput(),
    outputBundle: undefined,
  } as unknown as GeneratedWebsiteProposalImportInput;

  assert.throws(() => buildGeneratedWebsiteProposalFromManualOutput(input), (error: unknown) => {
    assert.ok(error instanceof GeneratedWebsiteProposalImportValidationError);
    assert.ok(error.validation.errors.includes("outputBundle metadata is required"));
    return true;
  });
});

test("source lineage mismatch is rejected before proposal import", () => {
  const input = {
    ...importInput(),
    sourceWebsiteGenerationPackageArtifactId: "other_wgp_artifact",
  };

  assert.throws(() => buildGeneratedWebsiteProposalFromManualOutput(input), (error: unknown) => {
    assert.ok(error instanceof GeneratedWebsiteProposalImportValidationError);
    assert.ok(error.validation.errors.includes(
      "source ProviderGenerationPayload WGP artifact ID must match sourceWebsiteGenerationPackageArtifactId",
    ));
    return true;
  });
});

test("publish, deploy, DNS, runtime, compliance, and approval bundle artifacts are rejected", () => {
  for (const unsafeFlag of [
    "containsPublishingArtifact",
    "containsDeploymentArtifact",
    "containsDnsMutationArtifact",
    "containsRuntimeMutationArtifact",
    "containsComplianceReport",
    "containsBusinessApproval",
  ] as const) {
    const input = {
      ...importInput(),
      outputBundle: outputBundle({ [unsafeFlag]: true } as unknown as Partial<GeneratedWebsiteProposalOutputBundle>),
    };
    assert.throws(() => buildGeneratedWebsiteProposalFromManualOutput(input), (error: unknown) => {
      assert.ok(error instanceof GeneratedWebsiteProposalImportValidationError);
      assert.ok(error.validation.errors.includes(`outputBundle.${unsafeFlag} must be false`));
      return true;
    });
  }
});

test("provider execution side effects cannot be claimed as GNR8 execution", () => {
  const input = {
    ...importInput(),
    operatorAttestation: {
      ...importInput().operatorAttestation,
      noGnr8ProviderCall: false,
      noGnr8AiExecution: false,
    },
  } as unknown as GeneratedWebsiteProposalImportInput;

  assert.throws(() => buildGeneratedWebsiteProposalFromManualOutput(input), (error: unknown) => {
    assert.ok(error instanceof GeneratedWebsiteProposalImportValidationError);
    assert.ok(error.validation.errors.includes("operatorAttestation.noGnr8ProviderCall must be true"));
    assert.ok(error.validation.errors.includes("operatorAttestation.noGnr8AiExecution must be true"));
    return true;
  });
});
