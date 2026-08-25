import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CatalogoConRelaciones } from "@/types/catalogo";
import type { Producto, Resena } from "@/types/database";
import { esOrdenValido, type FiltrosCatalogo, type Orden } from "@/lib/productos";

/** Productos por página del listado. */
export const POR_PAGINA = 24;

/**
 * Carga el comercio y su catálogo activo, con las categorías.
 *
 * Ya no trae los productos: el listado los pide paginados y la ficha pide uno
 * solo. Antes esta consulta traía el catálogo entero incluso desde el layout y
 * el carrito, que no muestran ni un producto.
 *
 * Envuelto en `cache()` para que el layout y la página del mismo request
 * compartan una sola consulta.
 */
export const getCatalogoPorSlug = cache(
  async (slug: string): Promise<CatalogoConRelaciones | null> => {
    const supabase = await createClient();

    // Vía función security definer: la política de lectura pública de
    // `comercios` es `to anon`, así que un usuario con sesión que no sea el
    // dueño no puede leer la fila. La función devuelve sólo columnas públicas.
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
      .select("*, categorias ( * )")
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

export interface PaginaProductos {
  productos: Producto[];
  /** Total que cumple los filtros, no de la página. */
  total: number;
  pagina: number;
  paginas: number;
}

/**
 * Una página del listado, filtrada y ordenada por la base.
 *
 * El filtrado dejó de hacerse en memoria: traer el catálogo completo para
 * mostrar veinticuatro productos no escala a los planes sin límite, y ese costo
 * lo paga el comprador en su plan de datos.
 */
export async function getProductosPagina(
  catalogoId: string,
  filtros: FiltrosCatalogo,
  pagina: number
): Promise<PaginaProductos> {
  const supabase = await createClient();

  const paginaSegura = Math.max(1, Math.floor(pagina) || 1);
  const desde = (paginaSegura - 1) * POR_PAGINA;

  let consulta = supabase
    .from("productos")
    .select("*", { count: "exact" })
    .eq("catalogo_id", catalogoId)
    .eq("disponible", true);

  if (filtros.categoria) consulta = consulta.eq("categoria_id", filtros.categoria);
  if (filtros.marca) consulta = consulta.eq("marca", filtros.marca);
  if (typeof filtros.precioMin === "number") consulta = consulta.gte("precio", filtros.precioMin);
  if (typeof filtros.precioMax === "number") consulta = consulta.lte("precio", filtros.precioMax);
  if (filtros.soloOfertas) consulta = consulta.gt("descuento_pct", 0);

  if (filtros.q?.trim()) {
    // Se limpian comas y paréntesis: son separadores en la sintaxis de filtros
    // de PostgREST y un término que los contenga rompería la consulta.
    const termino = filtros.q.trim().replace(/[,()]/g, " ");
    consulta = consulta.or(
      `nombre.ilike.%${termino}%,descripcion.ilike.%${termino}%,marca.ilike.%${termino}%`
    );
  }

  switch (filtros.orden ?? "relevancia") {
    case "precio-asc":
      consulta = consulta.order("precio", { ascending: true });
      break;
    case "precio-desc":
      consulta = consulta.order("precio", { ascending: false });
      break;
    case "nombre":
      consulta = consulta.order("nombre", { ascending: true });
      break;
    case "descuento":
      consulta = consulta.order("descuento_pct", { ascending: false });
      break;
    case "calificacion":
      // `nullsFirst: false` deja al final los productos sin reseñas, en vez de
      // encabezar el listado con los que nadie calificó.
      consulta = consulta.order("calificacion_promedio", {
        ascending: false,
        nullsFirst: false,
      });
      break;
    default:
      consulta = consulta
        .order("destacado", { ascending: false })
        .order("orden", { ascending: true });
  }

  const { data, count, error } = await consulta.range(desde, desde + POR_PAGINA - 1);

  if (error) {
    throw new Error(`Error cargando los productos: ${error.message}`);
  }

  const total = count ?? 0;

  return {
    productos: (data ?? []) as Producto[],
    total,
    pagina: paginaSegura,
    paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
  };
}

export interface FacetasCatalogo {
  marcas: string[];
  rango: { min: number; max: number };
  hayOfertas: boolean;
}

/**
 * Marcas y rango de precios del catálogo.
 *
 * Antes se derivaban recorriendo todos los productos en memoria. Con
 * paginación esa información ya no está del lado del servidor de aplicación,
 * así que la calcula la base en una sola pasada.
 */
export const getFacetas = cache(
  async (catalogoId: string): Promise<FacetasCatalogo> => {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("catalogo_facetas", {
      p_catalogo_id: catalogoId,
    });

    if (error) {
      throw new Error(`Error cargando los filtros: ${error.message}`);
    }

    const f = data?.[0];

    return {
      marcas: f?.marcas ?? [],
      rango: { min: f?.precio_min ?? 0, max: f?.precio_max ?? 0 },
      hayOfertas: f?.hay_ofertas ?? false,
    };
  }
);

/** Un producto del catálogo, o null si no existe o no está disponible. */
export const getProducto = cache(
  async (catalogoId: string, productoId: string): Promise<Producto | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("catalogo_id", catalogoId)
      .eq("id", productoId)
      .eq("disponible", true)
      .maybeSingle();

    if (error) {
      throw new Error(`Error cargando el producto: ${error.message}`);
    }

    return (data as Producto) ?? null;
  }
);

/** Otros productos de la misma categoría, para el pie de la ficha. */
export async function getRelacionados(
  catalogoId: string,
  producto: Producto,
  limite = 5
): Promise<Producto[]> {
  const supabase = await createClient();

  let consulta = supabase
    .from("productos")
    .select("*")
    .eq("catalogo_id", catalogoId)
    .eq("disponible", true)
    .neq("id", producto.id);

  if (producto.categoria_id) {
    consulta = consulta.eq("categoria_id", producto.categoria_id);
  }

  const { data, error } = await consulta
    .order("destacado", { ascending: false })
    .order("orden", { ascending: true })
    .limit(limite);

  if (error) {
    throw new Error(`Error cargando productos relacionados: ${error.message}`);
  }

  return (data ?? []) as Producto[];
}

/** Criterio de orden pedido en la URL, validado. */
export function ordenDesdeUrl(valor: string | undefined): Orden | undefined {
  return esOrdenValido(valor) ? valor : undefined;
}

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
