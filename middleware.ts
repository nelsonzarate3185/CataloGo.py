import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch {
    // Red de seguridad final. Este middleware corre antes que cualquier página,
    // así que una excepción acá devuelve 500 y no deja ni renderizar un error
    // propio: el visitante ve la pantalla de Vercel y no hay forma de
    // recuperarse desde la aplicación.
    //
    // Ante cualquier fallo inesperado se cierra el acceso a lo protegido y se
    // deja pasar el resto, que sabe resolver su propia autenticación.
    const pathname = request.nextUrl.pathname;
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next({ request });
  }
}

/**
 * Sólo las rutas donde la sesión importa.
 *
 * Antes el matcher abarcaba todo el sitio, así que cualquier falla del
 * middleware devolvía 500 en la landing y en los catálogos públicos de todos
 * los comercios: páginas que no necesitan sesión quedaban atadas a la
 * infraestructura de autenticación.
 */
export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login"],
};
