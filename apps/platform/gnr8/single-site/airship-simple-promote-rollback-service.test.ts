import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeArtifact, CanonicalSiteVersionSnapshot } from "../runtime/types";
import {
  AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_CURRENT_POINTER,
  AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_RUNTIME_SITE_ID,
  AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_TARGET_POINTER,
  rollbackAirshipSimplePromoteToPreviousPointer,
  type AirshipPromoteAuditRecord,
  type AirshipSimplePromoteRollbackDependencies,
} from "./airship-simple-promote-rollback-service";

const MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const PROMOTE_AUDIT_ROW_ID = "d873b627-bab9-4868-9def-e4772fb71f37";
const OTHER_RUNTIME_SITE_ID = "site_other_runtime";

function input(overrides: Record<string, unknown> = {}) {
  return {
    migrationId: MIGRATION_ID,
    currentSiteVersionId: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_CURRENT_POINTER.siteVersionId,
    currentArtifactId: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_CURRENT_POINTER.artifactId,
    rollbackSiteVersionId: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_TARGET_POINTER.siteVersionId,
    rollbackArtifactId: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_TARGET_POINTER.artifactId,
    promoteAuditRowId: PROMOTE_AUDIT_ROW_ID,
    idempotencyKey: "airship-simple-promote-rollback:test-key",
    reason: "MVP recovery rollback readiness test",
    actorId: "superadmin-airship",
    ...overrides,
  };
}

function rollbackVersion(overrides: Partial<CanonicalSiteVersionSnapshot> = {}): CanonicalSiteVersionSnapshot {
  return {
    id: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_TARGET_POINTER.siteVersionId,
    siteId: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_RUNTIME_SITE_ID,
    versionNo: 11,
    state: "PUBLISHED",
    source: "manual",
    actor: "superadmin-test",
    createdAt: "2026-09-09T00:06:00.000Z",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    artifactId: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_TARGET_POINTER.artifactId,
    importProvenanceSummary: null,
    pages: [],
    ...overrides,
  };
}

function rollbackArtifact(overrides: Partial<RuntimeArtifact> = {}): RuntimeArtifact {
  return {
    id: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_TARGET_POINTER.artifactId,
    siteId: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_RUNTIME_SITE_ID,
    siteVersionId: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_TARGET_POINTER.siteVersionId,
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    bundleSha256: "0f1bb26bfcd6ea21d79fa2839842ae2be9f292d4b2b7abd504d7a2d34d6010fe",
    htmlByPath: { "/": "<html><body>CHS previous</body></html>" },
    compiledTokenStyles: "",
    assetFingerprintMap: {},
    manifest: {},
    publishStage: "shadow",
    shadowRestricted: false,
    artifactGovernance: {},
    createdAt: "2026-09-09T00:07:00.000Z",
    ...overrides,
  };
}

function promoteAudit(overrides: Partial<AirshipPromoteAuditRecord> = {}): AirshipPromoteAuditRecord {
  return {
    id: PROMOTE_AUDIT_ROW_ID,
    siteVersionId: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_CURRENT_POINTER.siteVersionId,
    source: "manual",
    details: {
      serviceVersion: "airship-22-simple-promote-to-live:v1",
      phase: "post_switch_readback",
      migrationId: MIGRATION_ID,
      previousActivePointer: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_TARGET_POINTER,
      targetCandidatePointer: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_CURRENT_POINTER,
      newActivePointer: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_CURRENT_POINTER,
      switched: true,
    },
    ...overrides,
  };
}

function deps(overrides: {
  auditRecord?: AirshipPromoteAuditRecord | null;
  version?: CanonicalSiteVersionSnapshot | null;
  artifactRecord?: RuntimeArtifact | null;
  activePointers?: Array<{ siteVersionId: string; artifactId: string } | null>;
  events?: string[];
} = {}): AirshipSimplePromoteRollbackDependencies & { events: string[]; auditDetails: Record<string, unknown>[] } {
  const events = overrides.events ?? [];
  const auditDetails: Record<string, unknown>[] = [];
  const activePointers = overrides.activePointers ?? [
    AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_CURRENT_POINTER,
    AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_TARGET_POINTER,
  ];
  let activeReadIndex = 0;
  return {
    events,
    auditDetails,
    auditRepository: {
      async readPromoteAudit() {
        events.push("read_promote_audit");
        return overrides.auditRecord === undefined ? promoteAudit() : overrides.auditRecord;
      },
    },
    async getSiteVersion(siteVersionId) {
      events.push(`get_site_version:${siteVersionId}`);
      return overrides.version === undefined ? rollbackVersion() : overrides.version;
    },
    async getArtifactById(artifactId) {
      events.push(`get_artifact:${artifactId}`);
      return overrides.artifactRecord === undefined ? rollbackArtifact() : overrides.artifactRecord;
    },
    async getActivePointerForSite(siteId) {
      events.push(`get_active_pointer:${siteId}`);
      const value = activePointers[Math.min(activeReadIndex, activePointers.length - 1)] ?? null;
      activeReadIndex += 1;
      return value;
    },
    async switchActivePointer(input) {
      events.push(`switch_active_pointer:${input.siteId}:${input.siteVersionId}:${input.artifactId}`);
      return {
        switched: true,
        previousActivePointer: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_CURRENT_POINTER,
      };
    },
    async recordPublishActivationAudit(input) {
      events.push(`audit:${String(input.details.phase)}`);
      auditDetails.push(input.details);
    },
  };
}

test("simple promote rollback rejects missing promote audit before pointer switch", async () => {
  const fakeDeps = deps({ auditRecord: null });

  await assert.rejects(
    () => rollbackAirshipSimplePromoteToPreviousPointer(input(), fakeDeps),
    /airship_simple_promote_rollback_promote_audit_missing/,
  );
  assert.equal(fakeDeps.events.includes("switch_active_pointer"), false);
  assert.equal(fakeDeps.events.some((event) => event.startsWith("audit:")), false);
});

test("simple promote rollback rejects current pointer mismatch", async () => {
  const fakeDeps = deps({
    activePointers: [{ siteVersionId: "33333333-3333-4333-8333-333333333333", artifactId: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_CURRENT_POINTER.artifactId }],
  });

  await assert.rejects(
    () => rollbackAirshipSimplePromoteToPreviousPointer(input(), fakeDeps),
    /airship_simple_promote_rollback_current_active_pointer_mismatch/,
  );
  assert.equal(fakeDeps.events.some((event) => event.startsWith("switch_active_pointer")), false);
  assert.equal(fakeDeps.events.includes("audit:pre_rollback"), false);
});

test("simple promote rollback rejects rollback target mismatch", async () => {
  await assert.rejects(
    () =>
      rollbackAirshipSimplePromoteToPreviousPointer(
        input({ rollbackArtifactId: "11111111-1111-4111-8111-111111111111" }),
        deps(),
      ),
    /airship_simple_promote_rollback_rollback_request_pointer_mismatch/,
  );
});

test("simple promote rollback rejects different runtime site target", async () => {
  const fakeDeps = deps({ version: rollbackVersion({ siteId: OTHER_RUNTIME_SITE_ID }) });

  await assert.rejects(
    () => rollbackAirshipSimplePromoteToPreviousPointer(input(), fakeDeps),
    /airship_simple_promote_rollback_target_runtime_site_mismatch/,
  );
  assert.equal(fakeDeps.events.some((event) => event.startsWith("switch_active_pointer")), false);
});

test("simple promote rollback rejects forbidden override fields", async () => {
  await assert.rejects(
    () => rollbackAirshipSimplePromoteToPreviousPointer(input({ actor: "request-actor", providerPayload: {}, publishChain: {} }), deps()),
    /airship_simple_promote_rollback_forbidden_field:actor/,
  );
});

test("simple promote rollback returns safe no-op when already rolled back", async () => {
  const fakeDeps = deps({
    activePointers: [AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_TARGET_POINTER],
  });
  const result = await rollbackAirshipSimplePromoteToPreviousPointer(input(), fakeDeps);

  assert.equal(result.outcome, "noop_already_rolled_back");
  assert.equal(result.noOp, true);
  assert.equal(result.rolledBack, false);
  assert.deepEqual(result.restoredPointer, AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_TARGET_POINTER);
  assert.equal(fakeDeps.events.some((event) => event.startsWith("switch_active_pointer")), false);
  assert.equal(fakeDeps.events.includes("audit:post_rollback_noop"), true);
});

test("simple promote rollback calls switchActivePointer only after all checks pass and records audits", async () => {
  const fakeDeps = deps();
  const result = await rollbackAirshipSimplePromoteToPreviousPointer(input(), fakeDeps);

  assert.equal(result.outcome, "rolled_back");
  assert.equal(result.rolledBack, true);
  assert.deepEqual(result.previousPointer, AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_CURRENT_POINTER);
  assert.deepEqual(result.currentPointer, AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_CURRENT_POINTER);
  assert.deepEqual(result.restoredPointer, AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_TARGET_POINTER);
  assert.equal(fakeDeps.events.indexOf("read_promote_audit") < fakeDeps.events.indexOf(`get_active_pointer:${AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_RUNTIME_SITE_ID}`), true);
  assert.equal(fakeDeps.events.indexOf("audit:pre_rollback") < fakeDeps.events.findIndex((event) => event.startsWith("switch_active_pointer")), true);
  assert.equal(fakeDeps.events.findIndex((event) => event.startsWith("switch_active_pointer")) < fakeDeps.events.lastIndexOf(`get_active_pointer:${AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_RUNTIME_SITE_ID}`), true);
  assert.equal(fakeDeps.events.lastIndexOf(`get_active_pointer:${AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_RUNTIME_SITE_ID}`) < fakeDeps.events.indexOf("audit:post_rollback_readback"), true);
  assert.equal(fakeDeps.auditDetails.length, 2);
  assert.equal(fakeDeps.auditDetails[0].phase, "pre_rollback");
  assert.equal(fakeDeps.auditDetails[0].promoteAuditRowId, PROMOTE_AUDIT_ROW_ID);
  assert.deepEqual(fakeDeps.auditDetails[0].expectedCurrentPointer, AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_CURRENT_POINTER);
  assert.deepEqual(fakeDeps.auditDetails[1].restoredActivePointer, AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_TARGET_POINTER);
});

test("simple promote rollback rejects promote audit before/after pointer mismatch", async () => {
  await assert.rejects(
    () =>
      rollbackAirshipSimplePromoteToPreviousPointer(
        input(),
        deps({
          auditRecord: promoteAudit({
            details: {
              ...promoteAudit().details,
              previousActivePointer: { siteVersionId: "22222222-2222-4222-8222-222222222222", artifactId: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_TARGET_POINTER.artifactId },
            },
          }),
        }),
      ),
    /airship_simple_promote_rollback_promote_audit_before_pointer_mismatch/,
  );

  await assert.rejects(
    () =>
      rollbackAirshipSimplePromoteToPreviousPointer(
        input(),
        deps({
          auditRecord: promoteAudit({
            details: {
              ...promoteAudit().details,
              targetCandidatePointer: { siteVersionId: "33333333-3333-4333-8333-333333333333", artifactId: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_CURRENT_POINTER.artifactId },
              newActivePointer: null,
            },
          }),
        }),
      ),
    /airship_simple_promote_rollback_promote_audit_after_pointer_mismatch/,
  );
});
