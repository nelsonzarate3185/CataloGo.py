import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

/**
 * Sólo las rutas donde la sesión importa.
 *
 * Antes el matcher abarcaba todo el sitio, así que cualquier falla del
 * middleware devolvía 500 en la landing y en los catálogos públicos de todos
 * los comercios: páginas que no necesitan sesión para nada quedaban atadas a la
 * infraestructura de autenticación. El catálogo del comprador es la parte que
 * genera ventas y la que menos tiene que depender de ella.
 *
 * `updateSession` sólo actúa sobre /dashboard, /admin y /login; el resto de las
 * rutas resuelven su propia autenticación del lado del servidor.
 */
export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login"],
};
