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

  // fallback, če data še ni pravi Chai page object
  const isRenderableChaiPage =
  !!pageData &&
  typeof pageData === "object" &&
  Array.isArray(pageData.blocks) &&
  typeof pageData.pageType === "string" &&
  typeof pageData.lang === "string";

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

  const pageProps: ChaiPageProps = {
    slug: page.slug,
    pageType: pageData.pageType ?? "page",
    fallbackLang: pageData.fallbackLang ?? "en",
    pageLang: pageData.lang ?? "en",
  };

  return (
    <html lang={pageData.lang ?? "en"}>
      <head>
        <ChaiPageStyles page={pageData} />
      </head>
      <body>
        <RenderChaiBlocks page={pageData} pageProps={pageProps} />
      </body>
    </html>
  );
}