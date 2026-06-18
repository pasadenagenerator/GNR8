/**
 * Phase 8C-3 pure deterministic Candidate Discovery builder.
 *
 * This module maps validated Limited Dry Run metadata to non-executable route,
 * navigation, and generic section candidates. It performs no persistence,
 * review, reconstruction, generation, AI, capture, worker, or publishing work.
 */

import type { EvidenceCaptureBaselineArtifactRecord } from "./evidence-capture-baseline-artifact";
import type {
  CaptureExpansionConfidenceLevel,
  LayoutGeometryEvidence,
  NavigationEvidence,
  SectionBoundaryEvidence,
} from "./evidence-capture-layout-contract";
import {
  CANDIDATE_TYPES,
  validateCandidateDiscoveryResult,
  type Candidate,
  type CandidateConfidence,
  type CandidateDiscoveryResult,
  type CandidateEvidenceRef,
  type CandidateLimitation,
  type CandidateType,
} from "./candidate-discovery-contract";
import {
  validateFirstLimitedDryRunOutput,
  type FirstLimitedDryRunOutput,
  type LimitedDryRunNavigationModel,
  type LimitedDryRunRouteModel,
  type LimitedDryRunSectionModel,
} from "./first-limited-dry-run-contract";

export type CandidateDiscoveryEvidenceInput = {
  evidenceCaptureBaseline?:
    | EvidenceCaptureBaselineArtifactRecord
    | EvidenceCaptureBaselineArtifactRecord[]
    | null;
  layoutGeometryEvidence?: LayoutGeometryEvidence[] | null;
  sectionBoundaryEvidence?: SectionBoundaryEvidence[] | null;
  navigationEvidence?: NavigationEvidence[] | null;
};

type EvidenceKind = CandidateEvidenceRef["sourceKind"];
type Model = LimitedDryRunRouteModel | LimitedDryRunNavigationModel | LimitedDryRunSectionModel;

const EVIDENCE_KIND_ORDER: EvidenceKind[] = [
  "evidence_capture_baseline",
  "layout_geometry",
  "section_boundary",
  "navigation_evidence",
  "limited_dry_run_output",
  "limited_dry_run_route_model",
  "limited_dry_run_navigation_model",
  "limited_dry_run_section_model",
];

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

function baselines(input: CandidateDiscoveryEvidenceInput): EvidenceCaptureBaselineArtifactRecord[] {
  const value = input.evidenceCaptureBaseline;
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function evidenceKey(ref: CandidateEvidenceRef): string {
  return `${ref.sourceKind}\u0000${ref.refId}\u0000${ref.routePath ?? ""}`;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortEvidenceRefs(refs: CandidateEvidenceRef[]): CandidateEvidenceRef[] {
  const unique = new Map(refs.map((ref) => [evidenceKey(ref), ref]));
  return [...unique.values()].sort((left, right) => {
    const kind = EVIDENCE_KIND_ORDER.indexOf(left.sourceKind) - EVIDENCE_KIND_ORDER.indexOf(right.sourceKind);
    return kind || compareStrings(left.refId, right.refId) ||
      compareStrings(left.routePath ?? "", right.routePath ?? "");
  });
}

function buildEvidenceRegistry(
  output: FirstLimitedDryRunOutput,
  input: CandidateDiscoveryEvidenceInput,
): Map<string, EvidenceKind> {
  const registry = new Map<string, EvidenceKind>();
  const conflicts = new Set<string>();
  const register = (refId: string, sourceKind: EvidenceKind) => {
    if (conflicts.has(refId)) return;
    const existing = registry.get(refId);
    if (!existing || existing === sourceKind) registry.set(refId, sourceKind);
    else {
      registry.delete(refId);
      conflicts.add(refId);
    }
  };

  for (const refId of output.evidenceRefs) {
    if (refId === "evidence:capture-baseline" || refId.startsWith("evidence:route:")) {
      register(refId, "evidence_capture_baseline");
    } else if (refId.startsWith("evidence:layout-geometry:")) {
      register(refId, "layout_geometry");
    } else if (refId.startsWith("evidence:section-boundary:")) {
      register(refId, "section_boundary");
    } else if (refId.startsWith("evidence:navigation:")) {
      register(refId, "navigation_evidence");
    } else if (refId.startsWith("layout-region-")) {
      register(refId, "layout_geometry");
    } else if (refId.startsWith("section-boundary-")) {
      register(refId, "section_boundary");
    }
  }

  const baselineRecords = baselines(input);
  const layouts = [
    ...baselineRecords.flatMap((baseline) => baseline.captureExpansionEvidence.layoutGeometryEvidence),
    ...(input.layoutGeometryEvidence ?? []),
  ];
  const sections = [
    ...baselineRecords.flatMap((baseline) => baseline.captureExpansionEvidence.sectionBoundaryEvidence),
    ...(input.sectionBoundaryEvidence ?? []),
  ];
  const navigation = [
    ...baselineRecords.flatMap((baseline) => baseline.captureExpansionEvidence.navigationEvidence),
    ...(input.navigationEvidence ?? []),
  ];

  for (const baseline of baselineRecords) {
    register("evidence:capture-baseline", "evidence_capture_baseline");
    register(`evidence:route:${baseline.routePath}`, "evidence_capture_baseline");
  }
  for (const evidence of layouts) {
    register(`evidence:layout-geometry:${evidence.routePath}`, "layout_geometry");
    for (const region of evidence.regions) {
      register(`evidence:layout-geometry:${evidence.routePath}:region:${region.regionId}`, "layout_geometry");
    }
  }
  for (const evidence of sections) {
    register(`evidence:section-boundary:${evidence.routePath}:${evidence.sectionId}`, "section_boundary");
  }
  for (const evidence of navigation) {
    register(`evidence:navigation:${evidence.routePath}`, "navigation_evidence");
    for (const refId of evidence.sourceEvidenceRefs) register(refId, "navigation_evidence");
    for (const item of evidence.navigationItems) {
      register(`evidence:navigation:${evidence.routePath}:item:${item.position}`, "navigation_evidence");
    }
  }
  return registry;
}

function resolveEvidenceRefs(
  refIds: string[],
  routePath: string,
  registry: Map<string, EvidenceKind>,
): CandidateEvidenceRef[] | null {
  const refs: CandidateEvidenceRef[] = [];
  for (const refId of refIds) {
    const sourceKind = registry.get(refId);
    if (!sourceKind) return null;
    refs.push({ refId, sourceKind, routePath });
  }
  return sortEvidenceRefs(refs);
}

function outputRef(output: FirstLimitedDryRunOutput): CandidateEvidenceRef {
  return {
    refId: `dry-run-output:${escapeIdentity(output.outputId)}`,
    sourceKind: "limited_dry_run_output",
  };
}

function directModelRef(
  output: FirstLimitedDryRunOutput,
  type: CandidateType,
  model: Model,
): CandidateEvidenceRef {
  const outputId = escapeIdentity(output.outputId);
  if (type === "route") {
    return {
      refId: `dry-run-route:${outputId}:${escapeIdentity(model.routePath, true)}`,
      sourceKind: "limited_dry_run_route_model",
      routePath: model.routePath,
    };
  }
  if (type === "navigation") {
    return {
      refId: `dry-run-navigation:${outputId}:${escapeIdentity((model as LimitedDryRunNavigationModel).navigationId)}`,
      sourceKind: "limited_dry_run_navigation_model",
      routePath: model.routePath,
    };
  }
  return {
    refId: `dry-run-section:${outputId}:${escapeIdentity(model.routePath, true)}:${escapeIdentity((model as LimitedDryRunSectionModel).sectionId)}`,
    sourceKind: "limited_dry_run_section_model",
    routePath: model.routePath,
  };
}

function sourceLimitations(output: FirstLimitedDryRunOutput): CandidateLimitation[] {
  return output.limitations.map((limitation) => ({
    limitationId: limitation.limitationId,
    severity: limitation.severity,
    code: "SOURCE_DRY_RUN_LIMITATION",
    message: limitation.message,
    ...(limitation.sourceRef ? { sourceRef: limitation.sourceRef } : {}),
  }));
}

function evidenceLimitations(input: CandidateDiscoveryEvidenceInput): CandidateLimitation[] {
  return baselines(input).flatMap((baseline) => {
    const route = escapeIdentity(baseline.routePath, true);
    const baselineRef = `evidence:route:${baseline.routePath}`;
    const plain = baseline.limitations.map((message, index): CandidateLimitation => ({
      limitationId: `candidate-discovery:evidence:${route}:baseline:${index}`,
      severity: "warning",
      code: "EVIDENCE_CAPTURE_LIMITATION",
      message,
      sourceRef: baselineRef,
    }));
    const fidelity = baseline.fidelityLimitations.flatMap((limitation, index) => {
      const refs = limitation.evidenceRefIds.length > 0 ? limitation.evidenceRefIds : [baselineRef];
      return refs.map((sourceRef, refIndex): CandidateLimitation => ({
        limitationId: `candidate-discovery:evidence:${route}:fidelity:${index}:ref:${limitation.evidenceRefIds.length > 0 ? refIndex : "none"}`,
        severity: limitation.severity === "info" ? "note" : limitation.severity,
        code: `EVIDENCE_FIDELITY:${limitation.type}:${limitation.affectedLayer}:${limitation.recommendedNextLayer}`,
        message: limitation.explanation,
        sourceRef,
      }));
    });
    return [...plain, ...fidelity];
  });
}

function applicableLimitations(
  ledger: CandidateLimitation[],
  model: Model,
  modelRef: CandidateEvidenceRef,
  evidenceRefs: CandidateEvidenceRef[],
): CandidateLimitation[] {
  const scope = new Set([
    model.routePath,
    `evidence:route:${model.routePath}`,
    modelRef.refId,
    ...model.limitationRefs,
    ...evidenceRefs.map((ref) => ref.refId),
  ]);
  return ledger.filter((limitation) => limitation.sourceRef && scope.has(limitation.sourceRef) ||
    model.limitationRefs.includes(limitation.limitationId));
}

function confidence(
  source: CaptureExpansionConfidenceLevel,
  limitations: CandidateLimitation[],
): CandidateConfidence {
  const capped = source === "HIGH" && limitations.some((item) => item.severity === "warning");
  const level = capped ? "MEDIUM" : source;
  return {
    level,
    reasons: [
      `source_model_confidence:${source}`,
      "required_evidence_refs_resolved",
      ...(capped ? ["applicable_warning_caps_confidence:MEDIUM"] : []),
      ...(source === "LOW" ? ["source_model_low_evidence_quality"] : []),
    ],
  };
}

function duplicateKeys<T>(values: T[], identity: (value: T) => string): Set<string> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(identity(value), (counts.get(identity(value)) ?? 0) + 1);
  return new Set([...counts].filter(([, count]) => count > 1).map(([key]) => key));
}

function discoveryLimitation(
  type: CandidateType | "input",
  identity: string,
  code: string,
  message: string,
): CandidateLimitation {
  return {
    limitationId: `candidate-discovery:${type}:${identity}:${code}`,
    severity: "blocker",
    code,
    message,
  };
}

function candidateId(type: CandidateType, model: Model): string {
  if (type === "route") return `candidate:route:${escapeIdentity(model.routePath, true)}`;
  if (type === "navigation") {
    return `candidate:navigation:${escapeIdentity((model as LimitedDryRunNavigationModel).navigationId)}`;
  }
  return `candidate:section:${escapeIdentity(model.routePath, true)}:${escapeIdentity((model as LimitedDryRunSectionModel).sectionId)}`;
}

export function buildCandidateDiscoveryResult(
  siteVersionId: string,
  dryRunId: string,
  output: FirstLimitedDryRunOutput,
  evidenceInput: CandidateDiscoveryEvidenceInput = {},
): CandidateDiscoveryResult {
  const discoveryId = `candidate-discovery:${escapeIdentity(output.outputId)}`;
  const ledger = [...sourceLimitations(output), ...evidenceLimitations(evidenceInput)];
  const addedLimitations: CandidateLimitation[] = [];
  const candidates: Candidate[] = [];
  let omittedCount = 0;
  const inputValidation = validateFirstLimitedDryRunOutput(output);
  const lineageValid = output.siteVersionId === siteVersionId && output.dryRunId === dryRunId;
  const inputEligible = inputValidation.valid && output.outputStatus === "valid" && lineageValid;

  if (!inputValidation.valid) {
    addedLimitations.push(discoveryLimitation("input", escapeIdentity(output.outputId), "INVALID_DRY_RUN_OUTPUT", "Candidate Discovery input failed First Limited Dry Run validation."));
  }
  if (output.outputStatus !== "valid") {
    addedLimitations.push(discoveryLimitation("input", escapeIdentity(output.outputId), "INELIGIBLE_DRY_RUN_STATUS", `Candidate Discovery requires outputStatus valid; received ${escapeIdentity(output.outputStatus)}.`));
  }
  if (!lineageValid) {
    addedLimitations.push(discoveryLimitation("input", escapeIdentity(output.outputId), "CONTRADICTORY_LINEAGE", "Candidate Discovery input siteVersionId or dryRunId does not match the requested lineage."));
  }

  if (inputEligible) {
    const registry = buildEvidenceRegistry(output, evidenceInput);
    const routeScope = new Set(output.routeScope.routes);
    const duplicateRoutes = duplicateKeys(output.routeModels, (model) => model.routePath);
    const duplicateNavigation = duplicateKeys(output.navigationModels, (model) => model.navigationId);
    const duplicateSections = duplicateKeys(output.sectionModels, (model) => `${model.routePath}\u0000${model.sectionId}`);
    const duplicateBlockers = new Set<string>();

    const addBlocker = (type: CandidateType, identity: string, code: string, message: string) => {
      omittedCount += 1;
      addedLimitations.push(discoveryLimitation(type, identity, code, message));
    };
    const addDuplicateBlocker = (type: CandidateType, identity: string, message: string) => {
      omittedCount += 1;
      const key = `${type}\u0000${identity}`;
      if (duplicateBlockers.has(key)) return;
      duplicateBlockers.add(key);
      addedLimitations.push(discoveryLimitation(type, identity, "DUPLICATE_CANDIDATE_IDENTITY", message));
    };

    const makeCandidate = (
      type: CandidateType,
      model: Model,
      sourceEvidenceRefs: CandidateEvidenceRef[],
      diagnostics: string[],
    ): Candidate | null => {
      const modelRef = directModelRef(output, type, model);
      const limitations = applicableLimitations(ledger, model, modelRef, sourceEvidenceRefs);
      if (limitations.some((item) => item.severity === "blocker")) {
        omittedCount += 1;
        return null;
      }
      return {
        candidateId: candidateId(type, model),
        candidateType: type,
        candidateStatus: "discovered",
        confidence: confidence(model.confidenceLevel, limitations),
        sourceEvidenceRefs,
        sourceDryRunRefs: [outputRef(output), modelRef],
        limitations,
        diagnostics,
        routePath: model.routePath,
      };
    };

    for (const routePath of output.routeScope.routes) {
      for (const model of output.routeModels.filter((item) => item.routePath === routePath)) {
        const identity = escapeIdentity(model.routePath, true);
        if (duplicateRoutes.has(model.routePath)) {
          addDuplicateBlocker("route", identity, `Duplicate route candidate identity: ${identity}.`);
          continue;
        }
        const childNavigationMatches = model.navigationRefs.map((ref) =>
          output.navigationModels.filter((item) => item.routePath === routePath && item.navigationId === ref));
        const childSectionMatches = model.sectionRefs.map((ref) =>
          output.sectionModels.filter((item) => item.routePath === routePath && item.sectionId === ref));
        const childNavigation = childNavigationMatches.map((matches) => matches[0]);
        const childSections = childSectionMatches.map((matches) => matches[0]);
        const routeRefs = [`evidence:route:${routePath}`];
        if (output.evidenceRefs.includes("evidence:capture-baseline")) routeRefs.push("evidence:capture-baseline");
        const refIds = [
          ...routeRefs,
          ...childNavigation.flatMap((item) => item?.sourceEvidenceRefs ?? []),
          ...childSections.flatMap((item) => item?.sourceEvidenceRefs ?? []),
        ];
        const refs = childNavigationMatches.some((matches) => matches.length !== 1) ||
          childSectionMatches.some((matches) => matches.length !== 1)
          ? null
          : resolveEvidenceRefs(refIds, routePath, registry);
        if (!model.sourceUrl || !refs || refs.length === 0) {
          addBlocker("route", identity, "UNRESOLVED_REQUIRED_EVIDENCE", `Required route evidence could not be resolved: ${identity}.`);
          continue;
        }
        const candidate = makeCandidate("route", model, refs, ["ROUTE_CANDIDATE_MAPPED"]);
        if (candidate) candidates.push(candidate);
      }

      const routeNavigation = output.navigationModels
        .filter((model) => model.routePath === routePath)
        .sort((left, right) => compareStrings(escapeIdentity(left.navigationId), escapeIdentity(right.navigationId)));
      for (const model of routeNavigation) {
        const identity = escapeIdentity(model.navigationId);
        if (duplicateNavigation.has(model.navigationId)) {
          addDuplicateBlocker("navigation", identity, `Duplicate navigation candidate identity: ${identity}.`);
          continue;
        }
        const refs = resolveEvidenceRefs(model.sourceEvidenceRefs, routePath, registry);
        if (model.items.length === 0 || !refs || refs.length === 0) {
          addBlocker("navigation", identity, "UNRESOLVED_REQUIRED_EVIDENCE", `Required navigation evidence could not be resolved: ${identity}.`);
          continue;
        }
        const candidate = makeCandidate("navigation", model, refs, [`NAVIGATION_CANDIDATE_MAPPED:items=${model.items.length}`]);
        if (candidate) candidates.push(candidate);
      }

      for (const model of output.sectionModels.filter((item) => item.routePath === routePath)) {
        const identityKey = `${model.routePath}\u0000${model.sectionId}`;
        const identity = `${escapeIdentity(model.routePath, true)}:${escapeIdentity(model.sectionId)}`;
        if (duplicateSections.has(identityKey)) {
          addDuplicateBlocker("section", identity, `Duplicate section candidate identity: ${identity}.`);
          continue;
        }
        const refs = resolveEvidenceRefs(model.sourceEvidenceRefs, routePath, registry);
        const box = model.boundingBox;
        if (!model.selector || !Number.isFinite(box.x) || !Number.isFinite(box.y) ||
          !Number.isFinite(box.width) || !Number.isFinite(box.height) || box.width <= 0 || box.height <= 0 ||
          !refs || refs.length === 0) {
          addBlocker("section", identity, "UNRESOLVED_REQUIRED_EVIDENCE", `Required section evidence could not be resolved: ${identity}.`);
          continue;
        }
        const candidate = makeCandidate("section", model, refs, [`SECTION_CANDIDATE_MAPPED:regionType=${model.regionType}`]);
        if (candidate) candidates.push(candidate);
      }
    }

    for (const model of output.routeModels.filter((item) => !routeScope.has(item.routePath))) {
      addBlocker("route", escapeIdentity(model.routePath, true), "OUT_OF_SCOPE_MODEL_ROUTE", `Candidate model route is outside route scope: ${escapeIdentity(model.routePath, true)}.`);
    }
    for (const model of output.navigationModels.filter((item) => !routeScope.has(item.routePath))) {
      addBlocker("navigation", escapeIdentity(model.navigationId), "OUT_OF_SCOPE_MODEL_ROUTE", `Candidate model route is outside route scope: ${escapeIdentity(model.routePath, true)}.`);
    }
    for (const model of output.sectionModels.filter((item) => !routeScope.has(item.routePath))) {
      const identity = `${escapeIdentity(model.routePath, true)}:${escapeIdentity(model.sectionId)}`;
      addBlocker("section", identity, "OUT_OF_SCOPE_MODEL_ROUTE", `Candidate model route is outside route scope: ${escapeIdentity(model.routePath, true)}.`);
    }
  }

  const limitations = [...ledger, ...addedLimitations];
  const counts = Object.fromEntries(CANDIDATE_TYPES.map((type) => [type, candidates.filter((candidate) => candidate.candidateType === type).length])) as Record<CandidateType, number>;
  const result: CandidateDiscoveryResult = {
    discoveryId,
    siteVersionId,
    dryRunId,
    createdAt: output.createdAt,
    candidateCount: candidates.length,
    candidateTypesPresent: CANDIDATE_TYPES.filter((type) => counts[type] > 0),
    candidates,
    limitations,
    diagnostics: [
      inputEligible ? "CANDIDATE_DISCOVERY_INPUT_VALID" : "CANDIDATE_DISCOVERY_INPUT_BLOCKED",
      `CANDIDATE_COUNT:route=${counts.route}`,
      `CANDIDATE_COUNT:navigation=${counts.navigation}`,
      `CANDIDATE_COUNT:section=${counts.section}`,
      `CANDIDATE_COUNT:total=${candidates.length}`,
      `OMITTED_CANDIDATE_COUNT:${omittedCount}`,
    ],
  };

  const validation = validateCandidateDiscoveryResult(result);
  result.diagnostics.push(validation.valid ? "CANDIDATE_DISCOVERY_RESULT_VALID" : "CANDIDATE_DISCOVERY_RESULT_INVALID");
  if (!validation.valid) {
    result.limitations.push(discoveryLimitation("input", escapeIdentity(output.outputId), "INVALID_CANDIDATE_DISCOVERY_RESULT", "Candidate Discovery result failed contract validation."));
  }
  return result;
}
