import assert from "node:assert/strict";
import test from "node:test";

import { stableStringify } from "../runtime/deterministic";
import { buildCodexTaskProviderPayload } from "./codex-task-provider-payload-builder";
import {
  PROVIDER_GENERATION_PAYLOAD_FORBIDDEN_FIELDS,
  validateProviderGenerationPayload,
} from "./provider-generation-payload-contract";
import { buildWebsiteDesignBrief } from "./website-design-brief-builder";
import type { WebsiteDesignBriefArtifact } from "./website-design-brief-contract";
import { buildWebsiteGenerationPackage } from "./website-generation-package-builder";
import type { WebsiteGenerationPackageArtifact } from "./website-generation-package-contract";
import {
  alignedDigitalBusinessTwinFixture,
  businessAlignmentFixture,
  WDB_TEST_CREATED_AT,
} from "./website-design-brief-test-fixtures";

const SOURCE_WGP_ARTIFACT_ID = "website_generation_package_test_artifact_1";

function websiteDesignBrief(input: {
  missingAudience?: boolean;
  confidenceLevel?: "LOW" | "MEDIUM" | "HIGH";
  limitations?: string[];
  status?: WebsiteDesignBriefArtifact["status"];
} = {}): WebsiteDesignBriefArtifact {
  const dbt = alignedDigitalBusinessTwinFixture({
    missingDomains: input.missingAudience ? ["audience"] : [],
    confidenceLevel: input.confidenceLevel,
    limitations: input.limitations,
  });
  const wdb = buildWebsiteDesignBrief({
    alignedDigitalBusinessTwin: dbt,
    businessAlignment: businessAlignmentFixture(dbt.digitalBusinessTwinId),
    createdAt: WDB_TEST_CREATED_AT,
  });
  return {
    ...wdb,
    ...(input.status ? { status: input.status } : {}),
  };
}

function websiteGenerationPackage(input: {
  missingAudience?: boolean;
  confidenceLevel?: "LOW" | "MEDIUM" | "HIGH";
  limitations?: string[];
  status?: WebsiteDesignBriefArtifact["status"];
} = {}): WebsiteGenerationPackageArtifact {
  return buildWebsiteGenerationPackage({
    websiteDesignBrief: websiteDesignBrief(input),
    createdAt: WDB_TEST_CREATED_AT,
  });
}

test("builder deterministically creates a valid codex_task payload from a persisted WGP", () => {
  const wgp = websiteGenerationPackage();
  const first = buildCodexTaskProviderPayload({
    websiteGenerationPackage: wgp,
    sourceWebsiteGenerationPackageArtifactId: SOURCE_WGP_ARTIFACT_ID,
    createdAt: WDB_TEST_CREATED_AT,
  });
  const second = buildCodexTaskProviderPayload({
    websiteGenerationPackage: wgp,
    sourceWebsiteGenerationPackageArtifactId: SOURCE_WGP_ARTIFACT_ID,
    createdAt: WDB_TEST_CREATED_AT,
  });

  assert.deepEqual(first, second);
  assert.equal(first.status, "valid");
  assert.equal(first.providerType, "codex");
  assert.equal(first.payloadKind, "codex_task");
  assert.equal(validateProviderGenerationPayload({
    payload: first,
    sourceWebsiteGenerationPackage: wgp,
  }).valid, true);
});

test("builder preserves WGP meaning, constraints, validation expectations, confidence, limitations, and diagnostics", () => {
  const wgp = websiteGenerationPackage({
    missingAudience: true,
    confidenceLevel: "MEDIUM",
    limitations: ["owner audience confirmation missing"],
  });
  const payload = buildCodexTaskProviderPayload({
    websiteGenerationPackage: wgp,
    sourceWebsiteGenerationPackageArtifactId: SOURCE_WGP_ARTIFACT_ID,
    createdAt: WDB_TEST_CREATED_AT,
  });

  assert.deepEqual(payload.serializedWebsiteGenerationPackage, wgp);
  assert.deepEqual(payload.preservedConstraints, wgp.constraints);
  assert.deepEqual(payload.validationExpectations, wgp.validationContract.expectations);
  assert.deepEqual(payload.confidence, wgp.confidence);
  assert.ok(payload.limitations.includes("owner audience confirmation missing"));
  assert.ok(payload.diagnostics.includes("PROVIDER_GENERATION_PAYLOAD_PRESERVES_WGP_CONSTRAINTS"));
  assert.ok(payload.diagnostics.includes("PROVIDER_GENERATION_PAYLOAD_PRESERVES_WGP_VALIDATION_EXPECTATIONS"));
  assert.ok(payload.codexTaskEnvelope.sourcePackageSummary.audienceStatements.some((statement) =>
    statement.includes("audience")));
});

test("Codex task envelope is proposal-only and includes website outcomes, navigation, content, constraints, validation, and stop conditions", () => {
  const wgp = websiteGenerationPackage();
  const payload = buildCodexTaskProviderPayload({
    websiteGenerationPackage: wgp,
    sourceWebsiteGenerationPackageArtifactId: SOURCE_WGP_ARTIFACT_ID,
    createdAt: WDB_TEST_CREATED_AT,
  });

  assert.ok(payload.codexTaskEnvelope.objective.includes("implementation proposal only"));
  assert.deepEqual(
    payload.codexTaskEnvelope.requiredWebsiteOutcomes.generationObjectives,
    wgp.generationObjectives,
  );
  assert.deepEqual(
    payload.codexTaskEnvelope.navigationPageSectionRequirements.navigationContract,
    wgp.navigationContract,
  );
  assert.deepEqual(payload.codexTaskEnvelope.contentRequirements, wgp.contentRequirements);
  assert.deepEqual(payload.codexTaskEnvelope.constraints, wgp.constraints);
  assert.deepEqual(payload.codexTaskEnvelope.validationExpectations, wgp.validationContract.expectations);
  assert.equal(payload.codexTaskEnvelope.expectedOutputShape.outputKind, "implementation_proposal_only");
  assert.ok(payload.codexTaskEnvelope.stopConditions.some((condition) => condition.includes("provider call")));
});

test("safety boundary forbids publishing, deployment, DNS, production mutations, provider calls, and AI execution", () => {
  const payload = buildCodexTaskProviderPayload({
    websiteGenerationPackage: websiteGenerationPackage(),
    sourceWebsiteGenerationPackageArtifactId: SOURCE_WGP_ARTIFACT_ID,
    createdAt: WDB_TEST_CREATED_AT,
  });
  const forbiddenActions = payload.codexTaskEnvelope.forbiddenActions.join("\n");

  assert.match(forbiddenActions, /publishing/);
  assert.match(forbiddenActions, /deployment/);
  assert.match(forbiddenActions, /DNS/);
  assert.match(forbiddenActions, /production mutations/);
  assert.match(forbiddenActions, /call Codex or any provider/);
  assert.match(forbiddenActions, /execute external AI/);
  assert.equal(payload.safetyClassification.providerExecutionAllowed, false);
  assert.equal(payload.safetyClassification.aiExecutionAllowed, false);
});

test("builder never emits forbidden payload field keys", () => {
  const payload = buildCodexTaskProviderPayload({
    websiteGenerationPackage: websiteGenerationPackage(),
    sourceWebsiteGenerationPackageArtifactId: SOURCE_WGP_ARTIFACT_ID,
    createdAt: WDB_TEST_CREATED_AT,
  });
  const serialized = stableStringify(payload);

  for (const forbidden of PROVIDER_GENERATION_PAYLOAD_FORBIDDEN_FIELDS) {
    assert.equal(serialized.includes(`"${forbidden}"`), false, forbidden);
  }
});

test("source WGP blocked and partial states map to allowed Provider Generation Payload statuses", () => {
  const blocked = buildCodexTaskProviderPayload({
    websiteGenerationPackage: websiteGenerationPackage({ status: "blocked" }),
    sourceWebsiteGenerationPackageArtifactId: SOURCE_WGP_ARTIFACT_ID,
    createdAt: WDB_TEST_CREATED_AT,
  });
  const partial = buildCodexTaskProviderPayload({
    websiteGenerationPackage: websiteGenerationPackage({ missingAudience: true }),
    sourceWebsiteGenerationPackageArtifactId: SOURCE_WGP_ARTIFACT_ID,
    createdAt: WDB_TEST_CREATED_AT,
  });

  assert.equal(blocked.status, "blocked");
  assert.equal(partial.status, "draft");
  assert.ok(partial.limitations.includes("SOURCE_WGP_STATUS_NOT_VALID:partial"));
});
