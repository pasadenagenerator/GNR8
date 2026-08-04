import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { AafIdempotencyConflictError, type EvidencePackageTransactionInput, type EvidencePackageTransactionResult } from "../aaf/aaf-writer-repository";
import { LAUNCH_READINESS_SOURCE_DIMENSIONS, type LaunchReadinessSourceDimension } from "./launch-readiness-source-reader";
import {
  buildLaunchReadinessEvidencePackage,
  computeLaunchReadinessEvidenceSemanticWatermark,
  LaunchReadinessEvidenceBuilderError,
  stableLaunchReadinessEvidenceJson,
  type BuildLaunchReadinessEvidencePackageInput,
  type LaunchReadinessEvidenceRepository,
  type LaunchReadinessEvidenceWriter,
} from "./launch-readiness-evidence-builder";
import type {
  LaunchReadinessBlockerRow,
  LaunchReadinessCloseoutRow,
  LaunchReadinessDimensionRow,
  LaunchReadinessEvidenceReadModel,
  LaunchReadinessRecordRow,
  LaunchReadinessRefRow,
  LaunchReadinessWriterTx,
} from "./launch-readiness-writer-repository";

const SOURCE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "launch-readiness-evidence-builder.ts");

const REQUIRED_ROLES: Partial<Record<LaunchReadinessSourceDimension, string[]>> = {
  launch_approval: ["launch_approval_decision"],
  content_approval: ["content_approval_decision"],
  client_approval: ["client_approval_decision"],
  improved_candidate: ["improved_candidate_site_version", "improved_runtime_artifact"],
  publish_target: ["publish_target"],
  domain_readiness: ["ddom_readiness_snapshot"],
  billing_subscription: ["billing_subscription"],
  hosting_entitlement: ["hosting_entitlement"],
  rollback_readiness: ["rollback_readiness"],
  preview_smoke_qa: ["preview_smoke_qa"],
};

type MutableModel = LaunchReadinessEvidenceReadModel;

class FakeLaunchReadinessEvidenceRepository implements LaunchReadinessEvidenceRepository {
  constructor(public model: MutableModel | null) {}

  async withTransaction<T>(fn: (tx: LaunchReadinessWriterTx) => Promise<T>): Promise<T> {
    return fn({ async query() { return { rows: [], rowCount: 0 }; } });
  }

  async getReadinessEvidenceById(_tx: LaunchReadinessWriterTx, readinessId: string): Promise<LaunchReadinessEvidenceReadModel | null> {
    return this.model?.readiness.id === readinessId ? this.model : null;
  }

  async countOpenP0Blockers(_tx: LaunchReadinessWriterTx, readinessId: string): Promise<number> {
    return (
      this.model?.blockers.filter((blocker) => blocker.readiness_id === readinessId && blocker.severity === "p0_blocker" && blocker.status === "open")
        .length ?? 0
    );
  }
}

class IdempotentFakeAafEvidenceWriter implements LaunchReadinessEvidenceWriter {
  calls: EvidencePackageTransactionInput[] = [];
  approvalRequests: unknown[] = [];
  approvalDecisions: unknown[] = [];
  gateAttempts: unknown[] = [];
  private byKey = new Map<string, { id: string; input: EvidencePackageTransactionInput }>();

  async createEvidencePackageTransaction(input: EvidencePackageTransactionInput): Promise<EvidencePackageTransactionResult> {
    this.calls.push(input);
    const existing = this.byKey.get(input.evidencePackage.idempotencyKey);
    if (existing) {
      if (stableLaunchReadinessEvidenceJson(existing.input) !== stableLaunchReadinessEvidenceJson(input)) {
        throw new AafIdempotencyConflictError("gnr8_aaf_evidence_packages", input.evidencePackage.idempotencyKey, ["evidence_payload"]);
      }
      return result(existing.id, input);
    }
    const id = `evidence-package-${this.byKey.size + 1}`;
    this.byKey.set(input.evidencePackage.idempotencyKey, { id, input });
    return result(id, input);
  }
}

function result(id: string, input: EvidencePackageTransactionInput): EvidencePackageTransactionResult {
  return {
    evidencePackage: { id, ...input.evidencePackage },
    sourceRefs: input.sourceRefs?.map((ref, index) => ({ id: `${id}:source:${index + 1}`, ...ref })) ?? [],
    items: input.items?.map((item, index) => ({ id: `${id}:item:${index + 1}`, ...item })) ?? [],
    freshnessCheck: input.freshnessCheck ? { id: `${id}:freshness`, ...input.freshnessCheck } : null,
    auditLink: null,
  };
}

function record(overrides: Partial<LaunchReadinessRecordRow> = {}): LaunchReadinessRecordRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    tenant_id: "tenant-test",
    client_id: "22222222-2222-4222-8222-222222222222",
    site_id: "33333333-3333-4333-8333-333333333333",
    migration_id: "44444444-4444-4444-8444-444444444444",
    launch_approval_ref: "launch-decision-test",
    launch_approval_source_watermark: "wm:launch",
    improved_candidate_site_version_ref: "site-version-test",
    improved_runtime_artifact_ref: "artifact-test",
    status: "ready",
    freshness_status: "fresh",
    semantic_source_watermark: "sha256:readiness",
    readiness_summary_json: { status: "ready" },
    limitation_summary_json: [],
    blocker_summary_json: [],
    actor_type: "system",
    actor_id: "writer",
    actor_role: "system",
    actor_display_label: null,
    correlation_id: "corr-writer",
    causation_id: null,
    idempotency_key: "idem-readiness",
    request_id: null,
    privacy_label: "client_confidential",
    retention_class: "compliance_long",
    metadata_json: { semanticFingerprint: "sha256:readiness" },
    created_at: "2026-08-04T10:00:00.000Z",
    updated_at: "2026-08-04T10:00:00.000Z",
    ...overrides,
  };
}

function dimension(name: LaunchReadinessSourceDimension, index: number, overrides: Partial<LaunchReadinessDimensionRow> = {}): LaunchReadinessDimensionRow {
  const required = !["dns_operator_evidence", "vercel_custom_domain_ssl", "stripe_payment", "limitations", "audit_timeline", "pasr_shadow_diagnostics"].includes(name);
  return {
    id: `dimension-${index}`,
    readiness_id: "11111111-1111-4111-8111-111111111111",
    dimension: name,
    dimension_status: "ready",
    source_refs_json: [],
    source_watermark: `wm:${name}`,
    freshness_status: "fresh",
    source_captured_at: "2026-08-04T09:00:00.000Z",
    freshness_checked_at: "2026-08-04T10:00:00.000Z",
    fresh_until: "2026-08-05T10:00:00.000Z",
    stale_at: null,
    missing_at: null,
    blocker_refs_json: [],
    limitations_json: [],
    diagnostics_json: {},
    required_for_launch_readiness: required,
    required_for_publish_activation: required,
    actor_type: "system",
    actor_id: "writer",
    actor_role: "system",
    correlation_id: "corr-writer",
    causation_id: null,
    idempotency_key: `idem-dimension-${name}`,
    privacy_label: "client_confidential",
    retention_class: "compliance_long",
    metadata_json: { semanticSourceWatermark: `sha256:${name}` },
    created_at: "2026-08-04T10:00:00.000Z",
    updated_at: "2026-08-04T10:00:00.000Z",
    ...overrides,
  };
}

function ref(role: string, index: number, dimensionId: string | null = null, overrides: Partial<LaunchReadinessRefRow> = {}): LaunchReadinessRefRow {
  return {
    id: `ref-${index}`,
    readiness_id: "11111111-1111-4111-8111-111111111111",
    dimension_id: dimensionId,
    ref_role: role,
    source_system: "gnr8",
    source_table: role.includes("approval") ? "gnr8_aaf_approval_decisions" : `gnr8_${role}`,
    source_type: role,
    source_record_id: `${role}-record`,
    source_ref: `gnr8:${role}:record`,
    source_version: "v1",
    source_watermark: `wm:${role}`,
    metadata_json: {},
    idempotency_key: `idem-ref-${role}`,
    created_at: "2026-08-04T10:00:00.000Z",
    ...overrides,
  };
}

function closeout(overrides: Partial<LaunchReadinessCloseoutRow> = {}): LaunchReadinessCloseoutRow {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    readiness_id: "11111111-1111-4111-8111-111111111111",
    final_status: "ready",
    final_evidence_summary_json: { ready: true },
    final_limitations_json: [],
    final_blockers_json: [],
    publish_activation_handoff_refs_json: [],
    actor_type: "system",
    actor_id: "writer",
    actor_role: "system",
    actor_display_label: null,
    correlation_id: "corr-closeout",
    causation_id: null,
    idempotency_key: "idem-closeout",
    request_id: null,
    privacy_label: "client_confidential",
    retention_class: "compliance_long",
    metadata_json: {},
    created_at: "2026-08-04T10:01:00.000Z",
    ...overrides,
  };
}

function model(overrides: Partial<MutableModel> = {}): MutableModel {
  const dimensions = LAUNCH_READINESS_SOURCE_DIMENSIONS.map((name, index) => dimension(name, index + 1));
  const dimensionIds = new Map(dimensions.map((item) => [item.dimension, item.id]));
  const refs = Object.entries(REQUIRED_ROLES).flatMap(([dimensionName, roles], index) =>
    roles.map((role, roleIndex) => ref(role, index * 10 + roleIndex + 1, dimensionIds.get(dimensionName) ?? null)),
  );
  refs.push(ref("pasr_shadow_result", 999, dimensionIds.get("pasr_shadow_diagnostics") ?? null, { source_table: "gnr8_pasr_shadow_results" }));
  return {
    readiness: record(),
    dimensions,
    refs,
    blockers: [],
    events: [],
    closeout: closeout(),
    ...overrides,
  };
}

function input(repository: LaunchReadinessEvidenceRepository, writer: LaunchReadinessEvidenceWriter, overrides: Partial<BuildLaunchReadinessEvidencePackageInput> = {}): BuildLaunchReadinessEvidencePackageInput {
  return {
    tenantId: "tenant-test",
    clientId: "22222222-2222-4222-8222-222222222222",
    siteId: "33333333-3333-4333-8333-333333333333",
    migrationId: "44444444-4444-4444-8444-444444444444",
    launchReadinessRecordId: "11111111-1111-4111-8111-111111111111",
    actor: { actorType: "system", actorId: "mvp40-test", actorRole: "system" },
    correlationId: "corr-test",
    idempotencyKey: "idem-evidence",
    policyVersion: "MVP-40",
    repository,
    writer,
    ...overrides,
  };
}

test("launch readiness evidence builder is server-only and import-isolated from mutation/provider paths", () => {
  const sourceText = fs.readFileSync(SOURCE_PATH, "utf8");
  assert.match(sourceText, /^import "server-only";/);
  assert.doesNotMatch(
    sourceText,
    /createApprovalRequestTransaction|createApprovalDecisionTransaction|createGateAttemptTransaction|publishApprovedSiteVersion|executeMigrationPublishActivation|switchActivePointer|rollbackToSiteVersionArtifact|createDdomReadinessSnapshot|manualSnapshot|checkDomainStatus|openprovider|stripe\.|new Stripe|vercel\.|ai_execution/i,
  );
});

test("builds evidence for ready readiness", async () => {
  const repository = new FakeLaunchReadinessEvidenceRepository(model());
  const writer = new IdempotentFakeAafEvidenceWriter();
  const built = await buildLaunchReadinessEvidencePackage(input(repository, writer));

  assert.equal(built.evidencePackageId, "evidence-package-1");
  assert.equal(writer.calls[0]?.evidencePackage.packageType, "single_site_launch_readiness_evidence");
  assert.equal(writer.calls[0]?.evidencePackage.subjectType, "single_site_launch_readiness_package");
  assert.equal(writer.calls[0]?.evidencePackage.status, "created");
  assert.equal(writer.calls[0]?.freshnessCheck?.result, "fresh");
  assert.equal(built.payload.explicitNonApprovalNonPublishFlags.createsApprovalRequest, false);
  assert.equal(built.payload.explicitNonApprovalNonPublishFlags.publishes, false);
  assert.ok(built.payload.sourceRefs.launch_readiness_record);
  assert.ok(built.payload.sourceRefs.launch_approval_decision);
  assert.ok(built.payload.sourceRefs.content_approval_decision);
  assert.ok(built.payload.sourceRefs.client_approval_decision);
  assert.ok(built.payload.sourceRefs.ddom_readiness_snapshot);
});

test("builds evidence for ready_with_limitations readiness", async () => {
  const readyWithLimitations = model({
    readiness: record({ status: "ready_with_limitations", readiness_summary_json: { status: "ready_with_limitations" } }),
  });
  const rollback = readyWithLimitations.dimensions.find((item) => item.dimension === "rollback_readiness")!;
  rollback.dimension_status = "ready_with_limitations";
  rollback.freshness_status = "stale";
  rollback.limitations_json = ["plan-only rollback readiness accepted for launch readiness evidence"];
  readyWithLimitations.blockers.push({
    id: "blocker-limitation",
    readiness_id: readyWithLimitations.readiness.id,
    dimension_id: rollback.id,
    severity: "p2_minor",
    category: "limitation",
    status: "accepted_limitation",
    description: "plan-only rollback readiness accepted",
    source_refs_json: [],
    resolution_refs_json: [{ acceptedBy: "policy" }],
    actor_type: "system",
    actor_id: "writer",
    actor_role: "system",
    correlation_id: "corr",
    causation_id: null,
    idempotency_key: "idem-limitation",
    privacy_label: "client_confidential",
    retention_class: "compliance_long",
    metadata_json: {},
    created_at: "2026-08-04T10:00:00.000Z",
    resolved_at: "2026-08-04T10:00:00.000Z",
    updated_at: "2026-08-04T10:00:00.000Z",
  });

  const writer = new IdempotentFakeAafEvidenceWriter();
  const built = await buildLaunchReadinessEvidencePackage(input(new FakeLaunchReadinessEvidenceRepository(readyWithLimitations), writer));
  assert.equal(built.payload.readinessStatus, "ready_with_limitations");
  assert.equal(writer.calls[0]?.freshnessCheck?.result, "partial_timeline");
  assert.ok(built.payload.acceptedLimitations.length > 0);
});

test("refuses blocked readiness", async () => {
  const repository = new FakeLaunchReadinessEvidenceRepository(model({ readiness: record({ status: "blocked" }) }));
  await assert.rejects(
    () => buildLaunchReadinessEvidencePackage(input(repository, new IdempotentFakeAafEvidenceWriter())),
    (error) => error instanceof LaunchReadinessEvidenceBuilderError && error.blockerCodes.includes("readiness_status_blocked"),
  );
});

test("refuses stale readiness", async () => {
  const repository = new FakeLaunchReadinessEvidenceRepository(model({ readiness: record({ freshness_status: "stale" }) }));
  await assert.rejects(
    () => buildLaunchReadinessEvidencePackage(input(repository, new IdempotentFakeAafEvidenceWriter())),
    (error) => error instanceof LaunchReadinessEvidenceBuilderError && error.blockerCodes.includes("readiness_freshness_stale"),
  );
});

test("refuses missing required dimension", async () => {
  const missing = model();
  missing.dimensions = missing.dimensions.filter((item) => item.dimension !== "publish_target");
  const repository = new FakeLaunchReadinessEvidenceRepository(missing);
  await assert.rejects(
    () => buildLaunchReadinessEvidencePackage(input(repository, new IdempotentFakeAafEvidenceWriter())),
    (error) => error instanceof LaunchReadinessEvidenceBuilderError && error.blockerCodes.includes("required_dimension_missing:publish_target"),
  );
});

test("refuses open P0 blocker", async () => {
  const blocked = model();
  blocked.blockers.push({
    id: "blocker-p0",
    readiness_id: blocked.readiness.id,
    dimension_id: blocked.dimensions[0]!.id,
    severity: "p0_blocker",
    category: "publish_target",
    status: "open",
    description: "publish target unresolved",
    source_refs_json: [],
    resolution_refs_json: [],
    actor_type: "system",
    actor_id: "writer",
    actor_role: "system",
    correlation_id: "corr",
    causation_id: null,
    idempotency_key: "idem-p0",
    privacy_label: "client_confidential",
    retention_class: "compliance_long",
    metadata_json: {},
    created_at: "2026-08-04T10:00:00.000Z",
    resolved_at: null,
    updated_at: "2026-08-04T10:00:00.000Z",
  });
  const repository = new FakeLaunchReadinessEvidenceRepository(blocked);
  await assert.rejects(
    () => buildLaunchReadinessEvidencePackage(input(repository, new IdempotentFakeAafEvidenceWriter())),
    (error) => error instanceof LaunchReadinessEvidenceBuilderError && error.blockerCodes.some((code) => code.startsWith("open_p0_blockers")),
  );
});

test("refuses missing required refs", async () => {
  const missingRef = model();
  missingRef.refs = missingRef.refs.filter((item) => item.ref_role !== "preview_smoke_qa");
  const repository = new FakeLaunchReadinessEvidenceRepository(missingRef);
  await assert.rejects(
    () => buildLaunchReadinessEvidencePackage(input(repository, new IdempotentFakeAafEvidenceWriter())),
    (error) => error instanceof LaunchReadinessEvidenceBuilderError && error.blockerCodes.includes("required_ref_missing:preview_smoke_qa"),
  );
});

test("refuses expected watermark mismatch", async () => {
  const repository = new FakeLaunchReadinessEvidenceRepository(model());
  await assert.rejects(
    () =>
      buildLaunchReadinessEvidencePackage(
        input(repository, new IdempotentFakeAafEvidenceWriter(), { expectedSemanticSourceWatermark: "sha256:expected-different" }),
      ),
    (error) => error instanceof LaunchReadinessEvidenceBuilderError && error.blockerCodes.includes("expected_semantic_source_watermark_mismatch"),
  );
});

test("closeout required and missing fails closed", async () => {
  const repository = new FakeLaunchReadinessEvidenceRepository(model({ closeout: null }));
  await assert.rejects(
    () => buildLaunchReadinessEvidencePackage(input(repository, new IdempotentFakeAafEvidenceWriter(), { requireCloseout: true })),
    (error) => error instanceof LaunchReadinessEvidenceBuilderError && error.blockerCodes.includes("required_closeout_missing"),
  );
});

test("PASR diagnostic refs remain non-enforcing", async () => {
  const writer = new IdempotentFakeAafEvidenceWriter();
  const built = await buildLaunchReadinessEvidencePackage(input(new FakeLaunchReadinessEvidenceRepository(model()), writer));
  const pasr = writer.calls[0]?.sourceRefs?.find((item) => item.metadataJson?.refRole === "pasr_shadow_result");
  assert.equal(pasr?.metadataJson?.nonEnforcing, true);
  assert.equal(built.payload.dimensionStatuses.pasr_shadow_diagnostics.required, false);
});

test("same idempotency key reuses and semantic drift conflicts", async () => {
  const writer = new IdempotentFakeAafEvidenceWriter();
  const firstModel = model();
  const repository = new FakeLaunchReadinessEvidenceRepository(firstModel);
  const first = await buildLaunchReadinessEvidencePackage(input(repository, writer));
  const retry = await buildLaunchReadinessEvidencePackage(input(repository, writer));
  assert.equal(retry.evidencePackageId, first.evidencePackageId);

  firstModel.refs.find((item) => item.ref_role === "improved_runtime_artifact")!.source_watermark = "wm:artifact-drift";
  await assert.rejects(
    () => buildLaunchReadinessEvidencePackage(input(repository, writer)),
    (error) => error instanceof AafIdempotencyConflictError && error.driftedFields.includes("evidence_payload"),
  );
});

test("semantic watermark excludes volatile actor display and correlation fields", () => {
  const readModel = model();
  const first = computeLaunchReadinessEvidenceSemanticWatermark({ readModel, policyVersion: "MVP-40" });
  readModel.readiness.actor_display_label = "Changed Display";
  readModel.readiness.correlation_id = "corr-changed";
  const second = computeLaunchReadinessEvidenceSemanticWatermark({ readModel, policyVersion: "MVP-40" });
  assert.equal(second, first);
});

test("no approval request, decision, or gate creation occurs", async () => {
  const writer = new IdempotentFakeAafEvidenceWriter();
  await buildLaunchReadinessEvidencePackage(input(new FakeLaunchReadinessEvidenceRepository(model()), writer));
  assert.equal(writer.calls.length, 1);
  assert.equal(writer.approvalRequests.length, 0);
  assert.equal(writer.approvalDecisions.length, 0);
  assert.equal(writer.gateAttempts.length, 0);
});
