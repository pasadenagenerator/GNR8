import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGE_FILE = new URL("./candidate-review/[siteVersionId]/page.tsx", import.meta.url);

test("Candidate Review page contains title, read loader, and guarded access", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes("Candidate Review"), true);
  assert.equal(source.includes("requireSuperadminUserIdForPage"), true);
  assert.equal(source.includes("loadLatestCandidateReviewSurfaceProjection"), true);
});

test("Candidate Review page renders overview and decision summary labels", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  for (const label of [
    "Overview", "artifact ref", "reviewPackageId", "candidateDiscoveryArtifactId", "siteVersionId",
    "dryRunId", "createdAt", "validation status", "Decision Summary", "reviewed count",
    "approved count", "rejected count", "deferred count", "unreviewed count",
  ]) assert.equal(source.includes(label), true, `missing ${label}`);
});

test("Candidate Review page renders latest decision, history, and candidate context labels", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  for (const label of [
    "Latest Decisions", "candidateId", "decision", "reviewerRef", "decidedAt", "rationale",
    "supersedesReviewEventId", "Event History", "immutable review events", "supersession status",
    "attribution", "Candidate Context", "candidate type", "confidence", "limitations", "candidate diagnostics",
  ]) assert.equal(source.includes(label), true, `missing ${label}`);
});

test("Candidate Review page contains required empty and attention states", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  for (const state of [
    "No Candidate Review package is available for this site version.",
    "This review package contains no review events.",
    "The latest Candidate Review package is invalid.",
    "All linked candidates are unreviewed.",
    "This review package is stale relative to the latest Candidate Discovery artifact.",
    "This review package contains superseded history.",
    "No unreviewed candidates.",
  ]) assert.equal(source.includes(state), true, `missing ${state}`);
});

test("Candidate Review page excludes mutation controls and action prompts", async () => {
  const source = (await readFile(PAGE_FILE, "utf8")).toLowerCase();
  for (const tag of ["<button", "<form", "<input", "<textarea", "<select"]) {
    assert.equal(source.includes(tag), false, `unexpected control tag ${tag}`);
  }
  for (const phrase of [
    "approve candidate", "reject candidate", "defer candidate", "run review", "edit decision",
    "ai control", "start reconstruction", "publish candidate", "trigger review",
  ]) assert.equal(source.includes(phrase), false, `unexpected action text ${phrase}`);
});
