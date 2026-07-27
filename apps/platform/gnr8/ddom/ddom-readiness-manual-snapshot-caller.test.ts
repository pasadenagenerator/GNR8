import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  DdomReadinessSnapshotIdempotencyConflictError,
  DdomReadinessSnapshotValidationError,
  type CreateDdomReadinessSnapshotInput,
} from "./ddom-readiness-snapshot-writer";
import {
  DdomReadinessManualSnapshotCaller,
  DdomReadinessManualSnapshotValidationError,
  type DdomReadinessManualSnapshotCallerInput,
  type DdomReadinessManualSnapshotWriterLike,
} from "./ddom-readiness-manual-snapshot-caller";
import {
  buildDdomPasrImplicationSummary,
  buildDdomStoredStateSourceWatermark,
  DdomReadinessStoredStateMapperError,
  mapDdomReadinessStoredStateToSnapshotInput,
} from "./ddom-readiness-stored-state-mapper";
import {
  DdomReadinessStoredStateReadError,
  type DdomReadinessStoredState,
  type DdomReadinessStoredStateRepositoryInput,
  type DdomReadinessStoredStateRepositoryLike,
} from "./ddom-readiness-stored-state-repository";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_PATHS = [
  path.join(DIR, "ddom-readiness-stored-state-repository.ts"),
  path.join(DIR, "ddom-readiness-stored-state-mapper.ts"),
  path.join(DIR, "ddom-readiness-manual-snapshot-caller.ts"),
];

const UUIDS = {
  ownershipSiteId: "00000000-0000-4000-8000-000000000001",
  siteVersionId: "11111111-1111-4111-8111-111111111111",
  domainBindingId: "22222222-2222-4222-8222-222222222222",
  hostBindingId: "33333333-3333-4333-8333-333333333333",
  approvalRequestId: "44444444-4444-4444-8444-444444444444",
  approvalDecisionId: "55555555-5555-4555-8555-555555555555",
  evidencePackageId: "66666666-6666-4666-8666-666666666666",
};

function storedState(overrides: Partial<DdomReadinessStoredState> = {}): DdomReadinessStoredState {
  const input: DdomReadinessStoredStateRepositoryInput = {
    tenantId: "tenant-ddom-5",
    clientId: "client-ddom-5",
    agencyId: "agency-ddom-5",
    ownershipSiteId: UUIDS.ownershipSiteId,
    siteId: "site-ddom-5",
    siteVersionId: UUIDS.siteVersionId,
    domainBindingId: UUIDS.domainBindingId,
    intendedDomain: "Launch.Example.COM",
    environment: "production",
    stage: "production",
    requestScope: "custom_domain",
  };
  return {
    readStatus: "found",
    readinessState: "ready",
    freshnessState: "fresh",
    blockers: [],
    warnings: [],
    limitations: ["ddom_snapshot_from_stored_gnr8_state_only"],
    staleReason: null,
    freshUntil: "2026-07-28T10:00:00.000Z",
    capturedSourceTransactionAt: "2026-07-27T10:00:00.000Z",
    input,
    site: {
      id: "site-ddom-5",
      source_url: "https://source.example.com",
      source_host: "source.example.com",
      created_at: "2026-07-26T10:00:00.000Z",
      updated_at: "2026-07-27T09:00:00.000Z",
    },
    siteVersion: {
      id: UUIDS.siteVersionId,
      site_id: "site-ddom-5",
      version_no: "7",
      state: "published",
      source: "import",
      actor: "operator",
      renderer_compatibility_version: "1",
      artifact_id: null,
      ownership_site_id: UUIDS.ownershipSiteId,
      created_at: "2026-07-26T10:00:00.000Z",
      updated_at: "2026-07-27T09:00:00.000Z",
    },
    ownershipSite: {
      id: UUIDS.ownershipSiteId,
      org_id: "client-ddom-5",
      agency_id: "agency-ddom-5",
      status: "draft",
      domain: "launch.example.com",
      created_at: "2026-07-26T10:00:00.000Z",
      updated_at: "2026-07-27T09:00:00.000Z",
    },
    domainBinding: {
      id: UUIDS.domainBindingId,
      site_id: "site-ddom-5",
      site_version_id: UUIDS.siteVersionId,
      domain: "Launch.Example.COM",
      status: "active",
      domain_type: "subdomain",
      verification_type: "cname",
      verification_value: "verify-value",
      verification_host: "_vercel",
      dns_record_type: "cname",
      dns_record_host: "www",
      dns_record_value: "cname.vercel-dns.com",
      dns_record_purpose: "routing",
      dns_instructions_json: [{ type: "cname", host: "www", value: "cname.vercel-dns.com" }],
      last_checked_at: "2026-07-27T10:00:00.000Z",
      vercel_domain_id: "vercel-domain-1",
      created_at: "2026-07-26T10:00:00.000Z",
      updated_at: "2026-07-27T10:00:00.000Z",
    },
    hostBinding: null,
    domainException: null,
    manualCompletionEvidence: null,
    domainExceptionEvidence: null,
    auditEvent: null,
    ...overrides,
  };
}

function callerInput(overrides: Partial<DdomReadinessManualSnapshotCallerInput> = {}): DdomReadinessManualSnapshotCallerInput {
  return {
    actorType: "human",
    actorId: "operator-ddom-5",
    actorDisplayLabel: "Operator DDOM",
    tenantId: "tenant-ddom-5",
    clientId: "client-ddom-5",
    agencyId: "agency-ddom-5",
    ownershipSiteId: UUIDS.ownershipSiteId,
    siteId: "site-ddom-5",
    siteVersionId: UUIDS.siteVersionId,
    domainBindingId: UUIDS.domainBindingId,
    intendedDomain: "launch.example.com",
    environment: "production",
    stage: "production",
    requestScope: "custom_domain",
    reason: "manual readiness capture",
    correlationId: "corr-ddom-5",
    idempotencyKey: "idem-ddom-5",
    ...overrides,
  };
}

function captureWriter() {
  const writes: CreateDdomReadinessSnapshotInput[] = [];
  const writer: DdomReadinessManualSnapshotWriterLike = {
    async createDdomReadinessSnapshot(input) {
      writes.push(input);
      return {
        snapshotId: "77777777-7777-4777-8777-777777777777",
        sourceWatermark: input.sourceWatermark ?? "writer-watermark",
        reusedExisting: false,
        refIds: input.refs.map((_, index) => `ref-${index + 1}`),
      };
    },
  };
  return { writer, writes };
}

function repositoryFor(state: DdomReadinessStoredState): DdomReadinessStoredStateRepositoryLike {
  return {
    async readDdomReadinessStoredState() {
      return state;
    },
  };
}

test("ready stored state maps to ready DDOM writer input", () => {
  const mapped = mapDdomReadinessStoredStateToSnapshotInput({
    storedState: storedState(),
    actorType: "human",
    actorId: "operator-ddom-5",
    correlationId: "corr-ddom-5",
    idempotencyKey: "idem-ddom-5",
  });

  assert.equal(mapped.writerInput.readinessState, "ready");
  assert.equal(mapped.writerInput.freshnessState, "fresh");
  assert.equal(mapped.writerInput.domain, "launch.example.com");
  assert.ok(mapped.writerInput.refs.some((ref) => ref.refRole === "domain_binding"));
  assert.ok(mapped.writerInput.refs.some((ref) => ref.refRole === "vercel_snapshot"));
  assert.ok(mapped.writerInput.refs.some((ref) => ref.refRole === "dns_instruction_snapshot"));
});

test("ready-with-warnings stored state preserves warning codes", () => {
  const mapped = mapDdomReadinessStoredStateToSnapshotInput({
    storedState: storedState({
      readinessState: "ready_with_warnings",
      warnings: ["manual_completion_evidence_not_attached", "stored_vercel_domain_id_missing"],
    }),
    actorType: "human",
    actorId: "operator-ddom-5",
    correlationId: "corr-ddom-5",
  });

  assert.equal(mapped.writerInput.readinessState, "ready_with_warnings");
  assert.deepEqual(mapped.writerInput.readinessWarnings, ["manual_completion_evidence_not_attached", "stored_vercel_domain_id_missing"]);
  assert.equal(mapped.pasrImplication.pasrStatus, "ready");
});

test("blocked stored state preserves blockers", () => {
  const mapped = mapDdomReadinessStoredStateToSnapshotInput({
    storedState: storedState({
      readStatus: "blocked_readiness",
      readinessState: "blocked",
      freshnessState: "failed",
      blockers: ["domain_binding_failed"],
      staleReason: "domain_binding_failed",
    }),
    actorType: "human",
    actorId: "operator-ddom-5",
    correlationId: "corr-ddom-5",
  });

  assert.equal(mapped.writerInput.readinessState, "blocked");
  assert.deepEqual(mapped.writerInput.readinessBlockers, ["domain_binding_failed"]);
  assert.equal(mapped.pasrImplication.pasrStatus, "blocked");
});

test("stale stored state maps to stale with domain_readiness_stale PASR implication", () => {
  const mapped = mapDdomReadinessStoredStateToSnapshotInput({
    storedState: storedState({
      readStatus: "stale_stored_evidence",
      readinessState: "stale",
      freshnessState: "stale",
      blockers: ["domain_readiness_stale"],
      staleReason: "domain_readiness_stale",
    }),
    actorType: "human",
    actorId: "operator-ddom-5",
    correlationId: "corr-ddom-5",
  });

  assert.equal(mapped.writerInput.readinessState, "stale");
  assert.equal(mapped.writerInput.freshnessState, "stale");
  assert.equal(mapped.pasrImplication.pasrStatus, "blocked");
  assert.ok(mapped.pasrImplication.blockers.includes("domain_readiness_stale"));
});

test("not-applicable state does not require domain or host identity", () => {
  const state = storedState({
    readStatus: "not_applicable_readiness",
    readinessState: "not_applicable",
    warnings: ["custom_domain_not_required_by_request_scope"],
    input: {
      tenantId: "tenant-ddom-5",
      siteId: "site-ddom-5",
      requestScope: "no_custom_domain",
    },
    domainBinding: null,
    hostBinding: null,
  });
  const mapped = mapDdomReadinessStoredStateToSnapshotInput({
    storedState: state,
    actorType: "human",
    actorId: "operator-ddom-5",
    correlationId: "corr-ddom-5",
  });

  assert.equal(mapped.writerInput.readinessState, "not_applicable");
  assert.equal(mapped.writerInput.domain, null);
  assert.equal(mapped.writerInput.internalHost, null);
});

test("manually-excepted state preserves exception refs", () => {
  const state = storedState({
    readStatus: "manually_excepted_readiness",
    readinessState: "manually_excepted",
    domainException: {
      approval_request_id: UUIDS.approvalRequestId,
      approval_decision_id: UUIDS.approvalDecisionId,
      evidence_package_id: UUIDS.evidencePackageId,
      request_status: "granted",
      decision_status: "granted",
      subject_type: "domain_binding",
      subject_id: UUIDS.domainBindingId,
      policy_version: "domain-exception-v1",
      requested_expires_at: null,
      decision_expires_at: "2026-07-29T10:00:00.000Z",
      request_created_at: "2026-07-27T09:00:00.000Z",
      decided_at: "2026-07-27T09:30:00.000Z",
      revocation_count: "0",
      supersession_count: "0",
    },
  });
  const mapped = mapDdomReadinessStoredStateToSnapshotInput({
    storedState: state,
    actorType: "human",
    actorId: "operator-ddom-5",
    correlationId: "corr-ddom-5",
  });

  assert.equal(mapped.writerInput.readinessState, "manually_excepted");
  assert.ok(mapped.writerInput.refs.some((ref) => ref.refRole === "domain_exception" && ref.sourceRecordId === UUIDS.approvalDecisionId));
  assert.ok(mapped.writerInput.refs.some((ref) => ref.refRole === "aaf_approval" && ref.sourceRecordId === UUIDS.approvalDecisionId));
  assert.equal(mapped.pasrImplication.pasrStatus, "manually_excepted");
});

test("missing required identity fails closed before repository read", async () => {
  const { writer } = captureWriter();
  const caller = new DdomReadinessManualSnapshotCaller(repositoryFor(storedState()), writer);
  await assert.rejects(
    () => caller.createManualReadinessSnapshot(callerInput({ tenantId: "" })),
    DdomReadinessManualSnapshotValidationError,
  );
});

test("repository read failure fails closed", async () => {
  const { writer } = captureWriter();
  const caller = new DdomReadinessManualSnapshotCaller(
    {
      async readDdomReadinessStoredState() {
        throw new DdomReadinessStoredStateReadError("read failed");
      },
    },
    writer,
  );
  await assert.rejects(() => caller.createManualReadinessSnapshot(callerInput()), DdomReadinessStoredStateReadError);
});

test("mapper validation failure fails closed", async () => {
  const { writer } = captureWriter();
  const caller = new DdomReadinessManualSnapshotCaller(
    repositoryFor(
      storedState({
        readStatus: "read_failure",
        readinessState: "blocked",
        freshnessState: "failed",
        blockers: ["read_failure"],
      }),
    ),
    writer,
  );
  await assert.rejects(() => caller.createManualReadinessSnapshot(callerInput()), DdomReadinessStoredStateMapperError);
});

test("writer failure and idempotency drift fail closed", async () => {
  const validationCaller = new DdomReadinessManualSnapshotCaller(repositoryFor(storedState()), {
    async createDdomReadinessSnapshot() {
      throw new DdomReadinessSnapshotValidationError("writer failed");
    },
  });
  await assert.rejects(() => validationCaller.createManualReadinessSnapshot(callerInput()), DdomReadinessSnapshotValidationError);

  const driftCaller = new DdomReadinessManualSnapshotCaller(repositoryFor(storedState()), {
    async createDdomReadinessSnapshot(input) {
      throw new DdomReadinessSnapshotIdempotencyConflictError(input.idempotencyKey, ["snapshot_payload"]);
    },
  });
  await assert.rejects(
    () => driftCaller.createManualReadinessSnapshot(callerInput()),
    DdomReadinessSnapshotIdempotencyConflictError,
  );
});

test("manual caller returns snapshot summary from repository, mapper, and writer", async () => {
  const { writer, writes } = captureWriter();
  const caller = new DdomReadinessManualSnapshotCaller(repositoryFor(storedState({ warnings: ["manual_warning"], readinessState: "ready_with_warnings" })), writer);
  const output = await caller.createManualReadinessSnapshot(callerInput());

  assert.equal(output.snapshotId, "77777777-7777-4777-8777-777777777777");
  assert.equal(output.readinessStatus, "ready_with_warnings");
  assert.equal(output.reusedExisting, false);
  assert.equal(output.noPublishNoProviderConfirmation, true);
  assert.equal(output.warningsCount, 1);
  assert.equal(writes.length, 1);
  assert.equal(writes[0]?.actorType, "human");
});

test("source watermark is stable, changes only with semantic source state, and excludes volatile caller fields", () => {
  const base = storedState();
  const first = buildDdomStoredStateSourceWatermark(base);
  const retry = buildDdomStoredStateSourceWatermark({
    ...base,
    input: {
      ...base.input,
      // These fields are intentionally outside the repository state watermark model.
      tenantId: base.input.tenantId,
    },
  });
  const changed = buildDdomStoredStateSourceWatermark({
    ...base,
    domainBinding: base.domainBinding ? { ...base.domainBinding, status: "failed" } : null,
  });

  const mappedA = mapDdomReadinessStoredStateToSnapshotInput({
    storedState: base,
    actorType: "human",
    actorId: "operator-a",
    correlationId: "corr-a",
    idempotencyKey: "idem-a",
  });
  const mappedB = mapDdomReadinessStoredStateToSnapshotInput({
    storedState: base,
    actorType: "human",
    actorId: "operator-b",
    correlationId: "corr-b",
    idempotencyKey: "idem-b",
  });

  assert.equal(first, retry);
  assert.notEqual(first, changed);
  assert.equal(mappedA.writerInput.sourceWatermark, mappedB.writerInput.sourceWatermark);
});

test("PASR implication summary is correct for all DDOM states", () => {
  assert.equal(buildDdomPasrImplicationSummary(storedState({ readinessState: "ready" })).pasrStatus, "ready");
  assert.equal(buildDdomPasrImplicationSummary(storedState({ readinessState: "ready_with_warnings" })).pasrStatus, "ready");
  assert.equal(buildDdomPasrImplicationSummary(storedState({ readinessState: "not_applicable" })).pasrStatus, "not_applicable");
  assert.equal(buildDdomPasrImplicationSummary(storedState({ readinessState: "manually_excepted" })).pasrStatus, "manually_excepted");
  assert.equal(buildDdomPasrImplicationSummary(storedState({ readinessState: "blocked", blockers: ["x"] })).pasrStatus, "blocked");
  assert.deepEqual(
    buildDdomPasrImplicationSummary(
      storedState({ readinessState: "stale", blockers: [], staleReason: "domain_readiness_stale" }),
    ).blockers,
    ["domain_readiness_stale"],
  );
});

test("DDOM-5 caller core is server-only and has no provider, publish, route, UI, runtime serving, billing, AI, or worker hooks", () => {
  for (const sourcePath of SOURCE_PATHS) {
    const source = fs.readFileSync(sourcePath, "utf8");
    if (sourcePath.endsWith("repository.ts") || sourcePath.endsWith("caller.ts")) {
      assert.match(source, /^import "server-only";/);
    }
    assert.doesNotMatch(source, /from\s+["'][^"']*(vercel|openprovider|dns-provider|registrar|stripe|billing|ai\/|publish-|rollback|command-center|ops-inbox|public-runtime|worker|runtime-store)[^"']*["']/i);
    assert.doesNotMatch(source, /\b(checkDomainStatus|addDomainToVercel|vercelFetch|computeDomainDnsInstructions|openprovider|dnsLookup|resolveTxt|resolveCname|publishActivation|stripe|aiProvider)\b/i);
  }
});
