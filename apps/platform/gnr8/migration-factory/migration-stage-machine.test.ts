import assert from "node:assert/strict";
import test from "node:test";

import { MIGRATION_STAGES } from "@/gnr8/migration-factory/migration-job-types";
import { createInitialStageStates, MIGRATION_STAGE_ORDER } from "@/gnr8/migration-factory/migration-stage-machine";

test("createInitialStageStates covers all migration stages", () => {
  const states = createInitialStageStates();
  const keys = Object.keys(states);

  assert.equal(keys.length, MIGRATION_STAGE_ORDER.length);
  for (const stage of MIGRATION_STAGES) {
    assert.ok(stage in states);
  }
});

