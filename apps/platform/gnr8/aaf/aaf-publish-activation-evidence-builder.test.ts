import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { AafIdempotencyConflictError, type EvidencePackageTransactionInput, type EvidencePackageTransactionResult } from "./aaf-writer-repository";
import {
  buildPublishActivationEvidencePackage,
  buildPublishActivationGateDryRunInput,
  buildPublishActivationSourceWatermark,
  hashPublishActivationStableValue,
  stablePublishActivationJson,
  type BuildPublishActivationEvidencePackageInput,
  type PublishActivationCanonicalSourceSnapshot,
  type PublishActivationEvidenceSourceReader,
  type PublishActivationEvidenceWriter,
  type PublishActivationSourceReaderResult,
} from "./aaf-publish-activation-evidence-builder";

const SOURCE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "aaf-publish-activation-evidence-builder.ts");

function source(
  sourceTable: string,
  sourceRecordId: string,
  canonicalFields: Record<string, unknown>,
  overrides: Partial<PublishActivationCanonicalSourceSnapshot> = {},
): PublishActivationCanonicalSourceSnapshot {
  return {
    sourceSystem: "synthetic_test_data",
    sourceTable,
    sourceRecordId,
    sourceRef: `${sourceTable}:${sourceRecordId}`,
    sourceVersion: String(canonicalFields.version ?? canonicalFields.updatedAt ?? "1"),
    canonicalFields,
    hashFields: Object.keys(canonicalFields).sort((left, right) => left.localeCompare(right)),
    ...overrides,
  };
}

function completeSources(overrides: Partial<PublishActivationSourceReaderResult> = {}): PublishActivationSourceReaderResult {
  return {
    siteVersion: source("gnr8_runtime_site_versions", "site-version-test", {
      id: "site-version-test",
      siteId: "site-test",
      state: "APPROVED",
      artifactId: "artifact-test",
      updatedAt: "2026-07-27T10:00:00.000Z",
    }),
    runtimeArtifact: source("gnr8_runtime_artifacts", "artifact-test", {
      id: "artifact-test",
      siteId: "site-test",
      siteVersionId: "site-version-test",
      bundleSha256: "bundle-sha",
      publishStage: "production",
      updatedAt: "2026-07-27T10:00:00.000Z",
    }),
    activePointer: {
      ...source("gnr8_runtime_active_pointers", "site-test", {
        siteId: "site-test",
        activeSiteVersionId: "site-version-current",
        activeArtifactId: "artifact-current",
        updatedAt: "2026-07-27T09:00:00.000Z",
      }),
      activeSiteVersionId: "site-version-current",
      activeArtifactId: "artifact-current",
    },
    publishTarget: source("gnr8_publish_targets", "production", {
      target: "production",
      policyVersion: "AAF-7",
      updatedAt: "2026-07-27T10:00:00.000Z",
    }),
    domainReadiness: {
      ...source("gnr8_domain_readiness_snapshots", "domain-ready-test", {
        siteId: "site-test",
        status: "ready",
        snapshotRef: "domain-ready-test",
        checkedAt: "2026-07-27T09:59:00.000Z",
      }),
      readinessStatus: "ready",
      snapshotRef: "domain-ready-test",
    },
    contentOverridePublishedState: {
      ...source("gnr8_content_overrides", "site-version-test", {
        siteVersionId: "site-version-test",
        publishedOverrideCount: 2,
        maxUpdatedAt: "2026-07-27T09:30:00.000Z",
      }),
      status: "published",
      snapshotRef: "content-overrides:site-version-test",
    },
    launchSignoff: {
      ...source("gnr8_aaf_approval_decisions", "launch-signoff-decision", {
        approvalDecisionId: "launch-signoff-decision",
        approvalRequestId: "launch-signoff-request",
        scope: "launch_signoff",
        subjectId: "site-version-test",
        decidedAt: "2026-07-27T09:40:00.000Z",
      }),
      approvalRequestId: "launch-signoff-request",
      approvalDecisionId: "launch-signoff-decision",
      scope: "launch_signoff",
      requiredByPolicy: true,
    },
    publishActivationApproval: {
      ...source("gnr8_aaf_approval_decisions", "publish-approval-decision", {
        approvalDecisionId: "publish-approval-decision",
        approvalRequestId: "publish-approval-request",
        scope: "publish_activation",
        subjectId: "site-version-test",
        decidedAt: "2026-07-27T09:50:00.000Z",
      }),
      approvalRequestId: "publish-approval-request",
      approvalDecisionId: "publish-approval-decision",
      scope: "publish_activation",
    },
    ...overrides,
  };
}

function reader(result: PublishActivationSourceReaderResult): PublishActivationEvidenceSourceReader {
  return {
    async readPublishActivationSources() {
      return result;
    },
  };
}

class IdempotentFakeEvidenceWriter implements PublishActivationEvidenceWriter {
  calls: EvidencePackageTransactionInput[] = [];
  private byIdempotency = new Map<string, EvidencePackageTransactionInput>();
  private byId = new Map<string, string>();

  async createEvidencePackageTransaction(input: EvidencePackageTransactionInput): Promise<EvidencePackageTransactionResult> {
    this.calls.push(input);
    const key = input.evidencePackage.idempotencyKey;
    const existing = this.byIdempotency.get(key);
    if (existing) {
      const drifted = stablePublishActivationJson(existing) === stablePublishActivationJson(input) ? [] : ["evidence_payload"];
      if (drifted.length > 0) throw new AafIdempotencyConflictError("gnr8_aaf_evidence_packages", key, drifted);
      const id = this.byId.get(key)!;
      return {
        evidencePackage: { id, ...input.evidencePackage },
        sourceRefs: input.sourceRefs?.map((ref, index) => ({ id: `${id}:source:${index}`, ...ref })) ?? [],
        items: input.items?.map((item, index) => ({ id: `${id}:item:${index}`, ...item })) ?? [],
        freshnessCheck: input.freshnessCheck ? { id: `${id}:freshness`, ...input.freshnessCheck } : null,
        auditLink: null,
      };
    }
    const id = `evidence-package-${this.byIdempotency.size + 1}`;
    this.byIdempotency.set(key, input);
    this.byId.set(key, id);
    return {
      evidencePackage: { id, ...input.evidencePackage },
      sourceRefs: input.sourceRefs?.map((ref, index) => ({ id: `${id}:source:${index}`, ...ref })) ?? [],
      items: input.items?.map((item, index) => ({ id: `${id}:item:${index}`, ...item })) ?? [],
      freshnessCheck: input.freshnessCheck ? { id: `${id}:freshness`, ...input.freshnessCheck } : null,
      auditLink: null,
    };
  }
}

function baseInput(overrides: Partial<BuildPublishActivationEvidencePackageInput> = {}): BuildPublishActivationEvidencePackageInput {
  return {
    tenantId: "tenant-test",
    clientId: "client-test",
    siteId: "site-test",
    siteVersionId: "site-version-test",
    runtimeArtifactId: "artifact-test",
    intendedPublishTarget: "production",
    contentOverrideStateRequired: true,
    launchSignoffRequiredByPolicy: true,
    publishActivationApprovalRef: {
      approvalRequestId: "publish-approval-request",
      approvalDecisionId: "publish-approval-decision",
      scope: "publish_activation",
    },
    actorType: "human",
    actorId: "operator-test",
    actorRole: "agency_admin",
    correlationId: "corr-test",
    idempotencyKey: "idem-test",
    policyVersion: "AAF-7",
    sourceReader: reader(completeSources()),
    writer: new IdempotentFakeEvidenceWriter(),
    ...overrides,
  };
}

test("publish activation evidence builder is server-only and import-isolated from mutation/provider paths", () => {
  const sourceText = fs.readFileSync(SOURCE_PATH, "utf8");
  assert.match(sourceText, /^import "server-only";/);
  assert.doesNotMatch(
    sourceText,
    /publishApprovedSiteVersion|executeMigrationPublishActivation|switchActivePointer|rollbackToSiteVersionArtifact|publishDraftContentOverrides|rollbackContentOverride|activateDomainHostBindingsForSiteVersion|checkDomainStatus|openprovider|stripe|vercel|ai_execution/i,
  );
  assert.doesNotMatch(sourceText, /from ["']@\/gnr8\/runtime\/runtime-store/);
});

test("successful evidence package build returns AAF-6-compatible dry-run input and AAF evidence records", async () => {
  const writer = new IdempotentFakeEvidenceWriter();
  const result = await buildPublishActivationEvidencePackage(baseInput({ writer }));

  assert.equal(result.evidencePackageId, "evidence-package-1");
  assert.equal(result.dryRunInput.evidencePackageId, "evidence-package-1");
  assert.equal(result.dryRunInput.siteVersionId, "site-version-test");
  assert.equal(result.dryRunInput.runtimeArtifactId, "artifact-test");
  assert.equal(result.dryRunInput.sourceRefs.siteVersion.sourceRecordId, "site-version-test");
  assert.equal(result.dryRunInput.sourceRefs.runtimeArtifact.sourceRecordId, "artifact-test");
  assert.equal(result.dryRunInput.sourceRefs.activePointer.sourceRecordId, "site-test");
  assert.equal(result.dryRunInput.sourceRefs.publishTarget.sourceRecordId, "production");
  assert.equal(result.dryRunInput.domainReadiness.status, "ready");
  assert.equal(result.dryRunInput.contentOverridePublishedState?.status, "published");
  assert.equal(result.dryRunInput.launchSignoffApproval?.approvalDecisionId, "launch-signoff-decision");
  assert.equal(result.dryRunInput.publishActivationApproval?.approvalDecisionId, "publish-approval-decision");
  assert.deepEqual(result.missingSourceTruth, []);
  assert.equal(result.freshnessStatus.siteVersion, "fresh");
  assert.equal(writer.calls[0]?.evidencePackage.packageType, "publish_activation_evidence");
  assert.equal(writer.calls[0]?.evidencePackage.status, "created");
  assert.equal(writer.calls[0]?.sourceRefs?.length, 8);
  assert.equal(writer.calls[0]?.freshnessCheck?.result, "fresh");
});

test("deterministic watermark strategy is stable, ordered, and sensitive only to canonical source fields", () => {
  const first = source("gnr8_runtime_artifacts", "artifact-test", {
    bundleSha256: "bundle-a",
    id: "artifact-test",
    publishStage: "production",
  });
  const reordered = source("gnr8_runtime_artifacts", "artifact-test", {
    publishStage: "production",
    id: "artifact-test",
    bundleSha256: "bundle-a",
  });
  const changed = source("gnr8_runtime_artifacts", "artifact-test", {
    id: "artifact-test",
    bundleSha256: "bundle-b",
    publishStage: "production",
  });
  const withVolatileEvidenceBuildField = {
    ...first,
    evidenceBuildGeneratedAt: "2026-07-27T11:11:11.000Z",
  } as PublishActivationCanonicalSourceSnapshot & { evidenceBuildGeneratedAt: string };

  assert.equal(buildPublishActivationSourceWatermark(first).watermark, buildPublishActivationSourceWatermark(reordered).watermark);
  assert.notEqual(buildPublishActivationSourceWatermark(first).watermark, buildPublishActivationSourceWatermark(changed).watermark);
  assert.equal(buildPublishActivationSourceWatermark(first).watermark, buildPublishActivationSourceWatermark(withVolatileEvidenceBuildField).watermark);
  assert.equal(stablePublishActivationJson({ b: 1, a: 2 }), stablePublishActivationJson({ a: 2, b: 1 }));
  assert.equal(hashPublishActivationStableValue({ a: 1 }), hashPublishActivationStableValue({ a: 1 }));
});

test("canonical version/update watermark is preferred when present", () => {
  const built = buildPublishActivationSourceWatermark(
    source(
      "gnr8_runtime_site_versions",
      "site-version-test",
      { id: "site-version-test", updatedAt: "ignored-in-hash" },
      { canonicalWatermark: "updated_at:2026-07-27T10:00:00.000Z", canonicalWatermarkField: "updated_at" },
    ),
  );
  assert.equal(built.watermark, "updated_at:2026-07-27T10:00:00.000Z");
  assert.equal(built.metadata.strategy, "canonical_field");
  assert.equal(built.metadata.field, "updated_at");
});

for (const [key, expected] of [
  ["siteVersion", "siteVersion"],
  ["runtimeArtifact", "runtimeArtifact"],
  ["activePointer", "activePointer"],
  ["publishTarget", "publishTarget"],
  ["domainReadiness", "domainReadiness"],
] as const) {
  test(`missing ${key} source truth is visible and produces invalid evidence`, async () => {
    const sources = completeSources({ [key]: null });
    const writer = new IdempotentFakeEvidenceWriter();
    const result = await buildPublishActivationEvidencePackage(baseInput({ sourceReader: reader(sources), writer }));
    assert.ok(result.missingSourceTruth.includes(expected));
    assert.equal(result.freshnessStatus[expected], "failed");
    assert.equal(writer.calls[0]?.evidencePackage.status, "invalid");
    assert.equal(writer.calls[0]?.freshnessCheck?.result, "failed");
    assert.ok(result.limitations.includes(`missing_source_truth:${expected}`));
  });
}

test("blocked and stale domain readiness remain visible as blockers", async () => {
  const blocked = await buildPublishActivationGateDryRunInput(
    baseInput({
      sourceReader: reader(
        completeSources({
          domainReadiness: {
            ...completeSources().domainReadiness!,
            readinessStatus: "blocked",
            blockers: ["vercel_check_failed"],
          },
        }),
      ),
    }),
  );
  assert.equal(blocked.dryRunInput.domainReadiness.status, "blocked");
  assert.deepEqual(blocked.dryRunInput.domainReadiness.blockers, ["vercel_check_failed"]);

  const stale = await buildPublishActivationGateDryRunInput(
    baseInput({
      sourceReader: reader(
        completeSources({
          domainReadiness: {
            ...completeSources().domainReadiness!,
            stale: true,
            freshness: "stale",
            staleReason: "domain_readiness_ttl_expired",
          },
        }),
      ),
    }),
  );
  assert.equal(stale.dryRunInput.domainReadiness.status, "blocked");
  assert.ok(stale.dryRunInput.domainReadiness.blockers?.includes("domain_readiness_stale"));
  assert.equal(stale.freshnessStatus.domainReadiness, "stale");
});

test("content override state can be not applicable, but required missing state is explicit", async () => {
  const notApplicable = await buildPublishActivationGateDryRunInput(
    baseInput({
      contentOverrideStateRequired: false,
      sourceReader: reader(completeSources({ contentOverridePublishedState: null })),
    }),
  );
  assert.equal(notApplicable.dryRunInput.contentOverridePublishedState?.status, "not_applicable");
  assert.deepEqual(notApplicable.missingSourceTruth, []);

  const requiredMissing = await buildPublishActivationGateDryRunInput(
    baseInput({
      contentOverrideStateRequired: true,
      sourceReader: reader(completeSources({ contentOverridePublishedState: null })),
    }),
  );
  assert.equal(requiredMissing.dryRunInput.contentOverridePublishedState?.status, "unknown");
  assert.ok(requiredMissing.missingSourceTruth.includes("contentOverridePublishedState"));
});

test("launch signoff required but missing is visible", async () => {
  const result = await buildPublishActivationGateDryRunInput(
    baseInput({
      sourceReader: reader(completeSources({ launchSignoff: null })),
      launchSignoffRequiredByPolicy: true,
    }),
  );
  assert.ok(result.missingSourceTruth.includes("launchSignoff"));
  assert.equal(result.dryRunInput.launchSignoffApproval?.requiredByPolicy, true);
  assert.equal(result.dryRunInput.launchSignoffApproval?.approvalDecisionId, null);
});

test("publish activation approval absent or wrong scope is not accepted", async () => {
  const absent = await buildPublishActivationGateDryRunInput(
    baseInput({
      publishActivationApprovalRef: null,
      sourceReader: reader(completeSources({ publishActivationApproval: null })),
    }),
  );
  assert.equal(absent.dryRunInput.publishActivationApproval, null);

  const wrongScope = await buildPublishActivationGateDryRunInput(
    baseInput({
      sourceReader: reader(
        completeSources({
          publishActivationApproval: {
            ...completeSources().publishActivationApproval!,
            scope: "launch_signoff",
          },
        }),
      ),
    }),
  );
  assert.equal(wrongScope.dryRunInput.publishActivationApproval?.scope, "launch_signoff");
});

test("same idempotency key and same payload is safe; drift conflicts fail closed via writer semantics", async () => {
  const writer = new IdempotentFakeEvidenceWriter();
  const first = await buildPublishActivationEvidencePackage(baseInput({ writer }));
  const retry = await buildPublishActivationEvidencePackage(baseInput({ writer }));
  assert.equal(retry.evidencePackageId, first.evidencePackageId);

  await assert.rejects(
    () =>
      buildPublishActivationEvidencePackage(
        baseInput({
          writer,
          sourceReader: reader(
            completeSources({
              runtimeArtifact: source("gnr8_runtime_artifacts", "artifact-test", {
                id: "artifact-test",
                bundleSha256: "bundle-drift",
                publishStage: "production",
              }),
            }),
          ),
        }),
      ),
    (error) => error instanceof AafIdempotencyConflictError && error.driftedFields.includes("evidence_payload"),
  );
});
