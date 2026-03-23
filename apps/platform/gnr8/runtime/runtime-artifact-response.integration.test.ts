import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

import { GET as publicRouteGet } from "@/app/(public)/[[...slug]]/route";
import { POST as migrateUrlRoute } from "@/app/api/gnr8/runtime/migrate/url/route";
import { POST as approveRoute } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/approve/route";
import { POST as publishRoute } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route";
import { POST as readyRoute } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/ready/route";
import { deterministicId } from "@/gnr8/runtime/deterministic";
import { ensureRuntimeTables } from "@/gnr8/runtime/runtime-store";
import { getSuperadminPool } from "@/src/superadmin/db";

const TEST_SITE_ID_PREFIX = "test_runtime_artifact_response";

function assertIsTestSiteId(siteId: string): void {
  assert.match(siteId, /^test_runtime_artifact_response_[a-z0-9_]+$/);
}

async function cleanRuntimeSite(siteId: string): Promise<void> {
  assertIsTestSiteId(siteId);
  await getSuperadminPool().query(`delete from public.gnr8_runtime_sites where id = $1::text`, [siteId]);
}

test("runtime artifact response: public route serves stable artifact HTML with visible legacy summary marker", async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip("DATABASE_URL is required for runtime integration coverage");
    return;
  }

  const isolationRunId = String(process.env.GNR8_RUNTIME_E2E_RUN_ID ?? "").trim();
  if (!isolationRunId) {
    t.skip("GNR8_RUNTIME_E2E_RUN_ID is required for safe shared-db isolation");
    return;
  }

  const sourceUrl = `https://test-runtime-artifact-response-${isolationRunId}.gnr8.test/`;
  const siteId = deterministicId(TEST_SITE_ID_PREFIX, sourceUrl);
  assertIsTestSiteId(siteId);

  const previousPrefix = process.env.GNR8_RUNTIME_TEST_SITE_ID_PREFIX;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      "<!doctype html><html><body><main><h1>TRANSPORTI MAVER D.O.O.</h1><p>Naše podjetje ima dolgo tradicijo prevozov po Evropi. Trenutno imamo na razpolago 15 avto transporterjev in pokrivamo Nemčijo, Italijo in Francijo.</p><p>Kontakt: Tel: +386 (0)1 366 38 36 E-mail: transporti.maver@siol.net Dolenjska cesta 328, Lavrica 1291 Škofljica.</p><img src='/uploads/logo.png' /><img src='/assets/image/hero.jpg' /><a href='/kontakt'>Kontakt</a><a href='tel:+386(0)13663836'>+386 (0)1 366 38 36</a></main></body></html>",
      {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    )) as typeof fetch;

  process.env.GNR8_RUNTIME_TEST_SITE_ID_PREFIX = TEST_SITE_ID_PREFIX;
  await ensureRuntimeTables();
  await cleanRuntimeSite(siteId);

  try {
    const migrateRes = await migrateUrlRoute(
      new Request("http://localhost/api/gnr8/runtime/migrate/url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: sourceUrl, slug: "/", actor: "test:artifact-response:migrate" }),
      }),
    );
    assert.equal(migrateRes.ok, true);
    const migrate = (await migrateRes.json()) as { siteVersionId: string; siteId: string };
    assert.equal(migrate.siteId, siteId);

    const readyRes = await readyRoute(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ siteVersionId: migrate.siteVersionId }),
    });
    assert.equal(readyRes.ok, true);

    const approveRes = await approveRoute(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ siteVersionId: migrate.siteVersionId }),
    });
    assert.equal(approveRes.ok, true);

    const publishRes = await publishRoute(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ siteVersionId: migrate.siteVersionId }),
    });
    assert.equal(publishRes.ok, true);

    let publicResponse: Response;
    try {
      publicResponse = await publicRouteGet(
        new NextRequest("http://maver.app.pasadenagenerator.com/", {
          method: "GET",
          headers: {
            host: "maver.app.pasadenagenerator.com",
            "x-forwarded-host": "maver.app.pasadenagenerator.com",
          },
        }),
        { params: Promise.resolve({ slug: undefined }) },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown runtime error";
      assert.fail(`public route threw unexpectedly: ${message}`);
      return;
    }

    assert.equal(publicResponse.status, 200);
    const contentType = publicResponse.headers.get("content-type") ?? "";
    assert.match(contentType, /text\/html/i);
    const html = await publicResponse.text();
    assert.match(html, /data-gnr8-render-mode="publish"/);
    assert.match(html, /data-gnr8-legacy-summary="visible-v2"/);
    assert.match(html, /data-gnr8-section-props/);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousPrefix === undefined) delete process.env.GNR8_RUNTIME_TEST_SITE_ID_PREFIX;
    else process.env.GNR8_RUNTIME_TEST_SITE_ID_PREFIX = previousPrefix;
    await cleanRuntimeSite(siteId);
  }
});
