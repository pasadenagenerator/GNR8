import { createHash } from "node:crypto";

import type {
  CreateDdomReadinessSnapshotInput,
  DdomReadinessSnapshotRefInput,
  DdomRetentionClass,
  DdomPrivacyLabel,
} from "./ddom-readiness-snapshot-writer";
import type { DdomReadinessStoredState } from "./ddom-readiness-stored-state-repository";

export type DdomPasrImplicationStatus = "ready" | "not_applicable" | "manually_excepted" | "blocked";

export type DdomPasrImplicationSummary = {
  pasrStatus: DdomPasrImplicationStatus;
  warnings: string[];
  blockers: string[];
  staleReason: string | null;
};

export type MapDdomReadinessStoredStateInput = {
  storedState: DdomReadinessStoredState;
  actorType: "human" | "system";
  actorId: string;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey?: string | null;
  reason?: string | null;
  privacyLabel?: DdomPrivacyLabel | null;
  retentionClass?: DdomRetentionClass | null;
};

export type MappedDdomReadinessStoredStateSnapshot = {
  writerInput: CreateDdomReadinessSnapshotInput;
  pasrImplication: DdomPasrImplicationSummary;
  noPublishNoProviderConfirmation: true;
};

export class DdomReadinessStoredStateMapperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DdomReadinessStoredStateMapperError";
  }
}

const DEFAULT_LIMITATIONS = [
  "ddom_snapshot_from_stored_gnr8_state_only",
  "external_dns_truth_not_checked_by_snapshot_caller",
  "vercel_truth_not_checked_by_snapshot_caller",
  "domain_readiness_not_publish_approval",
  "pasr_must_not_create_snapshots",
  "command_center_ops_inbox_derived_only",
] as const;

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeHost(value: unknown): string | null {
  return text(value)?.toLowerCase() ?? null;
}

function stableJsonValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((entry) => stableJsonValue(entry));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableJsonValue(entry)]),
    );
  }
  return value ?? null;
}

function stableJsonString(value: unknown): string {
  return JSON.stringify(stableJsonValue(value));
}

function stableHash(value: unknown): string {
  return `sha256:${createHash("sha256").update(stableJsonString(value)).digest("hex")}`;
}

function uniqSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => text(value)).filter((value): value is string => Boolean(value)))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function required(field: string, value: unknown): string {
  const normalized = text(value);
  if (!normalized) throw new DdomReadinessStoredStateMapperError(`${field} is required`);
  return normalized;
}

function sourceWatermark(value: unknown): string {
  return stableHash(value);
}

function ref(input: DdomReadinessSnapshotRefInput): DdomReadinessSnapshotRefInput {
  return input;
}

function buildRefs(storedState: DdomReadinessStoredState, watermarks: Record<string, string | null>): DdomReadinessSnapshotRefInput[] {
  const refs: DdomReadinessSnapshotRefInput[] = [];
  const domain = storedState.domainBinding;
  const host = storedState.hostBinding;
  const exception = storedState.domainException;
  const manualEvidence = storedState.manualCompletionEvidence;
  const exceptionEvidence = storedState.domainExceptionEvidence;
  const audit = storedState.auditEvent;

  if (domain) {
    refs.push(
      ref({
        refRole: "domain_binding",
        refType: "runtime_domain_host_binding",
        sourceTable: "gnr8_runtime_domain_host_bindings",
        sourceRecordId: domain.id,
        sourceVersion: domain.updated_at,
        sourceWatermark: watermarks.domainBinding,
        capturedAt: domain.updated_at ?? domain.created_at,
        metadataJson: {
          domain: normalizeHost(domain.domain),
          status: domain.status,
          siteId: domain.site_id,
          siteVersionId: domain.site_version_id,
        },
      }),
    );
    if (domain.last_checked_at || domain.vercel_domain_id) {
      refs.push(
        ref({
          refRole: "vercel_snapshot",
          refType: "stored_vercel_domain_fields",
          sourceTable: "gnr8_runtime_domain_host_bindings",
          sourceRecordId: domain.id,
          sourceVersion: domain.last_checked_at ?? domain.updated_at,
          sourceWatermark: watermarks.vercelStoredSnapshot,
          capturedAt: domain.last_checked_at ?? domain.updated_at,
          metadataJson: {
            lastCheckedAt: domain.last_checked_at,
            vercelDomainId: domain.vercel_domain_id,
            limitation: "vercel_truth_not_checked_by_snapshot_caller",
          },
        }),
      );
    }
    if (domain.dns_record_type || domain.dns_instructions_json) {
      refs.push(
        ref({
          refRole: "dns_instruction_snapshot",
          refType: "stored_dns_instruction_fields",
          sourceTable: "gnr8_runtime_domain_host_bindings",
          sourceRecordId: domain.id,
          sourceVersion: domain.updated_at,
          sourceWatermark: watermarks.dnsInstruction,
          capturedAt: domain.updated_at ?? domain.created_at,
          metadataJson: {
            dnsRecordType: domain.dns_record_type,
            dnsRecordPurpose: domain.dns_record_purpose,
            limitation: "dns_instruction_snapshot_not_completion_proof",
          },
        }),
      );
    }
  }

  if (host) {
    refs.push(
      ref({
        refRole: "host_binding",
        refType: "runtime_host_binding",
        sourceTable: "gnr8_runtime_host_bindings",
        sourceRecordId: host.id,
        sourceVersion: host.updated_at,
        sourceWatermark: watermarks.hostBinding,
        capturedAt: host.updated_at ?? host.created_at,
        metadataJson: {
          host: normalizeHost(host.host),
          status: host.status,
          bindingKind: host.binding_kind,
          limitation: "internal_host_is_not_custom_domain_readiness",
        },
      }),
    );
  }

  if (manualEvidence) {
    refs.push(
      ref({
        refRole: "manual_completion_evidence",
        refType: "aaf_evidence_package",
        sourceTable: "gnr8_aaf_evidence_packages",
        sourceRecordId: manualEvidence.id,
        sourceVersion: manualEvidence.source_watermark,
        sourceWatermark: watermarks.manualEvidence,
        capturedAt: manualEvidence.created_at,
        metadataJson: {
          packageType: manualEvidence.package_type,
          status: manualEvidence.status,
          freshnessLabel: manualEvidence.freshness_label,
          limitation: "manual_completion_evidence_not_dns_truth",
        },
      }),
    );
  }

  if (exception) {
    refs.push(
      ref({
        refRole: "domain_exception",
        refType: "aaf_domain_exception_approval",
        sourceTable: exception.approval_decision_id ? "gnr8_aaf_approval_decisions" : "gnr8_aaf_approval_requests",
        sourceRecordId: exception.approval_decision_id ?? exception.approval_request_id,
        sourceVersion: exception.policy_version,
        sourceWatermark: watermarks.domainException,
        capturedAt: exception.decided_at ?? exception.request_created_at,
        metadataJson: {
          approvalRequestId: exception.approval_request_id,
          approvalDecisionId: exception.approval_decision_id,
          decisionStatus: exception.decision_status,
          expiresAt: exception.decision_expires_at ?? exception.requested_expires_at,
          limitation: "domain_exception_not_publish_approval",
        },
      }),
    );
    if (exception.approval_decision_id) {
      refs.push(
        ref({
          refRole: "aaf_approval",
          refType: "aaf_approval_decision",
          sourceTable: "gnr8_aaf_approval_decisions",
          sourceRecordId: exception.approval_decision_id,
          sourceVersion: exception.policy_version,
          sourceWatermark: watermarks.domainException,
          capturedAt: exception.decided_at ?? exception.request_created_at,
          metadataJson: {
            scope: "domain_exception",
            requestId: exception.approval_request_id,
          },
        }),
      );
    }
  }

  if (exceptionEvidence) {
    refs.push(
      ref({
        refRole: "aaf_evidence_package",
        refType: "domain_exception_evidence_package",
        sourceTable: "gnr8_aaf_evidence_packages",
        sourceRecordId: exceptionEvidence.id,
        sourceVersion: exceptionEvidence.source_watermark,
        sourceWatermark: watermarks.domainExceptionEvidence,
        capturedAt: exceptionEvidence.created_at,
        metadataJson: {
          packageType: exceptionEvidence.package_type,
          status: exceptionEvidence.status,
          freshnessLabel: exceptionEvidence.freshness_label,
        },
      }),
    );
  }

  if (audit) {
    refs.push(
      ref({
        refRole: "audit_event",
        refType: "aaf_audit_event",
        sourceTable: "gnr8_aaf_audit_events",
        sourceRecordId: audit.id,
        sourceVersion: audit.created_at,
        sourceWatermark: watermarks.auditEvent,
        capturedAt: audit.created_at,
        metadataJson: {
          eventName: audit.event_name,
          eventFamily: audit.event_family,
          subjectType: audit.subject_type,
          subjectId: audit.subject_id,
        },
      }),
    );
  }

  refs.push(
    ref({
      refRole: "freshness_watermark",
      refType: "ddom_stored_state_freshness_policy",
      sourceSystem: "gnr8",
      sourceTable: null,
      sourceRecordId: `${storedState.input.siteId}:${storedState.input.requestScope}`,
      sourceVersion: "ddom-manual-snapshot-caller:v1",
      sourceWatermark: watermarks.freshnessPolicy,
      capturedAt: null,
      metadataJson: {
        freshnessPolicyId: "ddom_stored_state_manual_snapshot:v1",
        freshnessPolicyVersion: "1",
        computedFreshUntil: storedState.freshUntil,
        computedStaleReason: storedState.staleReason,
      },
    }),
  );

  return refs;
}

export function buildDdomPasrImplicationSummary(storedState: DdomReadinessStoredState): DdomPasrImplicationSummary {
  if (storedState.readinessState === "ready") {
    return { pasrStatus: "ready", warnings: [], blockers: [], staleReason: null };
  }
  if (storedState.readinessState === "ready_with_warnings") {
    return { pasrStatus: "ready", warnings: uniqSorted(storedState.warnings), blockers: [], staleReason: null };
  }
  if (storedState.readinessState === "not_applicable") {
    return { pasrStatus: "not_applicable", warnings: uniqSorted(storedState.warnings), blockers: [], staleReason: null };
  }
  if (storedState.readinessState === "manually_excepted") {
    return { pasrStatus: "manually_excepted", warnings: uniqSorted(storedState.warnings), blockers: [], staleReason: null };
  }
  if (storedState.readinessState === "stale") {
    return {
      pasrStatus: "blocked",
      warnings: uniqSorted(storedState.warnings),
      blockers: uniqSorted([...storedState.blockers, "domain_readiness_stale"]),
      staleReason: storedState.staleReason ?? "domain_readiness_stale",
    };
  }
  return {
    pasrStatus: "blocked",
    warnings: uniqSorted(storedState.warnings),
    blockers: uniqSorted(storedState.blockers.length > 0 ? storedState.blockers : ["domain_readiness_blocked"]),
    staleReason: storedState.staleReason,
  };
}

export function buildDdomStoredStateSourceWatermark(storedState: DdomReadinessStoredState): string {
  return sourceWatermark({
    version: "ddom-manual-stored-state-source-watermark:v1",
    subject: {
      tenantId: storedState.input.tenantId,
      clientId: storedState.input.clientId ?? null,
      agencyId: storedState.input.agencyId ?? storedState.ownershipSite?.agency_id ?? null,
      ownershipSiteId: storedState.input.ownershipSiteId ?? storedState.siteVersion?.ownership_site_id ?? storedState.ownershipSite?.id ?? null,
      siteId: storedState.input.siteId,
      siteVersionId: storedState.input.siteVersionId ?? null,
      domainBindingId: storedState.input.domainBindingId ?? storedState.domainBinding?.id ?? null,
      hostBindingId: storedState.input.hostBindingId ?? storedState.hostBinding?.id ?? null,
      intendedDomain: normalizeHost(storedState.input.intendedDomain ?? storedState.domainBinding?.domain),
      internalHost: normalizeHost(storedState.input.internalHost ?? storedState.hostBinding?.host),
      environment: text(storedState.input.environment) ?? "production",
      stage: text(storedState.input.stage) ?? "production",
      requestScope: storedState.input.requestScope,
    },
    sourceRows: {
      site: storedState.site,
      siteVersion: storedState.siteVersion,
      ownershipSite: storedState.ownershipSite,
      domainBinding: storedState.domainBinding,
      hostBinding: storedState.hostBinding,
      domainException: storedState.domainException,
      manualCompletionEvidence: storedState.manualCompletionEvidence,
      domainExceptionEvidence: storedState.domainExceptionEvidence,
      auditEvent: storedState.auditEvent,
    },
    readiness: {
      readStatus: storedState.readStatus,
      readinessState: storedState.readinessState,
      freshnessState: storedState.freshnessState,
      blockers: uniqSorted(storedState.blockers),
      warnings: uniqSorted(storedState.warnings),
      limitations: uniqSorted([...DEFAULT_LIMITATIONS, ...storedState.limitations]),
      staleReason: storedState.staleReason,
      freshUntil: storedState.freshUntil,
    },
  });
}

function buildPerSourceWatermarks(storedState: DdomReadinessStoredState): Record<string, string | null> {
  return {
    site: storedState.site ? sourceWatermark(storedState.site) : null,
    siteVersion: storedState.siteVersion ? sourceWatermark(storedState.siteVersion) : null,
    ownershipSite: storedState.ownershipSite ? sourceWatermark(storedState.ownershipSite) : null,
    domainBinding: storedState.domainBinding ? sourceWatermark(storedState.domainBinding) : null,
    hostBinding: storedState.hostBinding ? sourceWatermark(storedState.hostBinding) : null,
    vercelStoredSnapshot: storedState.domainBinding
      ? sourceWatermark({
          id: storedState.domainBinding.id,
          vercelDomainId: storedState.domainBinding.vercel_domain_id,
          status: storedState.domainBinding.status,
          lastCheckedAt: storedState.domainBinding.last_checked_at,
        })
      : null,
    dnsInstruction: storedState.domainBinding
      ? sourceWatermark({
          id: storedState.domainBinding.id,
          dnsRecordType: storedState.domainBinding.dns_record_type,
          dnsRecordHost: storedState.domainBinding.dns_record_host,
          dnsRecordValue: storedState.domainBinding.dns_record_value,
          dnsRecordPurpose: storedState.domainBinding.dns_record_purpose,
          dnsInstructionsJson: storedState.domainBinding.dns_instructions_json,
          updatedAt: storedState.domainBinding.updated_at,
        })
      : null,
    manualEvidence: storedState.manualCompletionEvidence ? sourceWatermark(storedState.manualCompletionEvidence) : null,
    domainException: storedState.domainException ? sourceWatermark(storedState.domainException) : null,
    domainExceptionEvidence: storedState.domainExceptionEvidence ? sourceWatermark(storedState.domainExceptionEvidence) : null,
    auditEvent: storedState.auditEvent ? sourceWatermark(storedState.auditEvent) : null,
    freshnessPolicy: sourceWatermark({
      policyId: "ddom_stored_state_manual_snapshot:v1",
      policyVersion: "1",
      ttlHours: storedState.input.readinessTtlHours ?? 24,
      freshUntil: storedState.freshUntil,
      staleReason: storedState.staleReason,
      freshnessState: storedState.freshnessState,
    }),
  };
}

export function mapDdomReadinessStoredStateToSnapshotInput(
  input: MapDdomReadinessStoredStateInput,
): MappedDdomReadinessStoredStateSnapshot {
  const storedState = input.storedState;
  const tenantId = required("tenantId", storedState.input.tenantId);
  const siteId = required("siteId", storedState.input.siteId);
  const actorId = required("actorId", input.actorId);
  const correlationId = required("correlationId", input.correlationId);
  const environment = text(storedState.input.environment) ?? "production";
  const stage = text(storedState.input.stage) ?? "production";
  const sourceWatermark = buildDdomStoredStateSourceWatermark(storedState);
  const perSourceWatermarks = buildPerSourceWatermarks(storedState);
  const limitations = uniqSorted([
    ...DEFAULT_LIMITATIONS,
    ...storedState.limitations,
    storedState.domainBinding?.dns_record_type || storedState.domainBinding?.dns_instructions_json
      ? "dns_instruction_snapshot_not_completion_proof"
      : "",
    storedState.manualCompletionEvidence ? "manual_completion_evidence_not_dns_truth" : "",
    storedState.domainException ? "domain_exception_not_publish_approval" : "",
  ]);
  const pasrImplication = buildDdomPasrImplicationSummary(storedState);
  const domain = normalizeHost(storedState.domainBinding?.domain);
  const internalHost = normalizeHost(storedState.hostBinding?.host ?? storedState.input.internalHost);
  const intendedLaunchDomain = normalizeHost(storedState.input.intendedDomain ?? storedState.domainBinding?.domain);
  const refs = buildRefs(storedState, perSourceWatermarks);
  const idempotencyKey =
    text(input.idempotencyKey) ??
    [
      "ddom.snapshot.manual-stored-state-caller:v1",
      tenantId,
      siteId,
      storedState.input.siteVersionId ?? "site",
      storedState.domainBinding?.id ?? storedState.hostBinding?.id ?? intendedLaunchDomain ?? internalHost ?? "none",
      storedState.input.requestScope,
      sourceWatermark,
      environment,
      stage,
    ].join(":");

  if (storedState.readStatus === "read_failure") {
    throw new DdomReadinessStoredStateMapperError("read_failure cannot be mapped to a DDOM snapshot");
  }
  if (storedState.readinessState !== "not_applicable" && !domain && !internalHost && !intendedLaunchDomain && !storedState.domainBinding?.id && !storedState.hostBinding?.id) {
    throw new DdomReadinessStoredStateMapperError("domain or host identity is required unless readiness is not_applicable");
  }

  return {
    writerInput: {
      tenantId,
      clientId: text(storedState.input.clientId),
      siteId,
      ownershipSiteId: text(storedState.input.ownershipSiteId) ?? text(storedState.siteVersion?.ownership_site_id) ?? text(storedState.ownershipSite?.id),
      siteVersionId: text(storedState.input.siteVersionId ?? storedState.siteVersion?.id),
      domainBindingId: text(storedState.input.domainBindingId ?? storedState.domainBinding?.id),
      hostBindingId: text(storedState.input.hostBindingId ?? storedState.hostBinding?.id),
      domain,
      internalHost,
      intendedLaunchDomain,
      readinessState: storedState.readinessState,
      readinessBlockers: uniqSorted(storedState.blockers),
      readinessWarnings: uniqSorted(storedState.warnings),
      freshnessState: storedState.freshnessState,
      freshUntil: storedState.freshUntil,
      staleReason: storedState.staleReason,
      sourceWatermark,
      sourceWatermarkJson: {
        version: "ddom-manual-stored-state-source-watermark:v1",
        freshnessPolicyId: "ddom_stored_state_manual_snapshot:v1",
        freshnessPolicyVersion: "1",
        capturedSourceTransactionAt: "writer_captured_at",
        computedFreshUntil: storedState.freshUntil,
        computedStaleReason: storedState.staleReason,
        environment,
        stage,
        readStatus: storedState.readStatus,
        perSourceWatermarks,
      },
      snapshotJson: {
        version: "ddom-manual-stored-state-snapshot:v1",
        requestScope: storedState.input.requestScope,
        reason: text(input.reason),
        readiness: {
          state: storedState.readinessState,
          blockers: uniqSorted(storedState.blockers),
          warnings: uniqSorted(storedState.warnings),
          freshnessState: storedState.freshnessState,
          freshUntil: storedState.freshUntil,
          staleReason: storedState.staleReason,
        },
        subject: {
          tenantId,
          clientId: text(storedState.input.clientId),
          agencyId: text(storedState.input.agencyId) ?? text(storedState.ownershipSite?.agency_id),
          siteId,
          ownershipSiteId: text(storedState.input.ownershipSiteId) ?? text(storedState.siteVersion?.ownership_site_id) ?? text(storedState.ownershipSite?.id),
          siteVersionId: text(storedState.input.siteVersionId ?? storedState.siteVersion?.id),
          domainBindingId: text(storedState.input.domainBindingId ?? storedState.domainBinding?.id),
          hostBindingId: text(storedState.input.hostBindingId ?? storedState.hostBinding?.id),
          intendedDomain: intendedLaunchDomain,
          internalHost,
          environment,
          stage,
        },
        sourceState: {
          readStatus: storedState.readStatus,
          domainBindingStatus: storedState.domainBinding?.status ?? null,
          hostBindingStatus: storedState.hostBinding?.status ?? null,
          storedVercelLastCheckedAt: storedState.domainBinding?.last_checked_at ?? null,
          storedVercelDomainIdPresent: Boolean(text(storedState.domainBinding?.vercel_domain_id)),
          dnsInstructionFieldsPresent: Boolean(storedState.domainBinding?.dns_record_type || storedState.domainBinding?.dns_instructions_json),
          manualCompletionEvidencePresent: Boolean(storedState.manualCompletionEvidence),
          domainExceptionPresent: Boolean(storedState.domainException),
        },
        pasrImplication,
        limitations,
        boundaryConfirmations: {
          ddomReadinessIsNotPublishApproval: true,
          manualSnapshotIsNotPublishActivation: true,
          manualSnapshotIsNotDnsCompletionProof: true,
          manualSnapshotIsNotVercelTruth: true,
          manualSnapshotIsNotRegistrarTruth: true,
          manualSnapshotIsNotOpenproviderTruth: true,
          manualSnapshotIsNotAiDecisionTruth: true,
          commandCenterOpsInboxDerivedOnly: true,
          pasrMustNotCreateSnapshots: true,
        },
      },
      refs,
      actorType: input.actorType,
      actorId,
      correlationId,
      causationId: text(input.causationId),
      idempotencyKey,
      privacyLabel: input.privacyLabel ?? "client_confidential",
      retentionClass: input.retentionClass ?? "compliance_long",
    },
    pasrImplication,
    noPublishNoProviderConfirmation: true,
  };
}
