import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

import {
  CONTINUITY_KNOWLEDGE_STATES,
  CONTINUITY_READINESS_DIMENSIONS,
  CONTINUITY_STATES,
  SOURCE_ASSET_REUSE_STATES,
  SOURCE_CONTENT_TRANSFORMATION_POLICIES,
  SOURCE_CONTENT_VISUAL_CONTINUITY_CONTRACT_VERSION,
} from "./source-content-visual-continuity-projection-contract";

test("VCU-2 contract exposes required states without canonical brand state", () => {
  assert.equal(SOURCE_CONTENT_VISUAL_CONTINUITY_CONTRACT_VERSION, "VCU-2");
  assert.deepEqual([...CONTINUITY_KNOWLEDGE_STATES], [
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
  assert.equal([...CONTINUITY_STATES].includes("preserve_candidate"), true);
  assert.equal([...CONTINUITY_STATES].includes("licensing_unresolved"), true);
  assert.equal(JSON.stringify(CONTINUITY_STATES).includes("canonical"), false);
});

test("VCU-2 contract includes conservative policies, reuse states, and readiness dimensions", () => {
  for (const policy of [
    "PRESERVE_VERBATIM",
    "PRESERVE_WITH_CLEANUP",
    "IMPROVE_PRESERVING_MEANING",
    "REQUIRE_CONFIRMATION",
    "PROHIBIT_AUTOMATIC_GENERATION",
  ]) {
    assert.equal([...SOURCE_CONTENT_TRANSFORMATION_POLICIES].includes(policy as never), true);
  }
  for (const state of ["requires_confirmation", "licensing_unresolved", "technically_unusable", "unresolved"]) {
    assert.equal([...SOURCE_ASSET_REUSE_STATES].includes(state as never), true);
  }
  for (const dimension of [
    "source_content_capture",
    "asset_usage_evidence",
    "logo_candidate_coverage",
    "typography_coverage",
    "screenshot_availability",
    "generation_delivery_readiness",
  ]) {
    assert.equal([...CONTINUITY_READINESS_DIMENSIONS].includes(dimension as never), true);
  }
});

test("VCU-2 does not add a projection persistence module", async () => {
  await assert.rejects(
    access(new URL("./source-content-visual-continuity-projection-persistence.ts", import.meta.url)),
    /ENOENT/,
  );
});
