// apps/platform/app/page.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";

function isSupabaseAuthCallback(url: URL): boolean {
  const hasCode = url.searchParams.has("code");
  const type = url.searchParams.get("type");

  const hash = url.hash?.startsWith("#") ? url.hash.slice(1) : "";
  const hashParams = new URLSearchParams(hash);

  const hasAccessToken = hashParams.has("access_token");
  const hashType = hashParams.get("type"); // "recovery" | "invite"

  return (
    hasCode ||
    type === "recovery" ||
    hasAccessToken ||
    hashType === "recovery" ||
    hashType === "invite"
  );
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const h = await headers();
  const proto = (h.get("x-forwarded-proto") ?? "https").split(",")[0]?.trim();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0]?.trim();

  // Auth callbacki pridejo pogosto z refererjem, ki vsebuje query/hash.
  // Če refererja ni, naredimo best-effort URL brez hash (hash tako ali tako ne pride na server).
  const ref = h.get("referer") ?? "";
  const url = ref ? new URL(ref) : new URL(`${proto}://${host}/`);

  if (isSupabaseAuthCallback(url)) {
    redirect(`/reset-password${url.search}${url.hash}`);
  }

  // Zaenkrat minimalen public home (da potrdimo, da /admin redirecta ni več)
  return (
    <main style={{ padding: 24 }}>
      <h1>Public Home OK</h1>
      <p>Host: <code>{host}</code></p>
      <p>
        Zdaj lahko nadaljujeva z DB Pages renderjem (slug "/" iz platform.pages).
      </p>
    </main>
  );
}