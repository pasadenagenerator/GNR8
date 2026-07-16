import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const PAGE_FILE = new URL("./workspace/[siteVersionId]/page.tsx", import.meta.url);
const COMPONENTS_FILE = new URL("./workspace/[siteVersionId]/knowledge-workspace-components.tsx", import.meta.url);
const PROJECTION_FILE = new URL("../../../gnr8/architecture/knowledge-workspace-projection.ts", import.meta.url);
const BUSINESS_FOUNDATION_PAGE_FILE = new URL("./business-foundation/[siteVersionId]/page.tsx", import.meta.url);
const WEBSITE_UNDERSTANDING_PAGE_FILE = new URL("./website-understanding/[siteVersionId]/page.tsx", import.meta.url);
const EVOLUTION_PAGE_FILE = new URL("./evolution/[siteVersionId]/page.tsx", import.meta.url);

async function workspaceSources() {
  const [page, components, projection] = await Promise.all([
    readFile(PAGE_FILE, "utf8"),
    readFile(COMPONENTS_FILE, "utf8"),
    readFile(PROJECTION_FILE, "utf8"),
  ]);
  return { page, components, projection, all: `${page}\n${components}\n${projection}` };
}

test("knowledge workspace page loads the composed read-only projection", async () => {
  const { page } = await workspaceSources();

  assert.equal(page.includes("KnowledgeWorkspacePage"), true);
  assert.equal(page.includes("requireSuperadminUserIdForPage"), true);
  assert.equal(page.includes("loadKnowledgeWorkspaceProjection"), true);
  assert.equal(page.includes("<KnowledgeWorkspace model={model} />"), true);
  assert.equal(page.includes('runtime = "nodejs"'), true);
  assert.equal(page.includes('dynamic = "force-dynamic"'), true);
});

test("projection composes existing runtime projections and never persists workspace truth", async () => {
  const { projection } = await workspaceSources();

  for (const label of [
    "loadGenerationBusinessFoundationProjection",
    "loadGenerationEvolutionDashboardProjection",
    "loadSourceWebsiteUnderstandingProjection",
    "loadSourceContentVisualContinuityProjection",
    "KnowledgeWorkspaceProjection",
    "overallInterpretation",
    "originalVisualPreview",
    "generatedVisualPreview",
    "recognizable",
  ]) {
    assert.equal(projection.includes(label), true, `missing ${label}`);
  }

  for (const forbidden of ["persistKnowledgeWorkspace", "insert(", "updateRuntime", "server action", "use server"]) {
    assert.equal(projection.includes(forbidden), false, `unexpected mutation marker ${forbidden}`);
  }
});

test("hero uses observed identity or hostname and not site_* as primary title", async () => {
  const { projection, components } = await workspaceSources();

  assert.equal(projection.includes("heroIdentity"), true);
  assert.equal(projection.includes("isInternalIdentifier"), true);
  assert.equal(components.includes("<h1"), true);
  assert.equal(components.includes("props.hero.businessName"), true);
  assert.equal(components.includes("site_*"), false);
});

test("command center sections replace the old card-heavy workspace flow", async () => {
  const { components, all } = await workspaceSources();

  for (const label of [
    "WorkspaceCommandHero",
    "OriginalLatestComparison",
    "WebsiteEvolutionTimeline",
    "EvolutionTransition",
    "KnownUnknownSummary",
    "ContinuityShowcase",
    "ColorSignalSwatches",
    "TypographySummary",
    "RepresentativeImageGallery",
    "KnowledgeProgressRail",
    "PrioritizedGapGroup",
    "PrimaryRecommendation",
    "SupportingInspectionLinks",
    "WorkspaceAdvancedDetails",
    "Original Website",
    "Latest Proposal",
    "Website Evolution",
    "What GNR8 Understands",
    "What Will Remain Recognizable",
    "Knowledge Gaps",
    "Next Recommended Action",
    "Supporting Inspection Pages",
    "Advanced",
  ]) {
    assert.equal(all.includes(label), true, `missing ${label}`);
  }

  assert.equal(components.includes("Original Visual Signals"), false);
  assert.equal(components.includes('<SectionTitle title="Source Content & Visual Continuity"'), false);
});

test("original versus latest comparison uses truthful visual semantics", async () => {
  const { projection, components } = await workspaceSources();

  for (const label of [
    "persisted_original_source_thumbnail",
    "source_screenshot",
    "source_preview",
    "representative_source_asset",
    "unavailable",
    "live_generated_proposal_preview",
    "persisted_generated_thumbnail",
    "bundle_cover_image",
    "live_preview_available",
    "generated_unavailable",
    "Representative imported images are not used as original website thumbnails.",
    "Live generated proposal preview",
  ]) {
    assert.equal(`${projection}\n${components}`.includes(label), true, `missing ${label}`);
  }

  assert.equal(projection.includes('kind: "persisted_original_source_thumbnail"'), true);
  assert.equal(projection.includes("Representative imported images are not used as original website thumbnails."), true);
  assert.equal(projection.includes('kind: "representative_source_asset"'), false);
  assert.equal(components.includes("<iframe"), false);
  assert.equal(components.includes("props.preview.imageHref"), true);
});

test("preview truthfulness guards prevent misleading states", async () => {
  const { all } = await workspaceSources();

  for (const forbidden of [
    "Original website preview",
    "persisted thumbnail",
    "published website",
    "Company logo",
    "Brand colors",
    "Generate Proposal v3",
  ]) {
    assert.equal(all.includes(forbidden), false, `unexpected misleading wording ${forbidden}`);
  }

  for (const label of [
    "Candidate logo - confirmation required",
    "Observed color signals",
    "icon font evidence",
    "not approved",
    "not published",
    "Future step: Proposal v3",
  ]) {
    assert.equal(all.includes(label), true, `missing truthful wording ${label}`);
  }
});

test("evolution timeline order and transition summaries are explicit", async () => {
  const { projection, components } = await workspaceSources();

  assert.equal(projection.includes("return ["), true);
  assert.equal(projection.includes('label: "Original Website"'), true);
  assert.equal(projection.includes("...iterations"), true);
  assert.equal(projection.includes('label: "Future iterations"'), true);

  assert.equal(projection.includes("Initial proposal established a governed generation baseline."), true);
  assert.equal(projection.includes("Messages, trust signals, and constraints improved. No regressions were observed."), true);
  assert.equal(components.includes("Latest iteration"), true);
  assert.equal(components.includes("Historical iteration"), true);
});

test("known versus needs confirmation replaces verbose repeated business cards", async () => {
  const { components, projection } = await workspaceSources();

  for (const label of [
    "Known Or Observed",
    "Needs Confirmation",
    "Identity signal",
    "Website purpose",
    "Contact path",
    "Exact offerings",
    "Primary audience",
    "Canonical brand identity",
  ]) {
    assert.equal(`${components}\n${projection}`.includes(label), true, `missing ${label}`);
  }

  for (const repeated of ["We know...", "GNR8 has not confirmed...", "This still requires confirmation..."]) {
    assert.equal(components.includes(repeated), false, `old repeated copy remains ${repeated}`);
  }
});

test("continuity showcase is visual and product readable", async () => {
  const { components, projection } = await workspaceSources();

  assert.equal(projection.includes("representativeImages"), true);
  assert.equal(components.includes("props.images.slice(0, 6)"), true);
  assert.equal(components.includes("filename"), false);
  assert.equal(components.includes("Observed color signals"), true);
  assert.equal(components.includes("Typography candidates"), true);
  assert.equal(components.includes("Navigation"), true);
  assert.equal(components.includes("CTA"), true);
  assert.equal(components.includes("Contact"), true);
});

test("knowledge progress uses required dimensions without invented percentages", async () => {
  const { all, projection } = await workspaceSources();

  for (const label of [
    "Website Structure",
    "Business Understanding",
    "Content Continuity",
    "Visual Identity",
    "Proposal Quality",
    "Compliance",
    "Evolution",
    "Overall Readiness",
  ]) {
    assert.equal(projection.includes(`label: "${label}"`), true, `missing ${label}`);
  }

  assert.equal(projection.includes("%"), false);
  assert.equal(all.includes("percentage"), false);
  assert.equal(all.includes("score"), false);
});

test("contradictory state explanation is present", async () => {
  const { components, projection } = await workspaceSources();

  assert.equal(projection.includes("Iteration 2 is meaningfully better than Iteration 1"), true);
  assert.equal(components.includes("ready for focused improvement, not approval or publishing"), true);
});

test("gaps are grouped by priority and one recommendation is primary", async () => {
  const { components, projection } = await workspaceSources();

  for (const label of [
    "critical_before_next_generation",
    "important_for_recognizability",
    "future_enrichment",
    "Critical Before Next Generation",
    "Important For Recognizability",
    "Future Enrichment",
    "Current next step",
  ]) {
    assert.equal(`${components}\n${projection}`.includes(label), true, `missing ${label}`);
  }

  assert.equal(projection.includes("Confirm Offerings"), true);
  assert.equal(projection.includes("Confirm Audience"), true);
});

test("supporting inspection pages remain secondary and Advanced is collapsed", async () => {
  const { components, projection } = await workspaceSources();

  for (const route of [
    "/gnr8/admin/evolution/",
    "/gnr8/admin/business-foundation/",
    "/gnr8/admin/website-understanding/",
    "/gnr8/admin/continuity/",
  ]) {
    assert.equal(projection.includes(route), true, `missing ${route}`);
  }

  const advancedSource = components.slice(components.indexOf("export function WorkspaceAdvancedDetails"));
  assert.equal(advancedSource.includes("<details"), true);
  assert.equal(advancedSource.includes("<summary"), true);
  assert.equal(advancedSource.includes("Artifact IDs and lineage"), true);
  assert.equal(advancedSource.includes("siteVersionId"), true);
  assert.equal(advancedSource.includes("DryRun IDs"), true);
  assert.equal(components.indexOf("SupportingInspectionLinks") > components.indexOf("PrimaryRecommendation"), true);
});

test("technical IDs stay out of the primary component flow", async () => {
  const { components } = await workspaceSources();
  const primarySource = components.slice(0, components.indexOf("export function WorkspaceAdvancedDetails"));

  for (const technical of ["siteVersionId", "dryRunId", "Generation IDs", "Artifact Explorer", "evidenceCount"]) {
    assert.equal(primarySource.includes(technical), false, `technical detail in primary flow ${technical}`);
  }
});

test("workspace excludes forms, inputs, mutation controls, and server actions", async () => {
  const { all } = await workspaceSources();

  for (const tag of ["<button", "<form", "<input", "<textarea", "<select"]) {
    assert.equal(all.includes(tag), false, `unexpected control tag ${tag}`);
  }

  for (const phrase of [
    "Edit",
    "Save",
    "Regenerate",
    "Approve",
    "Publish",
    "Deploy",
    "server action",
    "use server",
  ]) {
    assert.equal(all.includes(phrase), false, `unexpected mutation phrase ${phrase}`);
  }
});

test("supporting runtime pages link back to the knowledge workspace", async () => {
  const [businessFoundation, websiteUnderstanding, evolution] = await Promise.all([
    readFile(BUSINESS_FOUNDATION_PAGE_FILE, "utf8"),
    readFile(WEBSITE_UNDERSTANDING_PAGE_FILE, "utf8"),
    readFile(EVOLUTION_PAGE_FILE, "utf8"),
  ]);

  for (const source of [businessFoundation, websiteUnderstanding, evolution]) {
    assert.equal(source.includes("Open Knowledge Workspace"), true);
    assert.equal(source.includes("/gnr8/admin/workspace/"), true);
  }
});
