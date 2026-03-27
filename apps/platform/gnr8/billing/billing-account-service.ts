import "server-only";

import type { PoolClient } from "pg";

import { getSuperadminPool } from "@/src/superadmin/db";

export type BillingAccount = {
  id: string;
  agencyId: string;
  stripeCustomerId: string | null;
  billingMode: "agency_pays" | "hybrid" | "client_direct";
  status: "active" | "suspended" | "delinquent";
  createdAt: string;
  updatedAt: string;
};

type BillingAccountRow = {
  id: string;
  agency_id: string;
  stripe_customer_id: string | null;
  billing_mode: BillingAccount["billingMode"];
  status: BillingAccount["status"];
  created_at: string;
  updated_at: string;
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

function mapBillingAccount(row: BillingAccountRow): BillingAccount {
  return {
    id: row.id,
    agencyId: row.agency_id,
    stripeCustomerId: row.stripe_customer_id,
    billingMode: row.billing_mode,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function resolveAgencyBillingAccount(agencyId: string): Promise<BillingAccount | null> {
  const normalizedAgencyId = String(agencyId ?? "").trim();
  if (!normalizedAgencyId) return null;

  const pool = getSuperadminPool();
  const client = await pool.connect();

  try {
    const hasBillingAccounts = await tableExists(client, "public.billing_accounts");
    if (!hasBillingAccounts) return null;

    const res = await client.query<BillingAccountRow>(
      `
      select
        id::text as id,
        agency_id::text as agency_id,
        stripe_customer_id,
        billing_mode,
        status,
        created_at::text as created_at,
        updated_at::text as updated_at
      from public.billing_accounts
      where agency_id = $1::uuid
      limit 1
      `,
      [normalizedAgencyId],
    );

    const row = res.rows[0];
    return row ? mapBillingAccount(row) : null;
  } finally {
    client.release();
  }
}
