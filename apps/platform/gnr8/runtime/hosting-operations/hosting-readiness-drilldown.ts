import type { RuntimeDomainReadinessReport } from "@/gnr8/runtime/readiness/runtime-domain-readiness";
import type { RuntimeSiteReadinessReport } from "@/gnr8/runtime/readiness/runtime-site-readiness";

export type HostingReadinessSeverity = "blocker" | "warning";
export type HostingReadinessCategory = "site_readiness" | "domain_readiness";

export type HostingReadinessFinding = {
  code: string;
  category: HostingReadinessCategory;
  severity: HostingReadinessSeverity;
  description: string;
  affectedObject: string;
  suggestedRemediation: string | null;
};

export type HostingReadinessDrilldownSection = {
  state: "ready" | "ready_with_warnings" | "blocked" | "unknown";
  blockers: HostingReadinessFinding[];
  warnings: HostingReadinessFinding[];
};

export type HostingReadinessDrilldown = {
  site: HostingReadinessDrilldownSection;
  domains: HostingReadinessDrilldownSection;
};

type FindingDefinition = {
  description: string;
  affectedObject: string;
  suggestedRemediation: string;
};

const SITE_FINDINGS: Record<string, FindingDefinition> = {
  hosting_operations_site_not_found: {
    description: "Hosting operations could not resolve the requested site.",
    affectedObject: "runtime_site",
    suggestedRemediation: "Open a valid runtime site or ownership site identifier.",
  },
  no_site_version_candidates: {
    description: "No runtime site version candidates are available.",
    affectedObject: "site_versions",
    suggestedRemediation: "Import or create a runtime site version.",
  },
  missing_latest_imported_site_version: {
    description: "The latest imported site version pointer is missing.",
    affectedObject: "latest_imported_site_version",
    suggestedRemediation: "Import or create a runtime site version.",
  },
  missing_active_site_version_pointer: {
    description: "The active site version pointer is missing.",
    affectedObject: "active_site_version_pointer",
    suggestedRemediation: "Publish or activate a version.",
  },
  missing_active_pointer: {
    description: "The active site version pointer is missing.",
    affectedObject: "active_site_version_pointer",
    suggestedRemediation: "Publish or activate a version.",
  },
  missing_published_site_version: {
    description: "No published site version is available.",
    affectedObject: "published_site_version",
    suggestedRemediation: "Publish or activate a version.",
  },
};

const DOMAIN_FINDINGS: Record<string, FindingDefinition> = {
  missing_site_id: {
    description: "Domain readiness is missing the runtime site identifier.",
    affectedObject: "runtime_site",
    suggestedRemediation: "Open a valid runtime site or ownership site identifier.",
  },
  missing_domain_identity_signals: {
    description: "No domain identity signals are available for this site.",
    affectedObject: "domain_identity",
    suggestedRemediation: "Attach and verify a custom domain.",
  },
  missing_custom_domain: {
    description: "No custom domain is attached.",
    affectedObject: "custom_domain",
    suggestedRemediation: "The site is reachable through its internal working domain, but no external customer domain is attached.",
  },
  missing_active_domain_binding: {
    description: "No active domain binding is available.",
    affectedObject: "domain_binding",
    suggestedRemediation: "Verify domain binding activation.",
  },
  missing_internal_host: {
    description: "No internal runtime host binding is available.",
    affectedObject: "internal_host_binding",
    suggestedRemediation: "Create or restore the internal runtime host binding.",
  },
};

function fallbackFinding(input: {
  code: string;
  category: HostingReadinessCategory;
  severity: HostingReadinessSeverity;
}): HostingReadinessFinding {
  return {
    code: input.code,
    category: input.category,
    severity: input.severity,
    description: input.code,
    affectedObject: input.category,
    suggestedRemediation: null,
  };
}

function mapFinding(input: {
  code: string;
  category: HostingReadinessCategory;
  severity: HostingReadinessSeverity;
}): HostingReadinessFinding {
  const definitions = input.category === "site_readiness" ? SITE_FINDINGS : DOMAIN_FINDINGS;
  const definition = definitions[input.code];
  if (!definition) return fallbackFinding(input);

  return {
    code: input.code,
    category: input.category,
    severity: input.severity,
    description: definition.description,
    affectedObject: definition.affectedObject,
    suggestedRemediation: definition.suggestedRemediation,
  };
}

function mapCodes(input: {
  codes: readonly string[];
  category: HostingReadinessCategory;
  severity: HostingReadinessSeverity;
}): HostingReadinessFinding[] {
  return input.codes.map((code) =>
    mapFinding({
      code,
      category: input.category,
      severity: input.severity,
    }),
  );
}

export function createHostingReadinessDrilldown(input: {
  siteReadiness: RuntimeSiteReadinessReport | null;
  domainReadiness: RuntimeDomainReadinessReport | null;
  siteFallbackBlockers?: readonly string[];
  siteFallbackWarnings?: readonly string[];
  domainFallbackBlockers?: readonly string[];
  domainFallbackWarnings?: readonly string[];
}): HostingReadinessDrilldown {
  const siteBlockers = input.siteReadiness?.blockers ?? input.siteFallbackBlockers ?? [];
  const siteWarnings = input.siteReadiness?.warnings ?? input.siteFallbackWarnings ?? [];
  const domainBlockers = input.domainReadiness?.blockers ?? input.domainFallbackBlockers ?? [];
  const domainWarnings = input.domainReadiness?.warnings ?? input.domainFallbackWarnings ?? [];

  return {
    site: {
      state: input.siteReadiness?.readinessStatus ?? (siteBlockers.length > 0 ? "blocked" : "unknown"),
      blockers: mapCodes({ codes: siteBlockers, category: "site_readiness", severity: "blocker" }),
      warnings: mapCodes({ codes: siteWarnings, category: "site_readiness", severity: "warning" }),
    },
    domains: {
      state: input.domainReadiness?.domainReadinessStatus ?? (domainBlockers.length > 0 ? "blocked" : "unknown"),
      blockers: mapCodes({ codes: domainBlockers, category: "domain_readiness", severity: "blocker" }),
      warnings: mapCodes({ codes: domainWarnings, category: "domain_readiness", severity: "warning" }),
    },
  };
}
