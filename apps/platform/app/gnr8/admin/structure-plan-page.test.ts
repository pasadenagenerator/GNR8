import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGE_FILE = new URL("./structure-plan/[siteVersionId]/page.tsx", import.meta.url);

test("Structure Plan page contains title, loader, and guarded access", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  assert.equal(source.includes("Structure Plan"), true);
  assert.equal(source.includes("requireSuperadminUserIdForPage"), true);
  assert.equal(source.includes("loadLatestStructurePlanSurfaceProjection"), true);
});

test("Structure Plan page displays overview, lineage, and summary labels", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  for (const label of [
    "Overview",
    "artifact reference",
    "structurePlanId",
    "siteVersionId",
    "status",
    "contractVersion",
    "createdAt",
    "persistedAt",
    "Lineage",
    "Reconstruction Package",
    "Review Package",
    "Discovery Result",
    "dryRunId",
    "Plan Summary",
    "planned routes",
    "planned navigation",
    "planned sections",
    "assignments",
    "blocked candidates",
  ]) {
    assert.equal(source.includes(label), true, `missing ${label}`);
  }
});

test("Structure Plan page displays planned groups, assignments, and diagnostics", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  for (const label of [
    "Planned Routes",
    "route path",
    "source candidate",
    "assignment",
    "Planned Navigation",
    "route",
    "Planned Sections",
    "section order",
    "Assignments",
    "assignmentId",
    "candidateId",
    "candidateType",
    "target kind",
    "target id",
    "Diagnostics",
    "validation",
    "limitations",
    "diagnostics",
  ]) {
    assert.equal(source.includes(label), true, `missing ${label}`);
  }
});

test("Structure Plan page contains required empty and attention states", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  for (const state of [
    "No Structure Plan has been persisted for this site version yet.",
    "The latest Structure Plan references an older Reconstruction Package lineage.",
    "The latest Structure Plan is blocked.",
    "Limitations are present on this Structure Plan.",
    "No planned navigation entries are present.",
    "No planned sections are present.",
    "No planned routes.",
    "No planned navigation.",
    "No planned sections.",
    "No assignments.",
    "No validation errors.",
    "No validation warnings.",
    "No limitations.",
    "No diagnostics.",
  ]) {
    assert.equal(source.includes(state), true, `missing ${state}`);
  }
});

test("Structure Plan page excludes forbidden controls", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  const lowercase = source.toLowerCase();

  for (const tag of ["<button", "<form", "<input", "<textarea", "<select"]) {
    assert.equal(lowercase.includes(tag), false, `unexpected control tag ${tag}`);
  }

  for (const phrase of [
    "ai controls",
    "generation controls",
    "publishing controls",
    "execution controls",
    "edit controls",
    "retry controls",
    "approval controls",
    "onclick",
    "server action",
  ]) {
    assert.equal(lowercase.includes(phrase), false, `unexpected action text ${phrase}`);
  }
});
