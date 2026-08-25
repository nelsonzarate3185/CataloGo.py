import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CatalogoConRelaciones } from "@/types/catalogo";
import type { Resena } from "@/types/database";


/**
 * Carga el catálogo público de un comercio por slug.
 *
 * Envuelto en `cache()` de React para que el layout y la página que se
 * renderizan en el mismo request compartan una sola consulta. Sin esto, cada
 * ruta de `/c/[slug]` golpearía Supabase dos o tres veces por navegación.
 *
 * Devuelve null si el comercio no existe, está inactivo o no tiene catálogo
 * activo. Quien llama decide si eso es un 404.
 */
export const getCatalogoPorSlug = cache(
  async (slug: string): Promise<CatalogoConRelaciones | null> => {
    const supabase = await createClient();

    // Vía función security definer y no consulta directa: la política de
    // lectura pública de `comercios` es `to anon`, así que un usuario con
    // sesión que no sea el dueño —el superadmin, u otro comerciante— no puede
    // leer la fila y el catálogo respondía 404. La función devuelve sólo las
    // columnas públicas, de modo que abrirla a `authenticated` no expone
    // user_id ni plan.
    const { data: filas, error: errorComercio } = await supabase.rpc(
      "comercio_publico",
      { p_slug: slug }
    );

    if (errorComercio) {
      throw new Error(
        `Error cargando el comercio "${slug}": ${errorComercio.message} (${errorComercio.code})`
      );
    }

    const comercio = filas?.[0];
    if (!comercio) return null;

    const { data: catalogos, error: errorCatalogo } = await supabase
      .from("catalogos")
      .select(`*, categorias ( * ), productos ( * )`)
      .eq("comercio_id", comercio.id)
      .eq("activo", true)
      .order("created_at", { ascending: true })
      .limit(1);

    if (errorCatalogo) {
      throw new Error(`Error cargando el catálogo: ${errorCatalogo.message}`);
    }

    const catalogo = catalogos?.[0];
    if (!catalogo) return null;

    return { ...catalogo, comercios: comercio } as unknown as CatalogoConRelaciones;
  }
);

/**
 * Reseñas publicadas de un producto, de la más reciente a la más vieja.
 *
 * RLS filtra las no aprobadas para el visitante anónimo, así que acá no hace
 * falta repetir la condición. Se acota a 50: una ficha con más reseñas que eso
 * necesitaría paginación propia, y todavía no es el caso.
 */
export const getResenasProducto = cache(
  async (productoId: string): Promise<Resena[]> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("resenas")
      .select("*")
      .eq("producto_id", productoId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(`Error cargando las reseñas: ${error.message}`);
    }

    return (data ?? []) as Resena[];
  }
);
