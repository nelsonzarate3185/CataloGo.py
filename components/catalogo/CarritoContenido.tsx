"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Trash2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Price } from "@/components/ui/price";
import {
  useCarrito,
  useItemsCarrito,
  totalPrecio,
  totalUnidades,
} from "@/lib/carrito";
import { useMontado } from "@/hooks/useMontado";
import { createClient } from "@/lib/supabase/client";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { baseUrlCliente } from "@/lib/urls";
import { formatGS } from "@/lib/utils";
import type { CatalogoConRelaciones } from "@/types/catalogo";

interface Props {
  slug: string;
  catalogoId: string;
  comercio: CatalogoConRelaciones["comercios"];
}

export default function CarritoContenido({ slug, catalogoId, comercio }: Props) {
  const montado = useMontado();
  const items = useItemsCarrito(slug);
  const fijarCantidad = useCarrito((e) => e.fijarCantidad);
  const eliminar = useCarrito((e) => e.eliminar);
  const vaciar = useCarrito((e) => e.vaciar);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = totalPrecio(items);
  const unidades = totalUnidades(items);

  async function enviarPedido() {
    if (items.length === 0) return;

    // Se comprueba antes de intentar: sin conexión, el insert queda colgado
    // hasta agotar el tiempo de espera y el comprador no entiende qué pasa.
    // `navigator.onLine` sólo detecta la falta de red local, no un corte más
    // arriba, así que igual hace falta el manejo de error de abajo.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setError("Parece que no tenés conexión. Revisá tus datos o el WiFi y probá de nuevo.");
      return;
    }

    setEnviando(true);
    setError(null);

    const pedidoItems = items.map(({ producto_id, nombre, precio, cantidad, imagen_url }) => ({
      producto_id,
      nombre,
      precio,
      cantidad,
      imagen_url,
    }));

    // La URL se arma antes de la escritura: si el registro del pedido falla, el
    // comprador igual tiene que poder mandar su mensaje. El pedido en la base es
    // para la métrica del comercio, no un requisito de la compra.
    const url = buildWhatsAppUrl({
      whatsapp: comercio.whatsapp,
      nombreComercio: comercio.nombre,
      items: pedidoItems,
      // Con esto cada línea del pedido lleva el enlace al producto, para que el
      // vendedor vea de inmediato qué le están pidiendo.
      baseUrl: baseUrlCliente(),
      slug,
    });

    const supabase = createClient();
    const { error: errorInsert } = await supabase.from("pedidos").insert({
      comercio_id: comercio.id,
      catalogo_id: catalogoId,
      items: pedidoItems,
      total,
    });

    if (errorInsert) {
      setError(
        "No pudimos registrar el pedido, pero podés enviarlo igual por WhatsApp."
      );
    }

    setEnviando(false);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (!montado) {
    return (
      <div className="rounded-lg bg-card px-6 py-16 text-center text-sm text-muted-foreground">
        Cargando tu carrito…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg bg-card px-6 py-16 text-center">
        <p className="font-heading text-lg font-bold">Tu carrito está vacío</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Agregá productos del catálogo para armar tu pedido.
        </p>
        <Link
          href={`/c/${slug}`}
          className="mt-4 inline-block text-sm text-link hover:underline"
        >
          Ver el catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="rounded-lg bg-card p-4">
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const tope = typeof item.stock === "number" ? Math.min(item.stock, 99) : 99;

            return (
              <li key={item.producto_id} className="flex gap-3 py-4 first:pt-0">
                <Link
                  href={`/c/${slug}/p/${item.producto_id}`}
                  className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted"
                >
                  {item.imagen_url ? (
                    <Image
                      src={item.imagen_url}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-2xs text-muted-foreground">
                      Sin foto
                    </span>
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/c/${slug}/p/${item.producto_id}`}
                    className="line-clamp-2 text-base hover:text-link hover:underline"
                  >
                    {item.nombre}
                  </Link>

                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {formatGS(item.precio)} c/u
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div className="flex items-center overflow-hidden rounded-md border border-border">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-none"
                        onClick={() =>
                          fijarCantidad(slug, item.producto_id, item.cantidad - 1)
                        }
                      >
                        <Minus className="size-4" aria-hidden="true" />
                        <span className="sr-only">
                          Quitar una unidad de {item.nombre}
                        </span>
                      </Button>

                      <span className="w-9 text-center text-base font-bold tabular-nums">
                        {item.cantidad}
                      </span>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-none"
                        disabled={item.cantidad >= tope}
                        onClick={() =>
                          fijarCantidad(slug, item.producto_id, item.cantidad + 1)
                        }
                      >
                        <Plus className="size-4" aria-hidden="true" />
                        <span className="sr-only">
                          Agregar una unidad de {item.nombre}
                        </span>
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-link"
                      onClick={() => eliminar(slug, item.producto_id)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      Eliminar
                      <span className="sr-only"> {item.nombre} del carrito</span>
                    </Button>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <Price precio={item.precio * item.cantidad} size="sm" />
                </div>
              </li>
            );
          })}
        </ul>

        <Separator className="my-3" />

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="text-link" onClick={() => vaciar(slug)}>
            Vaciar carrito
          </Button>
          <p className="text-base">
            Subtotal ({unidades} {unidades === 1 ? "artículo" : "artículos"}):{" "}
            <strong className="font-heading text-lg font-bold">{formatGS(total)}</strong>
          </p>
        </div>
      </div>

      <aside className="h-fit rounded-lg border border-border bg-card p-4 lg:sticky lg:top-24">
        <p className="text-base">
          Subtotal ({unidades} {unidades === 1 ? "artículo" : "artículos"}):
        </p>
        <p className="mt-1 font-heading text-2xl font-bold">{formatGS(total)}</p>

        {error && (
          <p role="alert" className="mt-3 text-sm text-deal">
            {error}
          </p>
        )}

        <Button
          variant="cta"
          size="touch"
          className="mt-4 w-full"
          onClick={enviarPedido}
          disabled={enviando}
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          {enviando ? "Abriendo WhatsApp…" : "Enviar pedido por WhatsApp"}
        </Button>

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Se abre WhatsApp con el pedido escrito. Coordinás pago y entrega
          directamente con {comercio.nombre}.
        </p>

        <Separator className="my-3" />

        <Link href={`/c/${slug}`} className="text-sm text-link hover:underline">
          Seguir comprando
        </Link>
      </aside>
    </div>
  );
}
