import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "km-auth";

// Paths that are always public — no auth check
const PUBLIC_PATHS = new Set(["/login", "/api/auth"]);
const PUBLIC_PREFIXES = ["/_next/", "/icons/", "/manifest.json", "/sw.js", "/favicon.ico"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths and static assets
  if (
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // If SITE_SECRET is not configured, allow everything (local dev fallback)
  const secret = process.env.SITE_SECRET;
  if (!secret) return NextResponse.next();

  const cookie = request.cookies.get(COOKIE_NAME);
  const authenticated = cookie?.value === secret;

  if (!authenticated) {
    // API routes return 401 JSON; pages redirect to /login
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except Next.js internals
  matcher: ["/((?!_next/static|_next/image).*)"],
};
