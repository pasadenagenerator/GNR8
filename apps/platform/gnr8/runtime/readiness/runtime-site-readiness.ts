import type { RuntimeSiteResolutionBinding } from "@/gnr8/runtime/runtime-store";
import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";

export type RuntimeSiteReadinessStatus = "ready" | "ready_with_warnings" | "blocked";

export type RuntimeSiteReadinessReport = {
  siteId: string;
  canonicalSlug: string;
  activeSiteVersionId: string | null;
  latestImportedSiteVersionId: string | null;
  publishedSiteVersionId: string | null;
  previewSiteVersionId: string | null;
  candidateCount: number;
  hasPreviewReadyVersion: boolean;
  hasPublishedVersion: boolean;
  hasActivePointer: boolean;
  readinessStatus: RuntimeSiteReadinessStatus;
  warnings: string[];
  blockers: string[];
  correlationKey: string;
};

function normalizeToken(value: string | null | undefined, fallback = ""): string {
  const token = String(value ?? "").trim();
  return token.length > 0 ? token : fallback;
}

export function createRuntimeSiteReadinessReport(binding: RuntimeSiteResolutionBinding): RuntimeSiteReadinessReport {
  const siteId = normalizeToken(binding.siteId, "unknown_site");
  const canonicalSlug = normalizeToken(binding.canonicalSlug, "unknown_slug");
  const activeSiteVersionId = normalizeToken(binding.activeSiteVersionId) || null;
  const latestImportedSiteVersionId = normalizeToken(binding.latestImportedSiteVersionId) || null;
  const publishedSiteVersionId = normalizeToken(binding.publishedSiteVersionId) || null;
  const previewSiteVersionId = normalizeToken(binding.previewSiteVersionId) || null;
  const candidateCount = binding.candidateSiteVersions.length;
  const hasPreviewReadyVersion = previewSiteVersionId !== null;
  const hasPublishedVersion = publishedSiteVersionId !== null;
  const hasActivePointer = activeSiteVersionId !== null;

  const blockers: string[] = [];
  if (candidateCount === 0) blockers.push("no_site_version_candidates");
  if (latestImportedSiteVersionId === null) blockers.push("missing_latest_imported_site_version");

  const warnings: string[] = [];
  if (hasActivePointer === false) warnings.push("missing_active_site_version_pointer");
  if (hasPublishedVersion === false) warnings.push("missing_published_site_version");

  const readinessStatus: RuntimeSiteReadinessStatus =
    blockers.length > 0 ? "blocked" : warnings.length > 0 ? "ready_with_warnings" : "ready";

  const correlationKey = createRuntimeCorrelationKey({
    siteId,
    canonicalSlug,
    activeSiteVersionId: activeSiteVersionId ?? "none",
    latestImportedSiteVersionId: latestImportedSiteVersionId ?? "none",
    publishedSiteVersionId: publishedSiteVersionId ?? "none",
    previewSiteVersionId: previewSiteVersionId ?? "none",
    candidateCount: String(candidateCount),
    hasPreviewReadyVersion: hasPreviewReadyVersion ? "true" : "false",
    hasPublishedVersion: hasPublishedVersion ? "true" : "false",
    hasActivePointer: hasActivePointer ? "true" : "false",
    readinessStatus,
    warnings: warnings.join(","),
    blockers: blockers.join(","),
  });

  return {
    siteId,
    canonicalSlug,
    activeSiteVersionId,
    latestImportedSiteVersionId,
    publishedSiteVersionId,
    previewSiteVersionId,
    candidateCount,
    hasPreviewReadyVersion,
    hasPublishedVersion,
    hasActivePointer,
    readinessStatus,
    warnings,
    blockers,
    correlationKey,
  };
}
