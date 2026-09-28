import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  computeAstroProductionCandidateRegistrationIntentSha256,
  computeAstroProductionCandidateStorageSha256,
  createAstroProductionCandidateId,
  createAstroProductionCandidateRecord,
  measureAstroProductionCandidateRecordBytes,
  registrationIntentFromRecord,
  serializeAstroProductionCandidateContentEnvelope,
  serializeAstroProductionCandidateRecord,
  serializeAstroProductionCandidateRegistrationIntent,
  serializeAstroProductionCandidateUnsignedRecord,
  validateAstroProductionCandidateRecord,
  type AstroProductionCandidateOwnership,
  type AstroProductionCandidateRecord,
} from "./astro-production-candidate-record";
import {
  AstroProductionCandidateRepositoryError,
  GatewayBackedAstroProductionCandidateRepository,
  type AstroProductionCandidateAccessAction,
  type AstroProductionCandidateMetadata,
} from "./astro-production-candidate-repository";
import {
  ASTRO_CANDIDATE_ACCESS_CHANGE_RPC,
  ASTRO_CANDIDATE_METADATA_LIST_RPC,
  ASTRO_CANDIDATE_REGISTRATION_RPC,
  ASTRO_CANDIDATE_SCOPED_READ_RPC,
  SupabaseAstroProductionCandidateGateway,
  type AstroCandidateRpcClient,
} from "./astro-production-candidate-supabase-gateway";
import {
  computeAstroInternalPreviewCandidateContentSha256,
} from "./astro-static-site-internal-preview-bridge";
import { createSyntheticAstroInternalPreviewCandidate } from "./astro-internal-preview-candidate-test-fixture";

const CANDIDATE_ID = createAstroProductionCandidateId("11111111-1111-4111-8111-111111111111");
const SECOND_CANDIDATE_ID = createAstroProductionCandidateId("66666666-6666-4666-8666-666666666666");
const OWNERSHIP: AstroProductionCandidateOwnership = {
  runtimeSiteId: "runtime-site-mvp14",
  siteVersionId: "22222222-2222-4222-8222-222222222222",
  ownershipSiteId: "33333333-3333-4333-8333-333333333333",
  organizationId: "44444444-4444-4444-8444-444444444444",
  agencyId: "55555555-5555-4555-8555-555555555555",
};

test("registration maps exact RPC arguments and canonical serializers", async () => {
  const record = productionRecord();
  const fake = new FakeRpcClient(async (_name, args) => ({
    data: createResponse("created", JSON.parse(String(args.p_record_canonical_text))),
    error: null,
  }));
  const gateway = new SupabaseAstroProductionCandidateGateway(() => fake);
  const outcome = await gateway.atomicCreate(createGatewayInput(record));

  assert.equal(outcome.status, "created");
  assert.deepEqual(fake.calls, [{
    name: ASTRO_CANDIDATE_REGISTRATION_RPC,
    args: {
      p_record_canonical_text: serializeAstroProductionCandidateRecord(record),
      p_unsigned_record_canonical_text: serializeAstroProductionCandidateUnsignedRecord(record),
      p_registration_intent_canonical_text: serializeAstroProductionCandidateRegistrationIntent(record),
      p_content_envelope_canonical_text: serializeAstroProductionCandidateContentEnvelope(record),
      p_registration_intent_sha256: computeAstroProductionCandidateRegistrationIntentSha256(
        registrationIntentFromRecord(record),
      ),
      p_payload_size_bytes: measureAstroProductionCandidateRecordBytes(record),
    },
  }]);
});

test("identical retry preserves the database winner's storedAt and immutable bytes", async () => {
  let storedRecord: AstroProductionCandidateRecord | null = null;
  const fake = new FakeRpcClient(async (_name, args) => {
    const proposed = JSON.parse(String(args.p_record_canonical_text)) as AstroProductionCandidateRecord;
    const status = storedRecord ? "idempotent" : "created";
    storedRecord ??= proposed;
    return { data: createResponse(status, storedRecord), error: null };
  });
  const firstRepository = new GatewayBackedAstroProductionCandidateRepository({
    gateway: new SupabaseAstroProductionCandidateGateway(() => fake),
    now: () => new Date("2026-09-28T10:00:00.000Z"),
  });
  const retryRepository = new GatewayBackedAstroProductionCandidateRepository({
    gateway: new SupabaseAstroProductionCandidateGateway(() => fake),
    now: () => new Date("2030-01-01T00:00:00.000Z"),
  });

  const first = await firstRepository.create(repositoryCreateInput());
  const retry = await retryRepository.create(repositoryCreateInput());
  assert.equal(first.status, "created");
  assert.equal(retry.status, "idempotent");
  assert.equal(retry.record.registration.storedAt, "2026-09-28T10:00:00.000Z");
  assert.equal(serializeAstroProductionCandidateRecord(retry.record), serializeAstroProductionCandidateRecord(first.record));
});

test("scoped read and metadata list map exact selectors without payload leakage", async () => {
  const record = productionRecord();
  const metadata = metadataFor(record);
  const fake = new FakeRpcClient(async (name) => {
    if (name === ASTRO_CANDIDATE_SCOPED_READ_RPC) {
      return { data: readResponse(record), error: null };
    }
    return { data: { items: [metadata], hasMore: false }, error: null };
  });
  const gateway = new SupabaseAstroProductionCandidateGateway(() => fake);

  const read = await gateway.readForScope({ candidateId: CANDIDATE_ID, trustedScope: OWNERSHIP });
  const page = await gateway.listMetadata({ trustedScope: OWNERSHIP, cursor: null, limit: 20 });
  assert.equal(read.status, "found");
  assert.deepEqual(page, { items: [metadata], hasMore: false });
  assert.deepEqual(fake.calls[0], {
    name: ASTRO_CANDIDATE_SCOPED_READ_RPC,
    args: {
      p_candidate_id: CANDIDATE_ID,
      p_runtime_site_id: OWNERSHIP.runtimeSiteId,
      p_site_version_id: OWNERSHIP.siteVersionId,
      p_ownership_site_id: OWNERSHIP.ownershipSiteId,
      p_organization_id: OWNERSHIP.organizationId,
      p_agency_id: OWNERSHIP.agencyId,
    },
  });
  assert.equal(JSON.stringify(fake.calls[1].args).includes("html"), false);
  assert.equal(JSON.stringify(page).includes("htmlByPath"), false);
});

test("metadata pagination enforces descending time and candidate-ID tie-break boundaries", async () => {
  const first = metadataFor(productionRecord({ candidateId: CANDIDATE_ID }));
  const second = metadataFor(productionRecord({ candidateId: SECOND_CANDIDATE_ID }));
  second.storedAt = first.storedAt;
  const cursor = { storedAt: first.storedAt, candidateId: CANDIDATE_ID };
  const valid = new SupabaseAstroProductionCandidateGateway(() => new FakeRpcClient(async () => ({
    data: { items: [second], hasMore: false },
    error: null,
  })));
  assert.deepEqual(
    await valid.listMetadata({ trustedScope: OWNERSHIP, cursor, limit: 1 }),
    { items: [second], hasMore: false },
  );

  const invalid = new SupabaseAstroProductionCandidateGateway(() => new FakeRpcClient(async () => ({
    data: { items: [first], hasMore: false },
    error: null,
  })));
  await assert.rejects(
    () => invalid.listMetadata({ trustedScope: OWNERSHIP, cursor, limit: 1 }),
    repositoryError("corrupt"),
  );
});

test("access change uses one canonical RPC and validates returned evidence", async () => {
  const action = disableAction();
  const fake = new FakeRpcClient(async () => ({
    data: {
      status: "updated",
      access: accessState(CANDIDATE_ID, "disabled", 2, action.occurredAt),
      event: {
        candidateId: CANDIDATE_ID,
        eventIndex: 2,
        action: "disabled",
        actorId: action.actorId,
        reasonCode: action.reasonCode,
        idempotencyKey: action.idempotencyKey,
        correlationId: action.correlationId,
        occurredAt: action.occurredAt,
      },
    },
    error: null,
  }));
  const gateway = new SupabaseAstroProductionCandidateGateway(() => fake);
  const outcome = await gateway.atomicSetAccess(action);
  assert.equal(outcome.status, "updated");
  assert.equal(fake.calls[0].name, ASTRO_CANDIDATE_ACCESS_CHANGE_RPC);
  assert.deepEqual(JSON.parse(String(fake.calls[0].args.p_action_canonical_text)), action);
  assert.equal(Object.keys(fake.calls[0].args).length, 1);
});

test("status mapping covers conflicts, missing, disabled, and unavailable transport", async () => {
  const record = productionRecord();
  const conflict = new SupabaseAstroProductionCandidateGateway(() => new FakeRpcClient(async () => ({
    data: { status: "conflicting_write" }, error: null,
  })));
  assert.deepEqual(await conflict.atomicCreate(createGatewayInput(record)), { status: "conflicting_write" });

  for (const status of ["missing", "disabled", "ownership_mismatch"] as const) {
    const gateway = new SupabaseAstroProductionCandidateGateway(() => new FakeRpcClient(async () => ({
      data: { status }, error: null,
    })));
    assert.deepEqual(await gateway.readForScope({ candidateId: CANDIDATE_ID, trustedScope: OWNERSHIP }), { status });
  }

  const unavailable = new SupabaseAstroProductionCandidateGateway(() => new FakeRpcClient(async () => ({
    data: null,
    error: { message: "secret SQL relation and payload fragment" },
  })));
  assert.deepEqual(await unavailable.atomicCreate(createGatewayInput(record)), { status: "unavailable" });
  assert.deepEqual(
    await unavailable.readForScope({ candidateId: CANDIDATE_ID, trustedScope: OWNERSHIP }),
    { status: "unavailable" },
  );
  await assert.rejects(
    () => unavailable.listMetadata({ trustedScope: OWNERSHIP, cursor: null, limit: 10 }),
    (error: unknown) => repositoryError("unavailable")(error) && !String(error).includes("secret SQL"),
  );
});

test("malformed, corrupt, unsupported, oversized, and payload-bearing metadata responses fail closed", async (t) => {
  const valid = productionRecord();
  const oversized = oversizedRecord(valid);
  try {
    validateAstroProductionCandidateRecord(oversized);
    assert.fail("oversized record unexpectedly validated");
  } catch (error) {
    assert.equal(
      error instanceof Error ? `${(error as { code?: string }).code}:${error.message}` : String(error),
      "record_too_large:Production candidate record exceeds the 2097152-byte limit.",
    );
  }
  const scenarios: Array<{ name: string; record: AstroProductionCandidateRecord; code: AstroProductionCandidateRepositoryError["code"] }> = [
    { name: "corrupt hash", record: { ...valid, storageSha256: "0".repeat(64) }, code: "corrupt" },
    { name: "unsupported schema", record: { ...valid, schemaVersion: "future" as typeof valid.schemaVersion }, code: "unsupported_version" },
    { name: "oversized payload", record: oversized, code: "record_too_large" },
  ];
  for (const scenario of scenarios) {
    await t.test(scenario.name, async () => {
      const gateway = new SupabaseAstroProductionCandidateGateway(() => new FakeRpcClient(async () => ({
        data: createResponse("created", scenario.record), error: null,
      })));
      await assert.rejects(
        () => gateway.atomicCreate(createGatewayInput(valid)),
        (error: unknown) => {
          assert.ok(error instanceof AstroProductionCandidateRepositoryError);
          assert.equal(error.code, scenario.code);
          return true;
        },
      );
    });
  }

  const malformed = new SupabaseAstroProductionCandidateGateway(() => new FakeRpcClient(async () => ({
    data: { status: "created", record: valid }, error: null,
  })));
  await assert.rejects(() => malformed.atomicCreate(createGatewayInput(valid)), repositoryError("corrupt"));

  const payloadMetadata = { ...metadataFor(valid), html: "must never escape" };
  const list = new SupabaseAstroProductionCandidateGateway(() => new FakeRpcClient(async () => ({
    data: { items: [payloadMetadata], hasMore: false }, error: null,
  })));
  await assert.rejects(
    () => list.listMetadata({ trustedScope: OWNERSHIP, cursor: null, limit: 1 }),
    repositoryError("corrupt"),
  );
});

test("concurrent requests keep candidate identities isolated", async () => {
  const first = productionRecord({ candidateId: CANDIDATE_ID });
  const second = productionRecord({ candidateId: SECOND_CANDIDATE_ID });
  const byId = new Map([[CANDIDATE_ID, first], [SECOND_CANDIDATE_ID, second]]);
  const fake = new FakeRpcClient(async (_name, args) => {
    const candidateId = String(args.p_candidate_id);
    await new Promise((resolve) => setTimeout(resolve, candidateId === CANDIDATE_ID ? 5 : 0));
    return { data: readResponse(byId.get(candidateId)!), error: null };
  });
  const gateway = new SupabaseAstroProductionCandidateGateway(() => fake);
  const [left, right] = await Promise.all([
    gateway.readForScope({ candidateId: CANDIDATE_ID, trustedScope: OWNERSHIP }),
    gateway.readForScope({ candidateId: SECOND_CANDIDATE_ID, trustedScope: OWNERSHIP }),
  ]);
  assert.equal(left.status === "found" && left.record.identity.candidateId, CANDIDATE_ID);
  assert.equal(right.status === "found" && right.record.identity.candidateId, SECOND_CANDIDATE_ID);
});

test("gateway is server-only, RPC-only, unmounted, and has no direct table mutation surface", () => {
  let clientAcquisitions = 0;
  new SupabaseAstroProductionCandidateGateway(() => {
    clientAcquisitions += 1;
    throw new Error("must not run during construction");
  });
  assert.equal(clientAcquisitions, 0);
  const source = readFileSync(new URL("./astro-production-candidate-supabase-gateway.ts", import.meta.url), "utf8");
  assert.match(source, /^import "server-only";/);
  assert.equal(/\.from\s*\(/.test(source), false);
  assert.equal(/\.insert\s*\(|\.update\s*\(|\.delete\s*\(|\bpg\b|DATABASE_URL/.test(source), false);
  assert.equal(/route\.ts|app\/api|preview_host|publish|dns/i.test(source), false);
});

class FakeRpcClient implements AstroCandidateRpcClient {
  readonly calls: Array<{ name: string; args: Record<string, unknown> }> = [];

  constructor(
    private readonly handler: (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>,
  ) {}

  async rpc(name: string, args: Record<string, unknown>) {
    this.calls.push({ name, args: structuredClone(args) });
    return this.handler(name, args);
  }
}

function productionRecord(input: { candidateId?: string; storedAt?: string } = {}): AstroProductionCandidateRecord {
  const candidateId = input.candidateId ?? CANDIDATE_ID;
  return createAstroProductionCandidateRecord({
    candidate: createSyntheticAstroInternalPreviewCandidate({
      candidateId,
      siteId: OWNERSHIP.runtimeSiteId,
      siteVersionId: OWNERSHIP.siteVersionId,
      html: "<!doctype html><html><head><style>:root{--mvp14:#0f766e}</style></head><body>MVP 14</body></html>",
      createdAt: "2026-09-28T09:00:00.000Z",
    }),
    ownership: OWNERSHIP,
    registration: {
      registeredByActorId: "actor:mvp14",
      producerKind: "internal_astro_build_export_bridge",
      producerVersion: "gnr8-internal-astro-build-export-bridge:v1",
      producerRef: `synthetic:${candidateId}`,
      idempotencyKey: `idem:${candidateId}`,
      correlationId: `correlation:${candidateId}`,
    },
    storedAt: input.storedAt ?? "2026-09-28T10:00:00.000Z",
  });
}

function repositoryCreateInput() {
  return {
    candidate: createSyntheticAstroInternalPreviewCandidate({
      candidateId: CANDIDATE_ID,
      siteId: OWNERSHIP.runtimeSiteId,
      siteVersionId: OWNERSHIP.siteVersionId,
      html: "<!doctype html><html><body>MVP 14 retry</body></html>",
      createdAt: "2026-09-28T09:00:00.000Z",
    }),
    trustedScope: OWNERSHIP,
    registration: {
      registeredByActorId: "actor:mvp14",
      producerKind: "internal_astro_build_export_bridge",
      producerVersion: "gnr8-internal-astro-build-export-bridge:v1",
      producerRef: "synthetic:mvp14:retry",
      idempotencyKey: "idem:mvp14:retry",
      correlationId: "correlation:mvp14:retry",
    },
  };
}

function createGatewayInput(record: AstroProductionCandidateRecord) {
  return {
    proposedRecord: record,
    registrationIntentSha256: computeAstroProductionCandidateRegistrationIntentSha256(
      registrationIntentFromRecord(record),
    ),
    payloadSizeBytes: measureAstroProductionCandidateRecordBytes(record),
  };
}

function accessState(
  candidateId: string,
  state: "enabled" | "disabled" = "enabled",
  version = 1,
  changedAt = "2026-09-28T10:00:00.000Z",
) {
  return {
    candidateId,
    state,
    reasonCode: state === "enabled" ? "candidate_registered" : "operator_disabled",
    changedByActorId: state === "enabled" ? "actor:mvp14" : "actor:operations",
    changedAt,
    version,
  };
}

function registrationEvent(record: AstroProductionCandidateRecord) {
  return {
    candidateId: record.identity.candidateId,
    eventIndex: 1,
    action: "registered" as const,
    actorId: record.registration.registeredByActorId,
    reasonCode: "candidate_registered",
    idempotencyKey: record.registration.idempotencyKey,
    correlationId: record.registration.correlationId,
    occurredAt: record.registration.storedAt,
  };
}

function createResponse(status: "created" | "idempotent", record: AstroProductionCandidateRecord) {
  return {
    status,
    record,
    access: accessState(record.identity.candidateId, "enabled", 1, record.registration.storedAt),
    registrationEvent: registrationEvent(record),
  };
}

function readResponse(record: AstroProductionCandidateRecord) {
  return {
    status: "found",
    record,
    access: accessState(record.identity.candidateId, "enabled", 1, record.registration.storedAt),
    registrationEventPresent: true,
  };
}

function metadataFor(record: AstroProductionCandidateRecord): AstroProductionCandidateMetadata {
  return {
    candidateId: record.identity.candidateId,
    runtimeSiteId: record.identity.runtimeSiteId,
    siteVersionId: record.identity.siteVersionId,
    ownershipSiteId: record.identity.ownershipSiteId,
    organizationId: record.identity.organizationId,
    agencyId: record.identity.agencyId,
    schemaVersion: record.schemaVersion,
    recordKind: record.recordKind,
    adapterId: record.candidate.manifest.adapterId,
    conversionVersion: record.candidate.manifest.conversionVersion,
    exportManifestVersion: record.candidate.manifest.provenance.exportManifestVersion,
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    candidateCreatedAt: record.candidate.createdAt,
    storedAt: record.registration.storedAt,
    producerKind: record.registration.producerKind,
    producerVersion: record.registration.producerVersion,
    producerRef: record.registration.producerRef,
    contentSha256: record.candidate.contentSha256,
    storageSha256: record.storageSha256,
    payloadSizeBytes: measureAstroProductionCandidateRecordBytes(record),
    access: accessState(record.identity.candidateId, "enabled", 1, record.registration.storedAt),
  };
}

function disableAction(): AstroProductionCandidateAccessAction {
  return {
    action: "disable",
    candidateId: CANDIDATE_ID,
    expectedVersion: 1,
    actorId: "actor:operations",
    reasonCode: "operator_disabled",
    idempotencyKey: "access:mvp14:disable",
    correlationId: "correlation:mvp14:disable",
    occurredAt: "2026-09-28T11:00:00.000Z",
  };
}

function oversizedRecord(source: AstroProductionCandidateRecord): AstroProductionCandidateRecord {
  const candidate = structuredClone(source.candidate);
  candidate.compiledTokenStyles = `:root{--oversized:${"x".repeat(2 * 1024 * 1024)}}`;
  candidate.contentSha256 = computeAstroInternalPreviewCandidateContentSha256(candidate);
  candidate.manifest.provenance.convertedArtifactSha256 = candidate.contentSha256;
  const unsigned = { ...structuredClone(source), candidate };
  const { storageSha256: _oldStorageSha256, ...withoutHash } = unsigned;
  return {
    ...withoutHash,
    storageSha256: computeAstroProductionCandidateStorageSha256(withoutHash),
  };
}

function repositoryError(code: AstroProductionCandidateRepositoryError["code"]) {
  return (error: unknown): boolean => error instanceof AstroProductionCandidateRepositoryError && error.code === code;
}
