"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { formatGS } from "@/lib/utils";
import type { Pedido } from "@/types/database";
import type { PedidoItem } from "@/types/catalogo";

interface Props {
  pedidos: Pedido[];
  comercioNombre: string;
}

export default function PedidosClient({ pedidos, comercioNombre }: Props) {
  const [expandido, setExpandido] = useState<string | null>(null);

  async function exportarExcel() {
    const { utils, writeFile } = await import("xlsx");
    const rows = pedidos.flatMap((p) => {
      const items = p.items as unknown as PedidoItem[];
      return items.map((item) => ({
        Fecha: new Date(p.created_at).toLocaleString("es-PY"),
        Pedido: p.id.slice(0, 8),
        Cliente: p.nombre_cliente ?? "-",
        Telefono: p.telefono_cliente ?? "-",
        Producto: item.nombre,
        Cantidad: item.cantidad,
        "Precio unit.": item.precio,
        Subtotal: item.precio * item.cantidad,
        "Total pedido": p.total,
      }));
    });

    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Pedidos");
    writeFile(wb, `pedidos-${comercioNombre}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  if (pedidos.length === 0) {
    return (
      <div className="text-center py-16 bg-card rounded-xl border text-sm text-muted-foreground">
        Todavía no recibiste pedidos. Cuando un cliente envíe su pedido por
        WhatsApp, aparecerá aquí.
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={exportarExcel}
          className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <Download className="w-4 h-4" />
          Exportar Excel
        </button>
      </div>

      <div className="space-y-2">
        {pedidos.map((pedido) => {
          const items = pedido.items as unknown as PedidoItem[];
          const isOpen = expandido === pedido.id;

          return (
            <div
              key={pedido.id}
              className="overflow-hidden rounded-lg border border-border bg-card shadow-card"
            >
              <button
                onClick={() => setExpandido(isOpen ? null : pedido.id)}
                className={`flex w-full items-center gap-4 px-5 py-4 text-left transition-colors ${
                  isOpen ? "bg-muted" : "bg-transparent"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-foreground">
                    {pedido.nombre_cliente ?? "Cliente anónimo"}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      #{pedido.id.slice(0, 8)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(pedido.created_at).toLocaleString("es-PY")} ·{" "}
                    {items.length} item{items.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <span
                  className="hidden shrink-0 rounded-full bg-success/10 px-2.5 py-0.5 text-2xs font-bold text-success sm:inline-flex"
                >
                  Recibido
                </span>
                <span className="font-bold text-[14px] shrink-0 text-foreground">
                  {formatGS(pedido.total)}
                </span>
                <span aria-hidden="true" className="shrink-0 text-2xs text-muted-foreground">
                  {isOpen ? "▲" : "▼"}
                </span>
              </button>

              {isOpen && (
                <div
                  className="border-t border-border bg-muted px-5 pb-4"
                >
                  <div className="pt-3 space-y-2">
                    {items.map((item, i) => (
                      <div key={i} className="flex justify-between text-[13.5px]">
                        <span className="text-foreground">
                          {item.nombre} <span className="font-bold">×{item.cantidad}</span>
                        </span>
                        <span className="font-semibold text-muted-foreground">
                          {formatGS(item.precio * item.cantidad)}
                        </span>
                      </div>
                    ))}
                    <div
                      className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground"
                    >
                      <span>Total</span>
                      <span className="text-primary">{formatGS(pedido.total)}</span>
                    </div>
                    {pedido.telefono_cliente && (
                      <a
                        href={`https://wa.me/595${pedido.telefono_cliente}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block text-xs font-semibold text-success underline"
                      >
                        Contactar por WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
