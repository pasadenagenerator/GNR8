import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { AafApprovalScope } from "@gnr8/runtime-contracts";

import { buildPublishActivationSourceWatermark, type PublishActivationEvidenceReaderInput } from "./aaf-publish-activation-evidence-builder";
import { AafPublishActivationSourceReader } from "./aaf-publish-activation-source-reader";
import type {
  AafActivePointerSourceRow,
  AafApprovalTimelineSourceRow,
  AafContentOverrideAggregateSourceRow,
  AafDdomReadinessSourceRow,
  AafPublishActivationSourceReadClient,
  AafPublishActivationSourceReadRepositoryLike,
  AafPublishTargetSourceRow,
  AafRuntimeArtifactSourceRow,
  AafSiteVersionSourceRow,
} from "./aaf-publish-activation-source-read-repository";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_READER_PATH = path.join(TEST_DIR, "aaf-publish-activation-source-reader.ts");
const SOURCE_REPOSITORY_PATH = path.join(TEST_DIR, "aaf-publish-activation-source-read-repository.ts");

const capturedAt = "2026-07-27T10:00:00.000Z";

type FakeRows = {
  siteVersion: AafSiteVersionSourceRow | null;
  runtimeArtifact: AafRuntimeArtifactSourceRow | null;
  activePointer: AafActivePointerSourceRow | null;
  publishTarget: AafPublishTargetSourceRow | null;
  ddom: AafDdomReadinessSourceRow | null;
  content: AafContentOverrideAggregateSourceRow;
  approvals: Partial<Record<AafApprovalScope, AafApprovalTimelineSourceRow | null>>;
};

class FakeReadRepository implements AafPublishActivationSourceReadRepositoryLike {
  constructor(readonly rows: FakeRows) {}

  async withReadOnlyTransaction<T>(fn: (client: AafPublishActivationSourceReadClient, capturedAt: string) => Promise<T>): Promise<T> {
    return fn({ async query() { return { rows: [], rowCount: 0 }; } }, capturedAt);
  }

  async readSiteVersion(): Promise<AafSiteVersionSourceRow | null> {
    return this.rows.siteVersion;
  }

  async readRuntimeArtifact(): Promise<AafRuntimeArtifactSourceRow | null> {
    return this.rows.runtimeArtifact;
  }

  async readActivePointer(): Promise<AafActivePointerSourceRow | null> {
    return this.rows.activePointer;
  }

  async readPublishTarget(): Promise<AafPublishTargetSourceRow | null> {
    return this.rows.publishTarget;
  }

  async readLatestDdomReadiness(): Promise<AafDdomReadinessSourceRow | null> {
    return this.rows.ddom;
  }

  async readPublishedContentOverrideAggregate(): Promise<AafContentOverrideAggregateSourceRow> {
    return this.rows.content;
  }

  async readApprovalTimeline(_client: unknown, input: { scope: AafApprovalScope }): Promise<AafApprovalTimelineSourceRow | null> {
    return this.rows.approvals[input.scope] ?? null;
  }
}

function baseInput(overrides: Partial<PublishActivationEvidenceReaderInput> = {}): PublishActivationEvidenceReaderInput {
  return {
    tenantId: "tenant-test",
    clientId: "client-test",
    siteId: "site-test",
    siteVersionId: "11111111-1111-4111-8111-111111111111",
    runtimeArtifactId: "22222222-2222-4222-8222-222222222222",
    intendedPublishTarget: "production",
    trustedPublishEnvironment: "production",
    intendedPublishStage: "production",
    contentOverrideStateRequired: true,
    launchSignoffRequiredByPolicy: true,
    publishActivationApprovalRef: {
      approvalRequestId: "33333333-3333-4333-8333-333333333333",
      approvalDecisionId: "44444444-4444-4444-8444-444444444444",
      scope: "publish_activation",
    },
    ...overrides,
  };
}

function siteVersion(overrides: Partial<AafSiteVersionSourceRow> = {}): AafSiteVersionSourceRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    site_id: "site-test",
    version_no: 7,
    state: "APPROVED",
    source: "migration",
    actor: "system",
    renderer_compatibility_version: "runtime-v1",
    import_provenance_summary: { sourceUrl: "https://example.test" },
    artifact_id: "22222222-2222-4222-8222-222222222222",
    created_at: "2026-07-27T08:00:00.000Z",
    updated_at: "2026-07-27T09:00:00.000Z",
    ...overrides,
  };
}

function artifact(overrides: Partial<AafRuntimeArtifactSourceRow> = {}): AafRuntimeArtifactSourceRow {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    site_id: "site-test",
    site_version_id: "11111111-1111-4111-8111-111111111111",
    renderer_compatibility_version: "runtime-v1",
    bundle_sha256: "bundle-sha-test",
    html_path_count: "2",
    asset_fingerprint_count: "3",
    manifest: { routes: ["/"] },
    publish_stage: "production",
    shadow_restricted: false,
    artifact_governance: { immutable: true },
    created_at: "2026-07-27T09:05:00.000Z",
    ...overrides,
  };
}

function activePointer(overrides: Partial<AafActivePointerSourceRow> = {}): AafActivePointerSourceRow {
  return {
    site_id: "site-test",
    active_site_version_id: "99999999-9999-4999-8999-999999999999",
    active_artifact_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    updated_at: "2026-07-27T09:10:00.000Z",
    ...overrides,
  };
}

function target(overrides: Partial<AafPublishTargetSourceRow> = {}): AafPublishTargetSourceRow {
  return {
    id: "production",
    environment: "production",
    target_kind: "public_runtime",
    publish_stage: "production",
    status: "active",
    policy_version: "ptt-1",
    requires_aaf: true,
    requires_ddom_snapshot: true,
    requires_launch_signoff: true,
    allowed_artifact_stages: ["production"],
    limitations_json: {},
    source_watermark: "ptt-1:gnr8_publish_targets:production",
    created_at: "2026-07-27T08:00:00.000Z",
    updated_at: "2026-07-27T09:20:00.000Z",
    ...overrides,
  };
}

function ddom(overrides: Partial<AafDdomReadinessSourceRow> = {}): AafDdomReadinessSourceRow {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    tenant_id: "tenant-test",
    client_id: "client-test",
    site_id: "site-test",
    site_version_id: "11111111-1111-4111-8111-111111111111",
    domain_binding_id: null,
    host_binding_id: null,
    domain: "example.test",
    internal_host: null,
    intended_launch_domain: "example.test",
    readiness_state: "ready",
    readiness_blockers: [],
    readiness_warnings: [],
    freshness_state: "fresh",
    fresh_until: "2026-07-27T11:00:00.000Z",
    stale_reason: null,
    captured_at: "2026-07-27T09:25:00.000Z",
    source_watermark: "ddom-watermark-ready",
    source_watermark_json: { domain: "example.test" },
    snapshot_json: { ready: true },
    created_at: "2026-07-27T09:25:01.000Z",
    ...overrides,
  };
}

function content(overrides: Partial<AafContentOverrideAggregateSourceRow> = {}): AafContentOverrideAggregateSourceRow {
  return {
    site_id: "site-test",
    site_version_id: "11111111-1111-4111-8111-111111111111",
    published_count: "2",
    max_updated_at: "2026-07-27T09:30:00.000Z",
    rows_watermark_json: [
      { id: "content-1", slotKey: "hero.title", valueJson: { value: "Hello" }, updatedAt: "2026-07-27T09:30:00.000Z" },
      { id: "content-2", slotKey: "hero.body", valueJson: { value: "World" }, updatedAt: "2026-07-27T09:29:00.000Z" },
    ],
    ...overrides,
  };
}

function approval(scope: AafApprovalScope, overrides: Partial<AafApprovalTimelineSourceRow> = {}): AafApprovalTimelineSourceRow {
  const requestId = scope === "launch_signoff" ? "66666666-6666-4666-8666-666666666666" : "33333333-3333-4333-8333-333333333333";
  const decisionId = scope === "launch_signoff" ? "77777777-7777-4777-8777-777777777777" : "44444444-4444-4444-8444-444444444444";
  return {
    approval_request_id: requestId,
    approval_decision_id: decisionId,
    tenant_id: "tenant-test",
    client_id: "client-test",
    site_id: "site-test",
    batch_id: null,
    job_id: null,
    site_version_id: "11111111-1111-4111-8111-111111111111",
    domain_id: null,
    cost_center_id: null,
    scope,
    subject_type: "site_version",
    subject_id: "11111111-1111-4111-8111-111111111111",
    request_status: "requested",
    request_policy_version: "PASR-1",
    requested_expires_at: null,
    request_created_at: "2026-07-27T09:35:00.000Z",
    decision_status: "granted",
    decided_at: "2026-07-27T09:40:00.000Z",
    decision_policy_version: "PASR-1",
    evidence_package_id: "88888888-8888-4888-8888-888888888888",
    policy_evaluation_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    decision_expires_at: "2026-07-28T09:40:00.000Z",
    revocations_json: [],
    supersessions_json: [],
    partial_timeline_json: [],
    ...overrides,
  };
}

function completeRows(overrides: Partial<FakeRows> = {}): FakeRows {
  return {
    siteVersion: siteVersion(),
    runtimeArtifact: artifact(),
    activePointer: activePointer(),
    publishTarget: target(),
    ddom: ddom(),
    content: content(),
    approvals: {
      launch_signoff: approval("launch_signoff"),
      publish_activation: approval("publish_activation"),
    },
    ...overrides,
  };
}

async function read(rows: Partial<FakeRows> = {}, input: Partial<PublishActivationEvidenceReaderInput> = {}) {
  return new AafPublishActivationSourceReader(new FakeReadRepository(completeRows(rows))).readPublishActivationSources(baseInput(input));
}

test("complete successful source read returns all canonical source snapshots", async () => {
  const result = await read();

  assert.equal(result.siteVersion?.sourceRef, "gnr8:gnr8_runtime_site_versions:11111111-1111-4111-8111-111111111111");
  assert.equal(result.runtimeArtifact?.sourceRecordId, "22222222-2222-4222-8222-222222222222");
  assert.equal(result.activePointer?.activeArtifactId, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  assert.equal(result.publishTarget?.freshness, "fresh");
  assert.equal(result.domainReadiness?.readinessStatus, "ready");
  assert.equal(result.contentOverridePublishedState?.status, "published");
  assert.equal(result.launchSignoff?.approvalDecisionId, "77777777-7777-4777-8777-777777777777");
  assert.equal(result.publishActivationApproval?.approvalDecisionId, "44444444-4444-4444-8444-444444444444");
  assert.deepEqual(result.limitations, []);
});

test("missing site version is visible as missing source truth", async () => {
  const result = await read({ siteVersion: null });
  assert.equal(result.siteVersion, null);
  assert.ok(result.limitations?.includes("missing_site_version"));
});

test("missing runtime artifact is visible as missing source truth", async () => {
  const result = await read({ runtimeArtifact: null });
  assert.equal(result.runtimeArtifact, null);
  assert.ok(result.limitations?.includes("missing_runtime_artifact"));
});

test("runtime artifact mismatch returns failed source truth", async () => {
  const result = await read({ runtimeArtifact: artifact({ site_version_id: "99999999-9999-4999-8999-999999999999" }) });
  assert.equal(result.runtimeArtifact?.freshness, "failed");
  assert.ok(result.runtimeArtifact?.limitations?.includes("runtime_artifact_site_version_mismatch"));
});

test("missing active pointer is visible as missing source truth", async () => {
  const result = await read({ activePointer: null });
  assert.equal(result.activePointer, null);
  assert.ok(result.limitations?.includes("missing_active_pointer"));
});

test("missing publish target is visible as missing source truth", async () => {
  const result = await read({ publishTarget: null });
  assert.equal(result.publishTarget, null);
  assert.ok(result.limitations?.includes("missing_publish_target"));
});

test("disabled and retired publish targets fail closed", async () => {
  const disabled = await read({ publishTarget: target({ status: "disabled" }) });
  assert.equal(disabled.publishTarget?.freshness, "failed");
  assert.ok(disabled.publishTarget?.limitations?.includes("disabled_publish_target"));

  const retired = await read({ publishTarget: target({ status: "retired" }) });
  assert.equal(retired.publishTarget?.freshness, "failed");
  assert.ok(retired.publishTarget?.limitations?.includes("retired_publish_target"));
});

test("disallowed artifact stage fails publish target validation", async () => {
  const result = await read({ runtimeArtifact: artifact({ publish_stage: "shadow" }) });
  assert.equal(result.publishTarget?.freshness, "failed");
  assert.ok(result.publishTarget?.limitations?.includes("artifact_stage_not_allowed_by_target"));
});

test("DDOM ready and ready_with_warnings map to ready", async () => {
  const ready = await read({ ddom: ddom({ readiness_state: "ready" }) });
  assert.equal(ready.domainReadiness?.readinessStatus, "ready");
  assert.deepEqual(ready.domainReadiness?.blockers, []);

  const warnings = await read({ ddom: ddom({ readiness_state: "ready_with_warnings", readiness_warnings: ["manual_note"] }) });
  assert.equal(warnings.domainReadiness?.readinessStatus, "ready");
  assert.ok(warnings.domainReadiness?.warnings?.includes("domain_readiness_ready_with_warnings"));
});

test("DDOM stale maps to blocked with stale blocker", async () => {
  const result = await read({ ddom: ddom({ readiness_state: "stale", freshness_state: "stale", stale_reason: "ttl_expired" }) });
  assert.equal(result.domainReadiness?.readinessStatus, "blocked");
  assert.equal(result.domainReadiness?.freshness, "stale");
  assert.ok(result.domainReadiness?.blockers?.includes("domain_readiness_stale"));
});

test("DDOM blocked and missing snapshot are not hidden", async () => {
  const blocked = await read({ ddom: ddom({ readiness_state: "blocked", readiness_blockers: ["missing_dns_record"] }) });
  assert.equal(blocked.domainReadiness?.readinessStatus, "blocked");
  assert.equal(blocked.domainReadiness?.freshness, "failed");
  assert.ok(blocked.domainReadiness?.blockers?.includes("missing_dns_record"));

  const missing = await read({ ddom: null });
  assert.equal(missing.domainReadiness, null);
  assert.ok(missing.limitations?.includes("missing_ddom_snapshot"));
});

test("content override not required, published, and missing-required states are explicit", async () => {
  const notRequired = await read({}, { contentOverrideStateRequired: false });
  assert.equal(notRequired.contentOverridePublishedState?.status, "not_applicable");
  assert.equal(notRequired.contentOverridePublishedState?.freshness, "fresh");

  const published = await read();
  assert.equal(published.contentOverridePublishedState?.status, "published");

  const missing = await read({ content: content({ published_count: "0", max_updated_at: null, rows_watermark_json: [] }) });
  assert.equal(missing.contentOverridePublishedState?.status, "not_published");
  assert.equal(missing.contentOverridePublishedState?.freshness, "failed");
  assert.ok(missing.contentOverridePublishedState?.limitations?.includes("missing_required_content_override_state"));
});

test("launch signoff required and granted or missing is represented", async () => {
  const granted = await read();
  assert.equal(granted.launchSignoff?.scope, "launch_signoff");
  assert.equal(granted.launchSignoff?.freshness, "fresh");

  const missing = await read({ approvals: { publish_activation: approval("publish_activation"), launch_signoff: null } });
  assert.equal(missing.launchSignoff, null);
  assert.ok(missing.limitations?.includes("missing_required_launch_signoff"));
});

test("publish activation approval granted, wrong scope, revoked, and superseded behavior", async () => {
  const granted = await read();
  assert.equal(granted.publishActivationApproval?.scope, "publish_activation");
  assert.equal(granted.publishActivationApproval?.freshness, "fresh");

  const wrongScope = await read({}, { publishActivationApprovalRef: { approvalDecisionId: "decision-x", scope: "launch_signoff" } });
  assert.equal(wrongScope.publishActivationApproval?.freshness, "failed");
  assert.ok(wrongScope.publishActivationApproval?.limitations?.includes("approval_wrong_scope"));

  const revoked = await read({
    approvals: {
      launch_signoff: approval("launch_signoff"),
      publish_activation: approval("publish_activation", { revocations_json: [{ id: "revocation-1" }] }),
    },
  });
  assert.equal(revoked.publishActivationApproval?.freshness, "stale");
  assert.ok(revoked.publishActivationApproval?.limitations?.includes("approval_revoked"));

  const superseded = await read({
    approvals: {
      launch_signoff: approval("launch_signoff"),
      publish_activation: approval("publish_activation", { supersessions_json: [{ id: "supersession-1" }] }),
    },
  });
  assert.equal(superseded.publishActivationApproval?.freshness, "stale");
  assert.ok(superseded.publishActivationApproval?.limitations?.includes("approval_superseded"));
});

test("source refs and watermarks are stable and deterministic", async () => {
  const first = await read();
  const second = await read();

  assert.equal(first.siteVersion?.sourceRef, second.siteVersion?.sourceRef);
  assert.equal(first.publishTarget?.sourceRef, second.publishTarget?.sourceRef);
  assert.equal(
    buildPublishActivationSourceWatermark(first.contentOverridePublishedState!).watermark,
    buildPublishActivationSourceWatermark(second.contentOverridePublishedState!).watermark,
  );
  assert.equal(first.domainReadiness?.canonicalWatermark, "ddom-watermark-ready");
});

test("source reader and repository are server-only and reject mutation/provider imports and SQL", () => {
  const sourceText = `${fs.readFileSync(SOURCE_READER_PATH, "utf8")}\n${fs.readFileSync(SOURCE_REPOSITORY_PATH, "utf8")}`;
  assert.match(fs.readFileSync(SOURCE_READER_PATH, "utf8"), /^import "server-only";/);
  assert.match(fs.readFileSync(SOURCE_REPOSITORY_PATH, "utf8"), /^import "server-only";/);
  assert.doesNotMatch(
    sourceText,
    /runtime-store|publish-activation-orchestrator|publish-activation-guard|publish-safety-check|rollback-switch|content\/publish|content\/rollback|hosting-domain-recheck|vercel|openprovider|dns-provider|provider-execution|command-center|ops-inbox|public-runtime|stripe|billing|ai_execution|worker/i,
  );
  assert.doesNotMatch(sourceText, /\b(insert|update|delete|merge|truncate|create\s+table|alter\s+table|drop\s+table|grant|create\s+policy)\b/i);
});
