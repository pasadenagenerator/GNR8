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
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getPublicPageByOrgAndSlug } from "../src/public-site/public-pages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

registerCustomBlocks();
registerFonts();
registerPageTypes();

function isSupabaseAuthCallback(url: URL): boolean {
  const hasCode = url.searchParams.has("code");
  const type = url.searchParams.get("type");

  const hash = url.hash?.startsWith("#") ? url.hash.slice(1) : "";
  const hashParams = new URLSearchParams(hash);

  const hasAccessToken = hashParams.has("access_token");
  const hashType = hashParams.get("type");

  return (
    hasCode ||
    type === "recovery" ||
    hasAccessToken ||
    hashType === "recovery" ||
    hashType === "invite"
  );
}

export default async function HomePage() {
  const h = await headers();
  const proto = (h.get("x-forwarded-proto") ?? "https").split(",")[0]?.trim();
  const host =
    (h.get("x-forwarded-host") ?? h.get("host") ?? "")
      .split(",")[0]
      ?.trim() ?? "";

  const ref = h.get("referer") ?? "";
  const url = ref ? new URL(ref) : new URL(`${proto}://${host}/`);

  if (isSupabaseAuthCallback(url)) {
    redirect(`/reset-password${url.search}${url.hash}`);
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
    slug: "/",
    host,
  });

  if (!page) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Home page not found</h1>
        <p>
          No page found for org <code>{orgId}</code> and slug <code>/</code>.
        </p>
      </main>
    );
  }

  const pageData = page.data as any;

  if (!pageData || typeof pageData !== "object" || !Array.isArray(pageData.blocks)) {
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