import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";

export type RuntimeResolutionStrategy = "latest_imported" | "active" | "published" | "preview";

export type RuntimeSiteBinding = {
  siteId: string;
  canonicalSlug: string;
  activeSiteVersionId: string | null;
  latestImportedSiteVersionId: string | null;
  publishedSiteVersionId?: string | null;
  previewSiteVersionId?: string | null;
};

export type RuntimeResolutionRequest = {
  strategy: RuntimeResolutionStrategy;
  binding: RuntimeSiteBinding;
  candidateSiteVersionIds?: readonly string[];
};

export type RuntimeResolutionDiagnostics = {
  code: "PREVIEW_RUNTIME_RESOLUTION_APPLIED";
  strategy: RuntimeResolutionStrategy;
  resolvedSiteVersionId: string;
  fallbackUsed: boolean;
  resolutionKey: string;
};

export type RuntimeResolutionResult = {
  strategy: RuntimeResolutionStrategy;
  siteVersionId: string;
  fallbackUsed: boolean;
  resolutionKey: string;
  diagnostics: RuntimeResolutionDiagnostics;
};

function normalizeToken(value: string | null | undefined): string | null {
  const token = String(value ?? "").trim();
  return token.length > 0 ? token : null;
}

function normalizeCandidates(input: readonly string[] | undefined): string[] {
  const deduped = new Set<string>();
  for (const candidate of input ?? []) {
    const token = normalizeToken(candidate);
    if (token) deduped.add(token);
  }
  return [...deduped].sort((a, b) => a.localeCompare(b));
}

function resolveNewestDeterministicCandidate(candidates: readonly string[]): string | null {
  return candidates.length > 0 ? candidates[candidates.length - 1] ?? null : null;
}

export function createRuntimeResolutionKey(input: {
  strategy: RuntimeResolutionStrategy;
  binding: RuntimeSiteBinding;
  resolvedSiteVersionId: string;
  fallbackUsed: boolean;
  candidateSiteVersionIds: readonly string[];
}): string {
  return createRuntimeCorrelationKey({
    strategy: input.strategy,
    siteId: normalizeToken(input.binding.siteId) ?? "unknown_site",
    canonicalSlug: normalizeToken(input.binding.canonicalSlug) ?? "unknown_slug",
    activeSiteVersionId: normalizeToken(input.binding.activeSiteVersionId) ?? "none",
    latestImportedSiteVersionId: normalizeToken(input.binding.latestImportedSiteVersionId) ?? "none",
    publishedSiteVersionId: normalizeToken(input.binding.publishedSiteVersionId) ?? "none",
    previewSiteVersionId: normalizeToken(input.binding.previewSiteVersionId) ?? "none",
    resolvedSiteVersionId: input.resolvedSiteVersionId,
    fallbackUsed: input.fallbackUsed ? "true" : "false",
    candidateSiteVersionIds: normalizeCandidates(input.candidateSiteVersionIds).join(","),
  });
}

export function resolveLatestImportedRuntimeVersion(input: {
  binding: RuntimeSiteBinding;
  candidateSiteVersionIds?: readonly string[];
}): { siteVersionId: string; fallbackUsed: boolean } {
  const explicit = normalizeToken(input.binding.latestImportedSiteVersionId);
  if (explicit) {
    return { siteVersionId: explicit, fallbackUsed: false };
  }
  const fallback = resolveNewestDeterministicCandidate(normalizeCandidates(input.candidateSiteVersionIds));
  if (!fallback) {
    throw new Error("Runtime resolution failed: latest_imported could not resolve a siteVersionId.");
  }
  return { siteVersionId: fallback, fallbackUsed: true };
}

export function resolveActiveRuntimeVersion(input: {
  binding: RuntimeSiteBinding;
  candidateSiteVersionIds?: readonly string[];
}): { siteVersionId: string; fallbackUsed: boolean } {
  const active = normalizeToken(input.binding.activeSiteVersionId);
  if (active) {
    return { siteVersionId: active, fallbackUsed: false };
  }
  const latest = resolveLatestImportedRuntimeVersion(input);
  return { siteVersionId: latest.siteVersionId, fallbackUsed: true };
}

export function resolvePublishedRuntimeVersion(input: {
  binding: RuntimeSiteBinding;
  candidateSiteVersionIds?: readonly string[];
}): { siteVersionId: string; fallbackUsed: boolean } {
  const published = normalizeToken(input.binding.publishedSiteVersionId);
  if (published) {
    return { siteVersionId: published, fallbackUsed: false };
  }
  const active = normalizeToken(input.binding.activeSiteVersionId);
  if (active) {
    return { siteVersionId: active, fallbackUsed: true };
  }
  const latest = resolveLatestImportedRuntimeVersion(input);
  return { siteVersionId: latest.siteVersionId, fallbackUsed: true };
}

export function resolvePreviewRuntimeVersion(input: {
  binding: RuntimeSiteBinding;
  candidateSiteVersionIds?: readonly string[];
}): { siteVersionId: string; fallbackUsed: boolean } {
  const preview = normalizeToken(input.binding.previewSiteVersionId);
  if (preview) {
    return { siteVersionId: preview, fallbackUsed: false };
  }
  const active = normalizeToken(input.binding.activeSiteVersionId);
  if (active) {
    return { siteVersionId: active, fallbackUsed: true };
  }
  const latest = resolveLatestImportedRuntimeVersion(input);
  return { siteVersionId: latest.siteVersionId, fallbackUsed: true };
}

export function resolveRuntimeSiteVersion(input: RuntimeResolutionRequest): RuntimeResolutionResult {
  const strategy = input.strategy;
  const candidates = normalizeCandidates(input.candidateSiteVersionIds);
  const resolved =
    strategy === "latest_imported"
      ? resolveLatestImportedRuntimeVersion({ binding: input.binding, candidateSiteVersionIds: candidates })
      : strategy === "active"
        ? resolveActiveRuntimeVersion({ binding: input.binding, candidateSiteVersionIds: candidates })
        : strategy === "published"
          ? resolvePublishedRuntimeVersion({ binding: input.binding, candidateSiteVersionIds: candidates })
          : resolvePreviewRuntimeVersion({ binding: input.binding, candidateSiteVersionIds: candidates });

  const resolutionKey = createRuntimeResolutionKey({
    strategy,
    binding: input.binding,
    resolvedSiteVersionId: resolved.siteVersionId,
    fallbackUsed: resolved.fallbackUsed,
    candidateSiteVersionIds: candidates,
  });

  const diagnostics: RuntimeResolutionDiagnostics = {
    code: "PREVIEW_RUNTIME_RESOLUTION_APPLIED",
    strategy,
    resolvedSiteVersionId: resolved.siteVersionId,
    fallbackUsed: resolved.fallbackUsed,
    resolutionKey,
  };

  return {
    strategy,
    siteVersionId: resolved.siteVersionId,
    fallbackUsed: resolved.fallbackUsed,
    resolutionKey,
    diagnostics,
  };
}
