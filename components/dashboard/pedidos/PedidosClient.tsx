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
          className="flex items-center gap-2 px-4 py-2 rounded-[9px] text-[13.5px] font-semibold transition-colors"
          style={{ border: "1px solid #dde0da", background: "#fff", color: "#1b2733" }}
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
              className="bg-white rounded-[12px] overflow-hidden"
              style={{ boxShadow: "0 1px 3px rgba(20,30,45,.06)", border: "1px solid #f0f1ec" }}
            >
              <button
                onClick={() => setExpandido(isOpen ? null : pedido.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors"
                style={{ background: isOpen ? "#fafaf8" : "transparent" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-foreground">
                    {pedido.nombre_cliente ?? "Cliente anónimo"}
                    <span className="font-normal ml-2 text-[12px]" style={{ color: "#8b95a1" }}>
                      #{pedido.id.slice(0, 8)}
                    </span>
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: "#8b95a1" }}>
                    {new Date(pedido.created_at).toLocaleString("es-PY")} ·{" "}
                    {items.length} item{items.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <span
                  className="px-[10px] py-[3px] rounded-[20px] text-[11.5px] font-bold shrink-0 hidden sm:inline-flex"
                  style={{ background: "#e7f4ec", color: "#1f8a52" }}
                >
                  Recibido
                </span>
                <span className="font-bold text-[14px] shrink-0 text-foreground">
                  {formatGS(pedido.total)}
                </span>
                <span className="text-[11px] shrink-0" style={{ color: "#c5d0db" }}>
                  {isOpen ? "▲" : "▼"}
                </span>
              </button>

              {isOpen && (
                <div
                  className="px-5 pb-4"
                  style={{ borderTop: "1px solid #f0f1ec", background: "#fafaf8" }}
                >
                  <div className="pt-3 space-y-2">
                    {items.map((item, i) => (
                      <div key={i} className="flex justify-between text-[13.5px]">
                        <span style={{ color: "#3a4651" }}>
                          {item.nombre} <span className="font-bold">×{item.cantidad}</span>
                        </span>
                        <span className="font-semibold" style={{ color: "#5f6b78" }}>
                          {formatGS(item.precio * item.cantidad)}
                        </span>
                      </div>
                    ))}
                    <div
                      className="flex justify-between text-[14px] font-bold pt-2"
                      style={{ borderTop: "1px solid #eceee8", color: "#1b2733" }}
                    >
                      <span>Total</span>
                      <span style={{ color: "#f6a623" }}>{formatGS(pedido.total)}</span>
                    </div>
                    {pedido.telefono_cliente && (
                      <a
                        href={`https://wa.me/595${pedido.telefono_cliente}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-1 text-[12.5px] font-semibold underline"
                        style={{ color: "#1f8a52" }}
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
