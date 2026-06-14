import { NextResponse } from "next/server";

// Firebase password reset redirects here after the user clicks the email link.
// Firebase appends ?mode=resetPassword&oobCode=... — we forward those to the UI page.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const oobCode = searchParams.get("oobCode");
  const mode = searchParams.get("mode");

  if (mode === "resetPassword" && oobCode) {
    return NextResponse.redirect(
      `${origin}/actualizar-password?oobCode=${oobCode}`
    );
  }

  return NextResponse.redirect(`${origin}/login`);
}
