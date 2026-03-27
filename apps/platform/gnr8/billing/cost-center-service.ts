import "server-only";

import type { PoolClient } from "pg";

import { getSuperadminPool } from "@/src/superadmin/db";

export type CostCenterType = "agency" | "client" | "site" | "operation";

export type CostCenter = {
  id: string;
  type: CostCenterType;
  entityId: string;
  parentId: string | null;
  createdAt: string;
};

export type SiteCostCenterResolution = {
  agency: CostCenter | null;
  client: CostCenter | null;
  site: CostCenter | null;
};

type SiteBindingRow = {
  agency_cost_center_id: string | null;
  client_cost_center_id: string | null;
  site_cost_center_id: string | null;
};

type CostCenterRow = {
  id: string;
  type: CostCenterType;
  entity_id: string;
  parent_id: string | null;
  created_at: string;
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

function mapCostCenter(row: CostCenterRow): CostCenter {
  return {
    id: row.id,
    type: row.type,
    entityId: row.entity_id,
    parentId: row.parent_id,
    createdAt: row.created_at,
  };
}

async function loadCostCentersByIds(client: PoolClient, ids: string[]): Promise<Map<string, CostCenter>> {
  const uniqueIds = [...new Set(ids.map((id) => String(id ?? "").trim()).filter((id) => id.length > 0))];
  if (uniqueIds.length === 0) return new Map();

  const res = await client.query<CostCenterRow>(
    `
    select
      id::text as id,
      type,
      entity_id::text as entity_id,
      parent_id::text as parent_id,
      created_at::text as created_at
    from public.cost_centers
    where id = any($1::uuid[])
    `,
    [uniqueIds],
  );

  const map = new Map<string, CostCenter>();
  for (const row of res.rows) {
    map.set(row.id, mapCostCenter(row));
  }
  return map;
}

export async function resolveSiteCostCenters(siteId: string): Promise<SiteCostCenterResolution> {
  const normalizedSiteId = String(siteId ?? "").trim();
  if (!normalizedSiteId) {
    return { agency: null, client: null, site: null };
  }

  const pool = getSuperadminPool();
  const client = await pool.connect();

  try {
    const [hasCostCenters, hasSites, hasOrganizations] = await Promise.all([
      tableExists(client, "public.cost_centers"),
      tableExists(client, "public.sites"),
      tableExists(client, "public.organizations"),
    ]);

    if (!hasCostCenters || !hasSites || !hasOrganizations) {
      return { agency: null, client: null, site: null };
    }

    const binding = await client.query<SiteBindingRow>(
      `
      select
        (
          select cc.id::text
          from public.cost_centers cc
          where cc.type = 'agency'
            and cc.entity_id = s.agency_id
          order by cc.created_at asc, cc.id asc
          limit 1
        ) as agency_cost_center_id,
        (
          select cc.id::text
          from public.cost_centers cc
          where cc.type = 'client'
            and cc.entity_id = s.org_id
            and o.organization_type::text = 'client'
          order by cc.created_at asc, cc.id asc
          limit 1
        ) as client_cost_center_id,
        (
          select cc.id::text
          from public.cost_centers cc
          where cc.type = 'site'
            and cc.entity_id = s.id
          order by cc.created_at asc, cc.id asc
          limit 1
        ) as site_cost_center_id
      from public.sites s
      left join public.organizations o on o.id = s.org_id
      where s.id = $1::uuid
      limit 1
      `,
      [normalizedSiteId],
    );

    const row = binding.rows[0];
    if (!row) return { agency: null, client: null, site: null };

    const centerMap = await loadCostCentersByIds(client, [
      row.agency_cost_center_id ?? "",
      row.client_cost_center_id ?? "",
      row.site_cost_center_id ?? "",
    ]);

    return {
      agency: row.agency_cost_center_id ? centerMap.get(row.agency_cost_center_id) ?? null : null,
      client: row.client_cost_center_id ? centerMap.get(row.client_cost_center_id) ?? null : null,
      site: row.site_cost_center_id ? centerMap.get(row.site_cost_center_id) ?? null : null,
    };
  } finally {
    client.release();
  }
}
