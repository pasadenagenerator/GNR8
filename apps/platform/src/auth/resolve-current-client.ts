import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseServerClientMutating } from "@/src/auth/supabase-server-mutating";
import { getSupabaseServerClientReadOnly } from "@/src/auth/supabase-server-read-only";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ClientMembershipRole = "owner" | "member";

export type ResolvedCurrentUserClient = {
  user_id: string;
  client_id: string;
  client_name: string | null;
  agency_id: string;
  agency_name: string | null;
  role: ClientMembershipRole;
};

export type CurrentUserClientMembership = {
  client_id: string;
  client_name: string | null;
  agency_id: string;
  agency_name: string | null;
  role: ClientMembershipRole;
};

export class ResolveCurrentClientError extends Error {
  readonly code:
    | "UNAUTHORIZED"
    | "NO_MEMBERSHIP"
    | "INVALID_MEMBERSHIP"
    | "AMBIGUOUS_MEMBERSHIP"
    | "ACTIVE_CLIENT_REQUIRED"
    | "ACTIVE_CLIENT_INVALID";

  constructor(code: ResolveCurrentClientError["code"], message: string) {
    super(message);
    this.name = "ResolveCurrentClientError";
    this.code = code;
  }
}

type MembershipRow = {
  user_id: string | null;
  role: string | null;
  client_organization_id: string | null;
  agency_id: string | null;
};

type OrganizationRow = {
  id: string | null;
  name: string | null;
  agency_id: string | null;
  organization_type: string | null;
};

type AgencyRow = {
  id: string | null;
  name: string | null;
};

type ClientMembershipCandidate = {
  role: ClientMembershipRole;
  client_id: string;
  client_name: string | null;
  agency_id: string;
  agency_name: string | null;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function normalizeMembershipRole(value: string): ClientMembershipRole | null {
  if (value === "owner" || value === "member") return value;
  return null;
}

async function listMembershipRows(supabase: SupabaseClient, userId: string): Promise<MembershipRow[]> {
  const result = await supabase
    .from("client_memberships")
    .select("user_id,role,client_organization_id,agency_id")
    .eq("user_id", userId);

  if (result.error) {
    throw new ResolveCurrentClientError("INVALID_MEMBERSHIP", `Client membership lookup failed: ${result.error.message}`);
  }

  return Array.isArray(result.data) ? (result.data as MembershipRow[]) : [];
}

function dedupeMembershipCandidates(candidates: ClientMembershipCandidate[]): CurrentUserClientMembership[] {
  const roleRank: Record<ClientMembershipRole, number> = {
    owner: 2,
    member: 1,
  };
  const byClientId = new Map<string, CurrentUserClientMembership>();

  for (const candidate of candidates) {
    const existing = byClientId.get(candidate.client_id);
    if (!existing) {
      byClientId.set(candidate.client_id, {
        client_id: candidate.client_id,
        client_name: candidate.client_name,
        agency_id: candidate.agency_id,
        agency_name: candidate.agency_name,
        role: candidate.role,
      });
      continue;
    }

    if (existing.agency_id !== candidate.agency_id) {
      throw new ResolveCurrentClientError(
        "AMBIGUOUS_MEMBERSHIP",
        "Client membership has conflicting agency context for the same organization.",
      );
    }

    if (roleRank[candidate.role] > roleRank[existing.role]) {
      byClientId.set(candidate.client_id, {
        ...existing,
        role: candidate.role,
      });
      continue;
    }

    if (!existing.client_name && candidate.client_name) {
      byClientId.set(candidate.client_id, {
        ...existing,
        client_name: candidate.client_name,
      });
    }
    if (!existing.agency_name && candidate.agency_name) {
      byClientId.set(candidate.client_id, {
        ...existing,
        agency_name: candidate.agency_name,
      });
    }
  }

  return Array.from(byClientId.values()).sort((a, b) => {
    const aName = normalizeText(a.client_name).toLowerCase();
    const bName = normalizeText(b.client_name).toLowerCase();
    if (aName && bName && aName !== bName) return aName.localeCompare(bName);
    if (aName && !bName) return -1;
    if (!aName && bName) return 1;
    return a.client_id.localeCompare(b.client_id);
  });
}

export function selectCurrentClientMembership(input: {
  memberships: CurrentUserClientMembership[];
  activeClientId?: string | null;
}): CurrentUserClientMembership {
  const memberships = input.memberships;
  if (memberships.length === 0) {
    throw new ResolveCurrentClientError("NO_MEMBERSHIP", "No client access");
  }

  const activeClientId = normalizeText(input.activeClientId);
  if (memberships.length === 1) {
    const onlyMembership = memberships[0];
    if (activeClientId && activeClientId !== onlyMembership.client_id) {
      throw new ResolveCurrentClientError("ACTIVE_CLIENT_INVALID", "Active client is invalid for current user membership");
    }
    return onlyMembership;
  }

  if (!activeClientId) {
    throw new ResolveCurrentClientError(
      "ACTIVE_CLIENT_REQUIRED",
      "Multiple client memberships detected; active client selection is required",
    );
  }

  const matched = memberships.find((membership) => membership.client_id === activeClientId);
  if (!matched) {
    throw new ResolveCurrentClientError("ACTIVE_CLIENT_INVALID", "Active client is invalid for current user membership");
  }
  return matched;
}

async function requireCurrentUserId(supabase: SupabaseClient): Promise<string> {
  const authResult = await supabase.auth.getUser();
  const userId = normalizeText(authResult.data.user?.id);
  if (authResult.error || !userId || !isUuid(userId)) {
    throw new ResolveCurrentClientError("UNAUTHORIZED", "Unauthorized");
  }
  return userId;
}

async function listClientMembershipCandidates(
  supabase: SupabaseClient,
  userId: string,
): Promise<CurrentUserClientMembership[]> {
  const rawMemberships = await listMembershipRows(supabase, userId);
  const normalizedMemberships = rawMemberships
    .map((row) => {
      const role = normalizeMembershipRole(normalizeText(row.role).toLowerCase());
      const clientId = normalizeText(row.client_organization_id);
      const agencyId = normalizeText(row.agency_id);
      if (role == null || !isUuid(clientId) || !isUuid(agencyId)) return null;
      return {
        role,
        client_id: clientId,
        agency_id: agencyId,
      };
    })
    .filter((row): row is { role: ClientMembershipRole; client_id: string; agency_id: string } => row != null);

  if (normalizedMemberships.length === 0) return [];

  const uniqueOrganizationIds = Array.from(new Set(normalizedMemberships.map((membership) => membership.client_id)));
  const organizationResult = await supabase
    .from("organizations")
    .select("id,name,agency_id,organization_type")
    .in("id", uniqueOrganizationIds);

  if (organizationResult.error) {
    throw new ResolveCurrentClientError("INVALID_MEMBERSHIP", `Organization lookup failed: ${organizationResult.error.message}`);
  }

  const organizations = Array.isArray(organizationResult.data) ? (organizationResult.data as OrganizationRow[]) : [];
  const organizationsById = new Map<string, OrganizationRow>();
  for (const organization of organizations) {
    const organizationId = normalizeText(organization.id);
    if (!organizationId || !isUuid(organizationId)) continue;
    organizationsById.set(organizationId, organization);
  }

  const validatedClientMemberships = normalizedMemberships
    .map((membership) => {
      const organization = organizationsById.get(membership.client_id);
      if (!organization) return null;
      const organizationType = normalizeText(organization.organization_type).toLowerCase();
      const organizationAgencyId = normalizeText(organization.agency_id);
      if (organizationType !== "client" || !isUuid(organizationAgencyId)) return null;
      if (organizationAgencyId !== membership.agency_id) {
        throw new ResolveCurrentClientError(
          "AMBIGUOUS_MEMBERSHIP",
          "Client membership has conflicting agency linkage.",
        );
      }
      return {
        role: membership.role,
        client_id: membership.client_id,
        client_name: normalizeText(organization.name) || null,
        agency_id: organizationAgencyId,
      };
    })
    .filter(
      (
        membership,
      ): membership is {
        role: ClientMembershipRole;
        client_id: string;
        client_name: string | null;
        agency_id: string;
      } => membership != null,
    );

  if (validatedClientMemberships.length === 0) return [];

  const uniqueAgencyIds = Array.from(new Set(validatedClientMemberships.map((membership) => membership.agency_id)));
  const agencyResult = await supabase.from("agencies").select("id,name").in("id", uniqueAgencyIds);
  if (agencyResult.error) {
    throw new ResolveCurrentClientError("INVALID_MEMBERSHIP", `Agency lookup failed: ${agencyResult.error.message}`);
  }

  const agencies = Array.isArray(agencyResult.data) ? (agencyResult.data as AgencyRow[]) : [];
  const agencyNameById = new Map<string, string | null>();
  for (const agency of agencies) {
    const agencyId = normalizeText(agency.id);
    if (!agencyId || !isUuid(agencyId)) continue;
    agencyNameById.set(agencyId, normalizeText(agency.name) || null);
  }

  const candidates: ClientMembershipCandidate[] = validatedClientMemberships.map((membership) => ({
    role: membership.role,
    client_id: membership.client_id,
    client_name: membership.client_name,
    agency_id: membership.agency_id,
    agency_name: agencyNameById.get(membership.agency_id) ?? null,
  }));

  return dedupeMembershipCandidates(candidates);
}

export async function listCurrentUserClientMemberships(): Promise<{
  user_id: string;
  memberships: CurrentUserClientMembership[];
}> {
  const supabase = await getSupabaseServerClientMutating();
  const userId = await requireCurrentUserId(supabase);
  const memberships = await listClientMembershipCandidates(supabase, userId);
  return {
    user_id: userId,
    memberships,
  };
}

export async function listCurrentUserClientMembershipsForPage(): Promise<{
  user_id: string;
  memberships: CurrentUserClientMembership[];
}> {
  const supabase = await getSupabaseServerClientReadOnly();
  const userId = await requireCurrentUserId(supabase);
  const memberships = await listClientMembershipCandidates(supabase, userId);
  return {
    user_id: userId,
    memberships,
  };
}

export async function resolveCurrentUserClient(input?: {
  activeClientId?: string | null;
}): Promise<ResolvedCurrentUserClient> {
  const supabase = await getSupabaseServerClientMutating();
  const userId = await requireCurrentUserId(supabase);
  const memberships = await listClientMembershipCandidates(supabase, userId);
  const selectedMembership = selectCurrentClientMembership({
    memberships,
    activeClientId: input?.activeClientId ?? null,
  });

  return {
    user_id: userId,
    client_id: selectedMembership.client_id,
    client_name: selectedMembership.client_name,
    agency_id: selectedMembership.agency_id,
    agency_name: selectedMembership.agency_name,
    role: selectedMembership.role,
  };
}

export async function resolveCurrentUserClientForPage(input?: {
  activeClientId?: string | null;
  userId?: string | null;
}): Promise<ResolvedCurrentUserClient> {
  const supabase = await getSupabaseServerClientReadOnly();
  const providedUserId = normalizeText(input?.userId);
  const userId = providedUserId && isUuid(providedUserId) ? providedUserId : await requireCurrentUserId(supabase);
  const memberships = await listClientMembershipCandidates(supabase, userId);
  const selectedMembership = selectCurrentClientMembership({
    memberships,
    activeClientId: input?.activeClientId ?? null,
  });

  return {
    user_id: userId,
    client_id: selectedMembership.client_id,
    client_name: selectedMembership.client_name,
    agency_id: selectedMembership.agency_id,
    agency_name: selectedMembership.agency_name,
    role: selectedMembership.role,
  };
}
