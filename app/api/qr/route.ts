import { NextRequest, NextResponse } from "next/server";
import { generateQRBuffer } from "@/lib/qr";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug requerido" }, { status: 400 });
  }

  const host = request.headers.get("host") ?? "";
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const dynamicBase = host ? `${proto}://${host}` : "";
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? dynamicBase}/c/${slug}`;

  try {
    const buffer = await generateQRBuffer(url);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="qr-${slug}.png"`,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Error generando QR" }, { status: 500 });
  }
}
