import assert from "node:assert/strict";
import test from "node:test";

import {
  createAstroProductionCandidateId,
  serializeAstroProductionCandidateRecord,
  type AstroProductionCandidateOwnership,
} from "./astro-production-candidate-record";
import {
  AstroProductionCandidateRepositoryError,
  GatewayBackedAstroProductionCandidateRepository,
  InMemoryAstroProductionCandidateGateway,
} from "./astro-production-candidate-repository";
import { createSyntheticAstroInternalPreviewCandidate } from "./astro-internal-preview-candidate-test-fixture";

const CANDIDATE_ID = createAstroProductionCandidateId("11111111-1111-4111-8111-111111111111");
const SECOND_CANDIDATE_ID = createAstroProductionCandidateId("66666666-6666-4666-8666-666666666666");
const OWNERSHIP: AstroProductionCandidateOwnership = {
  runtimeSiteId: "runtime-site-production-repository",
  siteVersionId: "22222222-2222-4222-8222-222222222222",
  ownershipSiteId: "33333333-3333-4333-8333-333333333333",
  organizationId: "44444444-4444-4444-8444-444444444444",
  agencyId: "55555555-5555-4555-8555-555555555555",
};

test("atomic create returns the original record for an identical immutable registration retry", async () => {
  const gateway = new InMemoryAstroProductionCandidateGateway();
  const first = await repository(gateway, "2026-09-28T10:00:00.000Z").create(createInput());
  const retry = await repository(gateway, "2030-01-01T00:00:00.000Z").create(createInput());

  assert.equal(first.status, "created");
  assert.equal(retry.status, "idempotent");
  assert.deepEqual(retry.record, first.record);
  assert.equal(retry.record.registration.storedAt, "2026-09-28T10:00:00.000Z");
  assert.equal(retry.record.storageSha256, first.record.storageSha256);
});

test("changed payload, ownership, producer intent, candidate ID, or idempotency key conflicts", async (t) => {
  const scenarios: Array<{
    name: string;
    second: ReturnType<typeof createInput>;
  }> = [
    {
      name: "payload",
      second: createInput({ html: supportedHtml("different payload") }),
    },
    {
      name: "ownership",
      second: createInput({
        trustedScope: { ...OWNERSHIP, organizationId: "77777777-7777-4777-8777-777777777777" },
      }),
    },
    {
      name: "producer intent",
      second: createInput({ producerRef: "synthetic:mvp11:changed" }),
    },
    {
      name: "idempotency key",
      second: createInput({ idempotencyKey: "idem:mvp11:changed" }),
    },
  ];
  for (const scenario of scenarios) {
    await t.test(scenario.name, async () => {
      const gateway = new InMemoryAstroProductionCandidateGateway();
      const repo = repository(gateway);
      await repo.create(createInput());
      await assert.rejects(() => repo.create(scenario.second), repositoryError("conflicting_write"));
    });
  }

  await t.test("idempotency key reused by another candidate", async () => {
    const gateway = new InMemoryAstroProductionCandidateGateway();
    const repo = repository(gateway);
    await repo.create(createInput());
    await assert.rejects(
      () => repo.create(createInput({ candidateId: SECOND_CANDIDATE_ID })),
      repositoryError("conflicting_write"),
    );
  });
});

test("modeled concurrent identical creates elect one winner and return one immutable record", async () => {
  const gateway = new InMemoryAstroProductionCandidateGateway();
  const repo = repository(gateway);
  const outcomes = await Promise.all([repo.create(createInput()), repo.create(createInput())]);
  assert.deepEqual(new Set(outcomes.map((outcome) => outcome.status)), new Set(["created", "idempotent"]));
  assert.deepEqual(outcomes[0].record, outcomes[1].record);
});

test("modeled concurrent conflicting creates elect one winner without exposing its payload", async () => {
  const gateway = new InMemoryAstroProductionCandidateGateway();
  const repo = repository(gateway);
  const outcomes = await Promise.allSettled([
    repo.create(createInput({ html: supportedHtml("winner A") })),
    repo.create(createInput({ html: supportedHtml("winner B") })),
  ]);
  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  const rejected = outcomes.find((outcome): outcome is PromiseRejectedResult => outcome.status === "rejected");
  assert.equal(repositoryError("conflicting_write")(rejected?.reason), true);
  assert.equal(String(rejected?.reason).includes("winner A"), false);
  assert.equal(String(rejected?.reason).includes("winner B"), false);
});

test("read requires the complete trusted runtime and first-class ownership scope", async () => {
  const gateway = new InMemoryAstroProductionCandidateGateway();
  const repo = repository(gateway);
  const created = await repo.create(createInput());
  assert.deepEqual(
    await repo.read({ candidateId: CANDIDATE_ID, trustedScope: OWNERSHIP }),
    created.record,
  );
  await assert.rejects(
    () => repo.read({
      candidateId: CANDIDATE_ID,
      trustedScope: { ...OWNERSHIP, agencyId: "77777777-7777-4777-8777-777777777777" },
    }),
    repositoryError("ownership_mismatch"),
  );
  await assert.rejects(
    () => repo.read({ candidateId: SECOND_CANDIDATE_ID, trustedScope: OWNERSHIP }),
    repositoryError("missing"),
  );
});

test("metadata listing is scoped, bounded, ordered, cursor-based, and payload-free", async () => {
  const gateway = new InMemoryAstroProductionCandidateGateway();
  const timestamps = ["2026-09-28T10:00:00.000Z", "2026-09-28T11:00:00.000Z"];
  let clock = 0;
  const repo = new GatewayBackedAstroProductionCandidateRepository({
    gateway,
    now: () => new Date(timestamps[clock++] ?? timestamps.at(-1)),
  });
  await repo.create(createInput());
  await repo.create(createInput({
    candidateId: SECOND_CANDIDATE_ID,
    idempotencyKey: "idem:mvp11:two",
    correlationId: "correlation:mvp11:two",
  }));

  const firstPage = await repo.list({ trustedScope: OWNERSHIP, limit: 1 });
  assert.equal(firstPage.items.length, 1);
  assert.equal(firstPage.items[0].candidateId, SECOND_CANDIDATE_ID);
  assert.ok(firstPage.nextCursor);
  const metadataJson = JSON.stringify(firstPage.items[0]);
  assert.equal(metadataJson.includes("html"), false);
  assert.equal(metadataJson.includes("Production repository candidate"), false);
  assert.equal(metadataJson.includes("candidate\":"), false);

  const secondPage = await repo.list({
    trustedScope: OWNERSHIP,
    cursor: firstPage.nextCursor,
    limit: 1,
  });
  assert.equal(secondPage.items[0].candidateId, CANDIDATE_ID);
  assert.equal(secondPage.nextCursor, null);
});

test("disable and audited superadmin re-enable mutate access state only", async () => {
  const gateway = new InMemoryAstroProductionCandidateGateway();
  const repo = repository(gateway);
  const created = await repo.create(createInput());
  const immutableBefore = serializeAstroProductionCandidateRecord(created.record);

  const disabled = await repo.setAccess({
    action: "disable",
    candidateId: CANDIDATE_ID,
    expectedVersion: 1,
    actorId: "actor:operations",
    reasonCode: "operator_disabled",
    idempotencyKey: "access:mvp11:disable",
    correlationId: "correlation:mvp11:disable",
    occurredAt: "2026-09-28T12:00:00.000Z",
  });
  assert.equal(disabled.status, "updated");
  assert.equal(disabled.access.state, "disabled");
  assert.equal(disabled.event.action, "disabled");
  await assert.rejects(
    () => repo.read({ candidateId: CANDIDATE_ID, trustedScope: OWNERSHIP }),
    repositoryError("disabled"),
  );

  await assert.rejects(
    () => repo.setAccess({
      action: "re_enable",
      candidateId: CANDIDATE_ID,
      expectedVersion: 2,
      actorId: "actor:superadmin",
      reasonCode: "integrity_revalidated",
      idempotencyKey: "access:mvp11:enable:bad",
      correlationId: "correlation:mvp11:enable:bad",
      occurredAt: "2026-09-28T13:00:00.000Z",
      superadminAuthorization: { policy: "existing_superadmin", actorUserId: "actor:superadmin" },
      renewedIntegrityValidation: {
        validatedAt: "2026-09-28T12:59:00.000Z",
        contentSha256: created.record.candidate.contentSha256,
        storageSha256: "0".repeat(64),
      },
    }),
    repositoryError("reenable_prerequisite_failed"),
  );

  const enabled = await repo.setAccess({
    action: "re_enable",
    candidateId: CANDIDATE_ID,
    expectedVersion: 2,
    actorId: "actor:superadmin",
    reasonCode: "integrity_revalidated",
    idempotencyKey: "access:mvp11:enable",
    correlationId: "correlation:mvp11:enable",
    occurredAt: "2026-09-28T13:00:00.000Z",
    superadminAuthorization: { policy: "existing_superadmin", actorUserId: "actor:superadmin" },
    renewedIntegrityValidation: {
      validatedAt: "2026-09-28T12:59:00.000Z",
      contentSha256: created.record.candidate.contentSha256,
      storageSha256: created.record.storageSha256,
    },
  });
  assert.equal(enabled.access.state, "enabled");
  assert.equal(enabled.access.version, 3);
  assert.equal(enabled.event.action, "enabled");
  const reloaded = await repo.read({ candidateId: CANDIDATE_ID, trustedScope: OWNERSHIP });
  assert.equal(serializeAstroProductionCandidateRecord(reloaded), immutableBefore);
});

test("re-enable requires matching superadmin identity and renewed integrity evidence", async () => {
  const gateway = new InMemoryAstroProductionCandidateGateway();
  const repo = repository(gateway);
  const created = await repo.create(createInput());
  await repo.setAccess({
    action: "disable",
    candidateId: CANDIDATE_ID,
    expectedVersion: 1,
    actorId: "actor:operations",
    reasonCode: "operator_disabled",
    idempotencyKey: "access:disable",
    correlationId: "correlation:disable",
    occurredAt: "2026-09-28T12:00:00.000Z",
  });
  await assert.rejects(
    () => repo.setAccess({
      action: "re_enable",
      candidateId: CANDIDATE_ID,
      expectedVersion: 2,
      actorId: "actor:not-the-superadmin",
      reasonCode: "integrity_revalidated",
      idempotencyKey: "access:enable",
      correlationId: "correlation:enable",
      occurredAt: "2026-09-28T13:00:00.000Z",
      superadminAuthorization: { policy: "existing_superadmin", actorUserId: "actor:superadmin" },
      renewedIntegrityValidation: {
        validatedAt: "2026-09-28T12:59:00.000Z",
        contentSha256: created.record.candidate.contentSha256,
        storageSha256: created.record.storageSha256,
      },
    }),
    repositoryError("reenable_prerequisite_failed"),
  );

  await assert.rejects(
    () => repo.setAccess({
      action: "re_enable",
      candidateId: CANDIDATE_ID,
      expectedVersion: 2,
      actorId: "actor:superadmin",
      reasonCode: "stale_integrity_validation",
      idempotencyKey: "access:enable:stale",
      correlationId: "correlation:enable:stale",
      occurredAt: "2026-09-28T13:00:00.000Z",
      superadminAuthorization: { policy: "existing_superadmin", actorUserId: "actor:superadmin" },
      renewedIntegrityValidation: {
        validatedAt: "2026-09-28T11:59:59.999Z",
        contentSha256: created.record.candidate.contentSha256,
        storageSha256: created.record.storageSha256,
      },
    }),
    repositoryError("reenable_prerequisite_failed"),
  );
});

function repository(
  gateway: InMemoryAstroProductionCandidateGateway,
  now = "2026-09-28T10:00:00.000Z",
) {
  return new GatewayBackedAstroProductionCandidateRepository({ gateway, now: () => new Date(now) });
}

function createInput(input: {
  candidateId?: string;
  html?: string;
  trustedScope?: AstroProductionCandidateOwnership;
  producerRef?: string;
  idempotencyKey?: string;
  correlationId?: string;
} = {}) {
  const candidateId = input.candidateId ?? CANDIDATE_ID;
  const trustedScope = input.trustedScope ?? OWNERSHIP;
  return {
    candidate: createSyntheticAstroInternalPreviewCandidate({
      candidateId,
      siteId: OWNERSHIP.runtimeSiteId,
      siteVersionId: OWNERSHIP.siteVersionId,
      html: input.html ?? supportedHtml("Production repository candidate"),
      createdAt: "2026-09-28T09:00:00.000Z",
    }),
    trustedScope,
    registration: {
      registeredByActorId: "actor:production-repository-test",
      producerKind: "internal_astro_build_export_bridge",
      producerVersion: "gnr8-internal-astro-build-export-bridge:v1",
      producerRef: input.producerRef ?? "synthetic:mvp11",
      idempotencyKey: input.idempotencyKey ?? "idem:mvp11:one",
      correlationId: input.correlationId ?? "correlation:mvp11:one",
    },
  };
}

function supportedHtml(content: string): string {
  return `<!doctype html><html><head><style>:root{--proof:#0f766e}</style></head><body><p>${content}</p></body></html>`;
}

function repositoryError(code: AstroProductionCandidateRepositoryError["code"]) {
  return (error: unknown): boolean => error instanceof AstroProductionCandidateRepositoryError && error.code === code;
}
