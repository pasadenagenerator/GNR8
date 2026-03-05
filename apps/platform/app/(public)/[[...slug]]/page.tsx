// apps/platform/app/(public)/[[...slug]]/page.tsx
import { notFound } from "next/navigation";

type PageRow = {
  id: string;
  orgId: string;
  slug: string;
  title: string | null;
  data: any;
  updatedAt?: string | null;
};

async function platformApi(path: string, init?: RequestInit) {
  const base = process.env.API_PUBLIC_URL || "https://app.pasadenagenerator.com";
  const url = `${base}${path}`;
  const res = await fetch(url, {
    ...init,
    // pomembno: pages naj se ne cache-a med testiranjem
    cache: "no-store",
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text };
}

export default async function PublicPage(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await props.params;
  const path = slug?.length ? `/${slug.join("/")}` : "/";

  const ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID;
  if (!ORG_ID) {
    // zaenkrat hard fail, da bo jasno v deployu
    return (
      <main style={{ padding: 24 }}>
        <h1>Missing env</h1>
        <p>
          Set <code>NEXT_PUBLIC_DEFAULT_ORG_ID</code> (org, za katerega renderamo
          public strani).
        </p>
      </main>
    );
  }

  // klic na platform endpoint (ki ga bomo dodali v koraku 2)
  const r = await platformApi(`/api/pages?orgId=${encodeURIComponent(ORG_ID)}&slug=${encodeURIComponent(path)}`);

  if (r.status === 404) return notFound();
  if (!r.ok) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Public page error</h1>
        <pre>{r.text}</pre>
      </main>
    );
  }

  const page: PageRow | null = r.json?.page ?? null;
  if (!page) return notFound();

  // Za začetek samo render debug JSON, da potrdimo plumbing
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