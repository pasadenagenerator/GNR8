import { headers } from "next/headers";
import { renderPublicPath, resolveRequestHost } from "@/src/public-site/public-runtime-render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PublicPage(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await props.params;
  const path = "/" + (slug?.join("/") ?? "");

  const h = await headers();
  const host = resolveRequestHost(h);
  return renderPublicPath({ path, host });
}
