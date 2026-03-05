// apps/platform/app/api/pages/route.ts
import { NextResponse } from "next/server";

// TODO: zamenjaj s pravim repo/service, ko ga že imaš v core/data.
// Za zdaj samo proxy na internal action, ki si ga že naredil v builderju.
async function callInternalPagesGet(orgId: string, slug: string) {
  // Če imaš že direkt DB access (repo), tu naj bo pravi query.
  // Za minimalen “it works” naj to najde page v tvojem obstoječem pages store-u.
  // Ker nimam tvojega repoja, tukaj vrnem 501 dokler ne poveš kje je "pages" service.
  return { status: 501, body: { error: "pages.get not wired (tell me where pages repo/service lives)" } };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orgId = (url.searchParams.get("orgId") ?? "").trim();
  const slug = (url.searchParams.get("slug") ?? "").trim() || "/";

  if (!orgId) {
    return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
  }

  const r = await callInternalPagesGet(orgId, slug);
  return NextResponse.json(r.body, { status: r.status });
}