import assert from "node:assert/strict";
import test from "node:test";

import { resolveMigrationPipelineStatus } from "@/gnr8/command-center/migration-state-automation";

test("auto-advances from NOT_STARTED to PREVIEW_READY when runtime is ready for review", () => {
  const result = resolveMigrationPipelineStatus({
    previous_status: "NOT_STARTED",
    evidence: {
      site_status: "active",
      migration_event_count: 1,
      latest_runtime_state: "READY_FOR_REVIEW",
      latest_runtime_site_version_id: "9d75fd74-03e9-4fc5-ad16-412910f9f48a",
      has_published_runtime_version: false,
    },
  });

  assert.equal(result.effective_status, "PREVIEW_READY");
  assert.equal(result.auto_advanced, true);
  assert.equal(result.automation_reason, "runtime_state_ready_for_review");
});

test("derives LIVE from published runtime history even when latest runtime state is missing", () => {
  const result = resolveMigrationPipelineStatus({
    previous_status: "IMPORTED",
    evidence: {
      site_status: "active",
      migration_event_count: 1,
      latest_runtime_state: null,
      latest_runtime_site_version_id: null,
      has_published_runtime_version: true,
    },
  });

  assert.equal(result.effective_status, "LIVE");
  assert.equal(result.auto_advanced, true);
  assert.equal(result.automation_reason, "published_runtime_history_present");
});

test("returns ERROR for unknown runtime lifecycle states and does not auto-advance", () => {
  const result = resolveMigrationPipelineStatus({
    previous_status: "IMPORTED",
    evidence: {
      site_status: "active",
      migration_event_count: 1,
      latest_runtime_state: "UNRECOGNIZED_STATE",
      latest_runtime_site_version_id: "b3389c2e-e177-47b1-ab1f-453fe0773191",
      has_published_runtime_version: false,
    },
  });

  assert.equal(result.effective_status, "ERROR");
  assert.equal(result.auto_advanced, false);
  assert.equal(result.automation_reason, null);
});

