import "server-only";

import { createHash } from "node:crypto";

import { AAF_SINGLE_SITE_LAUNCH_READINESS_EVIDENCE_TYPE } from "@gnr8/runtime-contracts";

import {
  AafWriterRepository,
  type AafActorType,
  type AafEvidenceFreshnessResult,
  type AafJsonObject,
  type AafRecord,
  type EvidencePackageTransactionInput,
  type EvidencePackageTransactionResult,
} from "../aaf/aaf-writer-repository";
import { LAUNCH_READINESS_SOURCE_DIMENSIONS, type LaunchReadinessSourceDimension } from "./launch-readiness-source-reader";
import { REQUIRED_LAUNCH_READINESS_DIMENSIONS } from "./launch-readiness-service";
import {
  LaunchReadinessWriterRepository,
  type LaunchReadinessBlockerRow,
  type LaunchReadinessCloseoutRow,
  type LaunchReadinessDimensionRow,
  type LaunchReadinessEvidenceReadModel,
  type LaunchReadinessRecordRow,
  type LaunchReadinessRecordStatus,
  type LaunchReadinessRefRow,
  type LaunchReadinessWriterRepositoryLike,
  type LaunchReadinessWriterTx,
} from "./launch-readiness-writer-repository";

export const LAUNCH_READINESS_EVIDENCE_BUILDER_VERSION = "mvp-40-launch-readiness-evidence-builder:v1" as const;
export const LAUNCH_READINESS_EVIDENCE_PACKAGE_TYPE = AAF_SINGLE_SITE_LAUNCH_READINESS_EVIDENCE_TYPE;
export const LAUNCH_READINESS_EVIDENCE_SUBJECT_TYPE = "single_site_launch_readiness_package" as const;
export const LAUNCH_READINESS_EVIDENCE_ACTION_CONTEXT = "prepare_publish_activation_review" as const;

export const LAUNCH_READINESS_EVIDENCE_BOUNDARY_FLAGS = {
  evidenceOnly: true,
  createsApprovalRequest: false,
  createsApprovalDecision: false,
  createsGateAttempt: false,
  publishes: false,
  publishActivationApproved: false,
  runtimeMutation: false,
  providerCalls: false,
  derivedFromLaunchReadiness: true,
} as const;

export type LaunchReadinessEvidenceActor = {
  actorType: Extract<AafActorType, "human" | "system">;
  actorId: string;
  actorRole: string;
  actorDisplayLabel?: string | null;
};

export type LaunchReadinessEvidenceHandoffRef = {
  refRole?: string | null;
  sourceSystem?: string | null;
  sourceTable?: string | null;
  sourceType: string;
  sourceRecordId: string;
  sourceRef: string;
  sourceVersion?: string | null;
  sourceWatermark?: string | null;
  metadata?: Record<string, unknown>;
};

export type BuildLaunchReadinessEvidencePackageInput = {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  launchReadinessRecordId: string;
  actor: LaunchReadinessEvidenceActor;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  requestId?: string | null;
  policyVersion?: string | null;
  privacyLabel?: "public_operational" | "internal_operational" | "client_confidential" | "credential_sensitive" | "billing_sensitive" | "provider_sensitive" | "legal_sensitive";
  retentionClass?: "short_operational" | "mvp_operational" | "security" | "compliance_long" | "legal_hold";
  expectedReadinessStatus?: "ready" | "ready_with_limitations" | null;
  expectedSemanticSourceWatermark?: string | null;
  requireCloseout?: boolean;
  allowAcceptedLimitationsForRequiredFreshness?: boolean;
  publishActivationHandoffRefs?: readonly LaunchReadinessEvidenceHandoffRef[];
  repository?: LaunchReadinessEvidenceRepository;
  writer?: LaunchReadinessEvidenceWriter;
};

export type LaunchReadinessEvidenceRepository = Pick<
  LaunchReadinessWriterRepositoryLike,
  "withTransaction" | "getReadinessEvidenceById" | "countOpenP0Blockers"
>;

export type LaunchReadinessEvidenceWriter = {
  createEvidencePackageTransaction(input: EvidencePackageTransactionInput): Promise<EvidencePackageTransactionResult>;
};

export type LaunchReadinessFreshnessSummary = {
  key: string;
  required: boolean;
  status: string;
  freshnessStatus: string;
  sourceWatermark: string | null;
  acceptedLimitation: boolean;
  staleReason: string | null;
  missingReason: string | null;
};

export type LaunchReadinessEvidencePayload = {
  packageHeader: {
    packageType: typeof LAUNCH_READINESS_EVIDENCE_PACKAGE_TYPE;
    subjectType: typeof LAUNCH_READINESS_EVIDENCE_SUBJECT_TYPE;
    subjectId: string;
    actionContext: typeof LAUNCH_READINESS_EVIDENCE_ACTION_CONTEXT;
    builderVersion: typeof LAUNCH_READINESS_EVIDENCE_BUILDER_VERSION;
    policyVersion: string;
  };
  identity: {
    tenantId: string;
    clientId: string;
    siteId: string;
    migrationId: string;
    launchReadinessRecordId: string;
  };
  readinessStatus: "ready" | "ready_with_limitations";
  dimensionStatuses: Record<string, { status: string; required: boolean; freshnessStatus: string; sourceWatermark: string | null }>;
  requiredDimensions: readonly string[];
  optionalDimensions: readonly string[];
  freshness: LaunchReadinessFreshnessSummary[];
  missingDimensions: string[];
  staleDimensions: string[];
  blockedDimensions: string[];
  acceptedLimitations: unknown[];
  unresolvedNonP0Blockers: unknown[];
  sourceRefs: Record<string, unknown[]>;
  sourceWatermarks: Record<string, string | null>;
  readinessCloseout: Record<string, unknown> | null;
  publishActivationHandoffRefs: unknown[];
  explicitNonApprovalNonPublishFlags: typeof LAUNCH_READINESS_EVIDENCE_BOUNDARY_FLAGS;
};

export type LaunchReadinessEvidenceBuilderResult = {
  evidencePackageId: string;
  evidencePackage: AafRecord;
  sourceRefs: AafRecord[];
  items: AafRecord[];
  freshnessCheck: AafRecord | null;
  semanticWatermark: string;
  contentHash: string;
  payload: LaunchReadinessEvidencePayload;
  freshnessSummaries: LaunchReadinessFreshnessSummary[];
  idempotency: {
    key: string;
    reused: boolean;
  };
  boundary: typeof LAUNCH_READINESS_EVIDENCE_BOUNDARY_FLAGS;
};

export class LaunchReadinessEvidenceBuilderError extends Error {
  constructor(
    message: string,
    readonly blockerCodes: readonly string[],
  ) {
    super(message);
    this.name = "LaunchReadinessEvidenceBuilderError";
  }
}

const REQUIRED_REF_ROLES_BY_DIMENSION: Partial<Record<LaunchReadinessSourceDimension, readonly string[]>> = {
  launch_approval: ["launch_approval_decision"],
  content_approval: ["content_approval_decision"],
  client_approval: ["client_approval_decision"],
  improved_candidate: ["improved_candidate_site_version", "improved_runtime_artifact"],
  publish_target: ["publish_target"],
  domain_readiness: ["ddom_readiness_snapshot"],
  dns_operator_evidence: ["domain_operator_evidence", "dns_instruction"],
  vercel_custom_domain_ssl: ["vercel_domain_state", "ssl_state"],
  billing_subscription: ["billing_subscription"],
  hosting_entitlement: ["hosting_entitlement"],
  stripe_payment: ["stripe_customer", "stripe_subscription"],
  rollback_readiness: ["rollback_readiness"],
  preview_smoke_qa: ["preview_smoke_qa"],
  audit_timeline: ["audit_event"],
};

function stableJsonValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableJsonValue(entry)]),
    );
  }
  return value ?? null;
}

export function stableLaunchReadinessEvidenceJson(value: unknown): string {
  return JSON.stringify(stableJsonValue(value));
}

export function hashLaunchReadinessEvidenceValue(value: unknown): string {
  return createHash("sha256").update(stableLaunchReadinessEvidenceJson(value)).digest("hex");
}

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function requiredText(field: string, value: unknown): string {
  const normalized = text(value);
  if (!normalized) throw new LaunchReadinessEvidenceBuilderError(`missing required launch readiness evidence field: ${field}`, [`missing_${field}`]);
  return normalized;
}

function jsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return jsonObject(JSON.parse(value));
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date) return {};
  return value as Record<string, unknown>;
}

function uniqueSorted(values: readonly (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.map(text).filter((value): value is string => Boolean(value)))).sort((left, right) => left.localeCompare(right));
}

function rowWatermark(row: LaunchReadinessRefRow | LaunchReadinessDimensionRow | LaunchReadinessRecordRow | LaunchReadinessCloseoutRow): string | null {
  if ("source_watermark" in row) return text(row.source_watermark);
  if ("semantic_source_watermark" in row) return text(row.semantic_source_watermark);
  return null;
}

function refSummary(ref: LaunchReadinessRefRow): Record<string, unknown> {
  return {
    id: ref.id,
    refRole: ref.ref_role,
    sourceSystem: ref.source_system,
    sourceTable: ref.source_table,
    sourceType: ref.source_type,
    sourceRecordId: ref.source_record_id,
    sourceRef: ref.source_ref,
    sourceVersion: ref.source_version,
    sourceWatermark: ref.source_watermark,
    metadata: jsonObject(ref.metadata_json),
  };
}

function closeoutSummary(closeout: LaunchReadinessCloseoutRow | null): Record<string, unknown> | null {
  if (!closeout) return null;
  return {
    id: closeout.id,
    readinessId: closeout.readiness_id,
    finalStatus: closeout.final_status,
    finalEvidenceSummary: jsonObject(closeout.final_evidence_summary_json),
    finalLimitations: jsonArray(closeout.final_limitations_json),
    finalBlockers: jsonArray(closeout.final_blockers_json),
    publishActivationHandoffRefs: jsonArray(closeout.publish_activation_handoff_refs_json),
    metadata: jsonObject(closeout.metadata_json),
  };
}

function blockerSummary(blocker: LaunchReadinessBlockerRow): Record<string, unknown> {
  return {
    id: blocker.id,
    dimensionId: blocker.dimension_id,
    severity: blocker.severity,
    category: blocker.category,
    status: blocker.status,
    description: blocker.description,
    sourceRefs: jsonArray(blocker.source_refs_json),
    resolutionRefs: jsonArray(blocker.resolution_refs_json),
    metadata: jsonObject(blocker.metadata_json),
  };
}

function dimensionSummary(dimension: LaunchReadinessDimensionRow): Record<string, unknown> {
  return {
    id: dimension.id,
    dimension: dimension.dimension,
    status: dimension.dimension_status,
    freshnessStatus: dimension.freshness_status,
    sourceWatermark: dimension.source_watermark,
    sourceCapturedAt: dimension.source_captured_at,
    freshUntil: dimension.fresh_until,
    blockerRefs: jsonArray(dimension.blocker_refs_json),
    limitations: jsonArray(dimension.limitations_json),
    diagnostics: jsonObject(dimension.diagnostics_json),
    requiredForLaunchReadiness: dimension.required_for_launch_readiness,
    requiredForPublishActivation: dimension.required_for_publish_activation,
    semanticSourceWatermark: text(jsonObject(dimension.metadata_json).semanticSourceWatermark),
  };
}

function readinessRef(readiness: LaunchReadinessRecordRow): LaunchReadinessEvidenceHandoffRef {
  return {
    refRole: "launch_readiness_record",
    sourceSystem: "gnr8",
    sourceTable: "gnr8_single_site_launch_readiness_records",
    sourceType: "single_site_launch_readiness_record",
    sourceRecordId: readiness.id,
    sourceRef: `gnr8:single_site_launch_readiness:${readiness.id}`,
    sourceVersion: readiness.updated_at,
    sourceWatermark: readiness.semantic_source_watermark,
    metadata: {
      status: readiness.status,
      freshnessStatus: readiness.freshness_status,
    },
  };
}

function closeoutRef(closeout: LaunchReadinessCloseoutRow): LaunchReadinessEvidenceHandoffRef {
  const watermark = `sha256:${hashLaunchReadinessEvidenceValue(closeoutSummary(closeout))}`;
  return {
    refRole: "launch_readiness_closeout",
    sourceSystem: "gnr8",
    sourceTable: "gnr8_single_site_launch_readiness_closeouts",
    sourceType: "single_site_launch_readiness_closeout",
    sourceRecordId: closeout.id,
    sourceRef: `gnr8:single_site_launch_readiness_closeout:${closeout.id}`,
    sourceVersion: closeout.created_at,
    sourceWatermark: watermark,
    metadata: {
      finalStatus: closeout.final_status,
    },
  };
}

function handoffInputRef(ref: LaunchReadinessEvidenceHandoffRef, index: number): LaunchReadinessEvidenceHandoffRef {
  return {
    ...ref,
    refRole: text(ref.refRole) ?? "publish_activation_handoff",
    sourceSystem: text(ref.sourceSystem) ?? "gnr8",
    sourceTable: text(ref.sourceTable) ?? "external_reference",
    sourceWatermark: text(ref.sourceWatermark) ?? `sha256:${hashLaunchReadinessEvidenceValue({ index, ref })}`,
  };
}

function dimensionByName(readModel: LaunchReadinessEvidenceReadModel): Map<string, LaunchReadinessDimensionRow> {
  return new Map(readModel.dimensions.map((dimension) => [dimension.dimension, dimension]));
}

function refsByRole(readModel: LaunchReadinessEvidenceReadModel): Map<string, LaunchReadinessRefRow[]> {
  const grouped = new Map<string, LaunchReadinessRefRow[]>();
  for (const ref of readModel.refs) {
    grouped.set(ref.ref_role, [...(grouped.get(ref.ref_role) ?? []), ref]);
  }
  return grouped;
}

function requiredDimensions(readModel: LaunchReadinessEvidenceReadModel): string[] {
  const fromRows = readModel.dimensions.filter((dimension) => dimension.required_for_launch_readiness).map((dimension) => dimension.dimension);
  return uniqueSorted([...REQUIRED_LAUNCH_READINESS_DIMENSIONS, ...fromRows]);
}

function isAcceptedFreshnessLimitation(dimension: LaunchReadinessDimensionRow, readModel: LaunchReadinessEvidenceReadModel): boolean {
  if (dimension.dimension_status !== "ready_with_limitations") return false;
  if (jsonArray(dimension.limitations_json).length > 0) return true;
  return readModel.blockers.some(
    (blocker) =>
      blocker.dimension_id === dimension.id &&
      blocker.status === "accepted_limitation" &&
      ["p1_major", "p2_minor", "p3_note"].includes(blocker.severity),
  );
}

function validateReadModel(input: BuildLaunchReadinessEvidencePackageInput, readModel: LaunchReadinessEvidenceReadModel, openP0Count: number): void {
  const blockers: string[] = [];
  const readiness = readModel.readiness;
  const expectedStatus = text(input.expectedReadinessStatus);
  const expectedWatermark = text(input.expectedSemanticSourceWatermark);
  const dimensions = dimensionByName(readModel);
  const groupedRefs = refsByRole(readModel);
  const required = requiredDimensions(readModel);
  const allowAcceptedLimitations = input.allowAcceptedLimitationsForRequiredFreshness !== false;

  if (readiness.tenant_id !== requiredText("tenantId", input.tenantId)) blockers.push("tenant_id_mismatch");
  if (readiness.client_id !== requiredText("clientId", input.clientId)) blockers.push("client_id_mismatch");
  if (readiness.site_id !== requiredText("siteId", input.siteId)) blockers.push("site_id_mismatch");
  if (readiness.migration_id !== requiredText("migrationId", input.migrationId)) blockers.push("migration_id_mismatch");
  if (!["ready", "ready_with_limitations"].includes(readiness.status)) blockers.push(`readiness_status_${readiness.status}`);
  if (readiness.freshness_status !== "fresh") blockers.push(`readiness_freshness_${readiness.freshness_status}`);
  if (expectedStatus && readiness.status !== expectedStatus) blockers.push("expected_readiness_status_mismatch");
  if (expectedWatermark && readiness.semantic_source_watermark !== expectedWatermark) blockers.push("expected_semantic_source_watermark_mismatch");
  if (openP0Count > 0) blockers.push(`open_p0_blockers:${openP0Count}`);
  if (input.requireCloseout === true && !readModel.closeout) blockers.push("required_closeout_missing");

  for (const name of required) {
    const dimension = dimensions.get(name);
    if (!dimension) {
      blockers.push(`required_dimension_missing:${name}`);
      continue;
    }
    if (!["ready", "ready_with_limitations"].includes(dimension.dimension_status)) {
      blockers.push(`required_dimension_not_ready:${name}:${dimension.dimension_status}`);
    }
    const freshnessAccepted =
      allowAcceptedLimitations &&
      isAcceptedFreshnessLimitation(dimension, readModel) &&
      ["stale", "missing", "unknown"].includes(dimension.freshness_status);
    if (!["fresh", "not_applicable"].includes(dimension.freshness_status) && !freshnessAccepted) {
      blockers.push(`required_dimension_freshness_not_fresh:${name}:${dimension.freshness_status}`);
    }
    const requiredRoles = REQUIRED_REF_ROLES_BY_DIMENSION[name as LaunchReadinessSourceDimension] ?? [];
    for (const role of requiredRoles) {
      if (!groupedRefs.get(role)?.some((ref) => ref.source_ref && text(ref.source_watermark))) {
        blockers.push(`required_ref_missing:${role}`);
      }
    }
  }

  if (readModel.blockers.some((blocker) => blocker.severity === "p0_blocker" && blocker.status === "open")) {
    blockers.push("open_p0_blocker_present");
  }

  if (blockers.length > 0) {
    throw new LaunchReadinessEvidenceBuilderError("launch readiness evidence package refused", uniqueSorted(blockers));
  }
}

function freshnessSummaries(readModel: LaunchReadinessEvidenceReadModel, inputHandoffRefs: readonly LaunchReadinessEvidenceHandoffRef[]): LaunchReadinessFreshnessSummary[] {
  const required = new Set(requiredDimensions(readModel));
  const dimensionRows = LAUNCH_READINESS_SOURCE_DIMENSIONS.map((name) => readModel.dimensions.find((dimension) => dimension.dimension === name)).filter(
    (dimension): dimension is LaunchReadinessDimensionRow => Boolean(dimension),
  );
  const summaries: LaunchReadinessFreshnessSummary[] = [
    {
      key: "launch_readiness_record",
      required: true,
      status: readModel.readiness.status,
      freshnessStatus: readModel.readiness.freshness_status,
      sourceWatermark: readModel.readiness.semantic_source_watermark,
      acceptedLimitation: false,
      staleReason: readModel.readiness.freshness_status === "stale" ? "launch_readiness_record_stale" : null,
      missingReason: null,
    },
    ...dimensionRows.map((dimension) => ({
      key: dimension.dimension,
      required: required.has(dimension.dimension),
      status: dimension.dimension_status,
      freshnessStatus: dimension.freshness_status,
      sourceWatermark: dimension.source_watermark,
      acceptedLimitation: isAcceptedFreshnessLimitation(dimension, readModel),
      staleReason: dimension.freshness_status === "stale" ? `${dimension.dimension}_stale` : null,
      missingReason: dimension.freshness_status === "missing" ? `${dimension.dimension}_missing` : null,
    })),
    ...(readModel.closeout
      ? [
          {
            key: "launch_readiness_closeout",
            required: false,
            status: readModel.closeout.final_status,
            freshnessStatus: "fresh",
            sourceWatermark: `sha256:${hashLaunchReadinessEvidenceValue(closeoutSummary(readModel.closeout))}`,
            acceptedLimitation: false,
            staleReason: null,
            missingReason: null,
          },
        ]
      : []),
    ...inputHandoffRefs.map((ref, index) => ({
      key: `publish_activation_handoff_ref:${index + 1}`,
      required: false,
      status: "ref_only",
      freshnessStatus: "fresh",
      sourceWatermark: text(ref.sourceWatermark) ?? `sha256:${hashLaunchReadinessEvidenceValue(ref)}`,
      acceptedLimitation: false,
      staleReason: null,
      missingReason: null,
    })),
  ];
  return summaries.sort((left, right) => left.key.localeCompare(right.key));
}

function sourceRefsByRole(readModel: LaunchReadinessEvidenceReadModel, handoffRefs: readonly LaunchReadinessEvidenceHandoffRef[]): Record<string, unknown[]> {
  const refs = [...readModel.refs.map(refSummary), readinessRef(readModel.readiness), ...(readModel.closeout ? [closeoutRef(readModel.closeout)] : []), ...handoffRefs];
  const grouped: Record<string, unknown[]> = {};
  for (const ref of refs) {
    const role = text((ref as Record<string, unknown>).refRole) ?? "source_ref";
    grouped[role] = [...(grouped[role] ?? []), stableJsonValue(ref)];
  }
  return Object.fromEntries(Object.entries(grouped).sort(([left], [right]) => left.localeCompare(right)));
}

function sourceWatermarks(readModel: LaunchReadinessEvidenceReadModel, handoffRefs: readonly LaunchReadinessEvidenceHandoffRef[]): Record<string, string | null> {
  const entries: Array<[string, string | null]> = [
    ["launch_readiness_record", readModel.readiness.semantic_source_watermark],
    ...readModel.dimensions.map((dimension): [string, string | null] => [dimension.dimension, rowWatermark(dimension)]),
    ...readModel.refs.map((ref): [string, string | null] => [`ref:${ref.ref_role}:${ref.source_record_id}`, rowWatermark(ref)]),
    ...(readModel.closeout ? [["launch_readiness_closeout", `sha256:${hashLaunchReadinessEvidenceValue(closeoutSummary(readModel.closeout))}`] as [string, string]] : []),
    ...handoffRefs.map((ref, index): [string, string | null] => [`publish_activation_handoff_ref:${index + 1}`, text(ref.sourceWatermark)]),
  ];
  return Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right)));
}

function evidencePayload(
  input: BuildLaunchReadinessEvidencePackageInput,
  readModel: LaunchReadinessEvidenceReadModel,
  handoffRefs: readonly LaunchReadinessEvidenceHandoffRef[],
): LaunchReadinessEvidencePayload {
  const required = requiredDimensions(readModel);
  const requiredSet = new Set(required);
  const dimensions = Object.fromEntries(
    LAUNCH_READINESS_SOURCE_DIMENSIONS.map((name) => {
      const dimension = readModel.dimensions.find((row) => row.dimension === name);
      return [
        name,
        {
          status: dimension?.dimension_status ?? "missing",
          required: requiredSet.has(name),
          freshnessStatus: dimension?.freshness_status ?? "missing",
          sourceWatermark: dimension?.source_watermark ?? null,
        },
      ];
    }),
  );
  const freshness = freshnessSummaries(readModel, handoffRefs);
  return {
    packageHeader: {
      packageType: LAUNCH_READINESS_EVIDENCE_PACKAGE_TYPE,
      subjectType: LAUNCH_READINESS_EVIDENCE_SUBJECT_TYPE,
      subjectId: readModel.readiness.id,
      actionContext: LAUNCH_READINESS_EVIDENCE_ACTION_CONTEXT,
      builderVersion: LAUNCH_READINESS_EVIDENCE_BUILDER_VERSION,
      policyVersion: text(input.policyVersion) ?? "mvp-40",
    },
    identity: {
      tenantId: readModel.readiness.tenant_id,
      clientId: readModel.readiness.client_id,
      siteId: readModel.readiness.site_id,
      migrationId: readModel.readiness.migration_id,
      launchReadinessRecordId: readModel.readiness.id,
    },
    readinessStatus: readModel.readiness.status as "ready" | "ready_with_limitations",
    dimensionStatuses: dimensions,
    requiredDimensions: required,
    optionalDimensions: uniqueSorted(LAUNCH_READINESS_SOURCE_DIMENSIONS.filter((name) => !requiredSet.has(name))),
    freshness,
    missingDimensions: freshness.filter((item) => item.required && item.freshnessStatus === "missing").map((item) => item.key),
    staleDimensions: freshness.filter((item) => item.required && item.freshnessStatus === "stale").map((item) => item.key),
    blockedDimensions: readModel.dimensions.filter((dimension) => dimension.required_for_launch_readiness && dimension.dimension_status === "blocked").map((dimension) => dimension.dimension).sort(),
    acceptedLimitations: [
      ...jsonArray(readModel.readiness.limitation_summary_json),
      ...readModel.dimensions.flatMap((dimension) => jsonArray(dimension.limitations_json).map((limitation) => ({ dimension: dimension.dimension, limitation }))),
      ...readModel.blockers.filter((blocker) => blocker.status === "accepted_limitation").map(blockerSummary),
    ],
    unresolvedNonP0Blockers: readModel.blockers
      .filter((blocker) => blocker.status === "open" && blocker.severity !== "p0_blocker")
      .map(blockerSummary),
    sourceRefs: sourceRefsByRole(readModel, handoffRefs),
    sourceWatermarks: sourceWatermarks(readModel, handoffRefs),
    readinessCloseout: closeoutSummary(readModel.closeout),
    publishActivationHandoffRefs: [
      ...jsonArray(readModel.closeout?.publish_activation_handoff_refs_json),
      ...handoffRefs,
    ],
    explicitNonApprovalNonPublishFlags: LAUNCH_READINESS_EVIDENCE_BOUNDARY_FLAGS,
  };
}

export type LaunchReadinessEvidenceSemanticInput = {
  readModel: LaunchReadinessEvidenceReadModel;
  policyVersion?: string | null;
  publishActivationHandoffRefs?: readonly LaunchReadinessEvidenceHandoffRef[];
};

export function computeLaunchReadinessEvidenceSemanticWatermark(input: LaunchReadinessEvidenceSemanticInput): string {
  const payload = evidencePayload(
    {
      tenantId: input.readModel.readiness.tenant_id,
      clientId: input.readModel.readiness.client_id,
      siteId: input.readModel.readiness.site_id,
      migrationId: input.readModel.readiness.migration_id,
      launchReadinessRecordId: input.readModel.readiness.id,
      actor: { actorType: "system", actorId: "semantic-watermark", actorRole: "system" },
      correlationId: "semantic-watermark",
      idempotencyKey: "semantic-watermark",
      policyVersion: input.policyVersion,
    },
    input.readModel,
    (input.publishActivationHandoffRefs ?? []).map(handoffInputRef),
  );
  return `single-site-launch-readiness:${hashLaunchReadinessEvidenceValue(payload)}`;
}

function freshnessResult(summaries: readonly LaunchReadinessFreshnessSummary[]): AafEvidenceFreshnessResult {
  if (summaries.some((summary) => summary.required && ["failed", "unknown", "missing"].includes(summary.freshnessStatus) && !summary.acceptedLimitation)) {
    return "failed";
  }
  if (summaries.some((summary) => summary.required && summary.freshnessStatus === "stale" && !summary.acceptedLimitation)) return "stale";
  if (summaries.some((summary) => summary.required && (summary.acceptedLimitation || summary.freshnessStatus === "stale"))) return "partial_timeline";
  return "fresh";
}

function evidenceSourceRefs(
  readModel: LaunchReadinessEvidenceReadModel,
  handoffRefs: readonly LaunchReadinessEvidenceHandoffRef[],
): EvidencePackageTransactionInput["sourceRefs"] {
  const refs: LaunchReadinessEvidenceHandoffRef[] = [
    readinessRef(readModel.readiness),
    ...(readModel.closeout ? [closeoutRef(readModel.closeout)] : []),
    ...readModel.refs.map((ref) => ({
      refRole: ref.ref_role,
      sourceSystem: ref.source_system,
      sourceTable: text(ref.source_table) ?? "external_reference",
      sourceType: ref.source_type,
      sourceRecordId: ref.source_record_id,
      sourceRef: ref.source_ref,
      sourceVersion: ref.source_version,
      sourceWatermark: ref.source_watermark,
      metadata: {
        ...jsonObject(ref.metadata_json),
        launchReadinessRefId: ref.id,
        dimensionId: ref.dimension_id,
        refRole: ref.ref_role,
      },
    })),
    ...handoffRefs,
  ];
  return refs
    .map((ref, index) => handoffInputRef(ref, index + 1))
    .filter((ref) => Boolean(text(ref.sourceWatermark)))
    .map((ref) => ({
      sourceSystem: text(ref.sourceSystem) ?? "gnr8",
      sourceTable: requiredText("sourceTable", ref.sourceTable),
      sourceRecordId: requiredText("sourceRecordId", ref.sourceRecordId),
      sourceVersion: text(ref.sourceVersion),
      sourceWatermark: requiredText("sourceWatermark", ref.sourceWatermark),
      hash: hashLaunchReadinessEvidenceValue(ref),
      queryRef: `${LAUNCH_READINESS_EVIDENCE_BUILDER_VERSION}:readiness:${readModel.readiness.id}`,
      snapshotRef: text(ref.sourceRef),
      capturedAt: null,
      metadataJson: {
        ...(ref.metadata ?? {}),
        refRole: text(ref.refRole),
        evidenceOnly: true,
        nonEnforcing: text(ref.refRole) === "pasr_shadow_result",
      },
    }));
}

function packageTransactionInput(
  input: BuildLaunchReadinessEvidencePackageInput,
  readModel: LaunchReadinessEvidenceReadModel,
  payload: LaunchReadinessEvidencePayload,
  semanticWatermark: string,
  contentHash: string,
): EvidencePackageTransactionInput {
  const freshness = freshnessResult(payload.freshness);
  const encodedPayloadSize = new TextEncoder().encode(stableLaunchReadinessEvidenceJson(payload)).byteLength;
  const handoffRefs = (input.publishActivationHandoffRefs ?? []).map(handoffInputRef);
  return {
    evidencePackage: {
      tenantId: input.tenantId,
      clientId: input.clientId,
      siteId: input.siteId,
      batchId: null,
      jobId: null,
      siteVersionId: readModel.readiness.improved_candidate_site_version_ref,
      domainId: null,
      costCenterId: null,
      correlationId: input.correlationId,
      causationId: input.causationId ?? null,
      idempotencyKey: input.idempotencyKey,
      requestId: input.requestId ?? null,
      packageType: LAUNCH_READINESS_EVIDENCE_PACKAGE_TYPE,
      subjectType: LAUNCH_READINESS_EVIDENCE_SUBJECT_TYPE,
      subjectId: readModel.readiness.id,
      status: "created",
      createdByActorType: input.actor.actorType,
      createdByActorId: input.actor.actorId,
      sourceWatermark: semanticWatermark,
      freshnessLabel: freshness,
      contentHash,
      limitationsJson: payload as unknown as AafJsonObject,
      privacyLabel: input.privacyLabel ?? "client_confidential",
      retentionClass: input.retentionClass ?? "compliance_long",
    },
    sourceRefs: evidenceSourceRefs(readModel, handoffRefs),
    items: [
      {
        itemType: "single_site_launch_readiness_evidence_payload",
        itemRef: `aaf:single_site_launch_readiness_evidence:${contentHash}`,
        itemHash: contentHash,
        mediaType: "application/json",
        sizeBytes: encodedPayloadSize,
        sourceTable: "gnr8_single_site_launch_readiness_records",
        sourceRecordId: readModel.readiness.id,
        displayName: "Single-site launch readiness evidence payload",
        limitationsJson: {
          inlineInEvidencePackageLimitationsJson: true,
          evidenceOnly: true,
          nonApproval: true,
          nonPublish: true,
        },
        privacyLabel: input.privacyLabel ?? "client_confidential",
        retentionClass: input.retentionClass ?? "compliance_long",
      },
    ],
    freshnessCheck: {
      policyVersion: text(input.policyVersion) ?? "mvp-40",
      result: freshness,
      checkedByActorType: input.actor.actorType,
      checkedByActorId: input.actor.actorId,
      staleReason:
        freshness === "fresh"
          ? null
          : payload.freshness
              .filter((summary) => summary.required && summary.freshnessStatus !== "fresh")
              .map((summary) => `${summary.key}:${summary.freshnessStatus}${summary.acceptedLimitation ? ":accepted_limitation" : ""}`)
              .join(","),
      expiresAt: null,
      currentSourceWatermark: semanticWatermark,
      idempotencyKey: `${input.idempotencyKey}:freshness`,
    },
  };
}

export async function buildLaunchReadinessEvidencePackage(
  input: BuildLaunchReadinessEvidencePackageInput,
): Promise<LaunchReadinessEvidenceBuilderResult> {
  requiredText("tenantId", input.tenantId);
  requiredText("clientId", input.clientId);
  requiredText("siteId", input.siteId);
  requiredText("migrationId", input.migrationId);
  requiredText("launchReadinessRecordId", input.launchReadinessRecordId);
  requiredText("actor.actorType", input.actor?.actorType);
  requiredText("actor.actorId", input.actor?.actorId);
  requiredText("actor.actorRole", input.actor?.actorRole);
  requiredText("correlationId", input.correlationId);
  requiredText("idempotencyKey", input.idempotencyKey);

  const repository = input.repository ?? new LaunchReadinessWriterRepository();
  const readResult = await repository.withTransaction(async (tx: LaunchReadinessWriterTx) => {
    const readModel = await repository.getReadinessEvidenceById(tx, input.launchReadinessRecordId);
    if (!readModel) {
      throw new LaunchReadinessEvidenceBuilderError("launch readiness record not found", ["readiness_record_missing"]);
    }
    const openP0 = await repository.countOpenP0Blockers(tx, input.launchReadinessRecordId);
    return { readModel, openP0 };
  });

  validateReadModel(input, readResult.readModel, readResult.openP0);
  const handoffRefs = (input.publishActivationHandoffRefs ?? []).map(handoffInputRef);
  const payload = evidencePayload(input, readResult.readModel, handoffRefs);
  const semanticWatermark = `single-site-launch-readiness:${hashLaunchReadinessEvidenceValue(payload)}`;
  const contentHash = hashLaunchReadinessEvidenceValue(payload);
  const writer = input.writer ?? new AafWriterRepository();
  const written = await writer.createEvidencePackageTransaction(packageTransactionInput(input, readResult.readModel, payload, semanticWatermark, contentHash));
  return {
    evidencePackageId: String(written.evidencePackage.id),
    evidencePackage: written.evidencePackage,
    sourceRefs: written.sourceRefs,
    items: written.items,
    freshnessCheck: written.freshnessCheck,
    semanticWatermark,
    contentHash,
    payload,
    freshnessSummaries: payload.freshness,
    idempotency: {
      key: input.idempotencyKey,
      reused: String(written.evidencePackage.idempotency_key ?? input.idempotencyKey) === input.idempotencyKey,
    },
    boundary: LAUNCH_READINESS_EVIDENCE_BOUNDARY_FLAGS,
  };
}
