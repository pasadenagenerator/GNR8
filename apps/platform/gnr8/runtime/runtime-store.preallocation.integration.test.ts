import assert from "node:assert/strict";
import test from "node:test";

import { createSiteVersionFromMigration, ensureRuntimeTables, preallocateSiteVersionIdentity } from "@/gnr8/runtime/runtime-store";
import { getSuperadminPool } from "@/src/superadmin/db";

const TEST_SITE_ID_PREFIX = "test_runtime_store_prealloc";

function assertIsTestSiteId(siteId: string): void {
  assert.match(siteId, /^test_runtime_store_prealloc_[a-z0-9_]+$/, "siteId must use test_runtime_store_prealloc_* prefix");
}

async function cleanRuntimeSite(siteId: string): Promise<void> {
  assertIsTestSiteId(siteId);
  await getSuperadminPool().query(`delete from public.gnr8_runtime_sites where id = $1::text`, [siteId]);
}

async function readSiteVersionRow(siteVersionId: string): Promise<{
  id: string;
  siteId: string;
  versionNo: number;
  state: string;
  source: string;
  actor: string;
  rendererCompatibilityVersion: string;
  importProvenanceSummary: unknown;
} | null> {
  const res = await getSuperadminPool().query<{
    id: string;
    site_id: string;
    version_no: number;
    state: string;
    source: string;
    actor: string;
    renderer_compatibility_version: string;
    import_provenance_summary: unknown;
  }>(
    `
    select
      id::text as id,
      site_id::text as site_id,
      version_no::int as version_no,
      state::text as state,
      source::text as source,
      actor::text as actor,
      renderer_compatibility_version::text as renderer_compatibility_version,
      import_provenance_summary as import_provenance_summary
    from public.gnr8_runtime_site_versions
    where id = $1::uuid
    limit 1
    `,
    [siteVersionId],
  );

  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    siteId: row.site_id,
    versionNo: row.version_no,
    state: row.state,
    source: row.source,
    actor: row.actor,
    rendererCompatibilityVersion: row.renderer_compatibility_version,
    importProvenanceSummary: row.import_provenance_summary,
  };
}

async function countSiteVersionRows(siteVersionId: string): Promise<number> {
  const res = await getSuperadminPool().query<{ count: string }>(
    `
    select count(*)::text as count
    from public.gnr8_runtime_site_versions
    where id = $1::uuid
    `,
    [siteVersionId],
  );
  return Number(res.rows[0]?.count ?? 0);
}

async function countSiteVersionRowsForSite(siteId: string): Promise<number> {
  const res = await getSuperadminPool().query<{ count: string }>(
    `
    select count(*)::text as count
    from public.gnr8_runtime_site_versions
    where site_id = $1::text
    `,
    [siteId],
  );
  return Number(res.rows[0]?.count ?? 0);
}

async function countPageVersionRows(siteVersionId: string): Promise<number> {
  const res = await getSuperadminPool().query<{ count: string }>(
    `
    select count(*)::text as count
    from public.gnr8_runtime_page_versions
    where site_version_id = $1::uuid
    `,
    [siteVersionId],
  );
  return Number(res.rows[0]?.count ?? 0);
}

test("runtime-store preallocation reuse: createSiteVersionFromMigration reuses reserved siteVersionId without duplicate site_version row", async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip("DATABASE_URL is required for DB-backed runtime-store verification");
    return;
  }

  const runId = String(process.env.GNR8_RUNTIME_E2E_RUN_ID ?? "").trim();
  if (!runId) {
    t.skip("GNR8_RUNTIME_E2E_RUN_ID is required for deterministic shared-db isolation");
    return;
  }

  const siteId = `${TEST_SITE_ID_PREFIX}_${runId}_reuse`;
  const siteVersionId = "11111111-1111-4111-8111-111111111111";
  assertIsTestSiteId(siteId);

  await ensureRuntimeTables();
  await cleanRuntimeSite(siteId);

  try {
    const preallocated = await preallocateSiteVersionIdentity({
      siteId,
      siteVersionId,
      sourceUrl: `https://${siteId}.gnr8.test/`,
      actor: "test:preallocate",
      rendererCompatibilityVersion: "gnr8-renderer-v1",
      correlationKey: `prealloc:${runId}`,
    });
    assert.equal(preallocated.reused, false);
    assert.equal(preallocated.siteVersionId, siteVersionId);
    assert.equal(preallocated.versionNo, 1);

    const siteVersionCountAfterPreallocate = await countSiteVersionRows(siteVersionId);
    assert.equal(siteVersionCountAfterPreallocate, 1);
    const pageVersionCountAfterPreallocate = await countPageVersionRows(siteVersionId);
    assert.equal(pageVersionCountAfterPreallocate, 0);

    const beforeRow = await readSiteVersionRow(siteVersionId);
    assert.ok(beforeRow);
    assert.equal(beforeRow!.siteId, siteId);
    assert.equal(beforeRow!.state, "DRAFT");
    assert.equal(beforeRow!.source, "migration");

    const created = await createSiteVersionFromMigration({
      siteId,
      siteVersionId,
      sourceUrl: `https://${siteId}.gnr8.test/`,
      actor: "test:migration",
      rendererCompatibilityVersion: "gnr8-renderer-v1",
      pages: [
        {
          pageId: `${siteId}_page_home`,
          path: "/",
          title: "Home",
          structureModel: {
            sections: [{ id: "hero", type: "hero", order: 0 }],
          },
          contentModel: {
            sectionProps: {
              hero: { heading: "Runtime Store Preallocation" },
            },
          },
          styleTokens: {
            "color.background": "#ffffff",
          },
          assetGraph: [],
          semanticSignals: [{ label: "migration.test", confidence: 1, source: "migration" }],
          source: "migration",
          actor: "test:migration",
        },
      ],
    });

    assert.equal(created.siteId, siteId);
    assert.equal(created.siteVersionId, siteVersionId);
    assert.equal(created.versionNo, 1);

    const siteVersionCountAfterCreate = await countSiteVersionRows(siteVersionId);
    assert.equal(siteVersionCountAfterCreate, 1);
    const siteVersionCountForSite = await countSiteVersionRowsForSite(siteId);
    assert.equal(siteVersionCountForSite, 1);
    const pageVersionCountAfterCreate = await countPageVersionRows(siteVersionId);
    assert.equal(pageVersionCountAfterCreate, 1);
  } finally {
    await cleanRuntimeSite(siteId);
  }
});

test("runtime-store preallocation scope mismatch: createSiteVersionFromMigration rejects reserved siteVersionId from another site", async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip("DATABASE_URL is required for DB-backed runtime-store verification");
    return;
  }

  const runId = String(process.env.GNR8_RUNTIME_E2E_RUN_ID ?? "").trim();
  if (!runId) {
    t.skip("GNR8_RUNTIME_E2E_RUN_ID is required for deterministic shared-db isolation");
    return;
  }

  const ownerSiteId = `${TEST_SITE_ID_PREFIX}_${runId}_owner`;
  const otherSiteId = `${TEST_SITE_ID_PREFIX}_${runId}_other`;
  const siteVersionId = "22222222-2222-4222-8222-222222222222";
  assertIsTestSiteId(ownerSiteId);
  assertIsTestSiteId(otherSiteId);

  await ensureRuntimeTables();
  await cleanRuntimeSite(ownerSiteId);
  await cleanRuntimeSite(otherSiteId);

  try {
    await preallocateSiteVersionIdentity({
      siteId: ownerSiteId,
      siteVersionId,
      sourceUrl: `https://${ownerSiteId}.gnr8.test/`,
      actor: "test:preallocate:owner",
      rendererCompatibilityVersion: "gnr8-renderer-v1",
      correlationKey: `prealloc-owner:${runId}`,
    });

    await assert.rejects(
      createSiteVersionFromMigration({
        siteId: otherSiteId,
        siteVersionId,
        sourceUrl: `https://${otherSiteId}.gnr8.test/`,
        actor: "test:migration:other",
        rendererCompatibilityVersion: "gnr8-renderer-v1",
        pages: [
          {
            pageId: `${otherSiteId}_page_home`,
            path: "/",
            title: "Home",
            structureModel: { sections: [{ id: "hero", type: "hero", order: 0 }] },
            contentModel: { sectionProps: { hero: { heading: "Wrong Site" } } },
            styleTokens: { "color.background": "#ffffff" },
            assetGraph: [],
            semanticSignals: [{ label: "migration.test", confidence: 1, source: "migration" }],
            source: "migration",
            actor: "test:migration:other",
          },
        ],
      }),
      /RUNTIME_IMPORT_IDENTITY_SITE_VERSION_SITE_MISMATCH/,
    );

    const siteVersionCount = await countSiteVersionRows(siteVersionId);
    assert.equal(siteVersionCount, 1);
    const row = await readSiteVersionRow(siteVersionId);
    assert.ok(row);
    assert.equal(row!.siteId, ownerSiteId);
  } finally {
    await cleanRuntimeSite(ownerSiteId);
    await cleanRuntimeSite(otherSiteId);
  }
});
