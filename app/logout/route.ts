import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Cierre de sesión accesible por URL.
 *
 * Existe porque el único botón de "cerrar sesión" vivía dentro del panel, y
 * había estados en los que el panel no se puede alcanzar: un usuario con sesión
 * pero sin comercio quedaba rebotando entre /login, /dashboard y /registro sin
 * forma de salir. Una ruta directa funciona aunque ninguna pantalla sea
 * accesible.
 *
 * Acepta GET a propósito, para poder enlazarla desde cualquier lado.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const destino = new URL("/login", request.url);
  destino.searchParams.set("cambiar", "1");

  // 303 fuerza un GET en el destino y evita que el navegador reenvíe la
  // petición si el usuario recarga.
  return NextResponse.redirect(destino, { status: 303 });
}
