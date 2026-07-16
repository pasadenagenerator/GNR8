import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGE_FILE = new URL("./continuity/[siteVersionId]/page.tsx", import.meta.url);
const WORKSPACE_COMPONENTS_FILE = new URL("./workspace/[siteVersionId]/knowledge-workspace-components.tsx", import.meta.url);
const WEBSITE_UNDERSTANDING_PAGE_FILE = new URL("./website-understanding/[siteVersionId]/page.tsx", import.meta.url);

test("continuity page contains required read-only operator sections", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  for (const label of [
    "Source Continuity Summary",
    "Readiness",
    "Original Content",
    "Transformation Candidates",
    "Source Assets",
    "Logo and Image Candidates",
    "Typography and Colors",
    "Layout and Screenshot Continuity",
    "Confirmation and Licensing Gaps",
    "Source Lineage",
    "Advanced Diagnostics",
    "No transformation has been performed.",
    "Candidate does not mean confirmed brand asset.",
    "requireSuperadminUserIdForPage",
    "loadSourceContentVisualContinuityProjection",
  ]) {
    assert.equal(source.includes(label), true, `missing ${label}`);
  }
});

test("continuity page keeps technical lineage and diagnostics secondary", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  const advancedSource = source.slice(source.indexOf("Source Lineage"));

  assert.equal(source.includes("<details"), true);
  assert.equal(advancedSource.includes("projectionId"), true);
  assert.equal(advancedSource.includes("sourceWebsiteUnderstandingProjectionId"), true);
  assert.equal(advancedSource.includes("siteVersionId"), true);
  assert.equal(advancedSource.includes("dryRunId"), true);
});

test("continuity page excludes mutation controls", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  for (const tag of ["<button", "<form", "<input", "<textarea", "<select"]) {
    assert.equal(source.includes(tag), false, `unexpected control tag ${tag}`);
  }

  for (const phrase of [
    "confirm/reject controls",
    "content edit controls",
    "asset approval controls",
    "generate/regenerate controls",
    "AI/provider controls",
    "publish/deploy controls",
    "server action",
    "use server",
  ]) {
    assert.equal(source.includes(phrase), false, `unexpected mutation phrase ${phrase}`);
  }
});

test("workspace and website understanding link to continuity page", async () => {
  const workspaceSource = await readFile(WORKSPACE_COMPONENTS_FILE, "utf8");
  const websiteUnderstandingSource = await readFile(WEBSITE_UNDERSTANDING_PAGE_FILE, "utf8");

  assert.equal(workspaceSource.includes("Open Content & Visual Continuity"), true);
  assert.equal(websiteUnderstandingSource.includes("Open Content & Visual Continuity"), true);
  assert.equal(websiteUnderstandingSource.includes("/gnr8/admin/continuity/"), true);
});
