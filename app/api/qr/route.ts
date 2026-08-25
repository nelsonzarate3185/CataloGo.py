import { NextRequest, NextResponse } from "next/server";
import { baseUrlServidor, urlCatalogo } from "@/lib/urls";
import { generateQRBuffer } from "@/lib/qr";
import { consumir, ipDe } from "@/lib/rate-limit";

/**
 * Generar un PNG cuesta CPU y este endpoint es público y sin sesión. Treinta
 * por minuto alcanzan de sobra para un comerciante que descarga su QR y prueba
 * algunos tamaños, y frenan un bucle que lo pida sin parar.
 */
const MAX_POR_MINUTO = 30;

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug requerido" }, { status: 400 });
  }

  const limite = consumir(`qr:${ipDe(request)}`, MAX_POR_MINUTO, 60);
  if (!limite.permitido) {
    return NextResponse.json(
      { error: "Demasiadas descargas seguidas. Esperá un momento." },
      { status: 429, headers: { "Retry-After": String(limite.reintentarEn) } }
    );
  }

  const url = urlCatalogo(baseUrlServidor(request.headers), slug);

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
