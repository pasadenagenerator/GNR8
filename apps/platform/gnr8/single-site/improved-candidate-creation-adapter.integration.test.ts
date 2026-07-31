import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import type { CanonicalPageVersionInput, CanonicalSiteVersionSnapshot, RenderMode, RuntimeArtifact, RuntimeImportProvenanceSummary } from "../runtime/types";
import {
  computeImprovedCandidateCreationSemanticInputWatermark,
  createImprovedCandidate,
} from "./improved-candidate-creation-adapter";
import {
  computeImprovedCandidateDryRunSemanticInputWatermark,
  dryRunImprovedCandidate,
  type ImprovedCandidateDryRunInput,
} from "./improved-candidate-dry-run-adapter";
import { ImprovementExecutionService } from "./improvement-execution-service";
import type { ImprovementExecutionAafValidationResult } from "./improvement-execution-aaf-validator";
import { SingleSiteIdempotencyConflictError } from "./single-site-state-contracts";
import { SingleSiteStateWriterRepository, type SingleSiteStateWriterPool, type SingleSiteStateWriterTx } from "./single-site-state-writer-repository";

const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const BASE_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260729120000_single_site_state_evidence_spine.sql");
const CLONE_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260730120000_single_site_clone_review_core.sql");
const PROPOSAL_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260730143000_single_site_improvement_proposal_planning_core.sql");
const EXECUTION_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260731120000_single_site_improvement_execution_core.sql");

type DisposablePostgres = {
  containerName: string;
  connectionString: string;
};

function docker(args: string[]): string {
  return execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
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
  const containerName = `gnr8-improved-creation-${process.pid}-${suffix}`;
  const database = `gnr8_improved_creation_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_improved_creation_${suffix.replace(/-/g, "")}`;
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

    for (const [name, migrationPath] of [
      ["base.sql", BASE_MIGRATION_PATH],
      ["clone.sql", CLONE_MIGRATION_PATH],
      ["proposal.sql", PROPOSAL_MIGRATION_PATH],
      ["execution.sql", EXECUTION_MIGRATION_PATH],
    ] as const) {
      docker(["cp", migrationPath, `${containerName}:/tmp/${name}`]);
      docker(["exec", containerName, "psql", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-U", user, "-d", database, "-f", `/tmp/${name}`]);
    }

    const port = parsePublishedPort(docker(["port", containerName, "5432/tcp"]));
    return { containerName, connectionString: `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${encodeURIComponent(database)}` };
  } catch (error) {
    try {
      docker(["stop", containerName]);
    } catch {
      // Best effort cleanup.
    }
    throw error;
  }
}

function writerPool(pool: Pool): SingleSiteStateWriterPool {
  return {
    async connect() {
      return (await pool.connect()) as SingleSiteStateWriterTx;
    },
  };
}

function actor() {
  return { actorType: "human" as const, actorId: "creation-integration-operator", actorRole: "migration_operator" };
}

function source(sourceTable: string, sourceRecordId: string, sourceWatermark = `${sourceRecordId}:watermark`) {
  return { sourceTable, sourceRecordId, sourceWatermark, contentHash: `${sourceRecordId.replace(/-/g, "")}hash0123456789abcdef`.slice(0, 64) };
}

function validation(overrides: Partial<ImprovementExecutionAafValidationResult> = {}): ImprovementExecutionAafValidationResult {
  return {
    allowed: true,
    mode: "allowed",
    reasonCode: "authorization_valid",
    blockerCodes: [],
    matchedAafRequestDecisionRefs: {
      approvalRequestId: "auth-request",
      approvalDecisionId: "auth-decision",
      evidencePackageId: "auth-evidence",
      scope: "single_site_improvement_implementation_authorization",
      status: "granted",
    },
    matchedEvidenceRefs: [],
    matchedSubjectRefs: [],
    limitations: [],
    freshnessResult: {
      status: "fresh",
      expectedSemanticWatermark: "aaf-expected-watermark",
      actualEvidenceWatermark: "aaf-expected-watermark",
      actualFreshnessWatermark: "aaf-expected-watermark",
      checkedAt: "2026-07-31T12:00:00.000Z",
    },
    driftResult: {
      proposalWatermarkMatched: true,
      selectedRecommendationWatermarkMatched: true,
      implementationScopeWatermarkMatched: true,
      semanticWatermarkMatched: true,
      driftedRoles: [],
    },
    missingRefs: { authorization: [], subject: [], evidence: [] },
    staleRefs: { subject: [], evidence: [], freshness: [] },
    prohibitedSubstitutionFlags: {
      prohibited: false,
      proposalApproval: false,
      cloneReview: false,
      contentApproval: false,
      clientApproval: false,
      launchApproval: false,
      publishActivation: false,
      domainDdomReadiness: false,
      aiProviderAdvisory: false,
      generatedProposalBundle: false,
      commandCenterOpsInbox: false,
      unknownScope: false,
    },
    actor: actor(),
    correlationId: "corr-validation",
    idempotencyKey: "idem-validation",
    executionAttemptKey: "attempt",
    mutatesSourceTruth: false,
    nonExecuting: true,
    ...overrides,
  };
}

async function optionalCount(pool: Pool, tableName: string): Promise<number> {
  const regclass = await pool.query<{ exists: boolean }>("select to_regclass($1) is not null as exists", [`public.${tableName}`]);
  if (!regclass.rows[0]?.exists) return 0;
  const count = await pool.query<{ count: number }>(`select count(*)::int from public.${tableName}`);
  return count.rows[0]?.count ?? 0;
}

async function ensureDisposableRuntimeTables(pool: Pool): Promise<void> {
  await pool.query(`
    create table if not exists public.gnr8_runtime_sites (
      id text primary key,
      source_url text not null,
      source_host text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await pool.query(`
    create table if not exists public.gnr8_runtime_pages (
      id text primary key,
      site_id text not null references public.gnr8_runtime_sites(id) on delete cascade,
      path text not null,
      title text,
      created_at timestamptz not null default now(),
      unique (site_id, path)
    )
  `);
  await pool.query(`
    create table if not exists public.gnr8_runtime_site_versions (
      id uuid primary key default gen_random_uuid(),
      site_id text not null references public.gnr8_runtime_sites(id) on delete cascade,
      version_no integer not null,
      state text not null,
      source text not null,
      actor text not null,
      renderer_compatibility_version text not null,
      import_provenance_summary jsonb,
      artifact_id uuid,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (site_id, version_no)
    )
  `);
  await pool.query(`
    create table if not exists public.gnr8_runtime_page_versions (
      id uuid primary key default gen_random_uuid(),
      site_version_id uuid not null references public.gnr8_runtime_site_versions(id) on delete cascade,
      page_id text not null references public.gnr8_runtime_pages(id) on delete cascade,
      path text not null,
      title text,
      structure_model jsonb not null,
      content_model jsonb not null,
      style_tokens jsonb not null,
      asset_graph jsonb not null,
      semantic_signals jsonb not null,
      migration_governance jsonb,
      source text not null,
      actor text not null,
      created_at timestamptz not null default now(),
      unique (site_version_id, page_id)
    )
  `);
  await pool.query(`
    create table if not exists public.gnr8_runtime_artifacts (
      id uuid primary key default gen_random_uuid(),
      site_id text not null references public.gnr8_runtime_sites(id) on delete cascade,
      site_version_id uuid not null references public.gnr8_runtime_site_versions(id) on delete cascade,
      renderer_compatibility_version text not null,
      bundle_sha256 text not null,
      html_by_path jsonb not null,
      compiled_token_styles text not null,
      asset_fingerprint_map jsonb not null,
      manifest jsonb not null,
      publish_stage text not null default 'production',
      shadow_restricted boolean not null default false,
      artifact_governance jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      unique (site_version_id)
    )
  `);
  await pool.query(`
    create table if not exists public.gnr8_runtime_active_pointers (
      site_id text primary key references public.gnr8_runtime_sites(id) on delete cascade,
      active_site_version_id uuid not null references public.gnr8_runtime_site_versions(id),
      active_artifact_id uuid not null references public.gnr8_runtime_artifacts(id),
      updated_at timestamptz not null default now()
    )
  `);
}

async function readRuntimeSiteVersion(pool: Pool, siteVersionId: string): Promise<CanonicalSiteVersionSnapshot | null> {
  const version = await pool.query(
    `
    select id::text, site_id::text, version_no::int, state::text, source::text, actor::text,
      renderer_compatibility_version::text, import_provenance_summary, artifact_id::text, created_at::text
    from public.gnr8_runtime_site_versions
    where id = $1::uuid
    limit 1
    `,
    [siteVersionId],
  );
  const row = version.rows[0];
  if (!row) return null;
  const pages = await pool.query(
    `
    select id::text, site_version_id::text, page_id::text, path::text, title::text,
      structure_model, content_model, style_tokens, asset_graph, semantic_signals,
      migration_governance, source::text, actor::text, created_at::text
    from public.gnr8_runtime_page_versions
    where site_version_id = $1::uuid
    order by path asc
    `,
    [siteVersionId],
  );
  return {
    id: row.id,
    siteId: row.site_id,
    versionNo: row.version_no,
    state: row.state,
    source: row.source,
    actor: row.actor,
    createdAt: row.created_at,
    rendererCompatibilityVersion: row.renderer_compatibility_version,
    importProvenanceSummary: row.import_provenance_summary,
    artifactId: row.artifact_id,
    pages: pages.rows.map((page) => ({
      id: page.id,
      siteVersionId: page.site_version_id,
      pageId: page.page_id,
      path: page.path,
      title: page.title,
      structureModel: page.structure_model,
      contentModel: page.content_model,
      styleTokens: page.style_tokens,
      assetGraph: page.asset_graph,
      semanticSignals: page.semantic_signals,
      migrationGovernance: page.migration_governance,
      source: page.source,
      actor: page.actor,
      createdAt: page.created_at,
    })),
  } as CanonicalSiteVersionSnapshot;
}

async function createDisposableSiteVersion(
  pool: Pool,
  input: {
    siteId: string;
    sourceUrl: string;
    actor: string;
    rendererCompatibilityVersion: string;
    importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
    pages: CanonicalPageVersionInput[];
    siteVersionId?: string;
  },
): Promise<{ siteId: string; siteVersionId: string; versionNo: number }> {
  await ensureDisposableRuntimeTables(pool);
  await pool.query(
    "insert into public.gnr8_runtime_sites (id, source_url) values ($1, $2) on conflict (id) do update set source_url = excluded.source_url, updated_at = now()",
    [input.siteId, input.sourceUrl],
  );
  const existing = input.siteVersionId
    ? await pool.query("select id::text, site_id::text, version_no::int from public.gnr8_runtime_site_versions where id = $1::uuid limit 1", [input.siteVersionId])
    : { rows: [] };
  let siteVersionId = input.siteVersionId ?? randomUUID();
  let versionNo = 0;
  if (existing.rows[0]) {
    siteVersionId = existing.rows[0].id;
    versionNo = existing.rows[0].version_no;
  } else {
    const next = await pool.query("select coalesce(max(version_no), 0) + 1 as version_no from public.gnr8_runtime_site_versions where site_id = $1", [input.siteId]);
    versionNo = Number(next.rows[0]?.version_no ?? 1);
    const inserted = await pool.query(
      `
      insert into public.gnr8_runtime_site_versions (
        id, site_id, version_no, state, source, actor, renderer_compatibility_version, import_provenance_summary
      )
      values ($1::uuid, $2, $3::int, 'DRAFT', 'migration', $4, $5, $6::jsonb)
      returning id::text
      `,
      [siteVersionId, input.siteId, versionNo, input.actor, input.rendererCompatibilityVersion, JSON.stringify(input.importProvenanceSummary ?? null)],
    );
    siteVersionId = inserted.rows[0].id;
  }
  for (const page of input.pages) {
    await pool.query(
      "insert into public.gnr8_runtime_pages (id, site_id, path, title) values ($1, $2, $3, $4) on conflict (id) do update set path = excluded.path, title = excluded.title",
      [page.pageId, input.siteId, page.path, page.title],
    );
    await pool.query(
      `
      insert into public.gnr8_runtime_page_versions (
        site_version_id, page_id, path, title, structure_model, content_model, style_tokens,
        asset_graph, semantic_signals, migration_governance, source, actor
      )
      values ($1::uuid, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12)
      on conflict (site_version_id, page_id)
      do update set content_model = excluded.content_model, semantic_signals = excluded.semantic_signals, actor = excluded.actor
      `,
      [
        siteVersionId,
        page.pageId,
        page.path,
        page.title,
        JSON.stringify(page.structureModel),
        JSON.stringify(page.contentModel),
        JSON.stringify(page.styleTokens),
        JSON.stringify(page.assetGraph),
        JSON.stringify(page.semanticSignals),
        page.migrationGovernance ? JSON.stringify(page.migrationGovernance) : null,
        page.source,
        page.actor,
      ],
    );
  }
  return { siteId: input.siteId, siteVersionId: siteVersionId!, versionNo };
}

async function createDisposableArtifact(pool: Pool, input: Omit<RuntimeArtifact, "id" | "createdAt">): Promise<{ artifactId: string }> {
  await ensureDisposableRuntimeTables(pool);
  const existing = await pool.query("select id::text from public.gnr8_runtime_artifacts where site_version_id = $1::uuid limit 1", [input.siteVersionId]);
  if (existing.rows[0]) return { artifactId: existing.rows[0].id };
  const inserted = await pool.query(
    `
    insert into public.gnr8_runtime_artifacts (
      site_id, site_version_id, renderer_compatibility_version, bundle_sha256, html_by_path,
      compiled_token_styles, asset_fingerprint_map, manifest, publish_stage, shadow_restricted, artifact_governance
    )
    values ($1, $2::uuid, $3, $4, $5::jsonb, $6, $7::jsonb, $8::jsonb, $9, $10, $11::jsonb)
    returning id::text
    `,
    [
      input.siteId,
      input.siteVersionId,
      input.rendererCompatibilityVersion,
      input.bundleSha256,
      JSON.stringify(input.htmlByPath),
      input.compiledTokenStyles,
      JSON.stringify(input.assetFingerprintMap),
      JSON.stringify(input.manifest),
      input.publishStage,
      input.shadowRestricted,
      JSON.stringify(input.artifactGovernance),
    ],
  );
  return { artifactId: inserted.rows[0].id };
}

async function readDisposableArtifact(pool: Pool, artifactId: string): Promise<RuntimeArtifact | null> {
  const result = await pool.query(
    `
    select id::text, site_id::text, site_version_id::text, renderer_compatibility_version::text,
      bundle_sha256::text, html_by_path, compiled_token_styles::text, asset_fingerprint_map,
      manifest, publish_stage::text, shadow_restricted, artifact_governance, created_at::text
    from public.gnr8_runtime_artifacts
    where id = $1::uuid
    limit 1
    `,
    [artifactId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    siteId: row.site_id,
    siteVersionId: row.site_version_id,
    rendererCompatibilityVersion: row.renderer_compatibility_version,
    bundleSha256: row.bundle_sha256,
    htmlByPath: row.html_by_path,
    compiledTokenStyles: row.compiled_token_styles,
    assetFingerprintMap: row.asset_fingerprint_map,
    manifest: row.manifest,
    publishStage: row.publish_stage,
    shadowRestricted: row.shadow_restricted,
    artifactGovernance: row.artifact_governance,
    createdAt: row.created_at,
  };
}

async function bindDisposableArtifact(pool: Pool, input: { siteVersionId: string; artifactId: string; rendererCompatibilityVersion: string }): Promise<{ affectedRows: number }> {
  const updated = await pool.query(
    "update public.gnr8_runtime_site_versions set artifact_id = $2::uuid, renderer_compatibility_version = $3, updated_at = now() where id = $1::uuid returning id",
    [input.siteVersionId, input.artifactId, input.rendererCompatibilityVersion],
  );
  return { affectedRows: updated.rowCount ?? 0 };
}

async function getDisposableActivePointer(pool: Pool, siteId: string): Promise<{ siteVersionId: string; artifactId: string } | null> {
  await ensureDisposableRuntimeTables(pool);
  const result = await pool.query("select active_site_version_id::text, active_artifact_id::text from public.gnr8_runtime_active_pointers where site_id = $1 limit 1", [siteId]);
  const row = result.rows[0];
  return row ? { siteVersionId: row.active_site_version_id, artifactId: row.active_artifact_id } : null;
}

function buildDisposableArtifactBundle(input: { siteVersion: CanonicalSiteVersionSnapshot; renderMode: RenderMode }) {
  const heading = String(input.siteVersion.pages[0]?.contentModel.sectionProps.hero?.heading ?? "");
  return {
    siteId: input.siteVersion.siteId,
    siteVersionId: input.siteVersion.id,
    rendererCompatibilityVersion: input.siteVersion.rendererCompatibilityVersion,
    bundleSha256: `sha256-${input.siteVersion.id}-${Buffer.from(heading).toString("hex").slice(0, 16)}`,
    htmlByPath: { "/": `<!doctype html><html><body><h1>${heading}</h1></body></html>` },
    compiledTokenStyles: "",
    assetFingerprintMap: {},
    manifest: { renderMode: input.renderMode, siteVersionId: input.siteVersion.id },
  };
}

async function seedGovernedBaseline(pool: Pool, suffix: string) {
  const migrationId = randomUUID();
  const clientId = randomUUID();
  const siteUuid = randomUUID();
  const sourceReviewId = randomUUID();
  const cloneReviewId = randomUUID();
  const planId = randomUUID();
  const recommendationId = randomUUID();

  const cloneVersion = await createDisposableSiteVersion(pool, {
    siteId: `runtime-site-${suffix}`,
    sourceUrl: `gnr8:single_site_migration:${migrationId}:clone_baseline`,
    actor: "fixture:clone",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    importProvenanceSummary: { kind: "runtime_import_provenance_summary_v1", fixture: "mvp24-clone" } as unknown as RuntimeImportProvenanceSummary,
    pages: [
      {
        pageId: `page-home-${suffix}`,
        path: "/",
        title: "Clone Home",
        structureModel: { sections: [{ id: "hero", type: "hero", order: 0 }] },
        contentModel: { sectionProps: { hero: { heading: "Clone headline", body: "Clone body" } } },
        styleTokens: { "color.background": "#ffffff", "color.text": "#111111" },
        assetGraph: [],
        semanticSignals: [{ label: "clone.fixture", confidence: 1, source: "migration" }],
        migrationGovernance: null,
        source: "migration",
        actor: "fixture:clone",
      },
    ],
  });
  const cloneSnapshot = await readRuntimeSiteVersion(pool, cloneVersion.siteVersionId);
  assert.ok(cloneSnapshot);
  const cloneBundle = buildDisposableArtifactBundle({ siteVersion: cloneSnapshot, renderMode: "PREVIEW" });
  const cloneArtifact = await createDisposableArtifact(pool, {
    siteId: cloneBundle.siteId,
    siteVersionId: cloneBundle.siteVersionId,
    rendererCompatibilityVersion: cloneBundle.rendererCompatibilityVersion,
    bundleSha256: cloneBundle.bundleSha256,
    htmlByPath: cloneBundle.htmlByPath,
    compiledTokenStyles: cloneBundle.compiledTokenStyles,
    assetFingerprintMap: cloneBundle.assetFingerprintMap,
    manifest: { ...cloneBundle.manifest, sourceKind: "mvp24_fixture_clone" },
    publishStage: "shadow",
    shadowRestricted: false,
    artifactGovernance: {
      pageGateState: ["CLONE_READY"],
      pageRolloutPolicyState: ["CLONE_REVIEW_REQUIRED"],
      pageEnforcementState: { shadow: ["ALLOW"], canary: ["REVIEW"], production: ["REVIEW"] },
      siteGateState: "CLONE_READY",
      siteRolloutPolicyState: "CLONE_REVIEW_REQUIRED",
      siteEnforcementState: { shadow: "ALLOW", canary: "REVIEW", production: "REVIEW" },
      publishStage: "shadow",
    },
  });

  await pool.query(
    `
    insert into public.gnr8_single_site_migrations (
      id, tenant_id, client_id, site_id, runtime_site_id, source_url, current_state, current_stage,
      created_by_actor_type, created_by_actor_id, correlation_id, idempotency_key
    )
    values ($1::uuid, $2, $3::uuid, $4::uuid, $5, $6, 'improvement_implementation_completed', 'improvement_content', 'human', 'fixture', $7, $8)
    `,
    [migrationId, `tenant-${suffix}`, clientId, siteUuid, cloneVersion.siteId, `https://fixture-${suffix}.example.test`, `corr-migration-${suffix}`, `idem-migration-${suffix}`],
  );
  await pool.query(
    `
    insert into public.gnr8_single_site_source_evidence_reviews (
      id, migration_id, tenant_id, client_id, site_id, source_url, source_evidence_package_key, source_watermark,
      evidence_captured_at, completeness_status, review_status, review_decision, clone_generation_allowed,
      reviewer_actor_type, reviewer_actor_id, reviewer_actor_role, reviewed_at, correlation_id, idempotency_key
    )
    values ($1::uuid, $2::uuid, $3, $4::uuid, $5::uuid, $6, $7, $8, now(), 'complete', 'accepted', 'accept', true,
      'human', 'fixture', 'migration_operator', now(), $9, $10)
    `,
    [sourceReviewId, migrationId, `tenant-${suffix}`, clientId, siteUuid, `https://fixture-${suffix}.example.test`, `package-${suffix}`, `source-watermark-${suffix}`, `corr-source-review-${suffix}`, `idem-source-review-${suffix}`],
  );
  await pool.query(
    `
    insert into public.gnr8_single_site_clone_reviews (
      id, migration_id, client_id, site_id, clone_site_version_ref, runtime_artifact_ref, source_evidence_review_id,
      clone_generation_ref, review_status, review_decision, proposal_planning_allowed, reviewer_actor_type,
      reviewer_actor_id, reviewer_actor_role, reviewed_at, correlation_id, idempotency_key
    )
    values ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7::uuid, $8, 'accepted', 'accept', true,
      'human', 'fixture', 'migration_operator', now(), $9, $10)
    `,
    [cloneReviewId, migrationId, clientId, siteUuid, cloneVersion.siteVersionId, cloneArtifact.artifactId, sourceReviewId, `clone-generation-${suffix}`, `corr-clone-review-${suffix}`, `idem-clone-review-${suffix}`],
  );
  await pool.query(
    `
    insert into public.gnr8_single_site_improvement_proposal_plans (
      id, tenant_id, client_id, site_id, migration_id, clone_review_id, source_evidence_review_id,
      clone_site_version_ref, runtime_artifact_ref, plan_status, plan_version, title, summary,
      approval_refs_json, implementation_authorization_refs_json, implementation_authorization_attached,
      actor_type, actor_id, actor_role, correlation_id, idempotency_key, semantic_watermark
    )
    values ($1::uuid, $2, $3::uuid, $4::uuid, $5::uuid, $6::uuid, $7::uuid, $8, $9,
      'approved', 1, 'MVP24 proposal', 'Improve hero copy',
      $10::jsonb, $11::jsonb, true, 'human', 'fixture', 'migration_operator', $12, $13, $14)
    `,
    [
      planId,
      `tenant-${suffix}`,
      clientId,
      siteUuid,
      migrationId,
      cloneReviewId,
      sourceReviewId,
      cloneVersion.siteVersionId,
      cloneArtifact.artifactId,
      JSON.stringify({
        approvalRequestId: `proposal-approval-request-${suffix}`,
        approvalDecisionId: `proposal-approval-decision-${suffix}`,
        evidencePackageId: `proposal-evidence-${suffix}`,
        sourceWatermark: `proposal-approval-watermark-${suffix}`,
      }),
      JSON.stringify({
        implementationAuthorizationRequestId: "auth-request",
        implementationAuthorizationDecisionId: "auth-decision",
        implementationAuthorizationEvidencePackageId: "auth-evidence",
        implementationAuthorizationValidationStatus: "granted",
      }),
      `corr-plan-${suffix}`,
      `idem-plan-${suffix}`,
      `proposal-watermark-${suffix}`,
    ],
  );
  await pool.query(
    `
    insert into public.gnr8_single_site_improvement_proposal_recommendations (
      id, plan_id, migration_id, recommendation_key, title, category, risk, impact, effort, rationale,
      recommendation_status, implementation_authorization_status, actor_type, actor_id, actor_role,
      correlation_id, idempotency_key, semantic_watermark
    )
    values ($1::uuid, $2::uuid, $3::uuid, 'hero-copy', 'Clarify hero copy', 'content_clarity',
      'low', 'high', 'small', 'Clarifies the offer.',
      'approved', 'authorized', 'human', 'fixture', 'migration_operator', $4, $5, $6)
    `,
    [recommendationId, planId, migrationId, `corr-rec-${suffix}`, `idem-rec-${suffix}`, `rec-watermark-${suffix}`],
  );
  return { migrationId, clientId, siteUuid, sourceReviewId, cloneReviewId, planId, recommendationId, cloneVersionId: cloneVersion.siteVersionId, cloneArtifactId: cloneArtifact.artifactId };
}

function dryRunInputFromBaseline(seed: Awaited<ReturnType<typeof seedGovernedBaseline>>, attemptId: string): ImprovedCandidateDryRunInput {
  const base = {
    tenantId: "tenant-integration",
    clientId: seed.clientId,
    siteId: seed.siteUuid,
    migrationId: seed.migrationId,
    executionAttempt: {
      attemptId,
      migrationId: seed.migrationId,
      proposalPlanId: seed.planId,
      implementationAuthorizationDecisionId: "auth-decision",
      semanticInputWatermark: "",
    },
    validationResult: validation({ executionAttemptKey: attemptId }),
    implementationAuthorizationRefs: {
      requestRef: source("gnr8_aaf_approval_requests", "auth-request"),
      decisionRef: source("gnr8_aaf_approval_decisions", "auth-decision"),
      evidencePackageRef: source("gnr8_aaf_evidence_packages", "auth-evidence"),
    },
    proposalPlanRef: {
      ...source("gnr8_single_site_improvement_proposal_plans", seed.planId, "proposal-watermark-integration"),
      proposalPlanId: seed.planId,
      planVersion: 1,
      status: "approved",
      semanticWatermark: "proposal-watermark-integration",
    },
    proposalApprovalRefs: {
      approvalRequestRef: source("gnr8_aaf_approval_requests", "proposal-approval-request"),
      approvalDecisionRef: source("gnr8_aaf_approval_decisions", "proposal-approval-decision"),
      evidencePackageRef: source("gnr8_aaf_evidence_packages", "proposal-evidence"),
    },
    selectedRecommendationRefs: [source("gnr8_single_site_improvement_proposal_recommendations", seed.recommendationId, "recommendation-watermark")],
    selectedRecommendations: [
      {
        recommendationId: seed.recommendationId,
        recommendationKey: "hero-copy",
        category: "content_clarity",
        sourceWatermark: "recommendation-watermark",
        sourceEvidenceRefs: [source("gnr8_single_site_source_evidence_items", "source-text-hero", "source-text-watermark")],
        deterministicChange: {
          changeClass: "text_replacement_plan" as const,
          target: { pagePath: "/", sectionId: "hero", field: "heading" },
          currentSourceHash: "current-hero-hash",
          plannedValue: "Improved candidate headline",
          evidenceRefs: [source("gnr8_single_site_source_evidence_items", "source-text-hero", "source-text-watermark")],
          operatorAuthored: true as const,
        },
      },
    ],
    proposalLimitations: [],
    implementationAuthorizationLimitations: [],
    evidenceRefs: {
      cloneReviewRef: source("gnr8_single_site_clone_reviews", seed.cloneReviewId),
      sourceEvidenceReviewRef: source("gnr8_single_site_source_evidence_reviews", seed.sourceReviewId),
      cloneSiteVersionRef: source("gnr8_runtime_site_versions", seed.cloneVersionId),
      cloneRuntimeArtifactRef: source("gnr8_runtime_artifacts", seed.cloneArtifactId),
    },
    implementationScopeSummary: "Apply deterministic hero copy only.",
    nonGoals: ["No publish", "No active pointer", "No approval"],
    actor: actor(),
    correlationId: "corr-dry-run-integration",
    idempotencyKey: "idem-dry-run-integration",
    semanticInputWatermark: "",
  } satisfies ImprovedCandidateDryRunInput;
  const semanticInputWatermark = computeImprovedCandidateDryRunSemanticInputWatermark(base);
  return { ...base, semanticInputWatermark, executionAttempt: { ...base.executionAttempt, semanticInputWatermark } };
}

test("real improved candidate creation persists runtime output and MVP-21 refs without publish side effects", async () => {
  const disposable = await startDisposablePostgres();
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = disposable.connectionString;
  const poolState = (globalThis as { __gnr8SuperadminPoolState__?: { pool: { end: () => Promise<void> } | null; diagnosticsBound: boolean; diagnostics: unknown } }).__gnr8SuperadminPoolState__;
  if (poolState?.pool) await poolState.pool.end();
  if (poolState) poolState.pool = null;
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 6 });
  const writer = new SingleSiteStateWriterRepository(writerPool(pool));
  const execution = new ImprovementExecutionService(writer);

  try {
    const suffix = randomUUID().replace(/-/g, "").slice(0, 10);
    const seed = await seedGovernedBaseline(pool, suffix);
    const attempt = await execution.createOrReuseExecutionAttempt({
      migrationId: seed.migrationId,
      clientId: seed.clientId,
      siteId: seed.siteUuid,
      proposalPlanId: seed.planId,
      implementationAuthorizationRef: {
        approvalRequestId: "auth-request",
        approvalDecisionId: "auth-decision",
        evidencePackageId: "auth-evidence",
        sourceTable: "gnr8_aaf_approval_decisions",
        sourceRecordId: "auth-decision",
        scope: "single_site_improvement_implementation_authorization",
      },
      selectedRecommendationRefs: [
        {
          ...source("gnr8_single_site_improvement_proposal_recommendations", seed.recommendationId, "recommendation-watermark"),
          recommendationId: seed.recommendationId,
          recommendationKey: "hero-copy",
        },
      ],
      implementationScopeSummary: "Apply deterministic hero copy only.",
      implementationScopeWatermark: "implementation-scope-watermark",
      semanticInputWatermark: "execution-semantic-placeholder",
      executionMode: "execute",
      actor: actor(),
      correlationId: `corr-execution-create-${suffix}`,
      idempotencyKey: `idem-execution-create-${suffix}`,
    });
    const dryRunInput = dryRunInputFromBaseline(seed, attempt.attempt.id);
    const dryRun = dryRunImprovedCandidate(dryRunInput);
    const ready = await execution.markReady({
      attemptId: attempt.attempt.id,
      validation: validation({ executionAttemptKey: attempt.attempt.id }),
      validationResultRef: "auth-decision",
      validationEvidenceRef: "auth-evidence",
      actor: actor(),
      correlationId: `corr-ready-${suffix}`,
      idempotencyKey: `idem-ready-${suffix}`,
    });
    assert.equal(ready.attempt.status, "ready");

    const creationWithoutWatermark = {
      tenantId: dryRunInput.tenantId,
      clientId: dryRunInput.clientId,
      siteId: dryRunInput.siteId,
      migrationId: dryRunInput.migrationId,
      executionAttempt: { ...dryRunInput.executionAttempt, status: "ready" },
      validationResult: dryRunInput.validationResult,
      implementationAuthorizationRefs: dryRunInput.implementationAuthorizationRefs,
      proposalPlanRef: dryRunInput.proposalPlanRef,
      proposalApprovalRefs: dryRunInput.proposalApprovalRefs,
      selectedRecommendationRefs: dryRunInput.selectedRecommendationRefs,
      selectedRecommendations: dryRunInput.selectedRecommendations,
      dryRunResult: dryRun,
      dryRunSemanticInputWatermark: dryRun.watermarks.semanticInputWatermark,
      dryRunPlannedChangeSetWatermark: dryRun.watermarks.plannedChangeSetWatermark,
      dryRunSemanticOutputWatermark: dryRun.watermarks.semanticOutputWatermark,
      proposalLimitations: dryRunInput.proposalLimitations,
      implementationAuthorizationLimitations: dryRunInput.implementationAuthorizationLimitations,
      evidenceRefs: dryRunInput.evidenceRefs,
      implementationScopeSummary: dryRunInput.implementationScopeSummary,
      nonGoals: dryRunInput.nonGoals,
      actor: actor(),
      correlationId: `corr-create-candidate-${suffix}`,
      idempotencyKey: `idem-create-candidate-${suffix}`,
    };
    const semanticInputWatermark = computeImprovedCandidateCreationSemanticInputWatermark(creationWithoutWatermark);
    const creationInput = { ...creationWithoutWatermark, semanticInputWatermark };
    await assert.rejects(() => createImprovedCandidate({ ...creationInput, validationResult: undefined as never }, { executionService: execution }), /validation result is required/);
    await assert.rejects(() => createImprovedCandidate({ ...creationInput, dryRunResult: undefined as never }, { executionService: execution }), /dry-run result is required/);

    const runtimeDeps = {
      getSiteVersion: (siteVersionId: string) => readRuntimeSiteVersion(pool, siteVersionId),
      getArtifactById: (artifactId: string) => readDisposableArtifact(pool, artifactId),
      createSiteVersionFromMigration: (input: Parameters<typeof createDisposableSiteVersion>[1]) => createDisposableSiteVersion(pool, input),
      buildDeterministicArtifactBundle: buildDisposableArtifactBundle,
      createArtifact: (input: Parameters<typeof createDisposableArtifact>[1]) => createDisposableArtifact(pool, input),
      bindArtifactToVersion: (input: Parameters<typeof bindDisposableArtifact>[1]) => bindDisposableArtifact(pool, input),
    };
    const beforeClone = await readRuntimeSiteVersion(pool, seed.cloneVersionId);
    const beforeActivePointer = await getDisposableActivePointer(pool, `runtime-site-${suffix}`);
    const output = await createImprovedCandidate(creationInput, { ...runtimeDeps, executionService: execution });
    assert.equal(output.published, false);
    assert.equal(output.activePointerChanged, false);
    assert.equal(output.contentApproved, false);
    assert.equal(output.clientApproved, false);
    assert.equal(output.launchApproved, false);
    assert.equal(output.publishApproved, false);

    const candidateVersion = await readRuntimeSiteVersion(pool, output.targetRefs.improvedCandidateSiteVersionId);
    assert.ok(candidateVersion);
    assert.equal(candidateVersion.state, "DRAFT");
    assert.equal(candidateVersion.pages[0]?.contentModel.sectionProps.hero?.heading, "Improved candidate headline");
    const candidateArtifact = await readDisposableArtifact(pool, output.targetRefs.improvedRuntimeArtifactId);
    assert.ok(candidateArtifact);
    assert.equal(candidateArtifact.siteVersionId, candidateVersion.id);
    assert.equal(candidateArtifact.publishStage, "shadow");
    assert.equal(candidateVersion.artifactId, candidateArtifact.id);
    assert.deepEqual(await readRuntimeSiteVersion(pool, seed.cloneVersionId), beforeClone);
    assert.deepEqual(await getDisposableActivePointer(pool, `runtime-site-${suffix}`), beforeActivePointer);

    const persistedAttempt = await pool.query(
      "select status, improved_candidate_site_version_ref, improved_runtime_artifact_ref, output_refs_json, content_approval_granted, client_approval_granted, launch_approval_granted, publish_activation_approval_granted from public.gnr8_single_site_improvement_execution_attempts where id = $1::uuid",
      [attempt.attempt.id],
    );
    assert.equal(persistedAttempt.rows[0]?.status, "completed");
    assert.equal(persistedAttempt.rows[0]?.improved_candidate_site_version_ref, output.refs.improvedCandidateSiteVersionRef);
    assert.equal(persistedAttempt.rows[0]?.improved_runtime_artifact_ref, output.refs.improvedRuntimeArtifactRef);
    assert.equal(persistedAttempt.rows[0]?.content_approval_granted, false);
    assert.equal(persistedAttempt.rows[0]?.client_approval_granted, false);
    assert.equal(persistedAttempt.rows[0]?.launch_approval_granted, false);
    assert.equal(persistedAttempt.rows[0]?.publish_activation_approval_granted, false);

    const outputRefs = await pool.query<{ ref_type: string; source_record_id: string }>(
      "select ref_type, source_record_id from public.gnr8_single_site_improvement_execution_refs where attempt_id = $1::uuid and ref_role = 'output_ref' order by ref_type",
      [attempt.attempt.id],
    );
    assert.ok(outputRefs.rows.some((row) => row.ref_type === "runtime_site_version_improved_candidate" && row.source_record_id === candidateVersion.id));
    assert.ok(outputRefs.rows.some((row) => row.ref_type === "runtime_artifact_improved_candidate" && row.source_record_id === candidateArtifact.id));

    const replay = await createImprovedCandidate({ ...creationInput, executionAttempt: { ...creationInput.executionAttempt, status: "completed" } }, { ...runtimeDeps, executionService: execution });
    assert.equal(replay.idempotency.reused, true);
    assert.equal(replay.targetRefs.improvedCandidateSiteVersionId, output.targetRefs.improvedCandidateSiteVersionId);
    assert.equal(await optionalCount(pool, "gnr8_runtime_site_versions"), 2);
    assert.equal(await optionalCount(pool, "gnr8_runtime_artifacts"), 2);

    const drifted = {
      ...creationInput,
      proposalLimitations: [{ changed: true }],
    };
    const driftedWatermark = computeImprovedCandidateCreationSemanticInputWatermark(drifted);
    await assert.rejects(() => createImprovedCandidate({ ...drifted, semanticInputWatermark: driftedWatermark }, { ...runtimeDeps, executionService: execution }), SingleSiteIdempotencyConflictError);

    assert.equal(await optionalCount(pool, "gnr8_generated_proposal_bundles"), 0);
    assert.equal(await optionalCount(pool, "gnr8_billing_subscriptions"), 0);
    assert.equal(await optionalCount(pool, "gnr8_domain_dns_readiness"), 0);
    assert.equal(await optionalCount(pool, "gnr8_runtime_active_pointers"), 0);
  } finally {
    await pool.end();
    const finalPoolState = (globalThis as { __gnr8SuperadminPoolState__?: { pool: { end: () => Promise<void> } | null } }).__gnr8SuperadminPoolState__;
    if (finalPoolState?.pool) {
      await finalPoolState.pool.end();
      finalPoolState.pool = null;
    }
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
    docker(["stop", disposable.containerName]);
  }
});
