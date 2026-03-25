import assert from "node:assert/strict";
import test from "node:test";

import { POST as submitFormRoute } from "@/app/api/gnr8/runtime/forms/submit/route";
import { POST as migrateUrlRoute } from "@/app/api/gnr8/runtime/migrate/url/route";
import { POST as approveRoute } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/approve/route";
import { GET as previewRoute } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/preview/route";
import { POST as publishRoute } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route";
import { POST as readyRoute } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/ready/route";
import { POST as rollbackRoute } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/rollback/route";
import { deterministicId } from "@/gnr8/runtime/deterministic";
import { ensureRuntimeTables, getSiteVersion } from "@/gnr8/runtime/runtime-store";
import { getSuperadminPool } from "@/src/superadmin/db";

const TEST_SITE_ID_PREFIX = "test_runtime_e2e_site";

function assertOkResponse(response: Response, action: string): void {
  assert.equal(response.ok, true, `${action} should return 2xx`);
}

function assertUuid(value: string, label: string): void {
  assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, `${label} should be a UUID`);
}

function assertIsTestSiteId(siteId: string): void {
  assert.match(
    siteId,
    /^test_runtime_e2e_[a-z0-9_]+$/,
    "Isolation guard: siteId must be a deterministic test-only id (test_runtime_e2e_*)",
  );
}

async function cleanRuntimeSite(siteId: string): Promise<void> {
  assertIsTestSiteId(siteId);
  const pool = getSuperadminPool();
  await pool.query(`delete from public.gnr8_runtime_sites where id = $1::text`, [siteId]);
}

async function readActivePointer(siteId: string): Promise<{ siteVersionId: string; artifactId: string } | null> {
  const pool = getSuperadminPool();
  const res = await pool.query<{ active_site_version_id: string; active_artifact_id: string }>(
    `
    select
      active_site_version_id::text as active_site_version_id,
      active_artifact_id::text as active_artifact_id
    from public.gnr8_runtime_active_pointers
    where site_id = $1::text
    limit 1
    `,
    [siteId],
  );

  const row = res.rows[0];
  if (!row) return null;
  return {
    siteVersionId: row.active_site_version_id,
    artifactId: row.active_artifact_id,
  };
}

async function countArtifacts(siteId: string): Promise<number> {
  assertIsTestSiteId(siteId);
  const pool = getSuperadminPool();
  const res = await pool.query<{ count: string }>(
    `select count(*)::text as count from public.gnr8_runtime_artifacts where site_id = $1::text`,
    [siteId],
  );
  return Number(res.rows[0]?.count ?? 0);
}

async function readResolvedActiveArtifactForSite(siteId: string, pagePath: string): Promise<{ artifactId: string; html: string } | null> {
  assertIsTestSiteId(siteId);
  const pool = getSuperadminPool();
  const res = await pool.query<{ artifact_id: string; html: string }>(
    `
    select
      p.active_artifact_id::text as artifact_id,
      coalesce(a.html_by_path ->> $2::text, a.html_by_path ->> '/'::text) as html
    from public.gnr8_runtime_active_pointers p
    join public.gnr8_runtime_artifacts a on a.id = p.active_artifact_id
    where p.site_id = $1::text
    limit 1
    `,
    [siteId, pagePath],
  );

  const row = res.rows[0];
  if (!row || !row.html) return null;
  return { artifactId: row.artifact_id, html: row.html };
}

test("phase-5a runtime happy path lock: migrate -> ready -> approve -> preview -> publish -> public resolve -> rollback -> form submit", async () => {
  assert.ok(
    process.env.DATABASE_URL,
    "DATABASE_URL is required for real runtime verification (expected: Supabase Postgres connection string)",
  );

  const isolationRunId = String(process.env.GNR8_RUNTIME_E2E_RUN_ID ?? "").trim();
  assert.ok(
    isolationRunId,
    "Isolation cannot be guaranteed on shared Supabase without GNR8_RUNTIME_E2E_RUN_ID. Aborting for safety. Set a deterministic run id (for example: ci-1234) or explicitly confirm an unsafe run.",
  );

  const sourceUrl = `https://test-runtime-e2e-${isolationRunId}.gnr8.test/`;
  const siteId = deterministicId(TEST_SITE_ID_PREFIX, sourceUrl);
  assertIsTestSiteId(siteId);

  const htmlV1 = `<!doctype html><html><head><title>Phase 5A V1</title></head><body><main><section><h1>Phase 5A V1 Headline</h1><p>Version 1 body text</p></section></main></body></html>`;
  const htmlV2 = `<!doctype html><html><head><title>Phase 5A V2</title></head><body><main><section><h1>Phase 5A V2 Headline</h1><p>Version 2 body text</p></section></main></body></html>`;

  const fetchQueue = [htmlV1, htmlV2];
  const originalFetch = globalThis.fetch;
  const previousTestSitePrefix = process.env.GNR8_RUNTIME_TEST_SITE_ID_PREFIX;

  globalThis.fetch = (async () => {
    const next = fetchQueue.shift();
    if (!next) return new Response("no fixture", { status: 500 });
    return new Response(next, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }) as typeof fetch;

  process.env.GNR8_RUNTIME_TEST_SITE_ID_PREFIX = TEST_SITE_ID_PREFIX;
  await ensureRuntimeTables();
  await cleanRuntimeSite(siteId);

  try {
    const migrateV1Res = await migrateUrlRoute(
      new Request("http://localhost/api/gnr8/runtime/migrate/url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: sourceUrl, slug: "/", actor: "test:phase5a:migrate:v1" }),
      }),
    );
    assertOkResponse(migrateV1Res, "migrate v1");
    const migrateV1 = (await migrateV1Res.json()) as { siteVersionId: string; siteVersionNo: number; lifecycleState: string; siteId: string };
    assert.equal(migrateV1.siteId, siteId);
    assert.equal(migrateV1.lifecycleState, "DRAFT");
    assert.equal(migrateV1.siteVersionNo, 1);
    assertUuid(migrateV1.siteVersionId, "siteVersionId(v1)");

    const readyV1Res = await readyRoute(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ siteVersionId: migrateV1.siteVersionId }),
    });
    assertOkResponse(readyV1Res, "ready v1");
    const readyV1 = (await readyV1Res.json()) as { previousState: string; nextState: string };
    assert.equal(readyV1.previousState, "DRAFT");
    assert.equal(readyV1.nextState, "READY_FOR_REVIEW");

    const approveV1Res = await approveRoute(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ siteVersionId: migrateV1.siteVersionId }),
    });
    assertOkResponse(approveV1Res, "approve v1");
    const approveV1 = (await approveV1Res.json()) as { previousState: string; nextState: string };
    assert.equal(approveV1.previousState, "READY_FOR_REVIEW");
    assert.equal(approveV1.nextState, "APPROVED");

    const publishV1Res = await publishRoute(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ siteVersionId: migrateV1.siteVersionId }),
    });
    assertOkResponse(publishV1Res, "publish v1");
    const publishV1 = (await publishV1Res.json()) as {
      artifactId: string;
      siteVersionId: string;
      pointerSwitch: string;
      previousActivePointer: { siteVersionId: string; artifactId: string } | null;
    };
    assert.equal(publishV1.siteVersionId, migrateV1.siteVersionId);
    assert.equal(publishV1.pointerSwitch, "atomic_site_pointer_reassignment");
    assert.equal(publishV1.previousActivePointer, null);
    assertUuid(publishV1.artifactId, "artifactId(v1)");

    const migrateV2Res = await migrateUrlRoute(
      new Request("http://localhost/api/gnr8/runtime/migrate/url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: sourceUrl, slug: "/", actor: "test:phase5a:migrate:v2" }),
      }),
    );
    assertOkResponse(migrateV2Res, "migrate v2");
    const migrateV2 = (await migrateV2Res.json()) as { siteVersionId: string; siteVersionNo: number; lifecycleState: string; siteId: string };
    assert.equal(migrateV2.siteId, siteId);
    assert.equal(migrateV2.lifecycleState, "DRAFT");
    assert.equal(migrateV2.siteVersionNo, 2);
    assertUuid(migrateV2.siteVersionId, "siteVersionId(v2)");

    const readyV2Res = await readyRoute(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ siteVersionId: migrateV2.siteVersionId }),
    });
    assertOkResponse(readyV2Res, "ready v2");
    const readyV2 = (await readyV2Res.json()) as { previousState: string; nextState: string };
    assert.equal(readyV2.previousState, "DRAFT");
    assert.equal(readyV2.nextState, "READY_FOR_REVIEW");

    const approveV2Res = await approveRoute(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ siteVersionId: migrateV2.siteVersionId }),
    });
    assertOkResponse(approveV2Res, "approve v2");
    const approveV2 = (await approveV2Res.json()) as { previousState: string; nextState: string };
    assert.equal(approveV2.previousState, "READY_FOR_REVIEW");
    assert.equal(approveV2.nextState, "APPROVED");

    const previewV2Res = await previewRoute(new Request("http://localhost/api/gnr8/runtime/preview?path=/", { method: "GET" }), {
      params: Promise.resolve({ siteVersionId: migrateV2.siteVersionId }),
    });
    assertOkResponse(previewV2Res, "preview v2");
    const previewV2Html = await previewV2Res.text();
    assert.match(previewV2Html, /data-gnr8-render-mode="preview"/);
    assert.match(previewV2Html, /data-gnr8-section-id=/);
    assert.match(previewV2Html, /data-gnr8-section-props/);
    assert.match(previewV2Html, /Phase 5A V2 Headline/);

    const publishV2Res = await publishRoute(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ siteVersionId: migrateV2.siteVersionId }),
    });
    assertOkResponse(publishV2Res, "publish v2");
    const publishV2 = (await publishV2Res.json()) as {
      artifactId: string;
      siteVersionId: string;
      pointerSwitch: string;
      previousActivePointer: { siteVersionId: string; artifactId: string } | null;
    };
    assert.equal(publishV2.siteVersionId, migrateV2.siteVersionId);
    assert.equal(publishV2.pointerSwitch, "atomic_site_pointer_reassignment");
    assert.deepEqual(publishV2.previousActivePointer, {
      siteVersionId: migrateV1.siteVersionId,
      artifactId: publishV1.artifactId,
    });
    assertUuid(publishV2.artifactId, "artifactId(v2)");

    const publishV2RepeatRes = await publishRoute(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ siteVersionId: migrateV2.siteVersionId }),
    });
    assertOkResponse(publishV2RepeatRes, "publish v2 repeat");
    const publishV2Repeat = (await publishV2RepeatRes.json()) as {
      artifactId: string;
      siteVersionId: string;
      pointerSwitch: string;
      previousActivePointer: { siteVersionId: string; artifactId: string } | null;
    };
    assert.equal(publishV2Repeat.siteVersionId, migrateV2.siteVersionId);
    assert.equal(publishV2Repeat.artifactId, publishV2.artifactId);
    assert.equal(publishV2Repeat.pointerSwitch, "PUBLISH_ALREADY_ACTIVE_SAFE_NOOP");
    assert.deepEqual(publishV2Repeat.previousActivePointer, {
      siteVersionId: migrateV2.siteVersionId,
      artifactId: publishV2.artifactId,
    });

    const v2Record = await getSiteVersion(migrateV2.siteVersionId);
    assert.ok(v2Record);
    assert.equal(v2Record!.state, "PUBLISHED");
    assert.equal(v2Record!.artifactId, publishV2.artifactId);

    const pointerAfterPublishV2 = await readActivePointer(siteId);
    assert.ok(pointerAfterPublishV2);
    assert.equal(pointerAfterPublishV2!.siteVersionId, migrateV2.siteVersionId);
    assert.equal(pointerAfterPublishV2!.artifactId, publishV2.artifactId);

    const resolvedBeforeRollback = await readResolvedActiveArtifactForSite(siteId, "/");
    assert.ok(resolvedBeforeRollback, "public resolution should return active GNR8 artifact");
    assert.equal(resolvedBeforeRollback!.artifactId, publishV2.artifactId);
    assert.match(resolvedBeforeRollback!.html, /data-gnr8-render-mode="publish"/);
    assert.match(resolvedBeforeRollback!.html, /data-gnr8-section-props/);
    assert.match(resolvedBeforeRollback!.html, /Phase 5A V2 Headline/);

    const artifactCountBeforeRollback = await countArtifacts(siteId);

    const rollbackRes = await rollbackRoute(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ siteVersionId: migrateV1.siteVersionId }),
    });
    assertOkResponse(rollbackRes, "rollback to v1 artifact");
    const rollback = (await rollbackRes.json()) as { siteVersionId: string; artifactId: string; switched: boolean };
    assert.equal(rollback.switched, true);
    assert.equal(rollback.siteVersionId, migrateV1.siteVersionId);
    assert.equal(rollback.artifactId, publishV1.artifactId);

    const artifactCountAfterRollback = await countArtifacts(siteId);
    assert.equal(artifactCountAfterRollback, artifactCountBeforeRollback, "rollback should switch pointer without rebuilding artifacts");

    const pointerAfterRollback = await readActivePointer(siteId);
    assert.ok(pointerAfterRollback);
    assert.equal(pointerAfterRollback!.siteVersionId, migrateV1.siteVersionId);
    assert.equal(pointerAfterRollback!.artifactId, publishV1.artifactId);

    const resolvedAfterRollback = await readResolvedActiveArtifactForSite(siteId, "/");
    assert.ok(resolvedAfterRollback, "public resolution should follow rolled-back active artifact");
    assert.equal(resolvedAfterRollback!.artifactId, publishV1.artifactId);
    assert.match(resolvedAfterRollback!.html, /data-gnr8-render-mode="publish"/);
    assert.match(resolvedAfterRollback!.html, /Phase 5A V1 Headline/);

    const canonicalBeforeForm = await getSiteVersion(migrateV1.siteVersionId);
    assert.ok(canonicalBeforeForm);

    const formRes = await submitFormRoute(
      new Request("http://localhost/api/gnr8/runtime/forms/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          siteId,
          siteVersionId: migrateV1.siteVersionId,
          pagePath: "/",
          formId: "contact-main",
          payload: { email: "phase5a@example.test", message: "runtime bridge submit" },
          actor: "test:phase5a:form",
        }),
      }),
    );
    assertOkResponse(formRes, "form submit");
    const form = (await formRes.json()) as { submissionId: string; createdAt: string };
    assertUuid(form.submissionId, "submissionId");
    assert.ok(form.createdAt.length > 0);

    const pool = getSuperadminPool();
    const savedSubmission = await pool.query<{
      id: string;
      site_id: string;
      site_version_id: string;
      page_path: string;
      form_id: string;
      payload: Record<string, unknown>;
      actor: string;
    }>(
      `
      select
        id::text,
        site_id::text,
        site_version_id::text,
        page_path::text,
        form_id::text,
        payload,
        actor::text
      from public.gnr8_runtime_form_submissions
      where id = $1::uuid
      limit 1
      `,
      [form.submissionId],
    );
    assert.equal(savedSubmission.rows.length, 1);
    assert.equal(savedSubmission.rows[0]!.site_id, siteId);
    assert.equal(savedSubmission.rows[0]!.site_version_id, migrateV1.siteVersionId);
    assert.equal(savedSubmission.rows[0]!.page_path, "/");
    assert.equal(savedSubmission.rows[0]!.form_id, "contact-main");
    assert.equal(savedSubmission.rows[0]!.actor, "test:phase5a:form");
    assert.deepEqual(savedSubmission.rows[0]!.payload, {
      email: "phase5a@example.test",
      message: "runtime bridge submit",
    });

    const invalidScopedFormRes = await submitFormRoute(
      new Request("http://localhost/api/gnr8/runtime/forms/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          siteId: `${siteId}-wrong`,
          siteVersionId: migrateV1.siteVersionId,
          pagePath: "/",
          formId: "contact-main",
          payload: { email: "invalid@example.test" },
          actor: "test:phase5a:form:invalid",
        }),
      }),
    );
    assert.equal(invalidScopedFormRes.ok, false);
    assert.equal(invalidScopedFormRes.status, 400);

    const canonicalAfterForm = await getSiteVersion(migrateV1.siteVersionId);
    assert.deepEqual(canonicalAfterForm, canonicalBeforeForm, "form runtime bridge should not mutate canonical site version state/content");

    assert.equal(fetchQueue.length, 0, "all deterministic migration fetch fixtures should be consumed");
  } finally {
    globalThis.fetch = originalFetch;
    if (previousTestSitePrefix === undefined) delete process.env.GNR8_RUNTIME_TEST_SITE_ID_PREFIX;
    else process.env.GNR8_RUNTIME_TEST_SITE_ID_PREFIX = previousTestSitePrefix;
    await cleanRuntimeSite(siteId);
  }
});
