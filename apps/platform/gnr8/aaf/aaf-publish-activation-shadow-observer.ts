import "server-only";

import { randomUUID } from "node:crypto";

import type { AafPrivacyLabel, AafRetentionClass } from "@gnr8/runtime-contracts";

import {
  AafPublishActivationGateAdapter,
  type PublishActivationGateDryRunResult,
} from "./aaf-publish-activation-gate-adapter";
import {
  buildPublishActivationEvidencePackage,
  type BuildPublishActivationEvidencePackageInput,
  type PublishActivationEvidenceBuilderResult,
  type PublishActivationEvidenceReaderInput,
  type PublishActivationEvidenceSourceKey,
  type PublishActivationEvidenceSourceReader,
  type PublishActivationEvidenceFreshnessStatus,
  type PublishActivationSourceReaderResult,
} from "./aaf-publish-activation-evidence-builder";
import { AafPublishActivationSourceReader } from "./aaf-publish-activation-source-reader";
import type { AafActorType } from "./aaf-writer-repository";

export const PUBLISH_ACTIVATION_SHADOW_GATE_ENV = "GNR8_PUBLISH_ACTIVATION_SHADOW_GATE";

export type PublishActivationShadowReadStatus = "not_attempted" | "completed" | "unavailable";
export type PublishActivationShadowBuildStatus = "not_attempted" | "built" | "unavailable";
export type PublishActivationShadowGateStatus = "not_attempted" | "evaluated" | "unavailable";
export type PublishActivationShadowReadinessResult = "ready" | "not_ready" | "unavailable";

export type PublishActivationShadowObserverInput = PublishActivationEvidenceReaderInput & {
  actorType?: AafActorType;
  actorId?: string | null;
  actorRole?: string | null;
  correlationId?: string | null;
  causationId?: string | null;
  idempotencyKey?: string | null;
  requestId?: string | null;
  policyId?: string | null;
  policyVersion?: string | null;
  privacyLabel?: AafPrivacyLabel;
  retentionClass?: AafRetentionClass;
};

export type PublishActivationShadowObserverDependencies = {
  sourceReader?: PublishActivationEvidenceSourceReader;
  buildEvidencePackage?: (input: BuildPublishActivationEvidencePackageInput) => Promise<PublishActivationEvidenceBuilderResult>;
  gateAdapter?: Pick<AafPublishActivationGateAdapter, "evaluatePublishActivationGateDryRun">;
};

export type PublishActivationShadowSourceSummary = {
  sourceTable: string;
  sourceRecordId: string;
  sourceRef: string | null;
  currentWatermark: string | null;
  evidenceWatermark: string | null;
};

export type PublishActivationShadowResult = {
  shadowOnly: true;
  enforcementApplied: false;
  publishActionBlocked: false;
  sourceReadStatus: {
    status: PublishActivationShadowReadStatus;
    limitations: string[];
    warnings: string[];
  };
  evidenceBuildStatus: {
    status: PublishActivationShadowBuildStatus;
    evidencePackageId: string | null;
    missingSourceTruth: string[];
    staleSourceTruth: string[];
  };
  gateDryRunStatus: {
    status: PublishActivationShadowGateStatus;
    gateResult: PublishActivationGateDryRunResult["gateResult"] | null;
    gateAttemptId: string | null;
    auditEventId: string | null;
    blockedReasons: string[];
    staleEvidenceReasons: string[];
  };
  readinessResult: PublishActivationShadowReadinessResult;
  missingSourceTruth: string[];
  staleSourceTruth: string[];
  ddomReadinessSnapshotStatus: {
    status: "present" | "missing" | "stale" | "blocked" | "not_applicable" | "manually_excepted" | "unavailable";
    snapshotRef: string | null;
    blockers: string[];
    warnings: string[];
  };
  approvalStatusSummary: {
    launchSignoff: "not_required" | "present" | "missing" | "failed_or_stale" | "unavailable";
    publishActivation: "present" | "missing" | "wrong_scope" | "failed_or_stale" | "unavailable";
  };
  publishTargetStatusSummary: {
    status: "present" | "missing" | "failed_or_stale" | "unavailable";
    sourceRecordId: string | null;
    policyVersion: string | null;
  };
  domainReadinessImplication: string;
  evidenceRefs: {
    evidencePackageId: string | null;
    gateAttemptId: string | null;
    auditEventId: string | null;
  };
  sourceRefs: Partial<Record<PublishActivationEvidenceSourceKey, PublishActivationShadowSourceSummary | null>>;
  watermarks: Record<string, string | null>;
  limitations: string[];
  correlationId: string;
  idempotencyKey: string;
  shadowEvaluationId: string;
  failureReason: string | null;
};

const SOURCE_KEYS: PublishActivationEvidenceSourceKey[] = [
  "siteVersion",
  "runtimeArtifact",
  "activePointer",
  "publishTarget",
  "domainReadiness",
  "contentOverridePublishedState",
  "launchSignoff",
  "publishActivationApproval",
];

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function uniqSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

export function isPublishActivationShadowGateEnabled(value = process.env[PUBLISH_ACTIVATION_SHADOW_GATE_ENV]): boolean {
  return /^(1|true|enabled|on|shadow)$/i.test(String(value ?? "").trim());
}

function sourceReadUnavailable(sources: PublishActivationSourceReaderResult): boolean {
  return (sources.limitations ?? []).some((item) =>
    item === "read_only_transaction_unavailable" || item === "publish_activation_source_reader_unavailable",
  );
}

function sourceSummary(
  key: PublishActivationEvidenceSourceKey,
  evidence: PublishActivationEvidenceBuilderResult | null,
): PublishActivationShadowSourceSummary | null {
  const ref = evidence?.sourceRefs[key as keyof typeof evidence.sourceRefs] ?? null;
  if (!ref) return null;
  return {
    sourceTable: ref.sourceTable,
    sourceRecordId: ref.sourceRecordId,
    sourceRef: text(ref.sourceRef),
    currentWatermark: text(ref.currentWatermark),
    evidenceWatermark: text(ref.evidenceWatermark),
  };
}

function sourceRefs(evidence: PublishActivationEvidenceBuilderResult | null): PublishActivationShadowResult["sourceRefs"] {
  return Object.fromEntries(SOURCE_KEYS.map((key) => [key, sourceSummary(key, evidence)])) as PublishActivationShadowResult["sourceRefs"];
}

function staleSourceTruthFromFreshness(
  freshness: Partial<Record<PublishActivationEvidenceSourceKey, PublishActivationEvidenceFreshnessStatus>> | null | undefined,
): string[] {
  if (!freshness) return [];
  return SOURCE_KEYS.filter((key) => freshness[key] === "stale" || freshness[key] === "partial_timeline");
}

function summarizeDdom(input: {
  sources: PublishActivationSourceReaderResult | null;
  evidence: PublishActivationEvidenceBuilderResult | null;
  sourceUnavailable: boolean;
}): PublishActivationShadowResult["ddomReadinessSnapshotStatus"] {
  if (input.sourceUnavailable) return { status: "unavailable", snapshotRef: null, blockers: [], warnings: [] };
  const domainReadiness = input.sources?.domainReadiness ?? null;
  if (!domainReadiness || input.evidence?.missingSourceTruth.includes("domainReadiness")) {
    return {
      status: "missing",
      snapshotRef: null,
      blockers: ["missing_ddom_snapshot"],
      warnings: ["run_manual_ddom_readiness_snapshot_trigger"],
    };
  }
  if (domainReadiness.stale === true || domainReadiness.freshness === "stale") {
    return {
      status: "stale",
      snapshotRef: text(domainReadiness.snapshotRef),
      blockers: [...(domainReadiness.blockers ?? [])],
      warnings: [...(domainReadiness.warnings ?? []), "run_manual_ddom_readiness_snapshot_trigger"],
    };
  }
  if (domainReadiness.readinessStatus === "blocked") {
    return {
      status: "blocked",
      snapshotRef: text(domainReadiness.snapshotRef),
      blockers: [...(domainReadiness.blockers ?? [])],
      warnings: [...(domainReadiness.warnings ?? [])],
    };
  }
  if (domainReadiness.readinessStatus === "not_applicable" || domainReadiness.readinessStatus === "manually_excepted") {
    return {
      status: domainReadiness.readinessStatus,
      snapshotRef: text(domainReadiness.snapshotRef),
      blockers: [...(domainReadiness.blockers ?? [])],
      warnings: [...(domainReadiness.warnings ?? [])],
    };
  }
  return {
    status: "present",
    snapshotRef: text(domainReadiness.snapshotRef),
    blockers: [...(domainReadiness.blockers ?? [])],
    warnings: [...(domainReadiness.warnings ?? [])],
  };
}

function summarizeApprovals(input: {
  sources: PublishActivationSourceReaderResult | null;
  gate: PublishActivationGateDryRunResult | null;
  launchSignoffRequired: boolean;
  sourceUnavailable: boolean;
}): PublishActivationShadowResult["approvalStatusSummary"] {
  if (input.sourceUnavailable) return { launchSignoff: "unavailable", publishActivation: "unavailable" };
  const launch = input.sources?.launchSignoff ?? null;
  const publish = input.sources?.publishActivationApproval ?? null;
  const launchStatus =
    !input.launchSignoffRequired && !launch
      ? "not_required"
      : !launch
        ? "missing"
        : launch.freshness === "fresh"
          ? "present"
          : "failed_or_stale";
  let publishStatus: PublishActivationShadowResult["approvalStatusSummary"]["publishActivation"] = "missing";
  if (publish?.scope && publish.scope !== "publish_activation") publishStatus = "wrong_scope";
  else if (publish?.freshness && publish.freshness !== "fresh") publishStatus = "failed_or_stale";
  else if (publish?.approvalDecisionId || input.gate?.approvalDecisionId) publishStatus = "present";
  return { launchSignoff: launchStatus, publishActivation: publishStatus };
}

function summarizePublishTarget(input: {
  sources: PublishActivationSourceReaderResult | null;
  sourceUnavailable: boolean;
}): PublishActivationShadowResult["publishTargetStatusSummary"] {
  if (input.sourceUnavailable) return { status: "unavailable", sourceRecordId: null, policyVersion: null };
  const target = input.sources?.publishTarget ?? null;
  if (!target) return { status: "missing", sourceRecordId: null, policyVersion: null };
  return {
    status: target.freshness && target.freshness !== "fresh" ? "failed_or_stale" : "present",
    sourceRecordId: target.sourceRecordId,
    policyVersion: text(target.canonicalFields.policyVersion ?? target.sourceVersion),
  };
}

function domainImplication(status: PublishActivationShadowResult["ddomReadinessSnapshotStatus"]["status"]): string {
  if (status === "present" || status === "not_applicable" || status === "manually_excepted") {
    return "domain_readiness_shadow_observed_without_publish_authorization";
  }
  if (status === "missing") return "missing_ddom_snapshot_reported_shadow_only_manual_snapshot_recommended";
  if (status === "stale") return "stale_ddom_snapshot_reported_shadow_only_manual_snapshot_recommended";
  if (status === "blocked") return "domain_readiness_blocker_reported_shadow_only";
  return "domain_readiness_unavailable_shadow_only";
}

function baseResult(input: {
  input: PublishActivationShadowObserverInput;
  shadowEvaluationId: string;
  correlationId: string;
  idempotencyKey: string;
  sources: PublishActivationSourceReaderResult | null;
  evidence: PublishActivationEvidenceBuilderResult | null;
  gate: PublishActivationGateDryRunResult | null;
  failureReason: string | null;
  sourceStatus: PublishActivationShadowReadStatus;
  buildStatus: PublishActivationShadowBuildStatus;
  gateStatus: PublishActivationShadowGateStatus;
}): PublishActivationShadowResult {
  const sourceUnavailable = input.sourceStatus === "unavailable" || (input.sources ? sourceReadUnavailable(input.sources) : false);
  const staleSourceTruth = uniqSorted([
    ...staleSourceTruthFromFreshness(input.evidence?.freshnessStatus),
    ...(input.gate?.staleEvidenceReasons ?? []),
  ]);
  const missingSourceTruth = uniqSorted(input.evidence?.missingSourceTruth ?? []);
  const ddom = summarizeDdom({ sources: input.sources, evidence: input.evidence, sourceUnavailable });
  const approval = summarizeApprovals({
    sources: input.sources,
    gate: input.gate,
    launchSignoffRequired: input.input.launchSignoffRequiredByPolicy === true,
    sourceUnavailable,
  });
  const target = summarizePublishTarget({ sources: input.sources, sourceUnavailable });
  const gateResult = input.gate?.gateResult ?? null;
  const readinessResult: PublishActivationShadowReadinessResult =
    sourceUnavailable || input.buildStatus === "unavailable" || input.gateStatus === "unavailable"
      ? "unavailable"
      : gateResult === "allowed"
        ? "ready"
        : "not_ready";
  const limitations = uniqSorted([
    ...(input.sources?.limitations ?? []),
    ...(input.evidence?.limitations ?? []),
    ...(input.gate?.blockedReasons ?? []),
    ...(input.failureReason ? [input.failureReason] : []),
    "shadow_only_publish_result_not_modified",
    "publish_action_not_blocked_by_shadow_gate",
  ]);

  return {
    shadowOnly: true,
    enforcementApplied: false,
    publishActionBlocked: false,
    sourceReadStatus: {
      status: sourceUnavailable ? "unavailable" : input.sourceStatus,
      limitations: [...(input.sources?.limitations ?? [])],
      warnings: [...(input.sources?.warnings ?? [])],
    },
    evidenceBuildStatus: {
      status: input.buildStatus,
      evidencePackageId: input.evidence?.evidencePackageId ?? null,
      missingSourceTruth,
      staleSourceTruth,
    },
    gateDryRunStatus: {
      status: input.gateStatus,
      gateResult,
      gateAttemptId: input.gate?.gateAttemptId ?? null,
      auditEventId: input.gate?.auditEventId ?? null,
      blockedReasons: [...(input.gate?.blockedReasons ?? [])],
      staleEvidenceReasons: [...(input.gate?.staleEvidenceReasons ?? [])],
    },
    readinessResult,
    missingSourceTruth,
    staleSourceTruth,
    ddomReadinessSnapshotStatus: ddom,
    approvalStatusSummary: approval,
    publishTargetStatusSummary: target,
    domainReadinessImplication: domainImplication(ddom.status),
    evidenceRefs: {
      evidencePackageId: input.evidence?.evidencePackageId ?? null,
      gateAttemptId: input.gate?.gateAttemptId ?? null,
      auditEventId: input.gate?.auditEventId ?? null,
    },
    sourceRefs: sourceRefs(input.evidence),
    watermarks: input.evidence?.sourceWatermarks ?? {},
    limitations,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
    shadowEvaluationId: input.shadowEvaluationId,
    failureReason: input.failureReason,
  };
}

export class AafPublishActivationShadowObserver {
  constructor(private readonly deps: PublishActivationShadowObserverDependencies = {}) {}

  async observe(input: PublishActivationShadowObserverInput): Promise<PublishActivationShadowResult> {
    const shadowEvaluationId = randomUUID();
    const correlationId = text(input.correlationId) ?? `pasr-2-shadow:${shadowEvaluationId}`;
    const idempotencyKey = text(input.idempotencyKey) ?? `pasr-2-shadow:${shadowEvaluationId}`;
    const sourceReader = this.deps.sourceReader ?? new AafPublishActivationSourceReader();
    const buildEvidence = this.deps.buildEvidencePackage ?? buildPublishActivationEvidencePackage;

    let sources: PublishActivationSourceReaderResult | null = null;
    try {
      sources = await sourceReader.readPublishActivationSources(input);
    } catch (error) {
      return baseResult({
        input,
        shadowEvaluationId,
        correlationId,
        idempotencyKey,
        sources: {
          warnings: ["publish_activation_shadow_source_reader_failed"],
          limitations: ["publish_activation_source_reader_unavailable"],
        },
        evidence: null,
        gate: null,
        failureReason: `source_reader_error:${errorMessage(error)}`,
        sourceStatus: "unavailable",
        buildStatus: "not_attempted",
        gateStatus: "not_attempted",
      });
    }

    if (sourceReadUnavailable(sources)) {
      return baseResult({
        input,
        shadowEvaluationId,
        correlationId,
        idempotencyKey,
        sources,
        evidence: null,
        gate: null,
        failureReason: "source_reader_unavailable",
        sourceStatus: "unavailable",
        buildStatus: "not_attempted",
        gateStatus: "not_attempted",
      });
    }

    let evidence: PublishActivationEvidenceBuilderResult | null = null;
    const cachedReader: PublishActivationEvidenceSourceReader = {
      async readPublishActivationSources() {
        return sources ?? { limitations: ["publish_activation_source_reader_unavailable"] };
      },
    };
    try {
      evidence = await buildEvidence({
        ...input,
        actorType: input.actorType ?? "system",
        actorId: text(input.actorId) ?? "pasr-2-shadow-observer",
        actorRole: text(input.actorRole) ?? "system",
        correlationId,
        causationId: input.causationId ?? null,
        idempotencyKey,
        requestId: input.requestId ?? null,
        policyId: input.policyId ?? null,
        policyVersion: text(input.policyVersion) ?? "PASR-2-shadow",
        retentionClass: input.retentionClass ?? "compliance_long",
        sourceReader: cachedReader,
      });
    } catch (error) {
      return baseResult({
        input,
        shadowEvaluationId,
        correlationId,
        idempotencyKey,
        sources,
        evidence: null,
        gate: null,
        failureReason: `evidence_builder_error:${errorMessage(error)}`,
        sourceStatus: "completed",
        buildStatus: "unavailable",
        gateStatus: "not_attempted",
      });
    }

    let gate: PublishActivationGateDryRunResult | null = null;
    try {
      const gateAdapter = this.deps.gateAdapter ?? new AafPublishActivationGateAdapter();
      gate = await gateAdapter.evaluatePublishActivationGateDryRun(evidence.dryRunInput);
    } catch (error) {
      return baseResult({
        input,
        shadowEvaluationId,
        correlationId,
        idempotencyKey,
        sources,
        evidence,
        gate: null,
        failureReason: `gate_dry_run_error:${errorMessage(error)}`,
        sourceStatus: "completed",
        buildStatus: "built",
        gateStatus: "unavailable",
      });
    }

    return baseResult({
      input,
      shadowEvaluationId,
      correlationId,
      idempotencyKey,
      sources,
      evidence,
      gate,
      failureReason: null,
      sourceStatus: "completed",
      buildStatus: "built",
      gateStatus: "evaluated",
    });
  }
}

export async function observePublishActivationShadowGate(
  input: PublishActivationShadowObserverInput,
  deps: PublishActivationShadowObserverDependencies = {},
): Promise<PublishActivationShadowResult> {
  return new AafPublishActivationShadowObserver(deps).observe(input);
}
