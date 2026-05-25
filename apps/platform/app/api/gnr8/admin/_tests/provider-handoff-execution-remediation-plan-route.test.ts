import assert from "node:assert/strict";
import test from "node:test";

import { createProviderHandoffExecutionRemediationPlanRouteHandlers } from "@/app/api/gnr8/admin/provider-handoffs/[handoffId]/execution-remediation-plan/provider-handoff-execution-remediation-plan-route-handlers";

test("provider handoff execution remediation plan route: returns evidence-only plan and executionAllowed false", async () => {
  const handlers = createProviderHandoffExecutionRemediationPlanRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    getProviderExecutionHandoffByHandoffId: async () => ({
      handoffId: "handoff_1",
      artifactId: "artifact_1",
      siteId: "11111111-1111-1111-1111-111111111111",
      siteVersionId: "22222222-2222-2222-2222-222222222222",
      providerId: "openprovider_sandbox",
      environment: "sandbox",
      capability: "domain_dns",
      operationKind: "upsert_dns_records",
      approvalStatus: "approved",
      riskLevel: "low",
      handoffStatus: "ready",
      plannedJobIds: ["job_1"],
      warnings: [],
      blockers: [],
      correlationKey: "corr_1",
      createdAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z",
    }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    resolveAgencyIdForSite: async () => "agency_1",
    requireAgencyActionContext: async () =>
      ({ userId: "user_1", agencyId: "agency_1", agencyName: "Agency", role: "owner", actorMode: "membership" }) as never,
    getProviderOperatorReviewsByHandoffId: async () => ({
      reviews: [
        {
          reviewId: "review_1",
          handoffId: "handoff_1",
          reviewerRef: "reviewer_1",
          reviewStatus: "approved_for_future_execution",
          reviewReason: "approved",
          intentOnly: true,
          executionBlocked: true,
          createdAt: "2026-05-25T00:00:00.000Z",
          correlationKey: "corr_review_1",
          diagnostics: ["OPERATOR_REVIEW_CREATED"],
        },
      ],
      diagnostics: [],
    }),
    getProviderGovernanceAuthorizationsByHandoffId: async () => ({
      authorizations: [
        {
          authorizationId: "auth_1",
          handoffId: "handoff_1",
          correlationKey: "corr_auth_1",
          authorizationStatus: "authorized_for_future_execution",
          authorizationReason: "intent",
          intentOnly: true,
          executionBlocked: true,
          createdAt: "2026-05-25T00:00:00.000Z",
          diagnostics: ["GOVERNANCE_AUTHORIZATION_CREATED"],
        },
      ],
      diagnostics: [],
    }),
  });

  const response = await handlers.GET(new Request("http://localhost/api/gnr8/admin/provider-handoffs/handoff_1/execution-remediation-plan"), {
    params: Promise.resolve({ handoffId: "handoff_1" }),
  });
  assert.equal(response.status, 200);

  const body = (await response.json()) as {
    executionAllowed: boolean;
    executionBlocked: boolean;
    executionRemediationPlan: {
      overallStatus: string;
      executionAllowed: boolean;
      executionBlocked: boolean;
      intentOnly: boolean;
      diagnostics: string[];
    };
  };

  assert.equal(body.executionAllowed, false);
  assert.equal(body.executionBlocked, true);
  assert.equal(body.executionRemediationPlan.executionAllowed, false);
  assert.equal(body.executionRemediationPlan.executionBlocked, true);
  assert.equal(body.executionRemediationPlan.intentOnly, true);
  assert.equal(body.executionRemediationPlan.overallStatus, "ready_but_execution_disabled");
  assert.equal(body.executionRemediationPlan.diagnostics.includes("EXECUTION_REMEDIATION_PLAN_CREATED"), true);
});
