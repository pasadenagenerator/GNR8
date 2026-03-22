import type { ChaiPageProps } from "@chaibuilder/next/types";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPublicPageByOrgAndSlug } from "../../../src/public-site/public-pages";
import { resolveActiveArtifactForHostAndPath } from "@/gnr8/runtime/runtime-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let chaiRuntimeRegistered = false;

async function ensureChaiRuntimeRegistered(): Promise<void> {
  if (chaiRuntimeRegistered) return;
  const chaiRenderer = await import("@gnr8/chai-renderer");
  chaiRenderer.registerCustomBlocks();
  chaiRenderer.registerFonts();
  chaiRenderer.registerPageTypes();
  chaiRuntimeRegistered = true;
}

export default async function PublicPage(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await props.params;
  const path = "/" + (slug?.join("/") ?? "");

  const h = await headers();
  const host =
    (h.get("x-forwarded-host") ?? h.get("host") ?? "")
      .split(",")[0]
      ?.trim() ?? "";

  const runtimeArtifact = await resolveActiveArtifactForHostAndPath({
    host,
    path,
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

  const page = await getPublicPageByOrgAndSlug({
    orgId,
    slug: path,
    host,
  });

  if (!page) return notFound();

  const pageData = page.data as any;

  const isRenderableChaiPage =
    !!pageData &&
    typeof pageData === "object" &&
    Array.isArray(pageData.blocks);

  if (!isRenderableChaiPage) {
    return (
      <main style={{ padding: 24 }}>
        <h1>{page.title ?? "Untitled"}</h1>
        <p>
          slug: <code>{page.slug}</code>
        </p>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(page.data ?? {}, null, 2)}
        </pre>
      </main>
    );
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
    return (
      <main style={{ padding: 24 }}>
        <h1>{page.title ?? "Untitled"}</h1>
        <p>
          slug: <code>{page.slug}</code>
        </p>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(page.data ?? {}, null, 2)}
        </pre>
      </main>
    );
  }
}
