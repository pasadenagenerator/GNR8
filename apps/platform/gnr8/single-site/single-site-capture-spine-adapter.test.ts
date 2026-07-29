import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { SingleSiteIdempotencyConflictError, type SingleSiteMigrationState } from "./single-site-state-contracts";
import {
  SingleSiteCaptureSpineAdapter,
  type SingleSiteCaptureSpineAdapterDependencies,
  type SingleSiteCaptureSpineInput,
} from "./single-site-capture-spine-adapter";
import type { SingleSiteMigrationRow, SingleSiteStateWriterTx } from "./single-site-state-writer-repository";

const SOURCE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "single-site-capture-spine-adapter.ts");

function row(input: Partial<SingleSiteMigrationRow> & { id: string; idempotency_key: string; source_url: string }): SingleSiteMigrationRow {
  return {
    tenant_id: "tenant-test",
    client_id: "client-test",
    site_id: null,
    ownership_site_id: null,
    runtime_site_id: null,
    site_version_id: null,
    runtime_site_version_id: null,
    canonical_source_url: null,
    intended_launch_domain: null,
    current_state: "site_candidate_created",
    current_stage: "intake",
    state_version: 1,
    operator_owner_actor_id: null,
    current_blocker_count: 0,
    latest_source_evidence_review_id: null,
    latest_state_event_id: null,
    latest_aaf_evidence_package_id: null,
    latest_aaf_audit_event_id: null,
    source_capture_refs_json: {},
    runtime_refs_json: {},
    proposal_refs_json: {},
    aaf_approval_refs_json: {},
    aaf_evidence_refs_json: {},
    aaf_audit_refs_json: {},
    ddom_snapshot_refs_json: {},
    ptt_publish_target_refs_json: {},
    billing_subscription_refs_json: {},
    hosting_entitlement_refs_json: {},
    rollback_refs_json: {},
    closeout_refs_json: {},
    limitations_json: [],
    warnings_json: [],
    blockers_json: [],
    source_watermark: null,
    payload_hash: null,
    validation_site_number: null,
    created_by_actor_type: "system",
    created_by_actor_id: "adapter-test",
    created_by_actor_display_label: null,
    correlation_id: "corr-test",
    causation_id: null,
    request_id: null,
    privacy_label: "client_confidential",
    retention_class: "compliance_long",
    metadata_json: {},
    terminal_at: null,
    created_at: "2026-07-29T12:00:00.000Z",
    updated_at: "2026-07-29T12:00:00.000Z",
    ...input,
  };
}

function baseInput(overrides: Partial<SingleSiteCaptureSpineInput> = {}): SingleSiteCaptureSpineInput {
  return {
    outcome: "completed",
    tenantId: "tenant-test",
    clientId: "client-test",
    siteId: "site-test",
    runtimeSiteId: "runtime-site-test",
    siteVersionId: "version-test",
    sourceUrl: "https://example.test/",
    canonicalSourceUrl: "https://example.test/",
    idempotencyKey: "idem-capture-test",
    correlationId: "corr-capture-test",
    actor: { actorType: "system", actorId: "adapter-test", actorRole: "capture_adapter" },
    captureRunId: "capture-test",
    renderJobId: "render-test",
    sourceEvidencePackageKey: "package-test",
    sourceWatermark: "watermark-test",
    captureStartedAt: "2026-07-29T12:00:00.000Z",
    captureCompletedAt: "2026-07-29T12:01:00.000Z",
    evidenceCapturedAt: "2026-07-29T12:01:00.000Z",
    evidenceRefs: [
      { category: "source_url", sourceEvidenceRefRole: "source_url", refType: "url", sourceRecordId: "https://example.test/" },
      { category: "page", sourceEvidenceRefRole: "page", refType: "page", sourceRecordId: "page-home" },
      { category: "screenshot", sourceEvidenceRefRole: "screenshot", refType: "desktop_viewport", sourceRecordId: "screenshot-home" },
      { category: "dom", sourceEvidenceRefRole: "rendered_dom", refType: "html", sourceRecordId: "dom-home" },
      { category: "text", sourceEvidenceRefRole: "text_extract", refType: "text", sourceRecordId: "text-home" },
      { category: "image", sourceEvidenceRefRole: "image_asset", refType: "image", sourceRecordId: "image-logo" },
      { category: "asset", sourceEvidenceRefRole: "asset", refType: "stylesheet", sourceRecordId: "asset-css" },
      { category: "font", sourceEvidenceRefRole: "font_ref", refType: "computed_font_family", sourceRecordId: "font-inter" },
      { category: "visual_identity", sourceEvidenceRefRole: "visual_identity", refType: "computed_style_samples", sourceRecordId: "visual" },
      { category: "metadata", sourceEvidenceRefRole: "metadata", refType: "metadata", sourceRecordId: "metadata" },
    ],
    ...overrides,
  };
}

function fakeDependencies() {
  const migrations = new Map<string, SingleSiteMigrationRow>();
  const migrationsByIdempotency = new Map<string, string>();
  const reviews = new Map<string, { id: string; status: string; idempotencyKey: string }>();
  const calls: Array<{ kind: string; input: Record<string, unknown> }> = [];
  let nextMigration = 1;
  let nextReview = 1;
  const tx = {
    async query() {
      throw new Error("fake adapter unit tx should not execute SQL");
    },
  } as SingleSiteStateWriterTx;

  const writer = {
    async withTransaction<T>(fn: (tx: SingleSiteStateWriterTx) => Promise<T>): Promise<T> {
      calls.push({ kind: "transaction", input: {} });
      return fn(tx);
    },
    async createMigration(_tx: unknown, input: Record<string, unknown>) {
      calls.push({ kind: "createMigration", input });
      const idempotencyKey = String(input.idempotencyKey);
      const existingId = migrationsByIdempotency.get(idempotencyKey);
      if (existingId) {
        const existing = migrations.get(existingId)!;
        if (existing.source_url !== input.sourceUrl) {
          throw new SingleSiteIdempotencyConflictError("gnr8_single_site_migrations", idempotencyKey, ["source_url"]);
        }
        return { row: existing, reusedExisting: true };
      }
      const created = row({
        id: `migration-${nextMigration++}`,
        idempotency_key: idempotencyKey,
        source_url: String(input.sourceUrl),
        tenant_id: String(input.tenantId),
        client_id: String(input.clientId),
        site_id: (input.siteId as string | null | undefined) ?? null,
        runtime_site_id: (input.runtimeSiteId as string | null | undefined) ?? null,
      });
      migrations.set(created.id, created);
      migrationsByIdempotency.set(idempotencyKey, created.id);
      return { row: created, reusedExisting: false };
    },
    async getMigrationById(_tx: unknown, migrationId: string) {
      calls.push({ kind: "getMigrationById", input: { migrationId } });
      return migrations.get(migrationId) ?? null;
    },
    async getMigrationByIdempotencyKey(_tx: unknown, idempotencyKey: string) {
      calls.push({ kind: "getMigrationByIdempotencyKey", input: { idempotencyKey } });
      const id = migrationsByIdempotency.get(idempotencyKey);
      return id ? migrations.get(id)! : null;
    },
    async getSourceEvidenceReviewByIdempotencyKey(_tx: unknown, idempotencyKey: string) {
      calls.push({ kind: "getSourceEvidenceReviewByIdempotencyKey", input: { idempotencyKey } });
      const review = [...reviews.values()].find((candidate) => candidate.idempotencyKey === idempotencyKey);
      return review
        ? {
            id: review.id,
            completeness_status: "complete",
            review_status: review.status,
          }
        : null;
    },
  };

  const transitionService = {
    async transition(input: { migrationId: string; toState: SingleSiteMigrationState }) {
      calls.push({ kind: "transition", input: input as unknown as Record<string, unknown> });
      const migration = migrations.get(input.migrationId);
      assert.ok(migration);
      const fromState = migration.current_state;
      migration.current_state = input.toState;
      migration.current_stage = input.toState.startsWith("source_evidence") ? "source_evidence_review" : "source_capture";
      migration.state_version += 1;
      return {
        migrationId: migration.id,
        stateEventId: `${input.toState}-event`,
        fromState,
        toState: input.toState,
        fromStage: "source_capture" as const,
        toStage: migration.current_stage,
        stateVersion: migration.state_version,
        reusedExisting: false,
      };
    },
  };

  const sourceEvidenceReviewService = {
    async createReview(input: Record<string, unknown>) {
      calls.push({ kind: "createReview", input });
      const existing = [...reviews.values()].find((review) => review.idempotencyKey === input.idempotencyKey);
      if (existing) {
        return { review: { id: existing.id, completeness_status: input.completenessStatus }, reusedExisting: true };
      }
      const id = `review-${nextReview++}`;
      reviews.set(id, { id, status: "not_started", idempotencyKey: String(input.idempotencyKey) });
      return { review: { id, completeness_status: input.completenessStatus }, reusedExisting: false };
    },
    async recordRef(input: Record<string, unknown>) {
      calls.push({ kind: "recordRef", input });
      return { refId: `${input.refRole}:${input.sourceRecordId}`, reusedExisting: false };
    },
    async addEvidenceItem(input: Record<string, unknown>) {
      calls.push({ kind: "addEvidenceItem", input });
      return { item: input, eventId: `${input.evidenceCategory}:event`, reusedExisting: false };
    },
    async markReadyForReview(input: Record<string, unknown>) {
      calls.push({ kind: "markReadyForReview", input });
      const review = reviews.get(String(input.reviewId));
      if (review) review.status = "ready_for_review";
      return { review: { id: input.reviewId, review_status: "ready_for_review" }, reusedExisting: false };
    },
  };

  return { writer, transitionService, sourceEvidenceReviewService, calls, migrations, reviews };
}

function testAdapter(deps: ReturnType<typeof fakeDependencies>): SingleSiteCaptureSpineAdapter {
  return new SingleSiteCaptureSpineAdapter(deps as unknown as SingleSiteCaptureSpineAdapterDependencies);
}

test("successful capture creates migration, review, evidence items, and review-required transition", async () => {
  const deps = fakeDependencies();
  const adapter = testAdapter(deps);

  const result = await adapter.recordCapture(baseInput());

  assert.equal(result.outcomeState, "source_evidence_review_required");
  assert.equal(result.reviewReadyForReview, true);
  assert.deepEqual(
    deps.calls.filter((call) => call.kind === "transition").map((call) => call.input.toState),
    ["source_capture_started", "source_capture_completed", "source_evidence_review_required"],
  );
  assert.equal(deps.calls.filter((call) => call.kind === "createReview").length, 1);
  const categories = deps.calls.filter((call) => call.kind === "addEvidenceItem").map((call) => call.input.evidenceCategory);
  assert.ok(categories.includes("source_url"));
  assert.ok(categories.includes("screenshot"));
  assert.ok(categories.includes("visual_identity"));
});

test("failed capture records source_capture_failed and does not create evidence review", async () => {
  const deps = fakeDependencies();
  const adapter = testAdapter(deps);

  const result = await adapter.recordCapture(baseInput({ outcome: "failed", evidenceRefs: [], failureReason: "fetch_failed" }));

  assert.equal(result.outcomeState, "source_capture_failed");
  assert.deepEqual(
    deps.calls.filter((call) => call.kind === "transition").map((call) => call.input.toState),
    ["source_capture_started", "source_capture_failed"],
  );
  assert.equal(deps.calls.some((call) => call.kind === "createReview"), false);
});

test("degraded capture records limitations and missing required evidence safely", async () => {
  const deps = fakeDependencies();
  const adapter = testAdapter(deps);

  await adapter.recordCapture(
    baseInput({
      limitations: [{ code: "rendered_capture_degraded" }],
      evidenceRefs: [
        { category: "source_url", sourceEvidenceRefRole: "source_url", refType: "url", sourceRecordId: "https://example.test/" },
        { category: "page", sourceEvidenceRefRole: "page", refType: "page", sourceRecordId: "page-home" },
        { category: "dom", sourceEvidenceRefRole: "raw_html", refType: "html", sourceRecordId: "raw-dom", status: "present_with_warnings" },
      ],
    }),
  );

  const items = deps.calls.filter((call) => call.kind === "addEvidenceItem");
  assert.ok(items.some((call) => call.input.evidenceCategory === "limitation"));
  assert.ok(items.some((call) => call.input.evidenceCategory === "screenshot" && call.input.status === "missing"));
  assert.ok(items.some((call) => call.input.evidenceCategory === "missing_evidence"));
});

test("completed capture without minimum evidence remains source_capture_completed", async () => {
  const deps = fakeDependencies();
  const adapter = testAdapter(deps);

  const result = await adapter.recordCapture(
    baseInput({
      evidenceRefs: [
        { category: "source_url", sourceEvidenceRefRole: "source_url", refType: "url", sourceRecordId: "https://example.test/" },
        { category: "page", sourceEvidenceRefRole: "page", refType: "page", sourceRecordId: "page-home" },
      ],
    }),
  );

  assert.equal(result.outcomeState, "source_capture_completed");
  assert.equal(result.reviewReadyForReview, false);
  assert.equal(deps.calls.some((call) => call.kind === "markReadyForReview"), false);
});

test("idempotent retry reuses existing migration and does not replay transitions from final state", async () => {
  const deps = fakeDependencies();
  const adapter = testAdapter(deps);

  const first = await adapter.recordCapture(baseInput());
  const transitionCountAfterFirst = deps.calls.filter((call) => call.kind === "transition").length;
  const retry = await adapter.recordCapture(baseInput());

  assert.equal(retry.migrationId, first.migrationId);
  assert.equal(retry.reusedMigration, true);
  assert.equal(deps.calls.filter((call) => call.kind === "transition").length, transitionCountAfterFirst);
});

test("idempotency drift fails clearly", async () => {
  const deps = fakeDependencies();
  const adapter = testAdapter(deps);

  await adapter.recordCapture(baseInput());
  await assert.rejects(
    () => adapter.recordCapture(baseInput({ sourceUrl: "https://changed.example.test/" })),
    SingleSiteIdempotencyConflictError,
  );
});

test("adapter is server-only and has no forbidden integration imports or direct SQL writes", () => {
  const source = fs.readFileSync(SOURCE_PATH, "utf8");
  assert.match(source, /^import "server-only";/);
  assert.doesNotMatch(source, /from\s+["'][^"']*(migration-factory|proposal|publish|rollback|stripe|billing|vercel|openprovider|dns|provider|command-center|ops-inbox|public-site|runtime-store)[^"']*["']/i);
  assert.doesNotMatch(source, /\b(insert\s+into|update|delete\s+from)\s+public\.gnr8_single_site_/i);
});
