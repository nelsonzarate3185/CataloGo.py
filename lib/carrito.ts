"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PedidoItem } from "@/types/catalogo";
import type { Producto } from "@/types/database";

/**
 * Carrito del comprador.
 *
 * Vive en Zustand con persistencia en localStorage porque el catálogo pasó a
 * ser multi-página: el estado tiene que sobrevivir a la navegación entre el
 * listado, la ficha de producto y el carrito.
 *
 * Se guarda por comercio (`clave` incluye el slug) para que dos catálogos
 * abiertos en el mismo navegador no mezclen pedidos.
 */

export interface ItemCarrito extends PedidoItem {
  /** Copia del stock al momento de agregar, para no exceder lo disponible. */
  stock: number | null;
}

interface EstadoCarrito {
  /** slug del comercio → items */
  porComercio: Record<string, ItemCarrito[]>;
  agregar: (slug: string, producto: Producto, cantidad?: number) => void;
  quitarUno: (slug: string, productoId: string) => void;
  eliminar: (slug: string, productoId: string) => void;
  fijarCantidad: (slug: string, productoId: string, cantidad: number) => void;
  vaciar: (slug: string) => void;
}

/** Tope por producto cuando el comercio no lleva control de stock. */
const MAX_POR_PRODUCTO = 99;

function topeDe(item: { stock: number | null }): number {
  return typeof item.stock === "number"
    ? Math.min(item.stock, MAX_POR_PRODUCTO)
    : MAX_POR_PRODUCTO;
}

export const useCarrito = create<EstadoCarrito>()(
  persist(
    (set) => ({
      porComercio: {},

      agregar: (slug, producto, cantidad = 1) =>
        set((estado) => {
          const items = estado.porComercio[slug] ?? [];
          const existente = items.find((i) => i.producto_id === producto.id);

          if (existente) {
            const tope = topeDe(existente);
            return {
              porComercio: {
                ...estado.porComercio,
                [slug]: items.map((i) =>
                  i.producto_id === producto.id
                    ? { ...i, cantidad: Math.min(i.cantidad + cantidad, tope) }
                    : i
                ),
              },
            };
          }

          const nuevo: ItemCarrito = {
            producto_id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            imagen_url: producto.imagen_url,
            stock: producto.stock,
            cantidad: Math.min(cantidad, topeDe(producto)),
          };

          return {
            porComercio: { ...estado.porComercio, [slug]: [...items, nuevo] },
          };
        }),

      quitarUno: (slug, productoId) =>
        set((estado) => {
          const items = estado.porComercio[slug] ?? [];
          return {
            porComercio: {
              ...estado.porComercio,
              [slug]: items
                .map((i) =>
                  i.producto_id === productoId ? { ...i, cantidad: i.cantidad - 1 } : i
                )
                .filter((i) => i.cantidad > 0),
            },
          };
        }),

      eliminar: (slug, productoId) =>
        set((estado) => ({
          porComercio: {
            ...estado.porComercio,
            [slug]: (estado.porComercio[slug] ?? []).filter(
              (i) => i.producto_id !== productoId
            ),
          },
        })),

      fijarCantidad: (slug, productoId, cantidad) =>
        set((estado) => {
          const items = estado.porComercio[slug] ?? [];
          return {
            porComercio: {
              ...estado.porComercio,
              [slug]: items
                .map((i) =>
                  i.producto_id === productoId
                    ? { ...i, cantidad: Math.min(Math.max(cantidad, 0), topeDe(i)) }
                    : i
                )
                .filter((i) => i.cantidad > 0),
            },
          };
        }),

      vaciar: (slug) =>
        set((estado) => ({
          porComercio: { ...estado.porComercio, [slug]: [] },
        })),
    }),
    {
      name: "catalogo-carrito",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

/** Items del comercio actual. Devuelve siempre un array. */
export function useItemsCarrito(slug: string): ItemCarrito[] {
  return useCarrito((estado) => estado.porComercio[slug]) ?? [];
}

export function totalUnidades(items: ItemCarrito[]): number {
  return items.reduce((suma, i) => suma + i.cantidad, 0);
}

export function totalPrecio(items: ItemCarrito[]): number {
  return items.reduce((suma, i) => suma + i.precio * i.cantidad, 0);
}
