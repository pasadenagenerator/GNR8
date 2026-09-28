import "server-only";

import { getSupabaseServiceRoleClient } from "@/src/supabase/service-role-server";

import {
  isCanonicalUuid,
  type AstroProductionCandidateOwnership,
} from "./astro-production-candidate-record";

const TEXT_MAX_CHARACTERS = 512;

export type AstroCandidateOwnershipQueryResult = {
  data: unknown;
  error: unknown;
};

export type AstroCandidateOwnershipQuery = {
  select(columns: string): {
    eq(column: string, value: string): {
      limit(count: number): PromiseLike<AstroCandidateOwnershipQueryResult>;
    };
  };
};

export type AstroCandidateOwnershipReadClient = {
  from(table: string): AstroCandidateOwnershipQuery;
};

export type AstroCandidateOwnershipReadClientFactory = () => AstroCandidateOwnershipReadClient | null;

export type ResolveAstroCandidateOwnershipInput = {
  siteVersionId: string;
  expectedRuntimeSiteId?: string;
};

export type AstroCandidateOwnershipResolutionErrorCode =
  | "identity_invalid"
  | "not_found"
  | "ownership_incomplete"
  | "ownership_mismatch"
  | "schema_incompatible"
  | "unavailable";

export class AstroCandidateOwnershipResolutionError extends Error {
  readonly code: AstroCandidateOwnershipResolutionErrorCode;

  constructor(code: AstroCandidateOwnershipResolutionErrorCode, message: string) {
    super(message);
    this.name = "AstroCandidateOwnershipResolutionError";
    this.code = code;
  }
}

const defaultClientFactory: AstroCandidateOwnershipReadClientFactory = () => (
  getSupabaseServiceRoleClient() as unknown as AstroCandidateOwnershipReadClient | null
);

/**
 * Resolves current ownership from the selected runtime version. Authentication
 * deliberately remains outside this resolver; the initial caller is expected
 * to apply the existing superadmin policy before invoking it.
 */
export class SupabaseAstroCandidateOwnershipResolver {
  constructor(private readonly getClient: AstroCandidateOwnershipReadClientFactory = defaultClientFactory) {}

  async resolve(input: ResolveAstroCandidateOwnershipInput): Promise<AstroProductionCandidateOwnership> {
    if (!isCanonicalUuid(input.siteVersionId)) {
      throw resolutionError("identity_invalid", "Runtime site-version identity is invalid.");
    }
    if (input.expectedRuntimeSiteId !== undefined && !isBoundedText(input.expectedRuntimeSiteId)) {
      throw resolutionError("identity_invalid", "Expected runtime-site identity is invalid.");
    }

    let client: AstroCandidateOwnershipReadClient | null;
    try {
      client = this.getClient();
    } catch {
      throw resolutionError("unavailable", "Authoritative ownership storage is unavailable.");
    }
    if (!client) throw resolutionError("unavailable", "Authoritative ownership storage is unavailable.");

    const version = await readExactlyOne(client, {
      table: "gnr8_runtime_site_versions",
      columns: "id,site_id,ownership_site_id",
      column: "id",
      value: input.siteVersionId,
      missingCode: "not_found",
    });
    const siteVersionId = canonicalUuidField(version, "id", "schema_incompatible");
    const runtimeSiteId = boundedTextField(version, "site_id", "schema_incompatible");
    const ownershipSiteId = nullableUuidField(version, "ownership_site_id");
    if (siteVersionId !== input.siteVersionId) {
      throw resolutionError("ownership_mismatch", "Runtime site-version lookup returned a mismatched identity.");
    }
    if (input.expectedRuntimeSiteId !== undefined && runtimeSiteId !== input.expectedRuntimeSiteId) {
      throw resolutionError("ownership_mismatch", "Runtime site-version does not belong to the expected runtime site.");
    }
    if (!ownershipSiteId) {
      throw resolutionError("ownership_incomplete", "Runtime site-version has no first-class ownership link.");
    }

    const [runtimeSite, ownershipSite] = await Promise.all([
      readExactlyOne(client, {
        table: "gnr8_runtime_sites",
        columns: "id",
        column: "id",
        value: runtimeSiteId,
        missingCode: "ownership_incomplete",
      }),
      readExactlyOne(client, {
        table: "sites",
        columns: "id,org_id,agency_id",
        column: "id",
        value: ownershipSiteId,
        missingCode: "ownership_incomplete",
      }),
    ]);
    if (boundedTextField(runtimeSite, "id", "schema_incompatible") !== runtimeSiteId) {
      throw resolutionError("ownership_mismatch", "Runtime-site relationship is inconsistent.");
    }
    if (canonicalUuidField(ownershipSite, "id", "schema_incompatible") !== ownershipSiteId) {
      throw resolutionError("ownership_mismatch", "First-class site relationship is inconsistent.");
    }
    const organizationId = canonicalUuidField(ownershipSite, "org_id", "ownership_incomplete");
    const agencyId = canonicalUuidField(ownershipSite, "agency_id", "ownership_incomplete");

    const [organization, agency] = await Promise.all([
      readExactlyOne(client, {
        table: "organizations",
        columns: "id,agency_id",
        column: "id",
        value: organizationId,
        missingCode: "ownership_incomplete",
      }),
      readExactlyOne(client, {
        table: "agencies",
        columns: "id",
        column: "id",
        value: agencyId,
        missingCode: "ownership_incomplete",
      }),
    ]);
    if (canonicalUuidField(organization, "id", "schema_incompatible") !== organizationId) {
      throw resolutionError("ownership_mismatch", "Organization relationship is inconsistent.");
    }
    if (canonicalUuidField(agency, "id", "schema_incompatible") !== agencyId) {
      throw resolutionError("ownership_mismatch", "Agency relationship is inconsistent.");
    }
    if (canonicalUuidField(organization, "agency_id", "ownership_incomplete") !== agencyId) {
      throw resolutionError("ownership_mismatch", "Organization and first-class site agencies are inconsistent.");
    }

    return {
      runtimeSiteId,
      siteVersionId,
      ownershipSiteId,
      organizationId,
      agencyId,
    };
  }
}

async function readExactlyOne(
  client: AstroCandidateOwnershipReadClient,
  input: {
    table: string;
    columns: string;
    column: string;
    value: string;
    missingCode: "not_found" | "ownership_incomplete";
  },
): Promise<Record<string, unknown>> {
  let result: AstroCandidateOwnershipQueryResult;
  try {
    result = await client
      .from(input.table)
      .select(input.columns)
      .eq(input.column, input.value)
      .limit(2);
  } catch {
    throw resolutionError("unavailable", "Authoritative ownership query failed.");
  }
  if (!isRecord(result) || result.error != null) {
    throw resolutionError("unavailable", "Authoritative ownership query failed.");
  }
  if (!Array.isArray(result.data)) {
    throw resolutionError("schema_incompatible", "Authoritative ownership query returned an invalid shape.");
  }
  if (result.data.length === 0) {
    throw resolutionError(input.missingCode, "Authoritative ownership relationship is unavailable.");
  }
  if (result.data.length !== 1 || !isRecord(result.data[0])) {
    throw resolutionError("schema_incompatible", "Authoritative ownership lookup was not unique.");
  }
  if (!hasExactKeys(result.data[0], input.columns.split(","))) {
    throw resolutionError("schema_incompatible", "Authoritative ownership row has an invalid shape.");
  }
  return result.data[0];
}

function boundedTextField(
  row: Record<string, unknown>,
  field: string,
  code: "schema_incompatible" | "ownership_incomplete",
): string {
  const value = row[field];
  if (!isBoundedText(value)) throw resolutionError(code, "Authoritative ownership row is incomplete.");
  return value;
}

function canonicalUuidField(
  row: Record<string, unknown>,
  field: string,
  code: "schema_incompatible" | "ownership_incomplete",
): string {
  const value = row[field];
  if (!isCanonicalUuid(value)) throw resolutionError(code, "Authoritative ownership row is incomplete.");
  return value;
}

function nullableUuidField(row: Record<string, unknown>, field: string): string | null {
  const value = row[field];
  if (value == null) return null;
  if (!isCanonicalUuid(value)) {
    throw resolutionError("schema_incompatible", "Authoritative ownership link has an invalid identity.");
  }
  return value;
}

function isBoundedText(value: unknown): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= TEXT_MAX_CHARACTERS &&
    value === value.trim() &&
    !value.includes("\0");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasExactKeys(value: unknown, expected: readonly string[]): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((field, index) => field === wanted[index]);
}

function resolutionError(
  code: AstroCandidateOwnershipResolutionErrorCode,
  message: string,
): AstroCandidateOwnershipResolutionError {
  return new AstroCandidateOwnershipResolutionError(code, message);
}
