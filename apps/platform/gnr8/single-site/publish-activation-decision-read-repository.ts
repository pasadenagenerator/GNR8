import "server-only";

import type { Pool } from "pg";

import { getSuperadminPool } from "../../src/superadmin/db";
import type { AafPgClient } from "../aaf/aaf-writer-repository";
import {
  PUBLISH_ACTIVATION_REQUEST_ACTION,
  PUBLISH_ACTIVATION_REQUEST_SCOPE,
  PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE,
} from "./publish-activation-request-bridge";

export type PublishActivationDecisionReadClient = AafPgClient & {
  release?: () => void;
};

export type PublishActivationDecisionReadPool = Pick<Pool, "connect">;
export type PublishActivationDecisionReadRow = Record<string, unknown>;

export type PublishActivationDecisionReadRepositoryInput = {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  publishActivationRequestId?: string | null;
  publishActivationDecisionId?: string | null;
  launchReadinessEvidencePackageId?: string | null;
  candidateSiteVersionId?: string | null;
  runtimeArtifactId?: string | null;
  publishTargetId?: string | null;
};

export type PublishActivationDecisionReadSnapshot = {
  transactionCapturedAt: string;
  request: PublishActivationDecisionReadRow | null;
  decisions: PublishActivationDecisionReadRow[];
  selectedDecision: PublishActivationDecisionReadRow | null;
  activeDecisions: PublishActivationDecisionReadRow[];
  conflictingDecisions: PublishActivationDecisionReadRow[];
  requestEvidenceLinks: PublishActivationDecisionReadRow[];
  decisionEvidenceLinks: PublishActivationDecisionReadRow[];
  evidencePackage: PublishActivationDecisionReadRow | null;
  evidenceSourceRefs: PublishActivationDecisionReadRow[];
  freshnessRows: PublishActivationDecisionReadRow[];
  policyRows: PublishActivationDecisionReadRow[];
  auditEvents: PublishActivationDecisionReadRow[];
  auditRefs: PublishActivationDecisionReadRow[];
  launchReadinessRecord: PublishActivationDecisionReadRow | null;
  launchReadinessRefs: PublishActivationDecisionReadRow[];
  publishTarget: PublishActivationDecisionReadRow | null;
};

export type PublishActivationDecisionReadRepositoryLike = {
  withReadOnlyTransaction<T>(fn: (client: PublishActivationDecisionReadClient, capturedAt: string) => Promise<T>): Promise<T>;
  readSnapshot(input: PublishActivationDecisionReadRepositoryInput): Promise<PublishActivationDecisionReadSnapshot>;
};

export class PublishActivationDecisionReadRepositoryError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    const causeMessage = cause instanceof Error ? `: ${cause.message}` : "";
    super(`${message}${causeMessage}`);
    this.name = "PublishActivationDecisionReadRepositoryError";
  }
}

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function requiredText(field: string, value: unknown): string {
  const normalized = text(value);
  if (!normalized) throw new PublishActivationDecisionReadRepositoryError(`missing required publish activation decision read field: ${field}`);
  return normalized;
}

function sourceId(refOrId: string | null | undefined): string | null {
  const normalized = text(refOrId);
  if (!normalized) return null;
  const parts = normalized.split(":");
  return parts[parts.length - 1] || normalized;
}

function isUuid(value: string | null | undefined): boolean {
  return Boolean(text(value)?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
}

async function tableExists(client: AafPgClient, tableName: string): Promise<boolean> {
  const result = await client.query("select to_regclass($1) as table_name", [`public.${tableName}`]);
  return Boolean(result.rows[0]?.table_name);
}

async function readAll(client: AafPgClient, sql: string, values: readonly unknown[]): Promise<PublishActivationDecisionReadRow[]> {
  const result = await client.query(sql, values);
  return result.rows;
}

async function readOne(client: AafPgClient, sql: string, values: readonly unknown[]): Promise<PublishActivationDecisionReadRow | null> {
  return (await readAll(client, sql, values))[0] ?? null;
}

function activeDecisionRows(decisions: readonly PublishActivationDecisionReadRow[]): PublishActivationDecisionReadRow[] {
  return decisions.filter((decision) => {
    const status = text(decision.status);
    if (["revoked", "expired", "superseded", "cancelled", "not_required_by_policy"].includes(String(status))) return false;
    if (decision.revoked === true || decision.superseded === true) return false;
    return true;
  });
}

function preferredDecision(decisions: readonly PublishActivationDecisionReadRow[], decisionId?: string | null): PublishActivationDecisionReadRow | null {
  const expectedId = text(decisionId);
  if (expectedId) return decisions.find((decision) => text(decision.id) === expectedId) ?? null;
  const active = activeDecisionRows(decisions);
  return active.find((decision) => ["granted", "granted_with_limitations"].includes(String(text(decision.status)))) ?? active[0] ?? null;
}

export class PublishActivationDecisionReadRepository implements PublishActivationDecisionReadRepositoryLike {
  constructor(private readonly pool: PublishActivationDecisionReadPool = getSuperadminPool()) {}

  async withReadOnlyTransaction<T>(fn: (client: PublishActivationDecisionReadClient, capturedAt: string) => Promise<T>): Promise<T> {
    const client = (await this.pool.connect()) as PublishActivationDecisionReadClient;
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
          // Best-effort cleanup after a failed read-only publish activation decision read.
        }
      }
      throw new PublishActivationDecisionReadRepositoryError("publish_activation_decision_read_repository_failed", error);
    } finally {
      client.release?.();
    }
  }

  async readSnapshot(input: PublishActivationDecisionReadRepositoryInput): Promise<PublishActivationDecisionReadSnapshot> {
    requiredText("tenantId", input.tenantId);
    requiredText("clientId", input.clientId);
    requiredText("siteId", input.siteId);
    requiredText("migrationId", input.migrationId);

    return this.withReadOnlyTransaction(async (client, capturedAt) => {
      const decisionById = input.publishActivationDecisionId
        ? await this.readDecisionById(client, input.publishActivationDecisionId)
        : null;
      const request =
        (input.publishActivationRequestId ? await this.readRequestById(client, input.publishActivationRequestId) : null) ??
        (decisionById ? await this.readRequestById(client, text(decisionById.approval_request_id)) : null) ??
        (await this.readLatestRequest(client, input));
      const decisions = request
        ? await this.readDecisionsForRequest(client, text(request.id))
        : decisionById
          ? [decisionById]
          : [];
      const selectedDecision = preferredDecision(decisions, input.publishActivationDecisionId);
      const activeDecisions = activeDecisionRows(decisions);
      const conflictingDecisions = activeDecisions.length > 1 ? activeDecisions : [];
      const requestId = text(request?.id);
      const selectedDecisionId = text(selectedDecision?.id);
      const requestEvidenceLinks = requestId ? await this.readRequestEvidenceLinks(client, requestId) : [];
      const decisionEvidenceLinks = selectedDecisionId ? await this.readDecisionEvidenceLinks(client, selectedDecisionId) : [];
      const evidencePackageId =
        text(input.launchReadinessEvidencePackageId) ??
        text(selectedDecision?.evidence_package_id) ??
        text(decisionEvidenceLinks[0]?.evidence_package_id) ??
        text(requestEvidenceLinks[0]?.evidence_package_id);
      const evidencePackage = evidencePackageId ? await this.readEvidencePackage(client, evidencePackageId) : null;
      const evidenceSourceRefs = evidencePackageId ? await this.readEvidenceSourceRefs(client, evidencePackageId) : [];
      const freshnessRows = evidencePackageId ? await this.readFreshnessRows(client, evidencePackageId) : [];
      const policyRows = requestId ? await this.readPolicyRows(client, requestId, selectedDecisionId) : [];
      const auditEvents = await this.readAuditEvents(client, { requestId, decisionId: selectedDecisionId, evidencePackageId });
      const auditRefs = auditEvents.length > 0 ? await this.readAuditRefs(client, auditEvents.map((event) => requiredText("auditEvent.id", event.id))) : [];
      const payload = typeof evidencePackage?.limitations_json === "object" ? (evidencePackage.limitations_json as Record<string, unknown>) : {};
      const identity = typeof payload.identity === "object" && payload.identity ? (payload.identity as Record<string, unknown>) : {};
      const readinessId = text(identity.launchReadinessRecordId) ?? text(evidencePackage?.subject_id);
      const launchReadinessRecord = await this.readLaunchReadinessRecord(client, readinessId);
      const launchReadinessRefs = launchReadinessRecord ? await this.readLaunchReadinessRefs(client, text(launchReadinessRecord.id)) : [];
      const publishTargetId = sourceId(input.publishTargetId) ?? sourceIdFromEvidence(evidenceSourceRefs, payload, "publish_target");
      const publishTarget = await this.readPublishTarget(client, publishTargetId);

      return {
        transactionCapturedAt: capturedAt,
        request,
        decisions,
        selectedDecision,
        activeDecisions,
        conflictingDecisions,
        requestEvidenceLinks,
        decisionEvidenceLinks,
        evidencePackage,
        evidenceSourceRefs,
        freshnessRows,
        policyRows,
        auditEvents,
        auditRefs,
        launchReadinessRecord,
        launchReadinessRefs,
        publishTarget,
      };
    });
  }

  private async readRequestById(client: AafPgClient, requestId: string | null): Promise<PublishActivationDecisionReadRow | null> {
    if (!isUuid(requestId)) return null;
    return readOne(client, "select * from public.gnr8_aaf_approval_requests where id = $1::uuid limit 1", [requestId]);
  }

  private async readLatestRequest(client: AafPgClient, input: PublishActivationDecisionReadRepositoryInput): Promise<PublishActivationDecisionReadRow | null> {
    const candidateId = sourceId(input.candidateSiteVersionId);
    return readOne(
      client,
      `
      select *
      from public.gnr8_aaf_approval_requests
      where tenant_id = $1
        and client_id is not distinct from $2
        and site_id is not distinct from $3
        and scope = $4
        and subject_type = $5
        and ($6::text is null or subject_id = $6::text or site_version_id = $6::text)
      order by created_at desc, id desc
      limit 1
      `,
      [input.tenantId, input.clientId, input.siteId, PUBLISH_ACTIVATION_REQUEST_SCOPE, PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE, candidateId],
    );
  }

  private async readDecisionById(client: AafPgClient, decisionId: string | null): Promise<PublishActivationDecisionReadRow | null> {
    if (!isUuid(decisionId)) return null;
    return readOne(client, "select * from public.gnr8_aaf_approval_decisions where id = $1::uuid limit 1", [decisionId]);
  }

  private async readDecisionsForRequest(client: AafPgClient, requestId: string | null): Promise<PublishActivationDecisionReadRow[]> {
    if (!isUuid(requestId)) return [];
    return readAll(
      client,
      `
      select
        d.*,
        exists(select 1 from public.gnr8_aaf_approval_revocations r where r.approval_decision_id = d.id) as revoked,
        exists(select 1 from public.gnr8_aaf_approval_supersession_links s where s.superseded_decision_id = d.id) as superseded
      from public.gnr8_aaf_approval_decisions d
      where d.approval_request_id = $1::uuid
      order by d.created_at asc, d.id asc
      `,
      [requestId],
    );
  }

  private async readRequestEvidenceLinks(client: AafPgClient, requestId: string): Promise<PublishActivationDecisionReadRow[]> {
    return readAll(
      client,
      `
      select *
      from public.gnr8_aaf_approval_evidence_links
      where approval_request_id = $1::uuid
        and approval_decision_id is null
      order by created_at asc, id asc
      `,
      [requestId],
    );
  }

  private async readDecisionEvidenceLinks(client: AafPgClient, decisionId: string): Promise<PublishActivationDecisionReadRow[]> {
    return readAll(
      client,
      `
      select *
      from public.gnr8_aaf_approval_evidence_links
      where approval_decision_id = $1::uuid
      order by created_at asc, id asc
      `,
      [decisionId],
    );
  }

  private async readEvidencePackage(client: AafPgClient, evidencePackageId: string): Promise<PublishActivationDecisionReadRow | null> {
    if (!isUuid(evidencePackageId)) return null;
    return readOne(client, "select * from public.gnr8_aaf_evidence_packages where id = $1::uuid limit 1", [evidencePackageId]);
  }

  private async readEvidenceSourceRefs(client: AafPgClient, evidencePackageId: string): Promise<PublishActivationDecisionReadRow[]> {
    return readAll(
      client,
      `
      select *
      from public.gnr8_aaf_evidence_package_source_refs
      where evidence_package_id = $1::uuid
      order by source_system asc, source_table asc, source_record_id asc, source_watermark asc, id asc
      `,
      [evidencePackageId],
    );
  }

  private async readFreshnessRows(client: AafPgClient, evidencePackageId: string): Promise<PublishActivationDecisionReadRow[]> {
    return readAll(
      client,
      `
      select *
      from public.gnr8_aaf_evidence_package_freshness_checks
      where evidence_package_id = $1::uuid
      order by checked_at desc, created_at desc, id desc
      `,
      [evidencePackageId],
    );
  }

  private async readPolicyRows(client: AafPgClient, requestId: string, decisionId: string | null): Promise<PublishActivationDecisionReadRow[]> {
    return readAll(
      client,
      `
      select *
      from public.gnr8_aaf_approval_policy_evaluations
      where approval_request_id = $1::uuid
         or ($2::uuid is not null and approval_decision_id = $2::uuid)
      order by created_at asc, id asc
      `,
      [requestId, decisionId],
    );
  }

  private async readAuditEvents(
    client: AafPgClient,
    input: { requestId: string | null; decisionId: string | null; evidencePackageId: string | null },
  ): Promise<PublishActivationDecisionReadRow[]> {
    return readAll(
      client,
      `
      select *
      from public.gnr8_aaf_audit_events
      where ($1::uuid is not null and approval_request_id = $1::uuid)
         or ($2::uuid is not null and approval_decision_id = $2::uuid)
         or ($3::uuid is not null and evidence_package_id = $3::uuid)
      order by created_at asc, id asc
      `,
      [input.requestId, input.decisionId, input.evidencePackageId],
    );
  }

  private async readAuditRefs(client: AafPgClient, auditEventIds: readonly string[]): Promise<PublishActivationDecisionReadRow[]> {
    if (auditEventIds.length === 0) return [];
    return readAll(
      client,
      `
      select *
      from public.gnr8_aaf_audit_event_refs
      where audit_event_id = any($1::uuid[])
      order by audit_event_id asc, ref_role asc, ref_type asc, ref_id asc
      `,
      [auditEventIds],
    );
  }

  private async readLaunchReadinessRecord(client: AafPgClient, readinessId: string | null): Promise<PublishActivationDecisionReadRow | null> {
    if (!isUuid(readinessId) || !(await tableExists(client, "gnr8_single_site_launch_readiness_records"))) return null;
    return readOne(client, "select * from public.gnr8_single_site_launch_readiness_records where id = $1::uuid limit 1", [readinessId]);
  }

  private async readLaunchReadinessRefs(client: AafPgClient, readinessId: string | null): Promise<PublishActivationDecisionReadRow[]> {
    if (!isUuid(readinessId) || !(await tableExists(client, "gnr8_single_site_launch_readiness_refs"))) return [];
    return readAll(
      client,
      `
      select *
      from public.gnr8_single_site_launch_readiness_refs
      where readiness_id = $1::uuid
      order by ref_role asc, source_system asc, source_table asc nulls first, source_type asc, source_record_id asc
      `,
      [readinessId],
    );
  }

  private async readPublishTarget(client: AafPgClient, publishTargetId: string | null): Promise<PublishActivationDecisionReadRow | null> {
    if (!publishTargetId || !(await tableExists(client, "gnr8_publish_targets"))) return null;
    return readOne(client, "select * from public.gnr8_publish_targets where id = $1::text limit 1", [publishTargetId]);
  }
}

function sourceIdFromEvidence(
  rows: readonly PublishActivationDecisionReadRow[],
  payload: Record<string, unknown>,
  role: string,
): string | null {
  const row = rows.find((entry) => {
    const metadata = typeof entry.metadata_json === "object" && entry.metadata_json ? (entry.metadata_json as Record<string, unknown>) : {};
    return text(metadata.refRole) === role;
  });
  if (text(row?.source_record_id)) return text(row?.source_record_id);
  const sourceRefs = typeof payload.sourceRefs === "object" && payload.sourceRefs ? (payload.sourceRefs as Record<string, unknown>) : {};
  const refs = Array.isArray(sourceRefs[role]) ? sourceRefs[role] as Record<string, unknown>[] : [];
  return sourceId(text(refs[0]?.sourceRecordId));
}
