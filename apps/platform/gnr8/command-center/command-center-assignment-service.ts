import "server-only";

import type { PoolClient } from "pg";

import { columnExistsCached, tableExistsCached } from "@/gnr8/db/schema-introspection-cache";
import { getSuperadminPool } from "@/src/superadmin/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CommandCenterClientOption = {
  client_id: string;
  client_name: string | null;
  agency_id: string | null;
  agency_name: string | null;
};

export type SiteAssignmentResult = {
  site_id: string;
  client_id: string;
  client_name: string | null;
  agency_id: string;
};

class CommandCenterAssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommandCenterAssignmentError";
  }
}

function normalizeUuid(value: string | null | undefined, fieldName: string): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new CommandCenterAssignmentError(`${fieldName} is required`);
  }
  if (!UUID_RE.test(normalized)) {
    throw new CommandCenterAssignmentError(`${fieldName} must be a valid UUID`);
  }
  return normalized;
}

export async function listClientOrganizationsForCommandCenter(
  options?: { dbClient?: PoolClient },
): Promise<CommandCenterClientOption[]> {
  const pool = options?.dbClient ? null : getSuperadminPool();
  const client = options?.dbClient ?? (await pool!.connect());
  const shouldReleaseClient = !options?.dbClient;

  try {
    const hasOrganizations = await tableExistsCached(client, "public.organizations");
    if (!hasOrganizations) return [];

    const [hasOrganizationType, hasAgencyId, hasName] = await Promise.all([
      columnExistsCached(client, "public.organizations", "organization_type"),
      columnExistsCached(client, "public.organizations", "agency_id"),
      columnExistsCached(client, "public.organizations", "name"),
    ]);

    if (!hasOrganizationType || !hasAgencyId) return [];

    const hasAgencies = await tableExistsCached(client, "public.agencies");
    const hasAgencyName = hasAgencies ? await columnExistsCached(client, "public.agencies", "name") : false;

    const clientNameSql = hasName ? "o.name::text as client_name" : "null::text as client_name";
    const agencyJoinSql = hasAgencies ? "left join public.agencies a on a.id = o.agency_id" : "";
    const agencyNameSql = hasAgencies && hasAgencyName ? "a.name::text as agency_name" : "null::text as agency_name";

    const rows = await client.query<CommandCenterClientOption>(
      `
        select
          o.id::text as client_id,
          ${clientNameSql},
          o.agency_id::text as agency_id,
          ${agencyNameSql}
        from public.organizations o
        ${agencyJoinSql}
        where o.organization_type::text = 'client'
        order by
          case when ${hasName ? "o.name" : "null"} is null then 1 else 0 end,
          ${hasName ? "o.name asc," : ""}
          o.created_at asc,
          o.id asc
      `,
    );

    return rows.rows;
  } finally {
    if (shouldReleaseClient) {
      client.release();
    }
  }
}

export async function assignSiteToClient(input: { siteId: string; clientId: string }): Promise<SiteAssignmentResult> {
  const siteId = normalizeUuid(input.siteId, "siteId");
  const clientId = normalizeUuid(input.clientId, "clientId");
  const pool = getSuperadminPool();
  const client = await pool.connect();

  try {
    const [hasSites, hasOrganizations] = await Promise.all([
      tableExistsCached(client, "public.sites"),
      tableExistsCached(client, "public.organizations"),
    ]);

    if (!hasSites) throw new CommandCenterAssignmentError("sites table does not exist in this environment");
    if (!hasOrganizations) throw new CommandCenterAssignmentError("organizations table does not exist in this environment");

    const [hasOrgType, hasOrgAgencyId, hasOrgName] = await Promise.all([
      columnExistsCached(client, "public.organizations", "organization_type"),
      columnExistsCached(client, "public.organizations", "agency_id"),
      columnExistsCached(client, "public.organizations", "name"),
    ]);
    if (!hasOrgType || !hasOrgAgencyId) {
      throw new CommandCenterAssignmentError("organizations table is missing required ownership columns");
    }

    const siteRes = await client.query<{ site_id: string; agency_id: string }>(
      `
        select
          s.id::text as site_id,
          s.agency_id::text as agency_id
        from public.sites s
        where s.id = $1::uuid
        limit 1
      `,
      [siteId],
    );
    if (!siteRes.rows[0]) throw new CommandCenterAssignmentError("Site not found");

    const clientNameSql = hasOrgName ? "o.name::text as client_name" : "null::text as client_name";
    const clientRes = await client.query<{
      client_id: string;
      client_name: string | null;
      agency_id: string;
      organization_type: string;
    }>(
      `
        select
          o.id::text as client_id,
          ${clientNameSql},
          o.agency_id::text as agency_id,
          o.organization_type::text as organization_type
        from public.organizations o
        where o.id = $1::uuid
        limit 1
      `,
      [clientId],
    );
    const targetClient = clientRes.rows[0];
    if (!targetClient) throw new CommandCenterAssignmentError("Client organization not found");
    if (targetClient.organization_type !== "client") {
      throw new CommandCenterAssignmentError("clientId must reference an organization with organization_type='client'");
    }

    if (targetClient.agency_id !== siteRes.rows[0].agency_id) {
      throw new CommandCenterAssignmentError("Client organization must belong to the same agency as the site");
    }

    const updateRes = await client.query<{ site_id: string; agency_id: string }>(
      `
        update public.sites s
        set org_id = $2::uuid
        where s.id = $1::uuid
        returning s.id::text as site_id, s.agency_id::text as agency_id
      `,
      [siteId, clientId],
    );

    const updated = updateRes.rows[0];
    if (!updated) {
      throw new CommandCenterAssignmentError("Failed to update site ownership");
    }

    return {
      site_id: updated.site_id,
      client_id: targetClient.client_id,
      client_name: targetClient.client_name,
      agency_id: updated.agency_id,
    };
  } finally {
    client.release();
  }
}
