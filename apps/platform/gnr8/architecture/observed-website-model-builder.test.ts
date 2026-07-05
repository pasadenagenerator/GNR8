import assert from "node:assert/strict";
import test from "node:test";

import { buildCodexTaskProviderPayload } from "./codex-task-provider-payload-builder";
import {
  type GeneratedWebsiteProposalArtifact,
  type GeneratedWebsiteProposalOperatorAttestation,
  type GeneratedWebsiteProposalOutputBundle,
} from "./generated-website-proposal-contract";
import { buildGeneratedWebsiteProposalFromManualOutput } from "./generated-website-proposal-import";
import {
  buildObservedWebsiteModel,
  type ObservedWebsiteModelOutputMetadata,
} from "./observed-website-model-builder";
import { validateObservedWebsiteModel } from "./observed-website-model-contract";
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

function proposal(input: {
  bundle?: Partial<GeneratedWebsiteProposalOutputBundle>;
  providerNotes?: string[];
  knownLimitations?: string[];
  status?: GeneratedWebsiteProposalArtifact["status"];
} = {}): GeneratedWebsiteProposalArtifact {
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
    outputBundle: outputBundle(input.bundle),
    operatorAttestation: attestation(source),
    providerNotes: input.providerNotes ?? [],
    implementationAssumptions: [],
    knownLimitations: input.knownLimitations ?? [],
    createdAt: WDB_TEST_CREATED_AT,
  });
  return input.status ? { ...value, status: input.status } : value;
}

const fullMetadata: ObservedWebsiteModelOutputMetadata = {
  routes: [
    { routePath: "/", title: "Home" },
    { routePath: "/about", title: "About" },
  ],
  fileInventory: [
    { path: "src/main.tsx", kind: "entrypoint", byteSize: 100 },
    { path: "src/pages/about.tsx", kind: "route" },
  ],
  navigation: [
    { label: "Home", href: "/", sourceRoutePath: "/" },
    { label: "About", href: "/about", sourceRoutePath: "/" },
  ],
  sections: [
    { routePath: "/", sectionType: "hero", contentSummary: "Hero section exists." },
    { routePath: "/about", sectionType: "body", contentSummary: "About body exists." },
  ],
  messages: [
    { routePath: "/", textSummary: "Welcome message exists." },
  ],
  assets: [
    { path: "public/logo.png", kind: "image", contentType: "image/png" },
  ],
  technicalSignals: [
    { signalType: "framework", value: "react" },
    { signalType: "build_note", value: "static bundle declared" },
  ],
};

test("builds observable model from proposal output metadata without compliance judgment", () => {
  const value = buildObservedWebsiteModel({
    sourceGeneratedWebsiteProposal: proposal({ providerNotes: ["Provider noted that routes were generated."] }),
    sourceGeneratedWebsiteProposalArtifactId: SOURCE_PROPOSAL_ARTIFACT_ID,
    outputMetadata: fullMetadata,
  });

  assert.equal(value.status, "observable");
  assert.equal(value.readiness.status, "observable");
  assert.equal(value.pages.length, 2);
  assert.equal(value.assets.length, 3);
  assert.equal(value.navigation.length, 2);
  assert.equal(value.sections.length, 2);
  assert.equal(value.messages.length, 2);
  assert.equal(value.technicalSignals.some((signal) => signal.signalType === "framework"), true);
  assert.equal(value.lineage.sourceGeneratedWebsiteProposalArtifactId, SOURCE_PROPOSAL_ARTIFACT_ID);
  assert.equal(validateObservedWebsiteModel(value).valid, true);
  assert.equal(JSON.stringify(value).includes("complianceScore"), false);
  assert.equal(JSON.stringify(value).includes("businessApproval"), false);
});

test("builds partially observable model and records missing metadata limitations", () => {
  const value = buildObservedWebsiteModel({
    sourceGeneratedWebsiteProposal: proposal(),
    sourceGeneratedWebsiteProposalArtifactId: SOURCE_PROPOSAL_ARTIFACT_ID,
    outputMetadata: {
      routes: [{ routePath: "/", title: "Home" }],
    },
  });

  assert.equal(value.status, "partially_observable");
  assert.equal(value.readiness.pageInventoryObserved, true);
  assert.equal(value.readiness.fileInventoryObserved, false);
  assert.ok(value.limitations.some((item) =>
    item.message === "File tree metadata was not available beyond output bundle entrypoints."));
  assert.ok(value.limitations.some((item) =>
    item.message === "Declared section metadata was not available for observation."));
});

test("builds not observable model when proposal lacks observation metadata", () => {
  const value = buildObservedWebsiteModel({
    sourceGeneratedWebsiteProposal: proposal(),
    sourceGeneratedWebsiteProposalArtifactId: SOURCE_PROPOSAL_ARTIFACT_ID,
  });

  assert.equal(value.status, "not_observable");
  assert.equal(value.readiness.observable, false);
  assert.equal(value.pages.length, 0);
  assert.equal(value.assets.length, 0);
  assert.equal(value.technicalSignals.length, 0);
  assert.ok(value.limitations.some((item) =>
    item.message === "Route/page inventory metadata was not available for observation."));
});

test("builder output is deterministic for equivalent input", () => {
  const input = {
    sourceGeneratedWebsiteProposal: proposal({ providerNotes: ["Provider note."] }),
    sourceGeneratedWebsiteProposalArtifactId: SOURCE_PROPOSAL_ARTIFACT_ID,
    outputMetadata: fullMetadata,
  };
  const first = buildObservedWebsiteModel(input);
  const second = buildObservedWebsiteModel(input);

  assert.deepEqual(second, first);
  assert.equal(second.observedWebsiteModelId, first.observedWebsiteModelId);
});

test("blocked proposal stays observable-boundary blocked without downstream mutation", () => {
  const value = buildObservedWebsiteModel({
    sourceGeneratedWebsiteProposal: proposal({ status: "blocked" }),
    sourceGeneratedWebsiteProposalArtifactId: SOURCE_PROPOSAL_ARTIFACT_ID,
    outputMetadata: fullMetadata,
  });

  assert.equal(value.status, "blocked");
  assert.deepEqual(value.readiness.blockers, ["SOURCE_GENERATED_WEBSITE_PROPOSAL_BLOCKED"]);
  assert.equal(value.diagnostics.includes("OBSERVED_WEBSITE_MODEL_NO_PUBLISHING_OR_RUNTIME_MUTATION"), true);
});
