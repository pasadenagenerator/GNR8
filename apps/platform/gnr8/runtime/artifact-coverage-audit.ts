import { normalizePagePath } from "@/gnr8/runtime/deterministic";
import { Pool } from "pg";

type FallbackDependenceRisk = "low" | "medium" | "high";

export type HostCoverageReport = {
  host: string;
  siteId: string | null;
  siteResolution: "host_match" | "fallback_latest_site" | "none";
  activePointerExists: boolean;
  activeSiteVersionId: string | null;
  activeArtifactId: string | null;
  activeArtifactExists: boolean;
  rootPathCovered: boolean;
  knownPaths: string[];
  coveredKnownPaths: string[];
  missingKnownPaths: string[];
  artifactOnlyWouldFailPaths: string[];
  fallbackDependenceRisk: FallbackDependenceRisk;
  artifactOnlyReady: boolean;
  reasonCodes: string[];
};

export type ArtifactCoverageAuditReport = {
  generatedAt: string;
  targetHost: string | null;
  totals: {
    hosts: number;
    artifactOnlyReadyHosts: number;
    hostsWithFallbackResolution: number;
    hostsWithMissingRootPath: number;
    hostsWithMissingKnownPaths: number;
    hostsWithNoActivePointer: number;
  };
  hosts: HostCoverageReport[];
};

let auditPool: Pool | null = null;

function getAuditPool(): Pool {
  if (auditPool) return auditPool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for artifact coverage audit.");
  }

  auditPool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  return auditPool;
}

function normalizeHost(host: string | null | undefined): string {
  return String(host ?? "").trim().toLowerCase();
}

function getRisk(input: {
  siteResolution: HostCoverageReport["siteResolution"];
  activePointerExists: boolean;
  activeArtifactExists: boolean;
  rootPathCovered: boolean;
  missingKnownPaths: string[];
}): FallbackDependenceRisk {
  if (!input.activePointerExists || !input.activeArtifactExists || !input.rootPathCovered) return "high";
  if (input.siteResolution === "fallback_latest_site" || input.missingKnownPaths.length > 0) return "medium";
  return "low";
}

export async function runArtifactCoverageAudit(input: { host?: string | null } = {}): Promise<ArtifactCoverageAuditReport> {
  const pool = getAuditPool();
  const client = await pool.connect();
  try {
    const explicitHost = normalizeHost(input.host);
    const hosts = explicitHost
      ? [explicitHost]
      : (
          await client.query<{ host: string }>(
            `
            select distinct lower(source_host)::text as host
            from public.gnr8_runtime_sites
            where source_host is not null and length(trim(source_host)) > 0
            order by host asc
            `,
          )
        ).rows.map((r) => r.host);

    const hostReports: HostCoverageReport[] = [];
    for (const host of hosts) {
      const resolvedSite = await client.query<{
        site_id: string;
        site_resolution: "host_match" | "fallback_latest_site";
        active_site_version_id: string | null;
        artifact_id: string | null;
      }>(
        `
        with candidate_site as (
          select id
          from public.gnr8_runtime_sites
          where source_host is not null and lower(source_host) = $1::text
          order by created_at desc
          limit 1
        ), fallback_site as (
          select id
          from public.gnr8_runtime_sites
          order by created_at desc
          limit 1
        ), resolved_site as (
          select id, 'host_match'::text as site_resolution from candidate_site
          union all
          select id, 'fallback_latest_site'::text as site_resolution
          from fallback_site
          where not exists (select 1 from candidate_site)
        )
        select
          s.id::text as site_id,
          s.site_resolution::text as site_resolution,
          p.active_site_version_id::text as active_site_version_id,
          p.active_artifact_id::text as artifact_id
        from resolved_site s
        left join public.gnr8_runtime_active_pointers p on p.site_id = s.id
        limit 1
        `,
        [host],
      );

      const resolved = resolvedSite.rows[0];
      if (!resolved) {
        hostReports.push({
          host,
          siteId: null,
          siteResolution: "none",
          activePointerExists: false,
          activeSiteVersionId: null,
          activeArtifactId: null,
          activeArtifactExists: false,
          rootPathCovered: false,
          knownPaths: [],
          coveredKnownPaths: [],
          missingKnownPaths: [],
          artifactOnlyWouldFailPaths: ["/"],
          fallbackDependenceRisk: "high",
          artifactOnlyReady: false,
          reasonCodes: ["no_runtime_site"],
        });
        continue;
      }

      const activePointerExists = !!resolved.active_site_version_id && !!resolved.artifact_id;
      const knownPaths = resolved.active_site_version_id
        ? (
            await client.query<{ path: string }>(
              `
              select distinct path::text as path
              from public.gnr8_runtime_page_versions
              where site_version_id = $1::uuid
              order by path asc
              `,
              [resolved.active_site_version_id],
            )
          ).rows.map((row) => normalizePagePath(row.path))
        : [];

      const uniqueKnownPaths = [...new Set(knownPaths)].sort((a, b) => a.localeCompare(b));

      const artifact = resolved.artifact_id
        ? (
            await client.query<{
              id: string;
              site_id: string;
              site_version_id: string;
              html_by_path: Record<string, string>;
            }>(
              `
              select
                id::text as id,
                site_id::text as site_id,
                site_version_id::text as site_version_id,
                html_by_path
              from public.gnr8_runtime_artifacts
              where id = $1::uuid
              limit 1
              `,
              [resolved.artifact_id],
            )
          ).rows[0] ?? null
        : null;
      const activeArtifactExists = !!artifact;
      const artifactHtmlByPath = artifact?.html_by_path ?? {};
      const artifactPaths = Object.keys(artifactHtmlByPath).map((p) => normalizePagePath(p));
      const artifactPathSet = new Set(artifactPaths);
      const rootPathCovered = activeArtifactExists && String(artifactHtmlByPath["/"] ?? "").trim().length > 0;

      const coveredKnownPaths = uniqueKnownPaths.filter((path) => artifactPathSet.has(path));
      const missingKnownPaths = uniqueKnownPaths.filter((path) => !artifactPathSet.has(path));
      const artifactOnlyWouldFailPaths = [...new Set([...(rootPathCovered ? [] : ["/"]), ...missingKnownPaths])].sort((a, b) =>
        a.localeCompare(b),
      );

      const reasonCodes: string[] = [];
      if (resolved.site_resolution === "fallback_latest_site") reasonCodes.push("host_resolution_fallback_latest_site");
      if (!activePointerExists) reasonCodes.push("no_active_pointer");
      if (!activeArtifactExists) reasonCodes.push("active_artifact_missing");
      if (!rootPathCovered) reasonCodes.push("missing_root_path");
      if (missingKnownPaths.length > 0) reasonCodes.push("known_paths_missing_from_artifact");

      const artifactOnlyReady =
        activePointerExists && activeArtifactExists && rootPathCovered && missingKnownPaths.length === 0;
      const fallbackDependenceRisk = getRisk({
        siteResolution: resolved.site_resolution,
        activePointerExists,
        activeArtifactExists,
        rootPathCovered,
        missingKnownPaths,
      });

      hostReports.push({
        host,
        siteId: resolved.site_id,
        siteResolution: resolved.site_resolution,
        activePointerExists,
        activeSiteVersionId: resolved.active_site_version_id,
        activeArtifactId: resolved.artifact_id,
        activeArtifactExists,
        rootPathCovered,
        knownPaths: uniqueKnownPaths,
        coveredKnownPaths,
        missingKnownPaths,
        artifactOnlyWouldFailPaths,
        fallbackDependenceRisk,
        artifactOnlyReady,
        reasonCodes,
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      targetHost: explicitHost || null,
      totals: {
        hosts: hostReports.length,
        artifactOnlyReadyHosts: hostReports.filter((report) => report.artifactOnlyReady).length,
        hostsWithFallbackResolution: hostReports.filter((report) => report.siteResolution === "fallback_latest_site").length,
        hostsWithMissingRootPath: hostReports.filter((report) => !report.rootPathCovered).length,
        hostsWithMissingKnownPaths: hostReports.filter((report) => report.missingKnownPaths.length > 0).length,
        hostsWithNoActivePointer: hostReports.filter((report) => !report.activePointerExists).length,
      },
      hosts: hostReports,
    };
  } finally {
    client.release();
  }
}
