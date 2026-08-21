import { formatGS } from "./utils";
import type { PedidoItem } from "@/types/catalogo";

export interface WhatsAppOrderOptions {
  whatsapp: string;
  nombreComercio: string;
  items: PedidoItem[];
  /**
   * Origen del sitio y slug del comercio. Con ambos, cada línea del pedido
   * incluye el enlace al producto. Si falta alguno se arma el mensaje sin
   * enlaces en vez de generar URLs rotas.
   */
  baseUrl?: string;
  slug?: string;
}

/**
 * Tope de caracteres del mensaje ya codificado.
 *
 * wa.me recibe el texto como parámetro de URL, y los navegadores truncan las
 * URLs muy largas. Un pedido cortado a la mitad es peor que un pedido sin
 * enlaces, así que al superarse este tope se omiten los enlaces por producto.
 * El valor es conservador: la codificación infla bastante, porque cada salto
 * de línea y cada acento ocupan tres caracteres.
 */
const MAX_LARGO_CODIFICADO = 3500;

function armarMensaje(
  nombreComercio: string,
  items: PedidoItem[],
  enlaceDe: ((item: PedidoItem) => string) | null
): string {
  const lineas = items.flatMap((item) => {
    const linea = `• ${item.nombre} x${item.cantidad} — ${formatGS(
      item.precio * item.cantidad
    )}`;
    return enlaceDe ? [linea, enlaceDe(item)] : [linea];
  });

  const total = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);

  return [
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
}

/** Genera el mensaje formateado y la URL de WhatsApp */
export function buildWhatsAppUrl(options: WhatsAppOrderOptions): string {
  const { whatsapp, nombreComercio, items, baseUrl, slug } = options;

  const puedeEnlazar = Boolean(baseUrl && slug);
  const enlaceDe = puedeEnlazar
    ? (item: PedidoItem) => `${baseUrl}/c/${slug}/p/${item.producto_id}`
    : null;

  let mensaje = armarMensaje(nombreComercio, items, enlaceDe);

  // Con carritos grandes los enlaces pueden empujar la URL más allá de lo que
  // el navegador acepta. Se rehace sin ellos antes que arriesgar el pedido.
  if (enlaceDe && encodeURIComponent(mensaje).length > MAX_LARGO_CODIFICADO) {
    mensaje = armarMensaje(nombreComercio, items, null);
  }

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
