import "server-only";

import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { getSuperadminPool } from "@/src/superadmin/db";
import { getSupabaseServiceRoleClient } from "@/src/supabase/service-role-server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ProvisionAgencyInput = {
  agencyName: string;
  agencySlug: string;
  ownerUserId: string;
  ownerRole?: "owner" | "admin" | "member";
  defaultClientName?: string | null;
  dryRun?: boolean;
};

export type ProvisionAgencyResult = {
  dryRun: boolean;
  agency: {
    id: string;
    name: string;
    slug: string;
  };
  agencyOrganization: {
    id: string;
    name: string;
  };
  bootstrapMembership: {
    user_id: string;
    role: "owner" | "admin" | "member";
  };
  billingAccount: {
    id: string;
    status: string;
    billing_mode: string;
  };
  agencyCostCenter: {
    id: string;
  };
  defaultClientOrganization: {
    id: string;
    name: string;
    cost_center_id: string | null;
  } | null;
};

export class AgencyProvisioningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgencyProvisioningError";
  }
}

export type CreateAgencyInput = {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerName?: string | null;
  defaultClientName?: string | null;
};

export type CreateAgencyResult = {
  agency: ProvisionAgencyResult["agency"];
  agencyOrganization: ProvisionAgencyResult["agencyOrganization"];
  billingAccount: ProvisionAgencyResult["billingAccount"];
  agencyCostCenter: ProvisionAgencyResult["agencyCostCenter"];
  defaultClientOrganization: ProvisionAgencyResult["defaultClientOrganization"];
  owner: {
    user_id: string;
    email: string;
    role: "owner";
    invite_status: "invited";
  };
};

type OrganizationType = "agency" | "client" | "internal";

export type OrganizationInsertPayload = {
  id: string;
  name: string;
  agency_id: string;
  organization_type: OrganizationType;
};

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function normalizeEmail(value: string | null | undefined): string {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) throw new AgencyProvisioningError("ownerEmail is required");
  const hasAt = normalized.includes("@");
  const hasDot = normalized.split("@")[1]?.includes(".") ?? false;
  if (!hasAt || !hasDot) throw new AgencyProvisioningError("ownerEmail must be a valid email address");
  return normalized;
}

function normalizeRole(value: string | null | undefined): "owner" | "admin" | "member" {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === "owner" || normalized === "admin" || normalized === "member") {
    return normalized;
  }
  throw new AgencyProvisioningError("ownerRole must be one of: owner, admin, member");
}

function normalizeUuid(value: string | null | undefined, fieldName: string): string {
  const normalized = normalizeText(value);
  if (!normalized) throw new AgencyProvisioningError(`${fieldName} is required`);
  if (!UUID_RE.test(normalized)) throw new AgencyProvisioningError(`${fieldName} must be a valid UUID`);
  return normalized;
}

function normalizeSlug(value: string | null | undefined): string {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) throw new AgencyProvisioningError("agencySlug is required");
  if (!SLUG_RE.test(normalized)) {
    throw new AgencyProvisioningError("agencySlug must contain lowercase letters, numbers, and single hyphen separators");
  }
  return normalized;
}

function createProvisioningId(): string {
  const id = randomUUID();
  if (!UUID_RE.test(id)) {
    throw new AgencyProvisioningError("failed to generate valid provisioning id");
  }
  return id;
}

export function buildOrganizationInsertPayload(input: {
  name: string;
  agencyId: string;
  organizationType: OrganizationType;
}): OrganizationInsertPayload {
  const name = normalizeText(input.name);
  if (!name) throw new AgencyProvisioningError("organization name is required");
  const agencyId = normalizeUuid(input.agencyId, "agencyId");
  return {
    id: createProvisioningId(),
    name,
    agency_id: agencyId,
    organization_type: input.organizationType,
  };
}

async function ensureAgencySlugAvailable(client: PoolClient, agencySlug: string): Promise<void> {
  const existing = await client.query<{ id: string }>(
    `
      select id::text as id
      from public.agencies
      where lower(slug) = lower($1::text)
      limit 1
    `,
    [agencySlug],
  );

  if (existing.rows[0]?.id) {
    throw new AgencyProvisioningError(`agency slug already exists: ${agencySlug}`);
  }
}

async function ensureOwnerEmailAvailable(ownerEmail: string): Promise<void> {
  const pool = getSuperadminPool();
  const client = await pool.connect();
  try {
    const existing = await client.query<{ id: string }>(
      `
        select id::text as id
        from auth.users
        where lower(email) = lower($1::text)
        limit 1
      `,
      [ownerEmail],
    );
    if (existing.rows[0]?.id) {
      throw new AgencyProvisioningError(`owner email already exists: ${ownerEmail}`);
    }
  } finally {
    client.release();
  }
}

export async function createAgency(input: CreateAgencyInput): Promise<CreateAgencyResult> {
  const agencyName = normalizeText(input.name);
  if (!agencyName) throw new AgencyProvisioningError("name is required");

  const agencySlug = normalizeSlug(input.slug);
  const ownerEmail = normalizeEmail(input.ownerEmail);
  const ownerName = normalizeText(input.ownerName ?? "");
  const defaultClientName = normalizeText(input.defaultClientName ?? "") || null;

  await ensureOwnerEmailAvailable(ownerEmail);

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    throw new AgencyProvisioningError("Supabase service role client is not configured");
  }

  const inviteResult = await supabase.auth.admin.inviteUserByEmail(ownerEmail, {
    data: ownerName ? { full_name: ownerName } : undefined,
  });

  if (inviteResult.error) {
    const message = String(inviteResult.error.message ?? "Failed to invite owner");
    if (message.toLowerCase().includes("already")) {
      throw new AgencyProvisioningError(`owner email already exists: ${ownerEmail}`);
    }
    throw new AgencyProvisioningError(`failed to invite owner: ${message}`);
  }

  const invitedUserId = normalizeText(inviteResult.data.user?.id);
  if (!UUID_RE.test(invitedUserId)) {
    throw new AgencyProvisioningError("failed to resolve invited owner user id");
  }

  try {
    const provisioned = await provisionAgency({
      agencyName,
      agencySlug,
      ownerUserId: invitedUserId,
      ownerRole: "owner",
      defaultClientName,
    });

    return {
      agency: provisioned.agency,
      agencyOrganization: provisioned.agencyOrganization,
      billingAccount: provisioned.billingAccount,
      agencyCostCenter: provisioned.agencyCostCenter,
      defaultClientOrganization: provisioned.defaultClientOrganization,
      owner: {
        user_id: invitedUserId,
        email: ownerEmail,
        role: "owner",
        invite_status: "invited",
      },
    };
  } catch (error) {
    const deleteResult = await supabase.auth.admin.deleteUser(invitedUserId);
    const baseMessage = error instanceof Error ? error.message : String(error);
    if (deleteResult.error) {
      throw new AgencyProvisioningError(
        `provisioning failed after invite; auth rollback failed for invited owner user ${invitedUserId} (${ownerEmail}). manual cleanup required (check auth.users and related rows before retry): ${baseMessage}`,
      );
    }
    throw new AgencyProvisioningError(
      `provisioning failed after invite; auth rollback completed via deleteUser for invited owner user ${invitedUserId} (${ownerEmail}). verify the user is absent in auth.users before retrying: ${baseMessage}`,
    );
  }
}

export async function provisionAgency(input: ProvisionAgencyInput): Promise<ProvisionAgencyResult> {
  const agencyName = normalizeText(input.agencyName);
  if (!agencyName) throw new AgencyProvisioningError("agencyName is required");

  const agencySlug = normalizeSlug(input.agencySlug);
  const ownerUserId = normalizeUuid(input.ownerUserId, "ownerUserId");
  const ownerRole = normalizeRole(input.ownerRole ?? "owner");
  const defaultClientName = normalizeText(input.defaultClientName ?? "") || null;
  const dryRun = !!input.dryRun;

  const pool = getSuperadminPool();
  const client = await pool.connect();

  try {
    await client.query("begin");

    await ensureAgencySlugAvailable(client, agencySlug);

    const agencyId = createProvisioningId();
    const agencyInsert = await client.query<{ id: string; name: string; slug: string }>(
      `
        insert into public.agencies (id, name, slug, is_home_agency)
        values ($1::uuid, $2::text, $3::text, false)
        returning id::text as id, name::text as name, slug::text as slug
      `,
      [agencyId, agencyName, agencySlug],
    );
    const agency = agencyInsert.rows[0];
    if (!agency) throw new AgencyProvisioningError("failed to create agency record");

    const agencyOrganizationInsertPayload = buildOrganizationInsertPayload({
      name: `${agencyName} Agency`,
      agencyId: agency.id,
      organizationType: "agency",
    });
    const agencyOrganizationInsert = await client.query<{ id: string; name: string }>(
      `
        insert into public.organizations (id, name, agency_id, organization_type)
        values ($1::uuid, $2::text, $3::uuid, $4::public.organization_type_enum)
        returning id::text as id, name::text as name
      `,
      [
        agencyOrganizationInsertPayload.id,
        agencyOrganizationInsertPayload.name,
        agencyOrganizationInsertPayload.agency_id,
        agencyOrganizationInsertPayload.organization_type,
      ],
    );
    const agencyOrganization = agencyOrganizationInsert.rows[0];
    if (!agencyOrganization) throw new AgencyProvisioningError("failed to create agency organization");

    const membershipId = createProvisioningId();
    await client.query(
      `
        insert into public.memberships (id, user_id, organization_id, org_id, role)
        values ($1::uuid, $2::uuid, $3::uuid, $3::uuid, $4::public.membership_role_enum)
        on conflict (organization_id, user_id)
        do update set
          role = excluded.role,
          org_id = excluded.org_id
      `,
      [membershipId, ownerUserId, agencyOrganization.id, ownerRole],
    );

    const billingAccountId = createProvisioningId();
    const billingAccountInsert = await client.query<{ id: string; status: string; billing_mode: string }>(
      `
        insert into public.billing_accounts (id, agency_id, billing_mode, status)
        values ($1::uuid, $2::uuid, 'agency_pays', 'active')
        on conflict (agency_id)
        do update set
          billing_mode = excluded.billing_mode,
          status = excluded.status,
          updated_at = now()
        returning id::text as id, status::text as status, billing_mode::text as billing_mode
      `,
      [billingAccountId, agency.id],
    );
    const billingAccount = billingAccountInsert.rows[0];
    if (!billingAccount) throw new AgencyProvisioningError("failed to create billing account");

    const agencyCostCenterId = createProvisioningId();
    const agencyCostCenterInsert = await client.query<{ id: string }>(
      `
        insert into public.cost_centers (id, type, entity_id, parent_id)
        values ($1::uuid, 'agency', $2::uuid, null)
        on conflict do nothing
        returning id::text as id
      `,
      [agencyCostCenterId, agency.id],
    );

    let resolvedAgencyCostCenterId = agencyCostCenterInsert.rows[0]?.id ?? null;
    if (!resolvedAgencyCostCenterId) {
      const existingCostCenter = await client.query<{ id: string }>(
        `
          select id::text as id
          from public.cost_centers
          where type = 'agency'
            and entity_id = $1::uuid
          order by created_at asc, id asc
          limit 1
        `,
        [agency.id],
      );
      resolvedAgencyCostCenterId = existingCostCenter.rows[0]?.id ?? null;
    }
    if (!resolvedAgencyCostCenterId) throw new AgencyProvisioningError("failed to create agency cost center");

    let defaultClientOrganization: ProvisionAgencyResult["defaultClientOrganization"] = null;
    if (defaultClientName) {
      const clientOrganizationInsertPayload = buildOrganizationInsertPayload({
        name: defaultClientName,
        agencyId: agency.id,
        organizationType: "client",
      });
      const clientOrgInsert = await client.query<{ id: string; name: string }>(
        `
          insert into public.organizations (id, name, agency_id, organization_type)
          values ($1::uuid, $2::text, $3::uuid, $4::public.organization_type_enum)
          returning id::text as id, name::text as name
        `,
        [
          clientOrganizationInsertPayload.id,
          clientOrganizationInsertPayload.name,
          clientOrganizationInsertPayload.agency_id,
          clientOrganizationInsertPayload.organization_type,
        ],
      );
      const createdClientOrg = clientOrgInsert.rows[0];
      if (!createdClientOrg) throw new AgencyProvisioningError("failed to create default client organization");

      const clientCostCenterInsertId = createProvisioningId();
      const clientCostCenterInsert = await client.query<{ id: string }>(
        `
          insert into public.cost_centers (id, type, entity_id, parent_id)
          values ($1::uuid, 'client', $2::uuid, $3::uuid)
          on conflict do nothing
          returning id::text as id
        `,
        [clientCostCenterInsertId, createdClientOrg.id, resolvedAgencyCostCenterId],
      );

      let clientCostCenterId = clientCostCenterInsert.rows[0]?.id ?? null;
      if (!clientCostCenterId) {
        const existingClientCostCenter = await client.query<{ id: string }>(
          `
            select id::text as id
            from public.cost_centers
            where type = 'client'
              and entity_id = $1::uuid
            order by created_at asc, id asc
            limit 1
          `,
          [createdClientOrg.id],
        );
        clientCostCenterId = existingClientCostCenter.rows[0]?.id ?? null;
      }

      defaultClientOrganization = {
        id: createdClientOrg.id,
        name: createdClientOrg.name,
        cost_center_id: clientCostCenterId,
      };
    }

    if (dryRun) {
      await client.query("rollback");
    } else {
      await client.query("commit");
    }

    return {
      dryRun,
      agency: {
        id: agency.id,
        name: agency.name,
        slug: agency.slug,
      },
      agencyOrganization: {
        id: agencyOrganization.id,
        name: agencyOrganization.name,
      },
      bootstrapMembership: {
        user_id: ownerUserId,
        role: ownerRole,
      },
      billingAccount: {
        id: billingAccount.id,
        status: billingAccount.status,
        billing_mode: billingAccount.billing_mode,
      },
      agencyCostCenter: {
        id: resolvedAgencyCostCenterId,
      },
      defaultClientOrganization,
    };
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // no-op
    }

    if (error instanceof AgencyProvisioningError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new AgencyProvisioningError(message);
  } finally {
    client.release();
  }
}
