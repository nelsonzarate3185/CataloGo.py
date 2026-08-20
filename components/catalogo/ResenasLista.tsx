import { Rating } from "@/components/ui/rating";
import { Separator } from "@/components/ui/separator";
import type { Resena } from "@/types/database";

interface Props {
  resenas: Resena[];
  promedio: number | null;
  total: number;
}

/**
 * Reseñas publicadas de un producto.
 *
 * Se renderiza en el servidor: sólo llegan las aprobadas, filtradas por RLS.
 * El aviso sobre el origen de las reseñas es deliberado — son anónimas y sin
 * compra verificada, y ocultarlo sería engañar al comprador.
 */
export default function ResenasLista({ resenas, promedio, total }: Props) {
  if (resenas.length === 0) {
    return (
      <p className="text-base text-muted-foreground">
        Este producto todavía no tiene reseñas. Sé la primera persona en dejar una.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Rating valor={promedio} cantidad={total} size="lg" />
      </div>

      <p className="text-xs text-muted-foreground">
        Las reseñas son anónimas y no verifican una compra.
      </p>

      <Separator />

      <ul className="space-y-4">
        {resenas.map((resena) => (
          <li key={resena.id}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold">{resena.nombre}</span>
              <Rating valor={resena.calificacion} size="sm" soloEstrellas />
              <time
                dateTime={resena.created_at}
                className="text-xs text-muted-foreground"
              >
                {new Date(resena.created_at).toLocaleDateString("es-PY", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
            </div>

            {resena.comentario && (
              <p className="mt-1 whitespace-pre-line text-base leading-relaxed">
                {resena.comentario}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
