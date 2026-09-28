import {
  AstroCandidateRepositoryError,
  type AstroCandidateRepositoryIdentity,
  type PersistedAstroCandidateRecord,
} from "./astro-internal-preview-candidate-repository";
import type { AstroInternalPreviewCandidate } from "./astro-static-site-internal-preview-bridge";

export type AuthenticatedAstroCandidateReadbackSelectors = AstroCandidateRepositoryIdentity & {
  path: string;
};

export type TrustedAstroCandidateScope = {
  siteId: string;
  siteVersionId: string;
};

export type AuthenticatedAstroCandidateReadbackPreview = {
  html: string;
  source: "astro_internal_preview_candidate";
  candidateId: string;
  siteId: string;
  siteVersionId: string;
  path: string;
  fallbackUsed: false;
};

export type AuthenticatedAstroCandidateReadbackServiceDependencies = {
  authenticateSuperadmin: () => Promise<string>;
  resolveTrustedScope: (input: {
    actorUserId: string;
    siteId: string;
    siteVersionId: string;
  }) => Promise<TrustedAstroCandidateScope | null>;
  repository: {
    read(expected: AstroCandidateRepositoryIdentity): Promise<PersistedAstroCandidateRecord>;
  };
  renderPreview: (input: {
    candidate: AstroInternalPreviewCandidate;
    selectors: AuthenticatedAstroCandidateReadbackSelectors;
  }) => Promise<AuthenticatedAstroCandidateReadbackPreview>;
};

export type AuthenticatedAstroCandidateReadbackResult = {
  actorUserId: string;
  record: PersistedAstroCandidateRecord;
  preview: AuthenticatedAstroCandidateReadbackPreview;
};

export type AuthenticatedAstroCandidateReadbackErrorCode =
  | "not_found"
  | "unavailable"
  | "unconfigured";

export class AuthenticatedAstroCandidateReadbackError extends Error {
  readonly code: AuthenticatedAstroCandidateReadbackErrorCode;

  constructor(code: AuthenticatedAstroCandidateReadbackErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AuthenticatedAstroCandidateReadbackError";
    this.code = code;
  }
}

const unavailableDependency = async (): Promise<never> => {
  throw new AuthenticatedAstroCandidateReadbackError(
    "unconfigured",
    "Authenticated Astro candidate readback is not configured.",
  );
};

export function createAuthenticatedAstroCandidateReadbackService(
  dependencies: Partial<AuthenticatedAstroCandidateReadbackServiceDependencies> = {},
) {
  const resolvedDependencies: AuthenticatedAstroCandidateReadbackServiceDependencies = {
    authenticateSuperadmin: dependencies.authenticateSuperadmin ?? unavailableDependency,
    resolveTrustedScope: dependencies.resolveTrustedScope ?? unavailableDependency,
    repository: dependencies.repository ?? { read: unavailableDependency },
    renderPreview: dependencies.renderPreview ?? unavailableDependency,
  };

  return async function readAuthenticatedAstroCandidate(
    input: AuthenticatedAstroCandidateReadbackSelectors,
  ): Promise<AuthenticatedAstroCandidateReadbackResult> {
    // Authentication is deliberately first. Selectors do not authorize storage access.
    const actorUserId = normalizeIdentity(await resolvedDependencies.authenticateSuperadmin());
    if (!actorUserId) {
      throw new AuthenticatedAstroCandidateReadbackError("unavailable", "Authenticated actor identity is invalid.");
    }
    const selectors = normalizeSelectors(input);
    if (!selectors) {
      throw new AuthenticatedAstroCandidateReadbackError("not_found", "Requested preview is unavailable.");
    }

    let trustedScope: TrustedAstroCandidateScope | null;
    try {
      trustedScope = await resolvedDependencies.resolveTrustedScope({
        actorUserId,
        siteId: selectors.siteId,
        siteVersionId: selectors.siteVersionId,
      });
    } catch (error) {
      if (error instanceof AuthenticatedAstroCandidateReadbackError) throw error;
      throw new AuthenticatedAstroCandidateReadbackError(
        "unavailable",
        "Trusted preview scope lookup failed.",
        { cause: error },
      );
    }
    if (
      !trustedScope ||
      trustedScope.siteId !== selectors.siteId ||
      trustedScope.siteVersionId !== selectors.siteVersionId
    ) {
      throw new AuthenticatedAstroCandidateReadbackError("not_found", "Requested preview is unavailable.");
    }

    let record: PersistedAstroCandidateRecord;
    try {
      record = await resolvedDependencies.repository.read({
        candidateId: selectors.candidateId,
        siteId: trustedScope.siteId,
        siteVersionId: trustedScope.siteVersionId,
      });
    } catch (error) {
      throw mapRepositoryReadError(error);
    }

    let preview: AuthenticatedAstroCandidateReadbackPreview;
    try {
      preview = await resolvedDependencies.renderPreview({ candidate: record.candidate, selectors });
    } catch (error) {
      if (error instanceof AuthenticatedAstroCandidateReadbackError) throw error;
      throw new AuthenticatedAstroCandidateReadbackError(
        "unavailable",
        "Validated candidate rendering failed.",
        { cause: error },
      );
    }
    if (
      preview.source !== "astro_internal_preview_candidate" ||
      preview.fallbackUsed !== false ||
      preview.candidateId !== selectors.candidateId ||
      preview.siteId !== trustedScope.siteId ||
      preview.siteVersionId !== trustedScope.siteVersionId
    ) {
      throw new AuthenticatedAstroCandidateReadbackError(
        "unavailable",
        "Validated candidate rendering returned an unexpected selection.",
      );
    }

    return { actorUserId, record, preview };
  };
}

function normalizeSelectors(
  input: AuthenticatedAstroCandidateReadbackSelectors,
): AuthenticatedAstroCandidateReadbackSelectors | null {
  const candidateId = normalizeIdentity(input.candidateId);
  const siteId = normalizeIdentity(input.siteId);
  const siteVersionId = normalizeIdentity(input.siteVersionId);
  if (!candidateId || !siteId || !siteVersionId) return null;
  const rawPath = String(input.path ?? "/").trim();
  if (!rawPath.startsWith("/") || rawPath.includes("\0")) return null;
  return { candidateId, siteId, siteVersionId, path: rawPath };
}

function normalizeIdentity(value: unknown): string | null {
  const normalized = String(value ?? "").trim();
  return normalized && normalized.length <= 512 && !normalized.includes("\0") ? normalized : null;
}

function mapRepositoryReadError(error: unknown): AuthenticatedAstroCandidateReadbackError {
  if (error instanceof AstroCandidateRepositoryError) {
    if (error.code === "missing" || error.code === "ownership_mismatch" || error.code === "identity_invalid") {
      return new AuthenticatedAstroCandidateReadbackError("not_found", "Requested preview is unavailable.");
    }
    return new AuthenticatedAstroCandidateReadbackError(
      "unavailable",
      "Persisted candidate failed storage or integrity validation.",
      { cause: error },
    );
  }
  if (error instanceof AuthenticatedAstroCandidateReadbackError) return error;
  return new AuthenticatedAstroCandidateReadbackError(
    "unavailable",
    "Persisted candidate storage is unavailable.",
    { cause: error },
  );
}
