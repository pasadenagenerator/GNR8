import "server-only";

import { OWNER_SETUP_PATH, listIncompleteOwnerSetupAgencyIdsForCurrentUserForPage } from "@/src/auth/owner-setup-gate";
import { listCurrentUserAgencyMembershipsForPage, ResolveCurrentAgencyError } from "@/src/auth/resolve-current-agency";
import { listCurrentUserClientMembershipsForPage, ResolveCurrentClientError } from "@/src/auth/resolve-current-client";
import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";

const AUTH_CALLBACK_PATH = "/auth/callback";
const SUPERADMIN_HOME_PATH = "/gnr8/command-center";
const AGENCY_HOME_PATH = "/gnr8/agency";
const CLIENT_HOME_PATH = "/gnr8/client";
const ACCESS_GUIDANCE_PATH = "/signup?access=missing";

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

  let clientMemberships: Awaited<ReturnType<typeof listCurrentUserClientMembershipsForPage>>["memberships"] = [];
  try {
    clientMemberships = (await listCurrentUserClientMembershipsForPage()).memberships;
  } catch (error) {
    if (error instanceof ResolveCurrentClientError && error.code === "UNAUTHORIZED") {
      throw error;
    }
    throw error;
  }

  if (clientMemberships.length > 0) {
    if (normalizedNextPath) {
      const requestedClientId = tryExtractClientId(normalizedNextPath);
      if (
        (normalizedNextPath === CLIENT_HOME_PATH && requestedClientId == null) ||
        (requestedClientId != null && clientMemberships.some((membership) => membership.client_id === requestedClientId))
      ) {
        return {
          target: normalizedNextPath,
          kind: "client",
        };
      }
    }

    if (clientMemberships.length === 1) {
      const membership = clientMemberships[0];
      return {
        target: `${CLIENT_HOME_PATH}?client=${encodeURIComponent(membership.client_id)}`,
        kind: "client",
      };
    }

    return {
      target: CLIENT_HOME_PATH,
      kind: "client",
    };
  }

  return {
    target: ACCESS_GUIDANCE_PATH,
    kind: "no_access",
  };
}
