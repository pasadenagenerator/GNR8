import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type {
  BusinessDiscoveryArtifact,
  BusinessDiscoveryConfidence,
  BusinessDiscoveryDomainSummary,
  BusinessDiscoveryEvidenceRef,
  BusinessDiscoveryFinding,
  BusinessDiscoveryLimitation,
} from "./business-discovery-contract";

export type BusinessDiscoveryShadowDifferenceClassification =
  | "equivalent"
  | "semantically_equivalent"
  | "expected_projection_normalization"
  | "improvement"
  | "regression"
  | "missing"
  | "conflicting"
  | "unexpected";

export type BusinessDiscoveryShadowCutoverReadiness =
  | "ready_for_optional_runtime_integration"
  | "ready_with_expected_differences"
  | "blocked";

export type BusinessDiscoveryShadowDifference = {
  path: string;
  classification: BusinessDiscoveryShadowDifferenceClassification;
  message: string;
  currentValue?: unknown;
  shadowValue?: unknown;
  blocker: boolean;
};

export type BusinessDiscoveryShadowComparison = {
  comparisonId: string;
  status: BusinessDiscoveryShadowCutoverReadiness;
  summary: {
    differenceCount: number;
    blockerCount: number;
    currentFindingCount: number;
    shadowFindingCount: number;
    currentLimitationCount: number;
    shadowLimitationCount: number;
    currentConfidence: BusinessDiscoveryConfidence["level"];
    shadowConfidence: BusinessDiscoveryConfidence["level"];
  };
  differences: BusinessDiscoveryShadowDifference[];
  cutoverBlockers: string[];
  deterministic: {
    currentContentIdentity: string;
    shadowContentIdentity: string;
  };
};

const CONFIDENCE_RANK: Record<BusinessDiscoveryConfidence["level"], number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

function semanticArtifact(artifact: BusinessDiscoveryArtifact): Omit<BusinessDiscoveryArtifact, "createdAt"> {
  const { createdAt: _createdAt, ...semantic } = artifact;
  return semantic;
}

function contentIdentity(artifact: BusinessDiscoveryArtifact): string {
  return sha256Hex(stableStringify(semanticArtifact(artifact)));
}

function refsKey(ref: BusinessDiscoveryEvidenceRef): string {
  return `${ref.sourceKind}:${ref.refId}:${ref.routePath ?? ""}`;
}

function refsEqual(left: BusinessDiscoveryEvidenceRef[], right: BusinessDiscoveryEvidenceRef[]): boolean {
  const l = left.map(refsKey).sort();
  const r = right.map(refsKey).sort();
  return l.length === r.length && l.every((value, index) => value === r[index]);
}

function limitationKey(item: BusinessDiscoveryLimitation): string {
  return `${item.code}:${item.message}`;
}

function findingMeaningKey(item: BusinessDiscoveryFinding): string {
  return `${item.domain}:${item.kind}:${item.summary}`;
}

function findingKindKey(item: BusinessDiscoveryFinding): string {
  return `${item.domain}:${item.kind}`;
}

function domainKey(item: BusinessDiscoveryDomainSummary): string {
  return item.domain;
}

function add(
  differences: BusinessDiscoveryShadowDifference[],
  difference: Omit<BusinessDiscoveryShadowDifference, "blocker"> & { blocker?: boolean },
): void {
  const blocker = difference.blocker ?? (
    difference.classification === "regression" ||
    difference.classification === "missing" ||
    difference.classification === "conflicting" ||
    difference.classification === "unexpected"
  );
  differences.push({ ...difference, blocker });
}

function compareScalar(
  differences: BusinessDiscoveryShadowDifference[],
  path: string,
  currentValue: unknown,
  shadowValue: unknown,
  blockerMessage: string,
): void {
  if (currentValue === shadowValue) return;
  add(differences, {
    path,
    classification: "conflicting",
    message: blockerMessage,
    currentValue,
    shadowValue,
  });
}

function compareDomains(
  differences: BusinessDiscoveryShadowDifference[],
  current: BusinessDiscoveryArtifact,
  shadow: BusinessDiscoveryArtifact,
): void {
  const shadowByDomain = new Map(shadow.domainSummaries.map((item) => [domainKey(item), item]));
  for (const currentDomain of current.domainSummaries) {
    const shadowDomain = shadowByDomain.get(domainKey(currentDomain));
    if (!shadowDomain) {
      add(differences, {
        path: `domainSummaries.${currentDomain.domain}`,
        classification: "missing",
        message: "Shadow artifact is missing a current domain summary.",
        currentValue: currentDomain,
      });
      continue;
    }
    if (currentDomain.status !== shadowDomain.status) {
      add(differences, {
        path: `domainSummaries.${currentDomain.domain}.status`,
        classification: shadowDomain.status === "observed" && currentDomain.status === "partial" ? "improvement" : "regression",
        message: "Domain status differs between current and shadow Business Discovery.",
        currentValue: currentDomain.status,
        shadowValue: shadowDomain.status,
        blocker: !(shadowDomain.status === "observed" && currentDomain.status === "partial"),
      });
    }
    if (stableStringify(currentDomain.findingIds.slice().sort()) !== stableStringify(shadowDomain.findingIds.slice().sort())) {
      add(differences, {
        path: `domainSummaries.${currentDomain.domain}.findingIds`,
        classification: "semantically_equivalent",
        message: "Domain finding IDs differ; finding-level comparison determines semantic impact.",
        currentValue: currentDomain.findingIds,
        shadowValue: shadowDomain.findingIds,
        blocker: false,
      });
    }
  }
}

function compareFindings(
  differences: BusinessDiscoveryShadowDifference[],
  current: BusinessDiscoveryArtifact,
  shadow: BusinessDiscoveryArtifact,
): void {
  const shadowById = new Map(shadow.findings.map((item) => [item.findingId, item]));
  const shadowByMeaning = new Map(shadow.findings.map((item) => [findingMeaningKey(item), item]));
  const shadowByKind = new Map(shadow.findings.map((item) => [findingKindKey(item), item]));
  for (const currentFinding of current.findings) {
    const shadowFinding = shadowById.get(currentFinding.findingId) ??
      shadowByMeaning.get(findingMeaningKey(currentFinding)) ??
      shadowByKind.get(findingKindKey(currentFinding));
    if (!shadowFinding) {
      add(differences, {
        path: `findings.${currentFinding.findingId}`,
        classification: "missing",
        message: "Shadow artifact is missing a current finding.",
        currentValue: currentFinding,
      });
      continue;
    }
    if (shadowFinding.findingId !== currentFinding.findingId) {
      add(differences, {
        path: `findings.${currentFinding.findingId}.findingId`,
        classification: findingMeaningKey(shadowFinding) === findingMeaningKey(currentFinding) ? "expected_projection_normalization" : "semantically_equivalent",
        message: findingKindKey(shadowFinding) === findingKindKey(currentFinding)
          ? "Finding domain and kind match, but deterministic ID/token changed after projection normalization."
          : "Finding meaning matches, but deterministic ID differs after projection normalization.",
        currentValue: currentFinding.findingId,
        shadowValue: shadowFinding.findingId,
        blocker: false,
      });
    }
    if (!refsEqual(currentFinding.evidenceRefs, shadowFinding.evidenceRefs)) {
      const currentRefs = currentFinding.evidenceRefs.map(refsKey);
      const shadowRefs = shadowFinding.evidenceRefs.map(refsKey);
      const lost = currentRefs.filter((ref) => !shadowRefs.includes(ref));
      add(differences, {
        path: `findings.${currentFinding.findingId}.evidenceRefs`,
        classification: lost.length > 0 ? "regression" : "improvement",
        message: lost.length > 0 ? "Shadow artifact lost at least one current evidence reference." : "Shadow artifact carries stronger evidence lineage without changing finding meaning.",
        currentValue: currentRefs,
        shadowValue: shadowRefs,
        blocker: lost.length > 0,
      });
    }
    if (CONFIDENCE_RANK[shadowFinding.confidence.level] > CONFIDENCE_RANK[currentFinding.confidence.level]) {
      const strongerEvidence = shadowFinding.evidenceRefs.length > currentFinding.evidenceRefs.length;
      add(differences, {
        path: `findings.${currentFinding.findingId}.confidence`,
        classification: strongerEvidence ? "improvement" : "unexpected",
        message: strongerEvidence ? "Shadow confidence increased with stronger evidence lineage." : "Shadow confidence increased without stronger evidence lineage.",
        currentValue: currentFinding.confidence,
        shadowValue: shadowFinding.confidence,
        blocker: !strongerEvidence,
      });
    } else if (CONFIDENCE_RANK[shadowFinding.confidence.level] < CONFIDENCE_RANK[currentFinding.confidence.level]) {
      add(differences, {
        path: `findings.${currentFinding.findingId}.confidence`,
        classification: "regression",
        message: "Shadow finding confidence is lower than current Business Discovery.",
        currentValue: currentFinding.confidence,
        shadowValue: shadowFinding.confidence,
      });
    }
  }
  const currentMeaning = new Set(current.findings.map(findingMeaningKey));
  const currentKinds = new Set(current.findings.map(findingKindKey));
  for (const shadowFinding of shadow.findings) {
    if (!currentMeaning.has(findingMeaningKey(shadowFinding)) && !currentKinds.has(findingKindKey(shadowFinding))) {
      add(differences, {
        path: `findings.${shadowFinding.findingId}`,
        classification: "unexpected",
        message: "Shadow artifact introduced a business finding not present in current Business Discovery.",
        shadowValue: shadowFinding,
      });
    }
  }
}

function compareLimitations(
  differences: BusinessDiscoveryShadowDifference[],
  current: BusinessDiscoveryArtifact,
  shadow: BusinessDiscoveryArtifact,
): void {
  const shadowByKey = new Map(shadow.limitations.map((item) => [limitationKey(item), item]));
  for (const currentLimitation of current.limitations) {
    const shadowLimitation = shadowByKey.get(limitationKey(currentLimitation));
    if (!shadowLimitation) {
      add(differences, {
        path: `limitations.${currentLimitation.limitationId}`,
        classification: "missing",
        message: "Shadow artifact lost a current limitation.",
        currentValue: currentLimitation,
      });
      continue;
    }
    if (currentLimitation.severity !== shadowLimitation.severity) {
      add(differences, {
        path: `limitations.${currentLimitation.limitationId}.severity`,
        classification: currentLimitation.severity === "blocker" ? "regression" : "expected_projection_normalization",
        message: "Limitation severity differs after projection mapping.",
        currentValue: currentLimitation.severity,
        shadowValue: shadowLimitation.severity,
        blocker: currentLimitation.severity === "blocker",
      });
    }
    if (!refsEqual(currentLimitation.evidenceRefs ?? [], shadowLimitation.evidenceRefs ?? [])) {
      const currentRefs = (currentLimitation.evidenceRefs ?? []).map(refsKey);
      const shadowRefs = (shadowLimitation.evidenceRefs ?? []).map(refsKey);
      const lost = currentRefs.filter((ref) => !shadowRefs.includes(ref));
      add(differences, {
        path: `limitations.${currentLimitation.limitationId}.evidenceRefs`,
        classification: lost.length > 0 ? "regression" : "improvement",
        message: lost.length > 0 ? "Shadow limitation lost current evidence lineage." : "Shadow limitation has stronger lineage.",
        currentValue: currentRefs,
        shadowValue: shadowRefs,
        blocker: lost.length > 0,
      });
    }
  }
}

export function compareBusinessDiscoveryShadow(input: {
  current: BusinessDiscoveryArtifact;
  shadow: BusinessDiscoveryArtifact;
}): BusinessDiscoveryShadowComparison {
  const differences: BusinessDiscoveryShadowDifference[] = [];
  compareScalar(differences, "siteVersionId", input.current.siteVersionId, input.shadow.siteVersionId, "Source identity mismatch blocks cutover.");
  compareScalar(differences, "sourceSiteId", input.current.sourceSiteId ?? null, input.shadow.sourceSiteId ?? null, "sourceSiteId mismatch blocks cutover.");
  compareScalar(differences, "dryRunId", input.current.dryRunId, input.shadow.dryRunId, "dryRun lineage mismatch blocks cutover.");
  compareScalar(differences, "status", input.current.status, input.shadow.status, "Business Discovery status differs.");
  compareDomains(differences, input.current, input.shadow);
  compareFindings(differences, input.current, input.shadow);
  compareLimitations(differences, input.current, input.shadow);

  if (CONFIDENCE_RANK[input.shadow.confidence.level] > CONFIDENCE_RANK[input.current.confidence.level]) {
    add(differences, {
      path: "confidence",
      classification: input.shadow.findings.length > input.current.findings.length ? "improvement" : "unexpected",
      message: input.shadow.findings.length > input.current.findings.length ? "Artifact confidence increased with additional findings." : "Artifact confidence increased without stronger evidence.",
      currentValue: input.current.confidence,
      shadowValue: input.shadow.confidence,
      blocker: input.shadow.findings.length <= input.current.findings.length,
    });
  }
  const blockerCount = differences.filter((item) => item.blocker).length;
  const expectedOnly = differences.every((item) =>
    item.classification === "equivalent" ||
    item.classification === "semantically_equivalent" ||
    item.classification === "expected_projection_normalization" ||
    item.classification === "improvement");
  const status: BusinessDiscoveryShadowCutoverReadiness = blockerCount > 0
    ? "blocked"
    : differences.length === 0
      ? "ready_for_optional_runtime_integration"
      : expectedOnly
        ? "ready_with_expected_differences"
        : "blocked";
  const currentContentIdentity = contentIdentity(input.current);
  const shadowContentIdentity = contentIdentity(input.shadow);
  return {
    comparisonId: `business_discovery_shadow_comparison_${sha256Hex(stableStringify({ currentContentIdentity, shadowContentIdentity, differences })).slice(0, 32)}`,
    status,
    summary: {
      differenceCount: differences.length,
      blockerCount,
      currentFindingCount: input.current.findings.length,
      shadowFindingCount: input.shadow.findings.length,
      currentLimitationCount: input.current.limitations.length,
      shadowLimitationCount: input.shadow.limitations.length,
      currentConfidence: input.current.confidence.level,
      shadowConfidence: input.shadow.confidence.level,
    },
    differences: differences.sort((left, right) => left.path.localeCompare(right.path) || left.classification.localeCompare(right.classification)),
    cutoverBlockers: differences.filter((item) => item.blocker).map((item) => `${item.path}: ${item.message}`),
    deterministic: {
      currentContentIdentity,
      shadowContentIdentity,
    },
  };
}
