import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { construirUrl } from "@/lib/productos";
import { cn } from "@/lib/utils";

interface Props {
  slug: string;
  parametros: Record<string, string | undefined>;
  pagina: number;
  paginas: number;
}

/**
 * Paginación del listado.
 *
 * Son enlaces y no botones, igual que los filtros: cada página tiene su URL,
 * se puede compartir y funciona sin JavaScript.
 *
 * Se muestran hasta cinco números alrededor del actual. Con muchas páginas,
 * listarlas todas llena la pantalla en un teléfono sin aportar nada.
 */
export default function Paginacion({ slug, parametros, pagina, paginas }: Props) {
  const desde = Math.max(1, Math.min(pagina - 2, paginas - 4));
  const hasta = Math.min(paginas, Math.max(pagina + 2, 5));
  const numeros: number[] = [];
  for (let n = desde; n <= hasta; n++) numeros.push(n);

  const url = (n: number) => construirUrl(slug, parametros, { pagina: n > 1 ? n : undefined });

  return (
    <nav aria-label="Paginación" className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
      {pagina > 1 && (
        <Link
          href={url(pagina - 1)}
          rel="prev"
          className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-muted"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Anterior
        </Link>
      )}

      {numeros.map((n) => (
        <Link
          key={n}
          href={url(n)}
          aria-current={n === pagina ? "page" : undefined}
          className={cn(
            "inline-flex size-11 items-center justify-center rounded-md text-sm font-medium",
            n === pagina
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card hover:bg-muted"
          )}
        >
          {n}
          <span className="sr-only"> — página {n}</span>
        </Link>
      ))}

      {pagina < paginas && (
        <Link
          href={url(pagina + 1)}
          rel="next"
          className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-muted"
        >
          Siguiente
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </nav>
  );
}
