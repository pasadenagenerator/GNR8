import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { renderPublicPath, resolveRequestHost } from "@/src/public-site/public-runtime-render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const host = resolveRequestHost(h);

  const ref = h.get("referer") ?? "";
  const url = ref ? new URL(ref) : new URL(`${proto}://${host}/`);

  if (isSupabaseAuthCallback(url)) {
    redirect(`/reset-password${url.search}${url.hash}`);
  }

  return renderPublicPath({ path: "/", host });
}
