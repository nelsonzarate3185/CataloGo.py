"use client";

import { Minus, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCarrito, useItemsCarrito } from "@/lib/carrito";
import { useMontado } from "@/hooks/useMontado";
import { sePuedeComprar } from "@/lib/productos";
import type { Producto } from "@/types/database";

interface Props {
  slug: string;
  producto: Producto;
  /** `full` ocupa el ancho disponible; `compacto` se usa en la grilla. */
  variante?: "compacto" | "full";
}

/**
 * Agrega al carrito y, una vez agregado, se convierte en control de cantidad.
 *
 * Se renderiza como placeholder hasta montar porque la cantidad sale de
 * localStorage.
 */
export default function BotonAgregar({ slug, producto, variante = "compacto" }: Props) {
  const montado = useMontado();
  const items = useItemsCarrito(slug);
  const agregar = useCarrito((e) => e.agregar);
  const quitarUno = useCarrito((e) => e.quitarUno);

  const comprable = sePuedeComprar(producto);
  const cantidad = items.find((i) => i.producto_id === producto.id)?.cantidad ?? 0;
  const tope =
    typeof producto.stock === "number" ? Math.min(producto.stock, 99) : 99;

  if (!comprable) {
    return (
      <Button variant="outline" size="touch" disabled className="w-full">
        Sin stock
      </Button>
    );
  }

  if (!montado || cantidad === 0) {
    return (
      <Button
        variant="cta"
        size="touch"
        className="w-full"
        onClick={() => agregar(slug, producto)}
        disabled={!montado}
      >
        <ShoppingCart className="size-4" aria-hidden="true" />
        {variante === "full" ? "Agregar al carrito" : "Agregar"}
        <span className="sr-only"> — {producto.nombre}</span>
      </Button>
    );
  }

  return (
    <div className="flex w-full items-center justify-between overflow-hidden rounded-pill border border-border bg-white">
      <Button
        variant="ghost"
        size="icon-touch"
        className="rounded-none"
        onClick={() => quitarUno(slug, producto.id)}
      >
        <Minus className="size-4" aria-hidden="true" />
        <span className="sr-only">Quitar una unidad de {producto.nombre}</span>
      </Button>

      <span aria-live="polite" className="text-base font-bold tabular-nums">
        {cantidad}
        <span className="sr-only"> en el carrito</span>
      </span>

      <Button
        variant="ghost"
        size="icon-touch"
        className="rounded-none"
        disabled={cantidad >= tope}
        onClick={() => agregar(slug, producto)}
      >
        <Plus className="size-4" aria-hidden="true" />
        <span className="sr-only">Agregar una unidad de {producto.nombre}</span>
      </Button>
    </div>
  );
}
