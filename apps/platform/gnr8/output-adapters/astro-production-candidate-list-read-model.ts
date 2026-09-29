import "server-only";

import { ASTRO_STATIC_EXPORT_MANIFEST_VERSION } from "./astro-static-site-build-export-proof";
import { ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION } from "./astro-static-site-internal-preview-bridge";
import {
  AstroCandidateOwnershipResolutionError,
} from "./astro-production-candidate-ownership-resolver";
import {
  AstroProductionCandidateRepositoryError,
  type AstroProductionCandidateListCursor,
  type AstroProductionCandidateMetadata,
} from "./astro-production-candidate-repository";
import {
  ASTRO_PRODUCTION_CANDIDATE_ADAPTER_ID,
  ASTRO_PRODUCTION_CANDIDATE_RECORD_KIND,
  ASTRO_PRODUCTION_CANDIDATE_SCHEMA_VERSION,
  isAstroProductionCandidateId,
  isCanonicalUuid,
  type AstroProductionCandidateOwnership,
} from "./astro-production-candidate-record";
import {
  AstroProductionCandidatePreviewConfigurationError,
  isAstroProductionCandidatePreviewFeatureEnabled,
} from "./astro-production-candidate-preview-feature-gate";
import type {
  AstroProductionCandidateListDependencies,
} from "./astro-production-candidate-list-composition";
import { RENDERER_COMPATIBILITY_VERSION } from "../runtime/types";

export const ASTRO_PRODUCTION_CANDIDATE_LIST_PAGE_SIZE = 25;

export type AstroProductionCandidateListItemReadModel = {
  siteVersionId: string;
  candidateId: string;
  candidateCreatedAt: string;
  storedAt: string;
  producerKind: string;
  producerVersion: string;
  producerRef: string;
  schemaVersion: string;
  recordKind: string;
  adapterId: string;
  conversionVersion: string;
  exportManifestVersion: string;
  rendererCompatibilityVersion: string;
  contentSha256: string;
  storageSha256: string;
  contentSha256Prefix: string;
  storageSha256Prefix: string;
  payloadSizeBytes: number;
  accessState: "enabled" | "disabled";
  accessReasonCode: string;
  compatibilityState: "supported" | "unsupported";
  previewHref: string | null;
};

type SiteVersionState = {
  siteVersionId: string;
};

export type AstroProductionCandidateListReadModel =
  | { state: "feature_disabled" }
  | (SiteVersionState & { state: "invalid_request"; message: string })
  | (SiteVersionState & { state: "access_denied"; message: string })
  | (SiteVersionState & { state: "unavailable"; message: string })
  | (SiteVersionState & { state: "empty"; items: []; nextCursor: null })
  | (SiteVersionState & {
      state: "ready";
      items: AstroProductionCandidateListItemReadModel[];
      nextCursor: string | null;
    });

export type AstroProductionCandidateListPageInput = {
  params: Promise<{ siteVersionId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export type AstroProductionCandidateListPageDependencies = {
  requireSuperadminUserIdForPage: () => Promise<string>;
  isFeatureEnabled: () => boolean;
  loadListDependencies: () => Promise<AstroProductionCandidateListDependencies>;
};

type EncodedCursor = {
  version: 1;
  scope: AstroProductionCandidateOwnership;
  storedAt: string;
  candidateId: string;
};

async function defaultRequireSuperadminUserIdForPage(): Promise<string> {
  const mod = await import("@/src/auth/require-superadmin-user-id");
  return mod.requireSuperadminUserIdForPage();
}

async function defaultLoadListDependencies(): Promise<AstroProductionCandidateListDependencies> {
  const mod = await import("./astro-production-candidate-list-composition");
  return mod.createAstroProductionCandidateListDependencies();
}

export function createAstroProductionCandidateListPageLoader(
  dependencies: Partial<AstroProductionCandidateListPageDependencies> = {},
) {
  const resolved: AstroProductionCandidateListPageDependencies = {
    requireSuperadminUserIdForPage:
      dependencies.requireSuperadminUserIdForPage ?? defaultRequireSuperadminUserIdForPage,
    isFeatureEnabled:
      dependencies.isFeatureEnabled ?? isAstroProductionCandidatePreviewFeatureEnabled,
    loadListDependencies:
      dependencies.loadListDependencies ?? defaultLoadListDependencies,
  };

  return async function loadPage(
    input: AstroProductionCandidateListPageInput,
  ): Promise<AstroProductionCandidateListReadModel> {
    const actorUserId = await resolved.requireSuperadminUserIdForPage();
    if (!isBoundedText(actorUserId)) {
      return { state: "unavailable", siteVersionId: "unavailable", message: "Candidate list unavailable." };
    }

    let featureEnabled: boolean;
    try {
      featureEnabled = resolved.isFeatureEnabled();
    } catch {
      return { state: "unavailable", siteVersionId: "unavailable", message: "Candidate list unavailable." };
    }
    if (!featureEnabled) return { state: "feature_disabled" };

    const selectors = await resolveSelectors(input);
    if (!selectors) {
      return {
        state: "invalid_request",
        siteVersionId: "unavailable",
        message: "The candidate list link is invalid.",
      };
    }

    let listDependencies: AstroProductionCandidateListDependencies;
    try {
      listDependencies = await resolved.loadListDependencies();
    } catch (error) {
      return {
        state: "unavailable",
        siteVersionId: selectors.siteVersionId,
        message: error instanceof AstroProductionCandidatePreviewConfigurationError
          ? "Candidate metadata storage is not configured."
          : "Candidate list unavailable.",
      };
    }

    let trustedScope: AstroProductionCandidateOwnership;
    try {
      trustedScope = await listDependencies.resolveOwnership({ siteVersionId: selectors.siteVersionId });
    } catch (error) {
      return ownershipFailure(selectors.siteVersionId, error);
    }
    if (trustedScope.siteVersionId !== selectors.siteVersionId) {
      return accessDenied(selectors.siteVersionId);
    }

    const cursor = decodeCursor(selectors.encodedCursor, trustedScope);
    if (cursor === undefined) {
      return {
        state: "invalid_request",
        siteVersionId: selectors.siteVersionId,
        message: "This pagination link is invalid or belongs to a different candidate scope.",
      };
    }

    try {
      const page = await listDependencies.listCandidateMetadata({
        trustedScope,
        cursor,
        limit: ASTRO_PRODUCTION_CANDIDATE_LIST_PAGE_SIZE,
      });
      const items = page.items.map((item) => toItemReadModel(item, selectors.siteVersionId));
      if (items.length === 0) {
        return { state: "empty", siteVersionId: selectors.siteVersionId, items: [], nextCursor: null };
      }
      return {
        state: "ready",
        siteVersionId: selectors.siteVersionId,
        items,
        nextCursor: page.nextCursor ? encodeCursor(page.nextCursor, trustedScope) : null,
      };
    } catch (error) {
      if (
        error instanceof AstroProductionCandidateRepositoryError &&
        error.code === "ownership_mismatch"
      ) {
        return accessDenied(selectors.siteVersionId);
      }
      return {
        state: "unavailable",
        siteVersionId: selectors.siteVersionId,
        message: "Candidate metadata is temporarily unavailable.",
      };
    }
  };
}

async function resolveSelectors(input: AstroProductionCandidateListPageInput): Promise<{
  siteVersionId: string;
  encodedCursor: string | null;
} | null> {
  try {
    const searchParamsPromise = input.searchParams ?? Promise.resolve<Record<string, string | string[] | undefined>>({});
    const [params, searchParams] = await Promise.all([
      input.params,
      searchParamsPromise,
    ]);
    if (!isCanonicalUuid(params.siteVersionId)) return null;
    const keys = Object.keys(searchParams);
    if (keys.some((key) => key !== "cursor")) return null;
    const cursor = searchParams.cursor;
    if (Array.isArray(cursor) || (cursor !== undefined && !isBoundedCursorText(cursor))) return null;
    return { siteVersionId: params.siteVersionId, encodedCursor: cursor ?? null };
  } catch {
    return null;
  }
}

function toItemReadModel(
  item: AstroProductionCandidateMetadata,
  siteVersionId: string,
): AstroProductionCandidateListItemReadModel {
  const supported = isSupportedMetadata(item);
  const previewEligible = supported && item.access.state === "enabled";
  return {
    siteVersionId,
    candidateId: item.candidateId,
    candidateCreatedAt: item.candidateCreatedAt,
    storedAt: item.storedAt,
    producerKind: item.producerKind,
    producerVersion: item.producerVersion,
    producerRef: item.producerRef,
    schemaVersion: item.schemaVersion,
    recordKind: item.recordKind,
    adapterId: item.adapterId,
    conversionVersion: item.conversionVersion,
    exportManifestVersion: item.exportManifestVersion,
    rendererCompatibilityVersion: item.rendererCompatibilityVersion,
    contentSha256: item.contentSha256,
    storageSha256: item.storageSha256,
    contentSha256Prefix: hashPrefix(item.contentSha256),
    storageSha256Prefix: hashPrefix(item.storageSha256),
    payloadSizeBytes: item.payloadSizeBytes,
    accessState: item.access.state,
    accessReasonCode: item.access.reasonCode,
    compatibilityState: supported ? "supported" : "unsupported",
    previewHref: previewEligible
      ? `/api/gnr8/admin/astro-candidates/${encodeURIComponent(siteVersionId)}/${encodeURIComponent(item.candidateId)}/preview?path=%2F`
      : null,
  };
}

function isSupportedMetadata(item: AstroProductionCandidateMetadata): boolean {
  return item.schemaVersion === ASTRO_PRODUCTION_CANDIDATE_SCHEMA_VERSION &&
    item.recordKind === ASTRO_PRODUCTION_CANDIDATE_RECORD_KIND &&
    item.adapterId === ASTRO_PRODUCTION_CANDIDATE_ADAPTER_ID &&
    item.conversionVersion === ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION &&
    item.exportManifestVersion === ASTRO_STATIC_EXPORT_MANIFEST_VERSION &&
    item.rendererCompatibilityVersion === RENDERER_COMPATIBILITY_VERSION;
}

function ownershipFailure(
  siteVersionId: string,
  error: unknown,
): AstroProductionCandidateListReadModel {
  if (
    error instanceof AstroCandidateOwnershipResolutionError &&
    ["identity_invalid", "not_found", "ownership_incomplete", "ownership_mismatch"].includes(error.code)
  ) {
    return accessDenied(siteVersionId);
  }
  return {
    state: "unavailable",
    siteVersionId,
    message: "Authoritative candidate scope is temporarily unavailable.",
  };
}

function accessDenied(siteVersionId: string): AstroProductionCandidateListReadModel {
  return {
    state: "access_denied",
    siteVersionId,
    message: "Candidate metadata is not available for this site version.",
  };
}

function encodeCursor(
  cursor: AstroProductionCandidateListCursor,
  scope: AstroProductionCandidateOwnership,
): string {
  const value: EncodedCursor = { version: 1, scope, ...cursor };
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeCursor(
  encoded: string | null,
  trustedScope: AstroProductionCandidateOwnership,
): AstroProductionCandidateListCursor | null | undefined {
  if (encoded === null) return null;
  try {
    const value = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as unknown;
    if (!hasExactKeys(value, ["version", "scope", "storedAt", "candidateId"]) || value.version !== 1) {
      return undefined;
    }
    if (!hasExactKeys(value.scope, [
      "runtimeSiteId",
      "siteVersionId",
      "ownershipSiteId",
      "organizationId",
      "agencyId",
    ])) {
      return undefined;
    }
    if (!sameScope(value.scope as AstroProductionCandidateOwnership, trustedScope)) return undefined;
    if (!isIsoTimestamp(value.storedAt) || !isAstroProductionCandidateId(value.candidateId)) return undefined;
    return { storedAt: value.storedAt, candidateId: value.candidateId };
  } catch {
    return undefined;
  }
}

function sameScope(
  left: AstroProductionCandidateOwnership,
  right: AstroProductionCandidateOwnership,
): boolean {
  return left.runtimeSiteId === right.runtimeSiteId &&
    left.siteVersionId === right.siteVersionId &&
    left.ownershipSiteId === right.ownershipSiteId &&
    left.organizationId === right.organizationId &&
    left.agencyId === right.agencyId;
}

function hashPrefix(value: string): string {
  return `${value.slice(0, 12)}…`;
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value;
}

function isBoundedText(value: unknown): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= 512 &&
    value === value.trim() &&
    !value.includes("\0");
}

function isBoundedCursorText(value: unknown): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= 4096 &&
    value === value.trim() &&
    /^[A-Za-z0-9_-]+$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasExactKeys(value: unknown, expected: readonly string[]): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}
