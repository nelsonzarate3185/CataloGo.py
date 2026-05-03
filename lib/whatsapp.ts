import { formatGS } from "./utils";
import type { PedidoItem } from "@/types/catalogo";

export interface WhatsAppOrderOptions {
  whatsapp: string;
  nombreComercio: string;
  items: PedidoItem[];
}

/** Genera el mensaje formateado y la URL de WhatsApp */
export function buildWhatsAppUrl(options: WhatsAppOrderOptions): string {
  const { whatsapp, nombreComercio, items } = options;

  const lineas = items.map(
    (item) =>
      `• ${item.nombre} x${item.cantidad} — ${formatGS(item.precio * item.cantidad)}`
  );

  const total = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);

  const mensaje = [
    "Hola! Quiero hacer el siguiente pedido:",
    "",
    `🛍️ *${nombreComercio}*`,
    "",
    ...lineas,
    "",
    `💰 *Total: ${formatGS(total)}*`,
    "",
    "Gracias!",
  ].join("\n");

  const numero = whatsapp.replace(/\D/g, "");
  return `https://wa.me/595${numero}?text=${encodeURIComponent(mensaje)}`;
}

export type { PedidoItem };
