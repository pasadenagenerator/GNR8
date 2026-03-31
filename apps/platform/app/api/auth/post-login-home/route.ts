import { type NextRequest } from "next/server";

import { resolvePostLoginHomeRoute } from "@/src/auth/post-login-home-route";

export async function GET(request: NextRequest) {
  const nextPath = request.nextUrl.searchParams.get("next");
  return resolvePostLoginHomeRoute(nextPath);
}
