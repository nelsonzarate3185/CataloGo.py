import { PRECIOS_PLAN, type PlanTipo } from "@/types/database";

/**
 * Estado de cobro de un comercio.
 *
 * `gratuito` existe aparte de `al_dia` porque el plan básico no se cobra: sin
 * esa distinción, todos los comercios gratuitos aparecerían como deudores y el
 * tablero quedaría inservible.
 */
export type EstadoCobro = "gratuito" | "al_dia" | "por_vencer" | "atrasado" | "sin_pagos";

/** Días antes del vencimiento en que un comercio pasa a "por vencer". */
export const DIAS_AVISO = 7;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Días que faltan para el vencimiento. Negativo si ya pasó.
 *
 * Se compara a medianoche para que un vencimiento de hoy cuente como 0 y no
 * como fracción: al comerciante le vence el día, no la hora.
 */
export function diasHastaVencimiento(expiraAt: string, hoy: Date): number {
  const vence = new Date(expiraAt);
  const a = Date.UTC(vence.getUTCFullYear(), vence.getUTCMonth(), vence.getUTCDate());
  const b = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  return Math.round((a - b) / MS_POR_DIA);
}

export function estadoCobro(
  plan: PlanTipo,
  planExpiraAt: string | null,
  hoy: Date
): EstadoCobro {
  if (PRECIOS_PLAN[plan] === 0) return "gratuito";
  if (!planExpiraAt) return "sin_pagos";

  const dias = diasHastaVencimiento(planExpiraAt, hoy);
  if (dias < 0) return "atrasado";
  if (dias <= DIAS_AVISO) return "por_vencer";
  return "al_dia";
}

export const ETIQUETA_ESTADO: Record<EstadoCobro, string> = {
  gratuito: "Plan gratuito",
  al_dia: "Al día",
  por_vencer: "Por vencer",
  atrasado: "Atrasado",
  sin_pagos: "Sin pagos",
};

/** Fecha en que arranca el próximo período: el día siguiente al vencimiento. */
export function proximoPeriodo(
  planExpiraAt: string | null,
  hoy: Date
): { desde: string; hasta: string } {
  // Si el vencimiento anterior sigue vigente, el período nuevo arranca cuando
  // termina el anterior. Así los pagos adelantados se acumulan en vez de
  // pisarse.
  const base = planExpiraAt && new Date(planExpiraAt) > hoy ? new Date(planExpiraAt) : hoy;

  const desde = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  return { desde: iso(desde), hasta: iso(sumarUnMes(desde)) };
}

/**
 * Suma un mes recortando al último día del mes destino.
 *
 * `setUTCMonth` desborda: al 31 de enero le suma un mes y devuelve 3 de marzo,
 * porque el 31 de febrero no existe y la fecha se normaliza hacia adelante. Un
 * comercio que paga un día 31 acumularía días de regalo y su fecha de cobro se
 * correría sola mes a mes.
 */
function sumarUnMes(fecha: Date): Date {
  const dia = fecha.getUTCDate();
  const anio = fecha.getUTCFullYear();
  const mes = fecha.getUTCMonth() + 1;

  // Día 0 del mes siguiente es el último día del mes destino.
  const ultimoDiaDestino = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();

  return new Date(Date.UTC(anio, mes, Math.min(dia, ultimoDiaDestino)));
}

function iso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/** Precio mensual del plan, para prellenar el monto. */
export function precioMensual(plan: PlanTipo): number {
  return PRECIOS_PLAN[plan] ?? 0;
}
