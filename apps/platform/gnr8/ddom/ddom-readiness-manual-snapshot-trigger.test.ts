import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { DdomReadinessManualSnapshotCaller, type DdomReadinessManualSnapshotWriterLike } from "./ddom-readiness-manual-snapshot-caller";
import {
  triggerManualDdomReadinessSnapshot,
  type DdomReadinessManualSnapshotTriggerAuthorizationAdapter,
  type DdomReadinessManualSnapshotTriggerCallerLike,
  type DdomReadinessManualSnapshotTriggerInput,
} from "./ddom-readiness-manual-snapshot-trigger";
import type { CreateDdomReadinessSnapshotInput } from "./ddom-readiness-snapshot-writer";
import {
  DdomReadinessStoredStateReadError,
  type DdomReadinessStoredState,
  type DdomReadinessStoredStateRepositoryInput,
  type DdomReadinessStoredStateRepositoryLike,
} from "./ddom-readiness-stored-state-repository";

const DIR = path.dirname(fileURLToPath(import.meta.url));

const IDS = {
  ownershipSiteId: "00000000-0000-4000-8000-000000000001",
  siteVersionId: "11111111-1111-4111-8111-111111111111",
  domainBindingId: "22222222-2222-4222-8222-222222222222",
};

function allowAuth(overrides: Partial<ReturnType<DdomReadinessManualSnapshotTriggerAuthorizationAdapter["authorizeDdomReadinessManualSnapshotTrigger"]> extends Promise<infer T> ? T : never> = {}): DdomReadinessManualSnapshotTriggerAuthorizationAdapter {
  return {
    async authorizeDdomReadinessManualSnapshotTrigger(request) {
      return {
        authorized: true,
        decision: "authorized",
        matchedRole: request.actorRoles[0] ?? "admin",
        matchedScopes: ["tenant", "site"],
        summary: "allowed by test adapter",
        ...overrides,
      };
    },
  };
}

function fakeCaller(overrides: Partial<Awaited<ReturnType<DdomReadinessManualSnapshotTriggerCallerLike["createManualReadinessSnapshot"]>>> = {}): DdomReadinessManualSnapshotTriggerCallerLike {
  const seen = new Set<string>();
  return {
    async createManualReadinessSnapshot(input) {
      const reusedExisting = seen.has(input.idempotencyKey ?? "");
      seen.add(input.idempotencyKey ?? "");
      return {
        snapshotId: "77777777-7777-4777-8777-777777777777",
        readinessStatus: "ready_with_warnings",
        freshnessStatus: "fresh",
        sourceWatermark: "sha256:test-watermark",
        sourceRefsCount: 4,
        warningsCount: 1,
        blockersCount: 0,
        limitationsCount: 6,
        reusedExisting,
        pasrImplication: {
          pasrStatus: "ready",
          warnings: ["stored_vercel_domain_id_missing"],
          blockers: [],
          staleReason: null,
        },
        noPublishNoProviderConfirmation: true,
        ...overrides,
      };
    },
  };
}

function triggerInput(overrides: Partial<DdomReadinessManualSnapshotTriggerInput> = {}): DdomReadinessManualSnapshotTriggerInput {
  return {
    actorType: "human",
    actorId: "operator-ddom-6",
    actorDisplayLabel: "Operator DDOM",
    actorRoles: ["admin"],
    actorScope: {
      tenantIds: ["tenant-ddom-6"],
      clientIds: ["client-ddom-6"],
      agencyIds: ["agency-ddom-6"],
      siteIds: ["site-ddom-6"],
      ownershipSiteIds: [IDS.ownershipSiteId],
      domainBindingIds: [IDS.domainBindingId],
    },
    tenantId: "tenant-ddom-6",
    clientId: "client-ddom-6",
    agencyId: "agency-ddom-6",
    ownershipSiteId: IDS.ownershipSiteId,
    siteId: "site-ddom-6",
    siteVersionId: IDS.siteVersionId,
    domainBindingId: IDS.domainBindingId,
    intendedDomain: "launch.example.com",
    environment: "production",
    stage: "production",
    requestScope: "custom_domain",
    reason: "manual DDOM-6 readiness trigger",
    correlationId: "corr-ddom-6",
    idempotencyKey: "idem-ddom-6",
    privacyLabel: "client_confidential",
    retentionClass: "compliance_long",
    ...overrides,
  };
}

function storedState(overrides: Partial<DdomReadinessStoredState> = {}): DdomReadinessStoredState {
  const input: DdomReadinessStoredStateRepositoryInput = {
    tenantId: "tenant-ddom-6",
    clientId: "client-ddom-6",
    agencyId: "agency-ddom-6",
    ownershipSiteId: IDS.ownershipSiteId,
    siteId: "site-ddom-6",
    siteVersionId: IDS.siteVersionId,
    domainBindingId: IDS.domainBindingId,
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
      id: "site-ddom-6",
      source_url: "https://source.example.com",
      source_host: "source.example.com",
      created_at: "2026-07-26T10:00:00.000Z",
      updated_at: "2026-07-27T09:00:00.000Z",
    },
    siteVersion: {
      id: IDS.siteVersionId,
      site_id: "site-ddom-6",
      version_no: "7",
      state: "published",
      source: "import",
      actor: "operator",
      renderer_compatibility_version: "1",
      artifact_id: null,
      ownership_site_id: IDS.ownershipSiteId,
      created_at: "2026-07-26T10:00:00.000Z",
      updated_at: "2026-07-27T09:00:00.000Z",
    },
    ownershipSite: {
      id: IDS.ownershipSiteId,
      org_id: "client-ddom-6",
      agency_id: "agency-ddom-6",
      status: "draft",
      domain: "launch.example.com",
      created_at: "2026-07-26T10:00:00.000Z",
      updated_at: "2026-07-27T09:00:00.000Z",
    },
    domainBinding: {
      id: IDS.domainBindingId,
      site_id: "site-ddom-6",
      site_version_id: IDS.siteVersionId,
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

test("authorized actor can create a snapshot through the DDOM-5 caller boundary", async () => {
  const result = await triggerManualDdomReadinessSnapshot(triggerInput(), {
    authorization: allowAuth(),
    caller: fakeCaller(),
  });

  assert.equal(result.status, "accepted");
  assert.equal(result.snapshotId, "77777777-7777-4777-8777-777777777777");
  assert.equal(result.readinessStatus, "ready_with_warnings");
  assert.equal(result.authorizationSummary.authorized, true);
  assert.equal(result.publishReadyApprovalGranted, false);
  assert.equal(result.publishActionPerformed, false);
  assert.equal(result.providerCallsPerformed, false);
  assert.equal(result.sourceStateMutationPerformed, false);
});

test("unauthorized actor fails closed before the caller runs", async () => {
  let called = false;
  const result = await triggerManualDdomReadinessSnapshot(triggerInput(), {
    authorization: allowAuth({ authorized: false, decision: "rejected", reasonCode: "test_denied" }),
    caller: {
      async createManualReadinessSnapshot() {
        called = true;
        throw new Error("should not run");
      },
    },
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.rejectionCode, "test_denied");
  assert.equal(result.authorizationSummary.failClosed, true);
  assert.equal(called, false);
});

test("missing authorization adapter fails closed", async () => {
  const result = await triggerManualDdomReadinessSnapshot(triggerInput(), { caller: fakeCaller() });

  assert.equal(result.status, "rejected");
  assert.equal(result.rejectionCode, "authorization_adapter_missing");
  assert.equal(result.authorizationSummary.checked, false);
});

test("missing actor fails closed", async () => {
  const result = await triggerManualDdomReadinessSnapshot(triggerInput({ actorId: " " }), {
    authorization: allowAuth(),
    caller: fakeCaller(),
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.rejectionCode, "trigger_input_invalid");
  assert.match(result.authorizationSummary.reasonCode ?? "", /actorId is required/);
});

test("wrong tenant/client/site scope fails closed", async () => {
  const result = await triggerManualDdomReadinessSnapshot(
    triggerInput({
      actorScope: {
        tenantIds: ["other-tenant"],
        clientIds: ["client-ddom-6"],
        siteIds: ["site-ddom-6"],
      },
    }),
    { authorization: allowAuth(), caller: fakeCaller() },
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.rejectionCode, "tenant_scope_mismatch");
  assert.equal(result.snapshotId, null);
});

test("idempotent retry returns a reused snapshot result", async () => {
  const caller = fakeCaller();
  const first = await triggerManualDdomReadinessSnapshot(triggerInput(), { authorization: allowAuth(), caller });
  const second = await triggerManualDdomReadinessSnapshot(triggerInput(), { authorization: allowAuth(), caller });

  assert.equal(first.status, "accepted");
  assert.equal(first.reusedExisting, false);
  assert.equal(second.status, "accepted");
  assert.equal(second.snapshotId, first.snapshotId);
  assert.equal(second.reusedExisting, true);
});

test("caller failure fails closed with explicit no-publish and no-provider boundary fields", async () => {
  const result = await triggerManualDdomReadinessSnapshot(triggerInput(), {
    authorization: allowAuth(),
    caller: {
      async createManualReadinessSnapshot() {
        throw new Error("caller failed");
      },
    },
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.rejectionCode, "Error");
  assert.equal(result.publishReadyApprovalGranted, false);
  assert.equal(result.publishActionPerformed, false);
  assert.equal(result.providerCallsPerformed, false);
});

test("repository read failure is returned as a safe rejected result", async () => {
  const result = await triggerManualDdomReadinessSnapshot(triggerInput(), {
    authorization: allowAuth(),
    caller: {
      async createManualReadinessSnapshot() {
        throw new DdomReadinessStoredStateReadError("ddom_stored_state_read_failure");
      },
    },
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.rejectionCode, "DdomReadinessStoredStateReadError");
  assert.equal(result.snapshotId, null);
});

test("trigger preserves PASR implication summary from the caller", async () => {
  const result = await triggerManualDdomReadinessSnapshot(triggerInput(), {
    authorization: allowAuth(),
    caller: fakeCaller({
      pasrImplication: {
        pasrStatus: "blocked",
        warnings: [],
        blockers: ["domain_readiness_stale"],
        staleReason: "domain_readiness_stale",
      },
    }),
  });

  assert.equal(result.status, "accepted");
  assert.equal(result.pasrImplication.pasrStatus, "blocked");
  assert.deepEqual(result.pasrImplication.blockers, ["domain_readiness_stale"]);
});

test("volatile actor and correlation fields do not alter the caller semantic source watermark", async () => {
  const writes: CreateDdomReadinessSnapshotInput[] = [];
  const repository: DdomReadinessStoredStateRepositoryLike = {
    async readDdomReadinessStoredState() {
      return storedState();
    },
  };
  const writer: DdomReadinessManualSnapshotWriterLike = {
    async createDdomReadinessSnapshot(input) {
      writes.push(input);
      return {
        snapshotId: `77777777-7777-4777-8777-77777777777${writes.length}`,
        sourceWatermark: input.sourceWatermark ?? "missing-watermark",
        reusedExisting: false,
        refIds: input.refs.map((_, index) => `ref-${index + 1}`),
      };
    },
  };
  const caller = new DdomReadinessManualSnapshotCaller(repository, writer);

  const first = await triggerManualDdomReadinessSnapshot(triggerInput({ actorId: "operator-a", correlationId: "corr-a" }), {
    authorization: allowAuth(),
    caller,
  });
  const second = await triggerManualDdomReadinessSnapshot(triggerInput({ actorId: "operator-b", correlationId: "corr-b" }), {
    authorization: allowAuth(),
    caller,
  });

  assert.equal(first.status, "accepted");
  assert.equal(second.status, "accepted");
  assert.equal(first.sourceWatermark, second.sourceWatermark);
  assert.equal(writes[0]?.sourceWatermark, writes[1]?.sourceWatermark);
});

test("trigger source does not import forbidden provider, publish, runtime, UI, or worker modules", () => {
  const source = fs.readFileSync(path.join(DIR, "ddom-readiness-manual-snapshot-trigger.ts"), "utf8");
  assert.doesNotMatch(source, /from\s+["'][^"']*(vercel|openprovider|dns-provider|registrar|stripe|billing|ai\/|publish-|rollback|command-center|ops-inbox|public-runtime|worker|runtime-store)[^"']*["']/i);
  assert.doesNotMatch(source, /\b(checkDomainStatus|addDomainToVercel|vercelFetch|computeDomainDnsInstructions|openprovider|dnsLookup|resolveTxt|resolveCname|publishActivation)\b/i);
});
