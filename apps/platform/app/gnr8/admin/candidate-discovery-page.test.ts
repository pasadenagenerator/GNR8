import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGE_FILE = new URL("./candidate-discovery/[siteVersionId]/page.tsx", import.meta.url);

test("Candidate Discovery page contains title, loader, and guarded access", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  assert.equal(source.includes("Candidate Discovery"), true);
  assert.equal(source.includes("requireSuperadminUserIdForPage"), true);
  assert.equal(source.includes("loadLatestCandidateDiscoverySurfaceProjection"), true);
});

test("Candidate Discovery page displays overview and summary labels", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  for (const label of [
    "Overview",
    "artifact ref",
    "discoveryId",
    "siteVersionId",
    "dryRunId",
    "createdAt",
    "validation status",
    "candidate count",
    "candidate types present",
    "limitation count",
    "blocker count",
    "Candidate Summary",
    "route count",
    "navigation count",
    "section count",
    "LOW confidence",
    "MEDIUM confidence",
    "HIGH confidence",
  ]) {
    assert.equal(source.includes(label), true, `missing ${label}`);
  }
});

test("Candidate Discovery page displays route, navigation, and section candidate labels", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  for (const label of [
    "Candidate List",
    "Route Candidates",
    "Navigation Candidates",
    "Section Candidates By Route",
    "candidateId",
    "candidateType",
    "candidateStatus",
    "confidence",
    "routePath",
    "sourceEvidenceRefs",
    "sourceDryRunRefs",
    "limitations",
    "diagnostics",
  ]) {
    assert.equal(source.includes(label), true, `missing ${label}`);
  }
});

test("Candidate Discovery page contains all required empty and attention states", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  for (const state of [
    "No Candidate Discovery result is available for this site version.",
    "The latest Candidate Discovery result is invalid.",
    "Candidate Discovery is blocked.",
    "No candidates were discovered.",
    "Candidates include limitations.",
    "Candidates include blockers.",
    "No route candidates.",
    "No navigation candidates.",
    "No section candidates.",
  ]) {
    assert.equal(source.includes(state), true, `missing ${state}`);
  }
});

test("Candidate Discovery page excludes action text and controls", async () => {
  const source = (await readFile(PAGE_FILE, "utf8")).toLowerCase();

  for (const tag of ["<button", "<form", "<input", "<textarea", "<select"]) {
    assert.equal(source.includes(tag), false, `unexpected control tag ${tag}`);
  }
  for (const phrase of [
    "approve",
    "reject",
    "review",
    "rebuild",
    "trigger",
    "edit",
    "artificial intelligence",
    "reconstruction",
    "publish",
  ]) {
    assert.equal(source.includes(phrase), false, `unexpected action text ${phrase}`);
  }
});
