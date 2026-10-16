import { isAstroProductionCandidatePreviewFeatureEnabled } from "@/gnr8/output-adapters/astro-production-candidate-preview-feature-gate";

const STAGING_INTERNAL_HOST_SUFFIX = ".staging.gnr8.test";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

type ReviewTarget = {
  siteId: string;
  sourceUrl: string;
  sourceHost: string | null;
};

type HostBinding = {
  siteId: string;
  host: string;
  status: string;
  bindingKind: string;
};

type ActivePointer = {
  siteVersionId: string;
  artifactId: string;
};

export type AstroRuntimeReviewRouteDependencies = {
  requireSuperadminUserId(): Promise<string>;
  isFeatureEnabled(): boolean;
  isPreviewEnvironment(): boolean;
  getRuntimeSiteSummary(siteId: string): Promise<ReviewTarget | null>;
  getActiveHostBindingForHost(host: string): Promise<HostBinding | null>;
  getActivePointerForSite(siteId: string): Promise<ActivePointer | null>;
  renderRuntime(input: { path: "/"; host: string; rawHost: string }): Promise<Response>;
};

async function defaultRequireSuperadminUserId(): Promise<string> {
  const mod = await import("@/src/auth/require-superadmin-user-id");
  return mod.requireSuperadminUserId();
}

async function defaultGetRuntimeSiteSummary(siteId: string): Promise<ReviewTarget | null> {
  const mod = await import("@/gnr8/runtime/runtime-store");
  const summary = await mod.getRuntimeSiteSummary(siteId);
  return summary
    ? { siteId: summary.id, sourceUrl: summary.sourceUrl, sourceHost: summary.sourceHost }
    : null;
}

async function defaultGetActiveHostBindingForHost(host: string): Promise<HostBinding | null> {
  const mod = await import("@/gnr8/runtime/runtime-store");
  return mod.getActiveHostBindingForHost(host);
}

async function defaultGetActivePointerForSite(siteId: string): Promise<ActivePointer | null> {
  const mod = await import("@/gnr8/runtime/runtime-store");
  return mod.getActivePointerForSite(siteId);
}

async function defaultRenderRuntime(input: { path: "/"; host: string; rawHost: string }): Promise<Response> {
  const mod = await import("@/src/public-site/public-runtime-render");
  return mod.renderPublicPathResponse(input);
}

export function createAstroRuntimeReviewRouteHandlers(
  dependencies: Partial<AstroRuntimeReviewRouteDependencies> = {},
) {
  const resolved: AstroRuntimeReviewRouteDependencies = {
    requireSuperadminUserId: dependencies.requireSuperadminUserId ?? defaultRequireSuperadminUserId,
    isFeatureEnabled: dependencies.isFeatureEnabled ?? isAstroProductionCandidatePreviewFeatureEnabled,
    isPreviewEnvironment: dependencies.isPreviewEnvironment ?? (() => process.env.VERCEL_ENV === "preview"),
    getRuntimeSiteSummary: dependencies.getRuntimeSiteSummary ?? defaultGetRuntimeSiteSummary,
    getActiveHostBindingForHost: dependencies.getActiveHostBindingForHost ?? defaultGetActiveHostBindingForHost,
    getActivePointerForSite: dependencies.getActivePointerForSite ?? defaultGetActivePointerForSite,
    renderRuntime: dependencies.renderRuntime ?? defaultRenderRuntime,
  };

  return {
    async GET(request: Request, context: RouteContext): Promise<Response> {
      try {
        await resolved.requireSuperadminUserId();
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        return failure(message.startsWith("Unauthorized") ? 401 : 403, "SUPERADMIN_REQUIRED");
      }
      if (!resolved.isPreviewEnvironment() || !resolved.isFeatureEnabled()) {
        return failure(404, "RUNTIME_REVIEW_NOT_FOUND");
      }

      const siteId = await resolveSiteId(context);
      if (!siteId || !hasOnlyRootPath(request)) return failure(404, "RUNTIME_REVIEW_NOT_FOUND");

      const target = await resolved.getRuntimeSiteSummary(siteId);
      const host = normalizeHost(target?.sourceHost);
      if (!target || target.siteId !== siteId || !host || !host.endsWith(STAGING_INTERNAL_HOST_SUFFIX)) {
        return failure(404, "RUNTIME_REVIEW_NOT_FOUND");
      }
      let sourceHost: string;
      try {
        sourceHost = new URL(target.sourceUrl).hostname.toLowerCase();
      } catch {
        return failure(404, "RUNTIME_REVIEW_NOT_FOUND");
      }
      if (sourceHost !== host) return failure(404, "RUNTIME_REVIEW_NOT_FOUND");

      const [binding, pointer] = await Promise.all([
        resolved.getActiveHostBindingForHost(host),
        resolved.getActivePointerForSite(siteId),
      ]);
      if (
        !binding ||
        binding.siteId !== siteId ||
        binding.host !== host ||
        binding.status !== "ACTIVE" ||
        binding.bindingKind !== "shadow" ||
        !pointer
      ) {
        return failure(404, "RUNTIME_REVIEW_NOT_FOUND");
      }

      const rendered = await resolved.renderRuntime({ path: "/", host, rawHost: host });
      const headers = new Headers(rendered.headers);
      headers.set("cache-control", "private, no-cache, no-store, max-age=0, must-revalidate");
      headers.set("x-gnr8-runtime-review", "active-artifact");
      headers.set("x-gnr8-runtime-site-id", siteId);
      headers.set("x-gnr8-runtime-site-version-id", pointer.siteVersionId);
      headers.set("x-gnr8-runtime-artifact-id", pointer.artifactId);
      headers.set(
        "content-security-policy",
        "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; frame-ancestors 'self'; base-uri 'none'; form-action 'none'",
      );
      return new Response(rendered.body, { status: rendered.status, headers });
    },
  };
}

async function resolveSiteId(context: RouteContext): Promise<string | null> {
  try {
    const siteId = (await context.params).siteId;
    return typeof siteId === "string" && /^[a-z0-9_-]{8,160}$/.test(siteId) ? siteId : null;
  } catch {
    return null;
  }
}

function hasOnlyRootPath(request: Request): boolean {
  const url = new URL(request.url);
  if ([...url.searchParams.keys()].some((key) => key !== "path")) return false;
  return (url.searchParams.get("path") ?? "/") === "/";
}

function normalizeHost(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized && normalized === value && !normalized.includes(":") && !normalized.includes("/")
    ? normalized
    : null;
}

function failure(status: number, code: string): Response {
  return Response.json(
    { ok: false, code },
    { status, headers: { "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate" } },
  );
}
