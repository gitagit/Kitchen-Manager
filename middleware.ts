export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    // Protect all routes except auth endpoints, public pages, and static assets
    "/((?!api/auth|api/workspace/join|api/recipes/[^/]+/public|api/notifications|r/|login|register|join|_next/static|_next/image|icons|manifest\\.json|sw\\.js|favicon\\.ico).*)",
  ],
};
