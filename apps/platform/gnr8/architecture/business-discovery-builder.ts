/**
 * Phase MVP-1A deterministic Business Discovery builder.
 *
 * This module interprets existing imported website evidence into the first
 * website-derived Business Discovery artifact. It does not call AI systems,
 * read live sites, generate content, create a Digital Business Twin, persist
 * data, dispatch work, approve, or publish.
 */

import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import type { CandidateDiscoveryResult } from "./candidate-discovery-contract";
import type { EvidenceCaptureBaselineArtifactRecord } from "./evidence-capture-baseline-artifact";
import type {
  LayoutGeometryEvidence,
  NavigationEvidence,
  SectionBoundaryEvidence,
} from "./evidence-capture-layout-contract";
import {
  BUSINESS_DISCOVERY_CONTRACT_VERSION,
  BUSINESS_DISCOVERY_DOMAINS,
  validateBusinessDiscoveryArtifact,
  type BusinessDiscoveryArtifact,
  type BusinessDiscoveryConfidence,
  type BusinessDiscoveryDomain,
  type BusinessDiscoveryDomainSummary,
  type BusinessDiscoveryEvidenceRef,
  type BusinessDiscoveryFinding,
  type BusinessDiscoveryLimitation,
  type BusinessDiscoveryStatus,
} from "./business-discovery-contract";

export const BUSINESS_DISCOVERY_BUILDER_VERSION = "MVP-1A" as const;

export type BusinessDiscoveryBuilderInput = {
  siteVersionId: string;
  dryRunId: string;
  sourceSiteId?: string | null;
  sourceUrl?: string | null;
  createdAt?: string | null;
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
  evidenceCaptureBaseline?:
    | EvidenceCaptureBaselineArtifactRecord
    | EvidenceCaptureBaselineArtifactRecord[]
    | null;
  layoutGeometryEvidence?: LayoutGeometryEvidence[] | null;
  sectionBoundaryEvidence?: SectionBoundaryEvidence[] | null;
  navigationEvidence?: NavigationEvidence[] | null;
  candidateDiscoveryResult?: CandidateDiscoveryResult | null;
  candidateDiscoveryArtifactId?: string | null;
};

type Signal = {
  label: string;
  routePath?: string;
  href?: string;
  evidenceRefs: BusinessDiscoveryEvidenceRef[];
};

type FindingDraft = {
  domain: BusinessDiscoveryDomain;
  kind: string;
  token: string;
  summary: string;
  evidenceRefs: BusinessDiscoveryEvidenceRef[];
  confidence: BusinessDiscoveryConfidence;
  diagnostics: string[];
};

const CONTACT_PATTERN = /\b(contact|kontakt|contatti|call|email|phone|support|appointment|book)\b/i;
const ABOUT_PATTERN = /\b(about|o nas|company|team|story|who we are|profile)\b/i;
const OFFERING_PATTERN = /\b(service|services|storitve|product|products|solution|solutions|program|pricing|shop|menu|ponudba|offer)\b/i;
const TRUST_PATTERN = /\b(reference|references|review|reviews|testimonial|testimonials|certificat|certified|client|clients|case|awards|partner|partners)\b/i;
const AUDIENCE_PATTERN = /\b(patient|patients|customer|customers|client|clients|businesses|families|teams|students|parents|stranke|pacient)\b/i;
const GOAL_PATTERN = /\b(contact|kontakt|book|appointment|quote|demo|call|order|buy|shop|reserve|subscribe|request)\b/i;

function escapeIdentity(value: string, preserveSlash = false): string {
  let escaped = "";
  for (const character of value) {
    if (/^[A-Za-z0-9._~-]$/.test(character) || (preserveSlash && character === "/")) {
      escaped += character;
      continue;
    }
    for (const byte of new TextEncoder().encode(character)) {
      escaped += `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
    }
  }
  return escaped;
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function nonEmpty(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized || null;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function uniqueRefs(refs: BusinessDiscoveryEvidenceRef[]): BusinessDiscoveryEvidenceRef[] {
  const map = new Map<string, BusinessDiscoveryEvidenceRef>();
  for (const ref of refs) {
    map.set(`${ref.sourceKind}\u0000${ref.refId}\u0000${ref.routePath ?? ""}`, ref);
  }
  return [...map.values()].sort((left, right) =>
    left.sourceKind.localeCompare(right.sourceKind) ||
    left.refId.localeCompare(right.refId) ||
    String(left.routePath ?? "").localeCompare(String(right.routePath ?? "")));
}

function baselines(input: BusinessDiscoveryBuilderInput): EvidenceCaptureBaselineArtifactRecord[] {
  const baseline = input.evidenceCaptureBaseline;
  if (!baseline) return [];
  return Array.isArray(baseline) ? baseline : [baseline];
}

function collectLayoutEvidence(input: BusinessDiscoveryBuilderInput): LayoutGeometryEvidence[] {
  return [
    ...baselines(input).flatMap((baseline) => baseline.captureExpansionEvidence.layoutGeometryEvidence),
    ...(input.layoutGeometryEvidence ?? []),
  ];
}

function collectSectionEvidence(input: BusinessDiscoveryBuilderInput): SectionBoundaryEvidence[] {
  return [
    ...baselines(input).flatMap((baseline) => baseline.captureExpansionEvidence.sectionBoundaryEvidence),
    ...(input.sectionBoundaryEvidence ?? []),
  ];
}

function collectNavigationEvidence(input: BusinessDiscoveryBuilderInput): NavigationEvidence[] {
  return [
    ...baselines(input).flatMap((baseline) => baseline.captureExpansionEvidence.navigationEvidence),
    ...(input.navigationEvidence ?? []),
  ];
}

function sourceUrl(input: BusinessDiscoveryBuilderInput): string | null {
  return nonEmpty(input.sourceUrl) ??
    baselines(input).map((baseline) => nonEmpty(baseline.sourceUrl) ?? nonEmpty(baseline.finalUrl)).find(Boolean) ??
    nonEmpty(input.importProvenanceSummary?.multiPageDiscovery?.manifest?.seedUrl);
}

function sourceHost(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function sourceUrlRef(url: string): BusinessDiscoveryEvidenceRef {
  return {
    refId: `source-url:${escapeIdentity(url)}`,
    sourceKind: "source_url",
    description: "Imported website source URL",
  };
}

function routeRef(routePath: string): BusinessDiscoveryEvidenceRef {
  return { refId: `evidence:route:${routePath}`, sourceKind: "route", routePath };
}

function navigationRef(routePath: string, position?: number): BusinessDiscoveryEvidenceRef {
  return {
    refId: position === undefined
      ? `evidence:navigation:${routePath}`
      : `evidence:navigation:${routePath}:item:${position}`,
    sourceKind: "navigation_evidence",
    routePath,
  };
}

function sectionRef(routePath: string, sectionId: string): BusinessDiscoveryEvidenceRef {
  return {
    refId: `evidence:section-boundary:${routePath}:${sectionId}`,
    sourceKind: "section_boundary",
    routePath,
  };
}

function sectionBoundaryRefs(section: SectionBoundaryEvidence): BusinessDiscoveryEvidenceRef[] {
  const stableBoundaryRefs = (section.sourceEvidenceRefs ?? [])
    .filter((refId) => refId.startsWith("evidence:section-boundary:"))
    .map((refId) => ({
      refId,
      sourceKind: "section_boundary" as const,
      routePath: section.routePath,
    }));
  return stableBoundaryRefs.length > 0
    ? uniqueRefs(stableBoundaryRefs)
    : [sectionRef(section.routePath, section.sectionId)];
}

function baselineRef(routePath: string): BusinessDiscoveryEvidenceRef {
  return {
    refId: `evidence:capture-baseline:${routePath}`,
    sourceKind: "evidence_capture_baseline",
    routePath,
  };
}

function candidateDiscoveryRef(artifactId: string): BusinessDiscoveryEvidenceRef {
  return {
    refId: artifactId,
    sourceKind: "candidate_discovery",
    description: "Persisted Candidate Discovery artifact",
  };
}

function collectRoutePaths(input: BusinessDiscoveryBuilderInput): string[] {
  const provenance = input.importProvenanceSummary;
  return uniqueSorted([
    ...baselines(input).map((baseline) => baseline.routePath),
    ...collectLayoutEvidence(input).map((evidence) => evidence.routePath),
    ...collectSectionEvidence(input).map((evidence) => evidence.routePath),
    ...collectNavigationEvidence(input).map((evidence) => evidence.routePath),
    ...(provenance?.multiPageDiscovery?.manifest?.routeCandidates ?? []),
    ...(provenance?.multiPageDiscovery?.manifest?.discoveredPages ?? [])
      .map((entry) => entry.normalizedRoutePath)
      .filter((routePath): routePath is string => Boolean(routePath)),
    ...(provenance?.multiPageDiscovery?.rawArtifactAssembly?.routeMap ?? [])
      .map((entry) => entry.routePath),
    ...(input.candidateDiscoveryResult?.candidates ?? [])
      .map((candidate) => candidate.routePath)
      .filter((routePath): routePath is string => Boolean(routePath)),
  ].map(normalizeText).filter(Boolean));
}

function collectNavigationSignals(input: BusinessDiscoveryBuilderInput): Signal[] {
  return collectNavigationEvidence(input)
    .flatMap((evidence) =>
      evidence.navigationItems.map((item): Signal => ({
        label: normalizeText(item.label),
        href: normalizeText(item.href),
        routePath: evidence.routePath,
        evidenceRefs: [
          navigationRef(evidence.routePath),
          navigationRef(evidence.routePath, item.position),
          ...evidence.sourceEvidenceRefs.map((refId) => ({
            refId,
            sourceKind: "navigation_evidence" as const,
            routePath: evidence.routePath,
          })),
        ],
      })))
    .filter((signal) => signal.label || signal.href)
    .sort((left, right) =>
      String(left.routePath ?? "").localeCompare(String(right.routePath ?? "")) ||
      String(left.href ?? "").localeCompare(String(right.href ?? "")) ||
      left.label.localeCompare(right.label));
}

function limitation(input: {
  code: string;
  message: string;
  severity?: BusinessDiscoveryLimitation["severity"];
  token?: string;
  evidenceRefs?: BusinessDiscoveryEvidenceRef[];
  diagnostics?: string[];
}): BusinessDiscoveryLimitation {
  return {
    limitationId: `business-discovery:${escapeIdentity(input.token ?? input.code)}:${input.code}`,
    severity: input.severity ?? "warning",
    code: input.code,
    message: input.message,
    ...(input.evidenceRefs && input.evidenceRefs.length > 0
      ? { evidenceRefs: uniqueRefs(input.evidenceRefs) }
      : {}),
    ...(input.diagnostics && input.diagnostics.length > 0
      ? { diagnostics: uniqueSorted(input.diagnostics) }
      : {}),
  };
}

function evidenceLimitations(input: BusinessDiscoveryBuilderInput): BusinessDiscoveryLimitation[] {
  const limitations: BusinessDiscoveryLimitation[] = [];
  for (const baseline of baselines(input)) {
    for (const [index, message] of baseline.limitations.entries()) {
      limitations.push(limitation({
        code: "UPSTREAM_EVIDENCE_LIMITATION",
        token: `baseline:${baseline.routePath}:${index}`,
        message,
        evidenceRefs: [baselineRef(baseline.routePath)],
      }));
    }
    for (const [index, item] of baseline.fidelityLimitations.entries()) {
      limitations.push(limitation({
        code: "UPSTREAM_FIDELITY_LIMITATION",
        token: `fidelity:${baseline.routePath}:${index}`,
        severity: item.severity === "info" ? "note" : item.severity,
        message: item.explanation,
        evidenceRefs: item.evidenceRefIds.length > 0
          ? item.evidenceRefIds.map((refId) => ({
              refId,
              sourceKind: "evidence_capture_baseline" as const,
              routePath: baseline.routePath,
            }))
          : [baselineRef(baseline.routePath)],
        diagnostics: [item.type, item.affectedLayer, item.recommendedNextLayer],
      }));
    }
  }
  for (const code of input.importProvenanceSummary?.importDiagnosticCodes ?? []) {
    limitations.push(limitation({
      code: "IMPORT_DIAGNOSTIC_OBSERVED",
      token: `diagnostic:${code}`,
      severity: "note",
      message: `Import diagnostic was present upstream: ${code}.`,
      evidenceRefs: [{ refId: code, sourceKind: "diagnostic" }],
    }));
  }
  return limitations;
}

function confidence(
  level: BusinessDiscoveryConfidence["level"],
  reasons: string[],
): BusinessDiscoveryConfidence {
  return {
    level,
    reasons: uniqueSorted(reasons),
  };
}

function findingId(domain: BusinessDiscoveryDomain, kind: string, token: string): string {
  return `business-discovery:${domain}:${kind}:${escapeIdentity(token, true)}`;
}

function addFinding(
  findings: BusinessDiscoveryFinding[],
  draft: FindingDraft,
): void {
  const id = findingId(draft.domain, draft.kind, draft.token);
  if (findings.some((finding) => finding.findingId === id)) return;
  findings.push({
    findingId: id,
    domain: draft.domain,
    kind: draft.kind,
    summary: draft.summary,
    evidenceRefs: uniqueRefs(draft.evidenceRefs),
    confidence: draft.confidence,
    limitations: [],
    diagnostics: uniqueSorted(draft.diagnostics),
  });
}

function signalText(signal: Signal): string {
  return `${signal.label} ${signal.href ?? ""} ${signal.routePath ?? ""}`;
}

function matchedSignals(signals: Signal[], routes: string[], pattern: RegExp): Signal[] {
  const routeSignals = routes
    .filter((routePath) => pattern.test(routePath))
    .map((routePath): Signal => ({
      label: routePath,
      routePath,
      evidenceRefs: [routeRef(routePath)],
    }));
  return [...signals.filter((signal) => pattern.test(signalText(signal))), ...routeSignals];
}

function buildFindings(input: BusinessDiscoveryBuilderInput): BusinessDiscoveryFinding[] {
  const findings: BusinessDiscoveryFinding[] = [];
  const url = sourceUrl(input);
  const host = sourceHost(url);
  const routes = collectRoutePaths(input);
  const navigationSignals = collectNavigationSignals(input);
  const sectionEvidence = collectSectionEvidence(input);
  const baselineRecords = baselines(input);

  if (url && host) {
    addFinding(findings, {
      domain: "business_identity",
      kind: "company_identity_observed",
      token: host,
      summary: `Imported website host ${host} is observed as the first business identity signal.`,
      evidenceRefs: [sourceUrlRef(url)],
      confidence: confidence("LOW", ["source_url_observed", "host_is_not_legal_business_identity"]),
      diagnostics: ["BUSINESS_IDENTITY_FROM_SOURCE_HOST"],
    });
    addFinding(findings, {
      domain: "digital_presence",
      kind: "source_site_observed",
      token: host,
      summary: `A live source website was imported from ${url}.`,
      evidenceRefs: [sourceUrlRef(url)],
      confidence: confidence("HIGH", ["source_url_observed"]),
      diagnostics: ["DIGITAL_PRESENCE_SOURCE_URL_OBSERVED"],
    });
  }

  if (routes.length > 0) {
    addFinding(findings, {
      domain: "digital_presence",
      kind: "route_inventory_observed",
      token: routes.join("|"),
      summary: `Imported website evidence includes ${routes.length} observed route${routes.length === 1 ? "" : "s"}: ${routes.join(", ")}.`,
      evidenceRefs: routes.map(routeRef),
      confidence: confidence("MEDIUM", ["route_paths_observed"]),
      diagnostics: [`ROUTE_COUNT:${routes.length}`],
    });
  }

  if (navigationSignals.length > 0) {
    addFinding(findings, {
      domain: "digital_presence",
      kind: "primary_navigation_observed",
      token: navigationSignals.map((signal) => `${signal.label}:${signal.href ?? ""}`).join("|"),
      summary: `Navigation evidence includes labels: ${navigationSignals.map((signal) => signal.label).join(", ")}.`,
      evidenceRefs: navigationSignals.flatMap((signal) => signal.evidenceRefs),
      confidence: confidence("MEDIUM", ["navigation_labels_observed"]),
      diagnostics: [`NAVIGATION_LABEL_COUNT:${navigationSignals.length}`],
    });
  }

  for (const signal of matchedSignals(navigationSignals, routes, OFFERING_PATTERN)) {
    addFinding(findings, {
      domain: "offerings",
      kind: "offering_candidate_observed",
      token: signal.label || signal.href || signal.routePath || "offering",
      summary: `Website wording suggests an offering area: ${signal.label || signal.href || signal.routePath}.`,
      evidenceRefs: signal.evidenceRefs,
      confidence: confidence("LOW", ["offering_keyword_observed", "requires_business_owner_confirmation"]),
      diagnostics: ["OFFERING_CANDIDATE_FROM_ROUTE_OR_NAVIGATION"],
    });
  }

  for (const signal of matchedSignals(navigationSignals, routes, ABOUT_PATTERN)) {
    addFinding(findings, {
      domain: "business_identity",
      kind: "company_identity_observed",
      token: `about:${signal.label || signal.href || signal.routePath}`,
      summary: `About/company wording is present in website structure: ${signal.label || signal.href || signal.routePath}.`,
      evidenceRefs: signal.evidenceRefs,
      confidence: confidence("MEDIUM", ["about_or_company_path_observed"]),
      diagnostics: ["ABOUT_PATH_OR_LABEL_OBSERVED"],
    });
  }

  for (const signal of matchedSignals(navigationSignals, routes, CONTACT_PATTERN)) {
    addFinding(findings, {
      domain: "goals",
      kind: "contact_path_observed",
      token: signal.label || signal.href || signal.routePath || "contact",
      summary: `Website structure exposes a contact or conversion path: ${signal.label || signal.href || signal.routePath}.`,
      evidenceRefs: signal.evidenceRefs,
      confidence: confidence("MEDIUM", ["contact_or_conversion_path_observed"]),
      diagnostics: ["CONTACT_PATH_OBSERVED"],
    });
    addFinding(findings, {
      domain: "trust",
      kind: "trust_signal_observed",
      token: `contact:${signal.label || signal.href || signal.routePath}`,
      summary: `A contact path is present, which is a basic trust and accessibility signal.`,
      evidenceRefs: signal.evidenceRefs,
      confidence: confidence("LOW", ["contact_path_supports_basic_trust", "not_a_quality_or_compliance_claim"]),
      diagnostics: ["CONTACT_PATH_AS_TRUST_SIGNAL"],
    });
  }

  for (const signal of matchedSignals(navigationSignals, routes, TRUST_PATTERN)) {
    addFinding(findings, {
      domain: "trust",
      kind: "trust_signal_observed",
      token: signal.label || signal.href || signal.routePath || "trust",
      summary: `Website wording suggests a trust signal area: ${signal.label || signal.href || signal.routePath}.`,
      evidenceRefs: signal.evidenceRefs,
      confidence: confidence("LOW", ["trust_keyword_observed", "claim_not_validated"]),
      diagnostics: ["TRUST_SIGNAL_FROM_ROUTE_OR_NAVIGATION"],
    });
  }

  for (const signal of matchedSignals(navigationSignals, routes, AUDIENCE_PATTERN)) {
    addFinding(findings, {
      domain: "audience",
      kind: "audience_candidate_observed",
      token: signal.label || signal.href || signal.routePath || "audience",
      summary: `Website wording suggests a possible audience segment: ${signal.label || signal.href || signal.routePath}.`,
      evidenceRefs: signal.evidenceRefs,
      confidence: confidence("LOW", ["audience_keyword_observed", "requires_business_owner_confirmation"]),
      diagnostics: ["AUDIENCE_CANDIDATE_FROM_ROUTE_OR_NAVIGATION"],
    });
  }

  for (const signal of matchedSignals(navigationSignals, routes, GOAL_PATTERN)) {
    addFinding(findings, {
      domain: "goals",
      kind: "goal_candidate_observed",
      token: `goal:${signal.label || signal.href || signal.routePath}`,
      summary: `Website wording suggests a business goal or visitor action: ${signal.label || signal.href || signal.routePath}.`,
      evidenceRefs: signal.evidenceRefs,
      confidence: confidence("LOW", ["conversion_or_action_keyword_observed"]),
      diagnostics: ["GOAL_CANDIDATE_FROM_ROUTE_OR_NAVIGATION"],
    });
  }

  const sectionTypes = uniqueSorted(sectionEvidence.map((section) => section.regionType));
  if (sectionTypes.length > 0) {
    addFinding(findings, {
      domain: "content",
      kind: "content_theme_observed",
      token: sectionTypes.join("|"),
      summary: `Captured section evidence includes website content regions: ${sectionTypes.join(", ")}.`,
      evidenceRefs: uniqueRefs(sectionEvidence.flatMap(sectionBoundaryRefs)),
      confidence: confidence("MEDIUM", ["section_boundary_types_observed"]),
      diagnostics: [`SECTION_TYPE_COUNT:${sectionTypes.length}`],
    });
  } else if (navigationSignals.length > 0 || routes.length > 0) {
    addFinding(findings, {
      domain: "content",
      kind: "content_theme_observed",
      token: "navigation-and-routes",
      summary: "Navigation and route wording provide partial content theme evidence.",
      evidenceRefs: [
        ...routes.map(routeRef),
        ...navigationSignals.flatMap((signal) => signal.evidenceRefs),
      ],
      confidence: confidence("LOW", ["route_and_navigation_text_only", "section_content_missing"]),
      diagnostics: ["CONTENT_THEME_FROM_PARTIAL_STRUCTURE"],
    });
  }

  const assetCounts = baselineRecords
    .map((baseline) => baseline.summaries.assetInventory.persistedAssetCount)
    .filter((count): count is number => typeof count === "number" && Number.isFinite(count));
  const assetCount = assetCounts.reduce((sum, count) => sum + count, 0);
  if (assetCount > 0) {
    addFinding(findings, {
      domain: "brand",
      kind: "asset_signal_observed",
      token: String(assetCount),
      summary: `Imported evidence includes ${assetCount} persisted asset${assetCount === 1 ? "" : "s"} that may carry brand signals.`,
      evidenceRefs: baselineRecords.map((baseline) => ({
        refId: `asset-inventory:${baseline.routePath}`,
        sourceKind: "asset_inventory" as const,
        routePath: baseline.routePath,
      })),
      confidence: confidence("LOW", ["asset_inventory_observed", "logo_or_brand_semantics_not_confirmed"]),
      diagnostics: [`PERSISTED_ASSET_COUNT:${assetCount}`],
    });
  }

  const upstreamLimitations = evidenceLimitations(input);
  if (upstreamLimitations.length > 0) {
    addFinding(findings, {
      domain: "constraints",
      kind: "evidence_constraint_observed",
      token: String(upstreamLimitations.length),
      summary: `Business Discovery inherited ${upstreamLimitations.length} upstream evidence limitation${upstreamLimitations.length === 1 ? "" : "s"}.`,
      evidenceRefs: upstreamLimitations.flatMap((item) => item.evidenceRefs ?? []),
      confidence: confidence("HIGH", ["upstream_limitations_observed"]),
      diagnostics: [`UPSTREAM_LIMITATION_COUNT:${upstreamLimitations.length}`],
    });
  }

  if (input.candidateDiscoveryResult && input.candidateDiscoveryArtifactId) {
    addFinding(findings, {
      domain: "constraints",
      kind: "candidate_discovery_context_observed",
      token: input.candidateDiscoveryArtifactId,
      summary: `Candidate Discovery context is available with ${input.candidateDiscoveryResult.candidateCount} reconstruction candidate${input.candidateDiscoveryResult.candidateCount === 1 ? "" : "s"}.`,
      evidenceRefs: [candidateDiscoveryRef(input.candidateDiscoveryArtifactId)],
      confidence: confidence("MEDIUM", ["candidate_discovery_artifact_observed"]),
      diagnostics: [`CANDIDATE_DISCOVERY_CANDIDATE_COUNT:${input.candidateDiscoveryResult.candidateCount}`],
    });
  }

  return findings.sort((left, right) => left.findingId.localeCompare(right.findingId));
}

function missingDomainLimitation(domain: BusinessDiscoveryDomain): BusinessDiscoveryLimitation {
  return limitation({
    code: "DOMAIN_SIGNAL_MISSING",
    token: `domain:${domain}`,
    message: `No deterministic website-derived Business Discovery signal was available for ${domain}.`,
    severity: "warning",
  });
}

function domainSummary(input: {
  domain: BusinessDiscoveryDomain;
  findings: BusinessDiscoveryFinding[];
  limitations: BusinessDiscoveryLimitation[];
}): BusinessDiscoveryDomainSummary {
  const domainFindings = input.findings.filter((finding) => finding.domain === input.domain);
  const domainLimitations = input.limitations.filter((item) =>
    item.limitationId.includes(`domain%3A${input.domain}`) ||
    (input.domain === "constraints" && item.code.startsWith("UPSTREAM_")));
  const evidenceRefs = uniqueRefs(domainFindings.flatMap((finding) => finding.evidenceRefs));
  const status: BusinessDiscoveryStatus =
    domainFindings.length === 0
      ? "partial"
      : domainLimitations.length > 0
        ? "partial"
        : "observed";
  const level: BusinessDiscoveryConfidence["level"] =
    domainFindings.some((finding) => finding.confidence.level === "HIGH")
      ? "HIGH"
      : domainFindings.some((finding) => finding.confidence.level === "MEDIUM")
        ? "MEDIUM"
        : "LOW";
  return {
    domain: input.domain,
    status,
    summary: domainFindings.length > 0
      ? `${domainFindings.length} website-derived finding${domainFindings.length === 1 ? "" : "s"} observed for ${input.domain}.`
      : `No website-derived finding was observed for ${input.domain}.`,
    findingIds: domainFindings.map((finding) => finding.findingId),
    evidenceRefs,
    confidence: confidence(level, [
      domainFindings.length > 0 ? "domain_findings_observed" : "domain_signal_missing",
      ...(domainLimitations.length > 0 ? ["domain_limitations_present"] : []),
    ]),
    limitations: domainLimitations,
    diagnostics: [`DOMAIN_FINDING_COUNT:${domainFindings.length}`],
  };
}

function lineageRefs(input: BusinessDiscoveryBuilderInput): BusinessDiscoveryEvidenceRef[] {
  const refs: BusinessDiscoveryEvidenceRef[] = [
    {
      refId: `site-version:${input.siteVersionId}`,
      sourceKind: "site_version",
      description: "Runtime site version",
    },
  ];
  const url = sourceUrl(input);
  if (url) refs.push(sourceUrlRef(url));
  refs.push(...baselines(input).map((baseline) => baselineRef(baseline.routePath)));
  refs.push(...collectRoutePaths(input).map(routeRef));
  return uniqueRefs(refs);
}

function artifactStatus(input: {
  findings: BusinessDiscoveryFinding[];
  limitations: BusinessDiscoveryLimitation[];
  lineageEvidenceRefs: BusinessDiscoveryEvidenceRef[];
}): BusinessDiscoveryStatus {
  if (input.lineageEvidenceRefs.length <= 1 || input.findings.length === 0) return "blocked";
  if (input.limitations.some((item) => item.severity === "blocker")) return "blocked";
  if (input.limitations.length > 0) return "partial";
  return "observed";
}

function artifactConfidence(input: {
  findings: BusinessDiscoveryFinding[];
  status: BusinessDiscoveryStatus;
}): BusinessDiscoveryConfidence {
  if (input.status === "blocked") {
    return confidence("LOW", ["business_discovery_blocked"]);
  }
  const highCount = input.findings.filter((finding) => finding.confidence.level === "HIGH").length;
  const mediumCount = input.findings.filter((finding) => finding.confidence.level === "MEDIUM").length;
  if (highCount >= 2 && mediumCount >= 2) {
    return confidence("MEDIUM", ["multiple_evidence_backed_findings", "website_only_business_discovery"]);
  }
  return confidence("LOW", ["limited_website_derived_findings", "requires_dbt_confirmation"]);
}

export function buildBusinessDiscoveryFromSiteEvidence(
  input: BusinessDiscoveryBuilderInput,
): BusinessDiscoveryArtifact {
  const url = sourceUrl(input);
  const findings = buildFindings(input);
  const evidenceRefs = lineageRefs(input);
  const missingLimitations = BUSINESS_DISCOVERY_DOMAINS
    .filter((domain) => findings.every((finding) => finding.domain !== domain))
    .map(missingDomainLimitation);
  const limitations = [
    ...evidenceLimitations(input),
    ...missingLimitations,
  ].sort((left, right) => left.limitationId.localeCompare(right.limitationId));

  if (evidenceRefs.length <= 1) {
    limitations.push(limitation({
      code: "WEBSITE_EVIDENCE_MISSING",
      token: "website-evidence",
      severity: "blocker",
      message: "Business Discovery requires imported website evidence beyond the siteVersionId.",
    }));
  }

  const status = artifactStatus({ findings, limitations, lineageEvidenceRefs: evidenceRefs });
  const artifact: BusinessDiscoveryArtifact = {
    businessDiscoveryId: `business-discovery:${escapeIdentity(input.siteVersionId)}:${escapeIdentity(input.dryRunId)}`,
    status,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    ...(nonEmpty(input.sourceSiteId) ? { sourceSiteId: nonEmpty(input.sourceSiteId)! } : {}),
    ...(url ? { sourceUrl: url } : {}),
    createdAt: nonEmpty(input.createdAt) ?? new Date().toISOString(),
    contractVersion: BUSINESS_DISCOVERY_CONTRACT_VERSION,
    lineage: {
      siteVersionId: input.siteVersionId,
      dryRunId: input.dryRunId,
      ...(nonEmpty(input.sourceSiteId) ? { sourceSiteId: nonEmpty(input.sourceSiteId)! } : {}),
      ...(url ? { sourceUrl: url } : {}),
      evidenceRefs,
      upstreamArtifactRefs: uniqueRefs([
        ...(input.candidateDiscoveryArtifactId ? [candidateDiscoveryRef(input.candidateDiscoveryArtifactId)] : []),
      ]),
    },
    domainSummaries: BUSINESS_DISCOVERY_DOMAINS.map((domain) =>
      domainSummary({ domain, findings, limitations })),
    findings,
    confidence: artifactConfidence({ findings, status }),
    limitations,
    diagnostics: [
      "BUSINESS_DISCOVERY_BUILDER_VERSION:MVP-1A",
      `BUSINESS_DISCOVERY_FINDING_COUNT:${findings.length}`,
      `BUSINESS_DISCOVERY_LIMITATION_COUNT:${limitations.length}`,
      `BUSINESS_DISCOVERY_STATUS:${status}`,
    ],
  };

  const validation = validateBusinessDiscoveryArtifact(artifact);
  if (!validation.valid) {
    return {
      ...artifact,
      status: "invalid",
      limitations: [
        ...artifact.limitations,
        limitation({
          code: "BUSINESS_DISCOVERY_CONTRACT_VALIDATION_FAILED",
          token: "contract-validation",
          severity: "blocker",
          message: "Business Discovery artifact failed contract validation.",
          diagnostics: validation.errors,
        }),
      ],
      diagnostics: [
        ...artifact.diagnostics,
        "BUSINESS_DISCOVERY_ARTIFACT_INVALID",
      ],
    };
  }

  return {
    ...artifact,
    diagnostics: [
      ...artifact.diagnostics,
      "BUSINESS_DISCOVERY_ARTIFACT_VALID",
    ],
  };
}
