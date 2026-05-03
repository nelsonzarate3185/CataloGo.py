import { formatGS } from "./utils";

export interface CartItem {
  nombre: string;
  cantidad: number;
  precio: number;
  variante?: string;
}

export interface WhatsAppOrderOptions {
  telefono: string;
  nombreNegocio: string;
  items: CartItem[];
  nota?: string;
}

/** Genera la URL de WhatsApp con el pedido pre-formateado */
export function buildWhatsAppUrl(options: WhatsAppOrderOptions): string {
  const { telefono, nombreNegocio, items, nota } = options;

  const lineas = items.map((item) => {
    const variante = item.variante ? ` (${item.variante})` : "";
    return `• ${item.cantidad}x ${item.nombre}${variante} — ${formatGS(item.precio * item.cantidad)}`;
  });

  const total = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);

  const mensaje = [
    `*Pedido en ${nombreNegocio}*`,
    "",
    ...lineas,
    "",
    `*Total: ${formatGS(total)}*`,
    nota ? `\nNota: ${nota}` : "",
  ]
    .join("\n")
    .trim();

  const numero = telefono.replace(/\D/g, "");
  const encoded = encodeURIComponent(mensaje);

  return `https://wa.me/595${numero}?text=${encoded}`;
}
