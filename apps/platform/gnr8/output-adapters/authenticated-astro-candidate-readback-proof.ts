import { createHash } from "node:crypto";
import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createAuthenticatedAstroCandidateReadbackRouteHandlers } from "./authenticated-astro-candidate-readback-route-handlers";
import {
  LocalFilesystemAstroInternalPreviewCandidateRepository,
  astroCandidateStorageKey,
  type AstroCandidateRepositoryIdentity,
} from "./astro-internal-preview-candidate-repository";
import { createSyntheticAstroInternalPreviewCandidate } from "./astro-internal-preview-candidate-test-fixture";

export const AUTHENTICATED_ASTRO_CANDIDATE_READBACK_PROOF_VERSION =
  "gnr8-authenticated-astro-candidate-readback-proof:v1" as const;

const IDENTITY: AstroCandidateRepositoryIdentity = {
  candidateId: "candidate-astro-mvp09-authenticated-proof",
  siteId: "site-astro-mvp09-authenticated-proof",
  siteVersionId: "sv-astro-mvp09-authenticated-proof",
};

export type AuthenticatedAstroCandidateReadbackProofEvidence = {
  proofVersion: typeof AUTHENTICATED_ASTRO_CANDIDATE_READBACK_PROOF_VERSION;
  proofOnly: true;
  authenticationBoundary: {
    stubbed: true;
    realLoggedInSessionClaimed: false;
    policyRepresented: "existing_superadmin_guard_contract";
    trustedScopeLookupStubbed: true;
  };
  persistence: {
    implementation: "LocalFilesystemAstroInternalPreviewCandidateRepository";
    realPersistedRecord: true;
    storageSha256: string;
    bytesBeforeSha256: string;
    bytesAfterSha256: string;
    storedBytesUnchanged: true;
    repositoryReads: 1;
    serviceRepositoryWrites: 0;
  };
  denial: {
    status: 401;
    repositoryReadsBeforeSuccess: 0;
    cacheControl: "no-store";
  };
  success: {
    status: 200;
    actualUnifiedRenderer: true;
    source: "astro_internal_preview_candidate";
    expectedContentVerified: string;
    cacheControl: "no-store";
    contentSecurityPolicy: string;
    nosniff: "nosniff";
  };
  cleanup: {
    ownedProofRootRemoved: true;
  };
  productionClaims: {
    productionAuthentication: false;
    productionStorage: false;
    routeMounted: false;
    deployed: false;
    promoted: false;
  };
};

export async function runAuthenticatedAstroCandidateReadbackProof(): Promise<AuthenticatedAstroCandidateReadbackProofEvidence> {
  const proofRoot = await realpath(await mkdtemp(join(tmpdir(), "gnr8-authenticated-astro-readback-proof-")));
  const repository = new LocalFilesystemAstroInternalPreviewCandidateRepository({
    storageRoot: proofRoot,
    now: () => new Date("2026-09-27T12:00:00.000Z"),
  });
  const repositoryReads = { value: 0 };
  let completed: Omit<AuthenticatedAstroCandidateReadbackProofEvidence, "cleanup"> | null = null;
  try {
    const created = await repository.create(createSyntheticAstroInternalPreviewCandidate({
      ...IDENTITY,
      html: "<!doctype html><html><head><style>:root{--mvp09:#0f766e}</style></head><body><h1>Authenticated Astro MVP 09 readback</h1><p>Persisted bytes, trusted scope, explicit renderer.</p></body></html>",
    }));
    const storedPath = recordPath(proofRoot, IDENTITY.candidateId);
    const beforeBytes = await readFile(storedPath);

    const readOnlyRepository = {
      read: async (expected: AstroCandidateRepositoryIdentity) => {
        repositoryReads.value += 1;
        return repository.read(expected);
      },
    };
    const deniedResponse = await createAuthenticatedAstroCandidateReadbackRouteHandlers({
      authenticateSuperadmin: async () => { throw new Error("Unauthorized"); },
      resolveTrustedScope: async ({ siteId, siteVersionId }) => ({ siteId, siteVersionId }),
      repository: readOnlyRepository,
    }).GET(proofRequest());
    if (deniedResponse.status !== 401 || repositoryReads.value !== 0) {
      throw new Error("authenticated_astro_readback_denial_ordering_failed");
    }

    const successResponse = await createAuthenticatedAstroCandidateReadbackRouteHandlers({
      // Controlled boundary stubs: these do not claim a real logged-in session or database lookup.
      authenticateSuperadmin: async () => "synthetic-superadmin-user",
      resolveTrustedScope: async ({ siteId, siteVersionId }) => ({ siteId, siteVersionId }),
      repository: readOnlyRepository,
    }).GET(proofRequest());
    const html = await successResponse.text();
    const afterBytes = await readFile(storedPath);
    const bytesBeforeSha256 = sha256(beforeBytes);
    const bytesAfterSha256 = sha256(afterBytes);
    const contentSecurityPolicy = successResponse.headers.get("content-security-policy") ?? "";
    if (
      successResponse.status !== 200 ||
      Number(repositoryReads.value) !== 1 ||
      !html.includes("Authenticated Astro MVP 09 readback") ||
      !html.includes("--mvp09:#0f766e") ||
      bytesBeforeSha256 !== bytesAfterSha256 ||
      successResponse.headers.get("cache-control") !== "no-store" ||
      successResponse.headers.get("x-content-type-options") !== "nosniff" ||
      !contentSecurityPolicy.includes("sandbox") ||
      !contentSecurityPolicy.includes("script-src 'none'") ||
      !contentSecurityPolicy.includes("style-src 'unsafe-inline'")
    ) {
      throw new Error("authenticated_astro_readback_success_verification_failed");
    }

    completed = {
      proofVersion: AUTHENTICATED_ASTRO_CANDIDATE_READBACK_PROOF_VERSION,
      proofOnly: true,
      authenticationBoundary: {
        stubbed: true,
        realLoggedInSessionClaimed: false,
        policyRepresented: "existing_superadmin_guard_contract",
        trustedScopeLookupStubbed: true,
      },
      persistence: {
        implementation: "LocalFilesystemAstroInternalPreviewCandidateRepository",
        realPersistedRecord: true,
        storageSha256: created.record.storageSha256,
        bytesBeforeSha256,
        bytesAfterSha256,
        storedBytesUnchanged: true,
        repositoryReads: 1,
        serviceRepositoryWrites: 0,
      },
      denial: {
        status: 401,
        repositoryReadsBeforeSuccess: 0,
        cacheControl: "no-store",
      },
      success: {
        status: 200,
        actualUnifiedRenderer: true,
        source: "astro_internal_preview_candidate",
        expectedContentVerified: "Authenticated Astro MVP 09 readback",
        cacheControl: "no-store",
        contentSecurityPolicy,
        nosniff: "nosniff",
      },
      productionClaims: {
        productionAuthentication: false,
        productionStorage: false,
        routeMounted: false,
        deployed: false,
        promoted: false,
      },
    };
  } finally {
    await rm(proofRoot, { recursive: true, force: true });
  }
  if (!completed) throw new Error("authenticated_astro_readback_proof_incomplete");
  return {
    ...completed,
    cleanup: { ownedProofRootRemoved: true },
  };
}

function proofRequest(): Request {
  const url = new URL("http://gnr8.invalid/internal-proof/astro-candidate");
  url.searchParams.set("candidateId", IDENTITY.candidateId);
  url.searchParams.set("siteId", IDENTITY.siteId);
  url.searchParams.set("siteVersionId", IDENTITY.siteVersionId);
  return new Request(url);
}

function recordPath(storageRoot: string, candidateId: string): string {
  const key = astroCandidateStorageKey(candidateId);
  return join(storageRoot, "astro-candidates-v1", key.slice(0, 2), `${key}.json`);
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
