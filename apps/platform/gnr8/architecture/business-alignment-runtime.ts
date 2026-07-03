/**
 * Phase MVP-1D Business Alignment deterministic runtime.
 *
 * Applies explicit Business Alignment corrections to Digital Business Twin
 * knowledge only. Business Understanding Reports remain projections and are
 * never edited by this runtime.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import {
  BUSINESS_ALIGNMENT_CONTRACT_VERSION,
  validateBusinessAlignment,
  type BusinessAlignmentArtifact,
  type BusinessAlignmentConfidence,
  type BusinessAlignmentCorrection,
  type BusinessAlignmentDecision,
  type BusinessAlignmentStatus,
} from "./business-alignment-contract";
import type { BusinessUnderstandingReportArtifact } from "./business-understanding-report-contract";
import {
  DIGITAL_BUSINESS_TWIN_CONTRACT_VERSION,
  DIGITAL_BUSINESS_TWIN_DOMAINS,
  validateDigitalBusinessTwinArtifact,
  type DigitalBusinessTwinArtifact,
  type DigitalBusinessTwinConfidence,
  type DigitalBusinessTwinDomain,
  type DigitalBusinessTwinDomainSummary,
  type DigitalBusinessTwinEvidenceRef,
  type DigitalBusinessTwinKnowledgeItem,
  type DigitalBusinessTwinMissingKnowledge,
  type DigitalBusinessTwinStatus,
} from "./digital-business-twin-contract";
import { validateBusinessUnderstandingReportArtifact } from "./business-understanding-report-contract";

export const BUSINESS_ALIGNMENT_RUNTIME_VERSION = "MVP-1D" as const;

export type BusinessAlignmentRuntimeInput = {
  sourceDigitalBusinessTwin: DigitalBusinessTwinArtifact;
  sourceBusinessUnderstandingReport: BusinessUnderstandingReportArtifact;
  decisions: BusinessAlignmentDecision[];
  corrections: BusinessAlignmentCorrection[];
  createdAt?: string;
};

export type BusinessAlignmentRuntimeResult = {
  businessAlignmentArtifact: BusinessAlignmentArtifact;
  digitalBusinessTwinRevision: DigitalBusinessTwinArtifact;
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))].sort();
}

function uniqueEvidenceRefs(refs: DigitalBusinessTwinEvidenceRef[]): DigitalBusinessTwinEvidenceRef[] {
  const byKey = new Map<string, DigitalBusinessTwinEvidenceRef>();
  for (const ref of refs) {
    byKey.set(stableStringify(ref), ref);
  }
  return [...byKey.values()].sort((left, right) =>
    left.refId.localeCompare(right.refId) ||
    left.sourceKind.localeCompare(right.sourceKind) ||
    (left.routePath ?? "").localeCompare(right.routePath ?? "") ||
    (left.description ?? "").localeCompare(right.description ?? ""));
}

function confidence(
  level: DigitalBusinessTwinConfidence["level"],
  reasons: string[],
): DigitalBusinessTwinConfidence {
  return {
    level,
    reasons: uniqueSorted(reasons),
  };
}

function mergeConfidence(input: {
  current: DigitalBusinessTwinConfidence;
  correction?: BusinessAlignmentConfidence;
  reason: string;
}): DigitalBusinessTwinConfidence {
  return confidence(input.correction?.level ?? input.current.level, [
    ...input.current.reasons,
    ...(input.correction?.reasons ?? []),
    input.reason,
  ]);
}

function businessAlignmentId(input: {
  dbt: DigitalBusinessTwinArtifact;
  bur: BusinessUnderstandingReportArtifact;
  decisions: BusinessAlignmentDecision[];
  corrections: BusinessAlignmentCorrection[];
}): string {
  return `business-alignment:${sha256Hex(stableStringify({
    sourceDigitalBusinessTwinId: input.dbt.digitalBusinessTwinId,
    sourceBusinessUnderstandingReportId: input.bur.businessUnderstandingReportId,
    decisions: input.decisions,
    corrections: input.corrections,
  })).slice(0, 32)}`;
}

function digitalBusinessTwinRevisionId(input: {
  sourceDigitalBusinessTwinId: string;
  businessAlignmentId: string;
}): string {
  return `${input.sourceDigitalBusinessTwinId}:alignment:${sha256Hex(stableStringify(input)).slice(0, 16)}`;
}

function correctionKnowledgeItemId(correction: BusinessAlignmentCorrection): string {
  return `dbt-knowledge:alignment:${correction.domain}:${sha256Hex(stableStringify({
    correctionId: correction.correctionId,
    statement: correction.statement,
  })).slice(0, 24)}`;
}

function missingKnowledgeId(input: {
  correction: BusinessAlignmentCorrection;
  reason: string;
}): string {
  return `dbt-missing:alignment:${input.correction.domain}:${sha256Hex(stableStringify({
    correctionId: input.correction.correctionId,
    reason: input.reason,
  })).slice(0, 24)}`;
}

function sourceArtifactsCurrent(input: {
  dbt: DigitalBusinessTwinArtifact;
  bur: BusinessUnderstandingReportArtifact;
  dbtValid: boolean;
  burValid: boolean;
}): boolean {
  return input.dbtValid &&
    input.burValid &&
    input.dbt.status !== "invalid" &&
    input.dbt.status !== "stale" &&
    input.bur.status !== "invalid" &&
    input.bur.status !== "stale";
}

function alignmentStatus(input: {
  dbt: DigitalBusinessTwinArtifact;
  bur: BusinessUnderstandingReportArtifact;
  dbtValid: boolean;
  burValid: boolean;
  corrections: BusinessAlignmentCorrection[];
}): BusinessAlignmentStatus {
  if (!input.dbtValid || !input.burValid || input.dbt.status === "invalid" || input.bur.status === "invalid") {
    return "invalid";
  }
  if (input.dbt.status === "stale" || input.bur.status === "stale") return "stale";
  if (input.dbt.status === "blocked" || input.bur.status === "blocked") return "blocked";
  if (input.corrections.some((correction) => correction.type === "unresolved")) return "reviewed";
  return "applied";
}

function revisionStatus(input: {
  sourceStatus: DigitalBusinessTwinStatus;
  sourceCurrent: boolean;
  corrections: BusinessAlignmentCorrection[];
  knowledgeItems: DigitalBusinessTwinKnowledgeItem[];
  missingKnowledge: DigitalBusinessTwinMissingKnowledge[];
}): DigitalBusinessTwinStatus {
  if (!input.sourceCurrent) {
    if (input.sourceStatus === "stale") return "stale";
    if (input.sourceStatus === "blocked") return "blocked";
    return "invalid";
  }
  if (input.corrections.some((correction) => correction.type === "unresolved")) return "partial";
  if (input.knowledgeItems.length === 0 || input.missingKnowledge.length > 0) return "partial";
  if (input.corrections.length > 0 && input.corrections.every((correction) => correction.type === "confirm")) {
    return "confirmed";
  }
  return input.corrections.length > 0 ? "aligned" : input.sourceStatus;
}

function domainStatus(input: {
  artifactStatus: DigitalBusinessTwinStatus;
  domain: DigitalBusinessTwinDomain;
  knowledgeItems: DigitalBusinessTwinKnowledgeItem[];
  missingKnowledge: DigitalBusinessTwinMissingKnowledge[];
}): DigitalBusinessTwinDomainSummary["status"] {
  if (input.artifactStatus === "invalid" || input.artifactStatus === "stale") return input.artifactStatus;
  if (input.artifactStatus === "blocked") return "blocked";
  const items = input.knowledgeItems.filter((item) => item.domain === input.domain);
  const missing = input.missingKnowledge.filter((item) => item.domain === input.domain);
  if (items.some((item) => item.status === "blocked")) return "blocked";
  if (items.length === 0 || missing.length > 0 || items.some((item) => item.status === "partial")) return "partial";
  return "observed";
}

function domainSummary(input: {
  artifactStatus: DigitalBusinessTwinStatus;
  domain: DigitalBusinessTwinDomain;
  sourceDomain?: DigitalBusinessTwinDomainSummary;
  knowledgeItems: DigitalBusinessTwinKnowledgeItem[];
  missingKnowledge: DigitalBusinessTwinMissingKnowledge[];
}): DigitalBusinessTwinDomainSummary {
  const items = input.knowledgeItems.filter((item) => item.domain === input.domain);
  const missing = input.missingKnowledge.filter((item) => item.domain === input.domain);
  const status = domainStatus({
    artifactStatus: input.artifactStatus,
    domain: input.domain,
    knowledgeItems: input.knowledgeItems,
    missingKnowledge: input.missingKnowledge,
  });
  return {
    domain: input.domain,
    status,
    summary: items.length > 0
      ? `${items.length} aligned Digital Business Twin knowledge item${items.length === 1 ? "" : "s"} currently inform ${input.domain}.`
      : `No aligned Digital Business Twin knowledge is available for ${input.domain}.`,
    knowledgeItemIds: items.map((item) => item.knowledgeItemId).sort(),
    missingKnowledgeIds: missing.map((item) => item.missingKnowledgeId).sort(),
    confidence: input.sourceDomain
      ? confidence(input.sourceDomain.confidence.level, [
          ...input.sourceDomain.confidence.reasons,
          "business_alignment_domain_revision",
        ])
      : confidence("LOW", ["business_alignment_domain_missing"]),
    diagnostics: [
      `DBT_DOMAIN_STATUS:${status}`,
      `DBT_DOMAIN_KNOWLEDGE_COUNT:${items.length}`,
      `DBT_DOMAIN_MISSING_KNOWLEDGE_COUNT:${missing.length}`,
      "BUSINESS_ALIGNMENT_DOMAIN_RECOMPUTED",
    ],
  };
}

function alignmentArtifactConfidence(input: {
  status: BusinessAlignmentStatus;
  corrections: BusinessAlignmentCorrection[];
  dbt: DigitalBusinessTwinArtifact;
}): BusinessAlignmentConfidence {
  if (input.status === "blocked") return confidence("LOW", ["source_artifact_blocked"]);
  if (input.status === "invalid") return confidence("LOW", ["source_artifact_invalid"]);
  if (input.status === "stale") return confidence("LOW", ["source_artifact_stale"]);
  if (input.corrections.some((correction) => correction.type === "unresolved")) {
    return confidence("LOW", ["business_alignment_unresolved"]);
  }
  const correctionLevels = input.corrections.map((correction) => correction.confidence?.level).filter(Boolean);
  if (correctionLevels.includes("LOW")) return confidence("LOW", ["low_confidence_business_correction"]);
  if (correctionLevels.includes("MEDIUM")) return confidence("MEDIUM", ["business_correction_confidence"]);
  return confidence(input.dbt.confidence.level, [...input.dbt.confidence.reasons, "business_alignment_applied"]);
}

function revisionConfidence(input: {
  status: DigitalBusinessTwinStatus;
  corrections: BusinessAlignmentCorrection[];
  source: DigitalBusinessTwinArtifact;
}): DigitalBusinessTwinConfidence {
  if (input.status === "blocked") return confidence("LOW", ["source_artifact_blocked"]);
  if (input.status === "invalid") return confidence("LOW", ["source_artifact_invalid"]);
  if (input.status === "stale") return confidence("LOW", ["source_artifact_stale"]);
  if (input.status === "partial") {
    return confidence("LOW", [...input.source.confidence.reasons, "business_alignment_partial"]);
  }
  const correctionReasons = input.corrections.flatMap((correction) => correction.confidence?.reasons ?? []);
  return confidence(input.status === "confirmed" ? "HIGH" : "MEDIUM", [
    ...input.source.confidence.reasons,
    ...correctionReasons,
    "business_alignment_dbt_revision",
  ]);
}

function applyCorrection(input: {
  correction: BusinessAlignmentCorrection;
  knowledgeItems: Map<string, DigitalBusinessTwinKnowledgeItem>;
  missingKnowledge: Map<string, DigitalBusinessTwinMissingKnowledge>;
  limitations: string[];
  diagnostics: string[];
}): void {
  const { correction, knowledgeItems, missingKnowledge, limitations, diagnostics } = input;
  if (correction.type === "confirm") {
    const item = knowledgeItems.get(correction.targetKnowledgeItemId ?? "");
    if (!item) {
      limitations.push(`BUSINESS_ALIGNMENT_TARGET_MISSING: ${correction.correctionId}`);
      diagnostics.push(`BUSINESS_ALIGNMENT_CONFIRM_TARGET_MISSING:${correction.correctionId}`);
      return;
    }
    knowledgeItems.set(item.knowledgeItemId, {
      ...item,
      confidence: mergeConfidence({
        current: item.confidence,
        correction: correction.confidence,
        reason: "business_alignment_confirmed",
      }),
      limitations: uniqueSorted([...item.limitations, ...correction.limitations]),
      diagnostics: uniqueSorted([
        ...item.diagnostics,
        ...correction.diagnostics,
        `BUSINESS_ALIGNMENT_CONFIRMED:${correction.correctionId}`,
      ]),
    });
    return;
  }

  if (correction.type === "correct") {
    const item = knowledgeItems.get(correction.targetKnowledgeItemId ?? "");
    if (!item) {
      limitations.push(`BUSINESS_ALIGNMENT_TARGET_MISSING: ${correction.correctionId}`);
      diagnostics.push(`BUSINESS_ALIGNMENT_CORRECT_TARGET_MISSING:${correction.correctionId}`);
      return;
    }
    knowledgeItems.set(item.knowledgeItemId, {
      ...item,
      statement: correction.statement ?? item.statement,
      evidenceRefs: uniqueEvidenceRefs([...item.evidenceRefs, ...correction.evidenceRefs]),
      confidence: mergeConfidence({
        current: item.confidence,
        correction: correction.confidence,
        reason: "business_alignment_corrected",
      }),
      limitations: uniqueSorted([...item.limitations, ...correction.limitations]),
      diagnostics: uniqueSorted([
        ...item.diagnostics,
        ...correction.diagnostics,
        `BUSINESS_ALIGNMENT_CORRECTED:${correction.correctionId}`,
      ]),
    });
    return;
  }

  if (correction.type === "remove") {
    knowledgeItems.delete(correction.targetKnowledgeItemId ?? "");
    const reason = correction.reason ?? "Business Alignment removed prior DBT knowledge.";
    const missing: DigitalBusinessTwinMissingKnowledge = {
      missingKnowledgeId: missingKnowledgeId({ correction, reason }),
      domain: correction.domain,
      reason: `Business Alignment removed prior DBT knowledge: ${reason}`,
      sourceLimitationIds: [],
      diagnostics: uniqueSorted([
        ...correction.diagnostics,
        `BUSINESS_ALIGNMENT_REMOVED_KNOWLEDGE:${correction.correctionId}`,
      ]),
    };
    missingKnowledge.set(missing.missingKnowledgeId, missing);
    limitations.push(...correction.limitations);
    return;
  }

  if (correction.type === "add_missing") {
    const item: DigitalBusinessTwinKnowledgeItem = {
      knowledgeItemId: correctionKnowledgeItemId(correction),
      domain: correction.domain,
      status: "observed",
      kind: "business_alignment_correction",
      statement: correction.statement ?? "",
      sourceFindingIds: [`business-alignment:${correction.correctionId}`],
      evidenceRefs: uniqueEvidenceRefs(correction.evidenceRefs),
      confidence: correction.confidence ?? confidence("MEDIUM", ["business_alignment_added_missing_knowledge"]),
      limitations: uniqueSorted(correction.limitations),
      diagnostics: uniqueSorted([
        ...correction.diagnostics,
        `BUSINESS_ALIGNMENT_ADDED_MISSING_KNOWLEDGE:${correction.correctionId}`,
      ]),
    };
    knowledgeItems.set(item.knowledgeItemId, item);
    if (correction.targetMissingKnowledgeId) {
      missingKnowledge.delete(correction.targetMissingKnowledgeId);
    }
    return;
  }

  const reason = correction.reason ?? "Business Alignment could not resolve this business knowledge.";
  const missing: DigitalBusinessTwinMissingKnowledge = {
    missingKnowledgeId: missingKnowledgeId({ correction, reason }),
    domain: correction.domain,
    reason: `Business Alignment unresolved: ${reason}`,
    sourceLimitationIds: [],
    diagnostics: uniqueSorted([
      ...correction.diagnostics,
      `BUSINESS_ALIGNMENT_UNRESOLVED:${correction.correctionId}`,
    ]),
  };
  missingKnowledge.set(missing.missingKnowledgeId, missing);
  limitations.push(...correction.limitations, missing.reason);
}

export function applyBusinessAlignment(input: BusinessAlignmentRuntimeInput): BusinessAlignmentRuntimeResult {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const dbt = input.sourceDigitalBusinessTwin;
  const bur = input.sourceBusinessUnderstandingReport;
  const dbtValidation = validateDigitalBusinessTwinArtifact(dbt);
  const burValidation = validateBusinessUnderstandingReportArtifact(bur);
  const sourceCurrent = sourceArtifactsCurrent({
    dbt,
    bur,
    dbtValid: dbtValidation.valid,
    burValid: burValidation.valid,
  });

  const businessAlignmentIdValue = businessAlignmentId({
    dbt,
    bur,
    decisions: input.decisions,
    corrections: input.corrections,
  });
  const outputDigitalBusinessTwinId = digitalBusinessTwinRevisionId({
    sourceDigitalBusinessTwinId: dbt.digitalBusinessTwinId,
    businessAlignmentId: businessAlignmentIdValue,
  });

  const knowledgeItems = new Map(dbt.knowledgeItems.map((item) =>
    [item.knowledgeItemId, cloneJson(item)] as const));
  const missingKnowledge = new Map(dbt.missingKnowledge.map((item) =>
    [item.missingKnowledgeId, cloneJson(item)] as const));
  const limitations = [...dbt.limitations];
  const runtimeDiagnostics: string[] = [];

  if (sourceCurrent) {
    for (const correction of [...input.corrections].sort((left, right) =>
      left.correctionId.localeCompare(right.correctionId))) {
      applyCorrection({
        correction,
        knowledgeItems,
        missingKnowledge,
        limitations,
        diagnostics: runtimeDiagnostics,
      });
    }
  } else {
    limitations.push(
      ...dbtValidation.errors.map((error) => `SOURCE_DBT_INVALID: ${error}`),
      ...burValidation.errors.map((error) => `SOURCE_BUR_INVALID: ${error}`),
    );
  }

  const nextKnowledgeItems = [...knowledgeItems.values()]
    .sort((left, right) => left.knowledgeItemId.localeCompare(right.knowledgeItemId));
  const nextMissingKnowledge = [...missingKnowledge.values()]
    .sort((left, right) => left.missingKnowledgeId.localeCompare(right.missingKnowledgeId));
  const status = alignmentStatus({
    dbt,
    bur,
    dbtValid: dbtValidation.valid,
    burValid: burValidation.valid,
    corrections: input.corrections,
  });
  const revisionArtifactStatus = revisionStatus({
    sourceStatus: dbt.status,
    sourceCurrent,
    corrections: input.corrections,
    knowledgeItems: nextKnowledgeItems,
    missingKnowledge: nextMissingKnowledge,
  });
  const domains = DIGITAL_BUSINESS_TWIN_DOMAINS.map((domain) =>
    domainSummary({
      artifactStatus: revisionArtifactStatus,
      domain,
      sourceDomain: dbt.domains.find((candidate) => candidate.domain === domain),
      knowledgeItems: nextKnowledgeItems,
      missingKnowledge: nextMissingKnowledge,
    }));

  const alignmentEvidenceRefs = uniqueEvidenceRefs([
    ...dbt.lineage.evidenceRefs,
    ...bur.lineage.evidenceRefs,
    ...input.corrections.flatMap((correction) => correction.evidenceRefs),
  ]);
  const upstreamArtifactRefs = uniqueEvidenceRefs([
    {
      refId: dbt.digitalBusinessTwinId,
      sourceKind: "digital_business_twin",
      description: "Source Digital Business Twin revised by Business Alignment MVP-1D.",
    },
    {
      refId: bur.businessUnderstandingReportId,
      sourceKind: "business_understanding_report",
      description: "Source Business Understanding Report reviewed during Business Alignment MVP-1D.",
    },
    ...dbt.lineage.upstreamArtifactRefs,
    ...bur.lineage.upstreamArtifactRefs,
  ]);

  const digitalBusinessTwinRevision: DigitalBusinessTwinArtifact = {
    ...cloneJson(dbt),
    digitalBusinessTwinId: outputDigitalBusinessTwinId,
    status: revisionArtifactStatus,
    createdAt,
    contractVersion: DIGITAL_BUSINESS_TWIN_CONTRACT_VERSION,
    lineage: {
      ...cloneJson(dbt.lineage),
      evidenceRefs: alignmentEvidenceRefs,
      upstreamArtifactRefs: uniqueEvidenceRefs([
        {
          refId: businessAlignmentIdValue,
          sourceKind: "business_alignment",
          description: "Business Alignment artifact that authorized this DBT revision.",
        },
        ...upstreamArtifactRefs,
      ]),
    },
    domains,
    knowledgeItems: nextKnowledgeItems,
    confidence: revisionConfidence({
      status: revisionArtifactStatus,
      corrections: input.corrections,
      source: dbt,
    }),
    missingKnowledge: nextMissingKnowledge,
    limitations: uniqueSorted(limitations),
    diagnostics: uniqueSorted([
      ...dbt.diagnostics,
      ...runtimeDiagnostics,
      `BUSINESS_ALIGNMENT_RUNTIME_VERSION:${BUSINESS_ALIGNMENT_RUNTIME_VERSION}`,
      `BUSINESS_ALIGNMENT_ID:${businessAlignmentIdValue}`,
      `BUSINESS_ALIGNMENT_CORRECTION_COUNT:${input.corrections.length}`,
      `BUSINESS_ALIGNMENT_DBT_REVISION_STATUS:${revisionArtifactStatus}`,
    ]),
  };

  const businessAlignmentArtifact: BusinessAlignmentArtifact = {
    businessAlignmentId: businessAlignmentIdValue,
    status,
    siteVersionId: dbt.siteVersionId,
    dryRunId: dbt.dryRunId,
    sourceBusinessUnderstandingReportId: bur.businessUnderstandingReportId,
    sourceDigitalBusinessTwinId: dbt.digitalBusinessTwinId,
    createdAt,
    contractVersion: BUSINESS_ALIGNMENT_CONTRACT_VERSION,
    lineage: {
      siteVersionId: dbt.siteVersionId,
      dryRunId: dbt.dryRunId,
      sourceBusinessUnderstandingReportId: bur.businessUnderstandingReportId,
      sourceBusinessUnderstandingReportStatus: bur.status,
      sourceBusinessUnderstandingReportContractVersion: bur.contractVersion,
      sourceDigitalBusinessTwinId: dbt.digitalBusinessTwinId,
      sourceDigitalBusinessTwinStatus: dbt.status,
      sourceDigitalBusinessTwinContractVersion: dbt.contractVersion,
      outputDigitalBusinessTwinId,
      evidenceRefs: alignmentEvidenceRefs,
      upstreamArtifactRefs,
    },
    decisions: cloneJson(input.decisions),
    corrections: cloneJson(input.corrections),
    confidence: alignmentArtifactConfidence({ status, corrections: input.corrections, dbt }),
    limitations: uniqueSorted([
      ...input.corrections.flatMap((correction) => correction.limitations),
      ...(!sourceCurrent ? limitations : []),
    ]),
    diagnostics: uniqueSorted([
      `BUSINESS_ALIGNMENT_RUNTIME_VERSION:${BUSINESS_ALIGNMENT_RUNTIME_VERSION}`,
      `BUSINESS_ALIGNMENT_STATUS:${status}`,
      `BUSINESS_ALIGNMENT_CORRECTION_COUNT:${input.corrections.length}`,
      `BUSINESS_ALIGNMENT_OUTPUT_DBT_ID:${outputDigitalBusinessTwinId}`,
      "BUSINESS_ALIGNMENT_DOES_NOT_EDIT_REPORTS",
      ...runtimeDiagnostics,
    ]),
  };

  const alignmentValidation = validateBusinessAlignment({
    artifact: businessAlignmentArtifact,
    sourceDigitalBusinessTwin: dbt,
    sourceBusinessUnderstandingReport: bur,
  });
  const revisionValidation = validateDigitalBusinessTwinArtifact(digitalBusinessTwinRevision);

  if (!alignmentValidation.valid || !revisionValidation.valid) {
    return {
      businessAlignmentArtifact: {
        ...businessAlignmentArtifact,
        status: "invalid",
        limitations: uniqueSorted([
          ...businessAlignmentArtifact.limitations,
          ...alignmentValidation.errors.map((error) => `BUSINESS_ALIGNMENT_CONTRACT_VALIDATION_FAILED: ${error}`),
          ...revisionValidation.errors.map((error) => `DBT_REVISION_CONTRACT_VALIDATION_FAILED: ${error}`),
        ]),
        diagnostics: uniqueSorted([
          ...businessAlignmentArtifact.diagnostics,
          "BUSINESS_ALIGNMENT_ARTIFACT_INVALID",
        ]),
      },
      digitalBusinessTwinRevision: {
        ...digitalBusinessTwinRevision,
        status: "invalid",
        limitations: uniqueSorted([
          ...digitalBusinessTwinRevision.limitations,
          ...revisionValidation.errors.map((error) => `DBT_REVISION_CONTRACT_VALIDATION_FAILED: ${error}`),
        ]),
        diagnostics: uniqueSorted([
          ...digitalBusinessTwinRevision.diagnostics,
          "BUSINESS_ALIGNMENT_DBT_REVISION_INVALID",
        ]),
      },
    };
  }

  return {
    businessAlignmentArtifact: {
      ...businessAlignmentArtifact,
      diagnostics: uniqueSorted([
        ...businessAlignmentArtifact.diagnostics,
        "BUSINESS_ALIGNMENT_ARTIFACT_VALID",
      ]),
    },
    digitalBusinessTwinRevision: {
      ...digitalBusinessTwinRevision,
      diagnostics: uniqueSorted([
        ...digitalBusinessTwinRevision.diagnostics,
        "BUSINESS_ALIGNMENT_DBT_REVISION_VALID",
      ]),
    },
  };
}
