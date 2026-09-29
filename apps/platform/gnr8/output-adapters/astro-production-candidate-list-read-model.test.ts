import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  AstroCandidateOwnershipResolutionError,
} from "./astro-production-candidate-ownership-resolver";
import {
  AstroProductionCandidateRepositoryError,
  type AstroProductionCandidateMetadata,
} from "./astro-production-candidate-repository";
import {
  createAstroProductionCandidateId,
  type AstroProductionCandidateOwnership,
} from "./astro-production-candidate-record";
import type {
  AstroProductionCandidateListDependencies,
} from "./astro-production-candidate-list-composition";
import {
  ASTRO_PRODUCTION_CANDIDATE_LIST_PAGE_SIZE,
  createAstroProductionCandidateListPageLoader,
} from "./astro-production-candidate-list-read-model";

const SITE_VERSION_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_SITE_VERSION_ID = "22222222-2222-4222-8222-222222222222";
const CANDIDATE_ID = createAstroProductionCandidateId("33333333-3333-4333-8333-333333333333");
const SECOND_CANDIDATE_ID = createAstroProductionCandidateId("44444444-4444-4444-8444-444444444444");
const THIRD_CANDIDATE_ID = createAstroProductionCandidateId("55555555-5555-4555-8555-555555555555");

const OWNERSHIP: AstroProductionCandidateOwnership = {
  runtimeSiteId: "runtime-site-mvp17-one",
  siteVersionId: SITE_VERSION_ID,
  ownershipSiteId: "66666666-6666-4666-8666-666666666666",
  organizationId: "77777777-7777-4777-8777-777777777777",
  agencyId: "88888888-8888-4888-8888-888888888888",
};

test("authentication is first for unauthenticated and non-superadmin page requests", async (t) => {
  for (const error of [new Error("Unauthorized"), new Error("Forbidden: superadmin only")]) {
    await t.test(error.message, async () => {
      const calls: string[] = [];
      const load = createAstroProductionCandidateListPageLoader({
        requireSuperadminUserIdForPage: async () => {
          calls.push("authenticate");
          throw error;
        },
        isFeatureEnabled: () => {
          calls.push("feature");
          return true;
        },
        loadListDependencies: async () => {
          calls.push("dependencies");
          return listDependencies([]);
        },
      });
      await assert.rejects(
        () => load({ params: pendingParams() }),
        (caught: unknown) => caught === error,
      );
      assert.deepEqual(calls, ["authenticate"]);
    });
  }
});

test("disabled gate performs zero selector, ownership, and repository reads", async () => {
  const calls: string[] = [];
  const load = createAstroProductionCandidateListPageLoader({
    requireSuperadminUserIdForPage: async () => {
      calls.push("authenticate");
      return "superadmin_mvp17";
    },
    isFeatureEnabled: () => {
      calls.push("feature");
      return false;
    },
    loadListDependencies: async () => {
      calls.push("dependencies");
      return listDependencies([]);
    },
  });

  assert.deepEqual(await load({ params: pendingParams() }), { state: "feature_disabled" });
  assert.deepEqual(calls, ["authenticate", "feature"]);
});

test("enabled page resolves exact scope and exposes metadata-only explicit preview links", async () => {
  const calls: string[] = [];
  const enabled = metadata();
  const disabled = metadata({
    candidateId: SECOND_CANDIDATE_ID,
    accessState: "disabled",
    reasonCode: "operator_disabled",
  });
  const unsupported = metadata({
    candidateId: THIRD_CANDIDATE_ID,
    schemaVersion: "gnr8-astro-persisted-preview-candidate:v3",
  });
  const dependencies: AstroProductionCandidateListDependencies = {
    resolveOwnership: async (input) => {
      calls.push(`ownership:${input.siteVersionId}`);
      return OWNERSHIP;
    },
    listCandidateMetadata: async (input) => {
      calls.push("list");
      assert.deepEqual(input.trustedScope, OWNERSHIP);
      assert.equal(input.cursor, null);
      assert.equal(input.limit, ASTRO_PRODUCTION_CANDIDATE_LIST_PAGE_SIZE);
      return { items: [enabled, disabled, unsupported], nextCursor: null };
    },
  };

  const model = await enabledLoader(dependencies)({ params: params() });
  assert.equal(model.state, "ready");
  if (model.state !== "ready") return;
  assert.deepEqual(calls, [`ownership:${SITE_VERSION_ID}`, "list"]);
  assert.equal(model.items[0].previewHref, `/api/gnr8/admin/astro-candidates/${SITE_VERSION_ID}/${CANDIDATE_ID}/preview?path=%2F`);
  assert.equal(model.items[1].previewHref, null);
  assert.equal(model.items[2].previewHref, null);
  assert.equal(model.items[2].compatibilityState, "unsupported");
  assert.equal(JSON.stringify(model).includes("html"), false);
  assert.deepEqual(Object.keys(dependencies).sort(), ["listCandidateMetadata", "resolveOwnership"]);
});

test("cursor pagination is stable, rejects malformed cursors, and binds continuation to resolved scope", async () => {
  let receivedCursor: unknown = "not-called";
  const dependencies = listDependencies([metadata()], {
    nextCursor: { storedAt: "2026-09-28T12:01:00.000Z", candidateId: CANDIDATE_ID },
    onCursor: (cursor) => { receivedCursor = cursor; },
  });
  const load = enabledLoader(dependencies);
  const first = await load({ params: params() });
  assert.equal(first.state, "ready");
  if (first.state !== "ready" || !first.nextCursor) return;
  assert.equal(receivedCursor, null);

  await load({ params: params(), searchParams: Promise.resolve({ cursor: first.nextCursor }) });
  assert.deepEqual(receivedCursor, { storedAt: "2026-09-28T12:01:00.000Z", candidateId: CANDIDATE_ID });

  let listCalls = 0;
  const changedScope: AstroProductionCandidateOwnership = {
    ...OWNERSHIP,
    organizationId: "99999999-9999-4999-8999-999999999999",
  };
  const changedScopeLoad = enabledLoader({
    resolveOwnership: async () => changedScope,
    listCandidateMetadata: async () => {
      listCalls += 1;
      return { items: [], nextCursor: null };
    },
  });
  const changed = await changedScopeLoad({
    params: params(),
    searchParams: Promise.resolve({ cursor: first.nextCursor }),
  });
  assert.equal(changed.state, "invalid_request");
  assert.equal(listCalls, 0);

  const malformed = await load({
    params: params(),
    searchParams: Promise.resolve({ cursor: "not-a-valid-cursor" }),
  });
  assert.equal(malformed.state, "invalid_request");
});

test("empty, access-denied, and unavailable states are sanitized and stop downstream work", async () => {
  const empty = await enabledLoader(listDependencies([]))({ params: params() });
  assert.equal(empty.state, "empty");

  let listCalls = 0;
  const denied = await enabledLoader({
    resolveOwnership: async () => {
      throw new AstroCandidateOwnershipResolutionError("ownership_mismatch", "secret other owner");
    },
    listCandidateMetadata: async () => {
      listCalls += 1;
      return { items: [], nextCursor: null };
    },
  })({ params: params() });
  assert.equal(denied.state, "access_denied");
  assert.equal(JSON.stringify(denied).includes("secret"), false);
  assert.equal(listCalls, 0);

  const unavailable = await enabledLoader({
    resolveOwnership: async () => OWNERSHIP,
    listCandidateMetadata: async () => {
      throw new AstroProductionCandidateRepositoryError(
        "unavailable",
        "SQL credentials stack /private/path <html>payload</html>",
      );
    },
  })({ params: params() });
  assert.equal(unavailable.state, "unavailable");
  assert.equal(JSON.stringify(unavailable).includes("SQL"), false);
  assert.equal(JSON.stringify(unavailable).includes("payload"), false);
});

test("concurrent site-version requests retain request-local scopes and candidate links", async () => {
  const secondScope: AstroProductionCandidateOwnership = {
    ...OWNERSHIP,
    runtimeSiteId: "runtime-site-mvp17-two",
    siteVersionId: SECOND_SITE_VERSION_ID,
    ownershipSiteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  };
  const dependencies: AstroProductionCandidateListDependencies = {
    resolveOwnership: async ({ siteVersionId }) => {
      await delay(siteVersionId === SITE_VERSION_ID ? 8 : 1);
      return siteVersionId === SITE_VERSION_ID ? OWNERSHIP : secondScope;
    },
    listCandidateMetadata: async ({ trustedScope }) => {
      await delay(trustedScope.siteVersionId === SITE_VERSION_ID ? 1 : 8);
      return {
        items: [metadata({
          candidateId: trustedScope.siteVersionId === SITE_VERSION_ID ? CANDIDATE_ID : SECOND_CANDIDATE_ID,
          scope: trustedScope,
        })],
        nextCursor: null,
      };
    },
  };
  const load = enabledLoader(dependencies);
  const [first, second] = await Promise.all([
    load({ params: params() }),
    load({ params: params(SECOND_SITE_VERSION_ID) }),
  ]);
  assert.equal(first.state, "ready");
  assert.equal(second.state, "ready");
  if (first.state !== "ready" || second.state !== "ready") return;
  assert.match(first.items[0].previewHref ?? "", new RegExp(`${SITE_VERSION_ID}/${CANDIDATE_ID}`));
  assert.doesNotMatch(first.items[0].previewHref ?? "", new RegExp(SECOND_CANDIDATE_ID));
  assert.match(second.items[0].previewHref ?? "", new RegExp(`${SECOND_SITE_VERSION_ID}/${SECOND_CANDIDATE_ID}`));
  assert.doesNotMatch(second.items[0].previewHref ?? "", new RegExp(CANDIDATE_ID));
});

test("composition exposes metadata listing only and traps payload, mutation, and producer calls", async () => {
  const source = await readFile(new URL("./astro-production-candidate-list-composition.ts", import.meta.url), "utf8");
  assert.match(source, /repository\.list\(input\)/);
  assert.doesNotMatch(source, /repository\.(read|create|setAccess)\(/);
  assert.doesNotMatch(source, /renderCandidate|htmlByPath|canonical_record|registerAstro|producer/i);
});

function enabledLoader(dependencies: AstroProductionCandidateListDependencies) {
  return createAstroProductionCandidateListPageLoader({
    requireSuperadminUserIdForPage: async () => "superadmin_mvp17",
    isFeatureEnabled: () => true,
    loadListDependencies: async () => dependencies,
  });
}

function listDependencies(
  items: AstroProductionCandidateMetadata[],
  options: {
    nextCursor?: { storedAt: string; candidateId: string } | null;
    onCursor?: (cursor: unknown) => void;
  } = {},
): AstroProductionCandidateListDependencies {
  return {
    resolveOwnership: async () => OWNERSHIP,
    listCandidateMetadata: async ({ cursor }) => {
      options.onCursor?.(cursor);
      return { items, nextCursor: options.nextCursor ?? null };
    },
  };
}

function metadata(input: {
  candidateId?: string;
  scope?: AstroProductionCandidateOwnership;
  accessState?: "enabled" | "disabled";
  reasonCode?: string;
  schemaVersion?: string;
} = {}): AstroProductionCandidateMetadata {
  const scope = input.scope ?? OWNERSHIP;
  const candidateId = input.candidateId ?? CANDIDATE_ID;
  return {
    candidateId,
    ...scope,
    schemaVersion: input.schemaVersion ?? "gnr8-astro-persisted-preview-candidate:v2",
    recordKind: "astro_internal_preview_candidate_record",
    adapterId: "astro-static-site",
    conversionVersion: "gnr8-astro-internal-preview-conversion:v1",
    exportManifestVersion: "gnr8-astro-static-export:v1",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    candidateCreatedAt: "2026-09-28T12:00:00.000Z",
    storedAt: "2026-09-28T12:01:00.000Z",
    producerKind: "internal_synthetic_astro_build_export_bridge",
    producerVersion: "v1",
    producerRef: `synthetic:${candidateId}`,
    contentSha256: "a".repeat(64),
    storageSha256: "b".repeat(64),
    payloadSizeBytes: 12345,
    access: {
      candidateId,
      state: input.accessState ?? "enabled",
      reasonCode: input.reasonCode ?? "candidate_registered",
      changedByActorId: "superadmin_mvp17",
      changedAt: "2026-09-28T12:01:00.000Z",
      version: 1,
    },
  };
}

function params(siteVersionId = SITE_VERSION_ID) {
  return Promise.resolve({ siteVersionId });
}

function pendingParams(): Promise<{ siteVersionId: string }> {
  return new Promise(() => {});
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
