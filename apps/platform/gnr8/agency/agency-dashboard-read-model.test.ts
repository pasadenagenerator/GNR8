import assert from "node:assert/strict";
import test from "node:test";

import { assertAgencyScopedSiteSummaries } from "@/gnr8/agency/agency-dashboard-read-model";

test("assertAgencyScopedSiteSummaries allows rows within selected agency", () => {
  const selectedAgencyId = "00000000-0000-4000-8000-000000000011";

  assert.doesNotThrow(() => {
    assertAgencyScopedSiteSummaries(
      [
        {
          site_id: "site-1",
          domain: null,
          site_status: "live",
          client_id: null,
          client_name: null,
          agency_id: selectedAgencyId,
          ai_event_count: 0,
          ai_prompt_tokens: 0,
          ai_completion_tokens: 0,
          ai_total_tokens: 0,
          ai_estimated_cost_sum: 0,
          runtime_event_count: 0,
          runtime_request_count: 0,
          runtime_bandwidth_bytes: 0,
          runtime_compute_ms: 0,
          runtime_estimated_cost_sum: 0,
          migration_event_count: 0,
          migration_compute_units: 0,
          migration_estimated_cost_sum: 0,
          total_estimated_cost: 0,
          cost_completeness_status: "NO_SIGNAL",
          data_quality_flags: {
            has_zero_token_ai_events: false,
            missing_billing_account_in_ai_events: false,
            no_runtime_events_seen: true,
            no_migration_events_seen: true,
          },
          latest_signal_at: null,
          latest_runtime_site_version_id: null,
          latest_runtime_state: null,
          has_published_runtime_version: false,
          effective_status: "NOT_STARTED",
          auto_advanced: false,
          automation_reason: null,
        },
      ],
      selectedAgencyId,
    );
  });
});

test("assertAgencyScopedSiteSummaries fails closed when cross-agency row is present", () => {
  assert.throws(
    () => {
      assertAgencyScopedSiteSummaries(
        [
          {
            site_id: "site-2",
            domain: null,
            site_status: "live",
            client_id: null,
            client_name: null,
            agency_id: "00000000-0000-4000-8000-000000000099",
            ai_event_count: 0,
            ai_prompt_tokens: 0,
            ai_completion_tokens: 0,
            ai_total_tokens: 0,
            ai_estimated_cost_sum: 0,
            runtime_event_count: 0,
            runtime_request_count: 0,
            runtime_bandwidth_bytes: 0,
            runtime_compute_ms: 0,
            runtime_estimated_cost_sum: 0,
            migration_event_count: 0,
            migration_compute_units: 0,
            migration_estimated_cost_sum: 0,
            total_estimated_cost: 0,
            cost_completeness_status: "NO_SIGNAL",
            data_quality_flags: {
              has_zero_token_ai_events: false,
              missing_billing_account_in_ai_events: false,
              no_runtime_events_seen: true,
              no_migration_events_seen: true,
            },
            latest_signal_at: null,
            latest_runtime_site_version_id: null,
            latest_runtime_state: null,
            has_published_runtime_version: false,
            effective_status: "NOT_STARTED",
            auto_advanced: false,
            automation_reason: null,
          },
        ],
        "00000000-0000-4000-8000-000000000011",
      );
    },
    /agency scoping violation/i,
  );
});
