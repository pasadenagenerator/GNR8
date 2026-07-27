import "server-only";

import { getSuperadminPool } from "../../src/superadmin/db";
import type { DdomPgClient } from "./ddom-readiness-snapshot-writer";

export type DdomReadinessStoredStateRequestScope = "custom_domain" | "internal_host" | "no_custom_domain";

export type DdomReadinessStoredStateReadStatus =
  | "found"
  | "missing_domain_intent"
  | "missing_domain_binding"
  | "missing_host_binding"
  | "missing_readiness_evidence"
  | "stale_stored_evidence"
  | "blocked_readiness"
  | "manually_excepted_readiness"
  | "not_applicable_readiness"
  | "read_failure";

export type DdomStoredReadinessState =
  | "ready"
  | "ready_with_warnings"
  | "blocked"
  | "not_applicable"
  | "manually_excepted"
  | "stale";

export type DdomReadinessStoredStateRepositoryInput = {
  tenantId: string;
  clientId?: string | null;
  agencyId?: string | null;
  ownershipSiteId?: string | null;
  siteId: string;
  siteVersionId?: string | null;
  domainBindingId?: string | null;
  hostBindingId?: string | null;
  intendedDomain?: string | null;
  internalHost?: string | null;
  environment?: string | null;
  stage?: string | null;
  requestScope: DdomReadinessStoredStateRequestScope;
  domainExceptionApprovalRequestId?: string | null;
  domainExceptionApprovalDecisionId?: string | null;
  domainExceptionEvidencePackageId?: string | null;
  manualCompletionEvidencePackageId?: string | null;
  auditEventId?: string | null;
  readinessTtlHours?: number | null;
};

export type DdomRuntimeSiteSourceRow = {
  id: string;
  source_url: string | null;
  source_host: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DdomRuntimeSiteVersionSourceRow = {
  id: string;
  site_id: string;
  version_no: string | null;
  state: string | null;
  source: string | null;
  actor: string | null;
  renderer_compatibility_version: string | null;
  artifact_id: string | null;
  ownership_site_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DdomOwnershipSiteSourceRow = {
  id: string;
  org_id: string | null;
  agency_id: string | null;
  status: string | null;
  domain: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DdomDomainBindingSourceRow = {
  id: string;
  site_id: string;
  site_version_id: string;
  domain: string;
  status: string;
  domain_type: string | null;
  verification_type: string | null;
  verification_value: string | null;
  verification_host: string | null;
  dns_record_type: string | null;
  dns_record_host: string | null;
  dns_record_value: string | null;
  dns_record_purpose: string | null;
  dns_instructions_json: unknown;
  last_checked_at: string | null;
  vercel_domain_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type DdomHostBindingSourceRow = {
  id: string;
  site_id: string;
  host: string;
  status: string;
  binding_kind: string;
  created_at: string | null;
  updated_at: string | null;
};

export type DdomAafDomainExceptionSourceRow = {
  approval_request_id: string;
  approval_decision_id: string | null;
  evidence_package_id: string | null;
  request_status: string;
  decision_status: string | null;
  subject_type: string;
  subject_id: string;
  policy_version: string;
  requested_expires_at: string | null;
  decision_expires_at: string | null;
  request_created_at: string;
  decided_at: string | null;
  revocation_count: string;
  supersession_count: string;
};

export type DdomAafEvidencePackageSourceRow = {
  id: string;
  package_type: string;
  subject_type: string;
  subject_id: string;
  status: string;
  source_watermark: string;
  freshness_label: string;
  expires_at: string | null;
  content_hash: string;
  limitations_json: unknown;
  created_at: string;
};

export type DdomAafAuditEventSourceRow = {
  id: string;
  event_name: string;
  event_family: string;
  subject_type: string;
  subject_id: string;
  created_at: string;
};

export type DdomReadinessStoredState = {
  readStatus: DdomReadinessStoredStateReadStatus;
  readinessState: DdomStoredReadinessState;
  freshnessState: "fresh" | "stale" | "failed" | "partial_timeline";
  blockers: string[];
  warnings: string[];
  limitations: string[];
  staleReason: string | null;
  freshUntil: string | null;
  capturedSourceTransactionAt: string;
  input: DdomReadinessStoredStateRepositoryInput;
  site: DdomRuntimeSiteSourceRow | null;
  siteVersion: DdomRuntimeSiteVersionSourceRow | null;
  ownershipSite: DdomOwnershipSiteSourceRow | null;
  domainBinding: DdomDomainBindingSourceRow | null;
  hostBinding: DdomHostBindingSourceRow | null;
  domainException: DdomAafDomainExceptionSourceRow | null;
  manualCompletionEvidence: DdomAafEvidencePackageSourceRow | null;
  domainExceptionEvidence: DdomAafEvidencePackageSourceRow | null;
  auditEvent: DdomAafAuditEventSourceRow | null;
};

export type DdomReadinessStoredStateClient = DdomPgClient & {
  release?: () => void;
};

export type DdomReadinessStoredStatePool = {
  connect(): Promise<DdomReadinessStoredStateClient>;
};

export type DdomReadinessStoredStateRepositoryLike = {
  readDdomReadinessStoredState(input: DdomReadinessStoredStateRepositoryInput): Promise<DdomReadinessStoredState>;
};

export class DdomReadinessStoredStateReadError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "DdomReadinessStoredStateReadError";
  }
}

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeHost(value: unknown): string | null {
  return text(value)?.toLowerCase() ?? null;
}

function jsonArrayLength(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }
  return 0;
}

function addHours(timestamp: string, hours: number): string | null {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function isPast(timestamp: string | null, capturedAt: string): boolean {
  if (!timestamp) return false;
  const left = new Date(timestamp);
  const right = new Date(capturedAt);
  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) return false;
  return left.getTime() <= right.getTime();
}

function uniqSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

async function withReadOnlyTransaction<T>(
  pool: DdomReadinessStoredStatePool,
  fn: (client: DdomReadinessStoredStateClient, capturedAt: string) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let started = false;
  try {
    await client.query("begin isolation level repeatable read read only");
    started = true;
    const captured = await client.query("select transaction_timestamp()::text as captured_at");
    const capturedAt = String(captured.rows[0]?.captured_at ?? new Date().toISOString());
    const result = await fn(client, capturedAt);
    await client.query("commit");
    started = false;
    return result;
  } catch (error) {
    if (started) {
      try {
        await client.query("rollback");
      } catch {
        // Best-effort rollback after a failed read-only transaction.
      }
    }
    throw new DdomReadinessStoredStateReadError("ddom_stored_state_read_failure", error);
  } finally {
    client.release?.();
  }
}

export class DdomReadinessStoredStateRepository implements DdomReadinessStoredStateRepositoryLike {
  constructor(private readonly pool: DdomReadinessStoredStatePool = getSuperadminPool()) {}

  async readDdomReadinessStoredState(input: DdomReadinessStoredStateRepositoryInput): Promise<DdomReadinessStoredState> {
    return withReadOnlyTransaction(this.pool, async (client, capturedAt) => {
      const site = await this.readSite(client, input.siteId);
      const siteVersion = input.siteVersionId ? await this.readSiteVersion(client, input.siteVersionId) : null;
      const ownershipSiteId = text(input.ownershipSiteId) ?? text(siteVersion?.ownership_site_id);
      const ownershipSite = ownershipSiteId ? await this.readOwnershipSite(client, ownershipSiteId) : null;
      const domainBinding = input.requestScope === "custom_domain" ? await this.readDomainBinding(client, input) : null;
      const hostBinding = input.requestScope !== "custom_domain" ? await this.readHostBinding(client, input) : null;
      const domainException = await this.readDomainException(client, input);
      const manualCompletionEvidence = input.manualCompletionEvidencePackageId
        ? await this.readEvidencePackage(client, input.manualCompletionEvidencePackageId)
        : null;
      const domainExceptionEvidence = input.domainExceptionEvidencePackageId
        ? await this.readEvidencePackage(client, input.domainExceptionEvidencePackageId)
        : null;
      const auditEvent = input.auditEventId ? await this.readAuditEvent(client, input.auditEventId) : null;

      return classifyStoredState({
        input,
        capturedAt,
        site,
        siteVersion,
        ownershipSite,
        domainBinding,
        hostBinding,
        domainException,
        manualCompletionEvidence,
        domainExceptionEvidence,
        auditEvent,
      });
    });
  }

  private async readSite(client: DdomPgClient, siteId: string): Promise<DdomRuntimeSiteSourceRow | null> {
    const result = await client.query(
      `
      select
        id::text,
        source_url::text,
        source_host::text,
        created_at::text,
        updated_at::text
      from public.gnr8_runtime_sites
      where id = $1::text
      limit 1
      `,
      [siteId],
    );
    return (result.rows[0] as DdomRuntimeSiteSourceRow | undefined) ?? null;
  }

  private async readSiteVersion(client: DdomPgClient, siteVersionId: string): Promise<DdomRuntimeSiteVersionSourceRow | null> {
    const result = await client.query(
      `
      select
        id::text,
        site_id::text,
        version_no::text,
        state::text,
        source::text,
        actor::text,
        renderer_compatibility_version::text,
        artifact_id::text,
        ownership_site_id::text,
        created_at::text,
        updated_at::text
      from public.gnr8_runtime_site_versions
      where id = $1::uuid
      limit 1
      `,
      [siteVersionId],
    );
    return (result.rows[0] as DdomRuntimeSiteVersionSourceRow | undefined) ?? null;
  }

  private async readOwnershipSite(client: DdomPgClient, ownershipSiteId: string): Promise<DdomOwnershipSiteSourceRow | null> {
    const result = await client.query(
      `
      select
        id::text,
        org_id::text,
        agency_id::text,
        status::text,
        domain::text,
        created_at::text,
        updated_at::text
      from public.sites
      where id = $1::uuid
      limit 1
      `,
      [ownershipSiteId],
    );
    return (result.rows[0] as DdomOwnershipSiteSourceRow | undefined) ?? null;
  }

  private async readDomainBinding(
    client: DdomPgClient,
    input: DdomReadinessStoredStateRepositoryInput,
  ): Promise<DdomDomainBindingSourceRow | null> {
    const result = await client.query(
      `
      select
        id::text,
        site_id::text,
        site_version_id::text,
        domain::text,
        status::text,
        domain_type::text,
        verification_type::text,
        verification_value::text,
        verification_host::text,
        dns_record_type::text,
        dns_record_host::text,
        dns_record_value::text,
        dns_record_purpose::text,
        dns_instructions_json,
        last_checked_at::text,
        vercel_domain_id::text,
        created_at::text,
        updated_at::text
      from public.gnr8_runtime_domain_host_bindings
      where site_id = $1::text
        and (
          ($2::uuid is not null and id = $2::uuid)
          or ($2::uuid is null and $3::text is not null and lower(domain) = lower($3::text))
        )
      order by updated_at desc, created_at desc
      limit 1
      `,
      [input.siteId, input.domainBindingId ?? null, input.intendedDomain ?? null],
    );
    return (result.rows[0] as DdomDomainBindingSourceRow | undefined) ?? null;
  }

  private async readHostBinding(
    client: DdomPgClient,
    input: DdomReadinessStoredStateRepositoryInput,
  ): Promise<DdomHostBindingSourceRow | null> {
    const result = await client.query(
      `
      select
        id::text,
        site_id::text,
        host::text,
        status::text,
        binding_kind::text,
        created_at::text,
        updated_at::text
      from public.gnr8_runtime_host_bindings
      where site_id = $1::text
        and (
          ($2::uuid is not null and id = $2::uuid)
          or ($2::uuid is null and $3::text is not null and lower(host) = lower($3::text))
        )
      order by (status = 'ACTIVE') desc, updated_at desc, created_at desc
      limit 1
      `,
      [input.siteId, input.hostBindingId ?? null, input.internalHost ?? null],
    );
    return (result.rows[0] as DdomHostBindingSourceRow | undefined) ?? null;
  }

  private async readDomainException(
    client: DdomPgClient,
    input: DdomReadinessStoredStateRepositoryInput,
  ): Promise<DdomAafDomainExceptionSourceRow | null> {
    if (!input.domainExceptionApprovalRequestId && !input.domainExceptionApprovalDecisionId) return null;
    const result = await client.query(
      `
      select
        r.id::text as approval_request_id,
        d.id::text as approval_decision_id,
        d.evidence_package_id::text,
        r.status::text as request_status,
        d.status::text as decision_status,
        r.subject_type::text,
        r.subject_id::text,
        coalesce(d.policy_version, r.policy_version)::text as policy_version,
        r.requested_expires_at::text,
        d.expires_at::text as decision_expires_at,
        r.created_at::text as request_created_at,
        d.decided_at::text,
        coalesce(rv.revocation_count, 0)::text as revocation_count,
        coalesce(sp.supersession_count, 0)::text as supersession_count
      from public.gnr8_aaf_approval_requests r
      left join lateral (
        select *
        from public.gnr8_aaf_approval_decisions d
        where d.approval_request_id = r.id
          and ($2::uuid is null or d.id = $2::uuid)
        order by d.decided_at desc, d.created_at desc
        limit 1
      ) d on true
      left join lateral (
        select count(*) as revocation_count
        from public.gnr8_aaf_approval_revocations rv
        where d.id is not null and rv.approval_decision_id = d.id
      ) rv on true
      left join lateral (
        select count(*) as supersession_count
        from public.gnr8_aaf_approval_supersession_links sp
        where sp.superseded_approval_request_id = r.id
           or (d.id is not null and sp.superseded_decision_id = d.id)
      ) sp on true
      where r.scope = 'domain_exception'
        and ($1::uuid is null or r.id = $1::uuid)
        and ($2::uuid is null or d.id = $2::uuid)
      order by d.decided_at desc nulls last, r.created_at desc
      limit 1
      `,
      [input.domainExceptionApprovalRequestId ?? null, input.domainExceptionApprovalDecisionId ?? null],
    );
    return (result.rows[0] as DdomAafDomainExceptionSourceRow | undefined) ?? null;
  }

  private async readEvidencePackage(client: DdomPgClient, evidencePackageId: string): Promise<DdomAafEvidencePackageSourceRow | null> {
    const result = await client.query(
      `
      select
        id::text,
        package_type::text,
        subject_type::text,
        subject_id::text,
        status::text,
        source_watermark::text,
        freshness_label::text,
        expires_at::text,
        content_hash::text,
        limitations_json,
        created_at::text
      from public.gnr8_aaf_evidence_packages
      where id = $1::uuid
      limit 1
      `,
      [evidencePackageId],
    );
    return (result.rows[0] as DdomAafEvidencePackageSourceRow | undefined) ?? null;
  }

  private async readAuditEvent(client: DdomPgClient, auditEventId: string): Promise<DdomAafAuditEventSourceRow | null> {
    const result = await client.query(
      `
      select
        id::text,
        event_name::text,
        event_family::text,
        subject_type::text,
        subject_id::text,
        created_at::text
      from public.gnr8_aaf_audit_events
      where id = $1::uuid
      limit 1
      `,
      [auditEventId],
    );
    return (result.rows[0] as DdomAafAuditEventSourceRow | undefined) ?? null;
  }
}

function classifyStoredState(input: {
  input: DdomReadinessStoredStateRepositoryInput;
  capturedAt: string;
  site: DdomRuntimeSiteSourceRow | null;
  siteVersion: DdomRuntimeSiteVersionSourceRow | null;
  ownershipSite: DdomOwnershipSiteSourceRow | null;
  domainBinding: DdomDomainBindingSourceRow | null;
  hostBinding: DdomHostBindingSourceRow | null;
  domainException: DdomAafDomainExceptionSourceRow | null;
  manualCompletionEvidence: DdomAafEvidencePackageSourceRow | null;
  domainExceptionEvidence: DdomAafEvidencePackageSourceRow | null;
  auditEvent: DdomAafAuditEventSourceRow | null;
}): DdomReadinessStoredState {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const limitations: string[] = ["ddom_snapshot_from_stored_gnr8_state_only"];
  const ttlHours = input.input.readinessTtlHours && input.input.readinessTtlHours > 0 ? input.input.readinessTtlHours : 24;
  let readStatus: DdomReadinessStoredStateReadStatus = "found";
  let readinessState: DdomStoredReadinessState = "ready";
  let freshnessState: DdomReadinessStoredState["freshnessState"] = "fresh";
  let staleReason: string | null = null;
  let freshUntil: string | null = null;

  if (!input.site) blockers.push("missing_runtime_site");
  if (input.input.siteVersionId && !input.siteVersion) blockers.push("missing_site_version");

  const activeException =
    input.domainException?.decision_status === "granted" &&
    input.domainException.revocation_count === "0" &&
    input.domainException.supersession_count === "0" &&
    !isPast(input.domainException.decision_expires_at ?? input.domainException.requested_expires_at, input.capturedAt);

  if (input.input.requestScope === "no_custom_domain") {
    readStatus = "not_applicable_readiness";
    readinessState = "not_applicable";
    warnings.push("custom_domain_not_required_by_request_scope");
  } else if (activeException) {
    readStatus = "manually_excepted_readiness";
    readinessState = "manually_excepted";
    limitations.push("domain_exception_not_publish_approval");
  } else if (input.input.requestScope === "custom_domain") {
    const intendedDomain = normalizeHost(input.input.intendedDomain) ?? normalizeHost(input.domainBinding?.domain);
    if (!intendedDomain) {
      readStatus = "missing_domain_intent";
      blockers.push("missing_domain_intent");
    } else if (!input.domainBinding) {
      readStatus = "missing_domain_binding";
      blockers.push("missing_domain_binding");
    } else if (input.domainBinding.site_id !== input.input.siteId) {
      readStatus = "blocked_readiness";
      blockers.push("domain_binding_site_mismatch");
    } else if (input.input.siteVersionId && input.domainBinding.site_version_id !== input.input.siteVersionId) {
      readStatus = "blocked_readiness";
      blockers.push("domain_binding_site_version_mismatch");
    } else if (input.domainBinding.status === "failed") {
      readStatus = "blocked_readiness";
      blockers.push("domain_binding_failed");
    } else if (input.domainBinding.status !== "active") {
      readStatus = "blocked_readiness";
      blockers.push(`domain_binding_${input.domainBinding.status || "not_active"}`);
    } else if (!input.domainBinding.last_checked_at) {
      readStatus = "missing_readiness_evidence";
      blockers.push("missing_vercel_snapshot");
    } else {
      freshUntil = addHours(input.domainBinding.last_checked_at, ttlHours);
      if (isPast(freshUntil, input.capturedAt)) {
        readStatus = "stale_stored_evidence";
        readinessState = "stale";
        freshnessState = "stale";
        staleReason = "domain_readiness_stale";
        blockers.push("domain_readiness_stale");
      }
      if (!text(input.domainBinding.vercel_domain_id)) warnings.push("missing_stored_vercel_domain_id");
      if (!text(input.domainBinding.dns_record_type) && jsonArrayLength(input.domainBinding.dns_instructions_json) === 0) {
        warnings.push("missing_dns_instruction_snapshot");
      }
      if (!input.manualCompletionEvidence) warnings.push("manual_completion_evidence_not_attached");
    }
  } else if (!input.hostBinding) {
    readStatus = "missing_host_binding";
    blockers.push("missing_internal_host");
  } else if (input.hostBinding.site_id !== input.input.siteId) {
    readStatus = "blocked_readiness";
    blockers.push("host_binding_site_mismatch");
  } else if (input.hostBinding.status !== "ACTIVE") {
    readStatus = "blocked_readiness";
    blockers.push("host_binding_inactive");
  } else {
    warnings.push("internal_host_is_not_custom_domain_readiness");
  }

  if (blockers.length > 0 && readinessState !== "stale") {
    readinessState = "blocked";
    freshnessState = readStatus === "missing_readiness_evidence" ? "partial_timeline" : "failed";
    staleReason = blockers[0] ?? null;
  }
  if (readinessState === "ready" && warnings.length > 0) readinessState = "ready_with_warnings";

  return {
    readStatus,
    readinessState,
    freshnessState,
    blockers: uniqSorted(blockers),
    warnings: uniqSorted(warnings),
    limitations: uniqSorted(limitations),
    staleReason,
    freshUntil,
    capturedSourceTransactionAt: input.capturedAt,
    input: input.input,
    site: input.site,
    siteVersion: input.siteVersion,
    ownershipSite: input.ownershipSite,
    domainBinding: input.domainBinding,
    hostBinding: input.hostBinding,
    domainException: input.domainException,
    manualCompletionEvidence: input.manualCompletionEvidence,
    domainExceptionEvidence: input.domainExceptionEvidence,
    auditEvent: input.auditEvent,
  };
}

export async function readDdomReadinessStoredState(
  input: DdomReadinessStoredStateRepositoryInput,
  repository: DdomReadinessStoredStateRepositoryLike = new DdomReadinessStoredStateRepository(),
): Promise<DdomReadinessStoredState> {
  return repository.readDdomReadinessStoredState(input);
}
