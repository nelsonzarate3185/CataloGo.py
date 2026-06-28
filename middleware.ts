import { type NextRequest, NextResponse } from "next/server";

// Middleware runs in the Edge Runtime — no Node.js modules available here.
// We only check for the session cookie's existence. Cryptographic verification
// happens in getServerUser() (firebase-admin) on each protected page/route,
// so a forged cookie is rejected before any data is accessed.
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isDashboard = pathname.startsWith("/dashboard");
  // /registro is intentionally excluded: an authenticated user without a comercio
  // is redirected here by the dashboard layout and must be allowed through.
  const isAuthPage = pathname.startsWith("/login");

  const hasSession = !!request.cookies.get("__session")?.value;

  if (isDashboard && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
