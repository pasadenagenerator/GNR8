import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const PAGE_FILE = new URL("./business-foundation/[siteVersionId]/page.tsx", import.meta.url);

test("business foundation page contains required read-only runtime sections", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  for (const label of [
    "Business Foundation",
    "Open Original Website",
    "Inspect Generation Evolution",
    "Open Latest Generated Proposal",
    "Website Versions",
    "Original Website",
    "Generated Proposal Preview",
    "What GNR8 Understands",
    "Business Narrative",
    "Current Understanding",
    "Offerings and Audience",
    "Detected Brand & Visual Identity",
    "Original Imported Assets",
    "What GNR8 Still Needs to Know",
    "Transformation Story",
    "Advanced: Evidence, Lineage & Canonical Artifacts",
    "Understanding",
    "Alignment",
    "Website Intent",
    "requireSuperadminUserIdForPage",
    "loadGenerationBusinessFoundationProjection",
  ]) {
    assert.equal(source.includes(label), true, `missing ${label}`);
  }
});

test("business foundation page keeps technical identifiers in advanced details", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  const advancedSource = source.slice(source.indexOf("Advanced: Evidence, Lineage & Canonical Artifacts"));

  assert.equal(advancedSource.includes("siteVersionId"), true);
  assert.equal(advancedSource.includes("dryRunId"), true);
  assert.equal(source.includes("<details"), true);
  assert.equal(source.includes("provider_generation_payload"), false);
  assert.equal(source.includes("generation_contract_compliance_report"), false);
});

test("business foundation page exposes read-only navigation to evolution and previews", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  assert.equal(source.includes("hero.primaryLinks.evolutionHref"), true);
  assert.equal(source.includes("iteration.previewHref"), true);
  assert.equal(source.includes("Open {props.iteration.label} Preview"), true);
  assert.equal(source.includes("View Website Evolution"), true);
});

test("business foundation page excludes forbidden edit and mutation controls", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  for (const tag of ["<button", "<form", "<input", "<textarea", "<select"]) {
    assert.equal(source.includes(tag), false, `unexpected control tag ${tag}`);
  }

  for (const phrase of [
    "generate button",
    "regenerate button",
    "approve button",
    "publish button",
    "deploy button",
    "provider execution controls",
    "AI controls",
    "DNS controls",
    "server action",
    "use server",
  ]) {
    assert.equal(source.includes(phrase), false, `unexpected phrase ${phrase}`);
  }
});
