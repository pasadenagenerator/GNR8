import assert from "node:assert/strict";
import test from "node:test";

import {
  SOURCE_WEBSITE_KNOWLEDGE_STATES,
  SOURCE_WEBSITE_READINESS_DIMENSION_KEYS,
  SOURCE_WEBSITE_UNDERSTANDING_CONTRACT_VERSION,
} from "./source-website-understanding-projection-contract";

test("source website understanding contract preserves WU-1 knowledge states", () => {
  assert.equal(SOURCE_WEBSITE_UNDERSTANDING_CONTRACT_VERSION, "WU-2");
  assert.deepEqual([...SOURCE_WEBSITE_KNOWLEDGE_STATES], [
    "observed",
    "structured",
    "candidate",
    "reviewed",
    "confirmed_source_fact",
    "rejected",
    "conflicting",
    "missing",
    "unavailable",
  ]);
});

test("source website understanding contract defines required readiness dimensions", () => {
  assert.deepEqual([...SOURCE_WEBSITE_READINESS_DIMENSION_KEYS], [
    "source_acquisition",
    "route_coverage",
    "navigation_coverage",
    "structure_coverage",
    "content_coverage",
    "asset_inventory",
    "candidate_coverage",
    "candidate_review",
    "visual_identity_signals",
    "business_signal_candidates",
    "evidence_quality",
    "unresolved_conflicts",
  ]);
});
