import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const PAGE_FILE = new URL("./business-foundation/[siteVersionId]/page.tsx", import.meta.url);

test("business foundation page contains required read-only runtime sections", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  for (const label of [
    "Business Foundation",
    "Business Summary",
    "Business Knowledge",
    "Offerings",
    "Audience",
    "Missing Knowledge",
    "Transformation Story",
    "Business Foundation Status",
    "Related Read-Only Surface",
    "Inspect Generation Evolution",
    "Attention States",
    "Artifact Explorer",
    "ArtifactLinkList",
    "requireSuperadminUserIdForPage",
    "loadGenerationBusinessFoundationProjection",
  ]) {
    assert.equal(source.includes(label), true, `missing ${label}`);
  }
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
