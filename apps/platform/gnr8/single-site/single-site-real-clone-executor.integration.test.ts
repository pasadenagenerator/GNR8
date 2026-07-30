import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Pool } from "pg";

import {
  bindArtifactToVersion,
  createArtifact,
  createSiteVersionFromMigration,
  ensureRuntimeTables,
  getArtifactById,
  getSiteVersion,
} from "../runtime/runtime-store";
import type { CanonicalPageVersionInput, RuntimeImportProvenanceSummary } from "../runtime/types";

import { evaluateCloneGenerationGate } from "./single-site-clone-generation-gate";
import {
  deriveSingleSiteCloneStartChildIdempotencyKeys,
  startSingleSiteCloneGeneration,
  type SingleSiteCloneExecutor,
  type SingleSiteCloneExecutorInput,
} from "./single-site-clone-start-orchestrator";
import { createSingleSiteRealCloneExecutor } from "./single-site-real-clone-executor";
import { SourceEvidenceReviewService } from "./source-evidence-review-service";
import { SingleSiteIdempotencyConflictError } from "./single-site-state-contracts";
import { SingleSiteStateReadRepository, type SingleSiteStateReadClient, type SingleSiteStateReadPool } from "./single-site-state-read-repository";
import { SingleSiteStateTransitionService } from "./single-site-state-transition-service";
import {
  SingleSiteStateWriterRepository,
  type SingleSiteStateWriterPool,
  type SingleSiteStateWriterTx,
} from "./single-site-state-writer-repository";

const MIGRATION_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../supabase/migrations/20260729120000_single_site_state_evidence_spine.sql",
);
const CLONE_REVIEW_MIGRATION_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../supabase/migrations/20260730120000_single_site_clone_review_core.sql",
);
const MIGRATION_BASENAME = "20260729120000_single_site_state_evidence_spine.sql";
const CLONE_REVIEW_MIGRATION_BASENAME = "20260730120000_single_site_clone_review_core.sql";
const REQUIRED_CATEGORIES = ["source_url", "page", "screenshot", "dom", "text", "image", "asset", "font", "visual_identity", "metadata"] as const;
const SINGLE_SITE_TABLES = [
  "gnr8_single_site_migration_state_events",
  "gnr8_single_site_migration_refs",
  "gnr8_single_site_source_evidence_reviews",
  "gnr8_single_site_source_evidence_review_items",
  "gnr8_single_site_source_evidence_review_refs",
  "gnr8_single_site_clone_reviews",
  "gnr8_single_site_clone_review_refs",
  "gnr8_single_site_clone_review_items",
  "gnr8_single_site_clone_review_events",
] as const;
const RUNTIME_SIDE_EFFECT_TABLES = [
  "gnr8_runtime_active_pointers",
  "gnr8_runtime_domain_host_bindings",
  "gnr8_runtime_raw_template_artifacts",
  "gnr8_content_slots",
  "gnr8_content_overrides",
  "gnr8_content_override_history",
] as const;
const FORBIDDEN_OPTIONAL_TABLES = [
  "gnr8_generated_website_proposals",
  "gnr8_generated_proposal_bundles",
  "gnr8_billing_accounts",
  "gnr8_billing_subscriptions",
  "gnr8_runtime_provider_jobs",
  "gnr8_runtime_provider_operation_approvals",
  "gnr8_runtime_provider_execution_handoffs",
] as const;

type DisposablePostgres = {
  containerName: string;
  connectionString: string;
};

type SuperadminPoolGlobal = typeof globalThis & {
  __gnr8SuperadminPoolState__?: {
    pool: Pool | null;
    diagnosticsBound: boolean;
    diagnostics: {
      checkoutCount: number;
      releaseCount: number;
      pendingAcquireCount: number;
    };
  };
};

function docker(args: string[]): string {
  return execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePublishedPort(output: string): string {
  const port = output.match(/127\.0\.0\.1:(\d+)/)?.[1];
  if (!port) throw new Error(`Could not resolve disposable Postgres port from: ${output}`);
  return port;
}

async function startDisposablePostgres(): Promise<DisposablePostgres> {
  const suffix = randomUUID().slice(0, 8);
  const containerName = `gnr8-single-site-real-clone-${process.pid}-${suffix}`;
  const database = `gnr8_single_site_real_clone_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_single_site_real_clone_${suffix.replace(/-/g, "")}`;
  const password = randomUUID();

  docker(["image", "inspect", "postgres:15"]);
  docker([
    "run",
    "--pull=never",
    "--rm",
    "-d",
    "--name",
    containerName,
    "-e",
    `POSTGRES_DB=${database}`,
    "-e",
    `POSTGRES_USER=${user}`,
    "-e",
    `POSTGRES_PASSWORD=${password}`,
    "-p",
    "127.0.0.1::5432",
    "postgres:15",
  ]);

  try {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try {
        docker(["exec", containerName, "pg_isready", "-h", "127.0.0.1", "-U", user, "-d", database]);
        break;
      } catch {
        if (attempt === 59) throw new Error("Disposable Postgres did not become ready");
        await delay(500);
      }
    }

    docker(["cp", MIGRATION_PATH, `${containerName}:/tmp/${MIGRATION_BASENAME}`]);
    docker(["cp", CLONE_REVIEW_MIGRATION_PATH, `${containerName}:/tmp/${CLONE_REVIEW_MIGRATION_BASENAME}`]);
    docker(["exec", containerName, "psql", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-U", user, "-d", database, "-f", `/tmp/${MIGRATION_BASENAME}`]);
    docker(["exec", containerName, "psql", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-U", user, "-d", database, "-f", `/tmp/${CLONE_REVIEW_MIGRATION_BASENAME}`]);

    const port = parsePublishedPort(docker(["port", containerName, "5432/tcp"]));
    return {
      containerName,
      connectionString: `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${encodeURIComponent(database)}`,
    };
  } catch (error) {
    try {
      docker(["stop", containerName]);
    } catch {
      // Best effort cleanup for disposable DB setup failure.
    }
    throw error;
  }
}

function bindRuntimeStoreDefaultPool(pool: Pool): void {
  (globalThis as SuperadminPoolGlobal).__gnr8SuperadminPoolState__ = {
    pool,
    diagnosticsBound: true,
    diagnostics: {
      checkoutCount: 0,
      releaseCount: 0,
      pendingAcquireCount: 0,
    },
  };
}

function writerPool(pool: Pool): SingleSiteStateWriterPool {
  return {
    async connect() {
      return (await pool.connect()) as SingleSiteStateWriterTx;
    },
  };
}

function readPool(pool: Pool): SingleSiteStateReadPool {
  return {
    async connect() {
      return (await pool.connect()) as SingleSiteStateReadClient;
    },
  };
}

function actor() {
  return { actorType: "human" as const, actorId: "real-clone-operator", actorRole: "migration_operator" };
}

function sourcePages(suffix: string): CanonicalPageVersionInput[] {
  return [
    {
      pageId: `source-home-${suffix}`,
      path: "/",
      title: "Disposable Source Home",
      structureModel: { sections: [{ id: "hero", type: "hero", order: 0 }] },
      contentModel: { sectionProps: { hero: { heading: "Disposable Source", body: "Captured source evidence." } } },
      styleTokens: { "color.background": "#ffffff", "color.text": "#111111", "font.body": "Inter" },
      assetGraph: [],
      semanticSignals: [{ label: "single_site.source_fixture", confidence: 1, source: "migration" }],
      migrationGovernance: null,
      source: "migration",
      actor: "fixture:source-import",
    },
  ];
}

async function seedSourceRuntime(input: { pool: Pool; suffix: string }): Promise<{
  runtimeSiteId: string;
  sourceSiteVersionId: string;
  sourceArtifactId: string;
  activePointerBefore: unknown;
}> {
  const runtimeSiteId = `runtime-site-${input.suffix}`;
  const sourceSiteVersionId = randomUUID();
  const sourceUrl = `https://source-${input.suffix}.example.test/`;
  const provenance: RuntimeImportProvenanceSummary = {
    kind: "runtime_import_provenance_summary_v1",
    sourceMode: "rendered_dom",
    importFidelityStatus: "high_fidelity_import",
    renderedCaptureStatus: "available",
    renderedDomQuality: "strong",
    screenshotCount: 1,
    computedStyleSampleCount: 1,
    renderedCapture: {
      used: true,
      status: "available",
      quality: "strong",
      domLength: 1000,
      nodeCount: 64,
      styleSampleCount: 1,
      styleCoverage: 1,
      screenshots: { viewport: true, fullPage: false },
      execution: {
        runtimeKind: "nodejs",
        environmentSupported: true,
        browserPackageAvailable: true,
        browserBinaryAvailable: true,
        environmentStatus: "supported",
        failureCategory: "none",
        failureCode: null,
        browserLaunch: "succeeded",
        navigation: "succeeded",
        dom: "captured",
        screenshot: "captured",
        styleSampling: "captured",
      },
    },
    importDiagnosticCodes: [],
    styleSignals: null,
    captureEvidence: {
      selectedSourceHtmlPath: "index.html",
      responseHtmlPath: "index.html",
      entryHtmlPath: "index.html",
      renderedCaptureManifestPath: "rendered/metadata.json",
      acquisitionEvidencePath: null,
      renderedDomPath: "rendered/dom.html",
      computedStylesPath: null,
      renderedViewportScreenshotPath: "rendered/screenshot.png",
      renderedFullpageScreenshotPath: null,
      screenshotPaths: ["rendered/screenshot.png"],
    },
  };

  await createSiteVersionFromMigration({
    siteId: runtimeSiteId,
    siteVersionId: sourceSiteVersionId,
    sourceUrl,
    actor: "fixture:source-import",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    importProvenanceSummary: provenance,
    pages: sourcePages(input.suffix),
  });
  const sourceArtifact = await createArtifact({
    siteId: runtimeSiteId,
    siteVersionId: sourceSiteVersionId,
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    bundleSha256: `source-bundle-${input.suffix}`,
    htmlByPath: { "/": "<html><body>source fixture</body></html>" },
    compiledTokenStyles: "body{color:#111}",
    assetFingerprintMap: {},
    manifest: { sourceKind: "scoped_pipeline_import", fixture: true },
    publishStage: "shadow",
    shadowRestricted: false,
    artifactGovernance: {
      pageGateState: ["SCOPED_IMPORT_READY"],
      pageRolloutPolicyState: ["SCOPED_IMPORT_READY"],
      pageEnforcementState: { shadow: ["ALLOW"], canary: ["REVIEW"], production: ["REVIEW"] },
      siteGateState: "SCOPED_IMPORT_READY",
      siteRolloutPolicyState: "SCOPED_IMPORT_READY",
      siteEnforcementState: { shadow: "ALLOW", canary: "REVIEW", production: "REVIEW" },
      publishStage: "shadow",
    },
  });
  await bindArtifactToVersion({
    siteVersionId: sourceSiteVersionId,
    artifactId: sourceArtifact.artifactId,
    rendererCompatibilityVersion: "gnr8-renderer-v1",
  });
  await input.pool.query(
    `
    insert into public.gnr8_runtime_active_pointers (site_id, active_site_version_id, active_artifact_id)
    values ($1::text, $2::uuid, $3::uuid)
    `,
    [runtimeSiteId, sourceSiteVersionId, sourceArtifact.artifactId],
  );
  const activePointerBefore = await activePointerSnapshot(input.pool, runtimeSiteId);
  return { runtimeSiteId, sourceSiteVersionId, sourceArtifactId: sourceArtifact.artifactId, activePointerBefore };
}

async function createMigrationAtReviewBoundary(input: {
  writer: SingleSiteStateWriterRepository;
  transitions: SingleSiteStateTransitionService;
  suffix: string;
  label: string;
}) {
  const created = await input.writer.withTransaction((tx) =>
    input.writer.createMigration(tx, {
      tenantId: `tenant-${input.suffix}`,
      clientId: randomUUID(),
      siteId: randomUUID(),
      sourceUrl: `https://${input.label}-${input.suffix}.example.test`,
      canonicalSourceUrl: `https://${input.label}-${input.suffix}.example.test/`,
      actor: { actorType: "human", actorId: "real-clone-operator" },
      correlationId: `corr-create-${input.label}-${input.suffix}`,
      idempotencyKey: `idem-create-${input.label}-${input.suffix}`,
    }),
  );
  await input.transitions.transition({
    migrationId: created.row.id,
    toState: "source_capture_started",
    actor: actor(),
    correlationId: `corr-capture-start-${input.label}-${input.suffix}`,
    idempotencyKey: `idem-capture-start-${input.label}-${input.suffix}`,
  });
  await input.transitions.transition({
    migrationId: created.row.id,
    toState: "source_capture_completed",
    actor: actor(),
    correlationId: `corr-capture-complete-${input.label}-${input.suffix}`,
    idempotencyKey: `idem-capture-complete-${input.label}-${input.suffix}`,
  });
  await input.transitions.transition({
    migrationId: created.row.id,
    toState: "source_evidence_review_required",
    actor: actor(),
    correlationId: `corr-review-required-${input.label}-${input.suffix}`,
    idempotencyKey: `idem-review-required-${input.label}-${input.suffix}`,
  });
  return created.row;
}

async function createAcceptedReview(input: {
  reviews: SourceEvidenceReviewService;
  migration: Awaited<ReturnType<typeof createMigrationAtReviewBoundary>>;
  runtime: Awaited<ReturnType<typeof seedSourceRuntime>>;
  suffix: string;
  label: string;
  limited?: boolean;
}) {
  const review = await input.reviews.createReview({
    migrationId: input.migration.id,
    tenantId: input.migration.tenant_id,
    clientId: input.migration.client_id,
    siteId: input.migration.site_id!,
    sourceUrl: input.migration.source_url,
    canonicalSourceUrl: input.migration.canonical_source_url,
    captureRunId: `capture-${input.label}-${input.suffix}`,
    sourceEvidencePackageKey: `package-${input.label}-${input.suffix}`,
    sourceWatermark: `watermark-${input.label}-${input.suffix}`,
    evidenceCapturedAt: "2026-07-29T12:00:00.000Z",
    completenessStatus: "complete",
    metadataJson: {
      sourceRuntimeSiteVersionId: input.runtime.sourceSiteVersionId,
      sourceRuntimeArtifactId: input.runtime.sourceArtifactId,
    },
    actor: actor(),
    correlationId: `corr-review-create-${input.label}-${input.suffix}`,
    idempotencyKey: `idem-review-create-${input.label}-${input.suffix}`,
  });
  await input.reviews.recordRef({
    reviewId: review.review.id,
    migrationId: input.migration.id,
    refRole: "source_snapshot",
    refType: "runtime_site_version_source_import",
    sourceSystem: "gnr8",
    sourceTable: "gnr8_runtime_site_versions",
    sourceRecordId: input.runtime.sourceSiteVersionId,
    sourceWatermark: `watermark-${input.label}-${input.suffix}`,
    contentHash: `source-runtime-${input.runtime.sourceSiteVersionId}`,
    actor: actor(),
    correlationId: `corr-review-ref-${input.label}-${input.suffix}`,
    idempotencyKey: `idem-review-ref-${input.label}-${input.suffix}`,
    metadataJson: {
      sourceRuntimeSiteVersionId: input.runtime.sourceSiteVersionId,
      sourceRuntimeArtifactId: input.runtime.sourceArtifactId,
    },
  });
  for (const category of REQUIRED_CATEGORIES) {
    await input.reviews.addEvidenceItem({
      reviewId: review.review.id,
      migrationId: input.migration.id,
      evidenceCategory: category,
      status: "present",
      actor: actor(),
      correlationId: `corr-item-${input.label}-${category}-${input.suffix}`,
      idempotencyKey: `idem-item-${input.label}-${category}-${input.suffix}`,
    });
  }
  if (input.limited) {
    return input.reviews.acceptWithLimitations({
      reviewId: review.review.id,
      limitationsJson: [{ category: "font", reason: "accepted fallback font evidence" }],
      aafApprovalDecisionId: randomUUID(),
      actor: actor(),
      correlationId: `corr-limited-${input.label}-${input.suffix}`,
      idempotencyKey: `idem-limited-${input.label}-${input.suffix}`,
    });
  }
  return input.reviews.accept({
    reviewId: review.review.id,
    actor: actor(),
    correlationId: `corr-accept-${input.label}-${input.suffix}`,
    idempotencyKey: `idem-accept-${input.label}-${input.suffix}`,
  });
}

function trackingExecutor(order: string[], calls: { count: number }): SingleSiteCloneExecutor {
  const real = createSingleSiteRealCloneExecutor();
  return {
    async execute(input) {
      order.push("executor");
      calls.count += 1;
      return real.execute(input);
    },
  };
}

async function tableCounts(pool: Pool, tables: readonly string[]): Promise<Record<string, string>> {
  const counts: Record<string, string> = {};
  for (const table of tables) {
    const exists = await pool.query<{ exists: string | null }>(`select to_regclass($1)::text as exists`, [`public.${table}`]);
    if (!exists.rows[0]?.exists) {
      counts[table] = "missing";
      continue;
    }
    const result = await pool.query<{ count: string }>(`select count(*)::text as count from public.${table}`);
    counts[table] = result.rows[0]?.count ?? "0";
  }
  return counts;
}

async function activePointerSnapshot(pool: Pool, siteId: string): Promise<unknown> {
  const result = await pool.query(
    `
    select jsonb_build_object(
      'siteId', site_id::text,
      'activeSiteVersionId', active_site_version_id::text,
      'activeArtifactId', active_artifact_id::text,
      'rowCount', count(*) over ()
    ) as snapshot
    from public.gnr8_runtime_active_pointers
    where site_id = $1::text
    order by site_id asc
    `,
    [siteId],
  );
  return result.rows.map((row) => row.snapshot);
}

async function cloneStateCounts(pool: Pool, migrationId: string): Promise<Record<string, string>> {
  const result = await pool.query<{ to_state: string; count: string }>(
    `
    select to_state, count(*)::text as count
    from public.gnr8_single_site_migration_state_events
    where migration_id = $1::uuid
      and to_state in ('clone_generation_started', 'clone_generation_completed', 'clone_review_required', 'migration_failed')
    group by to_state
    `,
    [migrationId],
  );
  return Object.fromEntries(result.rows.map((row) => [row.to_state, row.count]));
}

async function runtimeCloneCounts(pool: Pool, sourceSiteVersionId: string): Promise<{ cloneVersions: string; cloneArtifacts: string }> {
  const versions = await pool.query<{ count: string }>(
    `
    select count(*)::text as count
    from public.gnr8_runtime_site_versions
    where id <> $1::uuid
      and import_provenance_summary ? 'singleSiteCloneExecutor'
    `,
    [sourceSiteVersionId],
  );
  const artifacts = await pool.query<{ count: string }>(
    `
    select count(*)::text as count
    from public.gnr8_runtime_artifacts
    where manifest ? 'singleSiteCloneExecutor'
    `,
  );
  return {
    cloneVersions: versions.rows[0]?.count ?? "0",
    cloneArtifacts: artifacts.rows[0]?.count ?? "0",
  };
}

function executorInput(input: {
  migration: Awaited<ReturnType<typeof createMigrationAtReviewBoundary>>;
  reviewId: string;
  runtime: Awaited<ReturnType<typeof seedSourceRuntime>>;
  idempotencyKey: string;
  limited?: boolean;
}): SingleSiteCloneExecutorInput {
  const keys = deriveSingleSiteCloneStartChildIdempotencyKeys(input.idempotencyKey);
  return {
    migrationId: input.migration.id,
    clientId: input.migration.client_id,
    siteId: input.migration.site_id!,
    sourceEvidenceReviewId: input.reviewId,
    acceptedWithLimitations: Boolean(input.limited),
    limitations: input.limited ? [{ category: "font", reason: "accepted fallback font evidence" }] : [],
    actor: actor(),
    correlationId: `corr-direct-${input.idempotencyKey}`,
    idempotencyKey: keys.executor,
    idempotencyKeys: keys,
    targetRefs: { runtimeSiteId: input.runtime.runtimeSiteId },
    sourceEvidencePackageRef: {
      sourceRecordId: `package-${input.reviewId}`,
      refType: "source_evidence_package",
      sourceSystem: "gnr8",
      sourceWatermark: `watermark-${input.reviewId}`,
      metadataJson: {
        sourceRuntimeSiteVersionId: input.runtime.sourceSiteVersionId,
        sourceRuntimeArtifactId: input.runtime.sourceArtifactId,
      },
    },
    sourceWatermark: `watermark-${input.reviewId}`,
    payloadHash: `payload-${input.reviewId}`,
    metadataJson: {
      sourceRuntimeSiteVersionId: input.runtime.sourceSiteVersionId,
      sourceRuntimeArtifactId: input.runtime.sourceArtifactId,
    },
  };
}

test("real clone executor runs through MVP-11 against disposable runtime-store fixture without forbidden side effects", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 6 });
  bindRuntimeStoreDefaultPool(pool);

  const writer = new SingleSiteStateWriterRepository(writerPool(pool));
  const transitions = new SingleSiteStateTransitionService(writer);
  const reviews = new SourceEvidenceReviewService(writer);
  const reader = new SingleSiteStateReadRepository(readPool(pool));
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  const order: string[] = [];
  const executorCalls = { count: 0 };

  try {
    await ensureRuntimeTables();
    const runtime = await seedSourceRuntime({ pool, suffix });

    const acceptedMigration = await createMigrationAtReviewBoundary({ writer, transitions, suffix, label: "accepted" });
    const acceptedReview = await createAcceptedReview({ reviews, migration: acceptedMigration, runtime, suffix, label: "accepted" });
    const limitedMigration = await createMigrationAtReviewBoundary({ writer, transitions, suffix, label: "limited" });
    const limitedReview = await createAcceptedReview({ reviews, migration: limitedMigration, runtime, suffix, label: "limited", limited: true });
    const missingMigration = await createMigrationAtReviewBoundary({ writer, transitions, suffix, label: "missing" });
    const failingMigration = await createMigrationAtReviewBoundary({ writer, transitions, suffix, label: "failing" });
    const failingReview = await createAcceptedReview({ reviews, migration: failingMigration, runtime, suffix, label: "failing" });

    const sideEffectBefore = await tableCounts(pool, RUNTIME_SIDE_EFFECT_TABLES);
    const optionalForbiddenBefore = await tableCounts(pool, FORBIDDEN_OPTIONAL_TABLES);
    const sourceRuntimeCounts = await tableCounts(pool, ["gnr8_runtime_site_versions", "gnr8_runtime_artifacts", "gnr8_runtime_page_versions"]);

    const dryRunBefore = await tableCounts(pool, [...SINGLE_SITE_TABLES, "gnr8_runtime_site_versions", "gnr8_runtime_artifacts"]);
    const dryRun = await startSingleSiteCloneGeneration(
      {
        migrationId: acceptedMigration.id,
        clientId: acceptedMigration.client_id,
        siteId: acceptedMigration.site_id,
        mode: "dry_run",
        actor: actor(),
        correlationId: `corr-dry-run-${suffix}`,
        idempotencyKey: `idem-dry-run-${suffix}`,
        targetRefs: { runtimeSiteId: runtime.runtimeSiteId },
        sourceEvidencePackageRef: {
          sourceRecordId: `package-${acceptedReview.review.id}`,
          refType: "source_evidence_package",
          sourceSystem: "gnr8",
          metadataJson: { sourceRuntimeSiteVersionId: runtime.sourceSiteVersionId },
        },
        metadataJson: { sourceRuntimeSiteVersionId: runtime.sourceSiteVersionId },
      },
      {
        readRepository: reader,
        transitionService: transitions,
        evaluateGate: async (input) => {
          order.push("gate");
          return evaluateCloneGenerationGate(input);
        },
        executor: trackingExecutor(order, executorCalls),
      },
    );
    assert.equal(dryRun.status, "dry_run_allowed");
    assert.equal(dryRun.executorCalled, false);
    assert.equal(executorCalls.count, 0);
    assert.deepEqual(await tableCounts(pool, [...SINGLE_SITE_TABLES, "gnr8_runtime_site_versions", "gnr8_runtime_artifacts"]), dryRunBefore);

    const blocked = await startSingleSiteCloneGeneration(
      {
        migrationId: missingMigration.id,
        clientId: missingMigration.client_id,
        siteId: missingMigration.site_id,
        mode: "execute",
        actor: actor(),
        correlationId: `corr-blocked-${suffix}`,
        idempotencyKey: `idem-blocked-${suffix}`,
        metadataJson: { sourceRuntimeSiteVersionId: runtime.sourceSiteVersionId },
      },
      { readRepository: reader, transitionService: transitions, executor: trackingExecutor(order, executorCalls) },
    );
    assert.equal(blocked.status, "blocked");
    assert.equal(blocked.executorCalled, false);
    assert.equal(executorCalls.count, 0);
    assert.deepEqual(await cloneStateCounts(pool, missingMigration.id), {});

    order.length = 0;
    const executed = await startSingleSiteCloneGeneration(
      {
        migrationId: acceptedMigration.id,
        clientId: acceptedMigration.client_id,
        siteId: acceptedMigration.site_id,
        mode: "execute",
        actor: actor(),
        correlationId: `corr-execute-${suffix}`,
        idempotencyKey: `idem-execute-${suffix}`,
        targetRefs: { runtimeSiteId: runtime.runtimeSiteId },
        sourceEvidencePackageRef: {
          sourceRecordId: `package-${acceptedReview.review.id}`,
          refType: "source_evidence_package",
          sourceSystem: "gnr8",
          sourceWatermark: `watermark-accepted-${suffix}`,
          metadataJson: {
            sourceRuntimeSiteVersionId: runtime.sourceSiteVersionId,
            sourceRuntimeArtifactId: runtime.sourceArtifactId,
          },
        },
        sourceWatermark: `watermark-accepted-${suffix}`,
        payloadHash: `payload-accepted-${suffix}`,
        metadataJson: {
          sourceRuntimeSiteVersionId: runtime.sourceSiteVersionId,
          sourceRuntimeArtifactId: runtime.sourceArtifactId,
        },
      },
      {
        readRepository: reader,
        transitionService: transitions,
        evaluateGate: async (input) => {
          order.push("gate");
          return evaluateCloneGenerationGate(input);
        },
        executor: trackingExecutor(order, executorCalls),
      },
    );

    assert.equal(executed.status, "completed", executed.errors.join(" | "));
    assert.equal(executed.gate.allowed, true);
    assert.equal(order.indexOf("gate") < order.indexOf("executor"), true);
    assert.equal(executed.startedStateRecorded, true);
    assert.equal(executed.completedStateRecorded, true);
    assert.equal(executed.reviewRequiredStateRecorded, true);
    assert.equal(executed.executorCalled, true);
    assert.match(executed.siteVersionRef?.sourceRecordId ?? "", /^[0-9a-f-]{36}$/i);
    assert.match(executed.runtimeArtifactRef?.sourceRecordId ?? "", /^[0-9a-f-]{36}$/i);
    assert.notEqual(executed.siteVersionRef?.sourceRecordId, runtime.sourceSiteVersionId);
    assert.deepEqual(await cloneStateCounts(pool, acceptedMigration.id), {
      clone_generation_completed: "1",
      clone_generation_started: "1",
      clone_review_required: "1",
    });

    const cloneVersion = await getSiteVersion(executed.siteVersionRef!.sourceRecordId);
    assert.ok(cloneVersion);
    assert.equal(cloneVersion.siteId, runtime.runtimeSiteId);
    assert.equal(cloneVersion.state, "DRAFT");
    assert.equal(cloneVersion.artifactId, executed.runtimeArtifactRef?.sourceRecordId);
    assert.deepEqual(cloneVersion.pages.map((page) => page.path), ["/"]);
    assert.ok((cloneVersion.importProvenanceSummary as Record<string, unknown>).singleSiteCloneExecutor);
    const cloneArtifact = await getArtifactById(executed.runtimeArtifactRef!.sourceRecordId);
    assert.ok(cloneArtifact);
    assert.equal(cloneArtifact.siteVersionId, executed.siteVersionRef?.sourceRecordId);
    assert.equal(cloneArtifact.publishStage, "shadow");
    assert.equal((cloneArtifact.manifest as Record<string, unknown>).sourceKind, "single_site_real_clone_executor");

    const countsAfterExecute = await runtimeCloneCounts(pool, runtime.sourceSiteVersionId);
    assert.deepEqual(countsAfterExecute, { cloneVersions: "1", cloneArtifacts: "1" });
    assert.deepEqual(await activePointerSnapshot(pool, runtime.runtimeSiteId), runtime.activePointerBefore);

    const replayStateBefore = await cloneStateCounts(pool, acceptedMigration.id);
    const replay = await startSingleSiteCloneGeneration(
      {
        migrationId: acceptedMigration.id,
        clientId: acceptedMigration.client_id,
        siteId: acceptedMigration.site_id,
        mode: "execute",
        actor: actor(),
        correlationId: `corr-execute-${suffix}`,
        idempotencyKey: `idem-execute-${suffix}`,
        targetRefs: { runtimeSiteId: runtime.runtimeSiteId },
        sourceEvidencePackageRef: {
          sourceRecordId: `package-${acceptedReview.review.id}`,
          refType: "source_evidence_package",
          sourceSystem: "gnr8",
          metadataJson: { sourceRuntimeSiteVersionId: runtime.sourceSiteVersionId },
        },
        metadataJson: { sourceRuntimeSiteVersionId: runtime.sourceSiteVersionId },
      },
      { readRepository: reader, transitionService: transitions, executor: trackingExecutor(order, executorCalls) },
    );
    assert.equal(replay.status, "idempotent_replay");
    assert.equal(replay.executorCalled, false);
    assert.equal(replay.siteVersionRef?.sourceRecordId, executed.siteVersionRef?.sourceRecordId);
    assert.equal(replay.runtimeArtifactRef?.sourceRecordId, executed.runtimeArtifactRef?.sourceRecordId);
    assert.deepEqual(await cloneStateCounts(pool, acceptedMigration.id), replayStateBefore);
    assert.deepEqual(await runtimeCloneCounts(pool, runtime.sourceSiteVersionId), countsAfterExecute);

    await assert.rejects(
      () =>
        createSingleSiteRealCloneExecutor().execute({
          ...executorInput({
            migration: acceptedMigration,
            reviewId: acceptedReview.review.id,
            runtime,
            idempotencyKey: `idem-execute-${suffix}`,
          }),
          acceptedWithLimitations: true,
          limitations: [{ category: "font", reason: "semantic drift under same idempotency key" }],
        }),
      SingleSiteIdempotencyConflictError,
    );
    assert.deepEqual(await runtimeCloneCounts(pool, runtime.sourceSiteVersionId), countsAfterExecute);

    const limited = await startSingleSiteCloneGeneration(
      {
        migrationId: limitedMigration.id,
        clientId: limitedMigration.client_id,
        siteId: limitedMigration.site_id,
        mode: "execute",
        actor: actor(),
        correlationId: `corr-limited-${suffix}`,
        idempotencyKey: `idem-limited-${suffix}`,
        targetRefs: { runtimeSiteId: runtime.runtimeSiteId },
        sourceEvidencePackageRef: {
          sourceRecordId: `package-${limitedReview.review.id}`,
          refType: "source_evidence_package",
          sourceSystem: "gnr8",
          metadataJson: { sourceRuntimeSiteVersionId: runtime.sourceSiteVersionId },
        },
        metadataJson: { sourceRuntimeSiteVersionId: runtime.sourceSiteVersionId },
      },
      { readRepository: reader, transitionService: transitions, executor: trackingExecutor(order, executorCalls) },
    );
    assert.equal(limited.status, "completed");
    assert.equal(limited.acceptedWithLimitations, true);
    assert.ok(limited.limitations.some((limitation) => JSON.stringify(limitation).includes("fallback font evidence")));
    assert.match(limited.warnings.join("\n"), /accepted with limitations/);
    assert.ok(limited.siteVersionRef?.metadataJson?.executorVersion);

    const failed = await startSingleSiteCloneGeneration(
      {
        migrationId: failingMigration.id,
        clientId: failingMigration.client_id,
        siteId: failingMigration.site_id,
        mode: "execute",
        actor: actor(),
        correlationId: `corr-failing-${suffix}`,
        idempotencyKey: `idem-failing-${suffix}`,
        targetRefs: { runtimeSiteId: runtime.runtimeSiteId },
        sourceEvidencePackageRef: {
          sourceRecordId: `package-${failingReview.review.id}`,
          refType: "source_evidence_package",
          sourceSystem: "gnr8",
          metadataJson: { sourceRuntimeSiteVersionId: randomUUID() },
        },
        metadataJson: { sourceRuntimeSiteVersionId: randomUUID() },
      },
      { readRepository: reader, transitionService: transitions, executor: trackingExecutor(order, executorCalls) },
    );
    assert.equal(failed.status, "failed");
    assert.equal(failed.executorCalled, true);
    assert.equal(failed.failureRecorded, true);
    assert.deepEqual(await cloneStateCounts(pool, failingMigration.id), {
      clone_generation_started: "1",
      migration_failed: "1",
    });

    const sideEffectAfter = await tableCounts(pool, RUNTIME_SIDE_EFFECT_TABLES);
    assert.deepEqual(sideEffectAfter.gnr8_runtime_active_pointers, sideEffectBefore.gnr8_runtime_active_pointers);
    assert.deepEqual(await activePointerSnapshot(pool, runtime.runtimeSiteId), runtime.activePointerBefore);
    assert.equal(sideEffectAfter.gnr8_runtime_domain_host_bindings, "0");
    assert.equal(sideEffectAfter.gnr8_runtime_raw_template_artifacts, "0");
    assert.equal(sideEffectAfter.gnr8_content_slots, "0");
    assert.equal(sideEffectAfter.gnr8_content_overrides, "0");
    assert.equal(sideEffectAfter.gnr8_content_override_history, "0");
    assert.deepEqual(await tableCounts(pool, FORBIDDEN_OPTIONAL_TABLES), optionalForbiddenBefore);
    assert.deepEqual(sourceRuntimeCounts, {
      gnr8_runtime_site_versions: "1",
      gnr8_runtime_artifacts: "1",
      gnr8_runtime_page_versions: "1",
    });

    const forbiddenStates = await pool.query<{ count: string }>(
      `
      select count(*)::text as count
      from public.gnr8_single_site_migration_state_events
      where to_state in (
        'improvement_proposal_started',
        'improvement_proposal_ready',
        'improvement_proposal_approved',
        'content_approved',
        'publish_ready',
        'published'
      )
      `,
    );
    assert.equal(forbiddenStates.rows[0]?.count, "0");
    const forbiddenRefs = await pool.query<{ count: string }>(
      `
      select count(*)::text as count
      from public.gnr8_single_site_migration_refs
      where ref_role in ('proposal_artifact', 'proposal_approval', 'domain_binding', 'subscription', 'stripe_subscription', 'publish_event', 'active_pointer')
      `,
    );
    assert.equal(forbiddenRefs.rows[0]?.count, "0");
  } finally {
    (globalThis as SuperadminPoolGlobal).__gnr8SuperadminPoolState__ = undefined;
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
