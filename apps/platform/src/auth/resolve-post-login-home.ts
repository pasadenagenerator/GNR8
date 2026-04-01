import "server-only";

import { listIncompleteOwnerSetupAgencyIdsForCurrentUserForPage } from "@/src/auth/owner-setup-gate";
import { reconcilePendingClientMembershipInvitesForCurrentUser } from "@/src/auth/reconcile-client-membership-invites";
import { listCurrentUserAgencyMembershipsForPage, ResolveCurrentAgencyError } from "@/src/auth/resolve-current-agency";
import { resolveCurrentUserClientForPage, ResolveCurrentClientError } from "@/src/auth/resolve-current-client";
import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";
import {
  AGENCY_HOME_PATH,
  AUTH_CALLBACK_PATH,
  CLIENT_HOME_PATH,
  OWNER_SETUP_PATH,
  SIGNUP_ACCESS_MISSING_PATH,
  SUPERADMIN_HOME_PATH,
} from "@/src/auth/auth-flow-model";

type HomeKind = "superadmin" | "agency" | "client" | "agency_onboarding" | "no_access";

export type PostLoginHomeResolution = {
  target: string;
  kind: HomeKind;
};

function normalizeNextPath(candidate: string | null): string | null {
  const value = String(candidate ?? "").trim();
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value === AUTH_CALLBACK_PATH || value.startsWith(`${AUTH_CALLBACK_PATH}?`)) return null;
  return value;
}

function safeParsePath(pathnameWithSearch: string): URL | null {
  try {
    return new URL(pathnameWithSearch, "http://localhost");
  } catch {
    return null;
  }
}

function tryExtractAgencyId(pathnameWithSearch: string): string | null {
  const url = safeParsePath(pathnameWithSearch);
  if (!url || url.pathname !== AGENCY_HOME_PATH) return null;
  const agencyId = String(url.searchParams.get("agency") ?? "").trim();
  return agencyId || null;
}

function tryExtractClientId(pathnameWithSearch: string): string | null {
  const url = safeParsePath(pathnameWithSearch);
  if (!url || url.pathname !== CLIENT_HOME_PATH) return null;
  const clientId = String(url.searchParams.get("client") ?? "").trim();
  return clientId || null;
}

function onboardingPathForAgency(agencyId: string | null): string {
  if (!agencyId) return OWNER_SETUP_PATH;
  return `${OWNER_SETUP_PATH}?agency=${encodeURIComponent(agencyId)}`;
}

function scopedClientHomePath(clientId: string): string {
  return `${CLIENT_HOME_PATH}?client=${encodeURIComponent(clientId)}`;
}

async function isSuperadminForPage(): Promise<boolean> {
  try {
    await requireSuperadminUserIdForPage();
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized" || message.startsWith("Forbidden")) {
      return false;
    }
    throw error;
  }
}

export async function resolvePostLoginHomeForPage(input?: {
  nextPath?: string | null;
}): Promise<PostLoginHomeResolution> {
  const normalizedNextPath = normalizeNextPath(input?.nextPath ?? null);

  if (await isSuperadminForPage()) {
    return {
      target: SUPERADMIN_HOME_PATH,
      kind: "superadmin",
    };
  }

  await reconcilePendingClientMembershipInvitesForCurrentUser();

  let agencyMemberships: Awaited<ReturnType<typeof listCurrentUserAgencyMembershipsForPage>>["memberships"] = [];
  try {
    agencyMemberships = (await listCurrentUserAgencyMembershipsForPage()).memberships;
  } catch (error) {
    if (error instanceof ResolveCurrentAgencyError && error.code === "UNAUTHORIZED") {
      throw error;
    }
    throw error;
  }

  if (agencyMemberships.length > 0) {
    const incompleteAgencyIds = await listIncompleteOwnerSetupAgencyIdsForCurrentUserForPage();
    if (incompleteAgencyIds.length > 0) {
      const requestedAgencyId = normalizedNextPath ? tryExtractAgencyId(normalizedNextPath) : null;
      if (requestedAgencyId && incompleteAgencyIds.includes(requestedAgencyId)) {
        return {
          target: onboardingPathForAgency(requestedAgencyId),
          kind: "agency_onboarding",
        };
      }
      return {
        target: onboardingPathForAgency(incompleteAgencyIds[0] ?? null),
        kind: "agency_onboarding",
      };
    }

    if (normalizedNextPath) {
      const requestedAgencyId = tryExtractAgencyId(normalizedNextPath);
      if (
        (normalizedNextPath === AGENCY_HOME_PATH && requestedAgencyId == null) ||
        (requestedAgencyId != null && agencyMemberships.some((membership) => membership.agency_id === requestedAgencyId))
      ) {
        return {
          target: normalizedNextPath,
          kind: "agency",
        };
      }
    }

    if (agencyMemberships.length === 1) {
      const membership = agencyMemberships[0];
      return {
        target: `${AGENCY_HOME_PATH}?agency=${encodeURIComponent(membership.agency_id)}`,
        kind: "agency",
      };
    }
    return {
      target: AGENCY_HOME_PATH,
      kind: "agency",
    };
  }

  const requestedClientId = normalizedNextPath ? tryExtractClientId(normalizedNextPath) : null;
  const clientRouteRequested = normalizedNextPath
    ? normalizedNextPath === CLIENT_HOME_PATH || requestedClientId != null
    : false;
  const activeClientCandidate = clientRouteRequested ? requestedClientId : null;

  try {
    const resolvedClient = await resolveCurrentUserClientForPage({
      activeClientId: activeClientCandidate,
    });

    if (normalizedNextPath && requestedClientId && requestedClientId === resolvedClient.client_id) {
      return {
        target: normalizedNextPath,
        kind: "client",
      };
    }

    return {
      target: scopedClientHomePath(resolvedClient.client_id),
      kind: "client",
    };
  } catch (error) {
    if (error instanceof ResolveCurrentClientError && error.code === "UNAUTHORIZED") {
      throw error;
    }
    if (error instanceof ResolveCurrentClientError && error.code === "NO_MEMBERSHIP") {
      return {
        target: SIGNUP_ACCESS_MISSING_PATH,
        kind: "no_access",
      };
    }
    if (error instanceof ResolveCurrentClientError && error.code === "ACTIVE_CLIENT_REQUIRED") {
      return {
        target: CLIENT_HOME_PATH,
        kind: "client",
      };
    }
    if (error instanceof ResolveCurrentClientError && error.code === "ACTIVE_CLIENT_INVALID") {
      return {
        target: CLIENT_HOME_PATH,
        kind: "client",
      };
    }
    throw error;
  }
}
