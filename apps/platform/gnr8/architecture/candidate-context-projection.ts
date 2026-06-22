/**
 * Phase 8D-21 deterministic Candidate Context projection.
 *
 * This module derives read-only screenshot, geometry, and summary metadata from
 * existing artifacts. It performs no lookup, capture, persistence, review,
 * reconstruction, generation, or publishing work.
 */

import type { Candidate, CandidateDiscoveryResult, CandidateLimitation } from "./candidate-discovery-contract";
import type { EvidenceCaptureBaselineArtifactRecord } from "./evidence-capture-baseline-artifact";
import type { EvidenceBoundingBox, LayoutGeometryEvidence } from "./evidence-capture-layout-contract";
import type {
  FirstLimitedDryRunOutput,
  LimitedDryRunNavigationModel,
  LimitedDryRunSectionModel,
} from "./first-limited-dry-run-contract";

export const CANDIDATE_CONTEXT_PROJECTION_STATES = ["ready", "incomplete", "unavailable"] as const;
export type CandidateContextProjectionState = (typeof CANDIDATE_CONTEXT_PROJECTION_STATES)[number];

export const CANDIDATE_CONTEXT_DIAGNOSTIC_CODES = [
  "SCREENSHOT_MISSING",
  "SCREENSHOT_INVALID",
  "GEOMETRY_MISSING",
  "GEOMETRY_INVALID",
  "LINEAGE_INVALID",
  "CANDIDATE_NOT_FOUND",
  "CANDIDATE_TYPE_INCOMPATIBLE",
  "ROUTE_MISMATCH",
  "HIGHLIGHT_MAPPING_AMBIGUOUS",
  "DETERMINISTIC_INPUT_INVALID",
] as const;
export type CandidateContextDiagnosticCode = (typeof CANDIDATE_CONTEXT_DIAGNOSTIC_CODES)[number];

export type CandidateContextScreenshotRef = {
  artifactPath: string;
  screenshotEvidenceRef: string;
  captureType: "desktop_fullpage";
  routePath: string;
  captureRunId: string;
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number | null;
    isMobile: boolean;
  } | null;
};

export type CandidateContextHighlight = {
  kind: "navigation" | "section";
  x: number;
  y: number;
  width: number;
  height: number;
  coordinateSpace: "document";
  sourceViewportWidth: number;
  sourceDocumentHeight: number;
  sourceGeometryEvidenceRefs: string[];
  label: string;
};

export type CandidateContextEvidenceSummary = {
  candidateEvidenceRefs: string[];
  modelEvidenceRefs: string[];
  dryRunRefs: string[];
  route: { sourceUrl: string | null; navigationCount: number; sectionCount: number } | null;
  navigation: { itemCount: number; orderedLabels: string[] } | null;
  section: { structuralLabel: string; regionType: string } | null;
};

export type CandidateContextProjection = {
  state: CandidateContextProjectionState;
  lineage: {
    siteVersionId: string;
    candidateDiscoveryId: string;
    dryRunId: string;
    firstLimitedDryRunOutputId: string | null;
    evidenceCaptureRef: string | null;
    captureRunId: string | null;
    candidateId: string;
    candidateType: Candidate["candidateType"];
    routePath: string | null;
  };
  screenshot: CandidateContextScreenshotRef | null;
  highlight: CandidateContextHighlight | null;
  candidateLabel: string | null;
  confidence: Candidate["confidence"]["level"] | null;
  evidenceSummary: CandidateContextEvidenceSummary;
  limitations: Array<{
    code: string;
    message: string;
    severity: "info" | "warning" | "blocking";
    sourceRef: string | null;
  }>;
  diagnostics: Array<{
    code: CandidateContextDiagnosticCode;
    message: string;
    sourceRef: string | null;
  }>;
};

export type CandidateContextProjectionInput = {
  siteVersionId: string;
  candidate: Candidate;
  candidateDiscoveryResult: CandidateDiscoveryResult;
  evidenceCaptureBaseline:
    | EvidenceCaptureBaselineArtifactRecord
    | EvidenceCaptureBaselineArtifactRecord[]
    | null;
  firstLimitedDryRunOutput?: FirstLimitedDryRunOutput | null;
};

export type CandidateContextValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export const CANDIDATE_CONTEXT_FORBIDDEN_FIELDS = [
  "reactOutput",
  "generatedOutputs",
  "generatedBlocks",
  "generatedContent",
  "designTokens",
  "publishingArtifacts",
  "reconstructionArtifacts",
  "executionArtifacts",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeRoutePath(value: string): string {
  const clean = value.split("#")[0]?.split("?")[0]?.trim().replace(/\\/g, "/") || "/";
  const withSlash = clean.startsWith("/") ? clean : `/${clean}`;
  return (withSlash.replace(/\/{2,}/g, "/").replace(/\/+$/g, "") || "/").toLowerCase();
}

function sameRoute(left: string | null | undefined, right: string | null | undefined): boolean {
  return Boolean(text(left) && text(right) && normalizeRoutePath(text(left)) === normalizeRoutePath(text(right)));
}

function baselines(input: CandidateContextProjectionInput): EvidenceCaptureBaselineArtifactRecord[] {
  const value = input.evidenceCaptureBaseline;
  return value ? (Array.isArray(value) ? value : [value]) : [];
}

function limitation(item: CandidateLimitation): CandidateContextProjection["limitations"][number] {
  return {
    code: item.code,
    message: item.message,
    severity: item.severity === "note" ? "info" : item.severity === "blocker" ? "blocking" : "warning",
    sourceRef: item.sourceRef ?? null,
  };
}

function diagnostic(
  code: CandidateContextDiagnosticCode,
  message: string,
  sourceRef: string | null = null,
): CandidateContextProjection["diagnostics"][number] {
  return { code, message, sourceRef };
}

function candidateIdentityMatches(left: Candidate, right: Candidate): boolean {
  return left.candidateId === right.candidateId &&
    left.candidateType === right.candidateType &&
    sameRoute(left.routePath, right.routePath);
}

function navigationModelFor(
  candidate: Candidate,
  output: FirstLimitedDryRunOutput | null,
): LimitedDryRunNavigationModel | null {
  if (!output) return null;
  const directRefs = new Set(candidate.sourceDryRunRefs.map((ref) => ref.refId));
  const matches = output.navigationModels.filter((model) =>
    sameRoute(model.routePath, candidate.routePath) &&
    [...directRefs].some((ref) => ref === `dry-run-navigation:${encodeURIComponent(output.outputId)}:${encodeURIComponent(model.navigationId)}`),
  );
  if (matches.length === 1) return matches[0];
  const routeMatches = output.navigationModels.filter((model) => sameRoute(model.routePath, candidate.routePath));
  return routeMatches.length === 1 ? routeMatches[0] : null;
}

function sectionModelFor(
  candidate: Candidate,
  output: FirstLimitedDryRunOutput | null,
): LimitedDryRunSectionModel | null {
  if (!output) return null;
  const refs = new Set(candidate.sourceEvidenceRefs.map((ref) => ref.refId));
  const matches = output.sectionModels.filter((model) =>
    sameRoute(model.routePath, candidate.routePath) &&
    (refs.has(`evidence:section-boundary:${model.routePath}:${model.sectionId}`) ||
      candidate.candidateId.endsWith(`:${encodeURIComponent(model.sectionId)}`)),
  );
  return matches.length === 1 ? matches[0] : null;
}

function geometryRef(routePath: string, regionId: string): string {
  return `evidence:layout-geometry:${routePath}:region:${regionId}`;
}

function boxIsValid(box: EvidenceBoundingBox, layout: LayoutGeometryEvidence): boolean {
  return [box.x, box.y, box.width, box.height].every(Number.isFinite) &&
    box.x >= 0 && box.y >= 0 && box.width > 0 && box.height > 0 &&
    Number.isFinite(layout.viewportWidth) && layout.viewportWidth > 0 &&
    Number.isFinite(layout.documentHeight) && layout.documentHeight > 0 &&
    box.x + box.width <= layout.viewportWidth && box.y + box.height <= layout.documentHeight;
}

function sectionLabel(regionType: string): string {
  const labels: Record<string, string> = {
    hero: "Hero section",
    navigation: "Navigation section",
    content: "Content section",
    sidebar: "Sidebar section",
    footer: "Footer section",
    gallery: "Gallery section",
    form: "Form section",
    map: "Map section",
    unknown: "Unknown section",
  };
  return labels[regionType] ?? "Unknown section";
}

function resolveNavigationHighlight(input: {
  candidate: Candidate;
  baseline: EvidenceCaptureBaselineArtifactRecord;
  model: LimitedDryRunNavigationModel | null;
}): { highlight: CandidateContextHighlight | null; code: CandidateContextDiagnosticCode | null } {
  const routePath = input.candidate.routePath ?? "";
  const refs = new Set([
    ...input.candidate.sourceEvidenceRefs.map((ref) => ref.refId),
    ...(input.model?.sourceEvidenceRefs ?? []),
  ]);
  const matches: Array<{ box: EvidenceBoundingBox; layout: LayoutGeometryEvidence; refs: string[] }> = [];

  for (const layout of input.baseline.captureExpansionEvidence.layoutGeometryEvidence.filter((item) => sameRoute(item.routePath, routePath))) {
    for (const region of layout.regions) {
      const ref = geometryRef(layout.routePath, region.regionId);
      const isNavigation = region.role === "navigation" || region.tagName.toLowerCase() === "nav";
      if (isNavigation && (refs.has(ref) || refs.has(region.regionId))) {
        matches.push({ box: region.boundingBox, layout, refs: [ref] });
      }
    }
  }
  for (const section of input.baseline.captureExpansionEvidence.sectionBoundaryEvidence.filter((item) =>
    sameRoute(item.routePath, routePath) && item.regionType === "navigation" &&
    refs.has(`evidence:section-boundary:${item.routePath}:${item.sectionId}`))) {
    const layouts = input.baseline.captureExpansionEvidence.layoutGeometryEvidence.filter((item) => sameRoute(item.routePath, routePath));
    if (layouts.length === 1) {
      matches.push({
        box: section.boundingBox,
        layout: layouts[0],
        refs: [`evidence:section-boundary:${section.routePath}:${section.sectionId}`],
      });
    }
  }
  const unique = new Map(matches.map((match) => [`${match.box.x}:${match.box.y}:${match.box.width}:${match.box.height}`, match]));
  if (unique.size === 0) return { highlight: null, code: "GEOMETRY_MISSING" };
  if (unique.size !== 1) return { highlight: null, code: "HIGHLIGHT_MAPPING_AMBIGUOUS" };
  const match = [...unique.values()][0];
  if (!boxIsValid(match.box, match.layout)) return { highlight: null, code: "GEOMETRY_INVALID" };
  return {
    highlight: {
      kind: "navigation",
      ...match.box,
      coordinateSpace: "document",
      sourceViewportWidth: match.layout.viewportWidth,
      sourceDocumentHeight: match.layout.documentHeight,
      sourceGeometryEvidenceRefs: match.refs,
      label: `Navigation on ${routePath}`,
    },
    code: null,
  };
}

function resolveSectionHighlight(input: {
  candidate: Candidate;
  baseline: EvidenceCaptureBaselineArtifactRecord;
  model: LimitedDryRunSectionModel | null;
}): { highlight: CandidateContextHighlight | null; code: CandidateContextDiagnosticCode | null } {
  const routePath = input.candidate.routePath ?? "";
  const refs = new Set([
    ...input.candidate.sourceEvidenceRefs.map((ref) => ref.refId),
    ...(input.model?.sourceEvidenceRefs ?? []),
  ]);
  const sections = input.baseline.captureExpansionEvidence.sectionBoundaryEvidence.filter((section) =>
    sameRoute(section.routePath, routePath) && refs.has(`evidence:section-boundary:${section.routePath}:${section.sectionId}`),
  );
  if (sections.length === 0) return { highlight: null, code: "GEOMETRY_MISSING" };
  if (sections.length !== 1) return { highlight: null, code: "HIGHLIGHT_MAPPING_AMBIGUOUS" };
  const layouts = input.baseline.captureExpansionEvidence.layoutGeometryEvidence.filter((layout) => sameRoute(layout.routePath, routePath));
  if (layouts.length !== 1) return { highlight: null, code: layouts.length ? "HIGHLIGHT_MAPPING_AMBIGUOUS" : "GEOMETRY_MISSING" };
  const section = sections[0];
  const layout = layouts[0];
  const box = input.model?.boundingBox ?? section.boundingBox;
  if (input.model && (box.x !== section.boundingBox.x || box.y !== section.boundingBox.y ||
    box.width !== section.boundingBox.width || box.height !== section.boundingBox.height)) {
    return { highlight: null, code: "GEOMETRY_INVALID" };
  }
  if (!boxIsValid(box, layout)) return { highlight: null, code: "GEOMETRY_INVALID" };
  const ref = `evidence:section-boundary:${section.routePath}:${section.sectionId}`;
  return {
    highlight: {
      kind: "section",
      ...box,
      coordinateSpace: "document",
      sourceViewportWidth: layout.viewportWidth,
      sourceDocumentHeight: layout.documentHeight,
      sourceGeometryEvidenceRefs: [ref, ...input.model?.sourceEvidenceRefs.filter((item) => item.includes("layout-geometry")) ?? []],
      label: sectionLabel(input.model?.regionType ?? section.regionType),
    },
    code: null,
  };
}

export function buildCandidateContextProjection(input: CandidateContextProjectionInput): CandidateContextProjection {
  const { candidate, candidateDiscoveryResult: discovery } = input;
  const output = input.firstLimitedDryRunOutput ?? null;
  const diagnostics: CandidateContextProjection["diagnostics"] = [];
  const routePath = text(candidate.routePath) || null;
  const exactCandidates = discovery.candidates.filter((item) => item.candidateId === candidate.candidateId);
  const candidateValid = exactCandidates.length === 1 && candidateIdentityMatches(exactCandidates[0], candidate);
  const commonLineageValid = candidateValid && discovery.siteVersionId === input.siteVersionId &&
    (!output || (output.siteVersionId === input.siteVersionId && output.dryRunId === discovery.dryRunId));

  if (exactCandidates.length !== 1) diagnostics.push(diagnostic("CANDIDATE_NOT_FOUND", "Candidate identity must exist exactly once in Candidate Discovery."));
  else if (!candidateValid) diagnostics.push(diagnostic("CANDIDATE_TYPE_INCOMPATIBLE", "Candidate type or route does not match Candidate Discovery."));
  if (candidateValid && !commonLineageValid) diagnostics.push(diagnostic("LINEAGE_INVALID", "Site version or Limited Dry Run lineage is inconsistent."));

  const routeBaselines = baselines(input).filter((baseline) => sameRoute(baseline.routePath, routePath));
  const baseline = routeBaselines.length === 1 ? routeBaselines[0] : null;
  const baselineLineageValid = Boolean(baseline && baseline.siteVersionId === input.siteVersionId &&
    baseline.captureRunId === baseline.evidence.source.captureRunId &&
    sameRoute(baseline.evidence.source.routePath, routePath));
  if (commonLineageValid && (!baseline || !baselineLineageValid)) {
    diagnostics.push(diagnostic(routeBaselines.length > 1 ? "LINEAGE_INVALID" : "ROUTE_MISMATCH", "Evidence Capture lineage does not resolve to one matching route and capture run."));
  }

  let screenshot: CandidateContextScreenshotRef | null = null;
  if (commonLineageValid && baselineLineageValid && baseline) {
    const ref = baseline.evidence.rendered.fullPageScreenshotRef;
    const viewport = baseline.evidence.rendered.viewport;
    if (!ref) diagnostics.push(diagnostic("SCREENSHOT_MISSING", "The exact full-page screenshot is missing."));
    else if (!text(ref.id) || !text(ref.uri) || !String(ref.mediaType ?? "").startsWith("image/")) {
      diagnostics.push(diagnostic("SCREENSHOT_INVALID", "The full-page screenshot reference is invalid.", ref.id || null));
    } else {
      screenshot = {
        artifactPath: ref.uri as string,
        screenshotEvidenceRef: ref.id,
        captureType: "desktop_fullpage",
        routePath: baseline.routePath,
        captureRunId: baseline.captureRunId,
        viewport: Number.isFinite(viewport.width) && viewport.width > 0 && Number.isFinite(viewport.height) && viewport.height > 0
          ? { ...viewport }
          : null,
      };
    }
  }

  const navigationModel = candidate.candidateType === "navigation" ? navigationModelFor(candidate, output) : null;
  const sectionModel = candidate.candidateType === "section" ? sectionModelFor(candidate, output) : null;
  let highlight: CandidateContextHighlight | null = null;
  if (screenshot && baseline && candidate.candidateType === "navigation") {
    const resolved = resolveNavigationHighlight({ candidate, baseline, model: navigationModel });
    highlight = resolved.highlight;
    if (resolved.code) diagnostics.push(diagnostic(resolved.code, "Navigation geometry did not resolve to one valid exact highlight."));
  } else if (screenshot && baseline && candidate.candidateType === "section") {
    const resolved = resolveSectionHighlight({ candidate, baseline, model: sectionModel });
    highlight = resolved.highlight;
    if (resolved.code) diagnostics.push(diagnostic(resolved.code, "Section geometry did not resolve to one valid exact highlight."));
  }

  const unavailable = !commonLineageValid || !baselineLineageValid || !screenshot;
  const incomplete = !unavailable && candidate.candidateType !== "route" && !highlight;
  const state: CandidateContextProjectionState = unavailable ? "unavailable" : incomplete ? "incomplete" : "ready";
  const routeModel = output?.routeModels.find((model) => sameRoute(model.routePath, routePath)) ?? null;
  const regionType = sectionModel?.regionType ?? null;
  const candidateLabel = candidate.candidateType === "route" ? `Route ${routePath}` :
    candidate.candidateType === "navigation" ? `Navigation on ${routePath}` :
      regionType ? sectionLabel(regionType) : `Section on ${routePath}`;

  return {
    state,
    lineage: {
      siteVersionId: input.siteVersionId,
      candidateDiscoveryId: discovery.discoveryId,
      dryRunId: discovery.dryRunId,
      firstLimitedDryRunOutputId: output?.outputId ?? null,
      evidenceCaptureRef: baseline ? `evidence:route:${baseline.routePath}` : null,
      captureRunId: baselineLineageValid ? baseline?.captureRunId ?? null : null,
      candidateId: candidate.candidateId,
      candidateType: candidate.candidateType,
      routePath,
    },
    screenshot,
    highlight,
    candidateLabel: candidateValid ? candidateLabel : null,
    confidence: candidateValid ? candidate.confidence.level : null,
    evidenceSummary: {
      candidateEvidenceRefs: candidate.sourceEvidenceRefs.map((ref) => ref.refId),
      modelEvidenceRefs: candidate.sourceDryRunRefs.map((ref) => ref.refId),
      dryRunRefs: output?.evidenceRefs.slice() ?? [],
      route: candidate.candidateType === "route" ? {
        sourceUrl: routeModel?.sourceUrl ?? baseline?.sourceUrl ?? null,
        navigationCount: routeModel?.navigationRefs.length ?? 0,
        sectionCount: routeModel?.sectionRefs.length ?? 0,
      } : null,
      navigation: candidate.candidateType === "navigation" ? {
        itemCount: navigationModel?.items.length ?? 0,
        orderedLabels: navigationModel?.items.map((item) => item.label).filter(Boolean) ?? [],
      } : null,
      section: candidate.candidateType === "section" ? {
        structuralLabel: sectionLabel(regionType ?? "unknown"),
        regionType: regionType ?? "unknown",
      } : null,
    },
    limitations: candidate.limitations.map(limitation),
    diagnostics,
  };
}

function validateForbiddenFields(value: unknown, path: string, errors: string[], seen: WeakSet<object>): void {
  if (!isObject(value) || seen.has(value)) return;
  seen.add(value);
  for (const [key, item] of Object.entries(value)) {
    const itemPath = path ? `${path}.${key}` : key;
    if (CANDIDATE_CONTEXT_FORBIDDEN_FIELDS.includes(key as never)) errors.push(`${itemPath} is forbidden`);
    validateForbiddenFields(item, itemPath, errors, seen);
  }
}

function validHighlightBounds(highlight: CandidateContextHighlight): boolean {
  return [highlight.x, highlight.y, highlight.width, highlight.height, highlight.sourceViewportWidth, highlight.sourceDocumentHeight].every(Number.isFinite) &&
    highlight.x >= 0 && highlight.y >= 0 && highlight.width > 0 && highlight.height > 0 &&
    highlight.x + highlight.width <= highlight.sourceViewportWidth &&
    highlight.y + highlight.height <= highlight.sourceDocumentHeight;
}

export function validateCandidateContextProjection(value: unknown): CandidateContextValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  validateForbiddenFields(value, "", errors, new WeakSet());
  if (!isObject(value)) return { valid: false, errors: ["projection must be an object", ...errors], warnings };
  if (!CANDIDATE_CONTEXT_PROJECTION_STATES.includes(value.state as never)) errors.push("state must be ready, incomplete, or unavailable");
  if (!isObject(value.lineage)) errors.push("lineage must be an object");
  const lineage = isObject(value.lineage) ? value.lineage : {};
  for (const key of ["siteVersionId", "candidateDiscoveryId", "dryRunId", "candidateId", "candidateType"] as const) {
    if (!text(lineage[key])) errors.push(`lineage.${key} is required`);
  }
  const type = lineage.candidateType;
  if (!(["route", "navigation", "section"] as unknown[]).includes(type)) errors.push("lineage.candidateType is invalid");
  if (!isObject(value.evidenceSummary)) errors.push("evidenceSummary must be an object");
  if (!Array.isArray(value.limitations)) errors.push("limitations must be an array");
  if (!Array.isArray(value.diagnostics)) errors.push("diagnostics must be an array");

  const screenshot = value.screenshot;
  if (screenshot !== null && !isObject(screenshot)) errors.push("screenshot must be an object or null");
  if (isObject(screenshot)) {
    if (!text(screenshot.artifactPath)) errors.push("screenshot.artifactPath is required");
    if (!text(screenshot.screenshotEvidenceRef)) errors.push("screenshot.screenshotEvidenceRef is required");
    if (screenshot.captureType !== "desktop_fullpage") errors.push("screenshot.captureType must be desktop_fullpage");
    if (!sameRoute(String(screenshot.routePath ?? ""), String(lineage.routePath ?? ""))) errors.push("screenshot route must match candidate route");
    if (screenshot.captureRunId !== lineage.captureRunId) errors.push("screenshot capture run must match lineage");
  }

  const highlight = value.highlight;
  if (highlight !== null && !isObject(highlight)) errors.push("highlight must be an object or null");
  if (isObject(highlight)) {
    const typed = highlight as CandidateContextHighlight;
    if (typed.coordinateSpace !== "document") errors.push("highlight.coordinateSpace must be document");
    if (!Array.isArray(typed.sourceGeometryEvidenceRefs) || typed.sourceGeometryEvidenceRefs.length === 0) errors.push("highlight requires geometry evidence refs");
    if (!validHighlightBounds(typed)) errors.push("highlight bounds are invalid");
    if (typed.kind !== type) errors.push("highlight kind must match candidate type");
  }

  if (value.state === "ready") {
    if (!isObject(screenshot)) errors.push("ready projection requires screenshot");
    if (!text(lineage.captureRunId) || !text(lineage.evidenceCaptureRef) || !text(lineage.routePath)) errors.push("ready projection requires complete lineage");
    if (type === "route" && highlight !== null) errors.push("route projection must not have a highlight");
    if ((type === "navigation" || type === "section") && !isObject(highlight)) errors.push(`ready ${type} projection requires highlight`);
    if (type === "route" && !(isObject(value.evidenceSummary) && isObject(value.evidenceSummary.route))) errors.push("route projection requires route summary");
    if (type === "navigation" && !(isObject(value.evidenceSummary) && isObject(value.evidenceSummary.navigation))) errors.push("navigation projection requires navigation summary");
    if (type === "section" && !(isObject(value.evidenceSummary) && isObject(value.evidenceSummary.section))) errors.push("section projection requires section summary");
  }
  if (value.state === "incomplete" && (!isObject(screenshot) || isObject(highlight))) errors.push("incomplete projection requires screenshot and no highlight");
  if (value.state === "unavailable" && isObject(highlight)) errors.push("unavailable projection must not have a highlight");

  return { valid: errors.length === 0, errors, warnings };
}
