import { type NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isDashboard = pathname.startsWith("/dashboard");
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/registro");

  const session = request.cookies.get("__session")?.value;

  let uid: string | null = null;
  if (session) {
    try {
      const decoded = await adminAuth.verifySessionCookie(session, true);
      uid = decoded.uid;
    } catch {
      uid = null;
    }
  }

  if (isDashboard && !uid) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthPage && uid) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
