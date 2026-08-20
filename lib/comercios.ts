"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { slugify } from "@/lib/utils";

/**
 * Crea el comercio de un usuario junto con su primer catálogo.
 *
 * Vive acá y no dentro del formulario de registro porque hay dos caminos que
 * llegan a necesitarlo: el alta con email y contraseña, y el usuario que entró
 * con Google y todavía no tiene tienda. Antes sólo existía en el primero, así
 * que quien entraba con Google quedaba sin comercio y el panel lo devolvía a
 * /registro indefinidamente.
 *
 * Devuelve el id del comercio, o un mensaje de error listo para mostrar.
 */
export async function crearComercioConCatalogo(
  supabase: SupabaseClient<Database>,
  params: { userId: string; nombre: string; whatsapp: string }
): Promise<{ comercioId: string } | { error: string }> {
  const { userId, nombre, whatsapp } = params;

  // El sufijo evita colisiones entre negocios con el mismo nombre.
  const sufijo = Math.random().toString(36).slice(2, 6);
  const slug = `${slugify(nombre)}-${sufijo}`;

  const { data: comercio, error: errorComercio } = await supabase
    .from("comercios")
    .insert({
      user_id: userId,
      nombre,
      slug,
      whatsapp,
      plan: "basico",
      activo: true,
    })
    .select("id")
    .single();

  if (errorComercio || !comercio) {
    return { error: errorComercio?.message ?? "No pudimos crear tu tienda." };
  }

  // Sin catálogo activo el catálogo público responde 404, así que se crea
  // junto con el comercio y no como un paso aparte que se pueda saltear.
  const { error: errorCatalogo } = await supabase.from("catalogos").insert({
    comercio_id: comercio.id,
    nombre: "Mi catálogo",
    activo: true,
  });

  if (errorCatalogo) {
    return { error: `Tu tienda se creó pero falló el catálogo: ${errorCatalogo.message}` };
  }

  return { comercioId: comercio.id };
}
