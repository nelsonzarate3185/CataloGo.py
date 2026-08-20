import * as React from "react";
import { cn } from "@/lib/utils";
import { formatGS } from "@/lib/utils";

type PriceSize = "sm" | "md" | "lg";

const sizeStyles: Record<PriceSize, { actual: string; anterior: string; badge: string }> = {
  sm: { actual: "text-base", anterior: "text-2xs", badge: "text-2xs" },
  md: { actual: "text-lg", anterior: "text-xs", badge: "text-xs" },
  lg: { actual: "text-2xl", anterior: "text-sm", badge: "text-sm" },
};

export interface PriceProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Precio vigente en guaraníes. */
  precio: number;
  /**
   * Precio de lista anterior. Se muestra tachado junto al porcentaje de
   * descuento sólo si es mayor que `precio`.
   */
  precioAnterior?: number | null;
  size?: PriceSize;
  /** Oculta el porcentaje de descuento aunque haya precio anterior. */
  ocultarDescuento?: boolean;
}

/**
 * Precio de producto con descuento opcional.
 *
 * El porcentaje se calcula acá y no se recibe por props para que no pueda
 * quedar desincronizado de los montos que se muestran.
 */
const Price = React.forwardRef<HTMLDivElement, PriceProps>(
  ({ precio, precioAnterior, size = "md", ocultarDescuento = false, className, ...props }, ref) => {
    const styles = sizeStyles[size];
    const hayDescuento = typeof precioAnterior === "number" && precioAnterior > precio;
    const porcentaje = hayDescuento
      ? Math.round(((precioAnterior - precio) / precioAnterior) * 100)
      : 0;

    return (
      <div ref={ref} className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)} {...props}>
        {hayDescuento && !ocultarDescuento && (
          <span className={cn("font-bold text-deal", styles.badge)}>-{porcentaje}%</span>
        )}

        <span className={cn("font-heading font-bold tabular-nums text-foreground", styles.actual)}>
          {formatGS(precio)}
        </span>

        {hayDescuento && (
          <span className={cn("text-muted-foreground line-through tabular-nums", styles.anterior)}>
            <span className="sr-only">Precio anterior: </span>
            {formatGS(precioAnterior)}
          </span>
        )}
      </div>
    );
  }
);
Price.displayName = "Price";

export { Price };
