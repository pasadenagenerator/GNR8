import {
  registerCustomBlocks,
  registerFonts,
  registerPageTypes,
} from "@gnr8/chai-renderer";
import {
  ChaiPageStyles,
  RenderChaiBlocks,
} from "@chaibuilder/next/render";
import type { ChaiPageProps } from "@chaibuilder/next/types";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPublicPageByOrgAndSlug } from "../../../src/public-site/public-pages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

registerCustomBlocks();
registerFonts();
registerPageTypes();

export default async function PublicPage(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await props.params;
  const path = "/" + (slug?.join("/") ?? "");

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

  const h = await headers();
  const host =
    (h.get("x-forwarded-host") ?? h.get("host") ?? "")
      .split(",")[0]
      ?.trim() ?? "";

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
}