import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const PAGE_FILE = new URL("./website-understanding/[siteVersionId]/page.tsx", import.meta.url);
const BUSINESS_FOUNDATION_PAGE_FILE = new URL("./business-foundation/[siteVersionId]/page.tsx", import.meta.url);

test("website understanding page contains required read-only operator sections", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  for (const label of [
    "Website Understanding",
    "Open Original Website",
    "Open Business Foundation",
    "Inspect Generation Evolution",
    "Understanding Readiness",
    "Pages and Navigation",
    "Structure and Content",
    "Imported Assets",
    "Visual Identity Signals",
    "Business Signal Candidates",
    "Technical and SEO Signals",
    "Missing / Conflicting Understanding",
    "Source Artifact Lineage",
    "Advanced Diagnostics",
    "Candidate does not mean confirmed brand identity",
    "requireSuperadminUserIdForPage",
    "loadSourceWebsiteUnderstandingProjection",
  ]) {
    assert.equal(source.includes(label), true, `missing ${label}`);
  }
});

test("website understanding page keeps lineage and dry-run IDs in advanced details", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  const advancedSource = source.slice(source.indexOf("Source Artifact Lineage"));

  assert.equal(source.includes("<details"), true);
  assert.equal(advancedSource.includes("projectionId"), true);
  assert.equal(advancedSource.includes("siteVersionId"), true);
  assert.equal(advancedSource.includes("dryRunId"), true);
});

test("website understanding page excludes forbidden mutation controls", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  for (const tag of ["<button", "<form", "<input", "<textarea", "<select"]) {
    assert.equal(source.includes(tag), false, `unexpected control tag ${tag}`);
  }

  for (const phrase of [
    "review buttons",
    "confirm buttons",
    "reject buttons",
    "edit controls",
    "generate/regenerate controls",
    "provider/AI controls",
    "approval/publish/deploy controls",
    "DNS controls",
    "server action",
    "use server",
  ]) {
    assert.equal(source.includes(phrase), false, `unexpected mutation phrase ${phrase}`);
  }
});

test("business foundation links back to website understanding", async () => {
  const source = await readFile(BUSINESS_FOUNDATION_PAGE_FILE, "utf8");

  assert.equal(source.includes("Inspect Website Understanding"), true);
  assert.equal(source.includes("/gnr8/admin/website-understanding/"), true);
});
