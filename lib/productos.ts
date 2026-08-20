/**
 * Lógica pura de productos: filtros, orden y derivados.
 *
 * Vive separada de `lib/catalogo.ts` porque la consumen componentes cliente.
 * `lib/catalogo.ts` importa el cliente Supabase de servidor, que usa
 * `next/headers`; importarlo desde el cliente rompe el build.
 */
import type { Producto } from "@/types/database";

/** Criterios de orden que acepta el listado. */
export const ORDENES = {
  relevancia: "Destacados primero",
  "precio-asc": "Precio: menor a mayor",
  "precio-desc": "Precio: mayor a menor",
  nombre: "Nombre A-Z",
  descuento: "Mayor descuento",
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

/**
 * Aplica filtros y orden sobre los productos del catálogo.
 *
 * Se filtra en memoria y no en Supabase a propósito: los planes van de 5 a 90
 * productos y el catálogo ya viene completo en una sola consulta. Traer todo y
 * filtrar acá evita un round-trip por cada cambio de filtro.
 */
export function filtrarProductos(
  productos: Producto[],
  filtros: FiltrosCatalogo
): Producto[] {
  let lista = productos.filter((p) => p.disponible);

  if (filtros.categoria) {
    lista = lista.filter((p) => p.categoria_id === filtros.categoria);
  }

  if (filtros.marca) {
    lista = lista.filter((p) => p.marca === filtros.marca);
  }

  if (filtros.q?.trim()) {
    const q = filtros.q.trim().toLowerCase();
    lista = lista.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.descripcion?.toLowerCase().includes(q) ?? false) ||
        (p.marca?.toLowerCase().includes(q) ?? false)
    );
  }

  if (typeof filtros.precioMin === "number") {
    lista = lista.filter((p) => p.precio >= filtros.precioMin!);
  }
  if (typeof filtros.precioMax === "number") {
    lista = lista.filter((p) => p.precio <= filtros.precioMax!);
  }

  if (filtros.soloOfertas) {
    lista = lista.filter((p) => porcentajeDescuento(p) > 0);
  }

  return ordenarProductos(lista, filtros.orden ?? "relevancia");
}

function ordenarProductos(productos: Producto[], orden: Orden): Producto[] {
  const lista = [...productos];

  switch (orden) {
    case "precio-asc":
      return lista.sort((a, b) => a.precio - b.precio);
    case "precio-desc":
      return lista.sort((a, b) => b.precio - a.precio);
    case "nombre":
      return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    case "descuento":
      return lista.sort((a, b) => porcentajeDescuento(b) - porcentajeDescuento(a));
    case "relevancia":
    default:
      return lista.sort((a, b) => {
        if (a.destacado !== b.destacado) return a.destacado ? -1 : 1;
        return a.orden - b.orden;
      });
  }
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

  for (const [clave, valor] of Object.entries({ ...actuales, ...cambios })) {
    if (valor === undefined || valor === "" || valor === false) continue;
    params.set(clave, String(valor));
  }

  const query = params.toString();
  return query ? `/c/${slug}?${query}` : `/c/${slug}`;
}

/** Rango de precios del catálogo, para acotar el filtro. */
export function rangoPrecios(productos: Producto[]): { min: number; max: number } {
  if (productos.length === 0) return { min: 0, max: 0 };
  const precios = productos.map((p) => p.precio);
  return { min: Math.min(...precios), max: Math.max(...precios) };
}
