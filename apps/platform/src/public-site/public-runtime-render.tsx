import type { ChaiPageProps } from "@chaibuilder/next/types";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import { resolveActiveArtifactForHostAndPath } from "@/gnr8/runtime/runtime-store";

export type Gnr8PublicRuntimeMode = "artifact-only" | "artifact-with-builder-fallback";

const VALID_RUNTIME_MODES = new Set<Gnr8PublicRuntimeMode>([
  "artifact-only",
  "artifact-with-builder-fallback",
]);

type HeaderReader = {
  get(name: string): string | null;
};

let chaiRuntimeRegistered = false;

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

async function renderBuilderFallback(input: { path: string; host: string }): Promise<ReactElement | null> {
  const orgId = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID?.trim();
  if (!orgId) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Missing env</h1>
        <p>
          Set <code>NEXT_PUBLIC_DEFAULT_ORG_ID</code> in Vercel.
        </p>
      </main>
    );
  }

  const { getPublicPageByOrgAndSlug } = await import("@/src/public-site/public-pages");
  const page = await getPublicPageByOrgAndSlug({
    orgId,
    slug: input.path,
    host: input.host,
  });

  if (!page) return null;

  const pageData = page.data as any;
  const isRenderableChaiPage = !!pageData && typeof pageData === "object" && Array.isArray(pageData.blocks);

  if (!isRenderableChaiPage) {
    return renderBuilderDataFallback({
      slug: page.slug,
      title: page.title ?? null,
      data: page.data ?? {},
    });
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
    return (
      <html lang={normalizedPage.lang}>
        <head>
          <ChaiPageStyles page={normalizedPage} />
        </head>
        <body>
          <RenderChaiBlocks page={normalizedPage} pageProps={pageProps} />
        </body>
      </html>
    );
  } catch {
    return renderBuilderDataFallback({
      slug: page.slug,
      title: page.title ?? null,
      data: page.data ?? {},
    });
  }
}

function failPublicRuntimeResolution(input: {
  mode: Gnr8PublicRuntimeMode;
  host: string;
  path: string;
  reason: "artifact_missing" | "fallback_miss";
}): never {
  console.warn(
    `[gnr8.public-runtime.miss] ${JSON.stringify({
      mode: input.mode,
      host: input.host,
      path: input.path,
      reason: input.reason,
      ts: new Date().toISOString(),
    })}`,
  );
  notFound();
}

export async function renderPublicPath(input: { path: string; host: string }) {
  const mode = resolvePublicRuntimeMode();

  const runtimeArtifact = await resolveActiveArtifactForHostAndPath({
    host: input.host,
    path: input.path,
  });

  if (runtimeArtifact) {
    return (
      <div
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: runtimeArtifact.html,
        }}
      />
    );
  }

  if (mode === "artifact-with-builder-fallback") {
    const fallback = await renderBuilderFallback(input);
    if (fallback) return fallback;
    return failPublicRuntimeResolution({
      mode,
      host: input.host,
      path: input.path,
      reason: "fallback_miss",
    });
  }

  return failPublicRuntimeResolution({
    mode,
    host: input.host,
    path: input.path,
    reason: "artifact_missing",
  });
}
