import "server-only";

import { getSupabaseServerClientReadOnly } from "@/src/auth/supabase-server-read-only";
import { CLIENT_SETUP_PATH, listIncompleteClientSetupClientIdsForCurrentUserForPage } from "@/src/auth/client-setup-gate";
import { listIncompleteOwnerSetupAgencyIdsForCurrentUserForPage } from "@/src/auth/owner-setup-gate";
import { reconcilePendingClientMembershipInvitesForCurrentUser } from "@/src/auth/reconcile-client-membership-invites";
import { listCurrentUserAgencyMembershipsForPage, ResolveCurrentAgencyError } from "@/src/auth/resolve-current-agency";
import { resolveCurrentUserClientForPage, ResolveCurrentClientError } from "@/src/auth/resolve-current-client";
import {
  AGENCY_HOME_PATH,
  AUTH_CALLBACK_PATH,
  CLIENT_HOME_PATH,
  OWNER_SETUP_PATH,
  SIGNUP_ACCESS_MISSING_PATH,
  SUPERADMIN_HOME_PATH,
} from "@/src/auth/auth-flow-model";

type HomeKind = "superadmin" | "agency" | "client" | "agency_onboarding" | "client_onboarding" | "no_access";

export type PostLoginHomeResolution = {
  target: string;
  kind: HomeKind;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AUTH_DEBUG_ENABLED = process.env.NODE_ENV !== "production" || process.env.AUTH_DEBUG_LOGIN === "1";

function logAuthDebug(event: string, payload: Record<string, unknown>): void {
  if (!AUTH_DEBUG_ENABLED) return;
  console.info(`[auth.post_login_resolver.${event}]`, payload);
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function parseAllowlist(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isSuperadminEmail(email: string): boolean {
  const allowlist = parseAllowlist(process.env.SUPERADMIN_EMAILS);
  return allowlist.length > 0 && allowlist.includes(email.toLowerCase());
}

async function resolveAuthenticatedUserForPostLogin(input: {
  requestId?: string | null;
}): Promise<{ userId: string; email: string }> {
  const supabase = await getSupabaseServerClientReadOnly();
  logAuthDebug("auth_user.lookup.start", { requestId: input.requestId ?? null });
  const authResult = await supabase.auth.getUser();
  const userId = normalizeText(authResult.data.user?.id);
  const email = normalizeText(authResult.data.user?.email).toLowerCase();
  const authorized = !authResult.error && UUID_RE.test(userId) && !!email;
  logAuthDebug("auth_user.lookup.done", {
    requestId: input.requestId ?? null,
    authorized,
    hasError: Boolean(authResult.error),
    userIdSuffix: userId ? userId.slice(-6) : null,
  });
  if (!authorized) {
    throw new Error("Unauthorized");
  }
  return { userId, email };
}

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

function onboardingPathForClient(clientId: string | null): string {
  if (!clientId) return CLIENT_SETUP_PATH;
  return `${CLIENT_SETUP_PATH}?client=${encodeURIComponent(clientId)}`;
}

export async function resolvePostLoginHomeForPage(input?: {
  nextPath?: string | null;
  requestId?: string | null;
}): Promise<PostLoginHomeResolution> {
  const normalizedNextPath = normalizeNextPath(input?.nextPath ?? null);
  const requestId = normalizeText(input?.requestId) || null;
  logAuthDebug("resolution.start", {
    requestId,
    nextPath: normalizedNextPath,
  });
  const authUser = await resolveAuthenticatedUserForPostLogin({ requestId });

  if (isSuperadminEmail(authUser.email)) {
    logAuthDebug("resolution.superadmin", {
      requestId,
      userIdSuffix: authUser.userId.slice(-6),
    });
    return {
      target: SUPERADMIN_HOME_PATH,
      kind: "superadmin",
    };
  }

  await reconcilePendingClientMembershipInvitesForCurrentUser({
    userId: authUser.userId,
    email: authUser.email,
  });

  let agencyMemberships: Awaited<ReturnType<typeof listCurrentUserAgencyMembershipsForPage>>["memberships"] = [];
  try {
    agencyMemberships = (await listCurrentUserAgencyMembershipsForPage({ userId: authUser.userId })).memberships;
  } catch (error) {
    if (error instanceof ResolveCurrentAgencyError && error.code === "UNAUTHORIZED") {
      throw error;
    }
    throw error;
  }

  if (agencyMemberships.length > 0) {
    const incompleteAgencyIds = await listIncompleteOwnerSetupAgencyIdsForCurrentUserForPage({
      userId: authUser.userId,
    });
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
  const incompleteClientIds = await listIncompleteClientSetupClientIdsForCurrentUserForPage({
    userId: authUser.userId,
  });
  if (incompleteClientIds.length > 0) {
    if (requestedClientId && incompleteClientIds.includes(requestedClientId)) {
      return {
        target: onboardingPathForClient(requestedClientId),
        kind: "client_onboarding",
      };
    }

    return {
      target: onboardingPathForClient(incompleteClientIds[0] ?? null),
      kind: "client_onboarding",
    };
  }

  const clientRouteRequested = normalizedNextPath ? normalizedNextPath === CLIENT_HOME_PATH || requestedClientId != null : false;
  const activeClientCandidate = clientRouteRequested ? requestedClientId : null;

  try {
    const resolvedClient = await resolveCurrentUserClientForPage({
      activeClientId: activeClientCandidate,
      userId: authUser.userId,
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
