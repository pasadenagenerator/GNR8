import assert from "node:assert/strict";
import test from "node:test";

import { SingleSiteIdempotencyConflictError, SingleSiteTransitionError } from "./single-site-state-contracts";
import { hashLaunchReadinessStableValue, LAUNCH_READINESS_SOURCE_DIMENSIONS, type LaunchReadinessSourceDimension, type LaunchReadinessSourceDimensionPackage, type LaunchReadinessSourcePackage, type LaunchReadinessSourceRef } from "./launch-readiness-source-reader";
import { LaunchReadinessService } from "./launch-readiness-service";
import type {
  CreateOrReuseLaunchReadinessBlockerInput,
  CreateOrReuseLaunchReadinessCloseoutInput,
  CreateOrReuseLaunchReadinessDimensionInput,
  CreateOrReuseLaunchReadinessEventInput,
  CreateOrReuseLaunchReadinessRecordInput,
  CreateOrReuseLaunchReadinessRefInput,
  LaunchReadinessBlockerRow,
  LaunchReadinessCloseoutRow,
  LaunchReadinessDimensionRow,
  LaunchReadinessEventRow,
  LaunchReadinessRecordRow,
  LaunchReadinessRefRow,
  LaunchReadinessWriterRepositoryLike,
  LaunchReadinessWriterTx,
} from "./launch-readiness-writer-repository";

type Row = Record<string, unknown>;

function canonical(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return canonical(JSON.parse(value));
    } catch {
      return value;
    }
  }
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonical(entry)]),
    );
  }
  return value ?? null;
}

function stable(value: unknown): string {
  return JSON.stringify(canonical(value));
}

function assertNoDrift(table: string, key: string, attempted: Row, existing: Row, fields: readonly string[]): void {
  const drifted = fields.filter((field) => stable(attempted[field]) !== stable(existing[field]));
  if (drifted.length > 0) throw new SingleSiteIdempotencyConflictError(table, key, drifted);
}

class FakeLaunchReadinessWriterRepository implements LaunchReadinessWriterRepositoryLike {
  records: LaunchReadinessRecordRow[] = [];
  dimensions: LaunchReadinessDimensionRow[] = [];
  refs: LaunchReadinessRefRow[] = [];
  blockers: LaunchReadinessBlockerRow[] = [];
  events: LaunchReadinessEventRow[] = [];
  closeouts: LaunchReadinessCloseoutRow[] = [];
  aafRecords: Row[] = [];
  ddomSnapshots: Row[] = [];
  publishActivationRecords: Row[] = [];

  async withTransaction<T>(fn: (tx: LaunchReadinessWriterTx) => Promise<T>): Promise<T> {
    return fn({ async query() { return { rows: [], rowCount: 0 }; } });
  }

  async createOrReuseReadinessRecord(_tx: LaunchReadinessWriterTx, input: CreateOrReuseLaunchReadinessRecordInput) {
    const row = this.recordRow(input);
    const existing = this.records.find((item) => item.idempotency_key === row.idempotency_key);
    if (existing) {
      assertNoDrift("gnr8_single_site_launch_readiness_records", row.idempotency_key, row, existing, [
        "tenant_id",
        "client_id",
        "site_id",
        "migration_id",
        "launch_approval_ref",
        "improved_candidate_site_version_ref",
        "improved_runtime_artifact_ref",
        "status",
        "freshness_status",
        "semantic_source_watermark",
        "readiness_summary_json",
        "limitation_summary_json",
        "blocker_summary_json",
        "metadata_json",
      ]);
      return { row: existing, reusedExisting: true };
    }
    this.records.push(row);
    return { row, reusedExisting: false };
  }

  async updateReadinessStatus(_tx: LaunchReadinessWriterTx, input: Parameters<LaunchReadinessWriterRepositoryLike["updateReadinessStatus"]>[1]) {
    const record = this.records.find((item) => item.id === input.readinessId);
    if (!record) throw new Error("missing readiness");
    record.status = input.status;
    record.freshness_status = input.freshnessStatus;
    if (input.readinessSummaryJson) record.readiness_summary_json = input.readinessSummaryJson;
    if (input.limitationSummaryJson) record.limitation_summary_json = input.limitationSummaryJson;
    if (input.blockerSummaryJson) record.blocker_summary_json = input.blockerSummaryJson;
    return record;
  }

  async createOrReuseDimension(_tx: LaunchReadinessWriterTx, input: CreateOrReuseLaunchReadinessDimensionInput) {
    const row = this.dimensionRow(input);
    const existing = this.dimensions.find((item) => item.idempotency_key === row.idempotency_key);
    if (existing) {
      assertNoDrift("gnr8_single_site_launch_readiness_dimensions", row.idempotency_key, row, existing, [
        "readiness_id",
        "dimension",
        "dimension_status",
        "source_refs_json",
        "source_watermark",
        "freshness_status",
        "limitations_json",
        "diagnostics_json",
        "required_for_launch_readiness",
      ]);
      return { row: existing, reusedExisting: true };
    }
    this.dimensions.push(row);
    return { row, reusedExisting: false };
  }

  async createOrReuseRef(_tx: LaunchReadinessWriterTx, input: CreateOrReuseLaunchReadinessRefInput) {
    const row = this.refRow(input);
    const existing = this.refs.find((item) => item.idempotency_key === row.idempotency_key);
    if (existing) return { row: existing, reusedExisting: true };
    this.refs.push(row);
    return { row, reusedExisting: false };
  }

  async createOrReuseBlocker(_tx: LaunchReadinessWriterTx, input: CreateOrReuseLaunchReadinessBlockerInput) {
    const row = this.blockerRow(input);
    const existing = this.blockers.find((item) => item.idempotency_key === row.idempotency_key);
    if (existing) return { row: existing, reusedExisting: true };
    this.blockers.push(row);
    return { row, reusedExisting: false };
  }

  async createOrReuseEvent(_tx: LaunchReadinessWriterTx, input: CreateOrReuseLaunchReadinessEventInput) {
    const row = this.eventRow(input);
    const existing = this.events.find((item) => item.idempotency_key === row.idempotency_key);
    if (existing) return { row: existing, reusedExisting: true };
    this.events.push(row);
    return { row, reusedExisting: false };
  }

  async createOrReuseCloseout(_tx: LaunchReadinessWriterTx, input: CreateOrReuseLaunchReadinessCloseoutInput) {
    const row = this.closeoutRow(input);
    const existing = this.closeouts.find((item) => item.idempotency_key === row.idempotency_key);
    if (existing) return { row: existing, reusedExisting: true };
    this.closeouts.push(row);
    return { row, reusedExisting: false };
  }

  async getReadinessById(_tx: LaunchReadinessWriterTx, readinessId: string) {
    return this.records.find((item) => item.id === readinessId) ?? null;
  }

  async getReadinessEvidenceById(_tx: LaunchReadinessWriterTx, readinessId: string) {
    const readiness = await this.getReadinessById(_tx, readinessId);
    if (!readiness) return null;
    return {
      readiness,
      dimensions: this.dimensions.filter((item) => item.readiness_id === readinessId),
      refs: this.refs.filter((item) => item.readiness_id === readinessId),
      blockers: this.blockers.filter((item) => item.readiness_id === readinessId),
      events: this.events.filter((item) => item.readiness_id === readinessId),
      closeout: this.closeouts.find((item) => item.readiness_id === readinessId) ?? null,
    };
  }

  async countOpenP0Blockers(_tx: LaunchReadinessWriterTx, readinessId: string): Promise<number> {
    return this.blockers.filter((item) => item.readiness_id === readinessId && item.severity === "p0_blocker" && item.status === "open").length;
  }

  async nextEventIndex(_tx: LaunchReadinessWriterTx, readinessId: string): Promise<number> {
    return this.events.filter((item) => item.readiness_id === readinessId).length + 1;
  }

  private recordRow(input: CreateOrReuseLaunchReadinessRecordInput): LaunchReadinessRecordRow {
    return {
      id: `readiness-${this.records.length + 1}`,
      tenant_id: input.tenantId,
      client_id: input.clientId,
      site_id: input.siteId,
      migration_id: input.migrationId,
      launch_approval_ref: input.launchApprovalRef,
      launch_approval_source_watermark: input.launchApprovalSourceWatermark ?? null,
      improved_candidate_site_version_ref: input.improvedCandidateSiteVersionRef,
      improved_runtime_artifact_ref: input.improvedRuntimeArtifactRef,
      status: input.status,
      freshness_status: input.freshnessStatus,
      semantic_source_watermark: input.semanticSourceWatermark,
      readiness_summary_json: input.readinessSummaryJson,
      limitation_summary_json: input.limitationSummaryJson,
      blocker_summary_json: input.blockerSummaryJson,
      actor_type: input.actor.actorType,
      actor_id: input.actor.actorId,
      actor_role: input.actor.actorRole,
      actor_display_label: input.actor.actorDisplayLabel ?? null,
      correlation_id: input.correlationId,
      causation_id: input.causationId ?? null,
      idempotency_key: input.idempotencyKey,
      request_id: input.requestId ?? null,
      privacy_label: input.privacyLabel ?? "client_confidential",
      retention_class: input.retentionClass ?? "compliance_long",
      metadata_json: input.metadataJson ?? {},
      created_at: "2026-08-04T10:00:00.000Z",
      updated_at: "2026-08-04T10:00:00.000Z",
    };
  }

  private dimensionRow(input: CreateOrReuseLaunchReadinessDimensionInput): LaunchReadinessDimensionRow {
    return {
      id: `dimension-${this.dimensions.length + 1}`,
      readiness_id: input.readinessId,
      dimension: input.dimension,
      dimension_status: input.dimensionStatus,
      source_refs_json: input.sourceRefsJson,
      source_watermark: input.sourceWatermark ?? null,
      freshness_status: input.freshnessStatus,
      source_captured_at: input.sourceCapturedAt ?? null,
      freshness_checked_at: "2026-08-04T10:00:00.000Z",
      fresh_until: input.freshUntil ?? null,
      stale_at: input.staleAt ?? null,
      missing_at: input.missingAt ?? null,
      blocker_refs_json: input.blockerRefsJson,
      limitations_json: input.limitationsJson,
      diagnostics_json: input.diagnosticsJson,
      required_for_launch_readiness: input.requiredForLaunchReadiness,
      required_for_publish_activation: input.requiredForPublishActivation,
      actor_type: input.actor.actorType,
      actor_id: input.actor.actorId,
      actor_role: input.actor.actorRole,
      correlation_id: input.correlationId,
      causation_id: input.causationId ?? null,
      idempotency_key: input.idempotencyKey,
      privacy_label: input.privacyLabel ?? "client_confidential",
      retention_class: input.retentionClass ?? "compliance_long",
      metadata_json: input.metadataJson ?? {},
      created_at: "2026-08-04T10:00:00.000Z",
      updated_at: "2026-08-04T10:00:00.000Z",
    };
  }

  private refRow(input: CreateOrReuseLaunchReadinessRefInput): LaunchReadinessRefRow {
    return {
      id: `ref-${this.refs.length + 1}`,
      readiness_id: input.readinessId,
      dimension_id: input.dimensionId ?? null,
      ref_role: input.refRole,
      source_system: input.sourceSystem ?? "gnr8",
      source_table: input.sourceTable ?? null,
      source_type: input.sourceType,
      source_record_id: input.sourceRecordId,
      source_ref: input.sourceRef,
      source_version: input.sourceVersion ?? null,
      source_watermark: input.sourceWatermark ?? null,
      metadata_json: input.metadataJson ?? {},
      idempotency_key: input.idempotencyKey,
      created_at: "2026-08-04T10:00:00.000Z",
    };
  }

  private blockerRow(input: CreateOrReuseLaunchReadinessBlockerInput): LaunchReadinessBlockerRow {
    return {
      id: `blocker-${this.blockers.length + 1}`,
      readiness_id: input.readinessId,
      dimension_id: input.dimensionId ?? null,
      severity: input.severity,
      category: input.category,
      status: input.status,
      description: input.description,
      source_refs_json: input.sourceRefsJson,
      resolution_refs_json: input.resolutionRefsJson ?? [],
      actor_type: input.actor.actorType,
      actor_id: input.actor.actorId,
      actor_role: input.actor.actorRole,
      correlation_id: input.correlationId,
      causation_id: input.causationId ?? null,
      idempotency_key: input.idempotencyKey,
      privacy_label: input.privacyLabel ?? "client_confidential",
      retention_class: input.retentionClass ?? "compliance_long",
      metadata_json: input.metadataJson ?? {},
      created_at: "2026-08-04T10:00:00.000Z",
      resolved_at: input.status === "accepted_limitation" || input.status === "resolved" ? "2026-08-04T10:00:00.000Z" : null,
      updated_at: "2026-08-04T10:00:00.000Z",
    };
  }

  private eventRow(input: CreateOrReuseLaunchReadinessEventInput): LaunchReadinessEventRow {
    return {
      id: `event-${this.events.length + 1}`,
      readiness_id: input.readinessId,
      dimension_id: input.dimensionId ?? null,
      blocker_id: input.blockerId ?? null,
      event_index: input.eventIndex,
      event_action: input.eventAction,
      from_status: input.fromStatus ?? null,
      to_status: input.toStatus ?? null,
      actor_type: input.actor.actorType,
      actor_id: input.actor.actorId,
      actor_role: input.actor.actorRole,
      actor_display_label: input.actor.actorDisplayLabel ?? null,
      details_json: input.detailsJson ?? {},
      source_watermark: input.sourceWatermark ?? null,
      semantic_watermark: input.semanticWatermark ?? null,
      payload_hash: input.payloadHash ?? null,
      correlation_id: input.correlationId,
      causation_id: input.causationId ?? null,
      idempotency_key: input.idempotencyKey,
      request_id: input.requestId ?? null,
      privacy_label: input.privacyLabel ?? "client_confidential",
      retention_class: input.retentionClass ?? "compliance_long",
      metadata_json: input.metadataJson ?? {},
      occurred_at: "2026-08-04T10:00:00.000Z",
      created_at: "2026-08-04T10:00:00.000Z",
    };
  }

  private closeoutRow(input: CreateOrReuseLaunchReadinessCloseoutInput): LaunchReadinessCloseoutRow {
    return {
      id: `closeout-${this.closeouts.length + 1}`,
      readiness_id: input.readinessId,
      final_status: input.finalStatus,
      final_evidence_summary_json: input.finalEvidenceSummaryJson,
      final_limitations_json: input.finalLimitationsJson,
      final_blockers_json: input.finalBlockersJson,
      publish_activation_handoff_refs_json: input.publishActivationHandoffRefsJson,
      actor_type: input.actor.actorType,
      actor_id: input.actor.actorId,
      actor_role: input.actor.actorRole,
      actor_display_label: input.actor.actorDisplayLabel ?? null,
      correlation_id: input.correlationId,
      causation_id: input.causationId ?? null,
      idempotency_key: input.idempotencyKey,
      request_id: input.requestId ?? null,
      privacy_label: input.privacyLabel ?? "client_confidential",
      retention_class: input.retentionClass ?? "compliance_long",
      metadata_json: input.metadataJson ?? {},
      created_at: "2026-08-04T10:00:00.000Z",
    };
  }
}

function ref(dimension: LaunchReadinessSourceDimension, suffix = "ready"): LaunchReadinessSourceRef {
  return {
    sourceSystem: "gnr8",
    sourceTable: dimension === "domain_readiness" ? "gnr8_ddom_readiness_snapshots" : `gnr8_${dimension}`,
    sourceType: dimension,
    sourceRecordId: `${dimension}-${suffix}`,
    sourceRef: `gnr8:${dimension}:${suffix}`,
    sourceVersion: "v1",
    sourceWatermark: `wm:${dimension}:${suffix}`,
    capturedAt: "2026-08-04T09:00:00.000Z",
    freshUntil: "2026-08-05T09:00:00.000Z",
    evidenceOnly: true,
    metadata: {},
  };
}

function dimension(
  name: LaunchReadinessSourceDimension,
  overrides: Partial<LaunchReadinessSourceDimensionPackage> = {},
): LaunchReadinessSourceDimensionPackage {
  const sourceRefs = overrides.sourceRefs ?? [ref(name)];
  const status = overrides.status ?? "ready";
  const freshnessStatus = overrides.freshnessStatus ?? (status === "not_applicable" ? "not_applicable" : "fresh");
  const blockers = overrides.blockers ?? [];
  const limitations = overrides.limitations ?? [];
  const warnings = overrides.warnings ?? [];
  const diagnostics = overrides.diagnostics ?? {};
  const canonical = { name, status, freshnessStatus, sourceRefs, blockers, limitations, warnings, diagnostics };
  return {
    dimension: name,
    status,
    freshnessStatus,
    sourceRefs,
    sourceWatermarks: sourceRefs.map((item) => item.sourceWatermark).filter((item): item is string => Boolean(item)),
    semanticSourceWatermark: `sha256:${hashLaunchReadinessStableValue(canonical)}`,
    sourceCapturedAt: "2026-08-04T09:00:00.000Z",
    freshUntil: "2026-08-05T09:00:00.000Z",
    blockers,
    limitations,
    warnings,
    diagnostics,
    requiredForLaunchReadiness: overrides.requiredForLaunchReadiness ?? !["limitations", "audit_timeline", "pasr_shadow_diagnostics", "stripe_payment"].includes(name),
    requiredForPublishActivation: overrides.requiredForPublishActivation ?? !["limitations", "audit_timeline", "pasr_shadow_diagnostics", "stripe_payment"].includes(name),
  };
}

function pkg(overrides: Partial<LaunchReadinessSourcePackage> = {}, dimensionOverrides: Partial<Record<LaunchReadinessSourceDimension, Partial<LaunchReadinessSourceDimensionPackage>>> = {}): LaunchReadinessSourcePackage {
  const dimensions = Object.fromEntries(
    LAUNCH_READINESS_SOURCE_DIMENSIONS.map((name) => [name, dimension(name, dimensionOverrides[name])]),
  ) as Record<LaunchReadinessSourceDimension, LaunchReadinessSourceDimensionPackage>;
  if (dimensionOverrides.client_approval?.status === "not_applicable") dimensions.client_approval.sourceRefs = [];
  const blockerSummaries = Object.values(dimensions).flatMap((item) => item.blockers).sort();
  const limitations = Object.values(dimensions).flatMap((item) => item.limitations).sort();
  const missingSourceTruth = Object.values(dimensions).filter((item) => item.status === "missing").map((item) => item.dimension);
  const staleSourceTruth = Object.values(dimensions).filter((item) => item.status === "stale").map((item) => item.dimension);
  return {
    identity: {
      tenantId: "tenant-test",
      clientId: "11111111-1111-4111-8111-111111111111",
      siteId: "22222222-2222-4222-8222-222222222222",
      migrationId: "33333333-3333-4333-8333-333333333333",
      improvedCandidateSiteVersionRef: "site-version-ready",
      improvedRuntimeArtifactRef: "artifact-ready",
      launchApprovalDecisionRef: "launch-decision-ready",
    },
    readTrace: {
      actorType: "system",
      actorId: "source-reader",
      actorRole: "test",
      correlationId: "corr-source",
      causationId: null,
      idempotencyKey: "idem-source",
      requestId: null,
      readerVersion: "mvp-38-launch-readiness-source-reader:v1",
    },
    transactionTimestamp: "2026-08-04T10:00:00.000Z",
    overallSourceStatus: "ready",
    freshnessStatus: staleSourceTruth.length > 0 ? "stale" : missingSourceTruth.length > 0 ? "missing" : "fresh",
    dimensions,
    blockerSummaries,
    limitations,
    warnings: [],
    diagnostics: {},
    missingSourceTruth,
    staleSourceTruth,
    unsupportedSourceTruth: [],
    recommendedNextAction: blockerSummaries[0] ? "resolve_blocker" : "review_source_package_for_future_launch_readiness_writer",
    semanticSourceWatermark: `sha256:${hashLaunchReadinessStableValue({ dimensions: Object.fromEntries(Object.entries(dimensions).map(([key, item]) => [key, item.semanticSourceWatermark])), blockerSummaries, limitations })}`,
    derivedOnly: true,
    mutatesSourceTruth: false,
    nonEnforcing: true,
    publishActionBlocked: false,
    publishActivationApproved: false,
    ...overrides,
  };
}

function service(repo = new FakeLaunchReadinessWriterRepository()) {
  return { repo, service: new LaunchReadinessService(repo) };
}

test("ready source package writes ready record, dimensions, refs, and events", async () => {
  const { repo, service: subject } = service();
  const result = await subject.recordLaunchReadinessFromSources({ sourcePackage: pkg(), idempotencyKey: "idem-ready" });
  assert.equal(result.readiness.status, "ready");
  assert.equal(repo.records.length, 1);
  assert.equal(repo.dimensions.length, 16);
  assert.ok(repo.refs.length >= 15);
  assert.ok(result.eventActions.includes("readiness_created"));
  assert.ok(result.eventActions.includes("evidence_collection_started"));
  assert.ok(result.eventActions.includes("dimension_recorded"));
  assert.ok(result.eventActions.includes("dimension_ref_recorded"));
  assert.ok(result.eventActions.includes("readiness_marked_ready"));
  assert.equal(result.boundary.createsAafRecords, false);
  assert.equal(result.boundary.providerCalls, false);
});

test("ready-with-limitations package writes accepted limitations", async () => {
  const { repo, service: subject } = service();
  const result = await subject.recordLaunchReadinessFromSources(
    { sourcePackage: pkg({ overallSourceStatus: "ready_with_limitations" }, { launch_approval: { status: "ready_with_limitations", limitations: ["launch_caveat"] } }), idempotencyKey: "idem-limitations" },
  );
  assert.equal(result.readiness.status, "ready_with_limitations");
  assert.equal(result.limitationCount, 1);
  assert.equal(repo.blockers.some((item) => item.status === "accepted_limitation" && item.category === "limitation"), true);
  assert.ok(result.eventActions.includes("limitation_accepted"));
  assert.ok(result.eventActions.includes("readiness_marked_ready_with_limitations"));
});

test("missing required domain readiness blocks", async () => {
  const { repo, service: subject } = service();
  const result = await subject.recordLaunchReadinessFromSources({
    sourcePackage: pkg({ overallSourceStatus: "missing" }, { domain_readiness: { status: "missing", freshnessStatus: "missing", blockers: ["missing_ddom_snapshot"], sourceRefs: [] } }),
    idempotencyKey: "idem-domain-missing",
  });
  assert.equal(result.readiness.status, "blocked");
  assert.equal(repo.blockers.some((item) => item.category === "domain_dns" && item.severity === "p0_blocker"), true);
});

test("stale DDOM maps to stale readiness when no stronger blocker is present", async () => {
  const { repo, service: subject } = service();
  const result = await subject.recordLaunchReadinessFromSources({
    sourcePackage: pkg({ overallSourceStatus: "stale", freshnessStatus: "stale" }, { domain_readiness: { status: "stale", freshnessStatus: "stale", blockers: ["domain_readiness_stale"], limitations: ["stale_ddom_snapshot"] } }),
    idempotencyKey: "idem-ddom-stale",
  });
  assert.equal(result.readiness.status, "stale");
  assert.equal(repo.blockers.some((item) => item.category === "domain_dns" && item.severity === "p0_blocker"), true);
  assert.ok(result.eventActions.includes("readiness_marked_stale"));
});

test("missing billing subscription blocks", async () => {
  const { service: subject } = service();
  const result = await subject.recordLaunchReadinessFromSources({
    sourcePackage: pkg({ overallSourceStatus: "missing" }, { billing_subscription: { status: "missing", freshnessStatus: "missing", blockers: ["missing_billing_subscription_source_truth"], sourceRefs: [] } }),
    idempotencyKey: "idem-billing-missing",
  });
  assert.equal(result.readiness.status, "blocked");
  assert.equal(result.blockerCount, 1);
});

test("missing hosting entitlement blocks", async () => {
  const { service: subject } = service();
  const result = await subject.recordLaunchReadinessFromSources({
    sourcePackage: pkg({ overallSourceStatus: "missing" }, { hosting_entitlement: { status: "missing", freshnessStatus: "missing", blockers: ["missing_site_scoped_hosting_entitlement_truth"], sourceRefs: [] } }),
    idempotencyKey: "idem-hosting-missing",
  });
  assert.equal(result.readiness.status, "blocked");
  assert.equal(result.blockerCount, 1);
});

test("missing rollback readiness blocks", async () => {
  const { service: subject } = service();
  const result = await subject.recordLaunchReadinessFromSources({
    sourcePackage: pkg({ overallSourceStatus: "missing" }, { rollback_readiness: { status: "missing", freshnessStatus: "missing", blockers: ["missing_rollback_readiness_evidence"], sourceRefs: [] } }),
    idempotencyKey: "idem-rollback-missing",
  });
  assert.equal(result.readiness.status, "blocked");
  assert.equal(result.blockerCount, 1);
});

test("missing smoke QA blocks", async () => {
  const { service: subject } = service();
  const result = await subject.recordLaunchReadinessFromSources({
    sourcePackage: pkg({ overallSourceStatus: "missing" }, { preview_smoke_qa: { status: "missing", freshnessStatus: "missing", blockers: ["missing_preview_smoke_qa_evidence"], sourceRefs: [] } }),
    idempotencyKey: "idem-smoke-missing",
  });
  assert.equal(result.readiness.status, "blocked");
  assert.equal(result.blockerCount, 1);
});

test("client approval not required maps not_applicable and does not block", async () => {
  const { repo, service: subject } = service();
  const result = await subject.recordLaunchReadinessFromSources({
    sourcePackage: pkg({}, { client_approval: { status: "not_applicable", freshnessStatus: "not_applicable", requiredForLaunchReadiness: false, requiredForPublishActivation: false, sourceRefs: [] } }),
    idempotencyKey: "idem-client-na",
  });
  assert.equal(result.readiness.status, "ready");
  const clientDimension = repo.dimensions.find((item) => item.dimension === "client_approval");
  assert.equal(clientDimension?.dimension_status, "not_applicable");
  assert.equal(clientDimension?.required_for_launch_readiness, false);
});

test("PASR diagnostics do not block", async () => {
  const { repo, service: subject } = service();
  const result = await subject.recordLaunchReadinessFromSources({
    sourcePackage: pkg({}, { pasr_shadow_diagnostics: { status: "missing", freshnessStatus: "missing", blockers: ["pasr_missing"], requiredForLaunchReadiness: true, sourceRefs: [] } }),
    idempotencyKey: "idem-pasr",
  });
  assert.equal(result.readiness.status, "ready");
  assert.equal(repo.blockers.some((item) => item.description === "pasr_missing"), false);
  assert.equal(repo.dimensions.find((item) => item.dimension === "pasr_shadow_diagnostics")?.required_for_launch_readiness, false);
});

test("read failure package blocks fail-closed", async () => {
  const { repo, service: subject } = service();
  const result = await subject.recordLaunchReadinessFromSources({
    sourcePackage: pkg({ overallSourceStatus: "blocked", diagnostics: { failClosed: true } }, { launch_approval: { status: "blocked", blockers: ["launch_readiness_source_reader_failed_closed"] } }),
    idempotencyKey: "idem-read-failure",
  });
  assert.equal(result.readiness.status, "blocked");
  assert.equal(repo.blockers.some((item) => item.description === "launch_readiness_source_reader_failed_closed"), true);
});

test("idempotent replay reuses the readiness record", async () => {
  const { repo, service: subject } = service();
  const sourcePackage = pkg();
  const first = await subject.recordLaunchReadinessFromSources({ sourcePackage, idempotencyKey: "idem-replay" });
  const second = await subject.recordLaunchReadinessFromSources({ sourcePackage, idempotencyKey: "idem-replay" });
  assert.equal(first.readiness.id, second.readiness.id);
  assert.equal(second.idempotency.reused, true);
  assert.equal(repo.records.length, 1);
});

test("idempotency drift conflicts", async () => {
  const { service: subject } = service();
  await subject.recordLaunchReadinessFromSources({ sourcePackage: pkg(), idempotencyKey: "idem-drift" });
  await assert.rejects(
    () =>
      subject.recordLaunchReadinessFromSources({
        sourcePackage: pkg({}, { publish_target: { status: "blocked", blockers: ["disabled_publish_target"] } }),
        idempotencyKey: "idem-drift",
      }),
    SingleSiteIdempotencyConflictError,
  );
});

test("closeout requires ready or ready_with_limitations", async () => {
  const { service: subject } = service();
  const blocked = await subject.recordLaunchReadinessFromSources({
    sourcePackage: pkg({ overallSourceStatus: "missing" }, { domain_readiness: { status: "missing", freshnessStatus: "missing", blockers: ["missing_ddom_snapshot"], sourceRefs: [] } }),
    idempotencyKey: "idem-closeout-blocked-record",
  });
  await assert.rejects(
    () =>
      subject.recordLaunchReadinessCloseout({
        readinessId: blocked.readiness.id,
        actor: { actorType: "human", actorId: "operator", actorRole: "migration_operator" },
        correlationId: "corr-closeout",
        idempotencyKey: "idem-closeout-blocked",
        finalEvidenceSummaryJson: { ready: false },
      }),
    SingleSiteTransitionError,
  );
});

test("closeout records handoff refs only and does not create publish activation records", async () => {
  const { repo, service: subject } = service();
  const ready = await subject.recordLaunchReadinessFromSources({ sourcePackage: pkg(), idempotencyKey: "idem-closeout-ready-record" });
  const closeout = await subject.recordLaunchReadinessCloseout({
    readinessId: ready.readiness.id,
    actor: { actorType: "human", actorId: "operator", actorRole: "migration_operator" },
    correlationId: "corr-closeout",
    idempotencyKey: "idem-closeout-ready",
    finalEvidenceSummaryJson: { ready: true },
    publishActivationHandoffRefsJson: [
      {
        sourceType: "publish_activation_handoff",
        sourceRecordId: "handoff-1",
        sourceRef: "gnr8:publish_activation_handoff:handoff-1",
        sourceWatermark: "wm-handoff",
      },
    ],
  });
  assert.equal(closeout.eventActions.includes("closeout_recorded"), true);
  assert.equal(repo.closeouts.length, 1);
  assert.equal(closeout.refs.length, 1);
  assert.equal(repo.publishActivationRecords.length, 0);
  assert.equal(repo.aafRecords.length, 0);
  assert.equal(repo.ddomSnapshots.length, 0);
});
