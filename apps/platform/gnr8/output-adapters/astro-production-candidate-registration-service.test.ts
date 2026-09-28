import assert from "node:assert/strict";
import test from "node:test";

import {
  AstroProductionCandidateRegistrationError,
  createAstroProductionCandidateRegistrationService,
  InMemoryAstroCandidateRegistrationRetryContextStore,
  type AstroProductionCandidateRegistrationServiceDependencies,
  type AstroSyntheticCandidateProducer,
} from "./astro-production-candidate-registration-service";
import {
  GatewayBackedAstroProductionCandidateRepository,
  InMemoryAstroProductionCandidateGateway,
  type AstroProductionCandidateGateway,
  type AstroProductionCandidateGatewayCreateInput,
} from "./astro-production-candidate-repository";
import {
  createAstroProductionCandidateId,
  type AstroProductionCandidateOwnership,
  type AstroProductionCandidateRegistrationContext,
} from "./astro-production-candidate-record";
import { createSyntheticAstroInternalPreviewCandidate } from "./astro-internal-preview-candidate-test-fixture";
import {
  INTERNAL_SYNTHETIC_ASTRO_FIXTURE_ID,
  INTERNAL_SYNTHETIC_ASTRO_PRODUCER_KIND,
  INTERNAL_SYNTHETIC_ASTRO_PRODUCER_VERSION,
} from "./internal-synthetic-astro-candidate-producer";

const OPERATION_ID = "11111111-1111-4111-8111-111111111111";
const OPERATION_ID_2 = "22222222-2222-4222-8222-222222222222";
const SITE_VERSION_ID = "33333333-3333-4333-8333-333333333333";
const SITE_VERSION_ID_2 = "44444444-4444-4444-8444-444444444444";
const OWNERSHIP_SITE_ID = "55555555-5555-4555-8555-555555555555";
const ORGANIZATION_ID = "66666666-6666-4666-8666-666666666666";
const AGENCY_ID = "77777777-7777-4777-8777-777777777777";
const ACTOR_ID = "user_mvp15_superadmin";
const CREATED_AT = "2026-09-28T10:00:00.000Z";
const STORED_AT = "2026-09-28T10:01:00.000Z";

test("authentication denials happen before ownership, producer, retry-context, and repository work", async (t) => {
  for (const label of ["unauthenticated", "non-admin"] as const) {
    await t.test(label, async () => {
      const calls: string[] = [];
      const service = createAstroProductionCandidateRegistrationService({
        authenticateSuperadmin: async () => {
          calls.push("authenticate");
          throw new Error(label);
        },
        resolveOwnership: async () => {
          calls.push("ownership");
          return ownership();
        },
        producer: producer(calls),
        repository: {
          create: async () => {
            calls.push("repository");
            throw new Error("must not write");
          },
        },
        retryContexts: trackingRetryStore(calls),
        now: () => new Date(CREATED_AT),
      });

      await assertRegistrationError(service(request()), "authentication_failed", null);
      assert.deepEqual(calls, ["authenticate"]);
    });
  }
});

test("unsupported input, rejected ownership, invalid candidates, and oversized candidates perform zero writes", async (t) => {
  await t.test("unsupported producer", async () => {
    let writes = 0;
    const service = serviceWith({
      repository: rejectingWriteCounter(() => writes += 1),
    });
    await assertRegistrationError(
      service(request({ producer: { kind: "unknown", version: "v1" } })),
      "unsupported_producer",
    );
    assert.equal(writes, 0);
  });

  for (const label of ["incomplete ownership", "mismatched ownership"] as const) {
    await t.test(label, async () => {
      let producerCalls = 0;
      let writes = 0;
      const service = serviceWith({
        resolveOwnership: async () => {
          if (label === "incomplete ownership") throw new Error("missing owner");
          return { ...ownership(), siteVersionId: SITE_VERSION_ID_2 };
        },
        producer: producer([], () => producerCalls += 1),
        repository: rejectingWriteCounter(() => writes += 1),
      });
      await assertRegistrationError(service(request()), "ownership_rejected");
      assert.equal(producerCalls, 0);
      assert.equal(writes, 0);
    });
  }

  await t.test("invalid candidate payload", async () => {
    let writes = 0;
    const invalidProducer = producer([], undefined, ({ candidateId, candidateCreatedAt, ownership: scope }) => ({
      ...createCandidate(candidateId, candidateCreatedAt, scope),
      id: createAstroProductionCandidateId(OPERATION_ID_2),
    }));
    const service = serviceWith({
      producer: invalidProducer,
      repository: rejectingWriteCounter(() => writes += 1),
    });
    await assertRegistrationError(service(request()), "candidate_invalid");
    assert.equal(writes, 0);
  });

  await t.test("oversized candidate", async () => {
    let writes = 0;
    const oversizedProducer = producer([], undefined, ({ candidateId, candidateCreatedAt, ownership: scope }) =>
      createCandidate(candidateId, candidateCreatedAt, scope, `<!doctype html><p>${"x".repeat(2 * 1024 * 1024)}</p>`));
    const service = serviceWith({
      producer: oversizedProducer,
      repository: rejectingWriteCounter(() => writes += 1),
    });
    await assertRegistrationError(service(request()), "record_too_large");
    assert.equal(writes, 0);
  });
});

test("successful orchestration preserves ordering and exact actor, producer, ownership, and operation context", async () => {
  const calls: string[] = [];
  const gateway = new InMemoryAstroProductionCandidateGateway();
  const actualRepository = new GatewayBackedAstroProductionCandidateRepository({
    gateway,
    now: () => new Date(STORED_AT),
  });
  let capturedRegistration: AstroProductionCandidateRegistrationContext | null = null;
  let capturedScope: AstroProductionCandidateOwnership | null = null;
  const service = createAstroProductionCandidateRegistrationService({
    authenticateSuperadmin: async () => {
      calls.push("authenticate");
      return ACTOR_ID;
    },
    resolveOwnership: async () => {
      calls.push("ownership");
      return ownership();
    },
    producer: producer(calls),
    repository: {
      create: async (input) => {
        calls.push("repository");
        capturedRegistration = structuredClone(input.registration);
        capturedScope = structuredClone(input.trustedScope);
        return actualRepository.create(input);
      },
    },
    retryContexts: new InMemoryAstroCandidateRegistrationRetryContextStore(),
    now: () => new Date(CREATED_AT),
  });

  const result = await service(request());
  assert.equal(result.status, "created");
  assert.equal(result.operationId, OPERATION_ID);
  assert.equal(result.correlationId, `astro-registration:${OPERATION_ID}`);
  assert.equal(result.candidate.candidateId, createAstroProductionCandidateId(OPERATION_ID));
  assert.equal(result.candidate.storedAt, STORED_AT);
  assert.deepEqual(calls, ["authenticate", "ownership", "producer", "ownership", "repository"]);
  assert.deepEqual(capturedScope, ownership());
  assert.deepEqual(capturedRegistration, {
    registeredByActorId: ACTOR_ID,
    producerKind: INTERNAL_SYNTHETIC_ASTRO_PRODUCER_KIND,
    producerVersion: INTERNAL_SYNTHETIC_ASTRO_PRODUCER_VERSION,
    producerRef: `internal-synthetic-astro:${OPERATION_ID}`,
    idempotencyKey: `astro-registration:${OPERATION_ID}`,
    correlationId: `astro-registration:${OPERATION_ID}`,
  });
});

test("commit-then-timeout retry reuses the exact candidate and returns the original storedAt without a duplicate", async () => {
  const inner = new InMemoryAstroProductionCandidateGateway();
  let firstCreate = true;
  let accessToggleCalls = 0;
  let producerCalls = 0;
  let clockCalls = 0;
  const gateway: AstroProductionCandidateGateway = {
    async atomicCreate(input: AstroProductionCandidateGatewayCreateInput) {
      const outcome = await inner.atomicCreate(input);
      if (firstCreate) {
        firstCreate = false;
        return { status: "unavailable" };
      }
      return outcome;
    },
    readForScope: (input) => inner.readForScope(input),
    listMetadata: (input) => inner.listMetadata(input),
    atomicSetAccess: async () => {
      accessToggleCalls += 1;
      throw new Error("registration must not invoke access toggles");
    },
  };
  const repository = new GatewayBackedAstroProductionCandidateRepository({
    gateway,
    now: () => new Date(clockCalls++ === 0 ? STORED_AT : "2026-09-28T12:00:00.000Z"),
  });
  const service = serviceWith({
    producer: producer([], () => producerCalls += 1),
    repository,
  });

  const firstError = await captureRegistrationError(service(request()));
  assert.equal(firstError.code, "ambiguous_write");
  assert.equal(firstError.retryable, true);
  assert.equal(firstError.correlationId, `astro-registration:${OPERATION_ID}`);

  const retry = await service(request());
  assert.equal(retry.status, "idempotent");
  assert.equal(retry.candidate.storedAt, STORED_AT);
  assert.equal(retry.candidate.candidateId, createAstroProductionCandidateId(OPERATION_ID));
  assert.equal(producerCalls, 1);
  assert.equal(accessToggleCalls, 0);

  const listed = await repository.list({ trustedScope: ownership(), limit: 10 });
  assert.equal(listed.items.length, 1);
  assert.equal(listed.items[0]?.storedAt, STORED_AT);
});

test("the same operation identity rejects changed payload, actor, site-version, and producer intent", async (t) => {
  let actor = ACTOR_ID;
  const service = serviceWith({ authenticateSuperadmin: async () => actor });
  await service(request());

  await t.test("payload", async () => {
    await assertRegistrationError(
      service(request({ syntheticInput: { fixtureId: "different_fixture" } })),
      "operation_context_conflict",
    );
  });
  await t.test("actor", async () => {
    actor = "user_other_superadmin";
    await assertRegistrationError(service(request()), "operation_context_conflict");
    actor = ACTOR_ID;
  });
  await t.test("site version", async () => {
    await assertRegistrationError(
      service(request({ siteVersionId: SITE_VERSION_ID_2 })),
      "operation_context_conflict",
    );
  });
  await t.test("producer", async () => {
    await assertRegistrationError(
      service(request({ producer: { kind: "changed_producer", version: "v2" } })),
      "operation_context_conflict",
    );
  });
});

test("ownership changes during production reject registration and preserve zero writes", async () => {
  let ownershipCalls = 0;
  let writes = 0;
  const service = serviceWith({
    resolveOwnership: async () => {
      ownershipCalls += 1;
      return ownershipCalls === 1 ? ownership() : { ...ownership(), agencyId: "88888888-8888-4888-8888-888888888888" };
    },
    repository: rejectingWriteCounter(() => writes += 1),
  });

  await assertRegistrationError(service(request()), "ownership_changed");
  assert.equal(ownershipCalls, 2);
  assert.equal(writes, 0);
});

test("concurrent operations remain isolated", async () => {
  const gateway = new InMemoryAstroProductionCandidateGateway();
  const repository = new GatewayBackedAstroProductionCandidateRepository({ gateway, now: () => new Date(STORED_AT) });
  const seenCandidates: string[] = [];
  const concurrentProducer = producer([], undefined, async (input) => {
    seenCandidates.push(input.candidateId);
    await Promise.resolve();
    return createCandidate(input.candidateId, input.candidateCreatedAt, input.ownership);
  });
  const service = serviceWith({ producer: concurrentProducer, repository });

  const [first, second] = await Promise.all([
    service(request()),
    service(request({ operationId: OPERATION_ID_2, siteVersionId: SITE_VERSION_ID_2 })),
  ]);
  assert.notEqual(first.candidate.candidateId, second.candidate.candidateId);
  assert.deepEqual(new Set(seenCandidates), new Set([
    createAstroProductionCandidateId(OPERATION_ID),
    createAstroProductionCandidateId(OPERATION_ID_2),
  ]));
});

test("unconfigured composition fails closed after authentication is attempted", async () => {
  const service = createAstroProductionCandidateRegistrationService();
  await assertRegistrationError(service(request()), "unconfigured", null);
});

test("explicit platform composition remains inert and unmounted when imported", async () => {
  const composition = await import("./astro-production-candidate-registration-composition");
  assert.equal(typeof composition.createProcessLocalPlatformSyntheticAstroRegistrationService, "function");
});

function serviceWith(
  overrides: Partial<AstroProductionCandidateRegistrationServiceDependencies> = {},
) {
  const gateway = new InMemoryAstroProductionCandidateGateway();
  const repository = new GatewayBackedAstroProductionCandidateRepository({
    gateway,
    now: () => new Date(STORED_AT),
  });
  return createAstroProductionCandidateRegistrationService({
    authenticateSuperadmin: async () => ACTOR_ID,
    resolveOwnership: async ({ siteVersionId }) => ownership(siteVersionId),
    producer: producer([]),
    repository,
    retryContexts: new InMemoryAstroCandidateRegistrationRetryContextStore(),
    now: () => new Date(CREATED_AT),
    ...overrides,
  });
}

function producer(
  calls: string[],
  onProduce?: () => void,
  create: (
    input: Parameters<AstroSyntheticCandidateProducer["produce"]>[0],
  ) => ReturnType<AstroSyntheticCandidateProducer["produce"]> | Awaited<ReturnType<AstroSyntheticCandidateProducer["produce"]>> =
    ({ candidateId, candidateCreatedAt, ownership: scope }) =>
      createCandidate(candidateId, candidateCreatedAt, scope),
): AstroSyntheticCandidateProducer {
  return {
    kind: INTERNAL_SYNTHETIC_ASTRO_PRODUCER_KIND,
    version: INTERNAL_SYNTHETIC_ASTRO_PRODUCER_VERSION,
    supports: (input) => input.fixtureId === INTERNAL_SYNTHETIC_ASTRO_FIXTURE_ID,
    async produce(input) {
      calls.push("producer");
      onProduce?.();
      return create(input);
    },
  };
}

function createCandidate(
  candidateId: string,
  candidateCreatedAt: string,
  scope: AstroProductionCandidateOwnership,
  html?: string,
) {
  return createSyntheticAstroInternalPreviewCandidate({
    candidateId,
    siteId: scope.runtimeSiteId,
    siteVersionId: scope.siteVersionId,
    createdAt: candidateCreatedAt,
    html,
  });
}

function ownership(siteVersionId = SITE_VERSION_ID): AstroProductionCandidateOwnership {
  return {
    runtimeSiteId: `runtime-site-${siteVersionId.slice(0, 8)}`,
    siteVersionId,
    ownershipSiteId: OWNERSHIP_SITE_ID,
    organizationId: ORGANIZATION_ID,
    agencyId: AGENCY_ID,
  };
}

function request(
  overrides: Partial<Parameters<ReturnType<typeof createAstroProductionCandidateRegistrationService>>[0]> = {},
) {
  return {
    operationId: OPERATION_ID,
    siteVersionId: SITE_VERSION_ID,
    producer: {
      kind: INTERNAL_SYNTHETIC_ASTRO_PRODUCER_KIND,
      version: INTERNAL_SYNTHETIC_ASTRO_PRODUCER_VERSION,
    },
    syntheticInput: { fixtureId: INTERNAL_SYNTHETIC_ASTRO_FIXTURE_ID },
    ...overrides,
  };
}

function rejectingWriteCounter(onWrite: () => void) {
  return {
    create: async (): Promise<never> => {
      onWrite();
      throw new Error("unexpected write");
    },
  };
}

function trackingRetryStore(calls: string[]): InMemoryAstroCandidateRegistrationRetryContextStore {
  const store = new InMemoryAstroCandidateRegistrationRetryContextStore();
  return new Proxy(store, {
    get(target, property, receiver) {
      if (property === "load" || property === "claim" || property === "preserveValidatedCandidate") {
        return (...args: unknown[]) => {
          calls.push("retry-context");
          return Reflect.apply(Reflect.get(target, property, receiver), target, args);
        };
      }
      return Reflect.get(target, property, receiver);
    },
  });
}

async function assertRegistrationError(
  promise: Promise<unknown>,
  code: AstroProductionCandidateRegistrationError["code"],
  correlationId: string | null = `astro-registration:${OPERATION_ID}`,
): Promise<void> {
  const error = await captureRegistrationError(promise);
  assert.equal(error.code, code);
  assert.equal(error.correlationId, correlationId);
  assert.equal(/missing owner|must not write|unexpected write/.test(error.message), false);
}

async function captureRegistrationError(promise: Promise<unknown>): Promise<AstroProductionCandidateRegistrationError> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof AstroProductionCandidateRegistrationError);
    return error;
  }
  assert.fail("Expected Astro production candidate registration to fail.");
}
