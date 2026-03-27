import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { PoolClient } from "pg";

import { ensureRuntimeTables } from "@/gnr8/runtime/runtime-store";
import { getSuperadminPool } from "@/src/superadmin/db";

const DEFAULT_HOME_AGENCY_ID = "00000000-0000-4000-8000-000000000001";

type SiteStatus = "draft" | "migrating" | "shadow" | "live";
type BillingScope = "agency" | "client";

type RuntimeSiteRollup = {
  siteId: string;
  versionsTotal: number;
  unboundVersions: number;
  existingOwnershipSiteId: string | null;
  hasPublishedVersion: boolean;
  hasMigrationProgress: boolean;
  hasProductionBinding: boolean;
  hasShadowBinding: boolean;
  hasProductionArtifact: boolean;
  hasShadowArtifact: boolean;
  activeHosts: string[];
  sourceHosts: string[];
};

type OrganizationRow = {
  id: string;
  agency_id: string;
  organization_type: string;
};

type BackfillDecision = {
  runtimeSiteId: string;
  ownershipSiteId: string | null;
  shouldCreateSite: boolean;
  createdSiteId: string | null;
  status: SiteStatus;
  billingScope: BillingScope;
  domain: string | null;
  agencyId: string | null;
  orgId: string | null;
  unresolvedReasons: string[];
};

export type OwnershipBackfillActivationOptions = {
  dryRun?: boolean;
  reportPath?: string;
};

export type OwnershipBackfillActivationResult = {
  generatedAt: string;
  dryRun: boolean;
  assumptions: string[];
  totals: {
    runtimeSiteVersionsScanned: number;
    runtimeSiteVersionsBoundBefore: number;
    runtimeSiteVersionsBoundAfter: number;
    ownershipSiteBindingsApplied: number;
    runtimeSitesScanned: number;
    sitesCreated: number;
    migrationJobsBackfilled: number;
    unresolvedRecords: number;
  };
  unresolved: Array<{ runtimeSiteId: string; reasons: string[] }>;
  manualFollowUpCandidates: Array<{ runtimeSiteId: string; domain: string | null; reasons: string[] }>;
  migrationJobs: {
    tablePresent: boolean;
    columns: string[];
    agencyBackfilled: number;
    siteBackfilled: number;
    ownerTypeBackfilled: number;
    ownerTypeClientPromoted: number;
  };
  reportPath: string;
};

async function tableExists(client: PoolClient, tableName: string): Promise<boolean> {
  const res = await client.query<{ exists: boolean }>(
    `
    select to_regclass($1::text) is not null as exists
    `,
    [tableName],
  );
  return !!res.rows[0]?.exists;
}

async function getTableColumns(client: PoolClient, tableName: string): Promise<Set<string>> {
  const [schema, table] = tableName.split(".");
  const res = await client.query<{ column_name: string }>(
    `
    select column_name
    from information_schema.columns
    where table_schema = $1::text
      and table_name = $2::text
    `,
    [schema, table],
  );
  return new Set(res.rows.map((r) => r.column_name));
}

function normalizeHost(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function pickDomain(rollup: RuntimeSiteRollup): string | null {
  const active = [...rollup.activeHosts].map(normalizeHost).filter((v): v is string => !!v).sort((a, b) => a.localeCompare(b));
  if (active.length > 0) return active[0];

  const source = [...rollup.sourceHosts].map(normalizeHost).filter((v): v is string => !!v).sort((a, b) => a.localeCompare(b));
  return source[0] ?? null;
}

function pickDecision(input: {
  rollup: RuntimeSiteRollup;
  homeAgencyId: string;
  homeAgencyOrgId: string | null;
  singletonClientOrgId: string | null;
}): Omit<BackfillDecision, "runtimeSiteId" | "ownershipSiteId" | "shouldCreateSite" | "createdSiteId"> {
  const { rollup, homeAgencyId, homeAgencyOrgId, singletonClientOrgId } = input;
  const domain = pickDomain(rollup);

  const hasProductionSignal = rollup.hasProductionBinding || rollup.hasProductionArtifact || rollup.hasPublishedVersion;
  const productionCandidate = !!domain && hasProductionSignal;
  const shadowCandidate = rollup.hasShadowBinding || rollup.hasShadowArtifact;
  const migrationCandidate = rollup.hasMigrationProgress && !productionCandidate && !domain;

  let status: SiteStatus = "draft";
  let billingScope: BillingScope = "agency";
  let orgId: string | null = homeAgencyOrgId;
  let agencyId: string | null = homeAgencyId;
  const unresolvedReasons: string[] = [];

  if (productionCandidate) {
    if (singletonClientOrgId) {
      status = "live";
      billingScope = "client";
      orgId = singletonClientOrgId;
      agencyId = homeAgencyId;
    } else {
      status = "draft";
      billingScope = "agency";
      orgId = homeAgencyOrgId;
      unresolvedReasons.push("production_candidate_without_singleton_client_org");
    }
  } else if (shadowCandidate) {
    status = "shadow";
    billingScope = "agency";
    orgId = homeAgencyOrgId;
  } else if (migrationCandidate) {
    status = "migrating";
    billingScope = "agency";
    orgId = homeAgencyOrgId;
  }

  if (!orgId) unresolvedReasons.push("no_agency_org_available_for_safe_binding");

  return {
    status,
    billingScope,
    domain,
    agencyId,
    orgId,
    unresolvedReasons,
  };
}

async function loadRuntimeRollups(client: PoolClient): Promise<RuntimeSiteRollup[]> {
  const res = await client.query<{
    site_id: string;
    versions_total: number;
    unbound_versions: number;
    existing_ownership_site_id: string | null;
    has_published_version: boolean;
    has_migration_progress: boolean;
    has_production_binding: boolean;
    has_shadow_binding: boolean;
    has_production_artifact: boolean;
    has_shadow_artifact: boolean;
    active_hosts: string[] | null;
    source_hosts: string[] | null;
  }>(`
    with version_rollup as (
      select
        sv.site_id::text as site_id,
        count(*)::int as versions_total,
        count(*) filter (where sv.ownership_site_id is null)::int as unbound_versions,
        bool_or(sv.state = 'PUBLISHED') as has_published_version,
        bool_or(sv.state in ('DRAFT', 'READY_FOR_REVIEW', 'APPROVED')) as has_migration_progress
      from public.gnr8_runtime_site_versions sv
      group by sv.site_id
    ),
    ownership_rollup as (
      select distinct on (sv.site_id)
        sv.site_id::text as site_id,
        sv.ownership_site_id::text as existing_ownership_site_id
      from public.gnr8_runtime_site_versions sv
      where sv.ownership_site_id is not null
      order by sv.site_id, sv.created_at desc, sv.id::text desc
    ),
    host_rollup as (
      select
        hb.site_id::text as site_id,
        bool_or(hb.status = 'ACTIVE' and lower(coalesce(hb.binding_kind, '')) in ('canonical', 'manual', 'canary')) as has_production_binding,
        bool_or(hb.status = 'ACTIVE' and lower(coalesce(hb.binding_kind, '')) = 'shadow') as has_shadow_binding,
        array_remove(
          array_agg(distinct case when hb.status = 'ACTIVE' and length(trim(coalesce(hb.host, ''))) > 0 then lower(trim(hb.host)) else null end),
          null
        )::text[] as active_hosts
      from public.gnr8_runtime_host_bindings hb
      group by hb.site_id
    ),
    artifact_rollup as (
      select
        sv.site_id::text as site_id,
        bool_or(lower(coalesce(ra.publish_stage, '')) = 'production') as has_production_artifact,
        bool_or(lower(coalesce(ra.publish_stage, '')) = 'shadow') as has_shadow_artifact
      from public.gnr8_runtime_site_versions sv
      left join public.gnr8_runtime_artifacts ra on ra.site_version_id = sv.id
      group by sv.site_id
    ),
    source_rollup as (
      select
        rs.id::text as site_id,
        array_remove(
          array_agg(distinct case when length(trim(coalesce(rs.source_host, ''))) > 0 then lower(trim(rs.source_host)) else null end),
          null
        )::text[] as source_hosts
      from public.gnr8_runtime_sites rs
      group by rs.id
    )
    select
      v.site_id,
      v.versions_total,
      v.unbound_versions,
      o.existing_ownership_site_id,
      v.has_published_version,
      v.has_migration_progress,
      coalesce(h.has_production_binding, false) as has_production_binding,
      coalesce(h.has_shadow_binding, false) as has_shadow_binding,
      coalesce(a.has_production_artifact, false) as has_production_artifact,
      coalesce(a.has_shadow_artifact, false) as has_shadow_artifact,
      h.active_hosts,
      s.source_hosts
    from version_rollup v
    left join ownership_rollup o on o.site_id = v.site_id
    left join host_rollup h on h.site_id = v.site_id
    left join artifact_rollup a on a.site_id = v.site_id
    left join source_rollup s on s.site_id = v.site_id
    order by v.site_id asc
  `);

  return res.rows.map((row) => ({
    siteId: row.site_id,
    versionsTotal: Number(row.versions_total || 0),
    unboundVersions: Number(row.unbound_versions || 0),
    existingOwnershipSiteId: row.existing_ownership_site_id,
    hasPublishedVersion: !!row.has_published_version,
    hasMigrationProgress: !!row.has_migration_progress,
    hasProductionBinding: !!row.has_production_binding,
    hasShadowBinding: !!row.has_shadow_binding,
    hasProductionArtifact: !!row.has_production_artifact,
    hasShadowArtifact: !!row.has_shadow_artifact,
    activeHosts: row.active_hosts ?? [],
    sourceHosts: row.source_hosts ?? [],
  }));
}

function toMarkdownReport(result: OwnershipBackfillActivationResult): string {
  const lines: string[] = [];
  lines.push("# Ownership Backfill Activation Report");
  lines.push("");
  lines.push(`- Generated at: ${result.generatedAt}`);
  lines.push(`- Mode: ${result.dryRun ? "dry-run" : "apply"}`);
  lines.push("");
  lines.push("## Totals");
  lines.push("");
  lines.push(`- Runtime site versions scanned: ${result.totals.runtimeSiteVersionsScanned}`);
  lines.push(`- Runtime site versions bound (before): ${result.totals.runtimeSiteVersionsBoundBefore}`);
  lines.push(`- Runtime site versions bound (after): ${result.totals.runtimeSiteVersionsBoundAfter}`);
  lines.push(`- Ownership site bindings applied: ${result.totals.ownershipSiteBindingsApplied}`);
  lines.push(`- Runtime sites scanned: ${result.totals.runtimeSitesScanned}`);
  lines.push(`- Site rows created: ${result.totals.sitesCreated}`);
  lines.push(`- Migration jobs backfilled: ${result.totals.migrationJobsBackfilled}`);
  lines.push(`- Unresolved records: ${result.totals.unresolvedRecords}`);
  lines.push("");
  lines.push("## Assumptions Used");
  lines.push("");
  for (const assumption of result.assumptions) {
    lines.push(`- ${assumption}`);
  }

  lines.push("");
  lines.push("## Migration Jobs Backfill");
  lines.push("");
  lines.push(`- migration_jobs table present: ${result.migrationJobs.tablePresent ? "yes" : "no"}`);
  lines.push(`- columns observed: ${result.migrationJobs.columns.length > 0 ? result.migrationJobs.columns.join(", ") : "n/a"}`);
  lines.push(`- agency_id backfilled: ${result.migrationJobs.agencyBackfilled}`);
  lines.push(`- site_id backfilled: ${result.migrationJobs.siteBackfilled}`);
  lines.push(`- migration_owner_type defaulted to agency: ${result.migrationJobs.ownerTypeBackfilled}`);
  lines.push(`- migration_owner_type promoted to client: ${result.migrationJobs.ownerTypeClientPromoted}`);

  lines.push("");
  lines.push("## Manual Follow-Up Candidates");
  lines.push("");
  if (result.manualFollowUpCandidates.length === 0) {
    lines.push("- none");
  } else {
    for (const item of result.manualFollowUpCandidates) {
      lines.push(`- runtime_site_id=${item.runtimeSiteId} domain=${item.domain ?? "-"} reasons=${item.reasons.join(",")}`);
    }
  }

  lines.push("");
  lines.push("## Unresolved Records");
  lines.push("");
  if (result.unresolved.length === 0) {
    lines.push("- none");
  } else {
    for (const unresolved of result.unresolved) {
      lines.push(`- runtime_site_id=${unresolved.runtimeSiteId} reasons=${unresolved.reasons.join(",")}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

async function loadOrganizationContext(client: PoolClient): Promise<{
  homeAgencyId: string;
  homeAgencyOrgId: string | null;
  singletonClientOrgId: string | null;
}> {
  let homeAgencyId = DEFAULT_HOME_AGENCY_ID;

  const hasAgencies = await tableExists(client, "public.agencies");
  if (hasAgencies) {
    const home = await client.query<{ id: string }>(
      `
      select id::text as id
      from public.agencies
      where is_home_agency = true
      order by created_at asc
      limit 1
      `,
    );
    if (home.rows[0]?.id) homeAgencyId = home.rows[0].id;
  }

  const hasOrganizations = await tableExists(client, "public.organizations");
  if (!hasOrganizations) {
    return {
      homeAgencyId,
      homeAgencyOrgId: null,
      singletonClientOrgId: null,
    };
  }

  const columns = await getTableColumns(client, "public.organizations");
  if (!columns.has("id") || !columns.has("agency_id") || !columns.has("organization_type")) {
    return {
      homeAgencyId,
      homeAgencyOrgId: null,
      singletonClientOrgId: null,
    };
  }

  const orgRows = await client.query<OrganizationRow>(
    `
    select id::text as id, agency_id::text as agency_id, organization_type::text as organization_type
    from public.organizations
    order by created_at asc, id asc
    `,
  );

  const homeAgencyOrgs = orgRows.rows.filter((row) => row.agency_id === homeAgencyId && row.organization_type === "agency");
  const homeClientOrgs = orgRows.rows.filter((row) => row.agency_id === homeAgencyId && row.organization_type === "client");

  return {
    homeAgencyId,
    homeAgencyOrgId: homeAgencyOrgs[0]?.id ?? null,
    singletonClientOrgId: homeClientOrgs.length === 1 ? homeClientOrgs[0]!.id : null,
  };
}

async function backfillMigrationJobs(input: {
  client: PoolClient;
  dryRun: boolean;
}): Promise<OwnershipBackfillActivationResult["migrationJobs"] & { totalUpdated: number }> {
  const hasMigrationJobs = await tableExists(input.client, "public.migration_jobs");
  if (!hasMigrationJobs) {
    return {
      tablePresent: false,
      columns: [],
      agencyBackfilled: 0,
      siteBackfilled: 0,
      ownerTypeBackfilled: 0,
      ownerTypeClientPromoted: 0,
      totalUpdated: 0,
    };
  }

  const columnsSet = await getTableColumns(input.client, "public.migration_jobs");
  const columns = [...columnsSet].sort((a, b) => a.localeCompare(b));

  let agencyBackfilled = 0;
  let siteBackfilled = 0;
  let ownerTypeBackfilled = 0;
  let ownerTypeClientPromoted = 0;

  if (columnsSet.has("agency_id")) {
    if (input.dryRun) {
      const count = await input.client.query<{ count: string }>(
        `
        select count(*)::text as count
        from public.migration_jobs
        where agency_id is null
        `,
      );
      agencyBackfilled = Number(count.rows[0]?.count ?? "0");
    } else {
      const update = await input.client.query(
        `
        update public.migration_jobs
        set agency_id = $1::uuid
        where agency_id is null
        `,
        [DEFAULT_HOME_AGENCY_ID],
      );
      agencyBackfilled = update.rowCount ?? 0;
    }
  }

  const supportsSiteBackfill = columnsSet.has("site_id") && (columnsSet.has("site_version_id") || columnsSet.has("runtime_site_id"));
  if (supportsSiteBackfill && columnsSet.has("site_id")) {
    if (columnsSet.has("site_version_id")) {
      if (input.dryRun) {
        const count = await input.client.query<{ count: string }>(
          `
          select count(*)::text as count
          from public.migration_jobs mj
          join public.gnr8_runtime_site_versions rsv on rsv.id = mj.site_version_id
          where mj.site_id is null
            and rsv.ownership_site_id is not null
          `,
        );
        siteBackfilled += Number(count.rows[0]?.count ?? "0");
      } else {
        const update = await input.client.query(
          `
          update public.migration_jobs mj
          set site_id = rsv.ownership_site_id
          from public.gnr8_runtime_site_versions rsv
          where mj.site_id is null
            and mj.site_version_id = rsv.id
            and rsv.ownership_site_id is not null
          `,
        );
        siteBackfilled += update.rowCount ?? 0;
      }
    }

    if (columnsSet.has("runtime_site_id")) {
      if (input.dryRun) {
        const count = await input.client.query<{ count: string }>(
          `
          with runtime_site_owner as (
            select distinct on (site_id)
              site_id::text as runtime_site_id,
              ownership_site_id
            from public.gnr8_runtime_site_versions
            where ownership_site_id is not null
            order by site_id, created_at desc, id::text desc
          )
          select count(*)::text as count
          from public.migration_jobs mj
          join runtime_site_owner rso on rso.runtime_site_id = mj.runtime_site_id
          where mj.site_id is null
            and rso.ownership_site_id is not null
          `,
        );
        siteBackfilled += Number(count.rows[0]?.count ?? "0");
      } else {
        const update = await input.client.query(
          `
          with runtime_site_owner as (
            select distinct on (site_id)
              site_id::text as runtime_site_id,
              ownership_site_id
            from public.gnr8_runtime_site_versions
            where ownership_site_id is not null
            order by site_id, created_at desc, id::text desc
          )
          update public.migration_jobs mj
          set site_id = rso.ownership_site_id
          from runtime_site_owner rso
          where mj.site_id is null
            and mj.runtime_site_id = rso.runtime_site_id
            and rso.ownership_site_id is not null
          `,
        );
        siteBackfilled += update.rowCount ?? 0;
      }
    }
  }

  if (columnsSet.has("migration_owner_type")) {
    if (input.dryRun) {
      const count = await input.client.query<{ count: string }>(
        `
        select count(*)::text as count
        from public.migration_jobs
        where migration_owner_type is null
        `,
      );
      ownerTypeBackfilled = Number(count.rows[0]?.count ?? "0");
    } else {
      const update = await input.client.query(
        `
        update public.migration_jobs
        set migration_owner_type = 'agency'::public.migration_owner_type_enum
        where migration_owner_type is null
        `,
      );
      ownerTypeBackfilled = update.rowCount ?? 0;
    }

    if (columnsSet.has("site_id")) {
      if (input.dryRun) {
        const count = await input.client.query<{ count: string }>(
          `
          select count(*)::text as count
          from public.migration_jobs mj
          join public.sites s on s.id = mj.site_id
          where s.billing_scope = 'client'::public.billing_scope_enum
            and s.status = 'live'::public.site_status_enum
            and mj.migration_owner_type <> 'client'::public.migration_owner_type_enum
          `,
        );
        ownerTypeClientPromoted = Number(count.rows[0]?.count ?? "0");
      } else {
        const update = await input.client.query(
          `
          update public.migration_jobs mj
          set migration_owner_type = 'client'::public.migration_owner_type_enum
          from public.sites s
          where s.id = mj.site_id
            and s.billing_scope = 'client'::public.billing_scope_enum
            and s.status = 'live'::public.site_status_enum
            and mj.migration_owner_type <> 'client'::public.migration_owner_type_enum
          `,
        );
        ownerTypeClientPromoted = update.rowCount ?? 0;
      }
    }
  }

  return {
    tablePresent: true,
    columns,
    agencyBackfilled,
    siteBackfilled,
    ownerTypeBackfilled,
    ownerTypeClientPromoted,
    totalUpdated: agencyBackfilled + siteBackfilled + ownerTypeBackfilled + ownerTypeClientPromoted,
  };
}

export async function runOwnershipBackfillActivation(
  options: OwnershipBackfillActivationOptions = {},
): Promise<OwnershipBackfillActivationResult> {
  const dryRun = options.dryRun ?? true;
  const reportPath = options.reportPath ?? path.resolve(process.cwd(), "gnr8/platform-audits/ownership-backfill-activation-report.md");

  await ensureRuntimeTables();

  const pool = getSuperadminPool();
  const client = await pool.connect();

  try {
    const hasSitesTable = await tableExists(client, "public.sites");
    if (!hasSitesTable) {
      throw new Error("public.sites table is required. Run ownership foundation migration first.");
    }

    const beforeCounts = await client.query<{ total_versions: string; bound_versions: string }>(
      `
      select
        count(*)::text as total_versions,
        count(*) filter (where ownership_site_id is not null)::text as bound_versions
      from public.gnr8_runtime_site_versions
      `,
    );

    const runtimeSiteVersionsScanned = Number(beforeCounts.rows[0]?.total_versions ?? "0");
    const runtimeSiteVersionsBoundBefore = Number(beforeCounts.rows[0]?.bound_versions ?? "0");

    const orgContext = await loadOrganizationContext(client);
    const rollups = await loadRuntimeRollups(client);

    const unresolved: OwnershipBackfillActivationResult["unresolved"] = [];
    const manualFollowUpCandidates: OwnershipBackfillActivationResult["manualFollowUpCandidates"] = [];

    let sitesCreated = 0;
    let ownershipSiteBindingsApplied = 0;

    if (!dryRun) {
      await client.query("begin");
    }

    for (const rollup of rollups) {
      const decisionBase = pickDecision({
        rollup,
        homeAgencyId: orgContext.homeAgencyId,
        homeAgencyOrgId: orgContext.homeAgencyOrgId,
        singletonClientOrgId: orgContext.singletonClientOrgId,
      });

      let ownershipSiteId = rollup.existingOwnershipSiteId;
      let createdSiteId: string | null = null;
      const shouldCreateSite = !ownershipSiteId;

      const decision: BackfillDecision = {
        runtimeSiteId: rollup.siteId,
        ownershipSiteId,
        shouldCreateSite,
        createdSiteId,
        ...decisionBase,
      };

      if (!decision.orgId || !decision.agencyId) {
        unresolved.push({
          runtimeSiteId: rollup.siteId,
          reasons: [...decision.unresolvedReasons],
        });
        manualFollowUpCandidates.push({
          runtimeSiteId: rollup.siteId,
          domain: decision.domain,
          reasons: [...decision.unresolvedReasons],
        });
        continue;
      }

      if (decision.shouldCreateSite) {
        if (dryRun) {
          sitesCreated += 1;
          ownershipSiteId = `dryrun:${rollup.siteId}`;
        } else {
          const insert = await client.query<{ id: string }>(
            `
            insert into public.sites (org_id, agency_id, status, domain, billing_scope, is_template, billing_locked)
            values ($1::uuid, $2::uuid, $3::public.site_status_enum, $4::text, $5::public.billing_scope_enum, false, false)
            returning id::text as id
            `,
            [decision.orgId, decision.agencyId, decision.status, decision.domain, decision.billingScope],
          );
          createdSiteId = insert.rows[0]?.id ?? null;
          ownershipSiteId = createdSiteId;
          sitesCreated += createdSiteId ? 1 : 0;
        }
      }

      if (!ownershipSiteId) {
        unresolved.push({
          runtimeSiteId: rollup.siteId,
          reasons: [...decision.unresolvedReasons, "ownership_site_id_not_available_after_decision"],
        });
        manualFollowUpCandidates.push({
          runtimeSiteId: rollup.siteId,
          domain: decision.domain,
          reasons: [...decision.unresolvedReasons, "ownership_site_id_not_available_after_decision"],
        });
        continue;
      }

      if (dryRun) {
        ownershipSiteBindingsApplied += rollup.unboundVersions;
      } else {
        const update = await client.query(
          `
          update public.gnr8_runtime_site_versions
          set ownership_site_id = $2::uuid
          where site_id = $1::text
            and ownership_site_id is null
          `,
          [rollup.siteId, ownershipSiteId],
        );
        ownershipSiteBindingsApplied += update.rowCount ?? 0;
      }

      if (decision.unresolvedReasons.length > 0) {
        unresolved.push({
          runtimeSiteId: rollup.siteId,
          reasons: [...decision.unresolvedReasons],
        });
        manualFollowUpCandidates.push({
          runtimeSiteId: rollup.siteId,
          domain: decision.domain,
          reasons: [...decision.unresolvedReasons],
        });
      }
    }

    const migrationJobs = await backfillMigrationJobs({ client, dryRun });

    if (!dryRun) {
      await client.query("commit");
    }

    const runtimeSiteVersionsBoundAfter = dryRun
      ? runtimeSiteVersionsBoundBefore + ownershipSiteBindingsApplied
      : Number(
          (
            await client.query<{ count: string }>(
              `
              select count(*)::text as count
              from public.gnr8_runtime_site_versions
              where ownership_site_id is not null
              `,
            )
          ).rows[0]?.count ?? "0",
        );

    const result: OwnershipBackfillActivationResult = {
      generatedAt: new Date().toISOString(),
      dryRun,
      assumptions: [
        "Home agency defaults to agencies.is_home_agency=true, else canonical UUID 00000000-0000-4000-8000-000000000001.",
        "Client org ownership is only auto-assigned when exactly one client organization exists for the home agency.",
        "Production candidate requires both domain evidence and production lineage signal (published/production artifact/production binding).",
        "Ambiguous production ownership is downgraded to draft + agency billing and marked unresolved.",
        "migration_jobs backfill only updates inferable rows based on existing schema columns (site_version_id/runtime_site_id/site_id).",
      ],
      totals: {
        runtimeSiteVersionsScanned,
        runtimeSiteVersionsBoundBefore,
        runtimeSiteVersionsBoundAfter,
        ownershipSiteBindingsApplied,
        runtimeSitesScanned: rollups.length,
        sitesCreated,
        migrationJobsBackfilled: migrationJobs.totalUpdated,
        unresolvedRecords: unresolved.length,
      },
      unresolved,
      manualFollowUpCandidates,
      migrationJobs: {
        tablePresent: migrationJobs.tablePresent,
        columns: migrationJobs.columns,
        agencyBackfilled: migrationJobs.agencyBackfilled,
        siteBackfilled: migrationJobs.siteBackfilled,
        ownerTypeBackfilled: migrationJobs.ownerTypeBackfilled,
        ownerTypeClientPromoted: migrationJobs.ownerTypeClientPromoted,
      },
      reportPath,
    };

    const markdown = toMarkdownReport(result);
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, markdown, "utf8");

    return result;
  } catch (error) {
    if (!dryRun) {
      try {
        await client.query("rollback");
      } catch {
        // best effort rollback
      }
    }
    throw error;
  } finally {
    client.release();
  }
}
