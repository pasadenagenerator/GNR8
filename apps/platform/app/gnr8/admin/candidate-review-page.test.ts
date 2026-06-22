import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PAGE_FILE = new URL("./candidate-review/[siteVersionId]/page.tsx", import.meta.url);
const CONTROLS_FILE = new URL("./candidate-review/[siteVersionId]/CandidateReviewActionControls.tsx", import.meta.url);
const CONTEXT_RUNTIME_FILE = new URL("../../../gnr8/architecture/candidate-context-review-runtime.ts", import.meta.url);

test("Candidate Review page keeps the canonical loader and superadmin guard", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes("Candidate Review"), true);
  assert.equal(source.includes("requireSuperadminUserIdForPage"), true);
  assert.equal(source.includes("loadLatestCandidateReviewSurfaceProjection"), true);
});

test("Candidate Review default view renders simplified operator labels", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  for (const label of [
    "Site version", "Review status", "Reviewed / total candidates", "Review summary",
    "Approved", "Rejected", "Deferred", "Needs review", "Type", "Route path",
    "Confidence", "Current decision", "Rationale",
  ]) assert.equal(source.includes(label), true, `missing ${label}`);

  for (const legacyHeading of [">Overview</h2>", ">Decision Summary</h2>", ">Latest Decisions</h2>", ">Event History</h2>"]) {
    assert.equal(source.includes(legacyHeading), false, `unexpected default heading ${legacyHeading}`);
  }
});

test("Candidate Review uses readable candidate names and keeps raw IDs in technical details", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  for (const label of [
    "Navigation section on ${route}", "Section on ${route}", "Route ${route}",
  ]) assert.equal(source.includes(label), true, `missing readable candidate label ${label}`);

  const candidateDetailsStart = source.indexOf("function CandidateTechnicalDetails");
  const candidateCardStart = source.indexOf("function CandidateCard");
  const candidateDetails = source.slice(candidateDetailsStart, candidateCardStart);
  assert.equal(candidateDetails.includes("<details"), true);
  assert.equal(candidateDetails.includes(">Candidate ID</dt>"), true);
  assert.equal(source.includes("<h3 style={{ margin: 0, fontSize: 18 }}>{candidate.candidateId}</h3>"), false);
});

test("artifact, validation, event, lineage, and supersession details are collapsed by default", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  const detailsStart = source.indexOf("function TechnicalDetails");
  const pageStart = source.indexOf("export default async function CandidateReviewPage");
  const details = source.slice(detailsStart, pageStart);

  assert.equal(details.includes("<details"), true);
  assert.equal(details.includes("<details open"), false);
  assert.equal(details.includes("Technical details"), true);
  assert.equal(details.includes("<OverviewDetails model={props.model}"), true);
  assert.equal(details.includes("<EventHistory model={props.model}"), true);
  assert.equal(details.includes("<Diagnostics model={props.model}"), true);

  for (const label of [
    "Artifact ref", "Review package ID", "Candidate Discovery artifact ID", "Review event ID",
    "Validation details and diagnostics", "Artifact refs and lineage", "supersession details",
  ]) assert.equal(source.includes(label), true, `missing technical detail ${label}`);
});

test("Candidate Review controls remain available for reviewed and unreviewed candidates", async () => {
  const pageSource = await readFile(PAGE_FILE, "utf8");
  const controlsSource = await readFile(CONTROLS_FILE, "utf8");
  assert.equal(pageSource.includes("<CandidateReviewActionControls"), true);
  assert.equal(pageSource.includes("candidateId={candidate.candidateId}"), true);
  assert.equal(pageSource.includes("candidateLabel={name}"), true);
  assert.equal(pageSource.includes("candidate={decision.candidate} decision={decision}"), true);
  assert.equal(pageSource.includes("candidate={candidate} actionTarget={actionTarget}"), true);
  assert.equal(controlsSource.includes("candidate-review-rationale:${props.candidateId}"), false);
  assert.equal(controlsSource.includes("useId()"), true);
  for (const label of ["Approve", "Reject", "Defer", "Optional rationale"]) {
    assert.equal(controlsSource.includes(label), true, `missing ${label}`);
  }
  assert.equal(controlsSource.includes("Decision saved:"), true);
  assert.equal(controlsSource.includes("Action succeeded:"), false);
});

test("Candidate Review controls show stale feedback and reload without automatic rebase", async () => {
  const source = await readFile(CONTROLS_FILE, "utf8");
  assert.equal(source.includes('response.errorCode === "STALE_REVIEW_PACKAGE"'), true);
  assert.equal(source.includes("Stale package: the latest Candidate Review package was reloaded."), true);
  assert.equal(source.includes("router.refresh()"), true);
  assert.equal(source.includes("auto" + "matic"), false);
});

test("Candidate Review page contains no forbidden or multi-candidate controls", async () => {
  const source = `${await readFile(PAGE_FILE, "utf8")}\n${await readFile(CONTROLS_FILE, "utf8")}`.toLowerCase();
  for (const phrase of [
    "ai control", "ai action", "start reconstruction", "reconstruction control", "reconstruction handoff",
    "publish candidate", "publishing control", "generated output", "edit candidate", "edit decision",
    "batch action", "bulk action", "select all", "multi-candidate", "tenant access", "customer access",
  ]) assert.equal(source.includes(phrase), false, `unexpected forbidden UI text ${phrase}`);
});

test("Candidate context is loaded from exact review lineage without new persistence", async () => {
  const source = await readFile(CONTEXT_RUNTIME_FILE, "utf8");
  assert.equal(source.includes("loadCandidateDiscoveryResultById"), true);
  assert.equal(source.includes("artifactId: input.candidateDiscoveryArtifactId"), true);
  assert.equal(source.includes("dryRunId: input.dryRunId"), true);
  assert.equal(source.includes("buildCandidateContextProjection"), true);
  for (const forbidden of ["persistCandidate", "insert(", "update(", "delete(", "fetch("]) {
    assert.equal(source.toLowerCase().includes(forbidden), false, `unexpected context runtime operation ${forbidden}`);
  }
});

test("View Context is collapsed by default and existing actions still render", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  const panelStart = source.indexOf("function CandidateContextPanel");
  const cardStart = source.indexOf("function CandidateCard");
  const panel = source.slice(panelStart, cardStart);
  assert.equal(panel.includes("View Context"), true);
  assert.equal(panel.includes("<details data-candidate-context-panel"), true);
  assert.equal(panel.includes("<details open"), false);
  assert.equal(source.includes("<CandidateReviewActionControls"), true);
});

test("Route, Navigation, and Section context render the screenshot and projected CSS overlay", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes("data-candidate-context-screenshot={projection.lineage.candidateType}"), true);
  assert.equal(source.includes("Full-page screenshot for"), true);
  assert.equal(source.includes("data-candidate-context-overlay={highlight.kind}"), true);
  assert.equal(source.includes("highlight.sourceViewportWidth"), true);
  assert.equal(source.includes("highlight.sourceDocumentHeight"), true);
  assert.equal(source.includes('border: "3px solid #f97316"'), true);
  assert.equal(source.includes("crop"), false);
});

test("context states and type-specific operator summaries are present", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  for (const label of [
    "Visual context incomplete", "Visual evidence unavailable", "Route summary",
    "Navigation item count", "Ordered labels", "Structural label", "Evidence summary",
  ]) assert.equal(source.includes(label), true, `missing context UI ${label}`);
  assert.equal(source.includes('context.projection.state === "incomplete"'), true);
  assert.equal(source.includes('context.projection.state === "unavailable"'), true);
});

test("context diagnostics remain in collapsed Technical details", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  const detailsStart = source.indexOf("function CandidateTechnicalDetails");
  const panelStart = source.indexOf("function CandidateContextPanel");
  const details = source.slice(detailsStart, panelStart);
  for (const label of ["Context diagnostics", "Screenshot artifact path", "Geometry evidence refs"]) {
    assert.equal(details.includes(label), true, `missing context technical detail ${label}`);
  }
  assert.equal(details.includes("<details"), true);
  assert.equal(details.includes("<details open"), false);
});
