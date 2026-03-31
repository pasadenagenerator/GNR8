import "server-only";

import { resolveMigrationPipelineStatus, type MigrationPipelineStatus } from "@/gnr8/command-center/migration-state-automation";
import { getSupabaseServerClientReadOnly } from "@/src/auth/supabase-server-read-only";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

type ClientOrganizationRow = {
  id: string | null;
  name: string | null;
  agency_id: string | null;
  organization_type: string | null;
};

type AgencyRow = {
  id: string | null;
  name: string | null;
};

type SiteRow = {
  id: string | null;
  domain: string | null;
  status: string | null;
  agency_id: string | null;
  org_id: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type RuntimeVersionRow = {
  ownership_site_id: string | null;
  id: string | null;
  state: string | null;
  version_no: number | null;
  updated_at: string | null;
  created_at: string | null;
};

type RuntimeSnapshot = {
  latest_runtime_site_version_id: string | null;
  latest_runtime_state: string | null;
  latest_runtime_version_no: number;
  latest_runtime_updated_at: string | null;
  latest_runtime_created_at: string | null;
  has_published_runtime_version: boolean;
};

export type ClientDashboardSiteRow = {
  site_id: string;
  domain: string | null;
  site_status: string;
  migration_status: MigrationPipelineStatus;
  latest_runtime_state: string | null;
  latest_site_version_id: string | null;
  preview_url: string | null;
  live_url: string | null;
};

export type ClientDashboardReadModel = {
  client: {
    client_id: string;
    client_name: string | null;
  };
  agency: {
    agency_id: string;
    agency_name: string | null;
  };
  summary: {
    total_sites: number;
    live_sites: number;
    needs_attention_sites: number;
  };
  site_rows: ClientDashboardSiteRow[];
};

function normalizeUuid(value: string | null | undefined, fieldName: string): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`${fieldName} is required`);
  if (!UUID_RE.test(normalized)) throw new Error(`${fieldName} must be a valid UUID`);
  return normalized;
}

function normalizeLimit(value: number | undefined): number {
  if (value == null || Number.isFinite(value) === false) return DEFAULT_LIMIT;
  const normalized = Math.floor(value);
  if (normalized < 1) throw new Error("limit must be a positive integer");
  return Math.min(normalized, MAX_LIMIT);
}

function toTextOrNull(value: unknown): string | null {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function toIsoOrNull(value: unknown): string | null {
  if (value == null) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toHttpsLiveUrl(domain: string | null | undefined): string | null {
  const raw = String(domain ?? "").trim();
  if (!raw) return null;
  try {
    const parsed = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function compareRuntimeVersions(a: RuntimeVersionRow, b: RuntimeSnapshot): number {
  const aVersion = Number(a.version_no ?? 0);
  if (aVersion !== b.latest_runtime_version_no) return aVersion - b.latest_runtime_version_no;

  const aUpdatedAt = toIsoOrNull(a.updated_at);
  if (aUpdatedAt !== b.latest_runtime_updated_at) {
    return String(aUpdatedAt ?? "").localeCompare(String(b.latest_runtime_updated_at ?? ""));
  }

  const aCreatedAt = toIsoOrNull(a.created_at);
  if (aCreatedAt !== b.latest_runtime_created_at) {
    return String(aCreatedAt ?? "").localeCompare(String(b.latest_runtime_created_at ?? ""));
  }

  return String(a.id ?? "").localeCompare(String(b.latest_runtime_site_version_id ?? ""));
}

async function fetchSitesForClient(input: {
  clientId: string;
  agencyId: string;
  limit: number;
}): Promise<SiteRow[]> {
  const supabase = await getSupabaseServerClientReadOnly();
  const orderAttempts: Array<{ column: "created_at" | "updated_at" | "id"; ascending: boolean }> = [
    { column: "created_at", ascending: false },
    { column: "updated_at", ascending: false },
    { column: "id", ascending: true },
  ];

  let lastErrorMessage: string | null = null;
  for (let index = 0; index < orderAttempts.length; index += 1) {
    const orderAttempt = orderAttempts[index];
    const result = await supabase
      .from("sites")
      .select("id,domain,status,agency_id,org_id,created_at,updated_at")
      .eq("org_id", input.clientId)
      .eq("agency_id", input.agencyId)
      .order(orderAttempt.column, { ascending: orderAttempt.ascending })
      .range(0, input.limit - 1);

    if (!result.error) {
      return Array.isArray(result.data) ? (result.data as SiteRow[]) : [];
    }

    lastErrorMessage = result.error.message;
    const lowered = result.error.message.toLowerCase();
    const mentionsColumn = lowered.includes(orderAttempt.column);
    const missingColumn = lowered.includes("does not exist");
    if (mentionsColumn && missingColumn && index < orderAttempts.length - 1) {
      continue;
    }
    throw new Error(`Site lookup failed: ${result.error.message}`);
  }

  throw new Error(`Site lookup failed: ${lastErrorMessage ?? "unknown error"}`);
}

export async function getClientDashboardReadModelForPage(input: {
  clientId: string;
  agencyId: string;
  limit?: number;
}): Promise<ClientDashboardReadModel> {
  const clientId = normalizeUuid(input.clientId, "clientId");
  const agencyId = normalizeUuid(input.agencyId, "agencyId");
  const limit = normalizeLimit(input.limit);

  const supabase = await getSupabaseServerClientReadOnly();
  const [clientOrgResult, agencyResult] = await Promise.all([
    supabase.from("organizations").select("id,name,agency_id,organization_type").eq("id", clientId).limit(1).maybeSingle(),
    supabase.from("agencies").select("id,name").eq("id", agencyId).limit(1).maybeSingle(),
  ]);

  if (clientOrgResult.error) {
    throw new Error(`Client organization lookup failed: ${clientOrgResult.error.message}`);
  }
  const clientOrg = (clientOrgResult.data as ClientOrganizationRow | null) ?? null;
  const orgType = toTextOrNull(clientOrg?.organization_type)?.toLowerCase();
  const orgAgencyId = toTextOrNull(clientOrg?.agency_id);
  if (!clientOrg || orgType !== "client" || !orgAgencyId) {
    throw new Error("Client organization is unavailable or invalid for dashboard scope.");
  }
  if (orgAgencyId !== agencyId) {
    throw new Error("Client organization does not belong to the resolved parent agency.");
  }

  if (agencyResult.error) {
    throw new Error(`Agency lookup failed: ${agencyResult.error.message}`);
  }
  const agency = (agencyResult.data as AgencyRow | null) ?? null;

  const sites = await fetchSitesForClient({
    clientId,
    agencyId,
    limit,
  });

  const siteIds = sites.map((site) => toTextOrNull(site.id)).filter((value): value is string => value != null);
  const runtimeBySiteId = new Map<string, RuntimeSnapshot>();

  if (siteIds.length > 0) {
    const runtimeResult = await supabase
      .from("gnr8_runtime_site_versions")
      .select("ownership_site_id,id,state,version_no,updated_at,created_at")
      .in("ownership_site_id", siteIds);

    if (!runtimeResult.error) {
      const runtimeRows = Array.isArray(runtimeResult.data) ? (runtimeResult.data as RuntimeVersionRow[]) : [];
      for (const row of runtimeRows) {
        const siteId = toTextOrNull(row.ownership_site_id);
        if (!siteId || !siteIds.includes(siteId)) continue;
        const existing = runtimeBySiteId.get(siteId);
        if (!existing) {
          runtimeBySiteId.set(siteId, {
            latest_runtime_site_version_id: toTextOrNull(row.id),
            latest_runtime_state: toTextOrNull(row.state),
            latest_runtime_version_no: Number(row.version_no ?? 0),
            latest_runtime_updated_at: toIsoOrNull(row.updated_at),
            latest_runtime_created_at: toIsoOrNull(row.created_at),
            has_published_runtime_version: toTextOrNull(row.state)?.toUpperCase() === "PUBLISHED",
          });
          continue;
        }

        if (compareRuntimeVersions(row, existing) > 0) {
          existing.latest_runtime_site_version_id = toTextOrNull(row.id);
          existing.latest_runtime_state = toTextOrNull(row.state);
          existing.latest_runtime_version_no = Number(row.version_no ?? 0);
          existing.latest_runtime_updated_at = toIsoOrNull(row.updated_at);
          existing.latest_runtime_created_at = toIsoOrNull(row.created_at);
        }
        if (toTextOrNull(row.state)?.toUpperCase() === "PUBLISHED") {
          existing.has_published_runtime_version = true;
        }
      }
    }
  }

  const siteRows: ClientDashboardSiteRow[] = sites
    .map((site) => {
      const siteId = toTextOrNull(site.id);
      if (!siteId) return null;
      const runtime = runtimeBySiteId.get(siteId);
      const status = toTextOrNull(site.status) ?? "UNKNOWN";
      const migration = resolveMigrationPipelineStatus({
        evidence: {
          site_status: status,
          migration_event_count: 0,
          latest_runtime_state: runtime?.latest_runtime_state ?? null,
          latest_runtime_site_version_id: runtime?.latest_runtime_site_version_id ?? null,
          has_published_runtime_version: runtime?.has_published_runtime_version ?? false,
        },
      });
      const latestSiteVersionId = runtime?.latest_runtime_site_version_id ?? null;

      return {
        site_id: siteId,
        domain: toTextOrNull(site.domain),
        site_status: status,
        migration_status: migration.effective_status,
        latest_runtime_state: runtime?.latest_runtime_state ?? null,
        latest_site_version_id: latestSiteVersionId,
        preview_url: latestSiteVersionId ? `/api/gnr8/runtime/versions/${latestSiteVersionId}/preview` : null,
        live_url: toHttpsLiveUrl(toTextOrNull(site.domain)),
      };
    })
    .filter((site): site is ClientDashboardSiteRow => site != null);

  const liveSites = siteRows.filter((site) => site.migration_status === "LIVE").length;
  const needsAttentionSites = siteRows.filter(
    (site) => site.migration_status === "NOT_STARTED" || site.migration_status === "PREVIEW_READY" || site.migration_status === "ERROR",
  ).length;

  return {
    client: {
      client_id: clientId,
      client_name: toTextOrNull(clientOrg.name),
    },
    agency: {
      agency_id: agencyId,
      agency_name: toTextOrNull(agency?.name),
    },
    summary: {
      total_sites: siteRows.length,
      live_sites: liveSites,
      needs_attention_sites: needsAttentionSites,
    },
    site_rows: siteRows,
  };
}
