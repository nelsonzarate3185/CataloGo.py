import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

/** Rutas que exigen sesión. El resto es público. */
function esRutaProtegida(pathname: string): boolean {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
}

/**
 * Respuesta cuando no se puede determinar la sesión.
 *
 * El middleware corre en todas las rutas, así que si lanza cae el sitio
 * entero: catálogos públicos de todos los comercios incluidos. Ante una
 * configuración incompleta o una falla de Supabase conviene degradar, no
 * morir. Lo público sigue sirviéndose; lo protegido va al login, que es el
 * lado seguro cuando no se puede verificar quién es el visitante.
 */
function degradar(request: NextRequest) {
  if (esRutaProtegida(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next({ request });
}

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Las aserciones `!` son sólo de TypeScript: no impiden que el valor llegue
  // vacío en runtime, y createServerClient lanza en ese caso.
  if (!url || !anonKey) return degradar(request);

  // Una URL sin esquema pasa el chequeo de arriba pero hace lanzar a
  // createServerClient, que la parsea. Es un error de configuración fácil de
  // cometer al copiarla del panel de Supabase.
  try {
    new URL(url);
  } catch {
    return degradar(request);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Una falla de red contra Supabase no puede tumbar el catálogo público.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    return degradar(request);
  }

  const pathname = request.nextUrl.pathname;
  const isAuth = pathname.startsWith("/login");

  if (esRutaProtegida(pathname) && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Con `?cambiar=1` el formulario se muestra aunque haya sesión abierta. Sin
  // esta salida, quien ya está autenticado no puede entrar con otra cuenta:
  // /login rebota a /dashboard, y si ese usuario no tiene comercio el panel lo
  // manda a /registro, que sólo enlaza de vuelta a /login. El bucle se cierra y
  // el formulario de credenciales queda inalcanzable.
  const quiereCambiarCuenta = request.nextUrl.searchParams.has("cambiar");

  if (isAuth && user && !quiereCambiarCuenta) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}
