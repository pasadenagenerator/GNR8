import "server-only";

import { createHash } from "node:crypto";

import { parse, serialize } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

import { getSuperadminPool } from "../../src/superadmin/db";
import {
  AIRSHIP_ARIS_CANDIDATE_ARTIFACT_ID,
  AIRSHIP_ARIS_CANDIDATE_SITE_VERSION_ID,
  AIRSHIP_ARIS_RUNTIME_SITE_ID,
} from "./airship-aris-mvp-draft";
import {
  AIRSHIP_CHS_DEMO_ARTIFACT_ID,
  AIRSHIP_CHS_DEMO_RUNTIME_SITE_ID,
  AIRSHIP_CHS_DEMO_SITE_VERSION_ID,
} from "./airship-chs-demo-artifact-repair";

export const AIRSHIP_DEMO_ARTIFACT_SECTION_MARKER_REPAIR_SERVICE_VERSION =
  "airship-editor-existing-demo-artifact-section-marker-repair:v1" as const;

type QueryResult<T> = { rows: T[]; rowCount: number | null };
type Queryable = {
  query<T = unknown>(sql: string, values?: unknown[]): Promise<QueryResult<T>>;
};
type PoolLike = Queryable & {
  connect(): Promise<Queryable & { release(): void }>;
};

type HtmlNode = DefaultTreeAdapterMap["node"];
type HtmlElement = DefaultTreeAdapterMap["element"];

export type AirshipDemoArtifactMarkerTarget = "aris" | "chs";

type MarkerProfile = {
  target: AirshipDemoArtifactMarkerTarget;
  siteId: string;
  siteVersionId: string;
  artifactId: string;
  expectedStage: "shadow";
  requiredSections: string[];
};

export type AirshipDemoArtifactMarkerSnapshot = {
  id: string;
  siteId: string;
  siteVersionId: string;
  bundleSha256: string;
  htmlByPath: Record<string, string>;
  manifest: Record<string, unknown>;
  publishStage: string;
  shadowRestricted: boolean;
};

export type AirshipDemoArtifactMarkerRefreshPlan = {
  serviceVersion: typeof AIRSHIP_DEMO_ARTIFACT_SECTION_MARKER_REPAIR_SERVICE_VERSION;
  targets: Array<{
    target: AirshipDemoArtifactMarkerTarget;
    artifactId: string;
    siteVersionId: string;
    previousBundleSha256: string;
    repairedBundleSha256: string;
    sectionMarkers: Record<string, number>;
    elementMarkers: Record<string, number>;
  }>;
};

const MARKER_PROFILES: Record<AirshipDemoArtifactMarkerTarget, MarkerProfile> = {
  aris: {
    target: "aris",
    siteId: AIRSHIP_ARIS_RUNTIME_SITE_ID,
    siteVersionId: AIRSHIP_ARIS_CANDIDATE_SITE_VERSION_ID,
    artifactId: AIRSHIP_ARIS_CANDIDATE_ARTIFACT_ID,
    expectedStage: "shadow",
    requiredSections: ["hero", "offers", "proof", "cta", "footer"],
  },
  chs: {
    target: "chs",
    siteId: AIRSHIP_CHS_DEMO_RUNTIME_SITE_ID,
    siteVersionId: AIRSHIP_CHS_DEMO_SITE_VERSION_ID,
    artifactId: AIRSHIP_CHS_DEMO_ARTIFACT_ID,
    expectedStage: "shadow",
    requiredSections: ["hero", "offers", "proof", "approach", "cta", "footer"],
  },
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

function isElement(node: HtmlNode): node is HtmlElement {
  return "tagName" in node && Array.isArray((node as HtmlElement).attrs);
}

function walk(node: HtmlNode, visit: (element: HtmlElement) => void): void {
  if (isElement(node)) visit(node);
  const children = "childNodes" in node ? node.childNodes ?? [] : [];
  for (const child of children) walk(child, visit);
}

function attr(element: HtmlElement, name: string): string | null {
  return element.attrs.find((item) => item.name === name)?.value ?? null;
}

function setAttr(element: HtmlElement, name: string, value: string): void {
  const existing = element.attrs.find((item) => item.name === name);
  if (existing) {
    existing.value = value;
  } else {
    element.attrs.push({ name, value });
  }
}

function removeAttr(element: HtmlElement, name: string): void {
  element.attrs = element.attrs.filter((item) => item.name !== name);
}

function hasClass(element: HtmlElement, className: string): boolean {
  return (attr(element, "class") ?? "").split(/\s+/).includes(className);
}

function allElements(root: HtmlNode): HtmlElement[] {
  const out: HtmlElement[] = [];
  walk(root, (element) => out.push(element));
  return out;
}

function findElement(root: HtmlNode, predicate: (element: HtmlElement) => boolean): HtmlElement | null {
  return allElements(root).find(predicate) ?? null;
}

function descendants(element: HtmlElement): HtmlElement[] {
  return allElements(element).filter((item) => item !== element);
}

function directText(element: HtmlElement): string {
  const children = "childNodes" in element ? element.childNodes ?? [] : [];
  return children
    .map((child) => "value" in child ? child.value : "")
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function sectionMarkerCounts(root: HtmlNode): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const element of allElements(root)) {
    const marker = attr(element, "data-airship-section");
    if (!marker) continue;
    counts[marker] = (counts[marker] ?? 0) + 1;
  }
  return counts;
}

function elementMarkerCounts(root: HtmlNode): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const element of allElements(root)) {
    const marker = attr(element, "data-airship-element");
    if (!marker) continue;
    counts[marker] = (counts[marker] ?? 0) + 1;
  }
  return counts;
}

function markSection(element: HtmlElement | null, section: string): void {
  if (!element) throw new Error(`airship_demo_marker_target_missing:${section}`);
  setAttr(element, "data-airship-section", section);
}

function markIndexed(elements: HtmlElement[], marker: string): void {
  elements.forEach((element, index) => {
    setAttr(element, "data-airship-element", marker);
    setAttr(element, "data-airship-element-index", String(index));
  });
}

function markCardParts(cards: HtmlElement[]): void {
  cards.forEach((card, index) => {
    const title = descendants(card).find((element) => /^h[1-6]$/i.test(element.tagName)) ?? null;
    const body = descendants(card).find((element) => element.tagName === "p") ?? null;
    if (title) {
      setAttr(title, "data-airship-element", "card-title");
      setAttr(title, "data-airship-element-index", String(index));
    }
    if (body) {
      setAttr(body, "data-airship-element", "card-body");
      setAttr(body, "data-airship-element-index", String(index));
    }
  });
}

function markNavItems(root: HtmlNode): void {
  const navItems = allElements(root).filter((element) => element.tagName === "a" && allElements(root).some((candidate) => {
    return candidate.tagName === "nav" && descendants(candidate).includes(element);
  }));
  markIndexed(navItems, "nav-item");
}

function applyChsMarkers(root: HtmlNode): void {
  const hero = findElement(root, (element) => element.tagName === "section" && hasClass(element, "hero"));
  const offers = findElement(root, (element) => element.tagName === "section" && attr(element, "id") === "identity");
  const proof = findElement(root, (element) => element.tagName === "section" && attr(element, "id") === "proof");
  const approach = findElement(root, (element) => element.tagName === "section" && attr(element, "data-section") === "team");
  const cta = findElement(root, (element) => element.tagName === "section" && attr(element, "id") === "contact");
  const footer = findElement(root, (element) => element.tagName === "footer");

  markSection(hero, "hero");
  markSection(offers, "offers");
  markSection(proof, "proof");
  markSection(approach, "approach");
  markSection(cta, "cta");
  markSection(footer, "footer");

  const heroHeadline = hero ? descendants(hero).find((element) => element.tagName === "h1") ?? null : null;
  const heroSubheading = hero ? descendants(hero).find((element) => element.tagName === "p") ?? null : null;
  const heroCta = hero ? descendants(hero).find((element) => element.tagName === "a" && attr(element, "href") === "#contact") ?? null : null;
  const approachCard = approach ? descendants(approach).find((element) => element.tagName === "div" && hasClass(element, "team-strip")) ?? approach : null;
  if (heroHeadline) setAttr(heroHeadline, "data-airship-element", "hero-headline");
  if (heroSubheading) setAttr(heroSubheading, "data-airship-element", "hero-subheading");
  if (heroCta) setAttr(heroCta, "data-airship-element", "hero-cta");
  if (approachCard) setAttr(approachCard, "data-airship-element", "approach-card");
  if (cta) {
    const contactCard = descendants(cta).find((element) => hasClass(element, "contact-card")) ?? null;
    const contactCta = descendants(cta).find((element) => element.tagName === "button") ?? null;
    if (contactCard) setAttr(contactCard, "data-airship-element", "contact-card");
    if (contactCta) setAttr(contactCta, "data-airship-element", "contact-cta");
  }
  if (offers) {
    const offerCards = descendants(offers).filter((element) => element.tagName === "li");
    markIndexed(offerCards, "offer-card");
    markCardParts(offerCards);
  }
  if (proof) {
    const proofCards = descendants(proof).filter((element) => element.tagName === "article" && hasClass(element, "proof-card"));
    markIndexed(proofCards, "proof-card");
    markCardParts(proofCards);
  }
  markNavItems(root);
}

function applyArisMarkers(root: HtmlNode): void {
  const hero = findElement(root, (element) => element.tagName === "section" && hasClass(element, "hero"));
  const offers = findElement(root, (element) => element.tagName === "section" && attr(element, "id") === "apple");
  const proof = findElement(root, (element) => element.tagName === "section" && attr(element, "id") === "canton");
  const cta = findElement(root, (element) => element.tagName === "section" && attr(element, "id") === "kontakt");
  const footer = findElement(root, (element) => element.tagName === "footer");

  markSection(hero, "hero");
  markSection(offers, "offers");
  markSection(proof, "proof");
  markSection(cta, "cta");
  markSection(footer, "footer");

  const heroHeadline = hero ? descendants(hero).find((element) => element.tagName === "h1") ?? null : null;
  const heroSubheading = hero ? descendants(hero).find((element) => element.tagName === "p") ?? null : null;
  const heroCta = hero ? descendants(hero).find((element) => element.tagName === "a" && attr(element, "href") === "#kontakt") ?? null : null;
  if (heroHeadline) setAttr(heroHeadline, "data-airship-element", "hero-headline");
  if (heroSubheading) setAttr(heroSubheading, "data-airship-element", "hero-subheading");
  if (heroCta) setAttr(heroCta, "data-airship-element", "hero-cta");
  if (offers) {
    const offerCards = descendants(offers).filter((element) => element.tagName === "article" && hasClass(element, "card"));
    markIndexed(offerCards, "offer-card");
    markCardParts(offerCards);
  }
  if (proof) {
    const proofCards = descendants(proof).filter((element) => element.tagName === "article" && hasClass(element, "card"));
    markIndexed(proofCards, "proof-card");
    markCardParts(proofCards);
  }
  if (cta) {
    const contactCard = descendants(cta).find((element) => hasClass(element, "contact-panel")) ?? null;
    const contactCta = descendants(cta).find((element) => element.tagName === "a" && hasClass(element, "pill")) ?? null;
    if (contactCard) setAttr(contactCard, "data-airship-element", "contact-card");
    if (contactCta) setAttr(contactCta, "data-airship-element", "contact-cta");
  }
  markNavItems(root);
}

export function refreshAirshipDemoArtifactSectionMarkersHtml(input: {
  target: AirshipDemoArtifactMarkerTarget;
  html: string;
}): {
  html: string;
  sectionMarkers: Record<string, number>;
  elementMarkers: Record<string, number>;
} {
  const profile = MARKER_PROFILES[input.target];
  const root = parse(input.html);
  for (const element of allElements(root)) removeAttr(element, "data-airship-section");
  if (profile.target === "aris") applyArisMarkers(root);
  else applyChsMarkers(root);

  const sectionMarkers = sectionMarkerCounts(root);
  for (const section of profile.requiredSections) {
    if (sectionMarkers[section] !== 1) throw new Error(`airship_demo_section_marker_missing:${input.target}:${section}`);
  }
  const elementMarkers = elementMarkerCounts(root);
  if (!elementMarkers["hero-headline"]) throw new Error(`airship_demo_element_marker_missing:${input.target}:hero-headline`);
  if (!elementMarkers["hero-cta"]) throw new Error(`airship_demo_element_marker_missing:${input.target}:hero-cta`);
  if (!elementMarkers["offer-card"]) throw new Error(`airship_demo_element_marker_missing:${input.target}:offer-card`);
  if (!elementMarkers["contact-card"]) throw new Error(`airship_demo_element_marker_missing:${input.target}:contact-card`);
  if (!elementMarkers["contact-cta"]) throw new Error(`airship_demo_element_marker_missing:${input.target}:contact-cta`);

  return {
    html: serialize(root),
    sectionMarkers,
    elementMarkers,
  };
}

export function inspectAirshipDemoArtifactMarkerPlacement(html: string): {
  sectionMarkers: Record<string, number>;
  elementMarkers: Record<string, number>;
  sectionTags: Record<string, { tagName: string; id: string | null; className: string | null; text: string }>;
} {
  const root = parse(html);
  const sectionTags: Record<string, { tagName: string; id: string | null; className: string | null; text: string }> = {};
  for (const element of allElements(root)) {
    const marker = attr(element, "data-airship-section");
    if (!marker) continue;
    sectionTags[marker] = {
      tagName: element.tagName,
      id: attr(element, "id"),
      className: attr(element, "class"),
      text: directText(element),
    };
  }
  return {
    sectionMarkers: sectionMarkerCounts(root),
    elementMarkers: elementMarkerCounts(root),
    sectionTags,
  };
}

function assertExpectedArtifact(profile: MarkerProfile, artifact: AirshipDemoArtifactMarkerSnapshot | null): asserts artifact is AirshipDemoArtifactMarkerSnapshot {
  if (!artifact) throw new Error(`airship_demo_marker_artifact_missing:${profile.target}`);
  if (artifact.id !== profile.artifactId) throw new Error(`airship_demo_marker_artifact_id_mismatch:${profile.target}`);
  if (artifact.siteId !== profile.siteId) throw new Error(`airship_demo_marker_site_mismatch:${profile.target}`);
  if (artifact.siteVersionId !== profile.siteVersionId) throw new Error(`airship_demo_marker_version_mismatch:${profile.target}`);
  if (artifact.publishStage !== profile.expectedStage) throw new Error(`airship_demo_marker_stage_mismatch:${profile.target}`);
  if (artifact.shadowRestricted !== false) throw new Error(`airship_demo_marker_shadow_restricted_mismatch:${profile.target}`);
}

export function buildAirshipDemoArtifactMarkerRefreshPlan(input: {
  artifacts: Record<AirshipDemoArtifactMarkerTarget, AirshipDemoArtifactMarkerSnapshot | null>;
  actor: string;
  idempotencyKey: string;
}): AirshipDemoArtifactMarkerRefreshPlan & {
  htmlByTarget: Record<AirshipDemoArtifactMarkerTarget, Record<string, string>>;
  manifestsByTarget: Record<AirshipDemoArtifactMarkerTarget, Record<string, unknown>>;
} {
  const targets: AirshipDemoArtifactMarkerRefreshPlan["targets"] = [];
  const htmlByTarget = {} as Record<AirshipDemoArtifactMarkerTarget, Record<string, string>>;
  const manifestsByTarget = {} as Record<AirshipDemoArtifactMarkerTarget, Record<string, unknown>>;

  for (const target of ["aris", "chs"] as const) {
    const profile = MARKER_PROFILES[target];
    const artifact = input.artifacts[target];
    assertExpectedArtifact(profile, artifact);
    const repaired = refreshAirshipDemoArtifactSectionMarkersHtml({
      target,
      html: artifact.htmlByPath["/"] ?? "",
    });
    const htmlByPath = {
      ...artifact.htmlByPath,
      "/": repaired.html,
    };
    const repairedBundleSha256 = sha256({
      serviceVersion: AIRSHIP_DEMO_ARTIFACT_SECTION_MARKER_REPAIR_SERVICE_VERSION,
      target,
      siteId: profile.siteId,
      siteVersionId: profile.siteVersionId,
      artifactId: profile.artifactId,
      htmlByPath,
    });
    const manifest = {
      ...artifact.manifest,
      airshipEditorExistingArtifactSectionMarkerRepair: {
        serviceVersion: AIRSHIP_DEMO_ARTIFACT_SECTION_MARKER_REPAIR_SERVICE_VERSION,
        status: "airship_editor_existing_artifact_section_markers_fixed",
        target,
        actor: input.actor,
        idempotencyKey: input.idempotencyKey,
        previousBundleSha256: artifact.bundleSha256,
        repairedBundleSha256,
        activePointerMutation: false,
        sourceCaptureRun: false,
        dryRunRun: false,
        shadowPublishRun: false,
        rollbackRun: false,
        visibleContentChange: false,
        sectionMarkers: repaired.sectionMarkers,
        elementMarkers: repaired.elementMarkers,
      },
    };
    htmlByTarget[target] = htmlByPath;
    manifestsByTarget[target] = manifest;
    targets.push({
      target,
      artifactId: profile.artifactId,
      siteVersionId: profile.siteVersionId,
      previousBundleSha256: artifact.bundleSha256,
      repairedBundleSha256,
      sectionMarkers: repaired.sectionMarkers,
      elementMarkers: repaired.elementMarkers,
    });
  }

  return {
    serviceVersion: AIRSHIP_DEMO_ARTIFACT_SECTION_MARKER_REPAIR_SERVICE_VERSION,
    targets,
    htmlByTarget,
    manifestsByTarget,
  };
}

async function readArtifact(client: Queryable, profile: MarkerProfile): Promise<AirshipDemoArtifactMarkerSnapshot | null> {
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
    [profile.artifactId],
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

export async function refreshAirshipDemoArtifactSectionMarkers(input: {
  actor: string;
  idempotencyKey: string;
  pool?: PoolLike;
}): Promise<AirshipDemoArtifactMarkerRefreshPlan> {
  const pool: PoolLike = input.pool ?? (getSuperadminPool() as unknown as PoolLike);
  const client = await pool.connect();
  try {
    await client.query("begin");
    const artifacts = {
      aris: await readArtifact(client, MARKER_PROFILES.aris),
      chs: await readArtifact(client, MARKER_PROFILES.chs),
    };
    const plan = buildAirshipDemoArtifactMarkerRefreshPlan({
      artifacts,
      actor: input.actor,
      idempotencyKey: input.idempotencyKey,
    });

    for (const target of ["aris", "chs"] as const) {
      const profile = MARKER_PROFILES[target];
      const targetPlan = plan.targets.find((item) => item.target === target);
      if (!targetPlan) throw new Error(`airship_demo_marker_plan_missing:${target}`);
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
          profile.artifactId,
          profile.siteId,
          profile.siteVersionId,
          targetPlan.repairedBundleSha256,
          JSON.stringify(plan.htmlByTarget[target]),
          JSON.stringify(plan.manifestsByTarget[target]),
        ],
      );
      if (!updated.rows[0]) throw new Error(`airship_demo_marker_update_missed:${target}`);

      const version = await client.query<{ state: string }>(
        `select state::text from public.gnr8_runtime_site_versions where id = $1::uuid and site_id = $2::text limit 1`,
        [profile.siteVersionId, profile.siteId],
      );
      const state = version.rows[0]?.state;
      if (!state) throw new Error(`airship_demo_marker_site_version_missing:${target}`);
      await client.query(
        `
        insert into public.gnr8_runtime_version_audit (site_version_id, from_state, to_state, actor, source, details)
        values ($1::uuid, $2::text, $2::text, $3::text, $4::text, $5::jsonb)
        `,
        [
          profile.siteVersionId,
          state,
          input.actor,
          "airship_editor_existing_artifact_section_marker_repair",
          JSON.stringify({
            serviceVersion: AIRSHIP_DEMO_ARTIFACT_SECTION_MARKER_REPAIR_SERVICE_VERSION,
            idempotencyKey: input.idempotencyKey,
            target,
            artifactId: profile.artifactId,
            previousBundleSha256: targetPlan.previousBundleSha256,
            repairedBundleSha256: targetPlan.repairedBundleSha256,
            activePointerMutation: false,
            rollbackRun: false,
            dryRunRun: false,
            shadowPublishRun: false,
            sourceCaptureRun: false,
            visibleContentChange: false,
            sectionMarkers: targetPlan.sectionMarkers,
            elementMarkers: targetPlan.elementMarkers,
          }),
        ],
      );
    }

    await client.query("commit");
    return plan;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
