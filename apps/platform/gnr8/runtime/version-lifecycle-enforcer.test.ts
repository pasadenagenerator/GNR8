import assert from "node:assert/strict";
import test from "node:test";

import { assertLifecycleTransition } from "@/gnr8/runtime/version-lifecycle-rules";

test("version-lifecycle-enforcer allows canonical forward transitions", () => {
  assert.doesNotThrow(() => assertLifecycleTransition({ currentState: "DRAFT", nextState: "READY_FOR_REVIEW" }));
  assert.doesNotThrow(() => assertLifecycleTransition({ currentState: "READY_FOR_REVIEW", nextState: "APPROVED" }));
  assert.doesNotThrow(() => assertLifecycleTransition({ currentState: "APPROVED", nextState: "PUBLISHED" }));
  assert.doesNotThrow(() => assertLifecycleTransition({ currentState: "PUBLISHED", nextState: "ARCHIVED" }));
});

test("version-lifecycle-enforcer rejects invalid transitions", () => {
  assert.throws(() => assertLifecycleTransition({ currentState: "DRAFT", nextState: "APPROVED" }));
  assert.throws(() => assertLifecycleTransition({ currentState: "ARCHIVED", nextState: "PUBLISHED" }));
});
