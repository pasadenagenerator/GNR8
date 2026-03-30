import assert from "node:assert/strict";
import test from "node:test";

import {
  AgencyProvisioningError,
  buildCreateAgencyRollbackMessage,
  buildMembershipMutationPlan,
  buildOrganizationInsertPayload,
  findMissingProvisioningColumns,
  resolveMembershipRoleWriteStrategy,
  resolveMembershipSchemaColumns,
} from "@/gnr8/agency/agency-provisioning-service";

const AGENCY_ID = "11111111-1111-4111-8111-111111111111";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test("buildOrganizationInsertPayload creates explicit id for agency organization inserts", () => {
  const payload = buildOrganizationInsertPayload({
    name: "Acme Agency",
    agencyId: AGENCY_ID,
    organizationType: "agency",
  });

  assert.equal(UUID_RE.test(payload.id), true);
  assert.equal(payload.name, "Acme Agency");
  assert.equal(payload.agency_id, AGENCY_ID);
  assert.equal(payload.organization_type, "agency");
});

test("buildOrganizationInsertPayload creates explicit id for client organization inserts", () => {
  const payload = buildOrganizationInsertPayload({
    name: "Client One",
    agencyId: AGENCY_ID,
    organizationType: "client",
  });

  assert.equal(UUID_RE.test(payload.id), true);
  assert.equal(payload.name, "Client One");
  assert.equal(payload.agency_id, AGENCY_ID);
  assert.equal(payload.organization_type, "client");
});

test("buildOrganizationInsertPayload rejects invalid agency ids", () => {
  assert.throws(
    () => {
      buildOrganizationInsertPayload({
        name: "Acme Agency",
        agencyId: "not-a-uuid",
        organizationType: "agency",
      });
    },
    (error) => error instanceof AgencyProvisioningError && error.message === "agencyId must be a valid UUID",
  );
});

test("buildOrganizationInsertPayload rejects blank organization names", () => {
  assert.throws(
    () => {
      buildOrganizationInsertPayload({
        name: "   ",
        agencyId: AGENCY_ID,
        organizationType: "client",
      });
    },
    (error) => error instanceof AgencyProvisioningError && error.message === "organization name is required",
  );
});

test("resolveMembershipSchemaColumns detects legacy org_id-only schema", () => {
  const schema = resolveMembershipSchemaColumns(["id", "user_id", "org_id", "role"]);
  assert.equal(schema.hasOrganizationId, false);
  assert.equal(schema.hasOrgId, true);
});

test("buildMembershipMutationPlan uses org_id-only payload when organization_id does not exist", () => {
  const plan = buildMembershipMutationPlan({
    membershipId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
    organizationId: "44444444-4444-4444-8444-444444444444",
    role: "owner",
    schema: {
      hasOrganizationId: false,
      hasOrgId: true,
    },
    roleWriteStrategy: {
      kind: "text",
      roleValueSql: "$4",
      enumSchema: null,
      enumTypeName: null,
    },
  });

  assert.equal(plan.canonicalOrgColumn, "org_id");
  assert.match(plan.sql, /insert into public\.memberships \(id, user_id, org_id, role\)/);
  assert.doesNotMatch(plan.sql, /organization_id/);
  assert.doesNotMatch(plan.sql, /membership_role_enum/);
});

test("buildMembershipMutationPlan uses dual-column payload when both org columns exist", () => {
  const plan = buildMembershipMutationPlan({
    membershipId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
    organizationId: "44444444-4444-4444-8444-444444444444",
    role: "owner",
    schema: {
      hasOrganizationId: true,
      hasOrgId: true,
    },
    roleWriteStrategy: {
      kind: "enum",
      roleValueSql: '$4::"public"."membership_role_enum"',
      enumSchema: "public",
      enumTypeName: "membership_role_enum",
    },
  });

  assert.equal(plan.canonicalOrgColumn, "organization_id");
  assert.match(plan.sql, /insert into public\.memberships \(id, user_id, organization_id, org_id, role\)/);
  assert.match(plan.sql, /organization_id = \$3::uuid,\s*org_id = \$3::uuid/);
  assert.match(plan.sql, /\$4::"public"\."membership_role_enum"/);
});

test("buildMembershipMutationPlan fails closed when memberships has no organization reference column", () => {
  assert.throws(
    () => {
      buildMembershipMutationPlan({
        membershipId: "22222222-2222-4222-8222-222222222222",
        userId: "33333333-3333-4333-8333-333333333333",
        organizationId: "44444444-4444-4444-8444-444444444444",
        role: "owner",
        schema: {
          hasOrganizationId: false,
          hasOrgId: false,
        },
        roleWriteStrategy: {
          kind: "text",
          roleValueSql: "$4",
          enumSchema: null,
          enumTypeName: null,
        },
      });
    },
    (error) =>
      error instanceof AgencyProvisioningError &&
      error.message === "memberships schema mismatch: expected org_id and/or organization_id column for provisioning",
  );
});

test("resolveMembershipRoleWriteStrategy uses plain parameter for text role columns", () => {
  const strategy = resolveMembershipRoleWriteStrategy({
    dataType: "text",
    udtSchema: "pg_catalog",
    udtName: "text",
    typeKind: "b",
  });

  assert.equal(strategy.kind, "text");
  assert.equal(strategy.roleValueSql, "$4");
  assert.equal(strategy.enumSchema, null);
  assert.equal(strategy.enumTypeName, null);
});

test("resolveMembershipRoleWriteStrategy casts to membership_role_enum when present", () => {
  const strategy = resolveMembershipRoleWriteStrategy({
    dataType: "USER-DEFINED",
    udtSchema: "public",
    udtName: "membership_role_enum",
    typeKind: "e",
  });

  assert.equal(strategy.kind, "enum");
  assert.equal(strategy.roleValueSql, '$4::"public"."membership_role_enum"');
  assert.equal(strategy.enumSchema, "public");
  assert.equal(strategy.enumTypeName, "membership_role_enum");
});

test("resolveMembershipRoleWriteStrategy supports alternate enum role type names", () => {
  const strategy = resolveMembershipRoleWriteStrategy({
    dataType: "USER-DEFINED",
    udtSchema: "public",
    udtName: "org_membership_role",
    typeKind: "e",
  });

  assert.equal(strategy.kind, "enum");
  assert.equal(strategy.roleValueSql, '$4::"public"."org_membership_role"');
  assert.equal(strategy.enumSchema, "public");
  assert.equal(strategy.enumTypeName, "org_membership_role");
});

test("resolveMembershipRoleWriteStrategy fails closed for unsupported non-text non-enum role columns", () => {
  assert.throws(
    () => {
      resolveMembershipRoleWriteStrategy({
        dataType: "integer",
        udtSchema: "pg_catalog",
        udtName: "int4",
        typeKind: "b",
      });
    },
    (error) =>
      error instanceof AgencyProvisioningError &&
      error.message.includes("memberships.role schema mismatch: unsupported role column type"),
  );
});

test("findMissingProvisioningColumns detects mismatches for audited provisioning tables", () => {
  const missing = findMissingProvisioningColumns([
    { table_name: "agencies", column_name: "id" },
    { table_name: "agencies", column_name: "name" },
    { table_name: "agencies", column_name: "slug" },
    { table_name: "agencies", column_name: "is_home_agency" },
    { table_name: "organizations", column_name: "id" },
    { table_name: "organizations", column_name: "name" },
    { table_name: "organizations", column_name: "agency_id" },
    { table_name: "organizations", column_name: "organization_type" },
    { table_name: "memberships", column_name: "id" },
    { table_name: "memberships", column_name: "user_id" },
    { table_name: "memberships", column_name: "role" },
    { table_name: "billing_accounts", column_name: "id" },
    { table_name: "billing_accounts", column_name: "agency_id" },
    { table_name: "billing_accounts", column_name: "billing_mode" },
    { table_name: "cost_centers", column_name: "id" },
    { table_name: "cost_centers", column_name: "type" },
    { table_name: "cost_centers", column_name: "entity_id" },
    { table_name: "cost_centers", column_name: "parent_id" },
  ]);

  assert.deepEqual(missing, ["billing_accounts.status"]);
});

test("buildCreateAgencyRollbackMessage preserves rollback-completed operator guidance", () => {
  const message = buildCreateAgencyRollbackMessage({
    rollbackSucceeded: true,
    invitedUserId: "55555555-5555-4555-8555-555555555555",
    ownerEmail: "owner@example.com",
    baseMessage: "db insert failed",
  });
  assert.match(message, /auth rollback completed via deleteUser/);
  assert.match(message, /verify the user is absent in auth\.users before retrying/);
  assert.match(message, /db insert failed/);
});

test("buildCreateAgencyRollbackMessage preserves rollback-failed operator guidance", () => {
  const message = buildCreateAgencyRollbackMessage({
    rollbackSucceeded: false,
    invitedUserId: "55555555-5555-4555-8555-555555555555",
    ownerEmail: "owner@example.com",
    baseMessage: "db insert failed",
  });
  assert.match(message, /auth rollback failed/);
  assert.match(message, /manual cleanup required/);
  assert.match(message, /db insert failed/);
});
