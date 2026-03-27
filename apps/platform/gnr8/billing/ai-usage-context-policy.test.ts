import assert from "node:assert/strict";
import test from "node:test";

import { AIUsageContextPolicyError, validateAIUsageContext } from "@/gnr8/billing/ai-usage-context-policy";

test("validateAIUsageContext fails when site_required is missing siteId", () => {
  assert.throws(
    () =>
      validateAIUsageContext({
        policy: "site_required",
        siteId: "   ",
        agencyId: "11111111-1111-4111-8111-111111111111",
      }),
    (error: unknown) => {
      assert.equal(error instanceof AIUsageContextPolicyError, true);
      if (!(error instanceof AIUsageContextPolicyError)) return false;
      assert.equal(error.code, "AI_USAGE_SITE_CONTEXT_REQUIRED");
      return true;
    },
  );
});

test("validateAIUsageContext fails when agency_required is missing both siteId and agencyId", () => {
  assert.throws(
    () =>
      validateAIUsageContext({
        policy: "agency_required",
        siteId: null,
        agencyId: "   ",
      }),
    (error: unknown) => {
      assert.equal(error instanceof AIUsageContextPolicyError, true);
      if (!(error instanceof AIUsageContextPolicyError)) return false;
      assert.equal(error.code, "AI_USAGE_AGENCY_CONTEXT_REQUIRED");
      return true;
    },
  );
});

test("validateAIUsageContext accepts agency_required when agencyId is present", () => {
  const result = validateAIUsageContext({
    policy: "agency_required",
    agencyId: "11111111-1111-4111-8111-111111111111",
  });

  assert.equal(result.policy, "agency_required");
  assert.equal(result.siteId, null);
  assert.equal(result.agencyId, "11111111-1111-4111-8111-111111111111");
  assert.equal(result.canLogUsage, true);
});

test("validateAIUsageContext accepts site_required when siteId is present", () => {
  const result = validateAIUsageContext({
    policy: "site_required",
    siteId: "22222222-2222-4222-8222-222222222222",
    agencyId: null,
  });

  assert.equal(result.policy, "site_required");
  assert.equal(result.siteId, "22222222-2222-4222-8222-222222222222");
  assert.equal(result.agencyId, null);
  assert.equal(result.canLogUsage, true);
});

test("validateAIUsageContext accepts optional_legacy without context but marks logging as unavailable", () => {
  const result = validateAIUsageContext({
    policy: "optional_legacy",
    siteId: "",
    agencyId: "",
  });

  assert.equal(result.policy, "optional_legacy");
  assert.equal(result.siteId, null);
  assert.equal(result.agencyId, null);
  assert.equal(result.canLogUsage, false);
});
