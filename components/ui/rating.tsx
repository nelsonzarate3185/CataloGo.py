import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const tamanos = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
} as const;

export interface RatingProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Promedio de 1 a 5. NULL o 0 se considera "sin reseñas". */
  valor: number | null;
  /** Cantidad de reseñas, para el texto al lado de las estrellas. */
  cantidad?: number;
  size?: keyof typeof tamanos;
  /** Oculta el conteo y deja sólo las estrellas. */
  soloEstrellas?: boolean;
}

/**
 * Estrellas de calificación.
 *
 * Rellena media estrella con un recorte por ancho, no redondeando: un 4.4 y un
 * 4.6 tienen que verse distintos porque el número que los acompaña también lo
 * es. El valor accesible va en un `title` y en texto para lectores, porque el
 * color y la forma no son legibles por sí solos.
 */
const Rating = React.forwardRef<HTMLDivElement, RatingProps>(
  ({ valor, cantidad, size = "md", soloEstrellas = false, className, ...props }, ref) => {
    if (valor === null || valor <= 0) {
      return soloEstrellas ? null : (
        <p ref={ref} className={cn("text-xs text-muted-foreground", className)} {...props}>
          Sin reseñas
        </p>
      );
    }

    const acotado = Math.min(Math.max(valor, 0), 5);
    const etiqueta = `${acotado.toFixed(1)} de 5${
      typeof cantidad === "number" ? `, ${cantidad} ${cantidad === 1 ? "reseña" : "reseñas"}` : ""
    }`;

    return (
      <div ref={ref} className={cn("flex items-center gap-1.5", className)} {...props}>
        <span className="relative inline-flex" title={etiqueta}>
          <span className="flex">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className={cn(tamanos[size], "text-star/35")} aria-hidden="true" />
            ))}
          </span>
          <span
            className="absolute inset-y-0 left-0 flex overflow-hidden"
            style={{ width: `${(acotado / 5) * 100}%` }}
            aria-hidden="true"
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className={cn(tamanos[size], "shrink-0 fill-star text-star")} />
            ))}
          </span>
        </span>

        {!soloEstrellas && (
          <span className="text-xs text-muted-foreground">
            {acotado.toFixed(1)}
            {typeof cantidad === "number" && ` (${cantidad})`}
          </span>
        )}

        <span className="sr-only">{etiqueta}</span>
      </div>
    );
  }
);
Rating.displayName = "Rating";

export { Rating };
