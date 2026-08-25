/**
 * Lógica pura de productos: filtros, orden y derivados.
 *
 * Vive separada de `lib/catalogo.ts` porque la consumen componentes cliente.
 * `lib/catalogo.ts` importa el cliente Supabase de servidor, que usa
 * `next/headers`; importarlo desde el cliente rompe el build.
 *
 * El filtrado y el orden ya no viven acá: los hace la base, para no traer el
 * catálogo entero y descartarlo en memoria. Quedan sólo los derivados que
 * necesita la interfaz.
 */
import type { Producto } from "@/types/database";

/** Criterios de orden que acepta el listado. */
export const ORDENES = {
  relevancia: "Destacados primero",
  "precio-asc": "Precio: menor a mayor",
  "precio-desc": "Precio: mayor a menor",
  nombre: "Nombre A-Z",
  descuento: "Mayor descuento",
  calificacion: "Mejor calificados",
} as const;

export type Orden = keyof typeof ORDENES;

export function esOrdenValido(valor: string | undefined): valor is Orden {
  return valor !== undefined && valor in ORDENES;
}

export interface FiltrosCatalogo {
  q?: string;
  categoria?: string;
  marca?: string;
  precioMin?: number;
  precioMax?: number;
  soloOfertas?: boolean;
  orden?: Orden;
}

/** Descuento en porcentaje, o 0 si el producto no está en oferta. */
export function porcentajeDescuento(producto: Producto): number {
  const anterior = producto.precio_anterior;
  if (typeof anterior !== "number" || anterior <= producto.precio) return 0;
  return Math.round(((anterior - producto.precio) / anterior) * 100);
}

/** Un producto se puede comprar si está disponible y, si lleva stock, le queda. */
export function sePuedeComprar(producto: Producto): boolean {
  if (!producto.disponible) return false;
  if (typeof producto.stock === "number" && producto.stock <= 0) return false;
  return true;
}

/** Marcas presentes en el catálogo, ordenadas, para el filtro lateral. */
export function marcasDisponibles(productos: Producto[]): string[] {
  const marcas = new Set<string>();
  for (const p of productos) {
    if (p.marca?.trim()) marcas.add(p.marca.trim());
  }
  return Array.from(marcas).sort((a, b) => a.localeCompare(b, "es"));
}

/**
 * Construye la URL del listado aplicando cambios sobre los filtros vigentes.
 *
 * Un valor `undefined` o cadena vacía quita ese parámetro, de modo que
 * `construirUrl(slug, filtros, { marca: undefined })` sirve para el chip de
 * "quitar filtro" sin lógica aparte.
 */
export function construirUrl(
  slug: string,
  actuales: Record<string, string | undefined>,
  cambios: Record<string, string | number | boolean | undefined>
): string {
  const params = new URLSearchParams();

  // Cambiar un filtro vuelve a la primera página: mantener el número anterior
  // dejaría al comprador en una página que puede no existir con el filtro
  // nuevo, viendo un listado vacío. La paginación lo pasa explícitamente.
  const combinados = { ...actuales, pagina: undefined, ...cambios };

  for (const [clave, valor] of Object.entries(combinados)) {
    if (valor === undefined || valor === "" || valor === false) continue;
    params.set(clave, String(valor));
  }

  const query = params.toString();
  return query ? `/c/${slug}?${query}` : `/c/${slug}`;
}
