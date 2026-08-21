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

  return `${whatsappUrl(whatsapp)}?text=${encodeURIComponent(mensaje)}`;
}

export type { PedidoItem };

/**
 * Normaliza un número paraguayo al formato internacional que espera wa.me.
 *
 * Quita el cero inicial: el formulario pide nueve dígitos sin él, pero hay
 * registros cargados como "0981…". Sin este recorte el enlace queda
 * "wa.me/5950981…" y el pedido no llega a nadie.
 */
function normalizarNumero(whatsapp: string): string {
  const digitos = whatsapp.replace(/\D/g, "");
  const sinCero = digitos.startsWith("0") ? digitos.slice(1) : digitos;
  return sinCero.startsWith("595") ? sinCero : `595${sinCero}`;
}

/** Enlace de WhatsApp al comercio, sin mensaje precargado. */
export function whatsappUrl(whatsapp: string): string {
  return `https://wa.me/${normalizarNumero(whatsapp)}`;
}

/**
 * Formatea un número paraguayo para mostrar: 981123456 → "+595 981 123 456".
 *
 * Si no tiene los 9 dígitos esperados se devuelve tal cual en lugar de
 * inventar un formato: es preferible mostrar un número raro a mostrar uno
 * incorrecto con el que el comprador no pueda comunicarse.
 */
export function formatWhatsApp(whatsapp: string): string {
  const nacional = normalizarNumero(whatsapp).replace(/^595/, "");
  if (nacional.length !== 9) return whatsapp;
  return `+595 ${nacional.slice(0, 3)} ${nacional.slice(3, 6)} ${nacional.slice(6)}`;
}
