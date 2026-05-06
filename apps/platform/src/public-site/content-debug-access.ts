import { resolveCurrentUserAgency, ResolveCurrentAgencyError } from "@/src/auth/resolve-current-agency";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

type ContentDebugAccessDependencies = {
  requireSuperadminUserId: typeof requireSuperadminUserId;
  resolveCurrentUserAgency: typeof resolveCurrentUserAgency;
};

const contentDebugAccessDependencies: ContentDebugAccessDependencies = {
  requireSuperadminUserId,
  resolveCurrentUserAgency,
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function isTokenAuthorized(request: Request): boolean {
  const expectedToken = normalizeText(process.env.GNR8_CONTENT_DEBUG_TOKEN);
  if (!expectedToken) return false;
  const providedToken = normalizeText(request.headers.get("x-gnr8-debug-token"));
  return providedToken.length > 0 && providedToken === expectedToken;
}

async function hasOperatorSession(): Promise<boolean> {
  try {
    await contentDebugAccessDependencies.requireSuperadminUserId();
    return true;
  } catch {}

  try {
    const agency = await contentDebugAccessDependencies.resolveCurrentUserAgency();
    return agency.role === "owner" || agency.role === "admin";
  } catch (error) {
    if (error instanceof ResolveCurrentAgencyError) return false;
    throw error;
  }
}

export function __setContentDebugAccessDependenciesForTest(
  overrides: Partial<ContentDebugAccessDependencies>,
): () => void {
  const previous = { ...contentDebugAccessDependencies };
  Object.assign(contentDebugAccessDependencies, overrides);
  return () => {
    Object.assign(contentDebugAccessDependencies, previous);
  };
}

export async function canShowContentDebug(request: Request): Promise<boolean> {
  if (isTokenAuthorized(request)) return true;
  return hasOperatorSession();
}
