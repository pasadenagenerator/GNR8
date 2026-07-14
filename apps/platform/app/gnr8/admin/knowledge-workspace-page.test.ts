import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const PAGE_FILE = new URL("./workspace/[siteVersionId]/page.tsx", import.meta.url);
const COMPONENTS_FILE = new URL("./workspace/[siteVersionId]/knowledge-workspace-components.tsx", import.meta.url);
const PROJECTION_FILE = new URL("../../../gnr8/architecture/knowledge-workspace-projection.ts", import.meta.url);
const BUSINESS_FOUNDATION_PAGE_FILE = new URL("./business-foundation/[siteVersionId]/page.tsx", import.meta.url);
const WEBSITE_UNDERSTANDING_PAGE_FILE = new URL("./website-understanding/[siteVersionId]/page.tsx", import.meta.url);
const EVOLUTION_PAGE_FILE = new URL("./evolution/[siteVersionId]/page.tsx", import.meta.url);

test("knowledge workspace page loads the composed read-only projection", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  assert.equal(source.includes("KnowledgeWorkspacePage"), true);
  assert.equal(source.includes("requireSuperadminUserIdForPage"), true);
  assert.equal(source.includes("loadKnowledgeWorkspaceProjection"), true);
  assert.equal(source.includes("<KnowledgeWorkspace model={model} />"), true);
  assert.equal(source.includes('runtime = "nodejs"'), true);
  assert.equal(source.includes('dynamic = "force-dynamic"'), true);
});

test("knowledge workspace projection composes existing runtime projections only", async () => {
  const source = await readFile(PROJECTION_FILE, "utf8");

  for (const label of [
    "loadGenerationBusinessFoundationProjection",
    "loadGenerationEvolutionDashboardProjection",
    "loadSourceWebsiteUnderstandingProjection",
    "KnowledgeWorkspaceProjection",
    "currentGenerationCycle",
    "currentIteration",
    "overallUnderstandingState",
    "currentRecommendation",
    "sourceProjectionStatus",
  ]) {
    assert.equal(source.includes(label), true, `missing ${label}`);
  }

  for (const forbidden of ["persistKnowledgeWorkspace", "insert(", "updateRuntime", "server action", "use server"]) {
    assert.equal(source.includes(forbidden), false, `unexpected mutation marker ${forbidden}`);
  }
});

test("knowledge workspace contains required operator sections and reusable components", async () => {
  const source = await readFile(COMPONENTS_FILE, "utf8");

  for (const label of [
    "WorkspaceHero",
    "KnowledgeCard",
    "WorkspaceMetric",
    "VersionCard",
    "VisualIdentityCard",
    "GapCard",
    "HealthCard",
    "StoryTimeline",
    "AdvancedDetails",
    "Knowledge Workspace",
    "Website Versions",
    "Business Understanding",
    "Visual Identity",
    "Transformation Story",
    "Current Knowledge Gaps",
    "Workspace Health",
    "Advanced",
    "Artifact Explorer",
    "Diagnostics",
    "Evidence counts",
    "Limitations",
  ]) {
    assert.equal(source.includes(label), true, `missing ${label}`);
  }
});

test("knowledge workspace exposes correct read-only navigation", async () => {
  const source = await readFile(COMPONENTS_FILE, "utf8");
  const projection = await readFile(PROJECTION_FILE, "utf8");

  for (const label of [
    "Open Original Website",
    "Open Latest Proposal Preview",
    "Open Evolution",
    "Open Business Foundation",
    "Open Website Understanding",
    "Open Preview",
  ]) {
    assert.equal(source.includes(label), true, `missing ${label}`);
  }

  for (const route of [
    "/gnr8/admin/evolution/",
    "/gnr8/admin/business-foundation/",
    "/gnr8/admin/website-understanding/",
  ]) {
    assert.equal(projection.includes(route), true, `missing ${route}`);
  }
});

test("knowledge workspace hero, version cards, and gap cards expose required fields", async () => {
  const source = await readFile(COMPONENTS_FILE, "utf8");
  const projection = await readFile(PROJECTION_FILE, "utf8");

  for (const label of [
    "Current Generation Cycle",
    "Current Iteration",
    "Overall understanding state",
    "Current confidence",
    "Current recommendation",
    "Current evolution state",
    "Current compliance state",
    "status",
    "compliance",
    "recommendation",
    "improvement state",
    "Why it matters:",
  ]) {
    assert.equal(source.includes(label), true, `missing ${label}`);
  }

  for (const label of [
    "Audience",
    "Offerings",
    "Brand colors",
    "Typography",
    "Logo confirmation",
    "Trust signals",
    "Differentiators",
    "Future iterations",
  ]) {
    assert.equal(projection.includes(label), true, `missing ${label}`);
  }
});

test("knowledge workspace advanced details are collapsed details disclosures", async () => {
  const source = await readFile(COMPONENTS_FILE, "utf8");
  const advancedSource = source.slice(source.indexOf("export function AdvancedDetails"));

  assert.equal(advancedSource.includes("<details"), true);
  assert.equal(advancedSource.includes("<summary"), true);
  assert.equal(advancedSource.includes("siteVersionId"), true);
  assert.equal(advancedSource.includes("DryRun IDs"), true);
  assert.equal(advancedSource.includes("Generation IDs"), true);
});

test("knowledge workspace excludes forms, edit controls, and mutation buttons", async () => {
  const source = `${await readFile(PAGE_FILE, "utf8")}\n${await readFile(COMPONENTS_FILE, "utf8")}`;

  for (const tag of ["<button", "<form", "<input", "<textarea", "<select"]) {
    assert.equal(source.includes(tag), false, `unexpected control tag ${tag}`);
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
    assert.equal(source.includes(phrase), false, `unexpected mutation phrase ${phrase}`);
  }
});

test("supporting runtime pages link back to the knowledge workspace", async () => {
  const businessFoundation = await readFile(BUSINESS_FOUNDATION_PAGE_FILE, "utf8");
  const websiteUnderstanding = await readFile(WEBSITE_UNDERSTANDING_PAGE_FILE, "utf8");
  const evolution = await readFile(EVOLUTION_PAGE_FILE, "utf8");

  for (const source of [businessFoundation, websiteUnderstanding, evolution]) {
    assert.equal(source.includes("Open Knowledge Workspace"), true);
    assert.equal(source.includes("/gnr8/admin/workspace/"), true);
  }
});
