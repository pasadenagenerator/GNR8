import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  AAF_SINGLE_SITE_CLIENT_APPROVAL_ACTION,
  AAF_SINGLE_SITE_CLIENT_APPROVAL_CONTRACT,
  AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE,
  AAF_SINGLE_SITE_CLIENT_APPROVAL_SUBJECT_TYPE,
  AAF_SINGLE_SITE_CONTENT_APPROVAL_ACTION,
  AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT,
  AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE,
  AAF_SINGLE_SITE_CONTENT_APPROVAL_SUBJECT_TYPE,
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_ACTION,
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE,
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SUBJECT_TYPE,
  AAF_SINGLE_SITE_LAUNCH_APPROVAL_ACTION,
  AAF_SINGLE_SITE_LAUNCH_APPROVAL_CONTRACT,
  AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE,
  AAF_SINGLE_SITE_LAUNCH_APPROVAL_SUBJECT_TYPE,
  AAF_SCOPE_PROHIBITED_ACTIONS,
  AAF_SCOPE_REPLAY_CLASS,
} from "@gnr8/runtime-contracts";

import {
  actionIsProhibitedForScope,
  exactScopeMatches,
  exactSubjectMatches,
  mapApprovalStatusToGateResult,
  mapFailClosedConditionToGateResult,
  mapFreshnessResultToGateResult,
} from "./aaf-policy-gate-facade";

const SOURCE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "aaf-policy-gate-facade.ts");

test("AAF policy/gate facade is server-only and non-executing", () => {
  const source = fs.readFileSync(SOURCE_PATH, "utf8");
  assert.match(source, /^import "server-only";/);
  assert.doesNotMatch(source, /publishDraftContentOverrides|activatePublish|rollback|openprovider|stripe|vercel/i);
  assert.doesNotMatch(source, /update public\.(?!gnr8_aaf_)|delete from public\.(?!gnr8_aaf_)/);
});

test("exact scope matching requires every tenant/client/site/batch/job/domain/cost field to match", () => {
  const input = {
    tenantId: "tenant-1",
    clientId: "client-1",
    siteId: "site-1",
    batchId: null,
    jobId: null,
    siteVersionId: "version-1",
    domainId: null,
    costCenterId: null,
  };
  assert.equal(
    exactScopeMatches(input, {
      tenant_id: "tenant-1",
      client_id: "client-1",
      site_id: "site-1",
      batch_id: null,
      job_id: null,
      site_version_id: "version-1",
      domain_id: null,
      cost_center_id: null,
    }),
    true,
  );
  assert.equal(
    exactScopeMatches(input, {
      tenant_id: "tenant-1",
      client_id: "client-2",
      site_id: "site-1",
      site_version_id: "version-1",
    }),
    false,
  );
});

test("subject matching is exact by type and id", () => {
  assert.equal(exactSubjectMatches({ subjectType: "site_version", subjectId: "v1" }, { subject_type: "site_version", subject_id: "v1" }), true);
  assert.equal(exactSubjectMatches({ subjectType: "site_version", subjectId: "v1" }, { subject_type: "site", subject_id: "v1" }), false);
  assert.equal(exactSubjectMatches({ subjectType: "site_version", subjectId: "v1" }, { subject_type: "site_version", subject_id: "v2" }), false);
});

test("freshness results map deterministically to gate results", () => {
  assert.equal(mapFreshnessResultToGateResult("fresh"), "allowed");
  assert.equal(mapFreshnessResultToGateResult("stale"), "evidence_stale");
  assert.equal(mapFreshnessResultToGateResult("partial_timeline"), "evidence_stale");
  assert.equal(mapFreshnessResultToGateResult("failed"), "blocked");
});

test("approval statuses map deterministically to gate results", () => {
  assert.equal(mapApprovalStatusToGateResult("granted"), "allowed");
  assert.equal(mapApprovalStatusToGateResult("granted_with_limitations"), "blocked");
  assert.equal(mapApprovalStatusToGateResult("granted_with_limitations", { scope: "publish_activation", limitationsPresent: false }), "blocked");
  assert.equal(mapApprovalStatusToGateResult("granted_with_limitations", { scope: "publish_activation", limitationsPresent: true }), "allowed");
  assert.equal(
    mapApprovalStatusToGateResult("granted_with_limitations", {
      scope: AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE,
      limitationsPresent: false,
    }),
    "blocked",
  );
  assert.equal(
    mapApprovalStatusToGateResult("granted_with_limitations", {
      scope: AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE,
      limitationsPresent: true,
    }),
    "allowed",
  );
  assert.equal(
    mapApprovalStatusToGateResult("granted_with_limitations", {
      scope: AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE,
      limitationsPresent: true,
    }),
    "allowed",
  );
  assert.equal(
    mapApprovalStatusToGateResult("granted_with_limitations", {
      scope: AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE,
      limitationsPresent: true,
    }),
    "allowed",
  );
  assert.equal(mapApprovalStatusToGateResult("rejected"), "blocked");
  assert.equal(mapApprovalStatusToGateResult("cancelled"), "blocked");
  assert.equal(mapApprovalStatusToGateResult("revoked"), "approval_revoked");
  assert.equal(mapApprovalStatusToGateResult("expired"), "approval_stale");
  assert.equal(mapApprovalStatusToGateResult("superseded"), "approval_superseded");
  assert.equal(mapApprovalStatusToGateResult("not_required_by_policy"), "not_required_by_policy");
});

test("prohibited scope overreach preserves AAF scope separation rules", () => {
  assert.equal(actionIsProhibitedForScope("launch_signoff", "publish_activation"), true);
  assert.equal(actionIsProhibitedForScope("client_review", "publish_activation"), true);
  assert.equal(actionIsProhibitedForScope("domain_action", "dns_mutation"), true);
  assert.equal(actionIsProhibitedForScope("domain_exception", "publish_activation"), true);
  assert.equal(actionIsProhibitedForScope("ai_advisory_plan_acceptance", "ai_execution"), true);
  assert.equal(actionIsProhibitedForScope("publish_activation", "publish.activation"), false);
});

test("single-site implementation authorization requires exact scope and subject matching", () => {
  const input = {
    tenantId: "tenant-1",
    clientId: "client-1",
    siteId: "site-1",
    batchId: null,
    jobId: null,
    siteVersionId: null,
    domainId: null,
    costCenterId: null,
  };
  assert.equal(
    exactScopeMatches(input, {
      tenant_id: "tenant-1",
      client_id: "client-1",
      site_id: "site-1",
      batch_id: null,
      job_id: null,
      site_version_id: null,
      domain_id: null,
      cost_center_id: null,
      scope: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE,
    }),
    true,
  );
  assert.equal(
    exactScopeMatches(input, {
      tenant_id: "tenant-1",
      client_id: "client-1",
      site_id: "other-site",
      batch_id: null,
      job_id: null,
      site_version_id: null,
      domain_id: null,
      cost_center_id: null,
      scope: "publish_activation",
    }),
    false,
  );
  assert.equal(
    exactSubjectMatches(
      {
        subjectType: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SUBJECT_TYPE,
        subjectId: "proposal-plan-1",
      },
      {
        subject_type: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SUBJECT_TYPE,
        subject_id: "proposal-plan-1",
      },
    ),
    true,
  );
  assert.equal(
    exactSubjectMatches(
      {
        subjectType: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SUBJECT_TYPE,
        subjectId: "proposal-plan-1",
      },
      {
        subject_type: "site_version",
        subject_id: "proposal-plan-1",
      },
    ),
    false,
  );
});

test("single-site implementation authorization does not imply downstream approval scopes", () => {
  assert.equal(AAF_SCOPE_REPLAY_CLASS[AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE], "not_replayable");
  assert.equal(actionIsProhibitedForScope(AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE, AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_ACTION), false);
  for (const prohibitedAction of [
    "proposal_approval",
    "clone_review_acceptance",
    "client_approval",
    "content_approval",
    "launch_approval",
    "publish_activation",
    "domain_readiness",
    "ddom_readiness",
    "ai_execution",
    "command_center_status",
    "ops_inbox_resolution",
    "generated_proposal_bundle_authorization",
  ]) {
    assert.equal(actionIsProhibitedForScope(AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE, prohibitedAction), true);
    assert.equal(
      AAF_SCOPE_PROHIBITED_ACTIONS.single_site_improvement_implementation_authorization.includes(prohibitedAction),
      true,
    );
  }
});

test("single-site content approval requires exact scope and subject matching", () => {
  const input = {
    tenantId: "tenant-1",
    clientId: "client-1",
    siteId: "site-1",
    batchId: null,
    jobId: null,
    siteVersionId: "improved-version-1",
    domainId: null,
    costCenterId: null,
  };
  assert.equal(
    exactScopeMatches(input, {
      tenant_id: "tenant-1",
      client_id: "client-1",
      site_id: "site-1",
      batch_id: null,
      job_id: null,
      site_version_id: "improved-version-1",
      domain_id: null,
      cost_center_id: null,
      scope: AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE,
    }),
    true,
  );
  assert.equal(
    exactScopeMatches(input, {
      tenant_id: "tenant-1",
      client_id: "client-1",
      site_id: "site-1",
      batch_id: null,
      job_id: null,
      site_version_id: "other-improved-version",
      domain_id: null,
      cost_center_id: null,
      scope: AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE,
    }),
    false,
  );
  assert.equal(
    exactSubjectMatches(
      {
        subjectType: AAF_SINGLE_SITE_CONTENT_APPROVAL_SUBJECT_TYPE,
        subjectId: "improved-review-1",
      },
      {
        subject_type: AAF_SINGLE_SITE_CONTENT_APPROVAL_SUBJECT_TYPE,
        subject_id: "improved-review-1",
      },
    ),
    true,
  );
  assert.equal(
    exactSubjectMatches(
      {
        subjectType: AAF_SINGLE_SITE_CONTENT_APPROVAL_SUBJECT_TYPE,
        subjectId: "improved-review-1",
      },
      {
        subject_type: "site_version",
        subject_id: "improved-review-1",
      },
    ),
    false,
  );
});

test("single-site content approval fails closed for adjacent approval and readiness substitutions", () => {
  assert.equal(AAF_SCOPE_REPLAY_CLASS[AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE], "not_replayable");
  assert.equal(actionIsProhibitedForScope(AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE, AAF_SINGLE_SITE_CONTENT_APPROVAL_ACTION), false);
  for (const prohibitedAction of [
    "improved_version_review_acceptance",
    "proposal_approval",
    "implementation_authorization",
    "source_evidence_review_acceptance",
    "clone_review_acceptance",
    "client_approval",
    "launch_approval",
    "publish_activation",
    "publish_activation_approval",
    "domain_readiness",
    "domain_mutation",
    "ddom_readiness",
    "dns_readiness",
    "dns_mutation",
    "billing_readiness",
    "billing_activation",
    "subscription_readiness",
    "hosting_activation",
    "content_publish",
    "content_rollback",
    "preview_rendering_approval",
    "public_runtime_rendering_approval",
    "runtime_mutation",
    "ai_approval",
    "ai_execution",
    "provider_output_authorization",
    "generated_proposal_bundle_authorization",
    "command_center_status",
    "ops_inbox_resolution",
    "chat_transcript_authorization",
  ]) {
    assert.equal(actionIsProhibitedForScope(AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE, prohibitedAction), true);
    assert.equal(AAF_SCOPE_PROHIBITED_ACTIONS.single_site_content_approval.includes(prohibitedAction), true);
  }
});

test("single-site content approval does not imply client, launch, publish, domain, DNS, billing, or runtime approval", () => {
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT.allowedAction, AAF_SINGLE_SITE_CONTENT_APPROVAL_ACTION);
  for (const forbiddenBoundaryAction of [
    "client_approval",
    "launch_approval",
    "publish_activation",
    "publish_activation_approval",
    "domain_readiness",
    "dns_readiness",
    "billing_readiness",
    "runtime_mutation",
  ]) {
    assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT.prohibitedActions.includes(forbiddenBoundaryAction), true);
  }
});

test("single-site content approval limited grants are scoped and require carried limitations", () => {
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT.allowedDecisionStatuses.includes("granted_with_limitations"), true);
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT.requiredSubjectRefs.includes("limitations"), true);
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT.requiredEvidenceRefs.includes("known_limitations"), true);
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT.requiredFreshnessBehavior.includes("limitations_current_and_carried_forward"), true);
  assert.equal(
    mapApprovalStatusToGateResult("granted_with_limitations", {
      scope: AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE,
      limitationsPresent: true,
    }),
    "allowed",
  );
});

test("single-site client approval requires exact scope and subject matching", () => {
  const input = {
    tenantId: "tenant-1",
    clientId: "client-1",
    siteId: "site-1",
    batchId: null,
    jobId: null,
    siteVersionId: "improved-version-1",
    domainId: null,
    costCenterId: null,
  };
  assert.equal(
    exactScopeMatches(input, {
      tenant_id: "tenant-1",
      client_id: "client-1",
      site_id: "site-1",
      batch_id: null,
      job_id: null,
      site_version_id: "improved-version-1",
      domain_id: null,
      cost_center_id: null,
      scope: AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE,
    }),
    true,
  );
  assert.equal(
    exactScopeMatches(input, {
      tenant_id: "tenant-1",
      client_id: "client-1",
      site_id: "site-1",
      batch_id: null,
      job_id: null,
      site_version_id: "different-version",
      domain_id: null,
      cost_center_id: null,
      scope: AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE,
    }),
    false,
  );
  assert.equal(
    exactSubjectMatches(
      {
        subjectType: AAF_SINGLE_SITE_CLIENT_APPROVAL_SUBJECT_TYPE,
        subjectId: "client-acceptance-1",
      },
      {
        subject_type: AAF_SINGLE_SITE_CLIENT_APPROVAL_SUBJECT_TYPE,
        subject_id: "client-acceptance-1",
      },
    ),
    true,
  );
  assert.equal(
    exactSubjectMatches(
      {
        subjectType: AAF_SINGLE_SITE_CLIENT_APPROVAL_SUBJECT_TYPE,
        subjectId: "client-acceptance-1",
      },
      {
        subject_type: AAF_SINGLE_SITE_LAUNCH_APPROVAL_SUBJECT_TYPE,
        subject_id: "client-acceptance-1",
      },
    ),
    false,
  );
});

test("single-site launch approval requires exact scope and subject matching", () => {
  const input = {
    tenantId: "tenant-1",
    clientId: "client-1",
    siteId: "site-1",
    batchId: null,
    jobId: null,
    siteVersionId: "improved-version-1",
    domainId: null,
    costCenterId: null,
  };
  assert.equal(
    exactScopeMatches(input, {
      tenant_id: "tenant-1",
      client_id: "client-1",
      site_id: "site-1",
      batch_id: null,
      job_id: null,
      site_version_id: "improved-version-1",
      domain_id: null,
      cost_center_id: null,
      scope: AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE,
    }),
    true,
  );
  assert.equal(
    exactScopeMatches(input, {
      tenant_id: "tenant-1",
      client_id: "client-other",
      site_id: "site-1",
      batch_id: null,
      job_id: null,
      site_version_id: "improved-version-1",
      domain_id: null,
      cost_center_id: null,
      scope: AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE,
    }),
    false,
  );
  assert.equal(
    exactSubjectMatches(
      {
        subjectType: AAF_SINGLE_SITE_LAUNCH_APPROVAL_SUBJECT_TYPE,
        subjectId: "launch-review-1",
      },
      {
        subject_type: AAF_SINGLE_SITE_LAUNCH_APPROVAL_SUBJECT_TYPE,
        subject_id: "launch-review-1",
      },
    ),
    true,
  );
  assert.equal(
    exactSubjectMatches(
      {
        subjectType: AAF_SINGLE_SITE_LAUNCH_APPROVAL_SUBJECT_TYPE,
        subjectId: "launch-review-1",
      },
      {
        subject_type: AAF_SINGLE_SITE_CLIENT_APPROVAL_SUBJECT_TYPE,
        subject_id: "launch-review-1",
      },
    ),
    false,
  );
});

test("single-site client approval does not imply launch approval", () => {
  assert.equal(AAF_SCOPE_REPLAY_CLASS[AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE], "not_replayable");
  assert.equal(actionIsProhibitedForScope(AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE, AAF_SINGLE_SITE_CLIENT_APPROVAL_ACTION), false);
  assert.equal(actionIsProhibitedForScope(AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE, "launch_approval"), true);
  assert.equal(actionIsProhibitedForScope(AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE, "single_site_launch_approval"), true);
  assert.equal(AAF_SINGLE_SITE_CLIENT_APPROVAL_CONTRACT.prohibitedActions.includes("launch_approval"), true);
});

test("single-site launch approval does not imply publish, domain, DNS, billing, or subscription readiness", () => {
  assert.equal(AAF_SCOPE_REPLAY_CLASS[AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE], "not_replayable");
  assert.equal(actionIsProhibitedForScope(AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE, AAF_SINGLE_SITE_LAUNCH_APPROVAL_ACTION), false);
  for (const prohibitedAction of [
    "publish_activation",
    "publish_activation_approval",
    "domain_readiness",
    "dns_readiness",
    "billing_readiness",
    "subscription_readiness",
    "ddom_readiness",
    "pasr_shadow_readiness",
    "ptt_publish_target_readiness",
  ]) {
    assert.equal(actionIsProhibitedForScope(AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE, prohibitedAction), true);
    assert.equal(AAF_SINGLE_SITE_LAUNCH_APPROVAL_CONTRACT.prohibitedActions.includes(prohibitedAction), true);
  }
});

test("single-site client and launch approval limited grants are scoped and require carried limitations", () => {
  for (const scope of [AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE, AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE]) {
    assert.equal(mapApprovalStatusToGateResult("granted_with_limitations", { scope, limitationsPresent: false }), "blocked");
    assert.equal(mapApprovalStatusToGateResult("granted_with_limitations", { scope, limitationsPresent: true }), "allowed");
  }
  assert.equal(AAF_SINGLE_SITE_CLIENT_APPROVAL_CONTRACT.requiredSubjectRefs.includes("limitations"), true);
  assert.equal(AAF_SINGLE_SITE_LAUNCH_APPROVAL_CONTRACT.requiredSubjectRefs.includes("limitations"), true);
  assert.equal(AAF_SINGLE_SITE_LAUNCH_APPROVAL_CONTRACT.requiredFreshnessBehavior.includes("limitations_current_and_carried_forward"), true);
});

test("fail-closed persistence failures map without representing an executable action", () => {
  assert.equal(mapFailClosedConditionToGateResult("policy_write"), "fail_closed");
  assert.equal(mapFailClosedConditionToGateResult("gate_write"), "fail_closed");
  assert.equal(mapFailClosedConditionToGateResult("audit_write"), "audit_unavailable");
});
