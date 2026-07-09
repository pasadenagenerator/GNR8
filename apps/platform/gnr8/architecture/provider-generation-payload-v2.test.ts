import assert from "node:assert/strict";
import test from "node:test";

import { stableStringify } from "../runtime/deterministic";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { buildGenerationContractCompliance } from "./generation-contract-compliance-builder";
import { buildGenerationContractComplianceReport } from "./generation-contract-compliance-report-builder";
import {
  GCC_TEST_CREATED_AT,
  generationContractComplianceSources,
  observedWebsiteModelFixture,
} from "./generation-contract-compliance-test-fixtures";
import { buildGenerationImprovementPlan } from "./generation-improvement-plan-builder";
import type { GenerationImprovementPlanArtifact } from "./generation-improvement-plan-contract";
import {
  buildProviderGenerationPayloadV2,
  ProviderGenerationPayloadV2SourceIntegrityError,
  verifyProviderGenerationPayloadV2Safety,
} from "./provider-generation-payload-v2-builder";
import {
  validateProviderGenerationPayload,
  type ProviderGenerationPayload,
} from "./provider-generation-payload-contract";
import {
  ProviderGenerationPayloadPersistenceValidationError,
  loadLatestProviderGenerationPayload,
  loadProviderGenerationPayloadById,
  persistProviderGenerationPayload,
  type ProviderGenerationPayloadProvenanceSummary,
} from "./provider-generation-payload-persistence";
import type { WebsiteGenerationPackageArtifact } from "./website-generation-package-contract";

const SOURCE_WGP_ARTIFACT_ID = "website_generation_package_test_artifact_1";
const SOURCE_PLAN_ARTIFACT_ID = "generation_improvement_plan_test_artifact_1";

function sources(input: {
  omitNavigation?: boolean;
  omitAccessibility?: boolean;
  omitSeo?: boolean;
} = {}): {
  websiteGenerationPackage: WebsiteGenerationPackageArtifact;
  generationImprovementPlan: GenerationImprovementPlanArtifact;
} {
  const { websiteGenerationPackage } = generationContractComplianceSources();
  const compliance = buildGenerationContractCompliance({
    websiteGenerationPackage,
    observedWebsiteModel: observedWebsiteModelFixture(websiteGenerationPackage, input),
    createdAt: GCC_TEST_CREATED_AT,
  });
  const report = buildGenerationContractComplianceReport({
    generationContractCompliance: compliance,
    createdAt: GCC_TEST_CREATED_AT,
  });
  return {
    websiteGenerationPackage,
    generationImprovementPlan: buildGenerationImprovementPlan({
      generationContractComplianceReport: report,
      createdAt: GCC_TEST_CREATED_AT,
    }),
  };
}

function payload(input: {
  createdAt?: string;
  plan?: GenerationImprovementPlanArtifact;
  wgp?: WebsiteGenerationPackageArtifact;
  status?: ProviderGenerationPayload["status"];
} = {}): ProviderGenerationPayload {
  const source = sources({ omitNavigation: true });
  const value = buildProviderGenerationPayloadV2({
    websiteGenerationPackage: input.wgp ?? source.websiteGenerationPackage,
    sourceWebsiteGenerationPackageArtifactId: SOURCE_WGP_ARTIFACT_ID,
    generationImprovementPlan: input.plan ?? source.generationImprovementPlan,
    sourceGenerationImprovementPlanArtifactId: SOURCE_PLAN_ARTIFACT_ID,
    createdAt: input.createdAt ?? GCC_TEST_CREATED_AT,
  });
  return {
    ...value,
    ...(input.status ? { status: input.status } : {}),
  };
}

function memoryStore(siteVersionId: string) {
  let summary = { kind: "runtime_import_provenance_summary_v1" } as RuntimeImportProvenanceSummary;
  let writes = 0;
  return {
    get summary() { return summary as ProviderGenerationPayloadProvenanceSummary; },
    get writes() { return writes; },
    options: {
      persistedAt: "2026-07-09T10:00:00.000Z",
      getSiteVersion: async (requestedSiteVersionId: string) =>
        requestedSiteVersionId === siteVersionId ? { importProvenanceSummary: summary } : null,
      setSiteVersionImportProvenanceSummary: async (input: {
        siteVersionId: string;
        importProvenanceSummary: RuntimeImportProvenanceSummary;
      }) => {
        assert.equal(input.siteVersionId, siteVersionId);
        summary = input.importProvenanceSummary;
        writes += 1;
        return { affectedRows: 1 };
      },
    },
  };
}

async function persist(
  store: ReturnType<typeof memoryStore>,
  value: ProviderGenerationPayload,
  persistedAt?: string,
) {
  return persistProviderGenerationPayload({
    siteVersionId: value.siteVersionId,
    dryRunId: value.dryRunId,
    artifact: value,
    options: { ...store.options, persistedAt: persistedAt ?? store.options.persistedAt },
  });
}

test("builds deterministic Provider Generation Payload v2 from WGP plus Improvement Plan", () => {
  const source = sources({ omitNavigation: true });
  const first = buildProviderGenerationPayloadV2({
    websiteGenerationPackage: source.websiteGenerationPackage,
    sourceWebsiteGenerationPackageArtifactId: SOURCE_WGP_ARTIFACT_ID,
    generationImprovementPlan: source.generationImprovementPlan,
    sourceGenerationImprovementPlanArtifactId: SOURCE_PLAN_ARTIFACT_ID,
    createdAt: GCC_TEST_CREATED_AT,
  });
  const second = buildProviderGenerationPayloadV2({
    websiteGenerationPackage: source.websiteGenerationPackage,
    sourceWebsiteGenerationPackageArtifactId: SOURCE_WGP_ARTIFACT_ID,
    generationImprovementPlan: source.generationImprovementPlan,
    sourceGenerationImprovementPlanArtifactId: SOURCE_PLAN_ARTIFACT_ID,
    createdAt: GCC_TEST_CREATED_AT,
  });

  assert.deepEqual(second, first);
  assert.equal(first.status, "ready");
  assert.equal(first.sourceWebsiteGenerationPackageId, source.websiteGenerationPackage.websiteGenerationPackageId);
  assert.equal(first.sourceGenerationImprovementPlanId, source.generationImprovementPlan.generationImprovementPlanId);
  assert.deepEqual(first.serializedWebsiteGenerationPackage, source.websiteGenerationPackage);
  assert.deepEqual(first.preservedConstraints, source.websiteGenerationPackage.constraints);
  assert.deepEqual(first.validationExpectations, source.websiteGenerationPackage.validationContract.expectations);
  assert.deepEqual(first.confidence, source.websiteGenerationPackage.confidence);
  assert.equal(validateProviderGenerationPayload({
    payload: first,
    sourceWebsiteGenerationPackage: source.websiteGenerationPackage,
  }).valid, true);
});

test("translates the Improvement Plan into business-level regeneration guidance", () => {
  const value = payload();
  assert.ok(value.regenerationGuidance);
  assert.ok(value.deltaSummary);
  assert.equal(value.regenerationGuidance.improve.length, value.deltaSummary.totalImprovements);
  assert.equal(value.deltaSummary.critical, value.regenerationGuidance.critical_items.length);
  assert.ok(value.deltaSummary.affectedCategories.includes("Navigation"));
  assert.ok(value.regenerationGuidance.preserve.includes("business context"));
  assert.ok(value.regenerationGuidance.do_not_change.some((item) => item.includes("original business intent")));

  for (const improvement of value.regenerationGuidance.improve) {
    assert.ok(improvement.originatingImprovementId.length > 0);
    assert.ok(improvement.originatingDeviationIds.length > 0);
    assert.ok(improvement.originatingRequirementIds.length > 0);
    assert.ok(improvement.category.length > 0);
    assert.ok(improvement.expectedOutcome.length > 0);
  }

  const guidanceText = stableStringify(value.regenerationGuidance).toLowerCase();
  for (const forbidden of ["codex", "html", "react", "css", "framework", "component"]) {
    assert.equal(guidanceText.includes(forbidden), false, forbidden);
  }
});

test("fails closed when source lineage is broken", () => {
  const source = sources({ omitNavigation: true });
  const brokenPlan: GenerationImprovementPlanArtifact = {
    ...source.generationImprovementPlan,
    sourceWebsiteGenerationPackageId: "other-wgp",
    lineage: {
      ...source.generationImprovementPlan.lineage,
      sourceWebsiteGenerationPackageId: "other-wgp",
    },
  };

  assert.throws(() => buildProviderGenerationPayloadV2({
    websiteGenerationPackage: source.websiteGenerationPackage,
    sourceWebsiteGenerationPackageArtifactId: SOURCE_WGP_ARTIFACT_ID,
    generationImprovementPlan: brokenPlan,
    sourceGenerationImprovementPlanArtifactId: SOURCE_PLAN_ARTIFACT_ID,
    createdAt: GCC_TEST_CREATED_AT,
  }), (error: unknown) => {
    assert.ok(error instanceof ProviderGenerationPayloadV2SourceIntegrityError);
    assert.ok(error.errors.some((message) =>
      message.includes("Generation Improvement Plan must reference the source Website Generation Package")));
    return true;
  });
});

test("safety verification rejects execution and technical generation leakage", () => {
  const value = payload();
  assert.deepEqual(verifyProviderGenerationPayloadV2Safety(value), {
    valid: true,
    errors: [],
    warnings: [],
  });

  const unsafe: ProviderGenerationPayload = {
    ...value,
    regenerationGuidance: {
      ...value.regenerationGuidance!,
      preserve: [...value.regenerationGuidance!.preserve, "React component framework"],
    },
  };
  const safety = verifyProviderGenerationPayloadV2Safety(unsafe);
  assert.equal(safety.valid, false);
  assert.ok(safety.errors.some((error) => error.includes("react")));
  assert.ok(safety.errors.some((error) => error.includes("framework")));
});

test("persists v2 payloads as provider_generation_payload with latest, by-ID, and idempotent retry", async () => {
  const value = payload();
  const store = memoryStore(value.siteVersionId);
  const first = await persist(store, value);
  const latest = await loadLatestProviderGenerationPayload({
    siteVersionId: value.siteVersionId,
    options: store.options,
  });
  const byId = await loadProviderGenerationPayloadById({
    siteVersionId: value.siteVersionId,
    artifactId: first.artifactId,
    options: store.options,
  });
  const retry = await persist(store, payload({ createdAt: "2026-07-09T10:05:00.000Z" }), "2026-07-09T10:06:00.000Z");

  assert.equal(first.status, "ready");
  assert.equal(first.runtimeVersion, "MVP-2.0-G");
  assert.equal(first.sourceGenerationImprovementPlanId, value.sourceGenerationImprovementPlanId);
  assert.equal(first.sourceGenerationImprovementPlanArtifactId, SOURCE_PLAN_ARTIFACT_ID);
  assert.equal(latest?.artifactId, first.artifactId);
  assert.deepEqual(byId, latest);
  assert.equal(retry.artifactId, first.artifactId);
  assert.equal(store.writes, 1);
  assert.equal(store.summary.providerGenerationPayloadArtifacts?.length, 1);
});

test("rejects invalid and stale v2 payloads while allowing blocked", async () => {
  const value = payload();
  const store = memoryStore(value.siteVersionId);
  for (const status of ["invalid", "stale"] as const) {
    await assert.rejects(() => persist(store, payload({ status })), (error: unknown) => {
      assert.ok(error instanceof ProviderGenerationPayloadPersistenceValidationError);
      assert.ok(error.validation.errors.includes("Provider Generation Payload status must not be invalid or stale for persistence"));
      return true;
    });
  }

  const blocked = await persist(store, payload({ status: "blocked" }));
  assert.equal(blocked.status, "blocked");
});
