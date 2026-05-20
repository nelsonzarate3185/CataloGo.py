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
      <div className="text-center py-16 bg-white rounded-xl border text-sm text-gray-400">
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
          className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50"
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
              className="bg-white rounded-xl border overflow-hidden"
            >
              <button
                onClick={() => setExpandido(isOpen ? null : pedido.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {pedido.nombre_cliente ?? "Cliente anónimo"}
                    <span className="text-gray-400 font-normal ml-2 text-xs">
                      #{pedido.id.slice(0, 8)}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(pedido.created_at).toLocaleString("es-PY")} ·{" "}
                    {items.length} item{items.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <span className="font-bold text-primary text-sm shrink-0">
                  {formatGS(pedido.total)}
                </span>
                <span className="text-gray-300 text-xs">{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div className="px-5 pb-4 border-t bg-gray-50">
                  <div className="pt-3 space-y-1.5">
                    {items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          {item.nombre} ×{item.cantidad}
                        </span>
                        <span className="text-gray-500 font-medium">
                          {formatGS(item.precio * item.cantidad)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t">
                      <span>Total</span>
                      <span className="text-primary">{formatGS(pedido.total)}</span>
                    </div>
                    {pedido.telefono_cliente && (
                      <a
                        href={`https://wa.me/595${pedido.telefono_cliente}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-2 text-xs text-green-600 underline"
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
