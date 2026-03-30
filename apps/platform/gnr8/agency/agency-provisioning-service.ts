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

type MembershipColumnCatalogRow = {
  column_name: string;
};

type MembershipRoleColumnCatalogRow = {
  data_type: string;
  udt_schema: string;
  udt_name: string;
  type_kind: string | null;
};

type ProvisioningColumnCatalogRow = {
  table_name: string;
  column_name: string;
};

export type MembershipSchemaColumns = {
  hasOrganizationId: boolean;
  hasOrgId: boolean;
};

export type MembershipRoleWriteStrategy = {
  roleValueSql: string;
  kind: "text" | "enum";
  enumSchema: string | null;
  enumTypeName: string | null;
};

type MembershipMutationPlan = {
  sql: string;
  values: [string, string, string, "owner" | "admin" | "member"];
  canonicalOrgColumn: "organization_id" | "org_id";
};

const PROVISIONING_REQUIRED_COLUMNS: Record<string, readonly string[]> = {
  agencies: ["id", "name", "slug", "is_home_agency"],
  organizations: ["id", "name", "agency_id", "organization_type"],
  memberships: ["id", "user_id", "role"],
  billing_accounts: ["id", "agency_id", "billing_mode", "status"],
  cost_centers: ["id", "type", "entity_id", "parent_id"],
};

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function quotePostgresIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new AgencyProvisioningError(`invalid postgres identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

export function buildCreateAgencyRollbackMessage(input: {
  rollbackSucceeded: boolean;
  invitedUserId: string;
  ownerEmail: string;
  baseMessage: string;
}): string {
  if (input.rollbackSucceeded) {
    return `provisioning failed after invite; auth rollback completed via deleteUser for invited owner user ${input.invitedUserId} (${input.ownerEmail}). verify the user is absent in auth.users before retrying: ${input.baseMessage}`;
  }
  return `provisioning failed after invite; auth rollback failed for invited owner user ${input.invitedUserId} (${input.ownerEmail}). manual cleanup required (check auth.users and related rows before retry): ${input.baseMessage}`;
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

export function resolveMembershipSchemaColumns(columnNames: readonly string[]): MembershipSchemaColumns {
  const normalized = new Set(
    columnNames
      .map((columnName) => normalizeText(columnName).toLowerCase())
      .filter((columnName) => columnName.length > 0),
  );
  return {
    hasOrganizationId: normalized.has("organization_id"),
    hasOrgId: normalized.has("org_id"),
  };
}

export function findMissingProvisioningColumns(
  rows: ReadonlyArray<ProvisioningColumnCatalogRow>,
  requiredByTable: Readonly<Record<string, readonly string[]>> = PROVISIONING_REQUIRED_COLUMNS,
): string[] {
  const available = new Set(
    rows.map((row) => `${normalizeText(row.table_name).toLowerCase()}.${normalizeText(row.column_name).toLowerCase()}`),
  );
  const missing: string[] = [];
  for (const [tableName, requiredColumns] of Object.entries(requiredByTable)) {
    for (const columnName of requiredColumns) {
      const key = `${tableName}.${columnName}`.toLowerCase();
      if (!available.has(key)) {
        missing.push(`${tableName}.${columnName}`);
      }
    }
  }
  return missing.sort();
}

export function buildMembershipMutationPlan(input: {
  membershipId: string;
  userId: string;
  organizationId: string;
  role: "owner" | "admin" | "member";
  schema: MembershipSchemaColumns;
  roleWriteStrategy: MembershipRoleWriteStrategy;
}): MembershipMutationPlan {
  const values: MembershipMutationPlan["values"] = [input.membershipId, input.userId, input.organizationId, input.role];
  const roleValueSql = input.roleWriteStrategy.roleValueSql;
  if (input.schema.hasOrganizationId && input.schema.hasOrgId) {
    return {
      canonicalOrgColumn: "organization_id",
      values,
      sql: `
        with updated as (
          update public.memberships
             set role = ${roleValueSql},
                 organization_id = $3::uuid,
                 org_id = $3::uuid
           where user_id = $2::uuid
             and (organization_id = $3::uuid or org_id = $3::uuid)
         returning id
        )
        insert into public.memberships (id, user_id, organization_id, org_id, role)
        select $1::uuid, $2::uuid, $3::uuid, $3::uuid, ${roleValueSql}
        where not exists (select 1 from updated)
      `,
    };
  }
  if (input.schema.hasOrganizationId) {
    return {
      canonicalOrgColumn: "organization_id",
      values,
      sql: `
        with updated as (
          update public.memberships
             set role = ${roleValueSql},
                 organization_id = $3::uuid
           where user_id = $2::uuid
             and organization_id = $3::uuid
         returning id
        )
        insert into public.memberships (id, user_id, organization_id, role)
        select $1::uuid, $2::uuid, $3::uuid, ${roleValueSql}
        where not exists (select 1 from updated)
      `,
    };
  }
  if (input.schema.hasOrgId) {
    return {
      canonicalOrgColumn: "org_id",
      values,
      sql: `
        with updated as (
          update public.memberships
             set role = ${roleValueSql},
                 org_id = $3::uuid
           where user_id = $2::uuid
             and org_id = $3::uuid
         returning id
        )
        insert into public.memberships (id, user_id, org_id, role)
        select $1::uuid, $2::uuid, $3::uuid, ${roleValueSql}
        where not exists (select 1 from updated)
      `,
    };
  }
  throw new AgencyProvisioningError(
    "memberships schema mismatch: expected org_id and/or organization_id column for provisioning",
  );
}

async function assertProvisioningSchemaCompatibility(client: PoolClient): Promise<void> {
  const tableNames = Object.keys(PROVISIONING_REQUIRED_COLUMNS);
  const catalog = await client.query<ProvisioningColumnCatalogRow>(
    `
      select table_name::text as table_name, column_name::text as column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = any($1::text[])
    `,
    [tableNames],
  );
  const missingRequired = findMissingProvisioningColumns(catalog.rows);
  const membershipSchema = resolveMembershipSchemaColumns(
    catalog.rows
      .filter((row) => row.table_name === "memberships")
      .map((row) => row.column_name),
  );
  if (!membershipSchema.hasOrganizationId && !membershipSchema.hasOrgId) {
    missingRequired.push("memberships.(organization_id|org_id)");
  }
  if (missingRequired.length > 0) {
    throw new AgencyProvisioningError(
      `provisioning schema mismatch: missing required columns: ${Array.from(new Set(missingRequired)).sort().join(", ")}`,
    );
  }
}

export function resolveMembershipRoleWriteStrategy(input: {
  dataType: string;
  udtSchema: string;
  udtName: string;
  typeKind: string | null;
}): MembershipRoleWriteStrategy {
  const dataType = normalizeText(input.dataType).toLowerCase();
  const udtSchema = normalizeText(input.udtSchema);
  const udtName = normalizeText(input.udtName);
  const typeKind = normalizeText(input.typeKind).toLowerCase() || null;

  const isTextual =
    dataType === "text" ||
    dataType === "character varying" ||
    dataType === "character" ||
    udtName === "text" ||
    udtName === "varchar" ||
    udtName === "bpchar";

  if (isTextual) {
    return {
      kind: "text",
      roleValueSql: "$4",
      enumSchema: null,
      enumTypeName: null,
    };
  }

  const isEnum = dataType === "user-defined" && typeKind === "e";
  if (isEnum) {
    if (!udtSchema || !udtName) {
      throw new AgencyProvisioningError(
        "memberships.role schema mismatch: enum role type metadata is incomplete",
      );
    }
    const enumSchema = quotePostgresIdentifier(udtSchema);
    const enumTypeName = quotePostgresIdentifier(udtName);
    return {
      kind: "enum",
      roleValueSql: `$4::${enumSchema}.${enumTypeName}`,
      enumSchema: udtSchema,
      enumTypeName: udtName,
    };
  }

  throw new AgencyProvisioningError(
    `memberships.role schema mismatch: unsupported role column type (data_type=${dataType || "unknown"}, udt_name=${udtName || "unknown"})`,
  );
}

async function detectMembershipSchemaColumns(client: PoolClient): Promise<MembershipSchemaColumns> {
  const membershipColumns = await client.query<MembershipColumnCatalogRow>(
    `
      select column_name::text as column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'memberships'
        and column_name in ('organization_id', 'org_id')
    `,
  );
  return resolveMembershipSchemaColumns(membershipColumns.rows.map((row) => row.column_name));
}

async function detectMembershipRoleWriteStrategy(client: PoolClient): Promise<MembershipRoleWriteStrategy> {
  const roleColumn = await client.query<MembershipRoleColumnCatalogRow>(
    `
      select c.data_type::text as data_type,
             c.udt_schema::text as udt_schema,
             c.udt_name::text as udt_name,
             t.typtype::text as type_kind
      from information_schema.columns c
      left join pg_catalog.pg_namespace n
        on n.nspname = c.udt_schema
      left join pg_catalog.pg_type t
        on t.typnamespace = n.oid
       and t.typname = c.udt_name
      where c.table_schema = 'public'
        and c.table_name = 'memberships'
        and c.column_name = 'role'
      limit 1
    `,
  );
  const metadata = roleColumn.rows[0];
  if (!metadata) {
    throw new AgencyProvisioningError("memberships schema mismatch: missing role column");
  }
  return resolveMembershipRoleWriteStrategy({
    dataType: metadata.data_type,
    udtSchema: metadata.udt_schema,
    udtName: metadata.udt_name,
    typeKind: metadata.type_kind,
  });
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
    throw new AgencyProvisioningError(
      buildCreateAgencyRollbackMessage({
        rollbackSucceeded: !deleteResult.error,
        invitedUserId,
        ownerEmail,
        baseMessage,
      }),
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
    await assertProvisioningSchemaCompatibility(client);

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
    const membershipSchema = await detectMembershipSchemaColumns(client);
    const roleWriteStrategy = await detectMembershipRoleWriteStrategy(client);
    const membershipMutationPlan = buildMembershipMutationPlan({
      membershipId,
      userId: ownerUserId,
      organizationId: agencyOrganization.id,
      role: ownerRole,
      schema: membershipSchema,
      roleWriteStrategy,
    });
    await client.query(membershipMutationPlan.sql, membershipMutationPlan.values);

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
