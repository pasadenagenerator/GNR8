import assert from "node:assert/strict";
import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  AUTHENTICATED_ASTRO_READBACK_HTML_CSP,
  createAuthenticatedAstroCandidateReadbackRouteHandlers,
} from "./authenticated-astro-candidate-readback-route-handlers";
import {
  AstroCandidateRepositoryError,
  LocalFilesystemAstroInternalPreviewCandidateRepository,
  astroCandidateStorageKey,
  type AstroCandidateRepositoryIdentity,
} from "./astro-internal-preview-candidate-repository";
import { createSyntheticAstroInternalPreviewCandidate } from "./astro-internal-preview-candidate-test-fixture";

const IDENTITY: AstroCandidateRepositoryIdentity = {
  candidateId: "candidate-authenticated-readback",
  siteId: "site-authenticated-readback",
  siteVersionId: "sv-authenticated-readback",
};

test("authenticated readback modules remain inert when imported", async () => {
  const service = await import("./authenticated-astro-candidate-readback-service");
  assert.equal(typeof service.createAuthenticatedAstroCandidateReadbackService, "function");
  const proof = await import("./run-authenticated-astro-candidate-readback-proof");
  assert.equal(typeof proof.main, "function");
});

test("unauthenticated and non-superadmin callers are denied before scope or repository access", async (t) => {
  for (const scenario of [
    { name: "unauthenticated", error: new Error("Unauthorized"), status: 401 },
    { name: "non-superadmin", error: new Error("Forbidden: superadmin only"), status: 403 },
  ]) {
    await t.test(scenario.name, async () => {
      let scopeReads = 0;
      let repositoryReads = 0;
      const response = await createAuthenticatedAstroCandidateReadbackRouteHandlers({
        authenticateSuperadmin: async () => { throw scenario.error; },
        resolveTrustedScope: async () => {
          scopeReads += 1;
          return IDENTITY;
        },
        repository: {
          read: async () => {
            repositoryReads += 1;
            throw new Error("repository must not be called");
          },
        },
      }).GET(requestFor(IDENTITY));
      assert.equal(response.status, scenario.status);
      assert.equal(scopeReads, 0);
      assert.equal(repositoryReads, 0);
      assertControlledErrorHeaders(response);
    });
  }
});

test("valid admin scope reads immutable storage and renders only the selected candidate", async () => {
  await withStorageRoot(async (storageRoot) => {
    const candidate = createSyntheticAstroInternalPreviewCandidate({
      ...IDENTITY,
      html: "<!doctype html><html><head><style>h1{color:#0f766e}</style></head><body><h1>Authenticated owner preview</h1><script>globalThis.leaked=true</script></body></html>",
    });
    const writableRepository = new LocalFilesystemAstroInternalPreviewCandidateRepository({ storageRoot });
    await writableRepository.create(candidate);
    const path = recordPath(storageRoot, IDENTITY.candidateId);
    const before = await readFile(path);
    const events: string[] = [];
    let repositoryReads = 0;
    const response = await createAuthenticatedAstroCandidateReadbackRouteHandlers({
      authenticateSuperadmin: async () => {
        events.push("authenticate");
        return "user-superadmin-proof";
      },
      resolveTrustedScope: async (input) => {
        events.push("scope");
        assert.equal(input.actorUserId, "user-superadmin-proof");
        return { siteId: input.siteId, siteVersionId: input.siteVersionId };
      },
      repository: {
        read: async (expected) => {
          events.push("read");
          repositoryReads += 1;
          return writableRepository.read(expected);
        },
      },
    }).GET(requestFor(IDENTITY));
    const html = await response.text();
    const after = await readFile(path);

    assert.equal(response.status, 200);
    assert.match(html, /Authenticated owner preview/);
    assert.match(html, /type="application\/gnr8-disabled-preview-script"/);
    assert.deepEqual(events, ["authenticate", "scope", "read"]);
    assert.equal(repositoryReads, 1);
    assert.deepEqual(after, before);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
    assert.equal(response.headers.get("content-security-policy"), AUTHENTICATED_ASTRO_READBACK_HTML_CSP);
    assert.match(response.headers.get("content-security-policy") ?? "", /sandbox/);
    assert.match(response.headers.get("content-security-policy") ?? "", /script-src 'none'/);
    assert.match(response.headers.get("content-security-policy") ?? "", /style-src 'unsafe-inline'/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.has("set-cookie"), false);
  });
});

test("missing or mismatched trusted site/version scope returns a non-enumerating 404 before repository access", async (t) => {
  for (const scenario of [
    { name: "missing site or version", scope: null },
    { name: "version belongs to another site", scope: { siteId: "site-other", siteVersionId: IDENTITY.siteVersionId } },
    { name: "resolver returns another version", scope: { siteId: IDENTITY.siteId, siteVersionId: "sv-other" } },
  ]) {
    await t.test(scenario.name, async () => {
      let repositoryReads = 0;
      const response = await createAuthenticatedAstroCandidateReadbackRouteHandlers({
        authenticateSuperadmin: async () => "user-superadmin-proof",
        resolveTrustedScope: async () => scenario.scope,
        repository: {
          read: async () => {
            repositoryReads += 1;
            throw new Error("repository must not be called");
          },
        },
      }).GET(requestFor(IDENTITY));
      assert.equal(response.status, 404);
      assert.equal(repositoryReads, 0);
      assert.deepEqual(await response.json(), { ok: false, error: "Preview not found." });
      assertControlledErrorHeaders(response);
    });
  }
});

test("repository outcomes are controlled and never expose storage or another owner's metadata", async (t) => {
  const scenarios: Array<{
    name: string;
    error: Error;
    status: number;
  }> = [
    { name: "missing", error: repositoryError("missing", "secret candidate missing at /private/storage"), status: 404 },
    { name: "ownership mismatch", error: repositoryError("ownership_mismatch", "belongs to site-secret-owner"), status: 404 },
    { name: "corrupt", error: repositoryError("corrupt", "corrupt bytes at /private/storage"), status: 500 },
    { name: "unsupported", error: repositoryError("unsupported_version", "unsupported schema v999"), status: 500 },
    { name: "storage failure", error: new Error("EACCES /private/storage/candidate.json"), status: 500 },
  ];
  for (const scenario of scenarios) {
    await t.test(scenario.name, async () => {
      const response = await createAuthenticatedAstroCandidateReadbackRouteHandlers({
        authenticateSuperadmin: async () => "user-superadmin-proof",
        resolveTrustedScope: trustedScope,
        repository: { read: async () => { throw scenario.error; } },
      }).GET(requestFor(IDENTITY));
      const body = await response.text();
      assert.equal(response.status, scenario.status);
      assert.equal(body.includes("/private/storage"), false);
      assert.equal(body.includes("site-secret-owner"), false);
      assert.equal(body.includes("candidate.json"), false);
      assert.equal(body.includes("stack"), false);
      assertControlledErrorHeaders(response);
    });
  }
});

test("rendering failure is sanitized and never falls through to the default artifact", async () => {
  const candidate = createSyntheticAstroInternalPreviewCandidate(IDENTITY);
  const response = await createAuthenticatedAstroCandidateReadbackRouteHandlers({
    authenticateSuperadmin: async () => "user-superadmin-proof",
    resolveTrustedScope: trustedScope,
    repository: { read: async () => recordFor(candidate) },
    renderPreview: async () => { throw new Error("fallback artifact /secret/path was attempted"); },
  }).GET(requestFor(IDENTITY));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { ok: false, error: "Candidate readback unavailable." });
  assertControlledErrorHeaders(response);
});

test("concurrent owner-scoped requests remain isolated without process-global dependency mutation", async () => {
  await withStorageRoot(async (storageRoot) => {
    const identities = [
      { candidateId: "candidate-owner-a", siteId: "site-owner-a", siteVersionId: "sv-owner-a" },
      { candidateId: "candidate-owner-b", siteId: "site-owner-b", siteVersionId: "sv-owner-b" },
    ] as const;
    const repository = new LocalFilesystemAstroInternalPreviewCandidateRepository({ storageRoot });
    await Promise.all(identities.map((identity, index) => repository.create(createSyntheticAstroInternalPreviewCandidate({
      ...identity,
      html: `<!doctype html><html><body><h1>Owner ${index === 0 ? "A" : "B"} isolated preview</h1></body></html>`,
    }))));
    const readIdentities: AstroCandidateRepositoryIdentity[] = [];
    const handlers = createAuthenticatedAstroCandidateReadbackRouteHandlers({
      authenticateSuperadmin: async () => "user-superadmin-proof",
      resolveTrustedScope: async ({ siteId, siteVersionId }) => {
        await delay(siteId.endsWith("a") ? 8 : 1);
        return { siteId, siteVersionId };
      },
      repository: {
        read: async (expected) => {
          readIdentities.push(expected);
          await delay(expected.siteId.endsWith("a") ? 1 : 8);
          return repository.read(expected);
        },
      },
    });
    const [responseA, responseB] = await Promise.all(
      identities.map((identity) => handlers.GET(requestFor(identity))),
    );
    const [htmlA, htmlB] = await Promise.all([responseA.text(), responseB.text()]);
    assert.equal(responseA.status, 200);
    assert.equal(responseB.status, 200);
    assert.match(htmlA, /Owner A isolated preview/);
    assert.doesNotMatch(htmlA, /Owner B isolated preview/);
    assert.match(htmlB, /Owner B isolated preview/);
    assert.doesNotMatch(htmlB, /Owner A isolated preview/);
    assert.deepEqual(new Set(readIdentities.map((identity) => identity.siteId)), new Set(["site-owner-a", "site-owner-b"]));
  });
});

test("unconfigured readback fails closed after authentication", async () => {
  let authenticationCalls = 0;
  const response = await createAuthenticatedAstroCandidateReadbackRouteHandlers({
    authenticateSuperadmin: async () => {
      authenticationCalls += 1;
      return "user-superadmin-proof";
    },
  }).GET(requestFor(IDENTITY));
  assert.equal(authenticationCalls, 1);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, error: "Candidate readback is not configured." });
  assertControlledErrorHeaders(response);
});

function requestFor(identity: AstroCandidateRepositoryIdentity, path = "/"): Request {
  const url = new URL("http://gnr8.invalid/internal-proof/astro-candidate");
  url.searchParams.set("candidateId", identity.candidateId);
  url.searchParams.set("siteId", identity.siteId);
  url.searchParams.set("siteVersionId", identity.siteVersionId);
  url.searchParams.set("path", path);
  return new Request(url);
}

async function trustedScope(input: { siteId: string; siteVersionId: string }) {
  return { siteId: input.siteId, siteVersionId: input.siteVersionId };
}

function repositoryError(code: AstroCandidateRepositoryError["code"], message: string) {
  return new AstroCandidateRepositoryError(code, message);
}

function recordFor(candidate: ReturnType<typeof createSyntheticAstroInternalPreviewCandidate>) {
  return {
    schemaVersion: "gnr8-astro-persisted-preview-candidate:v1" as const,
    recordKind: "astro_internal_preview_candidate_proof_record" as const,
    identity: { candidateId: candidate.id, siteId: candidate.siteId, siteVersionId: candidate.siteVersionId },
    storedAt: "2026-09-27T12:00:00.000Z",
    candidate,
    storageSha256: "f".repeat(64),
  };
}

function assertControlledErrorHeaders(response: Response): void {
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.match(response.headers.get("content-security-policy") ?? "", /default-src 'none'/);
  assert.equal(response.headers.has("set-cookie"), false);
}

function recordPath(storageRoot: string, candidateId: string): string {
  const key = astroCandidateStorageKey(candidateId);
  return join(storageRoot, "astro-candidates-v1", key.slice(0, 2), `${key}.json`);
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function withStorageRoot(run: (storageRoot: string) => Promise<void>): Promise<void> {
  const storageRoot = await realpath(await mkdtemp(join(tmpdir(), "gnr8-authenticated-astro-readback-test-")));
  try {
    await run(storageRoot);
  } finally {
    await rm(storageRoot, { recursive: true, force: true });
  }
}
