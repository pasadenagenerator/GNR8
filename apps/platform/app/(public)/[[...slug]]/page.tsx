// apps/platform/app/(public)/[[...slug]]/page.tsx
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPublicPageByOrgAndSlug } from "@/src/pages/public-pages";

export const dynamic = "force-dynamic";

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

  return (
    <main style={{ padding: 24 }}>
      <h1>{page.title ?? "Untitled"}</h1>
      <p>
        host: <code>{host}</code>
      </p>
      <p>
        slug: <code>{page.slug}</code>
      </p>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {JSON.stringify(page.data ?? {}, null, 2)}
      </pre>
    </main>
  );
}