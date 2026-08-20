import { cn } from "@/lib/utils";
import type { PlanTipo } from "@/types/database";

/**
 * Badges de estado y plan del panel admin.
 *
 * Estas dos escalas estaban duplicadas literalmente en `app/admin/page.tsx`,
 * `ComerciosAdminClient`, `SolicitudesAdminClient` y `UsuariosAdminClient`, cada
 * una con su propio mapa de colores. Vivir en un solo lugar evita que se
 * desincronicen cuando se agregue un estado o un plan.
 *
 * El color siempre acompaña a una etiqueta escrita: nunca informa por sí solo.
 */

export const clasesCategoria = {
  verde: "bg-cat-verde-fondo text-cat-verde",
  ambar: "bg-cat-ambar-fondo text-cat-ambar",
  rojo: "bg-cat-rojo-fondo text-cat-rojo",
  naranja: "bg-cat-naranja-fondo text-cat-naranja",
  azul: "bg-cat-azul-fondo text-cat-azul",
  violeta: "bg-cat-violeta-fondo text-cat-violeta",
  neutro: "bg-muted text-muted-foreground",
} as const;

export type Categoria = keyof typeof clasesCategoria;

const base =
  "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-2xs font-bold";

/** Estado de un comercio. */
export const ESTADOS_COMERCIO = {
  active: { label: "Activo", categoria: "verde" },
  pending_approval: { label: "Pendiente", categoria: "ambar" },
  blocked: { label: "Bloqueado", categoria: "rojo" },
  blocked_unpaid: { label: "Deuda", categoria: "naranja" },
  suspended: { label: "Suspendido", categoria: "neutro" },
} as const satisfies Record<string, { label: string; categoria: Categoria }>;

export type EstadoComercio = keyof typeof ESTADOS_COMERCIO;

export function EstadoBadge({
  estado,
  className,
}: {
  estado: string;
  className?: string;
}) {
  const config = ESTADOS_COMERCIO[estado as EstadoComercio];
  const categoria: Categoria = config?.categoria ?? "neutro";

  return (
    <span className={cn(base, clasesCategoria[categoria], className)}>
      {config?.label ?? estado}
    </span>
  );
}

/** Estado de una solicitud de plan. */
export const ESTADOS_SOLICITUD = {
  pending: { label: "Pendiente", categoria: "ambar" },
  approved: { label: "Aprobado", categoria: "verde" },
  rejected: { label: "Rechazado", categoria: "rojo" },
} as const satisfies Record<string, { label: string; categoria: Categoria }>;

export type EstadoSolicitud = keyof typeof ESTADOS_SOLICITUD;

export function SolicitudBadge({
  estado,
  className,
}: {
  estado: string;
  className?: string;
}) {
  const config = ESTADOS_SOLICITUD[estado as EstadoSolicitud];
  const categoria: Categoria = config?.categoria ?? "neutro";

  return (
    <span className={cn(base, clasesCategoria[categoria], className)}>
      {config?.label ?? estado}
    </span>
  );
}

/** Nivel de plan. */
const CATEGORIA_PLAN: Record<PlanTipo, Categoria> = {
  basico: "neutro",
  pro: "azul",
  plus: "violeta",
  business: "naranja",
};

export function PlanBadge({
  plan,
  className,
}: {
  plan: PlanTipo;
  className?: string;
}) {
  return (
    <span className={cn(base, clasesCategoria[CATEGORIA_PLAN[plan] ?? "neutro"], className)}>
      {plan}
    </span>
  );
}
