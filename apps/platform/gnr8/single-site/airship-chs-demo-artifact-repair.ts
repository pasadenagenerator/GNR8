import "server-only";

import { createHash } from "node:crypto";

import { getSuperadminPool } from "../../src/superadmin/db";

export const AIRSHIP_CHS_DEMO_REPAIR_SERVICE_VERSION = "airship-mvp-recovery-10-chs-demo-artifact-repair:v1" as const;
export const AIRSHIP_CHS_DEMO_RUNTIME_SITE_ID = "site_57d9665a3a5867edf6ef" as const;
export const AIRSHIP_CHS_DEMO_SITE_VERSION_ID = "92e476b9-67fc-408a-be3d-5c744aa0f3f6" as const;
export const AIRSHIP_CHS_DEMO_ARTIFACT_ID = "5ac3716a-f29d-4648-bc86-a6942638ed53" as const;

const FORBIDDEN_PUBLIC_RENDER_PATTERNS = [
  /FALLBACK PREVIEW/i,
  /Fallback Preview/i,
  /raw-block/i,
  /CAPTURE_DRIVEN/i,
  /Diagnostics:/i,
] as const;

type QueryResult<T> = { rows: T[]; rowCount: number | null };
type Queryable = {
  query<T = unknown>(sql: string, values?: unknown[]): Promise<QueryResult<T>>;
};
type PoolLike = Queryable & {
  connect(): Promise<Queryable & { release(): void }>;
};

export type AirshipChsDemoPointerSnapshot = {
  siteId: string;
  siteVersionId: string;
  artifactId: string;
};

export type AirshipChsDemoArtifactSnapshot = {
  id: string;
  siteId: string;
  siteVersionId: string;
  bundleSha256: string;
  htmlByPath: Record<string, string>;
  manifest: Record<string, unknown>;
  publishStage: string;
  shadowRestricted: boolean;
};

export type AirshipChsDemoArtifactRepairPlan = {
  serviceVersion: typeof AIRSHIP_CHS_DEMO_REPAIR_SERVICE_VERSION;
  runtimeSiteId: typeof AIRSHIP_CHS_DEMO_RUNTIME_SITE_ID;
  siteVersionId: typeof AIRSHIP_CHS_DEMO_SITE_VERSION_ID;
  artifactId: typeof AIRSHIP_CHS_DEMO_ARTIFACT_ID;
  previousBundleSha256: string;
  repairedBundleSha256: string;
  htmlByPath: Record<string, string>;
  manifest: Record<string, unknown>;
  publicRenderChecks: ReturnType<typeof inspectAirshipChsDemoHtml>;
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function assertExpectedPointer(pointer: AirshipChsDemoPointerSnapshot | null): asserts pointer is AirshipChsDemoPointerSnapshot {
  if (!pointer) throw new Error("airship_chs_demo_active_pointer_missing");
  if (pointer.siteId !== AIRSHIP_CHS_DEMO_RUNTIME_SITE_ID) throw new Error("airship_chs_demo_active_pointer_site_mismatch");
  if (pointer.siteVersionId !== AIRSHIP_CHS_DEMO_SITE_VERSION_ID) throw new Error("airship_chs_demo_active_pointer_version_mismatch");
  if (pointer.artifactId !== AIRSHIP_CHS_DEMO_ARTIFACT_ID) throw new Error("airship_chs_demo_active_pointer_artifact_mismatch");
}

function assertExpectedArtifact(artifact: AirshipChsDemoArtifactSnapshot | null): asserts artifact is AirshipChsDemoArtifactSnapshot {
  if (!artifact) throw new Error("airship_chs_demo_artifact_missing");
  if (artifact.id !== AIRSHIP_CHS_DEMO_ARTIFACT_ID) throw new Error("airship_chs_demo_artifact_id_mismatch");
  if (artifact.siteId !== AIRSHIP_CHS_DEMO_RUNTIME_SITE_ID) throw new Error("airship_chs_demo_artifact_site_mismatch");
  if (artifact.siteVersionId !== AIRSHIP_CHS_DEMO_SITE_VERSION_ID) throw new Error("airship_chs_demo_artifact_version_mismatch");
  if (artifact.publishStage !== "shadow") throw new Error("airship_chs_demo_artifact_stage_mismatch");
  if (artifact.shadowRestricted !== false) throw new Error("airship_chs_demo_artifact_shadow_restricted_mismatch");
}

export function inspectAirshipChsDemoHtml(html: string) {
  return {
    hasFallbackPreview: /FALLBACK PREVIEW|Fallback Preview/i.test(html),
    hasRawBlock: /raw-block/i.test(html),
    hasCaptureDriven: /CAPTURE_DRIVEN/i.test(html),
    hasDiagnosticsLabel: /Diagnostics:/i.test(html),
    hasHeader: /<header\b/i.test(html) && /CHS/i.test(html),
    hasHero: /data-section="hero"/i.test(html),
    hasAirshipHeroMarker: /data-airship-section="hero"/i.test(html),
    hasAirshipOffersMarker: /data-airship-section="offers"/i.test(html),
    hasAirshipProofMarker: /data-airship-section="proof"/i.test(html),
    hasAirshipApproachMarker: /data-airship-section="approach"/i.test(html),
    hasAirshipCtaMarker: /data-airship-section="cta"/i.test(html),
    hasAirshipFooterMarker: /data-airship-section="footer"/i.test(html),
    hasIdentitySection: /data-section="identity"/i.test(html),
    hasProofSection: /data-section="proof"/i.test(html),
    hasContactSection: /data-section="contact"/i.test(html),
    hasDraftCopy: html.includes("The CHS team helps your IT change with every technology wave."),
  };
}

export function assertCleanAirshipChsDemoHtml(html: string): void {
  for (const pattern of FORBIDDEN_PUBLIC_RENDER_PATTERNS) {
    if (pattern.test(html)) throw new Error(`airship_chs_demo_forbidden_public_text:${pattern.source}`);
  }
  const checks = inspectAirshipChsDemoHtml(html);
  if (!checks.hasHeader) throw new Error("airship_chs_demo_header_missing");
  if (!checks.hasHero) throw new Error("airship_chs_demo_hero_missing");
  if (!checks.hasAirshipHeroMarker) throw new Error("airship_chs_demo_airship_hero_marker_missing");
  if (!checks.hasAirshipOffersMarker) throw new Error("airship_chs_demo_airship_offers_marker_missing");
  if (!checks.hasAirshipProofMarker) throw new Error("airship_chs_demo_airship_proof_marker_missing");
  if (!checks.hasAirshipApproachMarker) throw new Error("airship_chs_demo_airship_approach_marker_missing");
  if (!checks.hasAirshipCtaMarker) throw new Error("airship_chs_demo_airship_cta_marker_missing");
  if (!checks.hasAirshipFooterMarker) throw new Error("airship_chs_demo_airship_footer_marker_missing");
  if (!checks.hasIdentitySection) throw new Error("airship_chs_demo_identity_section_missing");
  if (!checks.hasProofSection) throw new Error("airship_chs_demo_proof_section_missing");
  if (!checks.hasContactSection) throw new Error("airship_chs_demo_contact_section_missing");
  if (!checks.hasDraftCopy) throw new Error("airship_chs_demo_draft_copy_missing");
}

export function buildAirshipChsMvpDemoHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" data-gnr8-render-mode="preview" />
  <title>CHS | IT change partner</title>
  <style>
    :root {
      --chs-blue: #123f73;
      --chs-blue-deep: #09284d;
      --chs-blue-soft: #eaf3fb;
      --chs-orange: #ed7635;
      --chs-orange-soft: #fff1e8;
      --chs-ink: #132033;
      --chs-muted: #5c6a7a;
      --chs-line: #d9e4ee;
      --chs-bg: #ffffff;
      --chs-surface: #f7fafc;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--chs-bg);
      color: var(--chs-ink);
      font-family: Inter, Roboto, Arial, sans-serif;
      line-height: 1.55;
    }
    a { color: inherit; }
    .shell { width: min(1120px, calc(100% - 40px)); margin: 0 auto; }
    .site-header {
      position: sticky;
      top: 0;
      z-index: 10;
      background: rgba(255, 255, 255, 0.94);
      border-bottom: 1px solid var(--chs-line);
      backdrop-filter: blur(12px);
    }
    .nav {
      min-height: 74px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }
    .brand { display: inline-flex; align-items: center; gap: 12px; text-decoration: none; font-weight: 800; }
    .brand-mark {
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      border-radius: 8px;
      background: var(--chs-blue);
      color: #fff;
      letter-spacing: 0.04em;
    }
    .brand-copy { display: grid; line-height: 1.1; }
    .brand-copy small { color: var(--chs-muted); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    .nav-links { display: flex; align-items: center; gap: 22px; color: var(--chs-blue-deep); font-weight: 700; }
    .nav-links a { text-decoration: none; }
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 18px;
      border-radius: 6px;
      border: 1px solid var(--chs-orange);
      background: var(--chs-orange);
      color: #fff;
      font-weight: 800;
      text-decoration: none;
      box-shadow: 0 14px 28px rgba(237, 118, 53, 0.18);
    }
    .button.secondary {
      background: #fff;
      color: var(--chs-blue);
      border-color: var(--chs-line);
      box-shadow: none;
    }
    .hero {
      background:
        linear-gradient(120deg, rgba(18, 63, 115, 0.94), rgba(9, 40, 77, 0.90)),
        radial-gradient(circle at 82% 20%, rgba(237, 118, 53, 0.26), transparent 36%);
      color: #fff;
      padding: 92px 0 74px;
    }
    .hero-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr); gap: 48px; align-items: center; }
    .eyebrow { margin: 0 0 14px; color: #ffd7bf; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
    h1 { margin: 0; max-width: 780px; font-size: clamp(42px, 6vw, 78px); line-height: 0.96; letter-spacing: 0; }
    .hero p { margin: 22px 0 0; max-width: 720px; color: #eaf3fb; font-size: 20px; }
    .hero-actions { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 30px; }
    .hero-panel {
      border: 1px solid rgba(255, 255, 255, 0.22);
      background: rgba(255, 255, 255, 0.10);
      border-radius: 8px;
      padding: 24px;
    }
    .hero-panel strong { display: block; color: #fff; font-size: 22px; }
    .hero-panel span { display: block; margin-top: 8px; color: #d7e7f6; }
    section { padding: 76px 0; }
    .section-kicker { margin: 0 0 10px; color: var(--chs-orange); font-weight: 800; letter-spacing: 0.10em; text-transform: uppercase; }
    h2 { margin: 0; color: var(--chs-blue-deep); font-size: clamp(30px, 4vw, 48px); line-height: 1.05; letter-spacing: 0; }
    .lead { margin: 18px 0 0; max-width: 760px; color: var(--chs-muted); font-size: 18px; }
    .identity-grid { display: grid; grid-template-columns: 0.95fr 1.05fr; gap: 46px; align-items: start; }
    .value-list { display: grid; gap: 14px; margin: 0; padding: 0; list-style: none; }
    .value-list li {
      border-left: 4px solid var(--chs-orange);
      background: var(--chs-surface);
      padding: 18px 20px;
    }
    .value-list strong { display: block; color: var(--chs-blue-deep); font-size: 18px; }
    .proof { background: var(--chs-blue-soft); }
    .proof-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin-top: 34px; }
    .proof-card {
      min-height: 210px;
      border: 1px solid var(--chs-line);
      border-radius: 8px;
      background: #fff;
      padding: 24px;
    }
    .proof-card b { color: var(--chs-orange); font-size: 34px; line-height: 1; }
    .proof-card h3 { margin: 18px 0 8px; color: var(--chs-blue-deep); font-size: 21px; }
    .proof-card p { margin: 0; color: var(--chs-muted); }
    .team-strip {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 26px;
      align-items: center;
      border-top: 1px solid var(--chs-line);
      border-bottom: 1px solid var(--chs-line);
      padding: 32px 0;
    }
    .team-strip p { margin: 0; color: var(--chs-muted); }
    .contact { background: var(--chs-blue-deep); color: #fff; }
    .contact h2 { color: #fff; }
    .contact .lead { color: #dbe9f6; }
    .contact-grid { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 44px; align-items: start; }
    .contact-card {
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.08);
      padding: 24px;
    }
    .contact-card dl { margin: 0; display: grid; gap: 14px; }
    .contact-card dt { color: #ffd7bf; font-weight: 800; }
    .contact-card dd { margin: 4px 0 0; color: #fff; }
    .form {
      display: grid;
      gap: 12px;
      border-radius: 8px;
      background: #fff;
      padding: 22px;
      color: var(--chs-ink);
    }
    .form label { display: grid; gap: 6px; color: var(--chs-blue-deep); font-weight: 800; }
    .form input, .form textarea {
      width: 100%;
      border: 1px solid var(--chs-line);
      border-radius: 6px;
      padding: 12px 14px;
      font: inherit;
    }
    .form textarea { min-height: 112px; resize: vertical; }
    footer { padding: 26px 0; color: var(--chs-muted); background: #fff; }
    @media (max-width: 820px) {
      .nav { align-items: flex-start; flex-direction: column; padding: 14px 0; }
      .nav-links { width: 100%; gap: 14px; flex-wrap: wrap; }
      .hero-grid, .identity-grid, .team-strip, .contact-grid { grid-template-columns: 1fr; }
      .proof-grid { grid-template-columns: 1fr; }
      .hero { padding: 68px 0 58px; }
      section { padding: 58px 0; }
    }
  </style>
</head>
<body>
  <header class="site-header">
    <div class="shell nav">
      <a class="brand" href="#top" aria-label="CHS home">
        <span class="brand-mark">CHS</span>
        <span class="brand-copy"><span>CHS</span><small>IT change partner</small></span>
      </a>
      <nav class="nav-links" aria-label="Main navigation">
        <a href="#identity">About</a>
        <a href="#proof">Approach</a>
        <a href="#contact">Contact</a>
        <a class="button secondary" href="https://www.chs.si/">Original site</a>
      </nav>
    </div>
  </header>
  <main id="top">
    <section class="hero" data-section="hero" data-airship-section="hero">
      <div class="shell hero-grid">
        <div>
          <p class="eyebrow">Computer Help Specialists</p>
          <h1 data-airship-element="hero-headline">The CHS team helps your IT change with every technology wave.</h1>
          <p>The people behind the technology matter more than the technology itself. We bring deep, lived expertise and the practical discipline to drive real change, so your organization can move forward with confidence.</p>
          <div class="hero-actions">
            <a class="button" href="#contact" data-airship-element="hero-cta">Contact Us</a>
            <a class="button secondary" href="#proof">See how CHS works</a>
          </div>
        </div>
        <aside class="hero-panel" aria-label="CHS promise">
          <strong>Strategy, implementation, and support in one experienced team.</strong>
          <span>From advisory conversations to hands-on delivery, CHS keeps business goals, people, and technology aligned.</span>
        </aside>
      </div>
    </section>
    <section id="identity" data-section="identity" data-airship-section="offers">
      <div class="shell identity-grid">
        <div>
          <p class="section-kicker">Who CHS helps</p>
          <h2>Technology change works when people can actually adopt it.</h2>
          <p class="lead">CHS brings calm senior guidance to complex IT moments: infrastructure modernization, service improvement, security-minded operations, and everyday support that keeps teams moving.</p>
        </div>
        <ul class="value-list">
          <li data-airship-element="offer-card" data-airship-element-index="0"><strong>Experienced guidance</strong> Clear decisions for organizations that need technology to serve the business, not distract from it.</li>
          <li data-airship-element="offer-card" data-airship-element-index="1"><strong>Practical execution</strong> Plans become working systems, documented handovers, and support rhythms that teams can trust.</li>
          <li data-airship-element="offer-card" data-airship-element-index="2"><strong>Human adoption</strong> CHS focuses on the people behind the technology, making change understandable and sustainable.</li>
        </ul>
      </div>
    </section>
    <section id="proof" class="proof" data-section="proof" data-airship-section="proof">
      <div class="shell">
        <p class="section-kicker">Approach</p>
        <h2>A focused partner for real IT progress.</h2>
        <p class="lead">This MVP demo keeps the imported CHS direction simple: a branded page with a clear promise, proof of expertise, and an immediate contact path.</p>
        <div class="proof-grid">
          <article class="proof-card" data-airship-element="proof-card" data-airship-element-index="0">
            <b>01</b>
            <h3>Assess</h3>
            <p>Understand the current environment, risks, people, and business priorities before proposing change.</p>
          </article>
          <article class="proof-card" data-airship-element="proof-card" data-airship-element-index="1">
            <b>02</b>
            <h3>Improve</h3>
            <p>Shape practical improvements across infrastructure, support, security, and digital workflows.</p>
          </article>
          <article class="proof-card" data-airship-element="proof-card" data-airship-element-index="2">
            <b>03</b>
            <h3>Support</h3>
            <p>Stay close after delivery with documentation, operational care, and clear next steps.</p>
          </article>
        </div>
      </div>
    </section>
    <section data-section="team" data-airship-section="approach">
      <div class="shell team-strip">
        <h2>CHS is built around trusted specialists, not generic technology promises.</h2>
        <p>For clients, that means direct conversations, visible accountability, and a team that knows how to translate technical change into business confidence.</p>
      </div>
    </section>
    <section id="contact" class="contact" data-section="contact" data-airship-section="cta">
      <div class="shell contact-grid">
        <div>
          <p class="section-kicker">Start a conversation</p>
          <h2>Tell CHS what needs to change.</h2>
          <p class="lead">Use this GNR8-controlled demo page to review the improved direction. The real external CHS site remains untouched.</p>
          <div class="contact-card" data-airship-element="contact-card">
            <dl>
              <div><dt>Website</dt><dd>www.chs.si</dd></div>
              <div><dt>Focus</dt><dd>IT consulting, implementation, support, and change enablement.</dd></div>
              <div><dt>Demo host</dt><dd>chs-airship.app.pasadenagenerator.com</dd></div>
            </dl>
          </div>
        </div>
        <form class="form" aria-label="Contact form">
          <label>Name<input name="name" autocomplete="name" /></label>
          <label>Email<input name="email" type="email" autocomplete="email" /></label>
          <label>How can CHS help?<textarea name="message"></textarea></label>
          <button class="button" type="button" data-airship-element="contact-cta">Send inquiry</button>
        </form>
      </div>
    </section>
  </main>
  <footer data-airship-section="footer">
    <div class="shell">CHS Airship MVP demo. GNR8 preview render for review.</div>
  </footer>
</body>
</html>`;
}

export function buildAirshipChsDemoArtifactRepairPlan(input: {
  activePointer: AirshipChsDemoPointerSnapshot | null;
  artifact: AirshipChsDemoArtifactSnapshot | null;
  actor: string;
  idempotencyKey: string;
}): AirshipChsDemoArtifactRepairPlan {
  assertExpectedPointer(input.activePointer);
  assertExpectedArtifact(input.artifact);

  const repairedHtml = buildAirshipChsMvpDemoHtml();
  assertCleanAirshipChsDemoHtml(repairedHtml);

  const htmlByPath = {
    ...input.artifact.htmlByPath,
    "/": repairedHtml,
  };
  const repairedBundleSha256 = sha256({
    serviceVersion: AIRSHIP_CHS_DEMO_REPAIR_SERVICE_VERSION,
    siteId: AIRSHIP_CHS_DEMO_RUNTIME_SITE_ID,
    siteVersionId: AIRSHIP_CHS_DEMO_SITE_VERSION_ID,
    artifactId: AIRSHIP_CHS_DEMO_ARTIFACT_ID,
    htmlByPath,
  });
  const manifest = {
    ...input.artifact.manifest,
    airshipMvpRecovery10RenderRepair: {
      serviceVersion: AIRSHIP_CHS_DEMO_REPAIR_SERVICE_VERSION,
      status: "mvp_recovery_chs_airship_demo_render_fixed",
      actor: input.actor,
      idempotencyKey: input.idempotencyKey,
      previousBundleSha256: input.artifact.bundleSha256,
      repairedBundleSha256,
      activePointerMutation: false,
      sourceCaptureRun: false,
      dryRunRun: false,
      shadowPublishRun: false,
      rollbackRun: false,
    },
  };

  return {
    serviceVersion: AIRSHIP_CHS_DEMO_REPAIR_SERVICE_VERSION,
    runtimeSiteId: AIRSHIP_CHS_DEMO_RUNTIME_SITE_ID,
    siteVersionId: AIRSHIP_CHS_DEMO_SITE_VERSION_ID,
    artifactId: AIRSHIP_CHS_DEMO_ARTIFACT_ID,
    previousBundleSha256: input.artifact.bundleSha256,
    repairedBundleSha256,
    htmlByPath,
    manifest,
    publicRenderChecks: inspectAirshipChsDemoHtml(repairedHtml),
  };
}

async function readActivePointer(client: Queryable): Promise<AirshipChsDemoPointerSnapshot | null> {
  const res = await client.query<{
    site_id: string;
    active_site_version_id: string;
    active_artifact_id: string;
  }>(
    `
    select
      site_id::text,
      active_site_version_id::text,
      active_artifact_id::text
    from public.gnr8_runtime_active_pointers
    where site_id = $1::text
    limit 1
    `,
    [AIRSHIP_CHS_DEMO_RUNTIME_SITE_ID],
  );
  const row = res.rows[0];
  return row ? { siteId: row.site_id, siteVersionId: row.active_site_version_id, artifactId: row.active_artifact_id } : null;
}

async function readArtifact(client: Queryable): Promise<AirshipChsDemoArtifactSnapshot | null> {
  const res = await client.query<{
    id: string;
    site_id: string;
    site_version_id: string;
    bundle_sha256: string;
    html_by_path: Record<string, string>;
    manifest: Record<string, unknown>;
    publish_stage: string;
    shadow_restricted: boolean;
  }>(
    `
    select
      id::text,
      site_id::text,
      site_version_id::text,
      bundle_sha256::text,
      html_by_path,
      manifest,
      publish_stage::text,
      shadow_restricted
    from public.gnr8_runtime_artifacts
    where id = $1::uuid
    limit 1
    for update
    `,
    [AIRSHIP_CHS_DEMO_ARTIFACT_ID],
  );
  const row = res.rows[0];
  return row
    ? {
        id: row.id,
        siteId: row.site_id,
        siteVersionId: row.site_version_id,
        bundleSha256: row.bundle_sha256,
        htmlByPath: row.html_by_path,
        manifest: row.manifest,
        publishStage: row.publish_stage,
        shadowRestricted: row.shadow_restricted,
      }
    : null;
}

export async function repairAirshipChsDemoArtifact(input: {
  actor: string;
  idempotencyKey: string;
  pool?: PoolLike;
}): Promise<{
  ok: true;
  status: "mvp_recovery_chs_airship_demo_render_fixed";
  serviceVersion: typeof AIRSHIP_CHS_DEMO_REPAIR_SERVICE_VERSION;
  activePointerBefore: AirshipChsDemoPointerSnapshot;
  activePointerAfter: AirshipChsDemoPointerSnapshot;
  activePointerChanged: false;
  artifactId: typeof AIRSHIP_CHS_DEMO_ARTIFACT_ID;
  siteVersionId: typeof AIRSHIP_CHS_DEMO_SITE_VERSION_ID;
  previousBundleSha256: string;
  repairedBundleSha256: string;
  publicRenderChecks: AirshipChsDemoArtifactRepairPlan["publicRenderChecks"];
}> {
  const pool: PoolLike = input.pool ?? (getSuperadminPool() as unknown as PoolLike);
  const client = await pool.connect();
  try {
    await client.query("begin");
    const activePointerBefore = await readActivePointer(client);
    const artifact = await readArtifact(client);
    assertExpectedPointer(activePointerBefore);
    const plan = buildAirshipChsDemoArtifactRepairPlan({
      activePointer: activePointerBefore,
      artifact,
      actor: input.actor,
      idempotencyKey: input.idempotencyKey,
    });

    const version = await client.query<{ state: string }>(
      `select state::text from public.gnr8_runtime_site_versions where id = $1::uuid and site_id = $2::text limit 1`,
      [AIRSHIP_CHS_DEMO_SITE_VERSION_ID, AIRSHIP_CHS_DEMO_RUNTIME_SITE_ID],
    );
    const state = version.rows[0]?.state;
    if (!state) throw new Error("airship_chs_demo_site_version_missing");

    const updated = await client.query<{ id: string }>(
      `
      update public.gnr8_runtime_artifacts
      set
        bundle_sha256 = $4::text,
        html_by_path = $5::jsonb,
        manifest = $6::jsonb
      where id = $1::uuid
        and site_id = $2::text
        and site_version_id = $3::uuid
      returning id::text
      `,
      [
        AIRSHIP_CHS_DEMO_ARTIFACT_ID,
        AIRSHIP_CHS_DEMO_RUNTIME_SITE_ID,
        AIRSHIP_CHS_DEMO_SITE_VERSION_ID,
        plan.repairedBundleSha256,
        JSON.stringify(plan.htmlByPath),
        JSON.stringify(plan.manifest),
      ],
    );
    if (!updated.rows[0]) throw new Error("airship_chs_demo_artifact_repair_update_missed");

    await client.query(
      `
      insert into public.gnr8_runtime_version_audit (site_version_id, from_state, to_state, actor, source, details)
      values ($1::uuid, $2::text, $2::text, $3::text, $4::text, $5::jsonb)
      `,
      [
        AIRSHIP_CHS_DEMO_SITE_VERSION_ID,
        state,
        input.actor,
        "airship_mvp_recovery_10_artifact_repair",
        JSON.stringify({
          serviceVersion: AIRSHIP_CHS_DEMO_REPAIR_SERVICE_VERSION,
          idempotencyKey: input.idempotencyKey,
          artifactId: AIRSHIP_CHS_DEMO_ARTIFACT_ID,
          previousBundleSha256: plan.previousBundleSha256,
          repairedBundleSha256: plan.repairedBundleSha256,
          activePointerMutation: false,
          rollbackRun: false,
          dryRunRun: false,
          shadowPublishRun: false,
          sourceCaptureRun: false,
        }),
      ],
    );

    const activePointerAfter = await readActivePointer(client);
    assertExpectedPointer(activePointerAfter);
    await client.query("commit");

    return {
      ok: true,
      status: "mvp_recovery_chs_airship_demo_render_fixed",
      serviceVersion: AIRSHIP_CHS_DEMO_REPAIR_SERVICE_VERSION,
      activePointerBefore,
      activePointerAfter,
      activePointerChanged: false,
      artifactId: AIRSHIP_CHS_DEMO_ARTIFACT_ID,
      siteVersionId: AIRSHIP_CHS_DEMO_SITE_VERSION_ID,
      previousBundleSha256: plan.previousBundleSha256,
      repairedBundleSha256: plan.repairedBundleSha256,
      publicRenderChecks: plan.publicRenderChecks,
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
