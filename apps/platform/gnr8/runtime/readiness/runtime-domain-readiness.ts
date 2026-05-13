import type { RuntimeSiteResolutionBinding } from "@/gnr8/runtime/runtime-store";
import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";

export type RuntimeDomainReadinessStatus = "ready" | "ready_with_warnings" | "blocked";

export type RuntimeDomainBindingInput = {
  domain?: string | null;
  status?: string | null;
  host?: string | null;
  isInternalHost?: boolean | null;
  isActive?: boolean | null;
};

export type RuntimeDomainReadinessInput = {
  siteBinding: RuntimeSiteResolutionBinding;
  primaryHost?: string | null;
  internalPreviewHost?: string | null;
  domainBindings?: readonly RuntimeDomainBindingInput[];
};

export type RuntimeDomainReadinessReport = {
  siteId: string;
  canonicalSlug: string;
  primaryHost: string | null;
  internalPreviewHost: string | null;
  customDomains: string[];
  hasInternalHost: boolean;
  hasCustomDomain: boolean;
  hasActiveDomainBinding: boolean;
  domainReadinessStatus: RuntimeDomainReadinessStatus;
  warnings: string[];
  blockers: string[];
  correlationKey: string;
};

function normalizeToken(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function normalizeHost(value: string | null | undefined): string | null {
  const normalized = normalizeToken(value).toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeCustomDomain(value: string | null | undefined): string | null {
  const normalized = normalizeToken(value).toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function hasTruthySiteIdentity(siteId: string): boolean {
  return siteId.length > 0 && siteId !== "unknown_site";
}

export function createRuntimeDomainReadinessReport(input: RuntimeDomainReadinessInput): RuntimeDomainReadinessReport {
  const siteId = normalizeToken(input.siteBinding.siteId);
  const canonicalSlug = normalizeToken(input.siteBinding.canonicalSlug ?? "");

  const primaryHost = normalizeHost(input.primaryHost);
  const internalPreviewHost = normalizeHost(input.internalPreviewHost);

  const domainBindings = input.domainBindings ?? [];
  const customDomains = uniqueSorted(
    domainBindings
      .map((binding) => normalizeCustomDomain(binding.domain))
      .filter((value): value is string => value !== null),
  );

  const hasInternalHost =
    internalPreviewHost !== null || primaryHost !== null || domainBindings.some((binding) => binding.isInternalHost === true);
  const hasCustomDomain = customDomains.length > 0;
  const hasActiveDomainBinding = domainBindings.some((binding) => binding.isActive === true || normalizeToken(binding.status).toLowerCase() === "active");

  const blockers: string[] = [];
  if (!hasTruthySiteIdentity(siteId)) blockers.push("missing_site_id");

  const hasAnyDomainSignal = canonicalSlug.length > 0 || primaryHost !== null || internalPreviewHost !== null || hasCustomDomain;
  if (!hasAnyDomainSignal) blockers.push("missing_domain_identity_signals");

  const warnings: string[] = [];
  if (!hasCustomDomain) warnings.push("missing_custom_domain");
  if (!hasActiveDomainBinding) warnings.push("missing_active_domain_binding");
  if (!hasInternalHost) warnings.push("missing_internal_host");

  const domainReadinessStatus: RuntimeDomainReadinessStatus =
    blockers.length > 0 ? "blocked" : warnings.length > 0 ? "ready_with_warnings" : hasInternalHost ? "ready" : "ready_with_warnings";

  const correlationKey = createRuntimeCorrelationKey({
    siteId: siteId || "unknown_site",
    canonicalSlug: canonicalSlug || "unknown_slug",
    primaryHost: primaryHost ?? "none",
    internalPreviewHost: internalPreviewHost ?? "none",
    customDomains: customDomains.join(","),
    hasInternalHost: hasInternalHost ? "true" : "false",
    hasCustomDomain: hasCustomDomain ? "true" : "false",
    hasActiveDomainBinding: hasActiveDomainBinding ? "true" : "false",
    domainReadinessStatus,
    warnings: warnings.join(","),
    blockers: blockers.join(","),
  });

  return {
    siteId,
    canonicalSlug,
    primaryHost,
    internalPreviewHost,
    customDomains,
    hasInternalHost,
    hasCustomDomain,
    hasActiveDomainBinding,
    domainReadinessStatus,
    warnings,
    blockers,
    correlationKey,
  };
}
