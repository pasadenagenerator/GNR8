import type { ChaiPageProps } from "@chaibuilder/next/types";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import {
  resolveActiveArtifactForHostAndPathWithDiagnostics,
  type PublicRuntimeArtifactMissReasonCode,
} from "@/gnr8/runtime/runtime-store";

export type Gnr8PublicRuntimeMode = "artifact-only" | "artifact-with-builder-fallback";

const VALID_RUNTIME_MODES = new Set<Gnr8PublicRuntimeMode>([
  "artifact-only",
  "artifact-with-builder-fallback",
]);

type HeaderReader = {
  get(name: string): string | null;
};

let chaiRuntimeRegistered = false;

type PublicRuntimeResolutionOutcome = "artifact_hit" | "artifact_miss" | "fallback_hit" | "fallback_miss" | "artifact_only_404";

type BuilderFallbackResult =
  | {
      hit: true;
      element: ReactElement;
      reasonCode:
        | "builder_page_rendered"
        | "builder_data_fallback"
        | "builder_chai_render_fallback"
        | "builder_default_org_missing";
    }
  | {
      hit: false;
      reasonCode: "builder_page_not_found";
    };

function logPublicRuntimeResolution(input: {
  outcome: PublicRuntimeResolutionOutcome;
  mode: Gnr8PublicRuntimeMode;
  host: string;
  path: string;
  siteId?: string | null;
  siteVersionId?: string | null;
  artifactId?: string | null;
  hostBindingId?: string | null;
  hostBindingKind?: string | null;
  hostBindingStatus?: string | null;
  reasonCode?: string | null;
  resolvedPath?: string | null;
}): void {
  const payload = {
    outcome: input.outcome,
    mode: input.mode,
    host: input.host,
    path: input.path,
    siteId: input.siteId ?? null,
    siteVersionId: input.siteVersionId ?? null,
    artifactId: input.artifactId ?? null,
    hostBindingId: input.hostBindingId ?? null,
    hostBindingKind: input.hostBindingKind ?? null,
    hostBindingStatus: input.hostBindingStatus ?? null,
    reasonCode: input.reasonCode ?? null,
    resolvedPath: input.resolvedPath ?? null,
    ts: new Date().toISOString(),
  };
  console.info(`[gnr8.public-runtime.resolution] ${JSON.stringify(payload)}`);
}

export function resolveRequestHost(headers: HeaderReader): string {
  return (
    (headers.get("x-forwarded-host") ?? headers.get("host") ?? "")
      .split(",")[0]
      ?.trim() ?? ""
  );
}

export function resolvePublicRuntimeMode(): Gnr8PublicRuntimeMode {
  const raw = String(process.env.GNR8_PUBLIC_RUNTIME_MODE ?? "").trim();
  if (VALID_RUNTIME_MODES.has(raw as Gnr8PublicRuntimeMode)) {
    return raw as Gnr8PublicRuntimeMode;
  }

  if (raw) {
    console.warn(
      `[gnr8.public-runtime.mode.invalid] Unsupported GNR8_PUBLIC_RUNTIME_MODE="${raw}". Falling back to env default.`,
    );
  }

  const vercelEnv = String(process.env.VERCEL_ENV ?? "").trim().toLowerCase();
  if (vercelEnv === "production") return "artifact-with-builder-fallback";
  return "artifact-only";
}

async function ensureChaiRuntimeRegistered(): Promise<void> {
  if (chaiRuntimeRegistered) return;
  const chaiRenderer = await import("@gnr8/chai-renderer");
  chaiRenderer.registerCustomBlocks();
  chaiRenderer.registerFonts();
  chaiRenderer.registerPageTypes();
  chaiRuntimeRegistered = true;
}

function renderBuilderDataFallback(input: { slug: string; title: string | null; data: unknown }) {
  return (
    <main style={{ padding: 24 }}>
      <h1>{input.title ?? "Untitled"}</h1>
      <p>
        slug: <code>{input.slug}</code>
      </p>
      <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(input.data ?? {}, null, 2)}</pre>
    </main>
  );
}

async function renderBuilderFallback(input: { path: string; host: string }): Promise<BuilderFallbackResult> {
  const orgId = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID?.trim();
  if (!orgId) {
    return {
      hit: true,
      reasonCode: "builder_default_org_missing",
      element: (
        <main style={{ padding: 24 }}>
          <h1>Missing env</h1>
          <p>
            Set <code>NEXT_PUBLIC_DEFAULT_ORG_ID</code> in Vercel.
          </p>
        </main>
      ),
    };
  }

  const { getPublicPageByOrgAndSlug } = await import("@/src/public-site/public-pages");
  const page = await getPublicPageByOrgAndSlug({
    orgId,
    slug: input.path,
    host: input.host,
  });

  if (!page) return { hit: false, reasonCode: "builder_page_not_found" };

  const pageData = page.data as any;
  const isRenderableChaiPage = !!pageData && typeof pageData === "object" && Array.isArray(pageData.blocks);

  if (!isRenderableChaiPage) {
    return {
      hit: true,
      reasonCode: "builder_data_fallback",
      element: renderBuilderDataFallback({
        slug: page.slug,
        title: page.title ?? null,
        data: page.data ?? {},
      }),
    };
  }

  const normalizedPage = {
    ...pageData,
    pageType: pageData.pageType ?? "page",
    lang: pageData.lang ?? "en",
    fallbackLang: pageData.fallbackLang ?? "en",
  };

  const pageProps: ChaiPageProps = {
    slug: page.slug,
    pageType: normalizedPage.pageType,
    fallbackLang: normalizedPage.fallbackLang,
    pageLang: normalizedPage.lang,
  };

  try {
    await ensureChaiRuntimeRegistered();
    const { ChaiPageStyles, RenderChaiBlocks } = await import("@chaibuilder/next/render");
    return {
      hit: true,
      reasonCode: "builder_page_rendered",
      element: (
        <html lang={normalizedPage.lang}>
          <head>
            <ChaiPageStyles page={normalizedPage} />
          </head>
          <body>
            <RenderChaiBlocks page={normalizedPage} pageProps={pageProps} />
          </body>
        </html>
      ),
    };
  } catch {
    return {
      hit: true,
      reasonCode: "builder_chai_render_fallback",
      element: renderBuilderDataFallback({
        slug: page.slug,
        title: page.title ?? null,
        data: page.data ?? {},
      }),
    };
  }
}

function failPublicRuntimeResolution(input: {
  mode: Gnr8PublicRuntimeMode;
  host: string;
  path: string;
  reasonCode: "fallback_miss" | "builder_page_not_found" | PublicRuntimeArtifactMissReasonCode;
}): never {
  if (input.mode === "artifact-only") {
    logPublicRuntimeResolution({
      outcome: "artifact_only_404",
      mode: input.mode,
      host: input.host,
      path: input.path,
      reasonCode: input.reasonCode,
    });
  } else {
    logPublicRuntimeResolution({
      outcome: "fallback_miss",
      mode: input.mode,
      host: input.host,
      path: input.path,
      reasonCode: input.reasonCode,
    });
  }
  notFound();
}

export async function renderPublicPath(input: { path: string; host: string }) {
  const mode = resolvePublicRuntimeMode();

  const artifactResolution = await resolveActiveArtifactForHostAndPathWithDiagnostics({
    host: input.host,
    path: input.path,
  });

  if (artifactResolution.outcome === "artifact_hit") {
    logPublicRuntimeResolution({
      outcome: "artifact_hit",
      mode,
      host: input.host,
      path: input.path,
      siteId: artifactResolution.siteId,
      siteVersionId: artifactResolution.activeSiteVersionId,
      artifactId: artifactResolution.artifactId,
      hostBindingId: artifactResolution.hostBindingId,
      hostBindingKind: artifactResolution.hostBindingKind,
      hostBindingStatus: artifactResolution.hostBindingStatus,
      resolvedPath: artifactResolution.resolvedPath,
      reasonCode:
        artifactResolution.siteResolution === "fallback_latest_site" ? artifactResolution.siteResolution : null,
    });
    return (
      <div
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: artifactResolution.html,
        }}
      />
    );
  }

  logPublicRuntimeResolution({
    outcome: "artifact_miss",
    mode,
    host: input.host,
    path: input.path,
    siteId: artifactResolution.siteId,
    siteVersionId: artifactResolution.activeSiteVersionId,
    artifactId: artifactResolution.artifactId,
    hostBindingId: artifactResolution.hostBindingId,
    hostBindingKind: artifactResolution.hostBindingKind,
    hostBindingStatus: artifactResolution.hostBindingStatus,
    reasonCode: artifactResolution.reasonCode,
  });

  if (mode === "artifact-with-builder-fallback") {
    const fallback = await renderBuilderFallback(input);
    if (fallback.hit) {
      logPublicRuntimeResolution({
        outcome: "fallback_hit",
        mode,
        host: input.host,
        path: input.path,
        siteId: artifactResolution.siteId,
        siteVersionId: artifactResolution.activeSiteVersionId,
        artifactId: artifactResolution.artifactId,
        hostBindingId: artifactResolution.hostBindingId,
        hostBindingKind: artifactResolution.hostBindingKind,
        hostBindingStatus: artifactResolution.hostBindingStatus,
        reasonCode: fallback.reasonCode,
      });
      return fallback.element;
    }
    return failPublicRuntimeResolution({
      mode,
      host: input.host,
      path: input.path,
      reasonCode: fallback.reasonCode,
    });
  }

  return failPublicRuntimeResolution({
    mode,
    host: input.host,
    path: input.path,
    reasonCode: artifactResolution.reasonCode,
  });
}
