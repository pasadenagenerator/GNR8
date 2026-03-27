import "server-only";

import type { PoolClient } from "pg";

import { resolveAgencyBillingAccount } from "@/gnr8/billing/billing-account-service";
import { resolveSiteCostCenters } from "@/gnr8/billing/cost-center-service";
import { getSuperadminPool } from "@/src/superadmin/db";

export type BillingContextForSite = {
  billingAccountId: string | null;
  agencyId: string;
  clientId: string | null;
  siteId: string;
  costCenterIds: {
    agencyCostCenterId: string | null;
    clientCostCenterId: string | null;
    siteCostCenterId: string | null;
  };
};

export type CreateMissingBillingFoundationForAgencyResult = {
  agencyId: string;
  billingAccountId: string | null;
  agencyCostCenterId: string | null;
  created: {
    billingAccount: number;
    agencyCostCenter: number;
    clientCostCenters: number;
    siteCostCenters: number;
  };
  skippedReason: string | null;
};

type SiteOwnershipRow = {
  site_id: string;
  agency_id: string;
  client_id: string | null;
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

export async function resolveBillingContextForSite(siteId: string): Promise<BillingContextForSite | null> {
  const normalizedSiteId = String(siteId ?? "").trim();
  if (!normalizedSiteId) return null;

  const pool = getSuperadminPool();
  const client = await pool.connect();

  try {
    const [hasSites, hasOrganizations] = await Promise.all([
      tableExists(client, "public.sites"),
      tableExists(client, "public.organizations"),
    ]);

    if (!hasSites || !hasOrganizations) return null;

    const siteRes = await client.query<SiteOwnershipRow>(
      `
      select
        s.id::text as site_id,
        s.agency_id::text as agency_id,
        case
          when o.organization_type::text = 'client' then s.org_id::text
          else null
        end as client_id
      from public.sites s
      left join public.organizations o on o.id = s.org_id
      where s.id = $1::uuid
      limit 1
      `,
      [normalizedSiteId],
    );

    const site = siteRes.rows[0];
    if (!site) return null;

    const [billingAccount, siteCostCenters] = await Promise.all([
      resolveAgencyBillingAccount(site.agency_id),
      resolveSiteCostCenters(site.site_id),
    ]);

    return {
      billingAccountId: billingAccount?.id ?? null,
      agencyId: site.agency_id,
      clientId: site.client_id,
      siteId: site.site_id,
      costCenterIds: {
        agencyCostCenterId: siteCostCenters.agency?.id ?? null,
        clientCostCenterId: siteCostCenters.client?.id ?? null,
        siteCostCenterId: siteCostCenters.site?.id ?? null,
      },
    };
  } finally {
    client.release();
  }
}

export async function createMissingBillingFoundationForAgency(
  agencyId: string,
): Promise<CreateMissingBillingFoundationForAgencyResult> {
  const normalizedAgencyId = String(agencyId ?? "").trim();
  if (!normalizedAgencyId) {
    return {
      agencyId: normalizedAgencyId,
      billingAccountId: null,
      agencyCostCenterId: null,
      created: {
        billingAccount: 0,
        agencyCostCenter: 0,
        clientCostCenters: 0,
        siteCostCenters: 0,
      },
      skippedReason: "agency_id_required",
    };
  }

  const pool = getSuperadminPool();
  const client = await pool.connect();

  try {
    const [hasAgencies, hasBillingAccounts, hasCostCenters, hasOrganizations, hasSites] = await Promise.all([
      tableExists(client, "public.agencies"),
      tableExists(client, "public.billing_accounts"),
      tableExists(client, "public.cost_centers"),
      tableExists(client, "public.organizations"),
      tableExists(client, "public.sites"),
    ]);

    if (!hasAgencies) {
      return {
        agencyId: normalizedAgencyId,
        billingAccountId: null,
        agencyCostCenterId: null,
        created: { billingAccount: 0, agencyCostCenter: 0, clientCostCenters: 0, siteCostCenters: 0 },
        skippedReason: "agencies_table_missing",
      };
    }

    if (!hasBillingAccounts || !hasCostCenters) {
      return {
        agencyId: normalizedAgencyId,
        billingAccountId: null,
        agencyCostCenterId: null,
        created: { billingAccount: 0, agencyCostCenter: 0, clientCostCenters: 0, siteCostCenters: 0 },
        skippedReason: "billing_foundation_tables_missing",
      };
    }

    await client.query("begin");

    const agencyExists = await client.query<{ exists: boolean }>(
      `
      select exists(
        select 1
        from public.agencies a
        where a.id = $1::uuid
      ) as exists
      `,
      [normalizedAgencyId],
    );

    if (!agencyExists.rows[0]?.exists) {
      await client.query("rollback");
      return {
        agencyId: normalizedAgencyId,
        billingAccountId: null,
        agencyCostCenterId: null,
        created: { billingAccount: 0, agencyCostCenter: 0, clientCostCenters: 0, siteCostCenters: 0 },
        skippedReason: "agency_not_found",
      };
    }

    const insertedBillingAccount = await client.query<{ id: string }>(
      `
      insert into public.billing_accounts (agency_id, billing_mode, status)
      values ($1::uuid, 'agency_pays', 'active')
      on conflict (agency_id) do nothing
      returning id::text as id
      `,
      [normalizedAgencyId],
    );

    const insertedAgencyCenter = await client.query<{ id: string }>(
      `
      insert into public.cost_centers (type, entity_id, parent_id)
      select 'agency', $1::uuid, null
      where not exists (
        select 1
        from public.cost_centers cc
        where cc.type = 'agency'
          and cc.entity_id = $1::uuid
      )
      returning id::text as id
      `,
      [normalizedAgencyId],
    );

    let insertedClientCenters = 0;
    if (hasOrganizations) {
      const insertedClients = await client.query(
        `
        insert into public.cost_centers (type, entity_id, parent_id)
        select
          'client',
          o.id,
          (
            select cc.id
            from public.cost_centers cc
            where cc.type = 'agency'
              and cc.entity_id = $1::uuid
            order by cc.created_at asc, cc.id asc
            limit 1
          )
        from public.organizations o
        where o.agency_id = $1::uuid
          and o.organization_type::text = 'client'
          and not exists (
            select 1
            from public.cost_centers cc
            where cc.type = 'client'
              and cc.entity_id = o.id
          )
        `,
        [normalizedAgencyId],
      );
      insertedClientCenters = insertedClients.rowCount ?? 0;
    }

    let insertedSiteCenters = 0;
    if (hasSites) {
      const insertedSites = await client.query(
        `
        insert into public.cost_centers (type, entity_id, parent_id)
        select
          'site',
          s.id,
          case
            when o.organization_type::text = 'client' then coalesce(
              (
                select cc.id
                from public.cost_centers cc
                where cc.type = 'client'
                  and cc.entity_id = s.org_id
                order by cc.created_at asc, cc.id asc
                limit 1
              ),
              (
                select cc.id
                from public.cost_centers cc
                where cc.type = 'agency'
                  and cc.entity_id = s.agency_id
                order by cc.created_at asc, cc.id asc
                limit 1
              )
            )
            else (
              select cc.id
              from public.cost_centers cc
              where cc.type = 'agency'
                and cc.entity_id = s.agency_id
              order by cc.created_at asc, cc.id asc
              limit 1
            )
          end as parent_id
        from public.sites s
        left join public.organizations o on o.id = s.org_id
        where s.agency_id = $1::uuid
          and not exists (
            select 1
            from public.cost_centers cc
            where cc.type = 'site'
              and cc.entity_id = s.id
          )
        `,
        [normalizedAgencyId],
      );
      insertedSiteCenters = insertedSites.rowCount ?? 0;
    }

    const billingAccountRes = await client.query<{ id: string }>(
      `
      select id::text as id
      from public.billing_accounts
      where agency_id = $1::uuid
      limit 1
      `,
      [normalizedAgencyId],
    );

    const agencyCostCenterRes = await client.query<{ id: string }>(
      `
      select id::text as id
      from public.cost_centers
      where type = 'agency'
        and entity_id = $1::uuid
      order by created_at asc, id asc
      limit 1
      `,
      [normalizedAgencyId],
    );

    await client.query("commit");

    return {
      agencyId: normalizedAgencyId,
      billingAccountId: billingAccountRes.rows[0]?.id ?? insertedBillingAccount.rows[0]?.id ?? null,
      agencyCostCenterId: agencyCostCenterRes.rows[0]?.id ?? insertedAgencyCenter.rows[0]?.id ?? null,
      created: {
        billingAccount: insertedBillingAccount.rowCount ?? 0,
        agencyCostCenter: insertedAgencyCenter.rowCount ?? 0,
        clientCostCenters: insertedClientCenters,
        siteCostCenters: insertedSiteCenters,
      },
      skippedReason: null,
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
