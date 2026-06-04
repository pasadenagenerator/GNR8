import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { rollbackToSiteVersionArtifact } from "@/gnr8/runtime/rollback-switch";
import {
  bindArtifactToVersion,
  createArtifact,
  ensureRuntimeTables,
  getActivePointerForSite,
  persistRawImportedSiteArtifact,
  resolveActiveArtifactForHostAndPathWithDiagnostics,
  resolveRawTemplateSiteForDomainAndPath,
  switchActivePointer,
  upsertDomainHostBinding,
} from "@/gnr8/runtime/runtime-store";
import { getSuperadminPool } from "@/src/superadmin/db";

const TEST_SITE_PREFIX = "test_active_serving_resolver";

function assertTestSiteId(siteId: string): void {
  assert.match(siteId, /^test_active_serving_resolver_[a-z0-9_]+$/);
}

async function cleanRuntimeSite(siteId: string): Promise<void> {
  assertTestSiteId(siteId);
  await getSuperadminPool().query(`delete from public.gnr8_runtime_sites where id = $1::text`, [siteId]);
}

async function seedSiteVersion(input: {
  siteId: string;
  siteVersionId: string;
  versionNo: number;
  state: "PUBLISHED" | "ARCHIVED";
}): Promise<void> {
  await getSuperadminPool().query(
    `
    insert into public.gnr8_runtime_site_versions (
      id,
      site_id,
      version_no,
      state,
      source,
      actor,
      renderer_compatibility_version
    )
    values ($1::uuid, $2::text, $3::int, $4::text, 'migration', 'test:active-serving', 'gnr8-renderer-v1')
    `,
    [input.siteVersionId, input.siteId, input.versionNo, input.state],
  );
}

async function seedVersionArtifacts(input: {
  siteId: string;
  siteVersionId: string;
  label: string;
}): Promise<{ artifactId: string }> {
  const artifact = await createArtifact({
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    bundleSha256: `sha_${input.label}`,
    htmlByPath: { "/": `<html><body>artifact:${input.label}</body></html>` },
    compiledTokenStyles: "",
    assetFingerprintMap: {},
    manifest: { label: input.label },
    publishStage: "production",
    shadowRestricted: false,
    artifactGovernance: {
      pageGateState: [],
      pageRolloutPolicyState: [],
      pageEnforcementState: { shadow: [], canary: [], production: [] },
      siteGateState: "passed",
      siteRolloutPolicyState: "production_ready",
      siteEnforcementState: { shadow: "passed", canary: "passed", production: "passed" },
      publishStage: "production",
    },
  });
  await bindArtifactToVersion({
    siteVersionId: input.siteVersionId,
    artifactId: artifact.artifactId,
    rendererCompatibilityVersion: "gnr8-renderer-v1",
  });
  await persistRawImportedSiteArtifact({
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    entryHtmlPath: "index.html",
    assetBasePath: ".",
    fileRows: [
      {
        path: "index.html",
        mediaType: "text/html; charset=utf-8",
        sizeBytes: Buffer.byteLength(`<html><body>raw:${input.label}</body></html>`),
        sha256: `raw_sha_${input.label}`,
        bytes: Buffer.from(`<html><body>raw:${input.label}</body></html>`, "utf8"),
      },
    ],
    metadata: {
      sourceUrl: `https://${input.label}.example.test/`,
      finalUrl: `https://${input.label}.example.test/`,
      htmlByteLength: Buffer.byteLength(`<html><body>raw:${input.label}</body></html>`),
      diagnostics: { codes: [] },
      assetSummary: { persistedAssetCount: 0, externalFallbackAssetCount: 0 },
    },
  });
  return artifact;
}

test("active serving resolver keeps internal and custom domains on the site active pointer", async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip("DATABASE_URL is required for runtime-store active serving integration coverage");
    return;
  }

  const runId = randomUUID().replaceAll("-", "_").slice(0, 16);
  const siteId = `${TEST_SITE_PREFIX}_${runId}`;
  const sourceHost = `${siteId}.source.example.test`;
  const internalHost = `${siteId}.app.pasadenagenerator.com`;
  const customDomain = `${siteId}.custom.example.test`;
  const v1 = randomUUID();
  const v2 = randomUUID();

  assertTestSiteId(siteId);
  await ensureRuntimeTables();
  await cleanRuntimeSite(siteId);

  try {
    await getSuperadminPool().query(
      `
      insert into public.gnr8_runtime_sites (id, source_url, source_host)
      values ($1::text, $2::text, $3::text)
      `,
      [siteId, `https://${sourceHost}/`, sourceHost],
    );
    await getSuperadminPool().query(
      `
      insert into public.gnr8_runtime_host_bindings (site_id, host, status, binding_kind)
      values ($1::text, $2::text, 'ACTIVE', 'canonical')
      `,
      [siteId, internalHost],
    );
    await seedSiteVersion({ siteId, siteVersionId: v1, versionNo: 1, state: "ARCHIVED" });
    await seedSiteVersion({ siteId, siteVersionId: v2, versionNo: 2, state: "PUBLISHED" });
    const artifactV1 = await seedVersionArtifacts({ siteId, siteVersionId: v1, label: "v1" });
    const artifactV2 = await seedVersionArtifacts({ siteId, siteVersionId: v2, label: "v2" });

    await switchActivePointer({ siteId, siteVersionId: v2, artifactId: artifactV2.artifactId });
    await upsertDomainHostBinding({
      siteId,
      siteVersionId: v2,
      domain: customDomain,
      status: "active",
      domainType: "subdomain",
      dnsRecordType: "cname",
      dnsRecordHost: customDomain,
      dnsRecordValue: "cname.vercel-dns.com",
      dnsRecordPurpose: "routing",
    });

    const customBeforeRollback = await resolveRawTemplateSiteForDomainAndPath({ host: customDomain, path: "/" });
    assert.equal(customBeforeRollback.outcome, "raw_template_hit");
    assert.equal(customBeforeRollback.siteVersionId, v2);
    assert.match(customBeforeRollback.outcome === "raw_template_hit" ? customBeforeRollback.html : "", /raw:v2/);
    assert.deepEqual(customBeforeRollback.diagnostics, []);

    const rollback = await rollbackToSiteVersionArtifact({ siteVersionId: v1 });
    assert.equal(rollback.siteVersionId, v1);
    assert.equal((await getActivePointerForSite(siteId))?.siteVersionId, v1);

    const customAfterRollback = await resolveRawTemplateSiteForDomainAndPath({ host: customDomain, path: "/" });
    assert.equal(customAfterRollback.outcome, "raw_template_hit");
    assert.equal(customAfterRollback.siteVersionId, v1);
    assert.match(customAfterRollback.outcome === "raw_template_hit" ? customAfterRollback.html : "", /raw:v1/);
    assert.deepEqual(customAfterRollback.diagnostics, [
      {
        code: "CUSTOM_DOMAIN_VERSION_DIVERGENCE_DETECTED",
        domain: customDomain,
        legacyDomainSiteVersionId: v2,
        activePointerSiteVersionId: v1,
      },
    ]);

    const internalArtifactAfterRollback = await resolveActiveArtifactForHostAndPathWithDiagnostics({
      host: internalHost,
      path: "/",
    });
    const customArtifactAfterRollback = await resolveActiveArtifactForHostAndPathWithDiagnostics({
      host: customDomain,
      path: "/",
    });
    assert.equal(internalArtifactAfterRollback.outcome, "artifact_hit");
    assert.equal(customArtifactAfterRollback.outcome, "artifact_hit");
    assert.equal(internalArtifactAfterRollback.activeSiteVersionId, v1);
    assert.equal(customArtifactAfterRollback.activeSiteVersionId, v1);
    assert.equal(customArtifactAfterRollback.legacyDomainSiteVersionId, v2);

    await switchActivePointer({ siteId, siteVersionId: v2, artifactId: artifactV2.artifactId });
    const customAfterPublish = await resolveRawTemplateSiteForDomainAndPath({ host: customDomain, path: "/" });
    assert.equal(customAfterPublish.outcome, "raw_template_hit");
    assert.equal(customAfterPublish.siteVersionId, v2);
    assert.match(customAfterPublish.outcome === "raw_template_hit" ? customAfterPublish.html : "", /raw:v2/);
    assert.deepEqual(customAfterPublish.diagnostics, []);

    await switchActivePointer({ siteId, siteVersionId: v1, artifactId: artifactV1.artifactId });
    await upsertDomainHostBinding({ siteId, siteVersionId: v2, domain: customDomain, status: "active" });
    const customAfterBindingActivationFailureShape = await resolveRawTemplateSiteForDomainAndPath({
      host: customDomain,
      path: "/",
    });
    assert.equal(customAfterBindingActivationFailureShape.outcome, "raw_template_hit");
    assert.equal(customAfterBindingActivationFailureShape.siteVersionId, v1);
  } finally {
    await cleanRuntimeSite(siteId);
  }
});
