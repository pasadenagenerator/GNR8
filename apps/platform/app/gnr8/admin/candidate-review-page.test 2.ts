import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGE_FILE = new URL("./candidate-review/[siteVersionId]/page.tsx", import.meta.url);
const CONTROLS_FILE = new URL("./candidate-review/[siteVersionId]/CandidateReviewActionControls.tsx", import.meta.url);

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

test("Candidate Review page renders single-candidate controls for reviewed and unreviewed candidates", async () => {
  const pageSource = await readFile(PAGE_FILE, "utf8");
  const controlsSource = await readFile(CONTROLS_FILE, "utf8");
  assert.equal(pageSource.includes("<CandidateReviewActionControls {...props.actionTarget} candidateId={item.candidateId}"), true);
  assert.equal(pageSource.includes("<CandidateReviewActionControls {...props.actionTarget} candidateId={props.candidate.candidateId}"), true);
  for (const label of ["Approve", "Reject", "Defer", "Optional rationale"]) {
    assert.equal(controlsSource.includes(label), true, `missing ${label}`);
  }
});

test("Candidate Review controls show stale feedback and reload without automatic rebase", async () => {
  const source = await readFile(CONTROLS_FILE, "utf8");
  assert.equal(source.includes('response.errorCode === "STALE_REVIEW_PACKAGE"'), true);
  assert.equal(source.includes("Stale package: the latest Candidate Review package was reloaded."), true);
  assert.equal(source.includes("router.refresh()"), true);
  assert.equal(source.includes("auto" + "matic"), false);
});

test("Candidate Review page contains no forbidden, generated, or multi-candidate controls", async () => {
  const source = `${await readFile(PAGE_FILE, "utf8")}\n${await readFile(CONTROLS_FILE, "utf8")}`.toLowerCase();
  for (const phrase of [
    "ai control", "ai action", "start reconstruction", "reconstruction control", "reconstruction handoff",
    "publish candidate", "publishing control", "generated output", "edit candidate", "edit decision",
    "batch action", "bulk action", "select all", "multi-candidate",
  ]) assert.equal(source.includes(phrase), false, `unexpected forbidden UI text ${phrase}`);
});
