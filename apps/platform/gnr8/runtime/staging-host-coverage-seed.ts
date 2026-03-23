import assert from "node:assert/strict";

import { POST as migrateUrlRoute } from "@/app/api/gnr8/runtime/migrate/url/route";
import { POST as readyRoute } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/ready/route";
import { POST as approveRoute } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/approve/route";
import { POST as publishRoute } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route";
import type { HostCoverageReport } from "@/gnr8/runtime/artifact-coverage-audit";
import { runArtifactCoverageAudit } from "@/gnr8/runtime/artifact-coverage-audit";
import {
  bindHostToSite,
  getActivePointerForSite,
  getArtifactById,
  getSiteVersion,
  resolveActiveArtifactForHostAndPathWithDiagnostics,
} from "@/gnr8/runtime/runtime-store";

type SourceType = "deterministic_html";
type HostClassification = "ARTIFACT_ONLY_READY" | "READY_WITH_CAVEATS" | "NOT_READY";

type SeedTarget = {
  host: string;
  pathScope: string;
  sourceType: SourceType;
  sourceInput: string;
  purpose: string;
  title: string;
  html: string;
};

type SeededHostResult = {
  hostname: string;
  sourceType: SourceType;
  purpose: string;
  sourceUrl: string;
  siteId: string;
  siteVersionId: string;
  artifactId: string;
  activePointerPresent: boolean;
  rootPathCovered: boolean;
  artifactResolvesViaRuntime: boolean;
  artifactOnlyReady: boolean;
  fallbackRiskLevel: "low" | "medium" | "high";
  missingPathSummary: string[];
  reasonCodes: string[];
  classification: HostClassification;
};

type CoverageSeedPortfolioReport = {
  generatedAt: string;
  seedTargets: Array<{
    hostname: string;
    sourceType: SourceType;
    sourceInput: string;
    sourceUrl: string;
    purpose: string;
  }>;
  beforeAudit: {
    totalHosts: number;
    targetHostsAlreadyPresent: string[];
  };
  implementation: {
    seedingFlow: string[];
    routeServiceFlow: string;
    sharedRunnerAdded: boolean;
    blockersEncountered: string[];
  };
  hosts: SeededHostResult[];
  auditRerunSummary: {
    totalHosts: number;
    readyHosts: number;
    readyWithCaveatsHosts: number;
    notReadyHosts: number;
    commonBlockerPatterns: Array<{ reasonCode: string; count: number }>;
    rawTotals: {
      artifactOnlyReadyHosts: number;
      hostsWithFallbackResolution: number;
      hostsWithMissingRootPath: number;
      hostsWithMissingKnownPaths: number;
      hostsWithNoActivePointer: number;
    };
  };
  finalClassification: Array<{
    hostname: string;
    classification: HostClassification;
  }>;
  recommendedNextStep:
    | "production canary candidate selection"
    | "one more staging hardening pass"
    | "artifact-only expansion in staging"
    | "targeted runtime blocker fix";
};

async function assertOkResponse(response: Response, action: string, host: string): Promise<void> {
  if (response.ok) return;
  const body = await response.text().catch(() => "");
  throw new Error(
    `${action} should return 2xx for host=${host}; status=${response.status}; body=${body || "<empty>"}`,
  );
}

function buildSeedTargets(): SeedTarget[] {
  return [
    {
      host: "runtime-brochure-v1.staging.gnr8.test",
      pathScope: "/",
      sourceType: "deterministic_html",
      sourceInput: "brochure_text_first_v1",
      purpose: "Simple brochure/text-first host to validate baseline artifact lifecycle.",
      title: "Runtime Brochure Seed",
      html: [
        "<!doctype html>",
        '<html lang="en"><head><meta charset="utf-8"><title>GNR8 Brochure Seed</title></head>',
        "<body>",
        '<header><nav><a href="/">Precision Landscaping</a><a href="/services">Services</a><a href="/contact">Contact</a></nav></header>',
        "<section><h1>Precision Landscaping</h1><p>Local experts for modern outdoor spaces and durable garden systems.</p></section>",
        "<section><h3>Design</h3><p>Concept and planning for residential outdoor projects.</p><h3>Build</h3><p>Material selection, install, and final quality pass with clear milestones.</p></section>",
        '<footer><p>Copyright 2026 Precision Landscaping.</p><a href="/privacy">Privacy</a> <a href="/terms">Terms</a></footer>',
        "</body></html>",
      ].join(""),
    },
    {
      host: "runtime-gallery-v1.staging.gnr8.test",
      pathScope: "/",
      sourceType: "deterministic_html",
      sourceInput: "image_gallery_heavy_v1",
      purpose: "Image/gallery-heavy host to verify artifact output under media-rich HTML.",
      title: "Runtime Gallery Seed",
      html: [
        "<!doctype html>",
        '<html lang="en"><head><meta charset="utf-8"><title>GNR8 Gallery Seed</title></head>',
        "<body>",
        "<section><h1>Portfolio Gallery</h1><p>Media-rich snapshot of recent studio projects.</p></section>",
        '<section><img src="/images/project-a.jpg" alt="Project A"><img src="/images/project-b.jpg" alt="Project B"><img src="/images/project-c.jpg" alt="Project C"><img src="/images/project-d.jpg" alt="Project D"><img src="/images/project-e.jpg" alt="Project E"></section>',
        '<section><h2>Book a walkthrough</h2><p>Get a guided review of the featured project set.</p><a href="/contact">Contact us</a></section>',
        "</body></html>",
      ].join(""),
    },
    {
      host: "runtime-forms-v1.staging.gnr8.test",
      pathScope: "/",
      sourceType: "deterministic_html",
      sourceInput: "form_heavy_v1",
      purpose: "Form-heavy host to validate runtime readiness for structured input-centric pages.",
      title: "Runtime Forms Seed",
      html: [
        "<!doctype html>",
        '<html lang="en"><head><meta charset="utf-8"><title>GNR8 Forms Seed</title></head>',
        "<body>",
        "<main>",
        "<h1>Event Registration</h1>",
        '<form method="post" action="/submit">',
        '<label>Full name <input type="text" name="full_name" required></label>',
        '<label>Email <input type="email" name="email" required></label>',
        '<label>Team size <input type="number" name="team_size" min="1" max="20"></label>',
        '<label>Track <select name="track"><option>Builder</option><option>Operator</option><option>Runtime</option></select></label>',
        '<label>Notes <textarea name="notes" rows="4"></textarea></label>',
        '<button type="submit">Register</button>',
        "</form>",
        "</main>",
        "</body></html>",
      ].join(""),
    },
    {
      host: "runtime-content-dense-v1.staging.gnr8.test",
      pathScope: "/",
      sourceType: "deterministic_html",
      sourceInput: "content_dense_sections_v1",
      purpose: "Content-dense section-heavy host to pressure multi-section rendering fidelity.",
      title: "Runtime Content Dense Seed",
      html: [
        "<!doctype html>",
        '<html lang="en"><head><meta charset="utf-8"><title>GNR8 Content Dense Seed</title></head>',
        "<body>",
        '<section><h1>Annual Research Brief</h1><p>Section-dense research synthesis for operator decision simulation.</p></section>',
        '<section><h2>FAQ</h2><details><summary>What changed this quarter?</summary><p>Demand quality improved while execution variance narrowed in two core segments.</p></details><details><summary>What remains unstable?</summary><p>Cross-team publication latency and release sequencing remain the highest risk factors.</p></details><details><summary>What is the immediate action?</summary><p>Expand validated artifact-only hosts in staging and gate production canary to low-risk shapes.</p></details></section>',
        '<section><h2>Choose a plan</h2><h3>Starter</h3><p>$49 per month for baseline telemetry and reports.</p><h3>Scale</h3><p>$129 per month for multi-host rollout governance.</p><h3>Enterprise</h3><p>$399 per month with custom approvals and release controls.</p></section>',
        "</body></html>",
      ].join(""),
    },
    {
      host: "seed-runtime-coverage.staging.gnr8.test",
      pathScope: "/",
      sourceType: "deterministic_html",
      sourceInput: "existing_baseline_seed_v2",
      purpose: "Existing successful seed host preserved as baseline continuity check.",
      title: "Runtime Baseline Seed",
      html: [
        "<!doctype html>",
        '<html lang="en"><head><meta charset="utf-8"><title>GNR8 Baseline Seed</title></head>',
        "<body>",
        "<main><section><h1>GNR8 Staging Runtime Coverage Seed</h1><p>Baseline continuity host.</p></section></main>",
        "</body></html>",
      ].join(""),
    },
  ];
}

function classifyHost(input: {
  audit: HostCoverageReport;
  artifactResolvesViaRuntime: boolean;
}): HostClassification {
  if (input.audit.artifactOnlyReady) return "ARTIFACT_ONLY_READY";

  const hasCoreRuntime =
    input.audit.activePointerExists && input.audit.activeArtifactExists && input.audit.rootPathCovered && input.artifactResolvesViaRuntime;

  if (hasCoreRuntime) return "READY_WITH_CAVEATS";
  return "NOT_READY";
}

async function executeLifecycle(target: SeedTarget): Promise<{
  siteId: string;
  siteVersionId: string;
  artifactId: string;
}> {
  const sourceUrl = `https://${target.host}/`;

  const migrateRes = await migrateUrlRoute(
    new Request("http://localhost/api/gnr8/runtime/migrate/url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: sourceUrl,
        slug: target.pathScope,
        actor: `staging:coverage-seed:migrate:${target.host}`,
        title: target.title,
      }),
    }),
  );
  await assertOkResponse(migrateRes, "migrate", target.host);
  const migrate = (await migrateRes.json()) as {
    siteId: string;
    siteVersionId: string;
    lifecycleState: string;
  };
  assert.equal(migrate.lifecycleState, "DRAFT", `expected DRAFT after migrate for host=${target.host}`);

  const readyRes = await readyRoute(
    new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actor: `staging:coverage-seed:ready:${target.host}` }),
    }),
    { params: Promise.resolve({ siteVersionId: migrate.siteVersionId }) },
  );
  await assertOkResponse(readyRes, "ready", target.host);

  const approveRes = await approveRoute(
    new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actor: `staging:coverage-seed:approve:${target.host}` }),
    }),
    { params: Promise.resolve({ siteVersionId: migrate.siteVersionId }) },
  );
  await assertOkResponse(approveRes, "approve", target.host);

  const publishRes = await publishRoute(
    new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actor: `staging:coverage-seed:publish:${target.host}` }),
    }),
    { params: Promise.resolve({ siteVersionId: migrate.siteVersionId }) },
  );
  await assertOkResponse(publishRes, "publish", target.host);
  const publish = (await publishRes.json()) as {
    siteId: string;
    siteVersionId: string;
    artifactId: string;
  };

  await bindHostToSite({
    siteId: publish.siteId,
    host: target.host,
    status: "ACTIVE",
    bindingKind: "shadow",
  });

  const seededVersion = await getSiteVersion(migrate.siteVersionId);
  assert.ok(seededVersion, `site version must exist for host=${target.host}`);
  assert.equal(seededVersion!.state, "PUBLISHED", `site version must be PUBLISHED for host=${target.host}`);

  return {
    siteId: publish.siteId,
    siteVersionId: publish.siteVersionId,
    artifactId: publish.artifactId,
  };
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required (load staging env before running this seed).");
  }

  const targets = buildSeedTargets();
  const targetHostSet = new Set(targets.map((t) => t.host));

  const beforeAudit = await runArtifactCoverageAudit();
  const targetHostsAlreadyPresent = beforeAudit.hosts.filter((host) => targetHostSet.has(host.host)).map((host) => host.host);

  const sourceHtmlByUrl = new Map<string, string>(targets.map((t) => [`https://${t.host}/`, t.html]));

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const deterministicHtml = sourceHtmlByUrl.get(url);
    if (deterministicHtml) {
      return new Response(deterministicHtml, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return originalFetch(input as never, init);
  }) as typeof fetch;

  const blockersEncountered: string[] = [];
  const hostResults: SeededHostResult[] = [];

  try {
    for (const target of targets) {
      const sourceUrl = `https://${target.host}/`;
      try {
        const lifecycle = await executeLifecycle(target);

        const activePointer = await getActivePointerForSite(lifecycle.siteId);
        const artifact = activePointer ? await getArtifactById(activePointer.artifactId) : null;
        const runtimeResolution = await resolveActiveArtifactForHostAndPathWithDiagnostics({ host: target.host, path: "/" });
        const hostAuditReport = await runArtifactCoverageAudit({ host: target.host });
        const hostAudit = hostAuditReport.hosts[0];
        assert.ok(hostAudit, `coverage audit must include host=${target.host}`);

        const artifactResolvesViaRuntime = runtimeResolution.outcome === "artifact_hit";
        const classification = classifyHost({
          audit: hostAudit!,
          artifactResolvesViaRuntime,
        });

        hostResults.push({
          hostname: target.host,
          sourceType: target.sourceType,
          purpose: target.purpose,
          sourceUrl,
          siteId: lifecycle.siteId,
          siteVersionId: lifecycle.siteVersionId,
          artifactId: lifecycle.artifactId,
          activePointerPresent: !!activePointer,
          rootPathCovered: !!artifact?.htmlByPath?.["/"],
          artifactResolvesViaRuntime,
          artifactOnlyReady: hostAudit!.artifactOnlyReady,
          fallbackRiskLevel: hostAudit!.fallbackDependenceRisk,
          missingPathSummary: hostAudit!.artifactOnlyWouldFailPaths,
          reasonCodes: hostAudit!.reasonCodes,
          classification,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : `Unknown error while seeding host=${target.host}`;
        blockersEncountered.push(`host=${target.host}: ${message}`);
      }
    }

    const auditAfter = await runArtifactCoverageAudit();

    const classifyAuditHost = (host: HostCoverageReport): HostClassification => {
      if (host.artifactOnlyReady) return "ARTIFACT_ONLY_READY";
      const likelyReadyWithCaveats = host.activePointerExists && host.activeArtifactExists && host.rootPathCovered;
      if (likelyReadyWithCaveats) return "READY_WITH_CAVEATS";
      return "NOT_READY";
    };

    const fullAuditClassifications = auditAfter.hosts.map((host) => ({
      host: host.host,
      classification: classifyAuditHost(host),
    }));

    const blockerCounts = new Map<string, number>();
    for (const host of auditAfter.hosts) {
      for (const reasonCode of host.reasonCodes) {
        blockerCounts.set(reasonCode, (blockerCounts.get(reasonCode) ?? 0) + 1);
      }
    }

    const commonBlockerPatterns = [...blockerCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([reasonCode, count]) => ({ reasonCode, count }));

    const recommendedNextStep: CoverageSeedPortfolioReport["recommendedNextStep"] =
      hostResults.length >= 3 && hostResults.every((host) => host.classification === "ARTIFACT_ONLY_READY")
        ? "production canary candidate selection"
        : commonBlockerPatterns.some((b) => b.reasonCode === "no_active_pointer" || b.reasonCode === "active_artifact_missing")
          ? "targeted runtime blocker fix"
          : commonBlockerPatterns.length > 0
            ? "one more staging hardening pass"
            : "artifact-only expansion in staging";

    const report: CoverageSeedPortfolioReport = {
      generatedAt: new Date().toISOString(),
      seedTargets: targets.map((target) => ({
        hostname: target.host,
        sourceType: target.sourceType,
        sourceInput: target.sourceInput,
        sourceUrl: `https://${target.host}/`,
        purpose: target.purpose,
      })),
      beforeAudit: {
        totalHosts: beforeAudit.totals.hosts,
        targetHostsAlreadyPresent,
      },
      implementation: {
        seedingFlow: ["migrate/url", "ready", "approve", "publish", "host binding", "active pointer", "artifact resolution"],
        routeServiceFlow:
          "app/api/gnr8/runtime/migrate/url -> runtime migration-factory -> version lifecycle routes (ready/approve/publish) -> runtime-store host binding + active pointer/artifact resolution",
        sharedRunnerAdded: true,
        blockersEncountered,
      },
      hosts: hostResults,
      auditRerunSummary: {
        totalHosts: auditAfter.totals.hosts,
        readyHosts: fullAuditClassifications.filter((h) => h.classification === "ARTIFACT_ONLY_READY").length,
        readyWithCaveatsHosts: fullAuditClassifications.filter((h) => h.classification === "READY_WITH_CAVEATS").length,
        notReadyHosts: fullAuditClassifications.filter((h) => h.classification === "NOT_READY").length,
        commonBlockerPatterns,
        rawTotals: {
          artifactOnlyReadyHosts: auditAfter.totals.artifactOnlyReadyHosts,
          hostsWithFallbackResolution: auditAfter.totals.hostsWithFallbackResolution,
          hostsWithMissingRootPath: auditAfter.totals.hostsWithMissingRootPath,
          hostsWithMissingKnownPaths: auditAfter.totals.hostsWithMissingKnownPaths,
          hostsWithNoActivePointer: auditAfter.totals.hostsWithNoActivePointer,
        },
      },
      finalClassification: hostResults.map((host) => ({
        hostname: host.hostname,
        classification: host.classification,
      })),
      recommendedNextStep,
    };

    console.log(`[gnr8.runtime.staging-multi-host-seed] ${JSON.stringify(report)}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`[gnr8.runtime.staging-multi-host-seed.error] ${message}`);
  process.exitCode = 1;
});
