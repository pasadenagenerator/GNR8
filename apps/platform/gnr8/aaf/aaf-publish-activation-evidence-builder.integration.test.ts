import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Pool } from "pg";

import { buildPublishActivationEvidencePackage, type PublishActivationSourceReaderResult } from "./aaf-publish-activation-evidence-builder";
import { AafIdempotencyConflictError, AafWriterRepository } from "./aaf-writer-repository";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "../../../..");
const MIGRATION_PATH = path.join(REPO_ROOT, "apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql");

type DisposablePostgres = {
  containerName: string;
  connectionString: string;
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
  const containerName = `gnr8-aaf-publish-evidence-${process.pid}-${suffix}`;
  const database = `gnr8_aaf_publish_evidence_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_aaf_local_${suffix.replace(/-/g, "")}`;
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

    docker(["cp", MIGRATION_PATH, `${containerName}:/tmp/20260722120000_aaf_persistence_core.sql`]);
    docker([
      "exec",
      containerName,
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-h",
      "127.0.0.1",
      "-U",
      user,
      "-d",
      database,
      "-f",
      "/tmp/20260722120000_aaf_persistence_core.sql",
    ]);

    const port = parsePublishedPort(docker(["port", containerName, "5432/tcp"]));
    return {
      containerName,
      connectionString: `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${encodeURIComponent(database)}`,
    };
  } catch (error) {
    try {
      docker(["stop", containerName]);
    } catch {
      // Best effort cleanup for disposable local DB setup failure.
    }
    throw error;
  }
}

function source(sourceTable: string, sourceRecordId: string, canonicalFields: Record<string, unknown>) {
  return {
    sourceSystem: "synthetic_test_data",
    sourceTable,
    sourceRecordId,
    sourceRef: `${sourceTable}:${sourceRecordId}`,
    sourceVersion: String(canonicalFields.updatedAt ?? canonicalFields.version ?? "1"),
    canonicalFields,
    hashFields: Object.keys(canonicalFields).sort((left, right) => left.localeCompare(right)),
  };
}

function syntheticSources(suffix: string): PublishActivationSourceReaderResult {
  const siteVersionId = `11111111-1111-4111-8111-${suffix.padStart(12, "1").slice(0, 12)}`;
  const artifactId = `22222222-2222-4222-8222-${suffix.padStart(12, "2").slice(0, 12)}`;
  return {
    siteVersion: source("gnr8_runtime_site_versions", siteVersionId, {
      id: siteVersionId,
      siteId: `site-${suffix}`,
      state: "APPROVED",
      artifactId,
      updatedAt: `2026-07-27T10:00:${suffix.slice(0, 2)}.000Z`,
    }),
    runtimeArtifact: source("gnr8_runtime_artifacts", artifactId, {
      id: artifactId,
      siteId: `site-${suffix}`,
      siteVersionId,
      bundleSha256: `bundle-${suffix}`,
      publishStage: "production",
    }),
    activePointer: {
      ...source("gnr8_runtime_active_pointers", `site-${suffix}`, {
        siteId: `site-${suffix}`,
        activeSiteVersionId: null,
        activeArtifactId: null,
        updatedAt: `2026-07-27T09:00:${suffix.slice(0, 2)}.000Z`,
      }),
      activeSiteVersionId: null,
      activeArtifactId: null,
    },
    publishTarget: source("gnr8_publish_targets", "production", {
      target: "production",
      policyVersion: `AAF-7-${suffix}`,
    }),
    domainReadiness: {
      ...source("gnr8_domain_readiness_snapshots", `domain-${suffix}`, {
        siteId: `site-${suffix}`,
        status: "ready",
        checkedAt: `2026-07-27T09:59:${suffix.slice(0, 2)}.000Z`,
      }),
      readinessStatus: "ready",
      snapshotRef: `domain-readiness:${suffix}`,
    },
    contentOverridePublishedState: {
      ...source("gnr8_content_overrides", siteVersionId, {
        siteVersionId,
        publishedOverrideCount: 0,
        maxUpdatedAt: null,
      }),
      status: "not_applicable",
    },
    launchSignoff: null,
    publishActivationApproval: null,
  };
}

test("publish activation evidence builder persists only AAF evidence records in disposable Postgres", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 3 });
  const writer = new AafWriterRepository(pool);
  const suffix = randomUUID().replace(/-/g, "").slice(0, 10);
  const sources = syntheticSources(suffix);
  const siteVersionId = sources.siteVersion!.sourceRecordId;
  const artifactId = sources.runtimeArtifact!.sourceRecordId;

  try {
    const input = {
      tenantId: `tenant-${suffix}`,
      clientId: `client-${suffix}`,
      siteId: `site-${suffix}`,
      siteVersionId,
      runtimeArtifactId: artifactId,
      intendedPublishTarget: "production",
      contentOverrideStateRequired: false,
      launchSignoffRequiredByPolicy: false,
      publishActivationApprovalRef: null,
      actorType: "system" as const,
      actorId: "aaf-publish-evidence-builder-integration-test",
      actorRole: "system",
      correlationId: `corr-${suffix}`,
      idempotencyKey: `idem-${suffix}`,
      policyVersion: `AAF-7-${suffix}`,
      sourceReader: {
        async readPublishActivationSources() {
          return sources;
        },
      },
      writer,
    };

    const first = await buildPublishActivationEvidencePackage(input);
    const retry = await buildPublishActivationEvidencePackage(input);
    assert.equal(retry.evidencePackageId, first.evidencePackageId);
    assert.equal(first.dryRunInput.evidencePackageId, first.evidencePackageId);
    assert.equal(first.dryRunInput.sourceRefs.siteVersion.sourceRecordId, siteVersionId);
    assert.equal(first.dryRunInput.sourceRefs.runtimeArtifact.sourceRecordId, artifactId);
    assert.deepEqual(first.missingSourceTruth, []);

    const packageRows = await pool.query(
      `select package_type, status, source_watermark, freshness_label, content_hash from public.gnr8_aaf_evidence_packages where id = $1::uuid`,
      [first.evidencePackageId],
    );
    assert.equal(packageRows.rowCount, 1);
    assert.equal(packageRows.rows[0]?.package_type, "publish_activation_evidence");
    assert.equal(packageRows.rows[0]?.status, "created");
    assert.equal(packageRows.rows[0]?.freshness_label, "fresh");

    const sourceRefRows = await pool.query(
      `select source_table, source_record_id, source_watermark, metadata_json from public.gnr8_aaf_evidence_package_source_refs where evidence_package_id = $1::uuid order by source_table asc`,
      [first.evidencePackageId],
    );
    assert.equal(sourceRefRows.rowCount, 6);
    assert.ok(sourceRefRows.rows.some((row) => row.source_table === "gnr8_runtime_site_versions" && row.source_record_id === siteVersionId));
    assert.ok(sourceRefRows.rows.every((row) => typeof row.source_watermark === "string" && row.source_watermark.length > 0));
    assert.ok(sourceRefRows.rows.every((row) => row.metadata_json?.watermarkMetadata));

    const freshnessRows = await pool.query(
      `select result, current_source_watermark from public.gnr8_aaf_evidence_package_freshness_checks where evidence_package_id = $1::uuid`,
      [first.evidencePackageId],
    );
    assert.equal(freshnessRows.rowCount, 1);
    assert.equal(freshnessRows.rows[0]?.result, "fresh");
    assert.equal(freshnessRows.rows[0]?.current_source_watermark, packageRows.rows[0]?.source_watermark);

    await assert.rejects(
      () =>
        buildPublishActivationEvidencePackage({
          ...input,
          sourceReader: {
            async readPublishActivationSources() {
              return {
                ...sources,
                runtimeArtifact: source("gnr8_runtime_artifacts", artifactId, {
                  id: artifactId,
                  siteId: `site-${suffix}`,
                  siteVersionId,
                  bundleSha256: `bundle-drift-${suffix}`,
                  publishStage: "production",
                }),
              };
            },
          },
        }),
      (error) => error instanceof AafIdempotencyConflictError,
    );

    const runtimeTables = await pool.query(
      `
      select
        to_regclass('public.gnr8_runtime_active_pointers') as active_pointers,
        to_regclass('public.gnr8_runtime_site_versions') as site_versions,
        to_regclass('public.gnr8_runtime_artifacts') as runtime_artifacts,
        to_regclass('public.gnr8_runtime_domain_host_bindings') as domain_bindings,
        to_regclass('public.gnr8_content_overrides') as content_overrides
      `,
    );
    assert.equal(runtimeTables.rows[0]?.active_pointers, null);
    assert.equal(runtimeTables.rows[0]?.site_versions, null);
    assert.equal(runtimeTables.rows[0]?.runtime_artifacts, null);
    assert.equal(runtimeTables.rows[0]?.domain_bindings, null);
    assert.equal(runtimeTables.rows[0]?.content_overrides, null);
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
