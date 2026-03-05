// apps/platform/middleware.ts
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_ORIGINS = new Set([
  "https://app.pasadenagenerator.com",
  "https://builder.pasadenagenerator.com",
  // po potrebi še preview domene
]);

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");

  // samo za API
  if (!req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Preflight
  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    if (origin && ALLOWED_ORIGINS.has(origin)) {
      res.headers.set("Access-Control-Allow-Origin", origin);
      res.headers.set("Access-Control-Allow-Credentials", "true");
      res.headers.set("Vary", "Origin");
      res.headers.set("Access-Control-Allow-Headers", "content-type, authorization");
      res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    }
    return res;
  }

  const res = NextResponse.next();

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Vary", "Origin");
    res.headers.set("Access-Control-Allow-Headers", "content-type, authorization, apikey")
  }

  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};