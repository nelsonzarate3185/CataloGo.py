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

    const { data: comercio, error: errorComercio } = await supabase
      .from("comercios")
      .select("id, nombre, whatsapp, logo_url, plan, direccion")
      .eq("slug", slug)
      .eq("activo", true)
      .single();

    // PGRST116 es "no se encontró ninguna fila", que para `.single()` significa
    // que el slug no existe o el comercio está inactivo: eso sí es un 404.
    // Cualquier otro error (RLS, conexión, esquema) tiene que propagarse. Si se
    // devuelve null para todo, un fallo de infraestructura se vuelve
    // indistinguible de una tienda inexistente y no hay forma de diagnosticarlo.
    if (errorComercio && errorComercio.code !== "PGRST116") {
      throw new Error(
        `Error cargando el comercio "${slug}": ${errorComercio.message} (${errorComercio.code})`
      );
    }

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
