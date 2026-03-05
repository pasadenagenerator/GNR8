// apps/platform/app/(public)/[[...slug]]/page.tsx
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function PublicPage(props: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await props.params;
  const path = "/" + (slug?.join("/") ?? "");
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0]?.trim() ?? "";

  return (
    <main style={{ padding: 24 }}>
      <h1>Public route OK</h1>
      <p>host: <code>{host}</code></p>
      <p>slug: <code>{path}</code></p>
    </main>
  );
}